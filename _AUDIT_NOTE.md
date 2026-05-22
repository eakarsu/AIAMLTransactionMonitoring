# Audit Note — AIAMLTransactionMonitoring

Domain: AML transaction monitoring — money laundering detection, KYC/CDD, OFAC sanctions screening, SAR/CTR filing, customer risk scoring, investigations.

## Stack
- Node.js + Express backend (port 3069), helmet + CORS, JWT bearer auth via `middleware/auth`.
- Postgres (`backend/config/database.js`), migrations `001_schema.sql`, `002_schema.sql`, seed in `backend/seed/`.
- React frontend (`frontend/src`) with `react-router-dom`, sidebar shell, dedicated AI pages and CRUD pages.
- OpenRouter LLM client via `backend/services/ai.js`, results persisted to `ai_results` table for history.
- Webhooks service (`services/webhooks.js`), upload store (`services/uploadStore.js`).

## Current inventory

### CRUD / domain routes (mounted in `backend/server.js`) — 18 entities
- `/api/customers`, `/api/accounts`, `/api/transactions`
- `/api/sanctions-hits`, `/api/sar-cases`, `/api/ctrs`
- `/api/kyc-profiles`, `/api/watchlists`, `/api/typologies`
- `/api/beneficial-owners`, `/api/peps`, `/api/jurisdictions`
- `/api/investigations`, `/api/alerts`, `/api/audit-log`
- `/api/source-of-funds`, `/api/edd-cases`, `/api/regulatory-filings`

### Cross-cutting routes
- `/api/auth` (public login), `/api/health` (public)
- `/api/notifications`, `/api/attachments`, `/api/webhooks`
- `/api/dashboard` (stats)
- `/api/custom-views` — `tx-network`, `sanctions-timeline`, `risk-heatmap`, `sar-funnel`

### AI endpoints (`/api/ai/*`) — 16 verbs + `samples` + `history`
1. `POST /sar-narrative-draft`
2. `POST /typology-detect`
3. `POST /kyc-refresh-summary`
4. `POST /sanction-name-match`
5. `POST /beneficial-owner-trace`
6. `POST /transaction-anomaly`
7. `POST /peer-group-compare`
8. `POST /executive-brief`
9. `POST /customer-risk-score`
10. `POST /edd-questionnaire`
11. `POST /investigation-summary`
12. `POST /regulatory-filing-draft`
13. `POST /source-of-funds-explain`
14. `POST /jurisdictional-risk`
15. `POST /false-positive-classifier`
16. `POST /network-analysis`

### Frontend pages
- 18 CRUD pages, 16 dedicated AI pages, Dashboard, LoginPage, WebhooksPage, CustomViewsPage, plus `CodexCustomVizFeature`, `CodexOperationsFeature`.

## Audit recommendations

### AI gaps (vs. requested set)
- Customer risk scoring — COVERED (`customer-risk-score`)
- Transaction anomaly detection — COVERED (`transaction-anomaly`)
- SAR narrative generator — COVERED (`sar-narrative-draft`)
- False-positive triage assistant — COVERED (`false-positive-classifier`)
- Typology classifier — COVERED (`typology-detect`)
- Network analysis copilot — COVERED (`network-analysis`)
- Adverse-media / negative-news screener — MISSING
- CTR auto-aggregator / structuring detector (purpose-built rule on top of transactions) — PARTIAL (typology covers, no dedicated verb)
- Onboarding-time KYC risk pre-screen (vs. `kyc-refresh-summary` which is queue-summary) — MISSING

### Non-AI gaps
- OFAC SDN list ingestion job / scheduled refresh (watchlists table exists; no ingestion route) — MISSING
- Case management workflow state machine (statuses likely exist on `sar_cases`/`investigations`, but no explicit transition route/guard) — PARTIAL
- Audit trail — COVERED (`/api/audit-log` route + page); writes from other routes not verified
- Regulator reporting templates (FinCEN SAR XML / CTR XML export) — MISSING (only `regulatory-filings` CRUD + AI draft)
- Form 8300, FBAR, OFAC Annual Report machine-readable export — MISSING

### Custom gaps
- Real-time stream processing (Kafka / Redis Streams / pg-LISTEN ingestion) — MISSING
- Peer-group benchmarking — PARTIAL (AI `peer-group-compare` exists; no quantitative aggregate endpoint)
- Escalation routing (auto-assign by severity/jurisdiction to investigator queues) — MISSING
- Webhooks infra — COVERED for outbound; no inbound transaction-feed webhook
- Compliance custom views — COVERED (`tx-network`, `sanctions-timeline`, `risk-heatmap`, `sar-funnel`)

## Implemented
None — audit-only (pre-pass 7).

## Apply pass 7 (full backlog implementation)

Status: APPLIED.

### Schema additions — `backend/migrations/003_pass7.sql`
- `case_state_transitions` — append-only ledger for case-workflow state transitions.
- `escalation_queues` + `escalation_assignments` — severity→queue routing model.
  Seeded queues Q-CRIT / Q-HIGH / Q-MED / Q-LOW with default on-call user mapping.
- `tx_events` — inbound transaction-stream append-only feed with `event_id` idempotency and `rule_state` JSONB column for materialised rule snapshots.
- `fincen_field_mappings` — internal column → FinCEN BSA E-File XSD element mapping; seeded SAR / CTR / 8300 / FBAR / OFAC core elements.
- `advisory_actions` — recorded TOO-RISKY recommendations with `requires_human_review = TRUE`; no auto-execution.

All `CREATE TABLE IF NOT EXISTS` + `INSERT ... WHERE NOT EXISTS` for idempotent re-apply.

### Backend endpoints added (mounted in `backend/server.js` before `app.listen`)

MECHANICAL:
- `POST /api/ai/adverse-media-screen` — LLM-only adverse-media screening with `data_source: "llm_only"` tag.
- `POST /api/ai/kyc-onboarding-prescreen` — at-intake KYC risk pre-screen, peer-density signal pulled from customers table.
- `GET  /api/peer-benchmarks?customer_id=|type=|country=|risk_tier=` — quantitative SQL aggregates (balance/txn/alert) plus optional focus-customer stats. No LLM.

NEEDS-CREDS (503 stubs):
- `GET  /api/ingestion/ofac/status` — reports whether `OFAC_INGESTION_ENABLED` and `OFAC_INGESTION_LICENSE_ACK` are set.
- `POST /api/ingestion/ofac/sdn/refresh` — 503 unless both env flags set; when set, sample-mode shim upserts OFAC-SDN / EU-CONSOLIDATED / UN-1267 / UK-HMT into `watchlists`.
- `GET  /api/ingestion/adverse-media/status` — 503 unless `REFINITIV_API_KEY` / `DOWJONES_API_KEY` / `LEXISNEXIS_API_KEY` is set; points to the LLM-only AI fallback.

NEEDS-PRODUCT-DECISION (reasonable defaults applied):
- Case state machine: `GET /api/case-workflow/transitions`, `GET /api/case-workflow/:case_type/:case_ref/history`, `POST /api/case-workflow/:case_type/:case_ref/transition` (legal-transition guard with `force` override, every transition audited).
- Escalation routing: `GET|POST /api/escalation/queues`, `PUT /api/escalation/queues/:queue_id`, `POST /api/escalation/route` (severity→queue match with jurisdiction preference, optional persist to `escalation_assignments`), `GET /api/escalation/assignments`.
- Inbound transaction stream: webhook default — `POST /api/ingestion/tx-stream` (idempotent on `event_id`), `GET /api/ingestion/tx-stream`, `POST /api/ingestion/tx-stream/:id/process` (writes `rule_state` snapshot).

NEEDS-SCHEMA:
- `GET|POST /api/fincen-exports/mappings` — read / extend the `fincen_field_mappings` table.
- `GET /api/fincen-exports/:filing_type/:case_ref` — builds XML by walking mappings (`{ xml, mappings_used, missing_required, auto_file_capable: false, requires_human_review: true }`). XML emitted with hand-rolled escaping — no new npm deps.
- `tx_events` schema (above) covers the real-time stream processing item — decoupled from existing `transactions` CRUD.

TOO-RISKY (advisory-only):
- `POST /api/advisory/auto-file` (SAR or CTR) — writes `advisory_actions` row, `executed=false`, `requires_human_review=true`. Never submits to a regulator.
- `POST /api/advisory/auto-freeze` (account) — same shape; never sets `accounts.status=frozen` itself.
- `GET  /api/advisory` — list / filter.
- `POST /api/advisory/:id/review` — records human decision (`approve|reject`); explicitly states the human must execute the side-effect downstream.

### Frontend pages added (routed in `frontend/src/App.js`, linked from `Sidebar.js` group `Operations` + AI groups)
- `AIAdverseMediaScreenPage` — `/ai/adverse-media-screen`
- `AIKycOnboardingPrescreenPage` — `/ai/kyc-onboarding-prescreen`
- `PeerBenchmarksPage` — `/peer-benchmarks`
- `IngestionPage` — `/ingestion`
- `CaseWorkflowPage` — `/case-workflow`
- `EscalationPage` — `/escalation`
- `FincenExportsPage` — `/fincen-exports`
- `AdvisoryActionsPage` — `/advisory-actions`

API client helpers extended in `frontend/src/services/api.js`: `aiAdverseMediaScreen`, `aiKycOnboardingPrescreen`, `getPeerBenchmarks`, `ingestionApi`, `caseWorkflowApi`, `escalationApi`, `fincenExportsApi`, `advisoryApi`.

### AI samples
`samples` map in `routes/ai.js` extended with five fills each for `adverse-media-screen` and `kyc-onboarding-prescreen` (re-uses canonical Apex / Petrov / Sahel / Caribbean / Rossi scenarios).

### Constraints honoured
- No new npm dependencies (XML built by hand, OpenRouter call uses existing wiring).
- No breaking changes to existing routes or pages.
- `node --check` passes on every modified .js file (`server.js`, `routes/ai.js`, the six new routes, `services/ai.js`, `services/api.js`).
- All schema is additive with `CREATE TABLE IF NOT EXISTS` / `INSERT … WHERE NOT EXISTS`.

### Skips / TOO-RISKY framing
- Real OFAC fetch + parse + commercial adverse-media provider remain `503` until creds + license ack are explicitly opted into via env (`OFAC_INGESTION_ENABLED`, `OFAC_INGESTION_LICENSE_ACK`, `REFINITIV_API_KEY|DOWJONES_API_KEY|LEXISNEXIS_API_KEY`).
- Auto-file regulator and auto-freeze account are **never** executed by this codebase. They are recorded as advisory recommendations and gated behind a human reviewer endpoint, with explicit `requires_human_review: true` and `executed: false` in every response.

## Backlog (prioritized)

### MECHANICAL (3)
1. Adverse-media screener AI endpoint (`POST /api/ai/adverse-media-screen`) — reuse OpenRouter wiring, watchlists table, persist via `ai_results`.
2. Onboarding KYC risk pre-screen AI endpoint (`POST /api/ai/kyc-onboarding-prescreen`) — separate from refresh-summary; per-customer at intake.
3. Quantitative peer-group benchmarking non-AI endpoint (`GET /api/peer-benchmarks?type=...`) — SQL aggregates against customers/accounts/transactions, no LLM call.

### NEEDS-CREDS (2)
4. OFAC SDN list ingestion job — scheduled fetch from `https://www.treasury.gov/ofac/downloads/sdn.xml` (and EU/UN/UK consolidated), upserts to `watchlists`. Needs decision on storage of raw XML + license acknowledgement.
5. Adverse-media data feed — needs commercial provider creds (Refinitiv WorldCheck / Dow Jones / LexisNexis); LLM-only fallback otherwise.

### NEEDS-PRODUCT-DECISION (3)
6. Case management state machine — define legal status transitions (`open → triage → investigating → escalated → SAR-drafted → SAR-filed → closed`), enforce via middleware; today statuses are free-form columns.
7. Escalation routing — needs investigator-user model, on-call schedule, severity→queue mapping.
8. Inbound transaction stream feed — webhook vs. Kafka vs. polling decision; throughput SLA; idempotency strategy.

### NEEDS-SCHEMA (2)
9. FinCEN SAR XML / CTR XML export — requires field-level mapping table (`sar_cases` columns → FinCEN BSA E-Filing XSD elements); current schema is summary-only.
10. Real-time stream processing — needs new `tx_events` append-only table + materialized rule-state, decoupled from current `transactions` CRUD.

### TOO-RISKY (2)
11. Auto-file SAR/CTR with regulator — regulatory liability; must remain human-in-the-loop.
12. Auto-freeze account on sanctions hit — operational risk, false-positive blowback; gate behind explicit human review (today `sanctions-hits` is advisory and accounts have `frozen` status set elsewhere).

## Categorization with counts

| Bucket                    | Count |
|---------------------------|-------|
| MECHANICAL                | 3     |
| NEEDS-CREDS               | 2     |
| NEEDS-PRODUCT-DECISION    | 3     |
| NEEDS-SCHEMA              | 2     |
| TOO-RISKY                 | 2     |
| **Total backlog items**   | **12**|

Counts of existing surface: 18 CRUD routes + 6 cross-cutting routers (auth, notifications, attachments, webhooks, dashboard, custom-views) + 16 AI verbs (+ samples, history) + 4 custom-view sub-endpoints. Frontend: 18 CRUD pages + 16 AI pages + Dashboard + Login + Webhooks + CustomViews + 2 Codex feature pages.

-- Pass 7 — full backlog implementation
-- Adds: case state transitions audit, escalation queues + assignments,
-- inbound transaction stream events, FinCEN field-mapping table,
-- advisory auto-file / auto-freeze recommendations.

-- ─────────────────────────────────────────────
-- Case management state machine (advisory transitions ledger)
-- Status transitions: open → triage → investigating → escalated
--                     → SAR-drafted → SAR-filed → closed
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS case_state_transitions (
  id              SERIAL PRIMARY KEY,
  case_type       VARCHAR(40) NOT NULL,   -- 'sar_case' | 'investigation' | 'edd_case' | 'alert'
  case_ref        VARCHAR(80) NOT NULL,   -- e.g. case_id / inv_id / edd_id / alert_id
  from_status     VARCHAR(60),
  to_status       VARCHAR(60) NOT NULL,
  actor           VARCHAR(160),
  reason          TEXT,
  legal_ok        BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_case_state_transitions_ref
  ON case_state_transitions (case_type, case_ref, created_at DESC);

-- ─────────────────────────────────────────────
-- Escalation routing
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS escalation_queues (
  id              SERIAL PRIMARY KEY,
  queue_id        VARCHAR(60) UNIQUE NOT NULL,
  name            VARCHAR(160) NOT NULL,
  severity_floor  VARCHAR(20) DEFAULT 'low',  -- low|medium|high|critical
  jurisdiction    VARCHAR(80),                -- nullable = any
  on_call_user    VARCHAR(160),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS escalation_assignments (
  id              SERIAL PRIMARY KEY,
  case_type       VARCHAR(40) NOT NULL,
  case_ref        VARCHAR(80) NOT NULL,
  queue_id        VARCHAR(60),
  assigned_to     VARCHAR(160),
  severity        VARCHAR(20),
  reason          TEXT,
  status          VARCHAR(30) DEFAULT 'open',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_escalation_assignments_queue
  ON escalation_assignments (queue_id, status, created_at DESC);

-- Seed default severity → queue mapping
INSERT INTO escalation_queues (queue_id, name, severity_floor, jurisdiction, on_call_user, notes)
SELECT 'Q-CRIT', 'Tier 1 — Critical Compliance', 'critical', NULL, 'compliance.lead@example.com', 'auto-routed: severity=critical'
WHERE NOT EXISTS (SELECT 1 FROM escalation_queues WHERE queue_id = 'Q-CRIT');

INSERT INTO escalation_queues (queue_id, name, severity_floor, jurisdiction, on_call_user, notes)
SELECT 'Q-HIGH', 'Tier 2 — High Severity', 'high', NULL, 'senior.investigator@example.com', 'auto-routed: severity in (high, critical)'
WHERE NOT EXISTS (SELECT 1 FROM escalation_queues WHERE queue_id = 'Q-HIGH');

INSERT INTO escalation_queues (queue_id, name, severity_floor, jurisdiction, on_call_user, notes)
SELECT 'Q-MED', 'Tier 3 — Medium Severity', 'medium', NULL, 'investigator@example.com', 'auto-routed: severity=medium'
WHERE NOT EXISTS (SELECT 1 FROM escalation_queues WHERE queue_id = 'Q-MED');

INSERT INTO escalation_queues (queue_id, name, severity_floor, jurisdiction, on_call_user, notes)
SELECT 'Q-LOW', 'Tier 4 — Low Severity / Bulk', 'low', NULL, 'queue@example.com', 'auto-routed: default sink'
WHERE NOT EXISTS (SELECT 1 FROM escalation_queues WHERE queue_id = 'Q-LOW');

-- ─────────────────────────────────────────────
-- Inbound transaction stream feed (append-only)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tx_events (
  id              BIGSERIAL PRIMARY KEY,
  event_id        VARCHAR(80) UNIQUE,        -- idempotency key
  source          VARCHAR(60),               -- 'webhook' | 'kafka' | 'polling' | 'manual'
  account_id      VARCHAR(50),
  txn_id          VARCHAR(80),
  amount          NUMERIC(18,2),
  currency        VARCHAR(10),
  counterparty    VARCHAR(200),
  ts              TIMESTAMPTZ,
  raw_payload     JSONB,
  processed       BOOLEAN DEFAULT FALSE,
  processed_at    TIMESTAMPTZ,
  rule_state      JSONB,                     -- materialised rule-state snapshot
  ingested_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tx_events_processed
  ON tx_events (processed, ingested_at DESC);
CREATE INDEX IF NOT EXISTS idx_tx_events_account
  ON tx_events (account_id, ts DESC);

-- ─────────────────────────────────────────────
-- FinCEN BSA E-File field mapping
-- Maps internal columns → FinCEN XSD elements for SAR / CTR / 8300 / FBAR / OFAC
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fincen_field_mappings (
  id              SERIAL PRIMARY KEY,
  filing_type     VARCHAR(20) NOT NULL,        -- SAR | CTR | 8300 | FBAR | OFAC
  internal_path   VARCHAR(160) NOT NULL,       -- e.g. 'sar_cases.case_id'
  xsd_element     VARCHAR(160) NOT NULL,       -- e.g. 'EFilingBatchXML/ActivityNumber'
  required        BOOLEAN DEFAULT TRUE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_fincen_field
  ON fincen_field_mappings (filing_type, internal_path, xsd_element);

-- Seed SAR mappings (FinCEN BSA E-Filing SAR XSD core elements)
INSERT INTO fincen_field_mappings (filing_type, internal_path, xsd_element, required, notes)
SELECT 'SAR', 'sar_cases.case_id', 'EFilingBatchXML/Activity/ActivityNumber', TRUE, 'BSA tracking number'
WHERE NOT EXISTS (SELECT 1 FROM fincen_field_mappings WHERE filing_type='SAR' AND internal_path='sar_cases.case_id');

INSERT INTO fincen_field_mappings (filing_type, internal_path, xsd_element, required, notes)
SELECT 'SAR', 'sar_cases.opened_at', 'EFilingBatchXML/Activity/FilingDateText', TRUE, 'YYYYMMDD'
WHERE NOT EXISTS (SELECT 1 FROM fincen_field_mappings WHERE filing_type='SAR' AND internal_path='sar_cases.opened_at');

INSERT INTO fincen_field_mappings (filing_type, internal_path, xsd_element, required, notes)
SELECT 'SAR', 'sar_cases.suspicion', 'EFilingBatchXML/Activity/SuspiciousActivity/SuspiciousActivityDescription', TRUE, 'narrative section'
WHERE NOT EXISTS (SELECT 1 FROM fincen_field_mappings WHERE filing_type='SAR' AND internal_path='sar_cases.suspicion');

INSERT INTO fincen_field_mappings (filing_type, internal_path, xsd_element, required, notes)
SELECT 'SAR', 'customers.name', 'EFilingBatchXML/Activity/Party/PartyName/RawPartyFullName', TRUE, 'subject party'
WHERE NOT EXISTS (SELECT 1 FROM fincen_field_mappings WHERE filing_type='SAR' AND internal_path='customers.name');

INSERT INTO fincen_field_mappings (filing_type, internal_path, xsd_element, required, notes)
SELECT 'SAR', 'customers.country', 'EFilingBatchXML/Activity/Party/PartyName/CountryCodeText', FALSE, 'ISO-2'
WHERE NOT EXISTS (SELECT 1 FROM fincen_field_mappings WHERE filing_type='SAR' AND internal_path='customers.country');

-- Seed CTR mappings
INSERT INTO fincen_field_mappings (filing_type, internal_path, xsd_element, required, notes)
SELECT 'CTR', 'ctrs.ctr_id', 'EFilingBatchXML/Activity/ActivityNumber', TRUE, 'CTR tracking'
WHERE NOT EXISTS (SELECT 1 FROM fincen_field_mappings WHERE filing_type='CTR' AND internal_path='ctrs.ctr_id');

INSERT INTO fincen_field_mappings (filing_type, internal_path, xsd_element, required, notes)
SELECT 'CTR', 'ctrs.aggregate_amount', 'EFilingBatchXML/Activity/CurrencyTransactionActivity/TotalCashInAmountText', TRUE, 'numeric, no commas'
WHERE NOT EXISTS (SELECT 1 FROM fincen_field_mappings WHERE filing_type='CTR' AND internal_path='ctrs.aggregate_amount');

INSERT INTO fincen_field_mappings (filing_type, internal_path, xsd_element, required, notes)
SELECT 'CTR', 'ctrs.period', 'EFilingBatchXML/Activity/FilingDateText', TRUE, 'period as filing date'
WHERE NOT EXISTS (SELECT 1 FROM fincen_field_mappings WHERE filing_type='CTR' AND internal_path='ctrs.period');

INSERT INTO fincen_field_mappings (filing_type, internal_path, xsd_element, required, notes)
SELECT 'CTR', 'customers.name', 'EFilingBatchXML/Activity/Party/PartyName/RawPartyFullName', TRUE, 'transactor'
WHERE NOT EXISTS (SELECT 1 FROM fincen_field_mappings WHERE filing_type='CTR' AND internal_path='customers.name');

-- Seed 8300 mappings
INSERT INTO fincen_field_mappings (filing_type, internal_path, xsd_element, required, notes)
SELECT '8300', 'transactions.txn_id', 'Form8300/TransactionId', TRUE, 'cash > $10k in trade or business'
WHERE NOT EXISTS (SELECT 1 FROM fincen_field_mappings WHERE filing_type='8300' AND internal_path='transactions.txn_id');

INSERT INTO fincen_field_mappings (filing_type, internal_path, xsd_element, required, notes)
SELECT '8300', 'transactions.amount', 'Form8300/CashAmount', TRUE, 'USD'
WHERE NOT EXISTS (SELECT 1 FROM fincen_field_mappings WHERE filing_type='8300' AND internal_path='transactions.amount');

-- Seed FBAR mappings
INSERT INTO fincen_field_mappings (filing_type, internal_path, xsd_element, required, notes)
SELECT 'FBAR', 'accounts.account_id', 'FBAR/ForeignAccountId', TRUE, 'foreign account'
WHERE NOT EXISTS (SELECT 1 FROM fincen_field_mappings WHERE filing_type='FBAR' AND internal_path='accounts.account_id');

INSERT INTO fincen_field_mappings (filing_type, internal_path, xsd_element, required, notes)
SELECT 'FBAR', 'accounts.balance', 'FBAR/MaximumAccountValue', TRUE, 'USD year-max'
WHERE NOT EXISTS (SELECT 1 FROM fincen_field_mappings WHERE filing_type='FBAR' AND internal_path='accounts.balance');

-- Seed OFAC Annual Report mappings
INSERT INTO fincen_field_mappings (filing_type, internal_path, xsd_element, required, notes)
SELECT 'OFAC', 'sanctions_hits.hit_id', 'OFACAnnualReport/BlockedTransactionId', TRUE, 'blocked / rejected entries'
WHERE NOT EXISTS (SELECT 1 FROM fincen_field_mappings WHERE filing_type='OFAC' AND internal_path='sanctions_hits.hit_id');

INSERT INTO fincen_field_mappings (filing_type, internal_path, xsd_element, required, notes)
SELECT 'OFAC', 'sanctions_hits.list', 'OFACAnnualReport/SanctionsListName', TRUE, 'SDN / NS-PLC / etc.'
WHERE NOT EXISTS (SELECT 1 FROM fincen_field_mappings WHERE filing_type='OFAC' AND internal_path='sanctions_hits.list');

-- ─────────────────────────────────────────────
-- Advisory recommendations (TOO-RISKY items)
-- Auto-file SAR/CTR / auto-freeze on sanctions hit — never executed,
-- written here only as human-review records.
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS advisory_actions (
  id                    SERIAL PRIMARY KEY,
  action_type           VARCHAR(60) NOT NULL,  -- 'auto_file_sar' | 'auto_file_ctr' | 'auto_freeze_account'
  target_type           VARCHAR(40),           -- 'sar_case' | 'ctr' | 'account'
  target_ref            VARCHAR(80),
  rationale             TEXT,
  requires_human_review BOOLEAN DEFAULT TRUE,
  reviewer              VARCHAR(160),
  review_status         VARCHAR(30) DEFAULT 'pending',  -- pending | approved | rejected
  reviewed_at           TIMESTAMPTZ,
  payload               JSONB,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_advisory_actions_status
  ON advisory_actions (review_status, created_at DESC);

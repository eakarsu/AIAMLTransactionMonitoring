// Pass 7 — NEEDS-CREDS + NEEDS-PRODUCT-DECISION + NEEDS-SCHEMA.
//
// 1. OFAC SDN ingestion job — pure stub (503) when no creds / consent are set.
//    Enable by exporting OFAC_INGESTION_ENABLED=true AND
//    OFAC_INGESTION_LICENSE_ACK=true.  The ingestion logic itself is wired
//    behind a sample-mode shim that upserts a small in-memory sample list
//    into `watchlists` so the UI surface is exercisable.
//
// 2. Inbound transaction stream feed — webhook ingest into `tx_events`,
//    idempotency by `event_id`.

const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// ─────────────────────────────────────────────
// OFAC ingestion
// ─────────────────────────────────────────────

// POST /api/ingestion/ofac/sdn/refresh
// Decision matrix:
//   - OFAC_INGESTION_ENABLED      must be 'true'
//   - OFAC_INGESTION_LICENSE_ACK  must be 'true'   (Treasury data is public domain
//                                                   but downstream redistribution can
//                                                   require notice; product decision)
// If either is missing we return 503 + actionable guidance (no creds path).
router.post('/ofac/sdn/refresh', async (req, res) => {
  try {
    const enabled = String(process.env.OFAC_INGESTION_ENABLED || '').toLowerCase() === 'true';
    const ack     = String(process.env.OFAC_INGESTION_LICENSE_ACK || '').toLowerCase() === 'true';
    if (!enabled || !ack) {
      return res.status(503).json({
        error: 'OFAC SDN ingestion is disabled — credentials / license acknowledgement required',
        required_env: ['OFAC_INGESTION_ENABLED=true', 'OFAC_INGESTION_LICENSE_ACK=true'],
        upstream_url: 'https://www.treasury.gov/ofac/downloads/sdn.xml',
        notes: 'Treasury publishes the SDN list publicly. The 503 here is intentional until the operator confirms storage / retention policy.',
        requires_human_review: true,
      });
    }

    // Sample-mode shim — small canned set ensures the table moves even
    // without a live fetch. The real implementation would stream-parse
    // sdn.xml + consolidated EU / UN / UK lists.
    const sample = [
      { list_id: 'OFAC-SDN',        name: 'OFAC Specially Designated Nationals',      jurisdiction: 'US' },
      { list_id: 'EU-CONSOLIDATED', name: 'EU Consolidated Financial Sanctions List', jurisdiction: 'EU' },
      { list_id: 'UN-1267',         name: 'UN 1267 Al-Qaeda / Taliban Sanctions',     jurisdiction: 'UN' },
      { list_id: 'UK-HMT',          name: 'UK HM Treasury Consolidated Sanctions',    jurisdiction: 'GB' },
    ];
    let upserts = 0;
    for (const row of sample) {
      const r = await pool.query(
        `
        INSERT INTO watchlists (list_id, name, jurisdiction, last_updated, notes, status)
        VALUES ($1, $2, $3, CURRENT_DATE, 'ingested via /api/ingestion/ofac/sdn/refresh (sample-mode)', 'active')
        ON CONFLICT (list_id) DO UPDATE
          SET name = EXCLUDED.name,
              jurisdiction = EXCLUDED.jurisdiction,
              last_updated = CURRENT_DATE,
              updated_at = NOW()
        RETURNING id
        `,
        [row.list_id, row.name, row.jurisdiction]
      );
      if (r.rowCount) upserts += 1;
    }
    res.json({
      ok: true,
      mode: 'sample',
      lists_upserted: upserts,
      upstream_url: 'https://www.treasury.gov/ofac/downloads/sdn.xml',
      next_refresh_suggested_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/ingestion/ofac/status
router.get('/ofac/status', async (req, res) => {
  try {
    const enabled = String(process.env.OFAC_INGESTION_ENABLED || '').toLowerCase() === 'true';
    const ack     = String(process.env.OFAC_INGESTION_LICENSE_ACK || '').toLowerCase() === 'true';
    const r = await pool.query(
      `
      SELECT
        list_id,
        name,
        jurisdiction,
        last_updated AS last_review,
        status
      FROM watchlists
      WHERE list_id IN ('OFAC-SDN','EU-CONSOLIDATED','UN-1267','UK-HMT')
      ORDER BY list_id
      `
    );
    res.json({
      enabled,
      license_acknowledged: ack,
      ready: enabled && ack,
      tracked_lists: r.rows,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────────────────────────────
// Adverse-media feed status.
// ─────────────────────────────────────────────
router.get('/adverse-media/status', (req, res) => {
  const hasProvider =
    process.env.REFINITIV_API_KEY ||
    process.env.DOWJONES_API_KEY ||
    process.env.LEXISNEXIS_API_KEY;
  if (!hasProvider) {
    return res.json({
      enabled: false,
      provider: null,
      mode: 'llm_only_fallback',
      message: 'No commercial adverse-media provider configured.',
      required_env_any: ['REFINITIV_API_KEY', 'DOWJONES_API_KEY', 'LEXISNEXIS_API_KEY'],
      fallback: 'LLM-only screening via POST /api/ai/adverse-media-screen (data_source=llm_only)',
      requires_human_review: true,
    });
  }
  res.json({ enabled: true, provider: 'configured', mode: 'commercial_feed' });
});

// ─────────────────────────────────────────────
// Inbound transaction stream feed
// Default = webhook (POST). Kafka / polling are out of scope for the default.
// ─────────────────────────────────────────────

// POST /api/ingestion/tx-stream
// Body: { event_id, account_id, txn_id, amount, currency, counterparty, ts, raw }
// Idempotent on event_id.
router.post('/tx-stream', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.event_id) return res.status(400).json({ error: 'event_id is required for idempotency' });
    const existing = await pool.query('SELECT id, processed FROM tx_events WHERE event_id = $1', [b.event_id]);
    if (existing.rowCount) {
      return res.json({ ok: true, duplicate: true, id: existing.rows[0].id, processed: existing.rows[0].processed });
    }
    const r = await pool.query(
      `
      INSERT INTO tx_events
        (event_id, source, account_id, txn_id, amount, currency, counterparty, ts, raw_payload)
      VALUES ($1, COALESCE($2,'webhook'), $3, $4, $5, $6, $7, COALESCE($8, NOW()), $9)
      RETURNING id, event_id, ingested_at
      `,
      [b.event_id, b.source, b.account_id, b.txn_id, b.amount, b.currency, b.counterparty, b.ts, b.raw || b]
    );
    res.json({ ok: true, duplicate: false, ...r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/ingestion/tx-stream?limit=50&processed=false
router.get('/tx-stream', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 500);
    const processed = req.query.processed;
    let r;
    if (processed === 'true' || processed === 'false') {
      r = await pool.query(
        'SELECT * FROM tx_events WHERE processed = $1 ORDER BY ingested_at DESC LIMIT $2',
        [processed === 'true', limit]
      );
    } else {
      r = await pool.query('SELECT * FROM tx_events ORDER BY ingested_at DESC LIMIT $1', [limit]);
    }
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/ingestion/tx-stream/:id/process
// Materialised rule-state placeholder: tags the event processed and writes a
// minimal threshold check (amount > 10000 = CTR candidate). Real rules live
// in transaction-anomaly / typology-detect AI verbs.
router.post('/tx-stream/:id/process', async (req, res) => {
  try {
    const { id } = req.params;
    const cur = await pool.query('SELECT * FROM tx_events WHERE id = $1', [id]);
    if (!cur.rowCount) return res.status(404).json({ error: 'not found' });
    const ev = cur.rows[0];
    const ruleState = {
      ctr_candidate: Number(ev.amount || 0) >= 10000,
      structuring_candidate: Number(ev.amount || 0) >= 9000 && Number(ev.amount || 0) < 10000,
      threshold_checks_at: new Date().toISOString(),
    };
    const r = await pool.query(
      `UPDATE tx_events
          SET processed = TRUE,
              processed_at = NOW(),
              rule_state = $1
        WHERE id = $2
        RETURNING id, event_id, processed, processed_at, rule_state`,
      [ruleState, id]
    );
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

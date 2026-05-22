// Pass 7 — TOO-RISKY (advisory-only).
//
// Two operations the audit flagged as TOO-RISKY:
//   - Auto-file SAR/CTR with regulator         → never executed automatically
//   - Auto-freeze account on sanctions hit     → never executed automatically
//
// Both are exposed as ADVISORY recommendations. Each call writes a row to
// `advisory_actions` with `requires_human_review = true` and review_status
// = 'pending'. A separate review endpoint records the human decision; the
// downstream side-effect (filing / freeze) is left to a human-driven path.

const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// POST /api/advisory/auto-file
// Body: { filing_type: 'SAR'|'CTR', target_ref, rationale, payload? }
router.post('/auto-file', async (req, res) => {
  try {
    const { filing_type, target_ref, rationale, payload } = req.body || {};
    if (!filing_type || !['SAR', 'CTR'].includes(String(filing_type).toUpperCase())) {
      return res.status(400).json({ error: 'filing_type must be SAR or CTR' });
    }
    if (!target_ref) return res.status(400).json({ error: 'target_ref is required' });
    const r = await pool.query(
      `INSERT INTO advisory_actions
         (action_type, target_type, target_ref, rationale, requires_human_review, payload)
       VALUES ($1, $2, $3, $4, TRUE, $5)
       RETURNING *`,
      [`auto_file_${String(filing_type).toLowerCase()}`, String(filing_type).toLowerCase() === 'sar' ? 'sar_case' : 'ctr', target_ref, rationale || null, payload || null]
    );
    res.json({
      ok: true,
      advisory: r.rows[0],
      executed: false,
      requires_human_review: true,
      next_step: `POST /api/advisory/${r.rows[0].id}/review with { decision: 'approve'|'reject', reviewer }`,
      warning: 'Regulator filings are never auto-submitted from this surface.',
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/advisory/auto-freeze
// Body: { account_id, hit_id, rationale }
router.post('/auto-freeze', async (req, res) => {
  try {
    const { account_id, hit_id, rationale, payload } = req.body || {};
    if (!account_id) return res.status(400).json({ error: 'account_id is required' });
    const r = await pool.query(
      `INSERT INTO advisory_actions
         (action_type, target_type, target_ref, rationale, requires_human_review, payload)
       VALUES ('auto_freeze_account', 'account', $1, $2, TRUE, $3)
       RETURNING *`,
      [account_id, rationale || (hit_id ? `triggered by hit ${hit_id}` : null), payload || (hit_id ? { hit_id } : null)]
    );
    res.json({
      ok: true,
      advisory: r.rows[0],
      executed: false,
      requires_human_review: true,
      next_step: `POST /api/advisory/${r.rows[0].id}/review with { decision: 'approve'|'reject', reviewer }`,
      warning: 'Account freeze is never auto-executed; a human reviewer must approve before downstream action.',
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/advisory?status=pending&action_type=...
router.get('/', async (req, res) => {
  try {
    const { status, action_type, target_ref } = req.query;
    const where = [];
    const params = [];
    if (status)      { params.push(status);      where.push(`review_status = $${params.length}`); }
    if (action_type) { params.push(action_type); where.push(`action_type = $${params.length}`); }
    if (target_ref)  { params.push(target_ref);  where.push(`target_ref = $${params.length}`); }
    const sql = `SELECT * FROM advisory_actions ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC LIMIT 200`;
    const r = await pool.query(sql, params);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/advisory/:id/review  body: { decision: 'approve'|'reject', reviewer, note? }
// Records the decision. Does NOT itself file or freeze — that remains the
// human's downstream responsibility.
router.post('/:id/review', async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, reviewer, note } = req.body || {};
    if (!['approve', 'reject'].includes(decision)) {
      return res.status(400).json({ error: `decision must be approve or reject` });
    }
    const r = await pool.query(
      `UPDATE advisory_actions
          SET review_status = $1,
              reviewer = $2,
              reviewed_at = NOW(),
              rationale = CASE WHEN $3::text IS NOT NULL AND $3::text <> ''
                          THEN COALESCE(rationale,'') || E'\n[review:' || $1 || '] ' || $3
                          ELSE rationale END
        WHERE id = $4
        RETURNING *`,
      [decision === 'approve' ? 'approved' : 'rejected', reviewer || null, note || null, id]
    );
    if (!r.rowCount) return res.status(404).json({ error: 'advisory not found' });
    res.json({
      ok: true,
      advisory: r.rows[0],
      executed: false,
      next_step: decision === 'approve'
        ? 'Human reviewer must now execute the side-effect (file SAR/CTR via FinCEN portal, or set account.status=frozen via /api/accounts).'
        : 'No further action; advisory rejected.',
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

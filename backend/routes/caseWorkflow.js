// Pass 7 — NEEDS-PRODUCT-DECISION (defaults applied).
//
// Case management state machine.
// Legal status transitions:
//   open → triage → investigating → escalated → SAR-drafted → SAR-filed → closed
// Backwards transitions:
//   any → triage (re-open) and any → closed (close)
// Each transition is appended to `case_state_transitions` for audit.
//
// Supported case types: sar_case (sar_cases.case_id),
//                       investigation (investigations.inv_id),
//                       edd_case (edd_cases.edd_id),
//                       alert (alerts.alert_id).

const express = require('express');
const router = express.Router();
const pool = require('../config/database');

const ALLOWED_TYPES = {
  sar_case:      { table: 'sar_cases',       key: 'case_id' },
  investigation: { table: 'investigations',  key: 'inv_id'  },
  edd_case:      { table: 'edd_cases',       key: 'edd_id'  },
  alert:         { table: 'alerts',          key: 'alert_id'},
};

// Canonical state machine (default decision).
const TRANSITIONS = {
  open:          ['triage', 'closed'],
  triage:        ['investigating', 'closed'],
  investigating: ['escalated', 'sar-drafted', 'closed'],
  escalated:     ['investigating', 'sar-drafted', 'closed'],
  'sar-drafted': ['sar-filed', 'investigating', 'closed'],
  'sar-filed':   ['closed'],
  closed:        ['triage'],   // re-open allowed
};

function isLegalTransition(from, to) {
  if (!from) return true;                  // first set is always allowed
  const allowed = TRANSITIONS[String(from).toLowerCase()] || [];
  return allowed.includes(String(to).toLowerCase());
}

// GET /api/case-workflow/transitions
router.get('/transitions', (req, res) => {
  res.json({ allowed_types: Object.keys(ALLOWED_TYPES), transitions: TRANSITIONS });
});

// GET /api/case-workflow/:case_type/:case_ref/history
router.get('/:case_type/:case_ref/history', async (req, res) => {
  try {
    const { case_type, case_ref } = req.params;
    if (!ALLOWED_TYPES[case_type]) return res.status(400).json({ error: `unknown case_type ${case_type}` });
    const r = await pool.query(
      'SELECT * FROM case_state_transitions WHERE case_type = $1 AND case_ref = $2 ORDER BY created_at DESC',
      [case_type, case_ref]
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/case-workflow/:case_type/:case_ref/transition
// Body: { to_status, actor, reason, force? }
router.post('/:case_type/:case_ref/transition', async (req, res) => {
  try {
    const { case_type, case_ref } = req.params;
    const { to_status, actor, reason, force } = req.body || {};
    if (!to_status) return res.status(400).json({ error: 'to_status is required' });
    const cfg = ALLOWED_TYPES[case_type];
    if (!cfg) return res.status(400).json({ error: `unknown case_type ${case_type}` });

    const cur = await pool.query(
      `SELECT status FROM ${cfg.table} WHERE ${cfg.key} = $1`,
      [case_ref]
    );
    if (!cur.rowCount) return res.status(404).json({ error: `${case_type} ${case_ref} not found` });
    const fromStatus = cur.rows[0].status;
    const legal = isLegalTransition(fromStatus, to_status);
    if (!legal && !force) {
      return res.status(409).json({
        error: `illegal transition ${fromStatus} → ${to_status}`,
        allowed_next: TRANSITIONS[String(fromStatus).toLowerCase()] || [],
        override_with: { force: true, requires_human_review: true },
      });
    }

    // Update case row + append transition audit row.
    await pool.query(`UPDATE ${cfg.table} SET status = $1, updated_at = NOW() WHERE ${cfg.key} = $2`, [to_status, case_ref]);
    const ins = await pool.query(
      `INSERT INTO case_state_transitions
         (case_type, case_ref, from_status, to_status, actor, reason, legal_ok)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [case_type, case_ref, fromStatus, to_status, actor || null, reason || null, legal]
    );
    res.json({ ok: true, transition: ins.rows[0], legal_transition: legal });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

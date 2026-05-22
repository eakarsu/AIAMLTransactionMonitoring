// Pass 7 — NEEDS-PRODUCT-DECISION (defaults applied).
//
// Escalation routing: severity → queue mapping with optional jurisdiction
// override. Default severity → queue map is seeded by migration 003.
//
// Auto-assign POST returns the queue the case would route to, plus
// optionally records the assignment.

const express = require('express');
const router = express.Router();
const pool = require('../config/database');

const SEVERITY_ORDER = { low: 1, medium: 2, high: 3, critical: 4 };

// GET /api/escalation/queues
router.get('/queues', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM escalation_queues ORDER BY severity_floor DESC, queue_id');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/escalation/queues
router.post('/queues', async (req, res) => {
  try {
    const { queue_id, name, severity_floor, jurisdiction, on_call_user, notes } = req.body || {};
    if (!queue_id || !name) return res.status(400).json({ error: 'queue_id and name are required' });
    const r = await pool.query(
      `INSERT INTO escalation_queues (queue_id, name, severity_floor, jurisdiction, on_call_user, notes)
       VALUES ($1, $2, COALESCE($3,'low'), $4, $5, $6) RETURNING *`,
      [queue_id, name, severity_floor, jurisdiction, on_call_user, notes]
    );
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/escalation/queues/:queue_id
router.put('/queues/:queue_id', async (req, res) => {
  try {
    const { queue_id } = req.params;
    const { name, severity_floor, jurisdiction, on_call_user, notes } = req.body || {};
    const r = await pool.query(
      `UPDATE escalation_queues
          SET name = COALESCE($2, name),
              severity_floor = COALESCE($3, severity_floor),
              jurisdiction = COALESCE($4, jurisdiction),
              on_call_user = COALESCE($5, on_call_user),
              notes = COALESCE($6, notes),
              updated_at = NOW()
        WHERE queue_id = $1
        RETURNING *`,
      [queue_id, name, severity_floor, jurisdiction, on_call_user, notes]
    );
    if (!r.rowCount) return res.status(404).json({ error: 'queue not found' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/escalation/route
// Body: { case_type, case_ref, severity, jurisdiction?, persist? }
// Returns the matched queue (highest severity_floor <= severity, jurisdiction
// preferred if set, else any).
router.post('/route', async (req, res) => {
  try {
    const { case_type, case_ref, severity, jurisdiction, persist } = req.body || {};
    if (!severity) return res.status(400).json({ error: 'severity is required' });
    const sevWeight = SEVERITY_ORDER[String(severity).toLowerCase()] || 0;
    if (!sevWeight) return res.status(400).json({ error: `unknown severity ${severity}` });

    const queues = await pool.query('SELECT * FROM escalation_queues');
    // Pick highest severity_floor <= severity, prefer jurisdiction match.
    const eligible = queues.rows
      .map((q) => ({ ...q, _w: SEVERITY_ORDER[String(q.severity_floor).toLowerCase()] || 0 }))
      .filter((q) => q._w <= sevWeight);
    eligible.sort((a, b) => {
      const ja = jurisdiction && a.jurisdiction === jurisdiction ? 1 : 0;
      const jb = jurisdiction && b.jurisdiction === jurisdiction ? 1 : 0;
      if (jb !== ja) return jb - ja;
      return b._w - a._w;
    });
    const matched = eligible[0] || null;

    let assignment = null;
    if (persist && matched && case_type && case_ref) {
      const ins = await pool.query(
        `INSERT INTO escalation_assignments
           (case_type, case_ref, queue_id, assigned_to, severity, reason)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [case_type, case_ref, matched.queue_id, matched.on_call_user, severity, `auto-routed by severity=${severity}` + (jurisdiction ? `, jurisdiction=${jurisdiction}` : '')]
      );
      assignment = ins.rows[0];
    }
    res.json({ matched_queue: matched, assignment });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/escalation/assignments?queue_id=Q-CRIT&status=open
router.get('/assignments', async (req, res) => {
  try {
    const { queue_id, status, case_type, case_ref } = req.query;
    const where = [];
    const params = [];
    if (queue_id)   { params.push(queue_id);   where.push(`queue_id = $${params.length}`); }
    if (status)     { params.push(status);     where.push(`status = $${params.length}`); }
    if (case_type)  { params.push(case_type);  where.push(`case_type = $${params.length}`); }
    if (case_ref)   { params.push(case_ref);   where.push(`case_ref = $${params.length}`); }
    const sql = `SELECT * FROM escalation_assignments ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC LIMIT 200`;
    const r = await pool.query(sql, params);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

// Pass 7 — NEEDS-SCHEMA.
//
// Machine-readable regulator exports for SAR / CTR / 8300 / FBAR / OFAC.
// Uses `fincen_field_mappings` (seeded in 003_pass7.sql) to map internal
// columns → FinCEN BSA E-File XSD elements.
//
// Output is hand-rolled XML to avoid new npm deps.

const express = require('express');
const router = express.Router();
const pool = require('../config/database');

function xmlEscape(v) {
  if (v == null) return '';
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildElement(path, value) {
  // Convert "Root/Branch/Leaf" → <Root><Branch><Leaf>value</Leaf></Branch></Root>
  const parts = String(path).split('/').filter(Boolean);
  if (!parts.length) return '';
  let opening = '';
  let closing = '';
  for (let i = 0; i < parts.length - 1; i++) {
    opening += `<${parts[i]}>`;
    closing = `</${parts[i]}>` + closing;
  }
  return `${opening}<${parts[parts.length - 1]}>${xmlEscape(value)}</${parts[parts.length - 1]}>${closing}`;
}

// GET /api/fincen-exports/mappings?filing_type=SAR
router.get('/mappings', async (req, res) => {
  try {
    const { filing_type } = req.query;
    let r;
    if (filing_type) {
      r = await pool.query('SELECT * FROM fincen_field_mappings WHERE filing_type = $1 ORDER BY internal_path', [filing_type]);
    } else {
      r = await pool.query('SELECT * FROM fincen_field_mappings ORDER BY filing_type, internal_path');
    }
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/fincen-exports/mappings
router.post('/mappings', async (req, res) => {
  try {
    const { filing_type, internal_path, xsd_element, required, notes } = req.body || {};
    if (!filing_type || !internal_path || !xsd_element) {
      return res.status(400).json({ error: 'filing_type, internal_path, xsd_element are required' });
    }
    const r = await pool.query(
      `INSERT INTO fincen_field_mappings (filing_type, internal_path, xsd_element, required, notes)
       VALUES ($1, $2, $3, COALESCE($4, TRUE), $5)
       ON CONFLICT (filing_type, internal_path, xsd_element) DO NOTHING
       RETURNING *`,
      [filing_type, internal_path, xsd_element, required, notes]
    );
    res.json(r.rows[0] || { ok: true, duplicate: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Internal helper: resolve sar / ctr / generic row + customer.
async function loadCaseAndSubject(filing_type, case_ref) {
  if (filing_type === 'SAR') {
    const r = await pool.query('SELECT * FROM sar_cases WHERE case_id = $1', [case_ref]);
    if (!r.rowCount) return null;
    const caseRow = r.rows[0];
    let subject = null;
    if (caseRow.customer_id) {
      const c = await pool.query('SELECT * FROM customers WHERE customer_id = $1', [caseRow.customer_id]);
      subject = c.rows[0] || null;
    }
    return { sar_cases: caseRow, customers: subject };
  }
  if (filing_type === 'CTR') {
    const r = await pool.query('SELECT * FROM ctrs WHERE ctr_id = $1', [case_ref]);
    if (!r.rowCount) return null;
    const caseRow = r.rows[0];
    let subject = null;
    if (caseRow.customer_id) {
      const c = await pool.query('SELECT * FROM customers WHERE customer_id = $1', [caseRow.customer_id]);
      subject = c.rows[0] || null;
    }
    return { ctrs: caseRow, customers: subject };
  }
  if (filing_type === '8300') {
    const r = await pool.query('SELECT * FROM transactions WHERE txn_id = $1', [case_ref]);
    if (!r.rowCount) return null;
    return { transactions: r.rows[0] };
  }
  if (filing_type === 'FBAR') {
    const r = await pool.query('SELECT * FROM accounts WHERE account_id = $1', [case_ref]);
    if (!r.rowCount) return null;
    return { accounts: r.rows[0] };
  }
  if (filing_type === 'OFAC') {
    const r = await pool.query('SELECT * FROM sanctions_hits WHERE hit_id = $1', [case_ref]);
    if (!r.rowCount) return null;
    return { sanctions_hits: r.rows[0] };
  }
  return null;
}

// GET /api/fincen-exports/:filing_type/:case_ref
// Builds XML using the mapping table.  Returns { xml, mappings_used, missing_required }.
router.get('/:filing_type/:case_ref', async (req, res) => {
  try {
    const { filing_type, case_ref } = req.params;
    const mappings = await pool.query(
      'SELECT * FROM fincen_field_mappings WHERE filing_type = $1 ORDER BY internal_path',
      [filing_type]
    );
    if (!mappings.rowCount) return res.status(404).json({ error: `no field mappings for ${filing_type}` });
    const sources = await loadCaseAndSubject(filing_type, case_ref);
    if (!sources) return res.status(404).json({ error: `${filing_type} ${case_ref} not found` });

    const body = [];
    const used = [];
    const missing_required = [];
    for (const m of mappings.rows) {
      const [tbl, col] = String(m.internal_path).split('.');
      const row = sources[tbl];
      const v = row ? row[col] : null;
      if (v == null || v === '') {
        if (m.required) missing_required.push(m.internal_path);
      } else {
        body.push(buildElement(m.xsd_element, v));
        used.push({ internal_path: m.internal_path, xsd_element: m.xsd_element, value: v });
      }
    }

    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<FinCENExport filing_type="${xmlEscape(filing_type)}" case_ref="${xmlEscape(case_ref)}" generated_at="${new Date().toISOString()}">\n` +
      body.map((b) => `  ${b}`).join('\n') +
      `\n</FinCENExport>\n`;

    res.json({
      filing_type, case_ref, xml,
      mappings_used: used,
      missing_required,
      auto_file_capable: false,           // see /api/advisory/auto-file
      requires_human_review: true,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

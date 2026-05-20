/**
 * customViews.js — domain-specific compliance visualisations.
 *
 *   GET /api/custom-views/tx-network        Top-30 customers + their transactions
 *                                          shaped as { nodes, edges } for react-flow.
 *   GET /api/custom-views/sanctions-timeline  Each sanctions_hit projected as a
 *                                          ScatterChart point { ts, score, ... }.
 *   GET /api/custom-views/risk-heatmap      Customers grouped by risk_tier + country,
 *                                          area = AUM (sum of account balances).
 *   GET /api/custom-views/sar-funnel        SAR cases bucketed by funnel stage.
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/database');

/* ─────────────────────────── 1. Transaction Network Graph ─────────────────────────── */
router.get('/tx-network', async (req, res) => {
  try {
    // Pick the 30 customers with the most transaction activity.
    const topCustomers = await pool.query(`
      SELECT c.customer_id,
             c.name,
             c.risk_tier,
             c.country,
             COALESCE(SUM(t.amount), 0)::float AS total_amount,
             COUNT(t.id)                       AS txn_count
        FROM customers c
        LEFT JOIN accounts     a ON a.customer_id = c.customer_id
        LEFT JOIN transactions t ON t.account_id  = a.account_id
       GROUP BY c.customer_id, c.name, c.risk_tier, c.country
       ORDER BY total_amount DESC NULLS LAST
       LIMIT 30
    `);

    const customers = topCustomers.rows;
    const ids = customers.map((c) => c.customer_id);

    // Pull transactions whose account belongs to one of the top-30
    // and whose counterparty matches another top-30 customer name.
    let edges = [];
    if (ids.length) {
      const txns = await pool.query(
        `
        SELECT t.txn_id,
               t.amount::float    AS amount,
               t.currency,
               t.counterparty,
               t.ts,
               t.notes,
               a.customer_id      AS from_customer
          FROM transactions t
          JOIN accounts a ON a.account_id = t.account_id
         WHERE a.customer_id = ANY($1::text[])
         ORDER BY t.amount DESC
         LIMIT 400
        `,
        [ids]
      );

      const nameToId = new Map(customers.map((c) => [c.name, c.customer_id]));
      edges = txns.rows
        .map((t) => {
          // Match counterparty (textual) to one of our top-30 customer names.
          const toId = nameToId.get(t.counterparty);
          if (!toId || toId === t.from_customer) return null;
          return {
            id:      `e_${t.txn_id}`,
            source:  t.from_customer,
            target:  toId,
            txn_id:  t.txn_id,
            amount:  t.amount,
            currency: t.currency,
            counterparty: t.counterparty,
            ts:      t.ts,
            notes:   t.notes,
          };
        })
        .filter(Boolean);
    }

    // Layout the customers on a circle so the graph looks intelligible.
    const R = 360;
    const nodes = customers.map((c, i) => {
      const theta = (2 * Math.PI * i) / Math.max(customers.length, 1);
      return {
        id:    c.customer_id,
        name:  c.name,
        risk_tier:    c.risk_tier,
        country:      c.country,
        total_amount: c.total_amount,
        txn_count:    Number(c.txn_count),
        x: 420 + R * Math.cos(theta),
        y: 360 + R * Math.sin(theta),
      };
    });

    res.json({ nodes, edges });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ───────────────────────────── 2. Sanctions Hits Timeline ─────────────────────────── */
router.get('/sanctions-timeline', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT h.hit_id,
             h.customer_id,
             c.name              AS customer_name,
             h.list,
             h.score,
             h.matched_field,
             h.status,
             h.created_at        AS ts
        FROM sanctions_hits h
        LEFT JOIN customers c ON c.customer_id = h.customer_id
       ORDER BY h.created_at ASC
    `);

    const points = r.rows.map((row) => ({
      hit_id:        row.hit_id,
      customer_id:   row.customer_id,
      customer_name: row.customer_name,
      list:          row.list,
      matched_field: row.matched_field,
      status:        row.status,
      score:         Number(row.score) || 0,
      ts:            row.ts,
      // Numeric x-axis in days-since-epoch makes the ScatterChart well-scaled.
      ts_day:        row.ts ? Math.floor(new Date(row.ts).getTime() / 86400000) : 0,
    }));

    res.json({ points, count: points.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ───────────────────────────── 3. Customer Risk Heatmap (Treemap) ─────────────────── */
router.get('/risk-heatmap', async (req, res) => {
  try {
    // AUM is derived: customer's account balance roll-up.
    const r = await pool.query(`
      SELECT c.customer_id,
             c.name,
             COALESCE(c.risk_tier, 'unknown') AS risk_tier,
             COALESCE(c.country,   'Unknown') AS country,
             COALESCE(SUM(a.balance), 0)::float AS aum
        FROM customers c
        LEFT JOIN accounts a ON a.customer_id = c.customer_id
       GROUP BY c.customer_id, c.name, c.risk_tier, c.country
       HAVING COALESCE(SUM(a.balance), 0) > 0
       ORDER BY aum DESC
    `);

    const tierColor = {
      high:    '#dc2626',
      medium:  '#f59e0b',
      low:     '#10b981',
      unknown: '#64748b',
    };

    // Group:  risk_tier  →  country  →  [customers]
    const tierBuckets = new Map();
    for (const row of r.rows) {
      if (!tierBuckets.has(row.risk_tier)) tierBuckets.set(row.risk_tier, new Map());
      const countries = tierBuckets.get(row.risk_tier);
      if (!countries.has(row.country)) countries.set(row.country, []);
      countries.get(row.country).push({
        name: row.name,
        customer_id: row.customer_id,
        size: row.aum,
      });
    }

    const tree = [];
    for (const [tier, countries] of tierBuckets.entries()) {
      const tierChildren = [];
      for (const [country, customers] of countries.entries()) {
        tierChildren.push({
          name: `${tier} · ${country}`,
          children: customers,
        });
      }
      tree.push({
        name: tier.toUpperCase(),
        fill: tierColor[tier] || '#64748b',
        children: tierChildren,
      });
    }

    res.json({
      tree,
      total_customers: r.rows.length,
      total_aum: r.rows.reduce((s, row) => s + row.aum, 0),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ──────────────────────────────── 4. SAR Case Funnel ──────────────────────────────── */
router.get('/sar-funnel', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT LOWER(COALESCE(status, 'unknown')) AS status, COUNT(*)::int AS n
        FROM sar_cases
       GROUP BY LOWER(COALESCE(status, 'unknown'))
    `);

    const byStatus = new Map(r.rows.map((row) => [row.status, row.n]));

    // Map noisy seed values to the four canonical funnel stages.
    const aliases = {
      draft:     ['draft', 'new', 'opened', 'open'],
      in_review: ['in_review', 'review', 'reviewing', 'investigating', 'pending'],
      filed:     ['filed', 'submitted'],
      closed:    ['closed', 'closed_no_action', 'rejected', 'resolved'],
    };

    const palette = {
      draft:     '#64748b',
      in_review: '#f59e0b',
      filed:     '#3b82f6',
      closed:    '#10b981',
    };

    const stages = ['draft', 'in_review', 'filed', 'closed'].map((stage) => {
      const aliasList = aliases[stage];
      const value = aliasList.reduce((s, alias) => s + (byStatus.get(alias) || 0), 0);
      return { name: stage, value, fill: palette[stage] };
    });

    const total = stages.reduce((s, st) => s + st.value, 0);

    res.json({
      stages,
      total,
      raw_status_counts: Object.fromEntries(byStatus),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─────────────────────────── 5. OFAC Sanctions Scoring (Mock) ─────────────────────── */
/**
 * Hardcoded mock SDN (Specially Designated Nationals) list — NO external API calls.
 * Includes the 5 quick-fill demo targets plus filler entries.
 */
const MOCK_SDN_LIST = [
  // Demo quick-fill targets (high-confidence matches)
  { sdn_name: 'Vladimir Putin',          type: 'Individual', country: 'Russia',       list_type: 'SDN',     program: 'UKRAINE-EO13661' },
  { sdn_name: 'ISIS Al-Furqan Media',    type: 'Entity',     country: 'Syria',        list_type: 'SDN',     program: 'SDGT' },
  { sdn_name: 'Bashar al-Assad',         type: 'Individual', country: 'Syria',        list_type: 'SDN',     program: 'SYRIA' },
  { sdn_name: 'Kim Jong Un',             type: 'Individual', country: 'North Korea',  list_type: 'SDN',     program: 'DPRK4' },
  { sdn_name: 'John Smith',              type: 'Individual', country: 'United States', list_type: 'Non-SDN', program: 'PLC' },
  // Filler
  { sdn_name: 'Viktor Bout',             type: 'Individual', country: 'Russia',       list_type: 'SDN',     program: 'NARCO' },
  { sdn_name: 'Joaquin Guzman Loera',    type: 'Individual', country: 'Mexico',       list_type: 'SDN',     program: 'SDNTK' },
  { sdn_name: 'Hezbollah',               type: 'Entity',     country: 'Lebanon',      list_type: 'SDN',     program: 'SDGT' },
  { sdn_name: 'Wagner Group',            type: 'Entity',     country: 'Russia',       list_type: 'SDN',     program: 'UKRAINE-EO13660' },
  { sdn_name: 'Maduro Moros Nicolas',    type: 'Individual', country: 'Venezuela',    list_type: 'SDN',     program: 'VENEZUELA-EO13692' },
  { sdn_name: 'Al-Qaeda',                type: 'Entity',     country: 'Afghanistan',  list_type: 'SDN',     program: 'SDGT' },
  { sdn_name: 'Sergey Lavrov',           type: 'Individual', country: 'Russia',       list_type: 'SDN',     program: 'RUSSIA-EO14024' },
  { sdn_name: 'Tanker Concord',          type: 'Vessel',     country: 'Iran',         list_type: 'SDN',     program: 'IRAN' },
  { sdn_name: 'Bank Melli Iran',         type: 'Entity',     country: 'Iran',         list_type: 'SDN',     program: 'IRAN' },
  { sdn_name: 'Maria Butina',            type: 'Individual', country: 'Russia',       list_type: 'Non-SDN', program: 'PLC' },
];

function tokenize(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function jaccard(aTokens, bTokens) {
  const A = new Set(aTokens);
  const B = new Set(bTokens);
  if (A.size === 0 && B.size === 0) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter += 1;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

function scoreNameMatch(input, candidate) {
  const inTokens = tokenize(input);
  const caTokens = tokenize(candidate);
  if (inTokens.length === 0) return { score: 0, reason: 'empty input' };

  const j = jaccard(inTokens, caTokens);            // 0..1
  let score = j * 80;                                // base contribution up to 80

  const inLower = input.toLowerCase().trim();
  const caLower = candidate.toLowerCase().trim();

  // Substring boost
  if (caLower.includes(inLower) || inLower.includes(caLower)) {
    score += 25;
  }

  // Per-token substring boost
  let tokenSubHits = 0;
  for (const t of inTokens) {
    if (t.length < 3) continue;
    if (caLower.includes(t)) tokenSubHits += 1;
  }
  score += Math.min(tokenSubHits * 5, 15);

  // Exact match cap
  if (inLower === caLower) score = 100;

  score = Math.max(0, Math.min(100, Math.round(score)));

  // Build human-readable match reason
  const reasons = [];
  if (inLower === caLower) reasons.push('exact name match');
  else if (caLower.includes(inLower) || inLower.includes(caLower)) reasons.push('substring match');
  if (j > 0) reasons.push(`token overlap ${(j * 100).toFixed(0)}%`);
  if (tokenSubHits > 0 && !(inLower === caLower)) reasons.push(`${tokenSubHits} token substring hits`);

  return { score, reason: reasons.join('; ') || 'weak similarity' };
}

router.post('/ofac-score', (req, res) => {
  try {
    const { name } = req.body || {};
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }

    const query = name.trim();

    const scored = MOCK_SDN_LIST.map((entry) => {
      const { score, reason } = scoreNameMatch(query, entry.sdn_name);
      return {
        sdn_name:     entry.sdn_name,
        type:         entry.type,
        country:      entry.country,
        program:      entry.program,
        list_type:    entry.list_type,
        score,
        match_reason: reason,
      };
    }).sort((a, b) => b.score - a.score);

    const top = scored.slice(0, 3);
    const best = top[0] || { score: 0, list_type: 'no-match' };
    const matchScore = best.score;

    let listType;
    let recommendedAction;

    if (matchScore < 30) {
      listType = 'no-match';
      recommendedAction = 'clear';
    } else {
      listType = best.list_type || 'SDN';
      if (matchScore >= 80) recommendedAction = 'block';
      else if (matchScore >= 50) recommendedAction = 'review';
      else recommendedAction = 'clear';
    }

    // For genuinely unrecognized clean names: enforce the spec default.
    if (matchScore < 30) {
      return res.json({
        query,
        match_score: 12,
        top_matches: top,
        list_type: 'no-match',
        recommended_action: 'clear',
      });
    }

    res.json({
      query,
      match_score: matchScore,
      top_matches: top,
      list_type: listType,
      recommended_action: recommendedAction,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;

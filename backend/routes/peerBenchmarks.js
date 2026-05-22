// Quantitative peer-group benchmarking (Pass 7 — MECHANICAL).
// SQL aggregates against customers / accounts / transactions — no LLM call.

const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET /api/peer-benchmarks?type=corporate&country=US
// or:  /api/peer-benchmarks?customer_id=C-4421  → returns the customer's
//      stats alongside its peer group (same `type`).
router.get('/', async (req, res) => {
  try {
    const { customer_id, type, country, risk_tier } = req.query;

    let groupType = type;
    let groupCountry = country;
    let focusCustomer = null;

    if (customer_id) {
      const r = await pool.query('SELECT * FROM customers WHERE customer_id = $1', [customer_id]);
      focusCustomer = r.rows[0] || null;
      if (focusCustomer) {
        groupType = groupType || focusCustomer.type;
        groupCountry = groupCountry || focusCustomer.country;
      }
    }

    const where = [];
    const params = [];
    if (groupType)    { params.push(groupType);    where.push(`c.type = $${params.length}`); }
    if (groupCountry) { params.push(groupCountry); where.push(`c.country = $${params.length}`); }
    if (risk_tier)    { params.push(risk_tier);    where.push(`c.risk_tier = $${params.length}`); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // Peer aggregates
    const peerStats = await pool.query(
      `
      SELECT
        COUNT(DISTINCT c.customer_id)::int                                  AS peer_count,
        COALESCE(AVG(a.balance)::float, 0)                                  AS avg_balance,
        COALESCE(percentile_cont(0.5) WITHIN GROUP (ORDER BY a.balance), 0) AS median_balance,
        COALESCE(SUM(a.balance)::float, 0)                                  AS total_balance,
        COUNT(DISTINCT a.account_id)::int                                   AS account_count
      FROM customers c
      LEFT JOIN accounts a ON a.customer_id = c.customer_id
      ${whereSql}
      `,
      params
    );

    const peerTx = await pool.query(
      `
      SELECT
        COUNT(t.id)::int                              AS txn_count,
        COALESCE(AVG(t.amount)::float, 0)             AS avg_amount,
        COALESCE(STDDEV_POP(t.amount)::float, 0)      AS stddev_amount,
        COALESCE(MAX(t.amount)::float, 0)             AS max_amount,
        COALESCE(SUM(t.amount)::float, 0)             AS total_amount
      FROM customers c
      LEFT JOIN accounts a     ON a.customer_id = c.customer_id
      LEFT JOIN transactions t ON t.account_id  = a.account_id
      ${whereSql}
      `,
      params
    );

    const peerAlerts = await pool.query(
      `
      SELECT
        COUNT(al.id)::int                                                 AS alert_count,
        COUNT(*) FILTER (WHERE al.severity IN ('high','critical'))::int   AS high_severity,
        COUNT(*) FILTER (WHERE al.status   = 'open')::int                 AS open_alerts
      FROM customers c
      LEFT JOIN alerts al ON al.customer_id = c.customer_id
      ${whereSql}
      `,
      params
    );

    // Focus customer stats (if customer_id given)
    let customer_stats = null;
    if (focusCustomer) {
      const r = await pool.query(
        `
        SELECT
          COALESCE(SUM(a.balance)::float, 0)         AS balance,
          COALESCE(SUM(t.amount)::float, 0)          AS total_amount,
          COUNT(t.id)::int                           AS txn_count,
          COALESCE(AVG(t.amount)::float, 0)          AS avg_amount,
          COALESCE(MAX(t.amount)::float, 0)          AS max_amount,
          (SELECT COUNT(*)::int FROM alerts WHERE customer_id = $1)        AS alert_count,
          (SELECT COUNT(*)::int FROM sanctions_hits WHERE customer_id = $1) AS sanctions_count,
          (SELECT COUNT(*)::int FROM sar_cases WHERE customer_id = $1)      AS sar_count
        FROM customers c
        LEFT JOIN accounts a ON a.customer_id = c.customer_id
        LEFT JOIN transactions t ON t.account_id = a.account_id
        WHERE c.customer_id = $1
        `,
        [focusCustomer.customer_id]
      );
      customer_stats = r.rows[0] || null;
    }

    res.json({
      filters: { customer_id: customer_id || null, type: groupType || null, country: groupCountry || null, risk_tier: risk_tier || null },
      peer_aggregates: {
        ...peerStats.rows[0],
        ...peerTx.rows[0],
        ...peerAlerts.rows[0],
      },
      customer_stats,
      customer: focusCustomer,
      computed_at: new Date().toISOString(),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;

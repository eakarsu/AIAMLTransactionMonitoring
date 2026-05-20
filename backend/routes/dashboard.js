const express = require('express');
const router = express.Router();
const pool = require('../config/database');

router.get('/', async (req, res) => {
  try {
    const [
      customers, accounts, transactions, sanctionsHits, sarCases, ctrs,
      kycProfiles, watchlists, typologies, beneficialOwners, peps, jurisdictions,
      investigations, alerts, auditLog, sourceOfFunds, eddCases, regulatoryFilings,
    ] = await Promise.all([
      pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE risk_tier='high') AS high_risk, COUNT(*) FILTER (WHERE status='active') AS active FROM customers"),
      pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='open') AS open, COUNT(*) FILTER (WHERE status='frozen') AS frozen, COALESCE(SUM(balance),0) AS total_balance FROM accounts"),
      pool.query("SELECT COUNT(*) AS total, COALESCE(SUM(amount),0) AS total_amount FROM transactions"),
      pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='open') AS open, COUNT(*) FILTER (WHERE status='confirmed') AS confirmed FROM sanctions_hits"),
      pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='draft') AS draft, COUNT(*) FILTER (WHERE status='filed') AS filed, COUNT(*) FILTER (WHERE status='review') AS review FROM sar_cases"),
      pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='filed') AS filed, COUNT(*) FILTER (WHERE status='pending') AS pending FROM ctrs"),
      pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='expired') AS expired, COUNT(*) FILTER (WHERE status='expiring') AS expiring FROM kyc_profiles"),
      pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='active') AS active FROM watchlists"),
      pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE severity='critical') AS critical, COUNT(*) FILTER (WHERE severity='high') AS high FROM typologies"),
      pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE verified=true) AS verified, COUNT(*) FILTER (WHERE verified=false) AS unverified FROM beneficial_owners"),
      pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='active') AS active FROM peps"),
      pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE fatf_rating='high-risk') AS high_risk FROM jurisdictions"),
      pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='open') AS open, COUNT(*) FILTER (WHERE status='closed') AS closed FROM investigations"),
      pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE severity='critical') AS critical, COUNT(*) FILTER (WHERE severity='high') AS high, COUNT(*) FILTER (WHERE status='open') AS open FROM alerts"),
      pool.query("SELECT COUNT(*) AS total FROM audit_log"),
      pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='verified') AS verified, COUNT(*) FILTER (WHERE status='pending') AS pending FROM source_of_funds"),
      pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='open') AS open FROM edd_cases"),
      pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='filed') AS filed, COUNT(*) FILTER (WHERE status='draft') AS draft FROM regulatory_filings"),
    ]);
    res.json({
      customers: customers.rows[0],
      accounts: accounts.rows[0],
      transactions: transactions.rows[0],
      sanctions_hits: sanctionsHits.rows[0],
      sar_cases: sarCases.rows[0],
      ctrs: ctrs.rows[0],
      kyc_profiles: kycProfiles.rows[0],
      watchlists: watchlists.rows[0],
      typologies: typologies.rows[0],
      beneficial_owners: beneficialOwners.rows[0],
      peps: peps.rows[0],
      jurisdictions: jurisdictions.rows[0],
      investigations: investigations.rows[0],
      alerts: alerts.rows[0],
      audit_log: auditLog.rows[0],
      source_of_funds: sourceOfFunds.rows[0],
      edd_cases: eddCases.rows[0],
      regulatory_filings: regulatoryFilings.rows[0],
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

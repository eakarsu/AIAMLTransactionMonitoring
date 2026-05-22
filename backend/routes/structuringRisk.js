const router = require('express').Router();

router.post('/score', (req, res) => {
  const { cashDeposits = 0, avgDepositAmount = 0, daysWindow = 7, branchesUsed = 1, roundedAmountsPct = 0 } = req.body || {};
  const nearThreshold = Number(avgDepositAmount) >= 8000 && Number(avgDepositAmount) < 10000;
  const score = Math.min(100, Math.round(
    Number(cashDeposits) * 5 +
    (nearThreshold ? 25 : 0) +
    Math.max(0, 10 - Number(daysWindow)) * 2 +
    Math.max(0, Number(branchesUsed) - 1) * 8 +
    Number(roundedAmountsPct) * 0.25
  ));
  res.json({
    feature: 'structuring_risk',
    score,
    level: score >= 70 ? 'sar-review' : score >= 40 ? 'investigate' : 'monitor',
    actions: [
      nearThreshold && 'Review deposits just below reporting threshold.',
      Number(branchesUsed) > 1 && 'Check branch hopping pattern across same beneficial owner.',
      Number(roundedAmountsPct) > 50 && 'Inspect repeated rounded cash amount behavior.',
    ].filter(Boolean),
  });
});

module.exports = router;

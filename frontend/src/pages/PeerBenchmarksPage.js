import React, { useState } from 'react';
import { getPeerBenchmarks } from '../services/api';
import ReferenceSelect from '../components/ReferenceSelect';

function StatRow({ label, value, money }) {
  let display = value;
  if (typeof value === 'number') {
    display = money ? `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : value.toLocaleString();
  }
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1e293b' }}>
      <span style={{ color: '#94a3b8', fontSize: 13 }}>{label}</span>
      <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 13 }}>{display ?? '—'}</span>
    </div>
  );
}

export default function PeerBenchmarksPage() {
  const [filters, setFilters] = useState({ customer_id: '', type: '', country: '', risk_tier: '' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const setField = (k, v) => setFilters((s) => ({ ...s, [k]: v }));

  const run = async () => {
    setLoading(true); setError(null); setResult(null);
    try {
      const r = await getPeerBenchmarks(filters);
      setResult(r);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const agg = result?.peer_aggregates || {};
  const cust = result?.customer_stats;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Peer-Group Benchmarks</h2>
          <p>Quantitative SQL aggregates against customers / accounts / transactions / alerts. No LLM call.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn ai" onClick={run} disabled={loading}>
            {loading ? <><span className="spinner" />Running...</> : 'Compute Benchmarks'}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="form-grid">
          <div className="form-group">
            <label>Customer ID (auto-fills type+country)</label>
            <ReferenceSelect
              source="customers"
              value={filters.customer_id}
              onChange={(value) => setField('customer_id', value)}
              allowEmpty
              emptyLabel="Optional focus customer"
            />
          </div>
          <div className="form-group">
            <label>Type</label>
            <ReferenceSelect
              source="customerTypes"
              value={filters.type}
              onChange={(value) => setField('type', value)}
              allowEmpty
              emptyLabel="Any type"
            />
          </div>
          <div className="form-group">
            <label>Country</label>
            <ReferenceSelect
              source="customerCountries"
              value={filters.country}
              onChange={(value) => setField('country', value)}
              allowEmpty
              emptyLabel="Any country"
            />
          </div>
          <div className="form-group">
            <label>Risk Tier</label>
            <ReferenceSelect
              source="riskTiers"
              value={filters.risk_tier}
              onChange={(value) => setField('risk_tier', value)}
              allowEmpty
              emptyLabel="Any risk tier"
            />
          </div>
        </div>
      </div>

      {error && <div className="ai-error" style={{ marginTop: 12 }}>{error}</div>}

      {result && (
        <div style={{ display: 'grid', gridTemplateColumns: cust ? '1fr 1fr' : '1fr', gap: 16, marginTop: 16 }}>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Peer Aggregates</h3>
            <StatRow label="Peer Count"      value={agg.peer_count} />
            <StatRow label="Account Count"   value={agg.account_count} />
            <StatRow label="Avg Balance"     value={agg.avg_balance}    money />
            <StatRow label="Median Balance"  value={agg.median_balance} money />
            <StatRow label="Total Balance"   value={agg.total_balance}  money />
            <StatRow label="Txn Count"       value={agg.txn_count} />
            <StatRow label="Avg Amount"      value={agg.avg_amount}     money />
            <StatRow label="Stddev Amount"   value={agg.stddev_amount}  money />
            <StatRow label="Max Amount"      value={agg.max_amount}     money />
            <StatRow label="Total Amount"    value={agg.total_amount}   money />
            <StatRow label="Alert Count"     value={agg.alert_count} />
            <StatRow label="High-Sev Alerts" value={agg.high_severity} />
            <StatRow label="Open Alerts"     value={agg.open_alerts} />
          </div>
          {cust && (
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Focus Customer: {result.customer?.name || filters.customer_id}</h3>
              <StatRow label="Balance"        value={cust.balance}      money />
              <StatRow label="Txn Count"      value={cust.txn_count} />
              <StatRow label="Avg Amount"     value={cust.avg_amount}   money />
              <StatRow label="Max Amount"     value={cust.max_amount}   money />
              <StatRow label="Total Amount"   value={cust.total_amount} money />
              <StatRow label="Alert Count"    value={cust.alert_count} />
              <StatRow label="Sanctions Hits" value={cust.sanctions_count} />
              <StatRow label="SAR Cases"      value={cust.sar_count} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

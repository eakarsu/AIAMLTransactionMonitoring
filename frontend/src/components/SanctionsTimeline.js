import React, { useEffect, useMemo, useState } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import { API_BASE, getToken } from '../services/api';

/**
 * Sanctions Hits Timeline — ScatterChart where:
 *   X-axis: days-since-epoch (ts_day)
 *   Y-axis: match score (0..100)
 *   Color : derived from score bucket  (red high, amber med, green low)
 */
function colorForScore(s) {
  if (s >= 80) return '#dc2626'; // critical
  if (s >= 60) return '#f59e0b'; // high
  if (s >= 40) return '#eab308'; // medium
  return '#10b981';              // low
}

function dayToLabel(d) {
  if (!d) return '';
  const date = new Date(d * 86400000);
  return date.toISOString().slice(0, 10);
}

function CustomTip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  return (
    <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 10, color: '#e2e8f0', fontSize: 12 }}>
      <div><strong>Hit {p.hit_id}</strong></div>
      <div>Customer: {p.customer_name || p.customer_id}</div>
      <div>List: {p.list}</div>
      <div>Field: {p.matched_field}</div>
      <div>Status: {p.status}</div>
      <div>Score: <span style={{ color: colorForScore(p.score) }}>{p.score}</span></div>
      <div>When: {p.ts ? new Date(p.ts).toLocaleString() : '—'}</div>
    </div>
  );
}

export default function SanctionsTimeline() {
  const [points,  setPoints]  = useState([]);
  const [err,     setErr]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    fetch(`${API_BASE}/custom-views/sanctions-timeline`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json().then((j) => (r.ok ? j : Promise.reject(j))))
      .then((j) => setPoints(j.points || []))
      .catch((e) => setErr(e.error || e.message || 'load failed'))
      .finally(() => setLoading(false));
  }, []);

  const groups = useMemo(() => {
    const buckets = { critical: [], high: [], medium: [], low: [] };
    for (const p of points) {
      if (p.score >= 80) buckets.critical.push(p);
      else if (p.score >= 60) buckets.high.push(p);
      else if (p.score >= 40) buckets.medium.push(p);
      else buckets.low.push(p);
    }
    return buckets;
  }, [points]);

  const domain = useMemo(() => {
    if (!points.length) return ['auto', 'auto'];
    const xs = points.map((p) => p.ts_day);
    return [Math.min(...xs) - 1, Math.max(...xs) + 1];
  }, [points]);

  return (
    <div style={{ height: 420, background: '#0b1220', border: '1px solid #1e293b', borderRadius: 10, padding: 12 }}>
      {loading && <div style={{ color: '#94a3b8' }}>Loading sanctions timeline…</div>}
      {err     && <div style={{ color: '#f87171' }}>Sanctions timeline unavailable: {err}</div>}

      {!loading && !err && (
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 16, right: 24, bottom: 36, left: 8 }}>
            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="ts_day"
              domain={domain}
              tickFormatter={dayToLabel}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              label={{ value: 'Date', position: 'insideBottom', offset: -10, fill: '#94a3b8' }}
            />
            <YAxis
              type="number"
              dataKey="score"
              domain={[0, 100]}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              label={{ value: 'Match Score', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
            />
            <ZAxis range={[60, 220]} />
            <Tooltip content={<CustomTip />} cursor={{ strokeDasharray: '3 3', stroke: '#475569' }} />
            <Legend wrapperStyle={{ color: '#cbd5e1', fontSize: 12 }} />
            <Scatter name="Critical ≥80" data={groups.critical} fill="#dc2626" />
            <Scatter name="High 60-79"   data={groups.high}     fill="#f59e0b" />
            <Scatter name="Medium 40-59" data={groups.medium}   fill="#eab308" />
            <Scatter name="Low <40"      data={groups.low}      fill="#10b981" />
          </ScatterChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

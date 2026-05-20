import React, { useEffect, useMemo, useState } from 'react';
import {
  FunnelChart, Funnel, LabelList, Tooltip, ResponsiveContainer,
} from 'recharts';
import { API_BASE, getToken } from '../services/api';

function CustomTip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  return (
    <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 10, color: '#e2e8f0', fontSize: 12 }}>
      <div><strong>{(p.name || '').replace('_', ' ').toUpperCase()}</strong></div>
      <div>Cases: {p.value}</div>
    </div>
  );
}

export default function SARFunnel() {
  const [stages,  setStages]  = useState([]);
  const [total,   setTotal]   = useState(0);
  const [raw,     setRaw]     = useState({});
  const [err,     setErr]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    fetch(`${API_BASE}/custom-views/sar-funnel`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json().then((j) => (r.ok ? j : Promise.reject(j))))
      .then((j) => {
        setStages(j.stages || []);
        setTotal(j.total || 0);
        setRaw(j.raw_status_counts || {});
      })
      .catch((e) => setErr(e.error || e.message || 'load failed'))
      .finally(() => setLoading(false));
  }, []);

  // Recharts Funnel renders horizontally by default; rotating the SVG 90deg
  // gives a vertical funnel without forking the library.
  const funnelData = useMemo(() => stages.map((s) => ({
    name:  s.name,
    value: Math.max(s.value, 0),
    fill:  s.fill,
  })), [stages]);

  return (
    <div style={{ background: '#0b1220', border: '1px solid #1e293b', borderRadius: 10, padding: 12 }}>
      <div style={{ color: '#cbd5e1', fontSize: 12, marginBottom: 8 }}>
        SAR pipeline · {total} cases · stages: draft → in_review → filed → closed
      </div>
      <div style={{ height: 380 }}>
        {loading && <div style={{ color: '#94a3b8' }}>Loading SAR funnel…</div>}
        {err     && <div style={{ color: '#f87171' }}>SAR funnel unavailable: {err}</div>}

        {!loading && !err && funnelData.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <FunnelChart>
              <Tooltip content={<CustomTip />} />
              <Funnel
                dataKey="value"
                data={funnelData}
                isAnimationActive={false}
                orientation="vertical"
              >
                <LabelList
                  position="right"
                  fill="#e2e8f0"
                  stroke="none"
                  fontSize={12}
                  formatter={(v, _i, item) => {
                    if (!item) return v;
                    const n = (item.name || '').toUpperCase().replace('_', ' ');
                    return `${n}: ${item.value}`;
                  }}
                  dataKey="name"
                />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        )}
        {!loading && !err && funnelData.length === 0 && (
          <div style={{ color: '#94a3b8' }}>No SAR cases to display.</div>
        )}
      </div>

      {Object.keys(raw).length > 0 && (
        <div style={{ marginTop: 10, color: '#94a3b8', fontSize: 11 }}>
          raw statuses: {Object.entries(raw).map(([k, v]) => `${k}=${v}`).join(' · ')}
        </div>
      )}
    </div>
  );
}

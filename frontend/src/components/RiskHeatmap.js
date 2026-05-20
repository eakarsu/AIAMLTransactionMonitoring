import React, { useEffect, useMemo, useState } from 'react';
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import { API_BASE, getToken } from '../services/api';

function fmtMoney(n) {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B';
  if (Math.abs(v) >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
  if (Math.abs(v) >= 1e3) return '$' + (v / 1e3).toFixed(1) + 'K';
  return '$' + v.toFixed(0);
}

const TIER_FILL = {
  HIGH:    '#dc2626',
  MEDIUM:  '#f59e0b',
  LOW:     '#10b981',
  UNKNOWN: '#64748b',
};

// Recharts will invoke this for every rectangle in the tree.
function CustomCell(props) {
  const { x, y, width, height, depth, name, root } = props;
  // Find the top-level tier ancestor to colour the leaf.
  let tier = name;
  if (depth > 0 && root && root.children) {
    // Walk down to find which tier this cell belongs to by name match isn't trivial,
    // so we fall back to the `fill` recharts assigns from the top-level node.
    tier = (props.tier || name || '').toUpperCase();
  }
  const fill = props.fill || TIER_FILL[(tier || '').toUpperCase()] || '#3b82f6';
  return (
    <g>
      <rect
        x={x} y={y} width={width} height={height}
        style={{
          fill,
          stroke: '#0b1220',
          strokeWidth: 2 / (depth + 1),
          fillOpacity: depth === 1 ? 0.85 : 0.7,
        }}
      />
      {depth === 1 && width > 70 && height > 24 && (
        <text x={x + 6} y={y + 16} fill="#0b1220" fontSize={11} fontWeight={700}>
          {name}
        </text>
      )}
      {depth === 2 && width > 50 && height > 18 && (
        <text x={x + 4} y={y + 14} fill="#0b1220" fontSize={10}>
          {(name || '').slice(0, Math.max(2, Math.floor(width / 7)))}
        </text>
      )}
    </g>
  );
}

function CustomTip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  return (
    <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 10, color: '#e2e8f0', fontSize: 12 }}>
      <div><strong>{p.name}</strong></div>
      {p.size != null && <div>AUM: {fmtMoney(p.size)}</div>}
      {p.value != null && p.size == null && <div>Value: {fmtMoney(p.value)}</div>}
    </div>
  );
}

export default function RiskHeatmap() {
  const [tree,    setTree]    = useState([]);
  const [meta,    setMeta]    = useState({ total_customers: 0, total_aum: 0 });
  const [err,     setErr]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    fetch(`${API_BASE}/custom-views/risk-heatmap`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json().then((j) => (r.ok ? j : Promise.reject(j))))
      .then((j) => {
        setTree(j.tree || []);
        setMeta({ total_customers: j.total_customers || 0, total_aum: j.total_aum || 0 });
      })
      .catch((e) => setErr(e.error || e.message || 'load failed'))
      .finally(() => setLoading(false));
  }, []);

  // Flatten tree into a structure recharts Treemap can colour by tier.
  const data = useMemo(() => tree.map((t) => ({
    name: t.name,
    fill: t.fill,
    children: (t.children || []).map((country) => ({
      name: country.name,
      fill: t.fill,
      children: (country.children || []).map((cust) => ({
        name: cust.name,
        size: cust.size,
        fill: t.fill,
      })),
    })),
  })), [tree]);

  return (
    <div style={{ background: '#0b1220', border: '1px solid #1e293b', borderRadius: 10, padding: 12 }}>
      <div style={{ color: '#cbd5e1', fontSize: 12, marginBottom: 8 }}>
        {meta.total_customers} customers · AUM {fmtMoney(meta.total_aum)} · sized by balance, grouped by risk tier → country
      </div>
      <div style={{ height: 420 }}>
        {loading && <div style={{ color: '#94a3b8' }}>Loading risk heatmap…</div>}
        {err     && <div style={{ color: '#f87171' }}>Risk heatmap unavailable: {err}</div>}

        {!loading && !err && data.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={data}
              dataKey="size"
              stroke="#0b1220"
              isAnimationActive={false}
              content={<CustomCell />}
            >
              <Tooltip content={<CustomTip />} />
            </Treemap>
          </ResponsiveContainer>
        )}
        {!loading && !err && data.length === 0 && (
          <div style={{ color: '#94a3b8' }}>No customer balance data to map.</div>
        )}
      </div>
    </div>
  );
}

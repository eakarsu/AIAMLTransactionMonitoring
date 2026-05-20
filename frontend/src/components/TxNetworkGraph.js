import React, { useEffect, useMemo, useState, useCallback } from 'react';
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow';
import 'reactflow/dist/style.css';
import { API_BASE, getToken } from '../services/api';

const TIER_COLOR = {
  high:   '#dc2626',
  medium: '#f59e0b',
  low:    '#10b981',
};

function nodeStyle(risk) {
  const color = TIER_COLOR[risk] || '#3b82f6';
  return {
    background: '#0f172a',
    color:      '#e2e8f0',
    border:     `2px solid ${color}`,
    borderRadius: 10,
    fontSize:   11,
    padding:    '6px 10px',
    width:      160,
  };
}

function fmtMoney(n) {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
  if (Math.abs(v) >= 1e3) return '$' + (v / 1e3).toFixed(1) + 'K';
  return '$' + v.toFixed(0);
}

export default function TxNetworkGraph() {
  const [data,    setData]    = useState({ nodes: [], edges: [] });
  const [err,     setErr]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [picked,  setPicked]  = useState(null);

  useEffect(() => {
    const token = getToken();
    fetch(`${API_BASE}/custom-views/tx-network`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json().then((j) => (r.ok ? j : Promise.reject(j))))
      .then(setData)
      .catch((e) => setErr(e.error || e.message || 'load failed'))
      .finally(() => setLoading(false));
  }, []);

  // Convert backend rows to react-flow shapes.
  const flow = useMemo(() => {
    const maxAmt = Math.max(1, ...data.edges.map((e) => e.amount || 0));
    const nodes = data.nodes.map((n) => ({
      id:       String(n.id),
      position: { x: n.x, y: n.y },
      data:     { label: (
        <div>
          <div style={{ fontWeight: 600 }}>{n.name}</div>
          <div style={{ color: '#94a3b8', marginTop: 2 }}>
            {n.country || '—'} · {n.risk_tier || '—'}
          </div>
          <div style={{ color: '#cbd5e1', marginTop: 2 }}>
            {n.txn_count} txns · {fmtMoney(n.total_amount)}
          </div>
        </div>
      ) },
      style: nodeStyle(n.risk_tier),
    }));

    const edges = data.edges.map((e) => {
      const width = Math.max(1, Math.round((e.amount / maxAmt) * 8));
      return {
        id:     String(e.id),
        source: String(e.source),
        target: String(e.target),
        animated: width >= 5,
        style:  { stroke: '#38bdf8', strokeWidth: width, opacity: 0.7 },
        data:   e,
      };
    });

    return { nodes, edges };
  }, [data]);

  const onEdgeClick = useCallback((_e, edge) => setPicked(edge.data), []);

  return (
    <div style={{ height: 560, position: 'relative', background: '#0b1220', border: '1px solid #1e293b', borderRadius: 10 }}>
      {loading && <div style={{ padding: 16, color: '#94a3b8' }}>Loading network…</div>}
      {err     && <div style={{ padding: 16, color: '#f87171' }}>Network unavailable: {err}</div>}

      {!loading && !err && (
        <ReactFlow
          nodes={flow.nodes}
          edges={flow.edges}
          onEdgeClick={onEdgeClick}
          fitView
          minZoom={0.2}
          maxZoom={1.6}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#1e293b" gap={20} />
          <MiniMap nodeColor={() => '#3b82f6'} maskColor="rgba(15,23,42,0.7)" style={{ background: '#0f172a' }} />
          <Controls />
        </ReactFlow>
      )}

      {picked && (
        <div
          style={{
            position: 'absolute', bottom: 12, right: 12, width: 280,
            background: '#0f172a', border: '1px solid #334155', borderRadius: 10, padding: 12,
            fontSize: 12, color: '#e2e8f0',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <strong>Transaction {picked.txn_id}</strong>
            <span style={{ cursor: 'pointer', color: '#94a3b8' }} onClick={() => setPicked(null)}>×</span>
          </div>
          <div>Amount: <b>{fmtMoney(picked.amount)} {picked.currency}</b></div>
          <div>From: {picked.source}</div>
          <div>To:   {picked.target} ({picked.counterparty})</div>
          <div>When: {picked.ts ? new Date(picked.ts).toLocaleString() : '—'}</div>
          {picked.notes && <div style={{ marginTop: 6, color: '#94a3b8' }}>{picked.notes}</div>}
        </div>
      )}
    </div>
  );
}

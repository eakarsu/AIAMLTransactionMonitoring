import React, { useState } from 'react';
import { API_BASE, getToken } from '../services/api';

/**
 * OFAC Scoring Widget — compliance officer types a name, backend returns
 * a fuzzy-matched score against a mock SDN list. Renders a colored gauge
 * + the top 3 matches as cards, plus 5 quick-fill demo buttons.
 */

const QUICK_FILLS = [
  'Vladimir Putin',
  'ISIS Al-Furqan Media',
  'Bashar al-Assad',
  'Kim Jong Un',
  'Generic John Smith',
];

function colorForScore(s) {
  if (s >= 80) return '#dc2626'; // red
  if (s >= 50) return '#f59e0b'; // amber
  return '#10b981';              // green
}

function actionColor(a) {
  if (a === 'block')  return '#dc2626';
  if (a === 'review') return '#f59e0b';
  return '#10b981';
}

function listTypeColor(lt) {
  if (lt === 'SDN')      return '#dc2626';
  if (lt === 'Non-SDN')  return '#f59e0b';
  return '#64748b';
}

function ScoreGauge({ score }) {
  const color = colorForScore(score);
  const pct = Math.max(0, Math.min(100, score));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div
        data-testid="ofac-score-gauge"
        style={{
          width: 160,
          height: 160,
          borderRadius: '50%',
          background: `conic-gradient(${color} ${pct * 3.6}deg, #1e293b ${pct * 3.6}deg 360deg)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 0 2px #0b1220 inset, 0 4px 18px rgba(0,0,0,0.4)',
        }}
      >
        <div
          style={{
            width: 124,
            height: 124,
            borderRadius: '50%',
            background: '#0b1220',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #1e293b',
          }}
        >
          <div style={{ color, fontSize: 38, fontWeight: 700, lineHeight: 1 }}>{score}</div>
          <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 4 }}>MATCH SCORE</div>
        </div>
      </div>
    </div>
  );
}

function MatchCard({ m }) {
  const color = colorForScore(m.score);
  return (
    <div
      data-testid="ofac-match-card"
      style={{
        background: '#0b1220',
        border: '1px solid #1e293b',
        borderRadius: 10,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        minHeight: 120,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 14 }}>{m.sdn_name}</div>
        <div
          style={{
            background: color,
            color: '#0b1220',
            fontSize: 11,
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: 999,
          }}
        >
          {m.score}
        </div>
      </div>
      <div style={{ color: '#94a3b8', fontSize: 12 }}>
        <span style={{ color: '#cbd5e1' }}>Type:</span> {m.type} &middot;{' '}
        <span style={{ color: '#cbd5e1' }}>Country:</span> {m.country}
      </div>
      <div style={{ color: '#94a3b8', fontSize: 12 }}>
        <span style={{ color: '#cbd5e1' }}>Program:</span> {m.program || '—'} &middot;{' '}
        <span style={{ color: listTypeColor(m.list_type) }}>{m.list_type}</span>
      </div>
      <div style={{ color: '#64748b', fontSize: 11, fontStyle: 'italic' }}>
        {m.match_reason || '—'}
      </div>
    </div>
  );
}

export default function OFACScoringWidget() {
  const [name,    setName]    = useState('');
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState(null);

  const runScore = (rawName) => {
    const q = (rawName ?? name).trim();
    if (!q) {
      setErr('Please enter a name to screen.');
      return;
    }
    setErr(null);
    setLoading(true);
    setResult(null);

    const token = getToken();
    fetch(`${API_BASE}/custom-views/ofac-score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ name: q }),
    })
      .then((r) => r.json().then((j) => (r.ok ? j : Promise.reject(j))))
      .then((j) => setResult(j))
      .catch((e) => setErr(e.error || e.message || 'OFAC score failed'))
      .finally(() => setLoading(false));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    runScore();
  };

  const handleQuickFill = (label) => {
    // "Generic John Smith" should populate as "John Smith".
    const target = label === 'Generic John Smith' ? 'John Smith' : label;
    setName(target);
    runScore(target);
  };

  return (
    <div
      style={{
        background: '#0b1220',
        border: '1px solid #1e293b',
        borderRadius: 10,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}
      >
        <input
          data-testid="ofac-name-input"
          type="text"
          placeholder="Enter name to screen (e.g., Vladimir Putin)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            flex: '1 1 320px',
            minWidth: 220,
            padding: '10px 12px',
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: 8,
            color: '#e2e8f0',
            fontSize: 14,
            outline: 'none',
          }}
        />
        <button
          data-testid="ofac-submit-btn"
          type="submit"
          disabled={loading}
          style={{
            padding: '10px 18px',
            background: loading ? '#334155' : '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Screening…' : 'Screen Name'}
        </button>
      </form>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {QUICK_FILLS.map((q) => (
          <button
            key={q}
            type="button"
            data-testid={`ofac-quickfill-${q.replace(/\s+/g, '-')}`}
            onClick={() => handleQuickFill(q)}
            disabled={loading}
            style={{
              padding: '6px 12px',
              background: '#1e293b',
              color: '#cbd5e1',
              border: '1px solid #334155',
              borderRadius: 999,
              fontSize: 12,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {q}
          </button>
        ))}
      </div>

      {err && (
        <div style={{ color: '#f87171', fontSize: 13 }}>
          {err}
        </div>
      )}

      {result && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(200px, 280px) 1fr',
            gap: 18,
            alignItems: 'start',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <ScoreGauge score={result.match_score} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                List Type
              </div>
              <div style={{ color: listTypeColor(result.list_type), fontSize: 16, fontWeight: 700 }}>
                {result.list_type}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Recommended Action
              </div>
              <div
                style={{
                  display: 'inline-block',
                  marginTop: 4,
                  padding: '4px 14px',
                  borderRadius: 999,
                  background: actionColor(result.recommended_action),
                  color: '#0b1220',
                  fontWeight: 700,
                  fontSize: 13,
                  textTransform: 'uppercase',
                }}
              >
                {result.recommended_action}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ color: '#cbd5e1', fontSize: 13, fontWeight: 600 }}>
              Top Matches{result.query ? ` for "${result.query}"` : ''}
            </div>
            {result.top_matches && result.top_matches.length > 0 ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap: 10,
                }}
              >
                {result.top_matches.map((m, i) => (
                  <MatchCard key={`${m.sdn_name}-${i}`} m={m} />
                ))}
              </div>
            ) : (
              <div style={{ color: '#94a3b8', fontSize: 13 }}>No candidate matches returned.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

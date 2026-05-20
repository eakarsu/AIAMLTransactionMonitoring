import React, { useMemo } from 'react';

// ────────────────────────────────────────────────
// Field semantics — how to render each key
// ────────────────────────────────────────────────

const SEVERITY_KEYS = new Set([
  'severity', 'priority', 'urgency', 'impact', 'likelihood',
  'threat_level', 'risk', 'value', 'collateral_risk', 'collateral',
  'verdict', 'feasibility', 'rating', 'overall_risk_level', 'residual_risk',
  'current_tempo', 'forecast_tempo_72h', 'go_no_go_recommendation',
  'logistics_strain', 'risk_change', 'magnitude', 'threat_exposure',
  'tier', 'status', 'classification', 'compliant',
]);

const SCORE_KEYS = new Set([
  'score', 'confidence', 'confidence_overall', 'confidence_score',
  'fleet_health_score', 'failure_probability', 'jamming_likelihood',
  'stockout_probability_pct',
]);

const HERO_KEYS = [
  'headline', 'mission_name', 'package_name', 'region', 'item', 'unit',
  'scenario', 'fused_picture',
];

const KPI_KEYS = [
  'overall_risk_level', 'residual_risk', 'verdict', 'feasibility', 'rating',
  'current_tempo', 'forecast_tempo_72h', 'go_no_go_recommendation',
  'logistics_strain', 'confidence', 'confidence_overall', 'confidence_score',
  'fleet_health_score', 'jamming_likelihood', 'total_personnel',
  'estimated_duration_hours', 'estimated_time_to_role3_minutes',
  'total_fuel_kg', 'total_fuel_liters', 'reserve_required_kg',
  'cost_savings_estimate_usd', 'estimated_grounded_hours_saved',
  'stockout_probability_pct', 'recommended_order_qty',
];

const HIDE_FROM_SECTIONS = new Set([
  ...HERO_KEYS, ...KPI_KEYS, 'summary', 'error', 'raw', 'asset', 'mission_profile',
]);

// ────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────

const isPlainObject = (v) => v && typeof v === 'object' && !Array.isArray(v);
const titleCase = (s) =>
  String(s).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

function severityClass(value) {
  if (value == null) return '';
  const v = String(value).toLowerCase().trim();
  if (['critical', 'jammed', 'infeasible', 'no_go', 'no-go', 'surge', 'c5', 'high'].includes(v)) return 'sev-critical';
  if (['urgent', 'suspect', 'marginal', 'caution', 'c4'].includes(v)) return 'sev-high';
  if (['medium', 'moderate', 'priority', 'c3'].includes(v)) return 'sev-medium';
  if (['low', 'routine', 'go', 'clean', 'ok', 'c1', 'c2'].includes(v)) return 'sev-low';
  if (['true'].includes(v)) return 'sev-low';
  if (['false'].includes(v)) return 'sev-high';
  return 'sev-neutral';
}

function formatScalar(v) {
  if (v == null || v === '') return '—';
  if (typeof v === 'number') {
    if (Number.isInteger(v) && Math.abs(v) >= 1000) return v.toLocaleString();
    if (!Number.isInteger(v) && v > 0 && v <= 1) return (v * 100).toFixed(0) + '%';
    if (!Number.isInteger(v)) return v.toFixed(2);
    return String(v);
  }
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return String(v);
}

function uniformObjectKeys(arr) {
  if (!Array.isArray(arr) || arr.length < 2) return null;
  if (!arr.every(isPlainObject)) return null;
  const keysFirst = Object.keys(arr[0]);
  if (keysFirst.length === 0 || keysFirst.length > 8) return null;
  const overlap = (o) =>
    keysFirst.filter((k) => Object.prototype.hasOwnProperty.call(o, k)).length;
  const ratio = arr.reduce((acc, o) => acc + overlap(o), 0) / (arr.length * keysFirst.length);
  return ratio >= 0.75 ? keysFirst : null;
}

// ────────────────────────────────────────────────
// Atomic renderers
// ────────────────────────────────────────────────

function SevBadge({ value }) {
  if (value == null || value === '') return <span className="ai-muted">—</span>;
  return (
    <span className={`ai-badge ${severityClass(value)}`}>
      {String(value).replace(/_/g, ' ')}
    </span>
  );
}

function ScoreBar({ value, suffix }) {
  if (value == null) return <span className="ai-muted">—</span>;
  const n = Number(value);
  if (!Number.isFinite(n)) return <span>{String(value)}</span>;
  const pct = n > 1 ? Math.min(100, n) : Math.round(n * 100);
  let tone = 'sev-low';
  if (pct >= 75) tone = 'sev-critical';
  else if (pct >= 50) tone = 'sev-high';
  else if (pct >= 25) tone = 'sev-medium';
  return (
    <div className="ai-scorebar">
      <div className="ai-scorebar-track">
        <div className={`ai-scorebar-fill ${tone}`} style={{ width: pct + '%' }} />
      </div>
      <span className="ai-scorebar-label">{pct}{suffix || '%'}</span>
    </div>
  );
}

function Tags({ items }) {
  if (!items?.length) return <span className="ai-muted">—</span>;
  return (
    <div className="ai-tag-list">
      {items.map((x, i) => <span key={i} className="ai-tag">{String(x)}</span>)}
    </div>
  );
}

function SmartCell({ k, v }) {
  if (v == null || v === '') return <span className="ai-muted">—</span>;
  if (SEVERITY_KEYS.has(k)) return <SevBadge value={v} />;
  if (SCORE_KEYS.has(k)) return <ScoreBar value={v} />;
  if (Array.isArray(v)) {
    if (v.every((x) => typeof x === 'string' || typeof x === 'number')) {
      return <Tags items={v} />;
    }
    return <CompactList items={v} />;
  }
  if (isPlainObject(v)) return <CompactKV obj={v} />;
  if (typeof v === 'number') {
    if (!Number.isInteger(v) && v > 0 && v <= 1) return <ScoreBar value={v} />;
    return <span className="ai-num">{formatScalar(v)}</span>;
  }
  if (typeof v === 'boolean') return <SevBadge value={v} />;
  return <span>{String(v)}</span>;
}

function CompactKV({ obj }) {
  return (
    <div className="ai-kv">
      {Object.entries(obj).map(([k, v]) => (
        <div key={k} className="ai-kv-row">
          <span className="ai-kv-key">{titleCase(k)}</span>
          <span className="ai-kv-val"><SmartCell k={k} v={v} /></span>
        </div>
      ))}
    </div>
  );
}

function CompactList({ items }) {
  return (
    <ul className="ai-bullets">
      {items.map((x, i) => (
        <li key={i}>{isPlainObject(x) ? <CompactKV obj={x} /> : String(x)}</li>
      ))}
    </ul>
  );
}

// Uniform array → table
function SmartTable({ rows, keys }) {
  return (
    <div className="ai-table-wrap">
      <table className="ai-table">
        <thead>
          <tr>
            {keys.map((k) => <th key={k}>{titleCase(k)}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {keys.map((k) => (
                <td key={k}><SmartCell k={k} v={row[k]} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Non-uniform array → stacked cards
function CardList({ rows }) {
  return (
    <div className="ai-card-grid">
      {rows.map((item, i) => {
        if (!isPlainObject(item)) {
          return <div key={i} className="ai-card"><div className="ai-card-body">{String(item)}</div></div>;
        }
        const titleKey = ['name', 'title', 'phase', 'leg', 'driver', 'risk', 'factor', 'mission', 'decision', 'actor', 'target_id', 'platform', 'role', 'item', 'area', 'location', 'shipment_id', 'asset_id', 'designation']
          .find((k) => item[k] != null);
        const metaKey = ['priority', 'severity', 'urgency', 'impact', 'likelihood', 'confidence', 'rank', 'score', 'value', 'collateral_risk', 'magnitude', 'compliant']
          .find((k) => item[k] != null);
        return (
          <div key={i} className="ai-card">
            <div className="ai-card-head">
              <strong>{titleKey ? String(item[titleKey]) : `Item ${i + 1}`}</strong>
              {metaKey && <SmartCell k={metaKey} v={item[metaKey]} />}
            </div>
            <div className="ai-card-body">
              {Object.entries(item).map(([k, v]) => {
                if (k === titleKey || k === metaKey) return null;
                return (
                  <div key={k} className="ai-card-row">
                    <span className="ai-card-row-key">{titleCase(k)}</span>
                    <span className="ai-card-row-val"><SmartCell k={k} v={v} /></span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────────
// Section
// ────────────────────────────────────────────────

function Section({ k, v }) {
  const title = titleCase(k);
  let count = null;
  let body;

  if (Array.isArray(v)) {
    count = v.length;
    if (v.length === 0) {
      body = <div className="ai-empty-mini">No items.</div>;
    } else if (v.every((x) => typeof x === 'string' || typeof x === 'number')) {
      body = <Tags items={v} />;
    } else {
      const uniformKeys = uniformObjectKeys(v);
      body = uniformKeys ? <SmartTable rows={v} keys={uniformKeys} /> : <CardList rows={v} />;
    }
  } else if (isPlainObject(v)) {
    body = <CompactKV obj={v} />;
  } else if (SEVERITY_KEYS.has(k)) {
    body = <SevBadge value={v} />;
  } else if (SCORE_KEYS.has(k)) {
    body = <ScoreBar value={v} />;
  } else {
    body = <div className="ai-section-text">{formatScalar(v)}</div>;
  }

  return (
    <section className="ai-section">
      <header className="ai-section-head">
        <h5>{title}</h5>
        {count != null && <span className="ai-section-count">{count}</span>}
      </header>
      <div className="ai-section-body">{body}</div>
    </section>
  );
}

// ────────────────────────────────────────────────
// Top-level component
// ────────────────────────────────────────────────

function pickHero(result) {
  for (const k of HERO_KEYS) {
    if (result[k] && typeof result[k] === 'string') return { key: k, value: result[k] };
  }
  return null;
}

function pickKpis(result) {
  const out = [];
  for (const k of KPI_KEYS) {
    if (result[k] == null) continue;
    out.push({ key: k, value: result[k] });
    if (out.length >= 6) break;
  }
  return out;
}

function copyToClipboard(text) {
  try {
    navigator.clipboard.writeText(text);
  } catch (_) {}
}

function genRunId() {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${t}-${r}`;
}

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}Z`;
}

export default function AIResultDisplay({ result, loading, error, feature, title }) {
  const json = useMemo(() => (result ? JSON.stringify(result, null, 2) : ''), [result]);
  const runId = useMemo(() => (result ? genRunId() : ''), [result]);
  const stamp = useMemo(() => (result ? nowStamp() : ''), [result]);
  const briefLabel = (title || (feature ? `AI · ${titleCase(feature)}` : 'AI Analysis')).replace(/^AI\s*[·•]\s*/, '');

  const handlePrint = () => {
    if (typeof window !== 'undefined') window.print();
  };

  if (loading) {
    return (
      <div className="ai-panel">
        <div className="ai-classbar">UNCLASSIFIED // TABLETOP EXERCISE — FOR TRAINING USE ONLY</div>
        <div className="ai-panel-header">
          <div className="ai-panel-title">
            <span className="ai-panel-dot pulse" />
            <h4>AI Analysis · {briefLabel}</h4>
          </div>
        </div>
        <div className="ai-loading">
          <div className="spinner" />
          <p>Running analysis — this typically takes 4-12 seconds.</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="ai-panel">
        <div className="ai-classbar">UNCLASSIFIED // TABLETOP EXERCISE — FOR TRAINING USE ONLY</div>
        <div className="ai-panel-header">
          <div className="ai-panel-title">
            <span className="ai-panel-dot err" />
            <h4>AI Analysis · {briefLabel}</h4>
          </div>
        </div>
        <div className="ai-panel-body"><div className="ai-error">{error}</div></div>
      </div>
    );
  }
  if (!result) return null;

  const { summary, error: aiError, raw, ...rest } = result;
  const hero = pickHero(rest);
  const kpis = pickKpis(rest);
  const sectionEntries = Object.entries(rest).filter(([k]) => !HIDE_FROM_SECTIONS.has(k));

  return (
    <div className="ai-panel">
      <div className="ai-classbar">UNCLASSIFIED // TABLETOP EXERCISE — FOR TRAINING USE ONLY</div>

      <div className="ai-panel-header">
        <div className="ai-panel-title">
          <span className="ai-panel-dot" />
          <div>
            <h4>{briefLabel}</h4>
            <div className="ai-panel-sub">
              <span>RUN {runId}</span>
              <span className="ai-panel-sep">·</span>
              <span>{stamp}</span>
              {feature && (
                <>
                  <span className="ai-panel-sep">·</span>
                  <span className="ai-panel-feature">{feature}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="ai-panel-actions">
          <button className="btn secondary" onClick={handlePrint}>Print / PDF</button>
          <button className="btn secondary" onClick={() => copyToClipboard(json)}>Copy JSON</button>
        </div>
      </div>

      <div className="ai-panel-body">
        {aiError && <div className="ai-error" style={{ marginBottom: 14 }}>{aiError}</div>}

        {(hero || summary) && (
          <div className="ai-hero">
            <div className="ai-hero-eyebrow">Executive Summary</div>
            {hero && <div className="ai-hero-headline">{hero.value}</div>}
            {summary && <div className="ai-hero-summary">{summary}</div>}
          </div>
        )}

        {kpis.length > 0 && (
          <div className="ai-kpi-grid">
            {kpis.map(({ key, value }) => (
              <div key={key} className="ai-kpi">
                <div className="ai-kpi-label">{titleCase(key)}</div>
                <div className="ai-kpi-value">
                  {SEVERITY_KEYS.has(key)
                    ? <SevBadge value={value} />
                    : SCORE_KEYS.has(key)
                      ? <ScoreBar value={value} />
                      : <span className="ai-kpi-num">{formatScalar(value)}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {sectionEntries.length > 0 && (
          <div className="ai-sections">
            {sectionEntries.map(([k, v]) => <Section key={k} k={k} v={v} />)}
          </div>
        )}

        {raw && !summary && (
          <pre className="ai-raw">{String(raw).slice(0, 1500)}</pre>
        )}
      </div>

      <div className="ai-classbar">UNCLASSIFIED // TABLETOP EXERCISE — FOR TRAINING USE ONLY</div>
    </div>
  );
}

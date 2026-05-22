import React, { useEffect, useState } from 'react';
import { caseWorkflowApi } from '../services/api';

const CASE_TYPES = [
  { value: 'sar_case',      label: 'SAR Case (sar_cases.case_id)' },
  { value: 'investigation', label: 'Investigation (investigations.inv_id)' },
  { value: 'edd_case',      label: 'EDD Case (edd_cases.edd_id)' },
  { value: 'alert',         label: 'Alert (alerts.alert_id)' },
];

export default function CaseWorkflowPage() {
  const [transitions, setTransitions] = useState(null);
  const [form, setForm] = useState({ case_type: 'sar_case', case_ref: '', to_status: 'triage', actor: '', reason: '', force: false });
  const [history, setHistory] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    caseWorkflowApi.transitions().then(setTransitions).catch(() => {});
  }, []);

  const loadHistory = async () => {
    setError(null);
    try {
      const r = await caseWorkflowApi.history(form.case_type, form.case_ref);
      setHistory(r);
    } catch (e) { setError(e.message); }
  };

  const submit = async () => {
    setBusy(true); setError(null); setResult(null);
    try {
      const r = await caseWorkflowApi.transition(form.case_type, form.case_ref, {
        to_status: form.to_status,
        actor: form.actor,
        reason: form.reason,
        force: form.force,
      });
      setResult(r);
      await loadHistory();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Case Workflow</h2>
          <p>Apply legal state transitions to SAR cases, investigations, EDD cases, and alerts. Each transition is logged.</p>
        </div>
      </div>

      {transitions && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>Allowed Transitions</h3>
          <table className="data-table">
            <thead><tr><th>From</th><th>To (allowed)</th></tr></thead>
            <tbody>
              {Object.entries(transitions.transitions).map(([from, tos]) => (
                <tr key={from}><td><code>{from}</code></td><td>{tos.join(', ')}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card">
        <div className="form-grid">
          <div className="form-group">
            <label>Case Type</label>
            <select value={form.case_type} onChange={(e) => setForm((s) => ({ ...s, case_type: e.target.value }))}>
              {CASE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Case Ref</label>
            <input value={form.case_ref} onChange={(e) => setForm((s) => ({ ...s, case_ref: e.target.value }))} placeholder="SAR-2026-0001" />
          </div>
          <div className="form-group">
            <label>To Status</label>
            <select value={form.to_status} onChange={(e) => setForm((s) => ({ ...s, to_status: e.target.value }))}>
              {['open','triage','investigating','escalated','sar-drafted','sar-filed','closed'].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Actor</label>
            <input value={form.actor} onChange={(e) => setForm((s) => ({ ...s, actor: e.target.value }))} placeholder="analyst@example.com" />
          </div>
          <div className="form-group full-width">
            <label>Reason</label>
            <textarea value={form.reason} onChange={(e) => setForm((s) => ({ ...s, reason: e.target.value }))} placeholder="Why this transition is justified." />
          </div>
          <div className="form-group">
            <label><input type="checkbox" checked={form.force} onChange={(e) => setForm((s) => ({ ...s, force: e.target.checked }))} /> Force (override legal state machine — requires human review)</label>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <button className="btn ai" onClick={submit} disabled={busy || !form.case_ref}>{busy ? 'Working...' : 'Apply Transition'}</button>
          <button className="btn secondary" style={{ marginLeft: 8 }} onClick={loadHistory} disabled={!form.case_ref}>Load History</button>
        </div>
      </div>

      {error && <div className="ai-error" style={{ marginTop: 12 }}>{error}</div>}
      {result && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>Last Transition</h3>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#cbd5e1' }}>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
      {history.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>History — {form.case_type} / {form.case_ref}</h3>
          <table className="data-table">
            <thead><tr><th>When</th><th>From</th><th>To</th><th>Actor</th><th>Legal</th><th>Reason</th></tr></thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td>{new Date(h.created_at).toLocaleString()}</td>
                  <td>{h.from_status || '—'}</td>
                  <td>{h.to_status}</td>
                  <td>{h.actor || '—'}</td>
                  <td>{h.legal_ok ? 'yes' : 'forced'}</td>
                  <td>{h.reason || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

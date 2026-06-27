import React, { useEffect, useState } from 'react';
import { escalationApi } from '../services/api';
import ReferenceSelect, { sourceForCaseType } from '../components/ReferenceSelect';
import TableDetailModal from '../components/TableDetailModal';

const ROUTE_SAMPLES = [
  { label: 'Critical alert', values: { case_type: 'alert', case_ref: 'ALT-2026-0003', severity: 'critical', jurisdiction: 'RU', persist: true } },
  { label: 'High SAR', values: { case_type: 'sar_case', case_ref: 'SAR-2026-0001', severity: 'high', jurisdiction: 'US', persist: true } },
  { label: 'EDD review', values: { case_type: 'edd_case', case_ref: 'EDD-9001', severity: 'medium', jurisdiction: '', persist: true } },
];

export default function EscalationPage() {
  const [queues, setQueues] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedQueue, setSelectedQueue] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [routeForm, setRouteForm] = useState({ case_type: 'alert', case_ref: '', severity: 'high', jurisdiction: '', persist: true });
  const [routed, setRouted] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadAll = async () => {
    try {
      setQueues(await escalationApi.queues());
      setAssignments(await escalationApi.assignments({ }));
      setError(null);
    } catch (e) { setError(e.message); }
  };
  useEffect(() => { loadAll(); }, []);

  const route = async () => {
    setBusy(true); setError(null);
    try {
      const r = await escalationApi.route(routeForm);
      setRouted(r);
      await loadAll();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Escalation Routing</h2>
          <p>Severity → queue mapping. Default queues seeded by migration; jurisdiction overrides preferred when set.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Queues</h3>
        <table className="data-table">
          <thead><tr><th>Queue</th><th>Name</th><th>Severity Floor</th><th>Jurisdiction</th><th>On-call</th><th>Notes</th></tr></thead>
          <tbody>
            {queues.map((q) => (
              <tr key={q.queue_id} onClick={() => setSelectedQueue(q)} style={{ cursor: 'pointer' }}>
                <td>{q.queue_id}</td><td>{q.name}</td><td>{q.severity_floor}</td>
                <td>{q.jurisdiction || 'any'}</td><td>{q.on_call_user || '—'}</td><td>{q.notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Route a Case</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {ROUTE_SAMPLES.map((sample) => (
            <button key={sample.label} type="button" className="btn secondary" onClick={() => setRouteForm(sample.values)}>
              {sample.label}
            </button>
          ))}
        </div>
        <div className="form-grid">
          <div className="form-group"><label>Case Type</label>
            <select value={routeForm.case_type} onChange={(e) => setRouteForm((s) => ({ ...s, case_type: e.target.value, case_ref: '' }))}>
              {['alert','sar_case','investigation','edd_case'].map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group"><label>Case Ref</label>
            <ReferenceSelect
              source={sourceForCaseType(routeForm.case_type)}
              value={routeForm.case_ref}
              onChange={(value) => setRouteForm((s) => ({ ...s, case_ref: value }))}
              emptyLabel="Select case ref"
            />
          </div>
          <div className="form-group"><label>Severity</label>
            <select value={routeForm.severity} onChange={(e) => setRouteForm((s) => ({ ...s, severity: e.target.value }))}>
              {['low','medium','high','critical'].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group"><label>Jurisdiction (optional)</label>
            <ReferenceSelect
              source="jurisdictions"
              value={routeForm.jurisdiction}
              onChange={(value) => setRouteForm((s) => ({ ...s, jurisdiction: value }))}
              allowEmpty
              emptyLabel="Any jurisdiction"
            />
          </div>
          <div className="form-group">
            <label><input type="checkbox" checked={routeForm.persist} onChange={(e) => setRouteForm((s) => ({ ...s, persist: e.target.checked }))} /> Persist assignment</label>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <button className="btn ai" onClick={route} disabled={busy || !routeForm.case_ref}>{busy ? 'Routing...' : 'Route'}</button>
        </div>
        {error && <div className="ai-error" style={{ marginTop: 12 }}>{error}</div>}
        {routed && (
          <div style={{ marginTop: 12 }}>
            <h4>Matched Queue</h4>
            <pre style={{ whiteSpace: 'pre-wrap', color: '#cbd5e1' }}>{JSON.stringify(routed, null, 2)}</pre>
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Recent Assignments</h3>
        <table className="data-table">
          <thead><tr><th>When</th><th>Queue</th><th>Case Type</th><th>Case Ref</th><th>Severity</th><th>Assigned To</th><th>Status</th></tr></thead>
          <tbody>
            {assignments.map((a) => (
              <tr key={a.id} onClick={() => setSelectedAssignment(a)} style={{ cursor: 'pointer' }}>
                <td>{new Date(a.created_at).toLocaleString()}</td>
                <td>{a.queue_id}</td><td>{a.case_type}</td><td>{a.case_ref}</td>
                <td>{a.severity}</td><td>{a.assigned_to || '—'}</td><td>{a.status}</td>
              </tr>
            ))}
            {!assignments.length && <tr><td colSpan={7} style={{ textAlign: 'center', color: '#64748b' }}>No assignments yet</td></tr>}
          </tbody>
        </table>
      </div>

      <TableDetailModal
        title="Escalation Queue Details"
        row={selectedQueue}
        onClose={() => setSelectedQueue(null)}
        fields={[
          { key: 'queue_id', label: 'Queue ID' },
          { key: 'name', label: 'Name' },
          { key: 'severity_floor', label: 'Severity Floor' },
          { key: 'jurisdiction', label: 'Jurisdiction' },
          { key: 'on_call_user', label: 'On-call User' },
          { key: 'notes', label: 'Notes' },
          { key: 'created_at', label: 'Created At', render: (r) => r.created_at ? new Date(r.created_at).toLocaleString() : '—' },
          { key: 'updated_at', label: 'Updated At', render: (r) => r.updated_at ? new Date(r.updated_at).toLocaleString() : '—' },
        ]}
      />

      <TableDetailModal
        title="Escalation Assignment Details"
        row={selectedAssignment}
        onClose={() => setSelectedAssignment(null)}
        fields={[
          { key: 'id', label: 'ID' },
          { key: 'created_at', label: 'When', render: (r) => r.created_at ? new Date(r.created_at).toLocaleString() : '—' },
          { key: 'queue_id', label: 'Queue ID' },
          { key: 'case_type', label: 'Case Type' },
          { key: 'case_ref', label: 'Case Ref' },
          { key: 'severity', label: 'Severity' },
          { key: 'assigned_to', label: 'Assigned To' },
          { key: 'status', label: 'Status' },
          { key: 'reason', label: 'Reason' },
        ]}
      />
    </div>
  );
}

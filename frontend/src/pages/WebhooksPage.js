import React, { useEffect, useState } from 'react';
import { webhooksApi, isCommander } from '../services/api';
import TableDetailModal from '../components/TableDetailModal';

const WEBHOOK_SAMPLES = [
  { label: 'SAR bridge', values: { name: 'FinCEN SAR Bridge', url: 'https://httpbin.org/post', secret: 'sec_fincen_2026', events: 'sar.filed,sar.created', active: true } },
  { label: 'OFAC blocked property', values: { name: 'OFAC Blocked Property', url: 'https://httpbin.org/post', secret: 'sec_ofac_2026', events: 'sanctions_hits.confirmed', active: true } },
  { label: 'Compliance Slack relay', values: { name: 'Compliance Slack Relay', url: 'https://httpbin.org/post', secret: 'sec_slack_demo', events: 'alert.created,case.escalated', active: false } },
];

export default function WebhooksPage() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState(null);
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState(null);
  const [draft, setDraft] = useState({ name: '', url: '', secret: '', events: '', active: true });
  const [deliveries, setDeliveries] = useState({ id: null, rows: [], loading: false });
  const [testResult, setTestResult] = useState(null);
  const [testBusy, setTestBusy] = useState(false);

  const commander = isCommander();

  const load = async () => {
    setErr(null);
    try {
      const r = await webhooksApi.list();
      setRows(Array.isArray(r) ? r : []);
    } catch (e) { setErr(e.message); }
  };
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    try {
      if (editing) await webhooksApi.update(editing.id, draft);
      else await webhooksApi.create(draft);
      setEditing(null);
      setDraft({ name: '', url: '', secret: '', events: '', active: true });
      load();
    } catch (e) { alert(e.message); }
  };
  const handleDelete = async (row) => {
    if (!window.confirm(`Delete webhook ${row.name || row.url}?`)) return;
    try { await webhooksApi.remove(row.id); setSelected(null); load(); } catch (e) { alert(e.message); }
  };
  const handleEdit = (row) => {
    setSelected(null);
    setEditing(row);
    setDraft({
      name: row.name || '',
      url: row.url || '',
      secret: row.secret || '',
      events: row.events || '',
      active: row.active !== false,
    });
  };

  const openDeliveries = async (row) => {
    setDeliveries({ id: row.id, rows: [], loading: true });
    try {
      const r = await webhooksApi.deliveries(row.id);
      setDeliveries({ id: row.id, rows: r, loading: false });
    } catch (e) {
      setDeliveries({ id: row.id, rows: [], loading: false, error: e.message });
    }
  };

  const handleTest = async () => {
    setTestBusy(true);
    setTestResult(null);
    try {
      const r = await webhooksApi.test('test.ping', { from: 'webhooks-page', at: new Date().toISOString() });
      setTestResult(r);
    } catch (e) {
      setTestResult({ error: e.message });
    } finally {
      setTestBusy(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Webhooks</h2>
          <p>HMAC-signed outbound webhooks for incident and bulletin events.</p>
        </div>
        <div className="page-header-actions">
          {commander && (
            <button className="btn ai" onClick={handleTest} disabled={testBusy}>
              {testBusy ? 'Firing...' : 'Fire Test Event'}
            </button>
          )}
        </div>
      </div>

      {err && <div className="ai-error">{err}</div>}
      {testResult && (
        <div className="card">
          <strong>Test result:</strong>
          <pre>{JSON.stringify(testResult, null, 2)}</pre>
        </div>
      )}

      {commander && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{editing ? `Edit webhook #${editing.id}` : 'New webhook'}</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {WEBHOOK_SAMPLES.map((sample) => (
              <button key={sample.label} type="button" className="btn secondary" onClick={() => { setEditing(null); setDraft(sample.values); }}>
                {sample.label}
              </button>
            ))}
          </div>
          <div className="form-grid">
            <div className="form-group"><label>Name</label>
              <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
            <div className="form-group"><label>URL</label>
              <input value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} /></div>
            <div className="form-group"><label>Secret</label>
              <input value={draft.secret} onChange={(e) => setDraft({ ...draft, secret: e.target.value })} /></div>
            <div className="form-group"><label>Events (comma-sep, blank = all)</label>
              <input value={draft.events} onChange={(e) => setDraft({ ...draft, events: e.target.value })} /></div>
            <div className="form-group"><label>Active</label>
              <select value={draft.active ? 'true' : 'false'}
                onChange={(e) => setDraft({ ...draft, active: e.target.value === 'true' })}>
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            <button className="btn" onClick={handleSave}>{editing ? 'Save' : 'Create'}</button>
            {editing && (
              <button className="btn secondary" style={{ marginLeft: 8 }}
                onClick={() => { setEditing(null); setDraft({ name:'', url:'', secret:'', events:'', active:true }); }}>
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>ID</th><th>Name</th><th>URL</th><th>Events</th><th>Active</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} onClick={() => setSelected(r)} style={{ cursor: 'pointer' }}>
                <td>{r.id}</td>
                <td>{r.name}</td>
                <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.url}</td>
                <td>{r.events}</td>
                <td>{String(r.active)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TableDetailModal
        title="Webhook Details"
        row={selected}
        onClose={() => setSelected(null)}
        fields={[
          { key: 'id', label: 'ID' },
          { key: 'name', label: 'Name' },
          { key: 'url', label: 'URL' },
          { key: 'secret', label: 'Secret' },
          { key: 'events', label: 'Events' },
          { key: 'active', label: 'Active' },
          { key: 'created_at', label: 'Created At', render: (r) => r.created_at ? new Date(r.created_at).toLocaleString() : '—' },
          { key: 'updated_at', label: 'Updated At', render: (r) => r.updated_at ? new Date(r.updated_at).toLocaleString() : '—' },
        ]}
        actions={selected && (
          <>
            <button className="btn secondary" onClick={() => { const row = selected; setSelected(null); openDeliveries(row); }}>Deliveries</button>
            {commander && (
              <>
                <button className="btn secondary" onClick={() => handleEdit(selected)}>Edit</button>
                <button className="btn danger" onClick={() => handleDelete(selected)}>Delete</button>
              </>
            )}
          </>
        )}
      />

      {deliveries.id && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>Deliveries · webhook #{deliveries.id}</h3>
          {deliveries.loading && <div className="empty-state">Loading...</div>}
          {deliveries.error && <div className="ai-error">{deliveries.error}</div>}
          {deliveries.rows && deliveries.rows.length === 0 && !deliveries.loading && (
            <div className="empty-state">No deliveries yet.</div>
          )}
          {deliveries.rows && deliveries.rows.length > 0 && (
            <table>
              <thead><tr><th>ID</th><th>Event</th><th>Status</th><th>At</th></tr></thead>
              <tbody>
                {deliveries.rows.map((d) => (
                  <tr key={d.id}>
                    <td>{d.id}</td>
                    <td>{d.event}</td>
                    <td>{d.status_code}</td>
                    <td>{d.attempted_at ? new Date(d.attempted_at).toLocaleString() : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

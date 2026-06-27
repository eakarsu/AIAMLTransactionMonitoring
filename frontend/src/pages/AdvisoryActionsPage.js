import React, { useEffect, useState } from 'react';
import { advisoryApi } from '../services/api';
import ReferenceSelect from '../components/ReferenceSelect';
import TableDetailModal from '../components/TableDetailModal';

const FILE_SAMPLES = [
  {
    label: 'SAR structuring',
    values: { filing_type: 'SAR', target_ref: 'SAR-2026-0001', rationale: 'Structured cash deposits below CTR threshold require SAR filing review.' },
  },
  {
    label: 'SAR crypto mixer',
    values: { filing_type: 'SAR', target_ref: 'SAR-2026-0004', rationale: 'Crypto mixer exposure and high-risk customer profile require SAR filing review.' },
  },
  {
    label: 'CTR aggregate cash',
    values: { filing_type: 'CTR', target_ref: 'CTR-2026-0006', rationale: 'Aggregate cash activity exceeds reportable threshold and needs CTR review.' },
  },
];

const FREEZE_SAMPLES = [
  {
    label: 'OFAC confirmed',
    values: { account_id: 'ACC-10015', hit_id: 'HIT-7003', rationale: 'Confirmed OFAC SDN hit requires human review for account freeze recommendation.' },
  },
  {
    label: 'Restricted RU individual',
    values: { account_id: 'ACC-10003', hit_id: 'HIT-7001', rationale: 'Restricted customer with sanctions hit and frozen-account indicators.' },
  },
  {
    label: 'OFAC 50% rule',
    values: { account_id: 'ACC-10017', hit_id: 'HIT-7012', rationale: 'Opaque nominee owner may trigger OFAC 50% rule; freeze recommendation needs review.' },
  },
];

export default function AdvisoryActionsPage() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({ status: '', action_type: '' });
  const [selected, setSelected] = useState(null);

  const [fileForm, setFileForm]   = useState({ filing_type: 'SAR', target_ref: '', rationale: '' });
  const [freezeForm, setFreezeForm] = useState({ account_id: '', hit_id: '', rationale: '' });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try { setRows(await advisoryApi.list(filter)); setError(null); }
    catch (e) { setError(e.message); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const submitFile = async () => {
    setBusy(true); setError(null);
    try { await advisoryApi.autoFile(fileForm); await load(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const submitFreeze = async () => {
    setBusy(true); setError(null);
    try { await advisoryApi.autoFreeze(freezeForm); await load(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const review = async (id, decision) => {
    setBusy(true); setError(null);
    try {
      const reviewer = window.prompt('Reviewer (email or name)?') || '';
      const note = window.prompt('Review note (optional)') || '';
      if (!reviewer) { setBusy(false); return; }
      await advisoryApi.review(id, { decision, reviewer, note });
      setSelected(null);
      await load();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Advisory Actions</h2>
          <p>Auto-file SAR/CTR and auto-freeze account are TOO-RISKY for direct execution. They are recorded here for human review only — no downstream action runs automatically.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Recommend Auto-File SAR/CTR</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {FILE_SAMPLES.map((sample) => (
              <button key={sample.label} type="button" className="btn secondary" onClick={() => setFileForm(sample.values)}>
                {sample.label}
              </button>
            ))}
          </div>
          <div className="form-grid">
            <div className="form-group"><label>Filing Type</label>
              <select value={fileForm.filing_type} onChange={(e) => setFileForm((s) => ({ ...s, filing_type: e.target.value }))}>
                <option>SAR</option><option>CTR</option>
              </select>
            </div>
            <div className="form-group"><label>Target Ref</label>
              <ReferenceSelect
                source={fileForm.filing_type === 'CTR' ? 'ctrs' : 'sarCases'}
                value={fileForm.target_ref}
                onChange={(value) => setFileForm((s) => ({ ...s, target_ref: value }))}
                emptyLabel={`Select ${fileForm.filing_type} case`}
              />
            </div>
            <div className="form-group full-width"><label>Rationale</label>
              <textarea value={fileForm.rationale} onChange={(e) => setFileForm((s) => ({ ...s, rationale: e.target.value }))} placeholder="Why filing is recommended." />
            </div>
          </div>
          <button className="btn ai" style={{ marginTop: 8 }} onClick={submitFile} disabled={busy || !fileForm.target_ref}>Record Recommendation</button>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Recommend Account Freeze</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {FREEZE_SAMPLES.map((sample) => (
              <button key={sample.label} type="button" className="btn secondary" onClick={() => setFreezeForm(sample.values)}>
                {sample.label}
              </button>
            ))}
          </div>
          <div className="form-grid">
            <div className="form-group"><label>Account ID</label>
              <ReferenceSelect
                source="accounts"
                value={freezeForm.account_id}
                onChange={(value) => setFreezeForm((s) => ({ ...s, account_id: value }))}
                emptyLabel="Select account"
              />
            </div>
            <div className="form-group"><label>Hit ID (optional)</label>
              <ReferenceSelect
                source="sanctionsHits"
                value={freezeForm.hit_id}
                onChange={(value) => setFreezeForm((s) => ({ ...s, hit_id: value }))}
                allowEmpty
                emptyLabel="Optional"
              />
            </div>
            <div className="form-group full-width"><label>Rationale</label>
              <textarea value={freezeForm.rationale} onChange={(e) => setFreezeForm((s) => ({ ...s, rationale: e.target.value }))} placeholder="Why freeze is recommended (sanctions match, etc.)" />
            </div>
          </div>
          <button className="btn ai" style={{ marginTop: 8 }} onClick={submitFreeze} disabled={busy || !freezeForm.account_id}>Record Recommendation</button>
        </div>
      </div>

      {error && <div className="ai-error">{error}</div>}

      <div className="card">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Advisory Actions (no auto-execution)</h3>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <select value={filter.status} onChange={(e) => setFilter((s) => ({ ...s, status: e.target.value }))}>
              <option value="">All statuses</option><option>pending</option><option>approved</option><option>rejected</option>
            </select>
            <select value={filter.action_type} onChange={(e) => setFilter((s) => ({ ...s, action_type: e.target.value }))}>
              <option value="">All actions</option>
              <option>auto_file_sar</option><option>auto_file_ctr</option><option>auto_freeze_account</option>
            </select>
            <button className="btn secondary" onClick={load}>Apply</button>
          </div>
        </div>
        <table className="data-table">
          <thead><tr><th>ID</th><th>When</th><th>Action</th><th>Target</th><th>Status</th><th>Reviewer</th><th>Rationale</th><th>Decision</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} onClick={() => setSelected(r)} style={{ cursor: 'pointer' }}>
                <td>{r.id}</td>
                <td>{new Date(r.created_at).toLocaleString()}</td>
                <td>{r.action_type}</td>
                <td>{r.target_type}:{r.target_ref}</td>
                <td>{r.review_status}</td>
                <td>{r.reviewer || '—'}</td>
                <td style={{ maxWidth: 280, whiteSpace: 'pre-wrap' }}>{r.rationale || '—'}</td>
                <td>
                  {r.review_status === 'pending' && (
                    <>
                      <span style={{ color: '#94a3b8' }}>Open row</span>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={8} style={{ textAlign: 'center', color: '#64748b' }}>No advisory actions yet</td></tr>}
          </tbody>
        </table>
      </div>

      <TableDetailModal
        title="Advisory Action Details"
        row={selected}
        onClose={() => setSelected(null)}
        fields={[
          { key: 'id', label: 'ID' },
          { key: 'created_at', label: 'When', render: (r) => r.created_at ? new Date(r.created_at).toLocaleString() : '—' },
          { key: 'action_type', label: 'Action' },
          { key: 'target_type', label: 'Target Type' },
          { key: 'target_ref', label: 'Target Ref' },
          { key: 'review_status', label: 'Status' },
          { key: 'reviewer', label: 'Reviewer' },
          { key: 'rationale', label: 'Rationale' },
          { key: 'payload', label: 'Payload' },
        ]}
        actions={selected && selected.review_status === 'pending' && (
          <>
            <button className="btn secondary" onClick={() => review(selected.id, 'approve')} disabled={busy}>Approve</button>
            <button className="btn danger" onClick={() => review(selected.id, 'reject')} disabled={busy}>Reject</button>
          </>
        )}
      />
    </div>
  );
}

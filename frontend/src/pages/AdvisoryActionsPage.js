import React, { useEffect, useState } from 'react';
import { advisoryApi } from '../services/api';

export default function AdvisoryActionsPage() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({ status: '', action_type: '' });

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
          <div className="form-grid">
            <div className="form-group"><label>Filing Type</label>
              <select value={fileForm.filing_type} onChange={(e) => setFileForm((s) => ({ ...s, filing_type: e.target.value }))}>
                <option>SAR</option><option>CTR</option>
              </select>
            </div>
            <div className="form-group"><label>Target Ref</label>
              <input value={fileForm.target_ref} onChange={(e) => setFileForm((s) => ({ ...s, target_ref: e.target.value }))} placeholder="SAR-2026-0001" />
            </div>
            <div className="form-group full-width"><label>Rationale</label>
              <textarea value={fileForm.rationale} onChange={(e) => setFileForm((s) => ({ ...s, rationale: e.target.value }))} placeholder="Why filing is recommended." />
            </div>
          </div>
          <button className="btn ai" style={{ marginTop: 8 }} onClick={submitFile} disabled={busy || !fileForm.target_ref}>Record Recommendation</button>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Recommend Account Freeze</h3>
          <div className="form-grid">
            <div className="form-group"><label>Account ID</label>
              <input value={freezeForm.account_id} onChange={(e) => setFreezeForm((s) => ({ ...s, account_id: e.target.value }))} placeholder="ACC-10015" />
            </div>
            <div className="form-group"><label>Hit ID (optional)</label>
              <input value={freezeForm.hit_id} onChange={(e) => setFreezeForm((s) => ({ ...s, hit_id: e.target.value }))} placeholder="HIT-2026-0001" />
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
              <tr key={r.id}>
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
                      <button className="btn secondary" onClick={() => review(r.id, 'approve')} disabled={busy}>Approve</button>
                      <button className="btn secondary" style={{ marginLeft: 4 }} onClick={() => review(r.id, 'reject')} disabled={busy}>Reject</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={8} style={{ textAlign: 'center', color: '#64748b' }}>No advisory actions yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

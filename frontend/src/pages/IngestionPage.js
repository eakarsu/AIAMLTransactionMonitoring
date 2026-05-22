import React, { useEffect, useState } from 'react';
import { ingestionApi } from '../services/api';

function StatusBlock({ title, children }) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      {children}
    </div>
  );
}

export default function IngestionPage() {
  const [ofac, setOfac] = useState(null);
  const [ofacErr, setOfacErr] = useState(null);
  const [ofacBusy, setOfacBusy] = useState(false);

  const [media, setMedia] = useState(null);
  const [mediaErr, setMediaErr] = useState(null);

  const [events, setEvents] = useState([]);
  const [evErr, setEvErr] = useState(null);
  const [evBusy, setEvBusy] = useState(false);

  const [postForm, setPostForm] = useState({ event_id: '', account_id: '', txn_id: '', amount: '', currency: 'USD', counterparty: '', ts: '' });

  const loadOfac = async () => {
    try { setOfac(await ingestionApi.ofacStatus()); setOfacErr(null); }
    catch (e) { setOfacErr(e.message); }
  };
  const loadMedia = async () => {
    try { setMedia(await ingestionApi.adverseMediaStatus()); setMediaErr(null); }
    catch (e) { setMediaErr(e.message); setMedia(null); }
  };
  const loadEvents = async () => {
    try { setEvents(await ingestionApi.txStreamList({ limit: 50 })); setEvErr(null); }
    catch (e) { setEvErr(e.message); }
  };

  useEffect(() => { loadOfac(); loadMedia(); loadEvents(); }, []);

  const refreshOfac = async () => {
    setOfacBusy(true);
    try { await ingestionApi.ofacRefresh(); await loadOfac(); setOfacErr(null); }
    catch (e) { setOfacErr(e.message); }
    finally { setOfacBusy(false); }
  };

  const postEvent = async () => {
    setEvBusy(true);
    try {
      const body = { ...postForm };
      if (!body.event_id) body.event_id = `EV-${Date.now()}`;
      if (body.amount === '') delete body.amount; else body.amount = Number(body.amount);
      if (!body.ts) delete body.ts;
      await ingestionApi.txStreamPost(body);
      await loadEvents();
      setEvErr(null);
    } catch (e) { setEvErr(e.message); }
    finally { setEvBusy(false); }
  };

  const processEvent = async (id) => {
    setEvBusy(true);
    try { await ingestionApi.txStreamProcess(id); await loadEvents(); }
    catch (e) { setEvErr(e.message); }
    finally { setEvBusy(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Ingestion</h2>
          <p>OFAC SDN refresh, adverse-media provider status, and inbound transaction-stream feed.</p>
        </div>
      </div>

      <StatusBlock title="OFAC SDN Ingestion">
        {ofacErr && <div className="ai-error" style={{ marginBottom: 8 }}>{ofacErr}</div>}
        {ofac ? (
          <div>
            <div style={{ marginBottom: 8 }}>
              <span style={{ color: ofac.ready ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
                {ofac.ready ? 'Ready' : 'Disabled — needs OFAC_INGESTION_ENABLED=true AND OFAC_INGESTION_LICENSE_ACK=true'}
              </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead><tr><th>List</th><th>Name</th><th>Jurisdiction</th><th>Last Review</th><th>Status</th></tr></thead>
                <tbody>
                  {(ofac.tracked_lists || []).map((l) => (
                    <tr key={l.list_id}>
                      <td>{l.list_id}</td><td>{l.name}</td><td>{l.jurisdiction}</td>
                      <td>{l.last_review ? new Date(l.last_review).toLocaleString() : '—'}</td><td>{l.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 12 }}>
              <button className="btn ai" onClick={refreshOfac} disabled={ofacBusy}>
                {ofacBusy ? 'Refreshing...' : 'Trigger Refresh'}
              </button>
            </div>
          </div>
        ) : <div>Loading...</div>}
      </StatusBlock>

      <StatusBlock title="Adverse-Media Provider Status">
        {mediaErr && <div className="ai-error" style={{ marginBottom: 8 }}>{mediaErr} (LLM-only fallback available via AI · Adverse Media Screen)</div>}
        {media && <pre style={{ whiteSpace: 'pre-wrap', color: '#cbd5e1' }}>{JSON.stringify(media, null, 2)}</pre>}
      </StatusBlock>

      <StatusBlock title="Inbound Transaction-Stream Feed (webhook ingest)">
        <div className="form-grid" style={{ marginBottom: 12 }}>
          <div className="form-group"><label>Event ID (idempotency)</label><input value={postForm.event_id} onChange={(e) => setPostForm((s) => ({ ...s, event_id: e.target.value }))} placeholder="auto-generated if blank" /></div>
          <div className="form-group"><label>Account ID</label><input value={postForm.account_id} onChange={(e) => setPostForm((s) => ({ ...s, account_id: e.target.value }))} placeholder="ACC-10001" /></div>
          <div className="form-group"><label>Txn ID</label><input value={postForm.txn_id} onChange={(e) => setPostForm((s) => ({ ...s, txn_id: e.target.value }))} placeholder="TXN-90001" /></div>
          <div className="form-group"><label>Amount</label><input value={postForm.amount} type="number" onChange={(e) => setPostForm((s) => ({ ...s, amount: e.target.value }))} placeholder="9750" /></div>
          <div className="form-group"><label>Currency</label><input value={postForm.currency} onChange={(e) => setPostForm((s) => ({ ...s, currency: e.target.value }))} /></div>
          <div className="form-group"><label>Counterparty</label><input value={postForm.counterparty} onChange={(e) => setPostForm((s) => ({ ...s, counterparty: e.target.value }))} /></div>
          <div className="form-group"><label>Timestamp (ISO)</label><input value={postForm.ts} onChange={(e) => setPostForm((s) => ({ ...s, ts: e.target.value }))} placeholder="2026-05-21T10:00:00Z" /></div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <button className="btn ai" onClick={postEvent} disabled={evBusy}>{evBusy ? 'Working...' : 'Post Event'}</button>
        </div>
        {evErr && <div className="ai-error" style={{ marginBottom: 8 }}>{evErr}</div>}
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead><tr><th>ID</th><th>Event</th><th>Account</th><th>Txn</th><th>Amount</th><th>Processed</th><th>Rule State</th><th></th></tr></thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id}>
                  <td>{ev.id}</td><td>{ev.event_id}</td><td>{ev.account_id}</td><td>{ev.txn_id}</td>
                  <td>{ev.amount}</td>
                  <td>{ev.processed ? 'yes' : 'no'}</td>
                  <td><code style={{ fontSize: 11 }}>{ev.rule_state ? JSON.stringify(ev.rule_state) : '—'}</code></td>
                  <td>{!ev.processed && <button className="btn secondary" onClick={() => processEvent(ev.id)}>Process</button>}</td>
                </tr>
              ))}
              {!events.length && <tr><td colSpan={8} style={{ textAlign: 'center', color: '#64748b' }}>No events yet</td></tr>}
            </tbody>
          </table>
        </div>
      </StatusBlock>
    </div>
  );
}

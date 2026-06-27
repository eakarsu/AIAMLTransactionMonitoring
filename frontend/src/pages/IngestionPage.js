import React, { useEffect, useState } from 'react';
import { ingestionApi } from '../services/api';
import ReferenceSelect from '../components/ReferenceSelect';
import TableDetailModal from '../components/TableDetailModal';

function StatusBlock({ title, children }) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      {children}
    </div>
  );
}

const EVENT_SAMPLES = [
  { label: 'Structuring deposit', values: { event_id: 'EV-STRUCT-001', account_id: 'ACC-10001', txn_id: 'TXN-ING-001', amount: '9750', currency: 'USD', counterparty: 'Miami Cash Deposit', ts: '2026-05-21T10:00:00Z' } },
  { label: 'Cross-border wire', values: { event_id: 'EV-WIRE-001', account_id: 'ACC-10004', txn_id: 'TXN-ING-002', amount: '450000', currency: 'USD', counterparty: 'Pacific Nominees Ltd', ts: '2026-05-22T14:30:00Z' } },
  { label: 'Crypto mixer', values: { event_id: 'EV-CRYPTO-001', account_id: 'ACC-10012', txn_id: 'TXN-ING-003', amount: '185000', currency: 'CHF', counterparty: 'Tornado Cash 0xDEAD', ts: '2026-05-23T09:15:00Z' } },
];

export default function IngestionPage() {
  const [ofac, setOfac] = useState(null);
  const [ofacErr, setOfacErr] = useState(null);
  const [ofacBusy, setOfacBusy] = useState(false);

  const [media, setMedia] = useState(null);
  const [mediaErr, setMediaErr] = useState(null);

  const [events, setEvents] = useState([]);
  const [selectedList, setSelectedList] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
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
                    <tr key={l.list_id} onClick={() => setSelectedList(l)} style={{ cursor: 'pointer' }}>
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
        {mediaErr && <div className="ai-error" style={{ marginBottom: 8 }}>{mediaErr}</div>}
        {media ? (
          <div>
            <div style={{ marginBottom: 8 }}>
              <span style={{ color: media.enabled ? '#10b981' : '#f59e0b', fontWeight: 700 }}>
                {media.enabled ? 'Commercial provider connected' : 'Commercial provider not configured'}
              </span>
            </div>
            <p style={{ marginTop: 0, color: '#64748b' }}>
              {media.message || 'Adverse-media status loaded.'}
            </p>
            {!media.enabled && (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Available fallback</div>
                <div>Use <strong>AI · Adverse Media Screen</strong> for LLM-only screening until a licensed feed is configured.</div>
                <div style={{ marginTop: 8, fontSize: 13, color: '#64748b' }}>
                  Configure one of: {(media.required_env_any || []).join(', ')}
                </div>
              </div>
            )}
          </div>
        ) : !mediaErr ? <div>Loading...</div> : null}
      </StatusBlock>

      <StatusBlock title="Inbound Transaction-Stream Feed (webhook ingest)">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {EVENT_SAMPLES.map((sample) => (
            <button key={sample.label} type="button" className="btn secondary" onClick={() => setPostForm(sample.values)}>
              {sample.label}
            </button>
          ))}
        </div>
        <div className="form-grid" style={{ marginBottom: 12 }}>
          <div className="form-group"><label>Event ID (idempotency)</label><input value={postForm.event_id} onChange={(e) => setPostForm((s) => ({ ...s, event_id: e.target.value }))} placeholder="auto-generated if blank" /></div>
          <div className="form-group"><label>Account ID</label>
            <ReferenceSelect
              source="accounts"
              value={postForm.account_id}
              onChange={(value) => setPostForm((s) => ({ ...s, account_id: value }))}
              allowEmpty
              emptyLabel="Select account"
            />
          </div>
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
            <thead><tr><th>ID</th><th>Event</th><th>Account</th><th>Txn</th><th>Amount</th><th>Processed</th><th>Rule State</th></tr></thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id} onClick={() => setSelectedEvent(ev)} style={{ cursor: 'pointer' }}>
                  <td>{ev.id}</td><td>{ev.event_id}</td><td>{ev.account_id}</td><td>{ev.txn_id}</td>
                  <td>{ev.amount}</td>
                  <td>{ev.processed ? 'yes' : 'no'}</td>
                  <td><code style={{ fontSize: 11 }}>{ev.rule_state ? JSON.stringify(ev.rule_state) : '—'}</code></td>
                </tr>
              ))}
              {!events.length && <tr><td colSpan={7} style={{ textAlign: 'center', color: '#64748b' }}>No events yet</td></tr>}
            </tbody>
          </table>
        </div>
      </StatusBlock>

      <TableDetailModal
        title="Watchlist Ingestion Details"
        row={selectedList}
        onClose={() => setSelectedList(null)}
        fields={[
          { key: 'list_id', label: 'List ID' },
          { key: 'name', label: 'Name' },
          { key: 'jurisdiction', label: 'Jurisdiction' },
          { key: 'last_review', label: 'Last Review', render: (r) => r.last_review ? new Date(r.last_review).toLocaleString() : '—' },
          { key: 'status', label: 'Status' },
        ]}
      />

      <TableDetailModal
        title="Transaction Stream Event Details"
        row={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        fields={[
          { key: 'id', label: 'ID' },
          { key: 'event_id', label: 'Event ID' },
          { key: 'source', label: 'Source' },
          { key: 'account_id', label: 'Account ID' },
          { key: 'txn_id', label: 'Txn ID' },
          { key: 'amount', label: 'Amount' },
          { key: 'currency', label: 'Currency' },
          { key: 'counterparty', label: 'Counterparty' },
          { key: 'ts', label: 'Timestamp' },
          { key: 'processed', label: 'Processed' },
          { key: 'rule_state', label: 'Rule State' },
          { key: 'raw_payload', label: 'Raw Payload' },
        ]}
        actions={selectedEvent && !selectedEvent.processed && (
          <button className="btn secondary" onClick={() => { const id = selectedEvent.id; setSelectedEvent(null); processEvent(id); }}>
            Process
          </button>
        )}
      />
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { fincenExportsApi } from '../services/api';

const FILING_TYPES = ['SAR', 'CTR', '8300', 'FBAR', 'OFAC'];

export default function FincenExportsPage() {
  const [filingType, setFilingType] = useState('SAR');
  const [caseRef, setCaseRef] = useState('');
  const [mappings, setMappings] = useState([]);
  const [exportResult, setExportResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadMappings = async (ft) => {
    try { setMappings(await fincenExportsApi.mappings(ft)); setError(null); }
    catch (e) { setError(e.message); }
  };
  useEffect(() => { loadMappings(filingType); }, [filingType]);

  const runExport = async () => {
    setBusy(true); setError(null); setExportResult(null);
    try {
      const r = await fincenExportsApi.export(filingType, caseRef);
      setExportResult(r);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>FinCEN Machine-Readable Exports</h2>
          <p>SAR / CTR / 8300 / FBAR / OFAC XML using the <code>fincen_field_mappings</code> table. Auto-filing is disabled — exports are advisory and require human review.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="form-grid">
          <div className="form-group">
            <label>Filing Type</label>
            <select value={filingType} onChange={(e) => setFilingType(e.target.value)}>
              {FILING_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Case Ref</label>
            <input value={caseRef} onChange={(e) => setCaseRef(e.target.value)} placeholder={filingType === 'SAR' ? 'SAR-2026-0001' : filingType === 'CTR' ? 'CTR-2026-W20-001' : filingType === '8300' ? 'TXN-90001' : filingType === 'FBAR' ? 'ACC-10001' : 'HIT-2026-0001'} />
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <button className="btn ai" onClick={runExport} disabled={busy || !caseRef}>{busy ? 'Building XML...' : 'Generate XML'}</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>{filingType} Field Mappings</h3>
        <table className="data-table">
          <thead><tr><th>Internal Path</th><th>XSD Element</th><th>Required</th><th>Notes</th></tr></thead>
          <tbody>
            {mappings.map((m) => (
              <tr key={m.id}>
                <td><code>{m.internal_path}</code></td>
                <td><code style={{ fontSize: 12 }}>{m.xsd_element}</code></td>
                <td>{m.required ? 'yes' : 'no'}</td>
                <td>{m.notes || '—'}</td>
              </tr>
            ))}
            {!mappings.length && <tr><td colSpan={4} style={{ textAlign: 'center', color: '#64748b' }}>No mappings — add via POST /api/fincen-exports/mappings</td></tr>}
          </tbody>
        </table>
      </div>

      {error && <div className="ai-error">{error}</div>}

      {exportResult && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Generated Export</h3>
          {exportResult.missing_required && exportResult.missing_required.length > 0 && (
            <div className="ai-error" style={{ marginBottom: 8 }}>
              Missing required fields: {exportResult.missing_required.join(', ')}
            </div>
          )}
          <div style={{ marginBottom: 8, color: '#94a3b8', fontSize: 12 }}>
            auto_file_capable: <code>{String(exportResult.auto_file_capable)}</code> · requires_human_review: <code>{String(exportResult.requires_human_review)}</code>
          </div>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#cbd5e1', background: '#0f172a', padding: 12, borderRadius: 6, overflowX: 'auto' }}>{exportResult.xml}</pre>
        </div>
      )}
    </div>
  );
}

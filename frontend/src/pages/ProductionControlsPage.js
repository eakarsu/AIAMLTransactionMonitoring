import React from 'react';

const rows = [
  ['Core Banking Ingestion', 'Integration Lead', 'Account, customer, transaction, and card feeds with replay-safe batch checks.'],
  ['Sanctions Feed Refresh', 'Compliance Data Lead', 'OFAC, UN, HMT, EU, PEP, adverse media, and private watchlist refresh evidence.'],
  ['SAR/CTR Export QA', 'BSA Officer', 'FinCEN packet validation, analyst signoff, attachment manifests, and filing history.'],
  ['Enterprise Identity & Access', 'Security Lead', 'SSO/MFA, investigator roles, case segregation, break-glass access, and certification.'],
  ['False Positive Model Monitoring', 'Model Risk Lead', 'Threshold drift, override sampling, benchmark cohorts, and model approval evidence.'],
  ['Audit Export & Release Gates', 'Platform Lead', 'Immutable case history, access logs, browser smoke checks, and production launch gates.'],
];

export default function ProductionControlsPage() {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, color: '#e2e8f0' }}>Production Controls</h1>
        <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>
          Go-live controls for AML transaction monitoring, sanctions, case management, regulatory filing, and model-risk operations.
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
        {rows.map(([title, owner, detail]) => (
          <section key={title} style={{ background: '#111827', border: '1px solid #334155', borderRadius: 8, padding: 16 }}>
            <h2 style={{ color: '#e2e8f0', fontSize: 16, marginTop: 0 }}>{title}</h2>
            <p style={{ color: '#cbd5e1', fontSize: 13 }}>{detail}</p>
            <span style={{ color: '#93c5fd', fontSize: 12, fontWeight: 700 }}>{owner}</span>
          </section>
        ))}
      </div>
    </div>
  );
}

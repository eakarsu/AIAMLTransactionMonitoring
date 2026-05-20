import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats } from '../services/api';

const FEATURES = [
  // Customers & Accounts
  { path: '/customers',         title: 'Customers',         icon: 'C', color: '#3b82f6', desc: 'Customer master with risk tier and status.' },
  { path: '/accounts',          title: 'Accounts',          icon: 'A', color: '#06b6d4', desc: 'Account ledger by customer with balance and currency.' },

  // Transactions
  { path: '/transactions',      title: 'Transactions',      icon: 'T', color: '#10b981', desc: 'Inbound/outbound transactions with counterparty.' },

  // Alerts
  { path: '/alerts',            title: 'Alerts',            icon: '!', color: '#ef4444', desc: 'Open and investigating alerts from monitoring rules.' },

  // Cases
  { path: '/sar-cases',         title: 'SAR Cases',         icon: 'S', color: '#f59e0b', desc: 'Suspicious Activity Reports — draft, review, filed.' },
  { path: '/edd-cases',         title: 'EDD Cases',         icon: 'E', color: '#fb7185', desc: 'Enhanced Due Diligence workflow.' },
  { path: '/investigations',    title: 'Investigations',    icon: 'I', color: '#a78bfa', desc: 'Open investigation leads tied to cases.' },

  // Watchlists
  { path: '/watchlists',        title: 'Watchlists',        icon: 'W', color: '#facc15', desc: 'OFAC, EU, UN, HMT and internal watchlists.' },
  { path: '/sanctions-hits',    title: 'Sanctions Hits',    icon: 'H', color: '#dc2626', desc: 'Name screening matches and triage status.' },
  { path: '/peps',              title: 'PEPs',              icon: 'P', color: '#ec4899', desc: 'Politically-Exposed Persons inventory.' },

  // Filings
  { path: '/ctrs',              title: 'CTRs',              icon: '$', color: '#22c55e', desc: 'Currency Transaction Reports — pending and filed.' },
  { path: '/regulatory-filings',title: 'Regulatory Filings',icon: 'R', color: '#0ea5e9', desc: 'SAR/CTR/FBAR/8300/OFAC filings.' },

  // Governance
  { path: '/kyc-profiles',      title: 'KYC Profiles',      icon: 'K', color: '#14b8a6', desc: 'Customer documents, expiry and refresh due.' },
  { path: '/source-of-funds',   title: 'Source of Funds',   icon: 'F', color: '#a3e635', desc: 'Claimed funds origin and evidence status.' },
  { path: '/beneficial-owners', title: 'Beneficial Owners', icon: 'B', color: '#60a5fa', desc: 'UBO chains, percentages and verification.' },
  { path: '/typologies',        title: 'Typologies',        icon: 'Y', color: '#7dd3fc', desc: 'AML typologies catalog with severity and controls.' },
  { path: '/jurisdictions',     title: 'Jurisdictions',     icon: 'J', color: '#f472b6', desc: 'FATF rating and sanctions status per country.' },
  { path: '/audit-log',         title: 'Audit Log',         icon: 'L', color: '#34d399', desc: 'Actor / target / action history.' },

  // AI Detection
  { path: '/ai/typology-detect',          title: 'AI · Typology Detect',          icon: '*', color: '#8b5cf6', desc: 'Detect AML typologies in transaction window.' },
  { path: '/ai/transaction-anomaly',      title: 'AI · Transaction Anomaly',      icon: '*', color: '#8b5cf6', desc: 'Find statistical and behavioral outliers.' },
  { path: '/ai/sanction-name-match',      title: 'AI · Sanctions Name Match',     icon: '*', color: '#8b5cf6', desc: 'Score and triage screening matches.' },
  { path: '/ai/false-positive-classifier',title: 'AI · False Positive Classifier',icon: '*', color: '#8b5cf6', desc: 'Triage alerts and reduce false positives.' },

  // AI Investigation
  { path: '/ai/sar-narrative-draft',     title: 'AI · SAR Narrative Draft',     icon: '*', color: '#8b5cf6', desc: 'Generate a FinCEN SAR narrative from evidence.' },
  { path: '/ai/investigation-summary',   title: 'AI · Investigation Summary',   icon: '*', color: '#8b5cf6', desc: 'Summarize an open investigation lead.' },
  { path: '/ai/network-analysis',        title: 'AI · Network Analysis',        icon: '*', color: '#8b5cf6', desc: 'Build counterparty / ownership network.' },
  { path: '/ai/beneficial-owner-trace',  title: 'AI · Beneficial Owner Trace',  icon: '*', color: '#8b5cf6', desc: 'Trace UBO chain and OFAC 50% rule.' },
  { path: '/ai/source-of-funds-explain', title: 'AI · Source of Funds Explain', icon: '*', color: '#8b5cf6', desc: 'Reconcile claimed SoF with observed activity.' },
  { path: '/ai/edd-questionnaire',       title: 'AI · EDD Questionnaire',       icon: '*', color: '#8b5cf6', desc: 'Generate an EDD questionnaire for a trigger.' },

  // AI Reporting
  { path: '/ai/executive-brief',         title: 'AI · Executive Brief',         icon: '*', color: '#8b5cf6', desc: 'BSA-Officer level compliance snapshot.' },
  { path: '/ai/regulatory-filing-draft', title: 'AI · Regulatory Filing Draft', icon: '*', color: '#8b5cf6', desc: 'Draft SAR/CTR/FBAR/8300/OFAC body.' },
  { path: '/ai/customer-risk-score',     title: 'AI · Customer Risk Score',     icon: '*', color: '#8b5cf6', desc: 'Composite customer risk with breakdown.' },
  { path: '/ai/peer-group-compare',      title: 'AI · Peer Group Compare',      icon: '*', color: '#8b5cf6', desc: 'Compare customer behavior to peers.' },
  { path: '/ai/jurisdictional-risk',     title: 'AI · Jurisdictional Risk',     icon: '*', color: '#8b5cf6', desc: 'Assess country risk for AML/sanctions.' },
  { path: '/ai/kyc-refresh-summary',     title: 'AI · KYC Refresh Summary',     icon: '*', color: '#8b5cf6', desc: 'Prioritize KYC refresh queue.' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    getDashboardStats().then(setStats).catch((e) => setErr(e.message));
  }, []);

  return (
    <div>
      <div className="dashboard-header">
        <h2>Compliance Dashboard</h2>
        <p>AML transaction monitoring & sanctions screening · {new Date().toUTCString()}</p>
      </div>

      {err && <div className="ai-error">Stats unavailable: {err}</div>}

      {stats && (
        <div className="stats-grid">
          <div className="stat"><div className="stat-label">Customers</div><div className="stat-value">{stats.customers?.total ?? '—'}</div><div className="stat-sub">{stats.customers?.high_risk ?? 0} high-risk</div></div>
          <div className="stat"><div className="stat-label">Accounts</div><div className="stat-value">{stats.accounts?.total ?? '—'}</div><div className="stat-sub">{stats.accounts?.open ?? 0} open · {stats.accounts?.frozen ?? 0} frozen</div></div>
          <div className="stat"><div className="stat-label">Transactions</div><div className="stat-value">{stats.transactions?.total ?? '—'}</div><div className="stat-sub">${Number(stats.transactions?.total_amount || 0).toLocaleString()} total</div></div>
          <div className="stat"><div className="stat-label">Alerts</div><div className="stat-value">{stats.alerts?.total ?? '—'}</div><div className="stat-sub">{stats.alerts?.critical ?? 0} critical · {stats.alerts?.high ?? 0} high</div></div>
          <div className="stat"><div className="stat-label">SAR Cases</div><div className="stat-value">{stats.sar_cases?.total ?? '—'}</div><div className="stat-sub">{stats.sar_cases?.filed ?? 0} filed · {stats.sar_cases?.draft ?? 0} draft</div></div>
          <div className="stat"><div className="stat-label">CTRs</div><div className="stat-value">{stats.ctrs?.total ?? '—'}</div><div className="stat-sub">{stats.ctrs?.filed ?? 0} filed · {stats.ctrs?.pending ?? 0} pending</div></div>
          <div className="stat"><div className="stat-label">Sanctions Hits</div><div className="stat-value">{stats.sanctions_hits?.total ?? '—'}</div><div className="stat-sub">{stats.sanctions_hits?.confirmed ?? 0} confirmed · {stats.sanctions_hits?.open ?? 0} open</div></div>
          <div className="stat"><div className="stat-label">KYC Profiles</div><div className="stat-value">{stats.kyc_profiles?.total ?? '—'}</div><div className="stat-sub">{stats.kyc_profiles?.expired ?? 0} expired · {stats.kyc_profiles?.expiring ?? 0} expiring</div></div>
          <div className="stat"><div className="stat-label">Watchlists</div><div className="stat-value">{stats.watchlists?.total ?? '—'}</div><div className="stat-sub">{stats.watchlists?.active ?? 0} active</div></div>
          <div className="stat"><div className="stat-label">Typologies</div><div className="stat-value">{stats.typologies?.total ?? '—'}</div><div className="stat-sub">{stats.typologies?.critical ?? 0} critical · {stats.typologies?.high ?? 0} high</div></div>
          <div className="stat"><div className="stat-label">Beneficial Owners</div><div className="stat-value">{stats.beneficial_owners?.total ?? '—'}</div><div className="stat-sub">{stats.beneficial_owners?.verified ?? 0} verified</div></div>
          <div className="stat"><div className="stat-label">PEPs</div><div className="stat-value">{stats.peps?.total ?? '—'}</div><div className="stat-sub">{stats.peps?.active ?? 0} active</div></div>
          <div className="stat"><div className="stat-label">Jurisdictions</div><div className="stat-value">{stats.jurisdictions?.total ?? '—'}</div><div className="stat-sub">{stats.jurisdictions?.high_risk ?? 0} high-risk</div></div>
          <div className="stat"><div className="stat-label">Investigations</div><div className="stat-value">{stats.investigations?.total ?? '—'}</div><div className="stat-sub">{stats.investigations?.open ?? 0} open · {stats.investigations?.closed ?? 0} closed</div></div>
          <div className="stat"><div className="stat-label">EDD Cases</div><div className="stat-value">{stats.edd_cases?.total ?? '—'}</div><div className="stat-sub">{stats.edd_cases?.open ?? 0} open</div></div>
          <div className="stat"><div className="stat-label">Source of Funds</div><div className="stat-value">{stats.source_of_funds?.total ?? '—'}</div><div className="stat-sub">{stats.source_of_funds?.verified ?? 0} verified · {stats.source_of_funds?.pending ?? 0} pending</div></div>
          <div className="stat"><div className="stat-label">Audit Log</div><div className="stat-value">{stats.audit_log?.total ?? '—'}</div><div className="stat-sub">entries</div></div>
          <div className="stat"><div className="stat-label">Reg Filings</div><div className="stat-value">{stats.regulatory_filings?.total ?? '—'}</div><div className="stat-sub">{stats.regulatory_filings?.filed ?? 0} filed · {stats.regulatory_filings?.draft ?? 0} draft</div></div>
        </div>
      )}

      <h3 style={{ color: '#cbd5e1', margin: '8px 0 14px', fontSize: 15, textTransform: 'uppercase', letterSpacing: 1 }}>Capabilities</h3>
      <div className="feature-grid">
        {FEATURES.map((f) => (
          <div
            key={f.path}
            className="feature-card"
            style={{ ['--card-color']: f.color }}
            onClick={() => navigate(f.path)}
          >
            <div className="feature-card-icon" style={{ background: f.color + '22', color: f.color }}>{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

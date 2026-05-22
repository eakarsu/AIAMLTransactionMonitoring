import React from 'react';
import { NavLink } from 'react-router-dom';
import { logout, getStoredUser } from '../services/api';

const CUSTOMERS_ACCOUNTS = [
  { to: '/customers', label: 'Customers' },
  { to: '/accounts',  label: 'Accounts' },
];

const TRANSACTIONS = [
  { to: '/transactions', label: 'Transactions' },
];

const ALERTS = [
  { to: '/alerts', label: 'Alerts' },
  { to: '/structuring-risk', label: 'Structuring Risk' },
];

const CASES = [
  { to: '/sar-cases',       label: 'SAR Cases' },
  { to: '/edd-cases',       label: 'EDD Cases' },
  { to: '/investigations',  label: 'Investigations' },
];

const WATCHLISTS = [
  { to: '/watchlists',        label: 'Watchlists' },
  { to: '/sanctions-hits',    label: 'Sanctions Hits' },
  { to: '/peps',              label: 'PEPs' },
];

const FILINGS = [
  { to: '/ctrs',                label: 'CTRs' },
  { to: '/regulatory-filings',  label: 'Regulatory Filings' },
];

const GOVERNANCE = [
  { to: '/kyc-profiles',       label: 'KYC Profiles' },
  { to: '/source-of-funds',    label: 'Source of Funds' },
  { to: '/beneficial-owners',  label: 'Beneficial Owners' },
  { to: '/typologies',         label: 'Typologies' },
  { to: '/jurisdictions',      label: 'Jurisdictions' },
  { to: '/audit-log',          label: 'Audit Log' },
];

const AI_DETECTION = [
  { to: '/ai/typology-detect',          label: 'AI · Typology Detect' },
  { to: '/ai/transaction-anomaly',      label: 'AI · Transaction Anomaly' },
  { to: '/ai/sanction-name-match',      label: 'AI · Sanctions Name Match' },
  { to: '/ai/false-positive-classifier',label: 'AI · False Positive Classifier' },
  { to: '/ai/adverse-media-screen',     label: 'AI · Adverse Media Screen' },
];

const AI_INVESTIGATION = [
  { to: '/ai/sar-narrative-draft',     label: 'AI · SAR Narrative Draft' },
  { to: '/ai/investigation-summary',   label: 'AI · Investigation Summary' },
  { to: '/ai/network-analysis',        label: 'AI · Network Analysis' },
  { to: '/ai/beneficial-owner-trace',  label: 'AI · Beneficial Owner Trace' },
  { to: '/ai/source-of-funds-explain', label: 'AI · Source of Funds Explain' },
  { to: '/ai/edd-questionnaire',       label: 'AI · EDD Questionnaire' },
];

const AI_REPORTING = [
  { to: '/ai/executive-brief',         label: 'AI · Executive Brief' },
  { to: '/ai/regulatory-filing-draft', label: 'AI · Regulatory Filing Draft' },
  { to: '/ai/customer-risk-score',     label: 'AI · Customer Risk Score' },
  { to: '/ai/peer-group-compare',      label: 'AI · Peer Group Compare' },
  { to: '/ai/jurisdictional-risk',     label: 'AI · Jurisdictional Risk' },
  { to: '/ai/kyc-refresh-summary',     label: 'AI · KYC Refresh Summary' },
  { to: '/ai/kyc-onboarding-prescreen',label: 'AI · KYC Onboarding Pre-Screen' },
];

const OPERATIONS = [
  { to: '/peer-benchmarks',  label: 'Peer Benchmarks' },
  { to: '/case-workflow',    label: 'Case Workflow' },
  { to: '/escalation',       label: 'Escalation Routing' },
  { to: '/ingestion',        label: 'Ingestion' },
  { to: '/fincen-exports',   label: 'FinCEN Exports' },
  { to: '/advisory-actions', label: 'Advisory Actions' },
];

export default function Sidebar() {
  const user = getStoredUser();
  return (
    <nav className="sidebar">
      <div className="sidebar-brand">
        <h1>AML COMPLIANCE</h1>
        <p>Transaction Monitoring & Sanctions</p>
      </div>

      <NavLink to="/" end>Compliance Dashboard</NavLink>

      <div className="sidebar-group-label">Customers & Accounts</div>
      {CUSTOMERS_ACCOUNTS.map((l) => <NavLink key={l.to} to={l.to}>{l.label}</NavLink>)}

      <div className="sidebar-group-label">Transactions</div>
      {TRANSACTIONS.map((l) => <NavLink key={l.to} to={l.to}>{l.label}</NavLink>)}

      <div className="sidebar-group-label">Alerts</div>
      {ALERTS.map((l) => <NavLink key={l.to} to={l.to}>{l.label}</NavLink>)}

      <div className="sidebar-group-label">Cases</div>
      {CASES.map((l) => <NavLink key={l.to} to={l.to}>{l.label}</NavLink>)}

      <div className="sidebar-group-label">Watchlists</div>
      {WATCHLISTS.map((l) => <NavLink key={l.to} to={l.to}>{l.label}</NavLink>)}

      <div className="sidebar-group-label">Filings</div>
      {FILINGS.map((l) => <NavLink key={l.to} to={l.to}>{l.label}</NavLink>)}

      <div className="sidebar-group-label">Governance</div>
      {GOVERNANCE.map((l) => <NavLink key={l.to} to={l.to}>{l.label}</NavLink>)}

      <div className="sidebar-group-label">AI Detection</div>
      {AI_DETECTION.map((l) => <NavLink key={l.to} to={l.to}>{l.label}</NavLink>)}

      <div className="sidebar-group-label">AI Investigation</div>
      {AI_INVESTIGATION.map((l) => <NavLink key={l.to} to={l.to}>{l.label}</NavLink>)}

      <div className="sidebar-group-label">AI Reporting</div>
      {AI_REPORTING.map((l) => <NavLink key={l.to} to={l.to}>{l.label}</NavLink>)}

      <div className="sidebar-group-label">Operations</div>
      {OPERATIONS.map((l) => <NavLink key={l.to} to={l.to}>{l.label}</NavLink>)}

      <div className="sidebar-group-label">Custom Views</div>
      <NavLink to="/custom-views">Compliance Views</NavLink>

      <div className="sidebar-group-label">Admin</div>
      <NavLink to="/webhooks">Webhooks</NavLink>

      <div className="sidebar-user">
        {user && (
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user.name || user.email}</div>
            <div className="sidebar-user-role">{user.role || 'user'}</div>
          </div>
        )}
        <button className="btn secondary sidebar-logout" onClick={logout}>Sign Out</button>
      </div>
    </nav>
  );
}

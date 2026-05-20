import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './pages/Dashboard';

// 18 AML CRUD pages
import CustomersPage         from './pages/CustomersPage';
import AccountsPage          from './pages/AccountsPage';
import TransactionsPage      from './pages/TransactionsPage';
import SanctionsHitsPage     from './pages/SanctionsHitsPage';
import SarCasesPage          from './pages/SarCasesPage';
import CtrsPage              from './pages/CtrsPage';
import KycProfilesPage       from './pages/KycProfilesPage';
import WatchlistsPage        from './pages/WatchlistsPage';
import TypologiesPage        from './pages/TypologiesPage';
import BeneficialOwnersPage  from './pages/BeneficialOwnersPage';
import PepsPage              from './pages/PepsPage';
import JurisdictionsPage     from './pages/JurisdictionsPage';
import InvestigationsPage    from './pages/InvestigationsPage';
import AlertsPage            from './pages/AlertsPage';
import AuditLogPage          from './pages/AuditLogPage';
import SourceOfFundsPage     from './pages/SourceOfFundsPage';
import EddCasesPage          from './pages/EddCasesPage';
import RegulatoryFilingsPage from './pages/RegulatoryFilingsPage';

// 16 AML AI pages
import AISarNarrativeDraftPage     from './pages/AISarNarrativeDraftPage';
import AITypologyDetectPage        from './pages/AITypologyDetectPage';
import AIKycRefreshSummaryPage     from './pages/AIKycRefreshSummaryPage';
import AISanctionNameMatchPage     from './pages/AISanctionNameMatchPage';
import AIBeneficialOwnerTracePage  from './pages/AIBeneficialOwnerTracePage';
import AITransactionAnomalyPage    from './pages/AITransactionAnomalyPage';
import AIPeerGroupComparePage      from './pages/AIPeerGroupComparePage';
import AIExecutiveBriefPage        from './pages/AIExecutiveBriefPage';
import AICustomerRiskScorePage     from './pages/AICustomerRiskScorePage';
import AIEddQuestionnairePage      from './pages/AIEddQuestionnairePage';
import AIInvestigationSummaryPage  from './pages/AIInvestigationSummaryPage';
import AIRegulatoryFilingDraftPage from './pages/AIRegulatoryFilingDraftPage';
import AISourceOfFundsExplainPage  from './pages/AISourceOfFundsExplainPage';
import AIJurisdictionalRiskPage    from './pages/AIJurisdictionalRiskPage';
import AIFalsePositiveClassifierPage from './pages/AIFalsePositiveClassifierPage';
import AINetworkAnalysisPage       from './pages/AINetworkAnalysisPage';

// Admin
import WebhooksPage from './pages/WebhooksPage';

// Compliance custom views
import CustomViewsPage from './pages/CustomViewsPage';

import LoginPage from './pages/LoginPage';
import { getToken } from './services/api';

import './App.css';

function RequireAuth({ children }) {
  const location = useLocation();
  if (!getToken()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

function ShellRoutes() {
  return (
    <div className="app">
      <Sidebar />
      <main className="main" style={{ padding: 0 }}>
        <Topbar />
        <div style={{ padding: '24px 32px' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />

            <Route path="/customers"           element={<CustomersPage />} />
            <Route path="/accounts"            element={<AccountsPage />} />
            <Route path="/transactions"        element={<TransactionsPage />} />
            <Route path="/sanctions-hits"      element={<SanctionsHitsPage />} />
            <Route path="/sar-cases"           element={<SarCasesPage />} />
            <Route path="/ctrs"                element={<CtrsPage />} />
            <Route path="/kyc-profiles"        element={<KycProfilesPage />} />
            <Route path="/watchlists"          element={<WatchlistsPage />} />
            <Route path="/typologies"          element={<TypologiesPage />} />
            <Route path="/beneficial-owners"   element={<BeneficialOwnersPage />} />
            <Route path="/peps"                element={<PepsPage />} />
            <Route path="/jurisdictions"       element={<JurisdictionsPage />} />
            <Route path="/investigations"      element={<InvestigationsPage />} />
            <Route path="/alerts"              element={<AlertsPage />} />
            <Route path="/audit-log"           element={<AuditLogPage />} />
            <Route path="/source-of-funds"     element={<SourceOfFundsPage />} />
            <Route path="/edd-cases"           element={<EddCasesPage />} />
            <Route path="/regulatory-filings"  element={<RegulatoryFilingsPage />} />

            <Route path="/ai/sar-narrative-draft"      element={<AISarNarrativeDraftPage />} />
            <Route path="/ai/typology-detect"          element={<AITypologyDetectPage />} />
            <Route path="/ai/kyc-refresh-summary"      element={<AIKycRefreshSummaryPage />} />
            <Route path="/ai/sanction-name-match"      element={<AISanctionNameMatchPage />} />
            <Route path="/ai/beneficial-owner-trace"   element={<AIBeneficialOwnerTracePage />} />
            <Route path="/ai/transaction-anomaly"      element={<AITransactionAnomalyPage />} />
            <Route path="/ai/peer-group-compare"       element={<AIPeerGroupComparePage />} />
            <Route path="/ai/executive-brief"          element={<AIExecutiveBriefPage />} />
            <Route path="/ai/customer-risk-score"      element={<AICustomerRiskScorePage />} />
            <Route path="/ai/edd-questionnaire"        element={<AIEddQuestionnairePage />} />
            <Route path="/ai/investigation-summary"    element={<AIInvestigationSummaryPage />} />
            <Route path="/ai/regulatory-filing-draft"  element={<AIRegulatoryFilingDraftPage />} />
            <Route path="/ai/source-of-funds-explain"  element={<AISourceOfFundsExplainPage />} />
            <Route path="/ai/jurisdictional-risk"      element={<AIJurisdictionalRiskPage />} />
            <Route path="/ai/false-positive-classifier" element={<AIFalsePositiveClassifierPage />} />
            <Route path="/ai/network-analysis"         element={<AINetworkAnalysisPage />} />

            <Route path="/webhooks" element={<WebhooksPage />} />

            <Route path="/custom-views" element={<CustomViewsPage />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <RequireAuth>
              <ShellRoutes />
            </RequireAuth>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;

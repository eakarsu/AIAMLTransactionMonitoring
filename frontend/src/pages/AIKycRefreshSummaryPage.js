import React from 'react';
import AIPage from '../components/AIPage';
import { aiKycRefreshSummary } from '../services/api';

export default function AIKycRefreshSummaryPage() {
  return (
    <AIPage
      title="AI · KYC Refresh Summary"
      feature="kyc-refresh-summary"
      subtitle="Prioritize the KYC refresh queue: expired, expiring, enhanced."
      inputs={[]}
      run={(v) => aiKycRefreshSummary(v)}
    />
  );
}

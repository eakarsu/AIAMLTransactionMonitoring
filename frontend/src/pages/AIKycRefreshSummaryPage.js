import React from 'react';
import AIPage from '../components/AIPage';
import { aiKycRefreshSummary } from '../services/api';

export default function AIKycRefreshSummaryPage() {
  return (
    <AIPage
      title="AI · KYC Refresh Summary"
      feature="kyc-refresh-summary"
      subtitle="Prioritize the KYC refresh queue: expired, expiring, enhanced."
      inputs={[
        { key: 'focus', label: 'Queue Focus (optional)', type: 'textarea', placeholder: 'e.g. expired documents, enhanced due diligence, high-risk customers.' },
      ]}
      run={(v, requestOptions) => aiKycRefreshSummary(v, requestOptions)}
    />
  );
}

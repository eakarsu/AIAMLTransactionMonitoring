import React from 'react';
import AIPage from '../components/AIPage';
import { aiCustomerRiskScore } from '../services/api';

export default function AICustomerRiskScorePage() {
  return (
    <AIPage
      title="AI · Customer Risk Score"
      feature="customer-risk-score"
      subtitle="Composite customer risk score with weighted factor breakdown."
      inputs={[
        { key: 'customer_id',   label: 'Customer ID',          placeholder: 'C-4421' },
        { key: 'signals_notes', label: 'Additional Signals',   type: 'textarea', placeholder: 'Free-form risk signals.' },
      ]}
      run={(v) => aiCustomerRiskScore(v)}
    />
  );
}

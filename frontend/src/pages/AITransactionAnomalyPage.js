import React from 'react';
import AIPage from '../components/AIPage';
import { aiTransactionAnomaly } from '../services/api';

export default function AITransactionAnomalyPage() {
  return (
    <AIPage
      title="AI · Transaction Anomaly"
      feature="transaction-anomaly"
      subtitle="Find statistical and behavioral outliers in the transaction window."
      inputs={[
        { key: 'hints', label: 'Hints / Filter', type: 'textarea', placeholder: 'Optional filter, e.g. cross-border wires above $50k.' },
      ]}
      run={(v) => aiTransactionAnomaly(v)}
    />
  );
}

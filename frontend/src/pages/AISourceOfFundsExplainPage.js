import React from 'react';
import AIPage from '../components/AIPage';
import { aiSourceOfFundsExplain } from '../services/api';

export default function AISourceOfFundsExplainPage() {
  return (
    <AIPage
      title="AI · Source of Funds Explain"
      feature="source-of-funds-explain"
      subtitle="Reconcile claimed SoF with observed transactional activity."
      inputs={[
        { key: 'customer_id',       label: 'Customer ID',         placeholder: 'C-4426' },
        { key: 'claimed_source',    label: 'Claimed Source',      placeholder: 'e.g. Family wealth' },
        { key: 'claimed_amount_usd',label: 'Claimed Amount (USD)',type: 'number' },
        { key: 'notes',             label: 'Notes',               type: 'textarea' },
      ]}
      run={(v) => aiSourceOfFundsExplain(v)}
    />
  );
}

import React from 'react';
import AIPage from '../components/AIPage';
import { aiBeneficialOwnerTrace } from '../services/api';

export default function AIBeneficialOwnerTracePage() {
  return (
    <AIPage
      title="AI · Beneficial Owner Trace"
      feature="beneficial-owner-trace"
      subtitle="Trace UBO chain, opacity, and OFAC 50% rule implication."
      inputs={[
        { key: 'entity_id', label: 'Entity ID (customer_id)', placeholder: 'C-4423' },
        { key: 'context',   label: 'Context',                 type: 'textarea', placeholder: 'Optional context (e.g. BVI shell, nominees).' },
      ]}
      run={(v) => aiBeneficialOwnerTrace(v)}
    />
  );
}

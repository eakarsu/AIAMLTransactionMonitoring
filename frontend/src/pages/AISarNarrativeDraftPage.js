import React from 'react';
import AIPage from '../components/AIPage';
import { aiSarNarrativeDraft } from '../services/api';

export default function AISarNarrativeDraftPage() {
  return (
    <AIPage
      title="AI · SAR Narrative Draft"
      feature="sar-narrative-draft"
      subtitle="Generate a FinCEN SAR narrative from customer + suspicion + evidence."
      inputs={[
        { key: 'customer_id',     label: 'Customer ID',     placeholder: 'C-4421' },
        { key: 'suspicion',       label: 'Suspicion',       type: 'textarea', placeholder: 'e.g. Structured cash deposits below CTR threshold over 7 days.' },
        { key: 'evidence_notes',  label: 'Evidence Notes',  type: 'textarea', placeholder: 'Supporting evidence summary.' },
      ]}
      run={(v) => aiSarNarrativeDraft(v)}
    />
  );
}

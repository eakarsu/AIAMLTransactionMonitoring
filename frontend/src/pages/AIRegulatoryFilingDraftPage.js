import React from 'react';
import AIPage from '../components/AIPage';
import { aiRegulatoryFilingDraft } from '../services/api';

export default function AIRegulatoryFilingDraftPage() {
  return (
    <AIPage
      title="AI · Regulatory Filing Draft"
      feature="regulatory-filing-draft"
      subtitle="Draft the body of a regulatory filing (SAR/CTR/FBAR/8300/OFAC)."
      inputs={[
        { key: 'filing_type', label: 'Filing Type', type: 'select', options: ['SAR','CTR','FBAR','8300','OFAC','OFAC-Blocked','BSA-CIP','FinCEN-314a'] },
        { key: 'period',      label: 'Period',      placeholder: 'e.g. 2026-05 or 2026-W20' },
        { key: 'data_notes',  label: 'Data Notes',  type: 'textarea', placeholder: 'Items to include in the body.' },
      ]}
      run={(v) => aiRegulatoryFilingDraft(v)}
    />
  );
}

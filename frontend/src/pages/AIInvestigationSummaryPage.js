import React from 'react';
import AIPage from '../components/AIPage';
import { aiInvestigationSummary } from '../services/api';

export default function AIInvestigationSummaryPage() {
  return (
    <AIPage
      title="AI · Investigation Summary"
      feature="investigation-summary"
      subtitle="Summarize an open AML investigation with timeline and disposition recommendation."
      inputs={[
        { key: 'inv_id',  label: 'Investigation ID', placeholder: 'INV-2026-001' },
        { key: 'context', label: 'Context',          type: 'textarea', placeholder: 'Optional context.' },
      ]}
      run={(v) => aiInvestigationSummary(v)}
    />
  );
}

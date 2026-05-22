import React from 'react';
import AIPage from '../components/AIPage';
import { aiAdverseMediaScreen } from '../services/api';

export default function AIAdverseMediaScreenPage() {
  return (
    <AIPage
      title="AI · Adverse Media Screen"
      feature="adverse-media-screen"
      subtitle="LLM-only screening for adverse / negative news. Commercial feed (Refinitiv / Dow Jones / LexisNexis) not configured — results marked data_source=llm_only."
      inputs={[
        { key: 'name',        label: 'Subject Name', placeholder: 'Vladimir Petrov' },
        { key: 'country',     label: 'Country',      placeholder: 'RU' },
        { key: 'customer_id', label: 'Customer ID (optional)', placeholder: 'C-4426' },
        { key: 'context',     label: 'Context',      type: 'textarea', placeholder: 'PEP onboarding, alleged kickback news in EU press.' },
      ]}
      run={(v) => aiAdverseMediaScreen(v)}
    />
  );
}

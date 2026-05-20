import React from 'react';
import AIPage from '../components/AIPage';
import { aiExecutiveBrief } from '../services/api';

export default function AIExecutiveBriefPage() {
  return (
    <AIPage
      title="AI · Executive Brief"
      feature="executive-brief"
      subtitle="BSA-Officer level compliance snapshot with decisions required."
      inputs={[
        { key: 'notes', label: 'Bias / Notes', type: 'textarea', placeholder: 'Optional bias for the brief.' },
      ]}
      run={(v) => aiExecutiveBrief(v)}
    />
  );
}

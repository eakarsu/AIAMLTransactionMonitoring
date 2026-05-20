import React from 'react';
import AIPage from '../components/AIPage';
import { aiJurisdictionalRisk } from '../services/api';

export default function AIJurisdictionalRiskPage() {
  return (
    <AIPage
      title="AI · Jurisdictional Risk"
      feature="jurisdictional-risk"
      subtitle="Assess country / jurisdiction risk for AML and sanctions."
      inputs={[
        { key: 'country', label: 'Country', placeholder: 'e.g. Russia, British Virgin Islands' },
        { key: 'context', label: 'Context', type: 'textarea', placeholder: 'Optional risk signals.' },
      ]}
      run={(v) => aiJurisdictionalRisk(v)}
    />
  );
}

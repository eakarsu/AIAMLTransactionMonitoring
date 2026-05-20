import React from 'react';
import AIPage from '../components/AIPage';
import { aiNetworkAnalysis } from '../services/api';

export default function AINetworkAnalysisPage() {
  return (
    <AIPage
      title="AI · Network Analysis"
      feature="network-analysis"
      subtitle="Build counterparty / ownership network around the seed customer."
      inputs={[
        { key: 'seed_id', label: 'Seed Customer ID', placeholder: 'C-4421' },
        { key: 'depth',   label: 'Depth',            type: 'number', placeholder: '2' },
      ]}
      run={(v) => aiNetworkAnalysis(v)}
    />
  );
}

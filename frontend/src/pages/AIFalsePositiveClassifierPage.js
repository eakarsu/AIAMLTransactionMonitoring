import React from 'react';
import AIPage from '../components/AIPage';
import { aiFalsePositiveClassifier } from '../services/api';

export default function AIFalsePositiveClassifierPage() {
  return (
    <AIPage
      title="AI · False Positive Classifier"
      feature="false-positive-classifier"
      subtitle="Triage open alerts and classify likely false positives to save analyst hours."
      inputs={[
        { key: 'hints', label: 'Hints / Filter', type: 'textarea', placeholder: 'Optional filter, e.g. high severity only.' },
      ]}
      run={(v) => aiFalsePositiveClassifier(v)}
    />
  );
}

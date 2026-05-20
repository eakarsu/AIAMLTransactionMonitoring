import React from 'react';
import AIPage from '../components/AIPage';
import { aiTypologyDetect } from '../services/api';

export default function AITypologyDetectPage() {
  return (
    <AIPage
      title="AI · Typology Detect"
      feature="typology-detect"
      subtitle="Detect AML typologies (structuring, layering, mixer, trade-based ML) in the transaction window."
      inputs={[
        { key: 'focus', label: 'Focus / Hint', type: 'textarea', placeholder: 'Optional bias, e.g. weight toward crypto mixer exposure.' },
      ]}
      run={(v) => aiTypologyDetect(v)}
    />
  );
}

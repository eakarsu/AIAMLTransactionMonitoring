import React from 'react';
import AIPage from '../components/AIPage';
import { aiEddQuestionnaire } from '../services/api';

export default function AIEddQuestionnairePage() {
  return (
    <AIPage
      title="AI · EDD Questionnaire"
      feature="edd-questionnaire"
      subtitle="Generate an Enhanced Due Diligence questionnaire tailored to the trigger."
      inputs={[
        { key: 'customer_id', label: 'Customer ID',  placeholder: 'C-4426' },
        { key: 'trigger',     label: 'EDD Trigger',  type: 'textarea', placeholder: 'e.g. PEP designation, OFAC SDN match, crypto mixer exposure.' },
      ]}
      run={(v) => aiEddQuestionnaire(v)}
    />
  );
}

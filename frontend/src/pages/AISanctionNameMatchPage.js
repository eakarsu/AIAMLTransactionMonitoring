import React from 'react';
import AIPage from '../components/AIPage';
import { aiSanctionNameMatch } from '../services/api';

export default function AISanctionNameMatchPage() {
  return (
    <AIPage
      title="AI · Sanctions Name Match"
      feature="sanction-name-match"
      subtitle="Score and triage a sanctions name screening hit against active watchlists."
      inputs={[
        { key: 'name',    label: 'Name',    placeholder: 'e.g. Vladimir Petrov' },
        { key: 'country', label: 'Country', placeholder: 'RU' },
        { key: 'dob',     label: 'DOB',     placeholder: 'YYYY-MM-DD' },
        { key: 'context', label: 'Context', type: 'textarea', placeholder: 'PEP, onboarding amount, related accounts, etc.' },
      ]}
      run={(v) => aiSanctionNameMatch(v)}
    />
  );
}

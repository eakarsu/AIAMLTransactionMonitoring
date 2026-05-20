import React from 'react';
import CrudPage from '../components/CrudPage';
import { jurisdictionsApi } from '../services/api';

export default function JurisdictionsPage() {
  return (
    <CrudPage
      title="Jurisdictions"
      subtitle="FATF rating and sanctions status per country."
      api={jurisdictionsApi}
      fields={[
        { key: 'jur_id',           label: 'Jurisdiction ID' },
        { key: 'country',          label: 'Country' },
        { key: 'fatf_rating',      label: 'FATF Rating',      type: 'select', options: ['compliant','enhanced','high-risk'] },
        { key: 'risk_score',       label: 'Risk Score',       type: 'number' },
        { key: 'sanctions_status', label: 'Sanctions Status', type: 'select', options: ['baseline','monitored','targeted','comprehensive'] },
        { key: 'last_review',      label: 'Last Review',      type: 'date' },
        { key: 'notes',            label: 'Notes',            type: 'textarea' },
      ]}
    />
  );
}

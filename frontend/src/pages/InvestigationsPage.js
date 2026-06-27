import React from 'react';
import CrudPage from '../components/CrudPage';
import { investigationsApi } from '../services/api';

export default function InvestigationsPage() {
  return (
    <CrudPage
      title="Investigations"
      subtitle="Open investigation leads tied to cases."
      api={investigationsApi}
      statusKey="status"
      fields={[
        { key: 'inv_id',    label: 'Investigation ID' },
        { key: 'case_id',   label: 'Case ID', ref: 'sarCases' },
        { key: 'lead',      label: 'Lead' },
        { key: 'status',    label: 'Status',    type: 'select', options: ['open','pending','closed'] },
        { key: 'opened_at', label: 'Opened',    type: 'datetime-local' },
        { key: 'owner',     label: 'Owner' },
        { key: 'notes',     label: 'Notes',     type: 'textarea' },
      ]}
    />
  );
}

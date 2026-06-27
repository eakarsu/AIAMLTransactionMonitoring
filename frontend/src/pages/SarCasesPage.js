import React from 'react';
import CrudPage from '../components/CrudPage';
import { sarCasesApi } from '../services/api';

export default function SarCasesPage() {
  return (
    <CrudPage
      title="SAR Cases"
      subtitle="Suspicious Activity Reports — draft, review, filed."
      api={sarCasesApi}
      statusKey="status"
      fields={[
        { key: 'case_id',     label: 'Case ID' },
        { key: 'customer_id', label: 'Customer ID', ref: 'customers' },
        { key: 'suspicion',   label: 'Suspicion',  type: 'textarea' },
        { key: 'status',      label: 'Status',     type: 'select', options: ['draft','review','filed','closed'] },
        { key: 'opened_at',   label: 'Opened',     type: 'datetime-local' },
        { key: 'owner',       label: 'Owner' },
        { key: 'notes',       label: 'Notes',      type: 'textarea' },
      ]}
    />
  );
}

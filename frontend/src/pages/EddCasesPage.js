import React from 'react';
import CrudPage from '../components/CrudPage';
import { eddCasesApi } from '../services/api';

export default function EddCasesPage() {
  return (
    <CrudPage
      title="EDD Cases"
      subtitle="Enhanced Due Diligence workflow."
      api={eddCasesApi}
      statusKey="status"
      fields={[
        { key: 'edd_id',      label: 'EDD ID' },
        { key: 'customer_id', label: 'Customer ID', ref: 'customers' },
        { key: 'trigger',     label: 'Trigger' },
        { key: 'status',      label: 'Status',     type: 'select', options: ['open','review','closed'] },
        { key: 'opened_at',   label: 'Opened',     type: 'datetime-local' },
        { key: 'owner',       label: 'Owner' },
        { key: 'notes',       label: 'Notes',      type: 'textarea' },
      ]}
    />
  );
}

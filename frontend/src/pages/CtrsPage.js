import React from 'react';
import CrudPage from '../components/CrudPage';
import { ctrsApi } from '../services/api';

export default function CtrsPage() {
  return (
    <CrudPage
      title="CTRs"
      subtitle="Currency Transaction Reports — pending and filed."
      api={ctrsApi}
      statusKey="status"
      fields={[
        { key: 'ctr_id',          label: 'CTR ID' },
        { key: 'customer_id',     label: 'Customer ID' },
        { key: 'aggregate_amount',label: 'Aggregate Amount', type: 'number' },
        { key: 'period',          label: 'Period' },
        { key: 'filed_at',        label: 'Filed At',         type: 'datetime-local' },
        { key: 'status',          label: 'Status',           type: 'select', options: ['pending','review','filed','rejected'] },
        { key: 'notes',           label: 'Notes',            type: 'textarea' },
      ]}
    />
  );
}

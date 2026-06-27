import React from 'react';
import CrudPage from '../components/CrudPage';
import { sourceOfFundsApi } from '../services/api';

export default function SourceOfFundsPage() {
  return (
    <CrudPage
      title="Source of Funds"
      subtitle="Claimed funds origin and evidence status."
      api={sourceOfFundsApi}
      statusKey="status"
      fields={[
        { key: 'sof_id',      label: 'SoF ID' },
        { key: 'customer_id', label: 'Customer ID', ref: 'customers' },
        { key: 'source_type', label: 'Source Type' },
        { key: 'amount',      label: 'Amount',      type: 'number' },
        { key: 'evidence',    label: 'Evidence' },
        { key: 'status',      label: 'Status',      type: 'select', options: ['pending','verified','review','rejected'] },
        { key: 'notes',       label: 'Notes',       type: 'textarea' },
      ]}
    />
  );
}

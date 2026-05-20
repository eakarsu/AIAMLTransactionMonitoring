import React from 'react';
import CrudPage from '../components/CrudPage';
import { customersApi } from '../services/api';

export default function CustomersPage() {
  return (
    <CrudPage
      title="Customers"
      subtitle="Customer master with risk tier and lifecycle status."
      api={customersApi}
      statusKey="status"
      fields={[
        { key: 'customer_id', label: 'Customer ID' },
        { key: 'name',        label: 'Name' },
        { key: 'type',        label: 'Type',       type: 'select', options: ['individual','corporate','pep','trust','correspondent'] },
        { key: 'country',     label: 'Country' },
        { key: 'risk_tier',   label: 'Risk Tier',  type: 'select', options: ['low','medium','high','critical'] },
        { key: 'status',      label: 'Status',     type: 'select', options: ['active','review','restricted','frozen','closed'] },
        { key: 'notes',       label: 'Notes',      type: 'textarea' },
      ]}
    />
  );
}

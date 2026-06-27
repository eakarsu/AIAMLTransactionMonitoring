import React from 'react';
import CrudPage from '../components/CrudPage';
import { accountsApi } from '../services/api';

export default function AccountsPage() {
  return (
    <CrudPage
      title="Accounts"
      subtitle="Account ledger by customer with balance and currency."
      api={accountsApi}
      statusKey="status"
      fields={[
        { key: 'account_id',  label: 'Account ID' },
        { key: 'customer_id', label: 'Customer ID', ref: 'customers' },
        { key: 'type',        label: 'Type',     type: 'select', options: ['checking','savings','corporate','trade','private','remittance','crypto-fiat'] },
        { key: 'balance',     label: 'Balance',  type: 'number' },
        { key: 'currency',    label: 'Currency' },
        { key: 'status',      label: 'Status',   type: 'select', options: ['open','review','frozen','restricted','closed'] },
        { key: 'notes',       label: 'Notes',    type: 'textarea' },
      ]}
    />
  );
}

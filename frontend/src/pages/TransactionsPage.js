import React from 'react';
import CrudPage from '../components/CrudPage';
import { transactionsApi } from '../services/api';

export default function TransactionsPage() {
  return (
    <CrudPage
      title="Transactions"
      subtitle="Inbound and outbound transactions with counterparty."
      api={transactionsApi}
      fields={[
        { key: 'txn_id',       label: 'Transaction ID' },
        { key: 'account_id',   label: 'Account ID', ref: 'accounts' },
        { key: 'amount',       label: 'Amount',     type: 'number' },
        { key: 'currency',     label: 'Currency' },
        { key: 'counterparty', label: 'Counterparty' },
        { key: 'ts',           label: 'Timestamp',  type: 'datetime-local' },
        { key: 'notes',        label: 'Notes',      type: 'textarea' },
      ]}
    />
  );
}

import React from 'react';
import CrudPage from '../components/CrudPage';
import { kycProfilesApi } from '../services/api';

export default function KycProfilesPage() {
  return (
    <CrudPage
      title="KYC Profiles"
      subtitle="Customer documents, expiry and refresh due."
      api={kycProfilesApi}
      statusKey="status"
      fields={[
        { key: 'profile_id',  label: 'Profile ID' },
        { key: 'customer_id', label: 'Customer ID', ref: 'customers' },
        { key: 'doc_type',    label: 'Doc Type' },
        { key: 'expires_at',  label: 'Expires',   type: 'date' },
        { key: 'status',      label: 'Status',    type: 'select', options: ['verified','expiring','expired','enhanced','pending'] },
        { key: 'refresh_due', label: 'Refresh Due', type: 'date' },
        { key: 'notes',       label: 'Notes',     type: 'textarea' },
      ]}
    />
  );
}

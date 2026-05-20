import React from 'react';
import CrudPage from '../components/CrudPage';
import { beneficialOwnersApi } from '../services/api';

export default function BeneficialOwnersPage() {
  return (
    <CrudPage
      title="Beneficial Owners"
      subtitle="UBO chains, percentages and verification."
      api={beneficialOwnersApi}
      fields={[
        { key: 'owner_id',      label: 'Owner ID' },
        { key: 'entity_id',     label: 'Entity ID (customer_id)' },
        { key: 'name',          label: 'Name' },
        { key: 'country',       label: 'Country' },
        { key: 'pct_ownership', label: '% Ownership', type: 'number' },
        { key: 'verified',      label: 'Verified',    type: 'select', options: ['true','false'] },
        { key: 'notes',         label: 'Notes',       type: 'textarea' },
      ]}
    />
  );
}

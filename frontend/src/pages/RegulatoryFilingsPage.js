import React from 'react';
import CrudPage from '../components/CrudPage';
import { regulatoryFilingsApi } from '../services/api';

export default function RegulatoryFilingsPage() {
  return (
    <CrudPage
      title="Regulatory Filings"
      subtitle="SAR/CTR/FBAR/8300/OFAC filings."
      api={regulatoryFilingsApi}
      statusKey="status"
      fields={[
        { key: 'filing_id', label: 'Filing ID' },
        { key: 'type',      label: 'Type',     type: 'select', options: ['SAR','CTR','FBAR','8300','OFAC','OFAC-Blocked','BSA-CIP','FinCEN-314a'] },
        { key: 'period',    label: 'Period' },
        { key: 'status',    label: 'Status',   type: 'select', options: ['draft','review','filed','rejected'] },
        { key: 'filed_at',  label: 'Filed At', type: 'datetime-local' },
        { key: 'filer',     label: 'Filer' },
        { key: 'notes',     label: 'Notes',    type: 'textarea' },
      ]}
    />
  );
}

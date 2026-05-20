import React from 'react';
import CrudPage from '../components/CrudPage';
import { pepsApi } from '../services/api';

export default function PepsPage() {
  return (
    <CrudPage
      title="PEPs"
      subtitle="Politically-Exposed Persons inventory."
      api={pepsApi}
      statusKey="status"
      fields={[
        { key: 'pep_id',  label: 'PEP ID' },
        { key: 'name',    label: 'Name' },
        { key: 'country', label: 'Country' },
        { key: 'role',    label: 'Role' },
        { key: 'since',   label: 'Since',  type: 'date' },
        { key: 'status',  label: 'Status', type: 'select', options: ['active','former','restricted','archived'] },
        { key: 'notes',   label: 'Notes',  type: 'textarea' },
      ]}
    />
  );
}

import React from 'react';
import CrudPage from '../components/CrudPage';
import { typologiesApi } from '../services/api';

export default function TypologiesPage() {
  return (
    <CrudPage
      title="Typologies"
      subtitle="AML typologies catalog with severity and controls."
      api={typologiesApi}
      statusKey="status"
      fields={[
        { key: 'typology_id', label: 'Typology ID' },
        { key: 'name',        label: 'Name' },
        { key: 'description', label: 'Description', type: 'textarea' },
        { key: 'severity',    label: 'Severity',    type: 'select', options: ['low','medium','high','critical'] },
        { key: 'controls',    label: 'Controls',    type: 'textarea' },
        { key: 'status',      label: 'Status',      type: 'select', options: ['active','inactive','archived'] },
        { key: 'notes',       label: 'Notes',       type: 'textarea' },
      ]}
    />
  );
}

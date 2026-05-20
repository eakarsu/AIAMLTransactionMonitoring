import React from 'react';
import CrudPage from '../components/CrudPage';
import { sanctionsHitsApi } from '../services/api';

export default function SanctionsHitsPage() {
  return (
    <CrudPage
      title="Sanctions Hits"
      subtitle="Name screening matches and triage status."
      api={sanctionsHitsApi}
      statusKey="status"
      fields={[
        { key: 'hit_id',        label: 'Hit ID' },
        { key: 'customer_id',   label: 'Customer ID' },
        { key: 'list',          label: 'Watchlist' },
        { key: 'score',         label: 'Score',         type: 'number' },
        { key: 'matched_field', label: 'Matched Field' },
        { key: 'status',        label: 'Status',        type: 'select', options: ['open','review','confirmed','false_positive','closed'] },
        { key: 'notes',         label: 'Notes',         type: 'textarea' },
      ]}
    />
  );
}

import React from 'react';
import CrudPage from '../components/CrudPage';
import { watchlistsApi } from '../services/api';

export default function WatchlistsPage() {
  return (
    <CrudPage
      title="Watchlists"
      subtitle="OFAC, EU, UN, HMT and internal watchlists."
      api={watchlistsApi}
      statusKey="status"
      fields={[
        { key: 'list_id',      label: 'List ID' },
        { key: 'name',         label: 'Name' },
        { key: 'jurisdiction', label: 'Jurisdiction' },
        { key: 'last_updated', label: 'Last Updated', type: 'date' },
        { key: 'version',      label: 'Version' },
        { key: 'status',       label: 'Status',       type: 'select', options: ['active','inactive','archived'] },
        { key: 'notes',        label: 'Notes',        type: 'textarea' },
      ]}
    />
  );
}

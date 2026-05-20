import React from 'react';
import CrudPage from '../components/CrudPage';
import { alertsApi } from '../services/api';

export default function AlertsPage() {
  return (
    <CrudPage
      title="Alerts"
      subtitle="Open and investigating alerts from monitoring rules."
      api={alertsApi}
      statusKey="status"
      fields={[
        { key: 'alert_id',    label: 'Alert ID' },
        { key: 'customer_id', label: 'Customer ID' },
        { key: 'rule',        label: 'Rule' },
        { key: 'severity',    label: 'Severity',  type: 'select', options: ['low','medium','high','critical'] },
        { key: 'opened_at',   label: 'Opened',    type: 'datetime-local' },
        { key: 'status',      label: 'Status',    type: 'select', options: ['open','investigating','closed'] },
        { key: 'notes',       label: 'Notes',     type: 'textarea' },
      ]}
    />
  );
}

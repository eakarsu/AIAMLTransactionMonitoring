import React from 'react';
import AIPage from '../components/AIPage';
import { aiPeerGroupCompare } from '../services/api';

export default function AIPeerGroupComparePage() {
  return (
    <AIPage
      title="AI · Peer Group Compare"
      feature="peer-group-compare"
      subtitle="Compare customer behavior to peer-group medians and percentiles."
      inputs={[
        { key: 'customer_id', label: 'Customer ID', placeholder: 'C-4421' },
        { key: 'peer_group',  label: 'Peer Group',  placeholder: 'e.g. US corporate, trading sector' },
      ]}
      run={(v) => aiPeerGroupCompare(v)}
    />
  );
}

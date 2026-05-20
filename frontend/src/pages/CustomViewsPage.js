import React from 'react';
import TxNetworkGraph    from '../components/TxNetworkGraph';
import SanctionsTimeline from '../components/SanctionsTimeline';
import RiskHeatmap       from '../components/RiskHeatmap';
import SARFunnel         from '../components/SARFunnel';
import OFACScoringWidget from '../components/OFACScoringWidget';

function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <h2 style={{ margin: 0, color: '#e2e8f0', fontSize: 18 }}>{title}</h2>
      {subtitle && (
        <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>{subtitle}</div>
      )}
    </div>
  );
}

export default function CustomViewsPage() {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, color: '#e2e8f0' }}>Compliance Views</h1>
        <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>
          Specialised analyst visualisations across customers, sanctions, risk concentration, and SAR pipeline.
        </div>
      </div>

      <section style={{ marginBottom: 28 }}>
        <SectionHeader
          title="OFAC Sanctions Screening"
          subtitle="Real-time fuzzy-match scoring against the OFAC SDN list. Type a name or use a quick-fill demo target."
        />
        <OFACScoringWidget />
      </section>

      <section style={{ marginBottom: 28 }}>
        <SectionHeader
          title="Transaction Network Graph"
          subtitle="Top 30 customers by total transaction volume; edges are amount-weighted transactions between counterparties."
        />
        <TxNetworkGraph />
      </section>

      <section style={{ marginBottom: 28 }}>
        <SectionHeader
          title="Sanctions Hits Timeline"
          subtitle="Each dot is a sanctions match. X = date, Y = match score, colour = severity bucket."
        />
        <SanctionsTimeline />
      </section>

      <section style={{ marginBottom: 28 }}>
        <SectionHeader
          title="Customer Risk Heatmap"
          subtitle="Treemap of customers grouped by risk tier → country, area sized by total account balance."
        />
        <RiskHeatmap />
      </section>

      <section style={{ marginBottom: 28 }}>
        <SectionHeader
          title="SAR Case Funnel"
          subtitle="SAR pipeline conversion: draft → in_review → filed → closed."
        />
        <SARFunnel />
      </section>
    </div>
  );
}

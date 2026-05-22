import React from 'react';
import AIPage from '../components/AIPage';
import { aiKycOnboardingPrescreen } from '../services/api';

export default function AIKycOnboardingPrescreenPage() {
  return (
    <AIPage
      title="AI · KYC Onboarding Pre-Screen"
      feature="kyc-onboarding-prescreen"
      subtitle="At-intake risk pre-screen for a new customer applicant. Distinct from the periodic KYC refresh queue summary."
      inputs={[
        { key: 'customer_id',    label: 'Customer ID (optional)', placeholder: 'C-4421' },
        { key: 'applicant_name', label: 'Applicant Name',         placeholder: 'Apex Trading LLC' },
        { key: 'country',        label: 'Country',                placeholder: 'US' },
        { key: 'type',           label: 'Applicant Type',         placeholder: 'corporate | individual | trust' },
        { key: 'notes',          label: 'Onboarding Notes',       type: 'textarea', placeholder: 'Projected throughput, source of funds claim, related parties...' },
      ]}
      run={(v) => aiKycOnboardingPrescreen(v)}
    />
  );
}

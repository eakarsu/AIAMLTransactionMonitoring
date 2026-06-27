import React, { useEffect, useState } from 'react';
import {
  accountsApi,
  alertsApi,
  ctrsApi,
  customersApi,
  eddCasesApi,
  investigationsApi,
  regulatoryFilingsApi,
  sanctionsHitsApi,
  sarCasesApi,
  transactionsApi,
  watchlistsApi,
  jurisdictionsApi,
} from '../services/api';

const SOURCES = {
  customers: {
    list: customersApi.list,
    value: (r) => r.customer_id,
    label: (r) => `${r.customer_id} · ${r.name} · ${r.risk_tier || 'risk unknown'}`,
  },
  accounts: {
    list: accountsApi.list,
    value: (r) => r.account_id,
    label: (r) => `${r.account_id} · ${r.customer_id || 'No customer'} · ${r.currency || 'USD'} ${r.balance ?? 0}`,
  },
  transactions: {
    list: transactionsApi.list,
    value: (r) => r.txn_id,
    label: (r) => `${r.txn_id} · ${r.account_id || 'No account'} · ${r.currency || 'USD'} ${r.amount ?? 0}`,
  },
  sanctionsHits: {
    list: sanctionsHitsApi.list,
    value: (r) => r.hit_id,
    label: (r) => `${r.hit_id} · ${r.customer_id || 'No customer'} · ${r.list || 'Watchlist'} · score ${r.score ?? '—'}`,
  },
  sarCases: {
    list: sarCasesApi.list,
    value: (r) => r.case_id,
    label: (r) => `${r.case_id} · ${r.customer_id || 'No customer'} · ${r.status || 'unknown'}`,
  },
  ctrs: {
    list: ctrsApi.list,
    value: (r) => r.ctr_id,
    label: (r) => `${r.ctr_id} · ${r.customer_id || 'No customer'} · $${r.aggregate_amount ?? 0}`,
  },
  investigations: {
    list: investigationsApi.list,
    value: (r) => r.inv_id,
    label: (r) => `${r.inv_id} · ${r.case_id || 'No case'} · ${r.status || 'unknown'}`,
  },
  eddCases: {
    list: eddCasesApi.list,
    value: (r) => r.edd_id,
    label: (r) => `${r.edd_id} · ${r.customer_id || 'No customer'} · ${r.status || 'unknown'}`,
  },
  alerts: {
    list: alertsApi.list,
    value: (r) => r.alert_id,
    label: (r) => `${r.alert_id} · ${r.customer_id || 'No customer'} · ${r.severity || 'severity unknown'}`,
  },
  watchlists: {
    list: watchlistsApi.list,
    value: (r) => r.name,
    label: (r) => `${r.name} · ${r.jurisdiction || 'Any jurisdiction'} · ${r.status || 'unknown'}`,
  },
  regulatoryFilings: {
    list: regulatoryFilingsApi.list,
    value: (r) => r.filing_id,
    label: (r) => `${r.filing_id} · ${r.type || 'Type unknown'} · ${r.status || 'unknown'}`,
  },
  jurisdictions: {
    list: jurisdictionsApi.list,
    value: (r) => r.country,
    label: (r) => `${r.country} · ${r.fatf_rating || 'FATF unknown'} · ${r.sanctions_status || 'sanctions unknown'}`,
  },
  customerTypes: {
    list: async () => {
      const rows = await customersApi.list();
      return Array.from(new Set(rows.map((r) => r.type).filter(Boolean))).map((type) => ({ type }));
    },
    value: (r) => r.type,
    label: (r) => r.type,
  },
  customerCountries: {
    list: async () => {
      const rows = await customersApi.list();
      return Array.from(new Set(rows.map((r) => r.country).filter(Boolean))).map((country) => ({ country }));
    },
    value: (r) => r.country,
    label: (r) => r.country,
  },
  riskTiers: {
    list: async () => {
      const rows = await customersApi.list();
      return Array.from(new Set(rows.map((r) => r.risk_tier).filter(Boolean))).map((risk_tier) => ({ risk_tier }));
    },
    value: (r) => r.risk_tier,
    label: (r) => r.risk_tier,
  },
};

export function sourceForCaseType(caseType) {
  return {
    sar_case: 'sarCases',
    investigation: 'investigations',
    edd_case: 'eddCases',
    alert: 'alerts',
  }[caseType] || 'sarCases';
}

export function inferReferenceSource(field = {}) {
  if (field.ref) return field.ref;
  const key = field.key;
  if (key === 'customer_id' || key === 'entity_id') return 'customers';
  if (key === 'account_id') return 'accounts';
  if (key === 'txn_id') return 'transactions';
  if (key === 'hit_id') return 'sanctionsHits';
  if (key === 'inv_id') return 'investigations';
  if (key === 'case_ref') return 'sarCases';
  return null;
}

export default function ReferenceSelect({
  source,
  value,
  onChange,
  allowEmpty = true,
  emptyLabel = 'Select',
  disabled = false,
}) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const config = SOURCES[source];

  useEffect(() => {
    let alive = true;
    const activeConfig = SOURCES[source];
    if (!activeConfig) {
      setOptions([]);
      return undefined;
    }

    setLoading(true);
    setError(null);
    activeConfig.list()
      .then((rows) => {
        if (!alive) return;
        setOptions(Array.isArray(rows) ? rows : []);
      })
      .catch((e) => {
        if (!alive) return;
        setError(e.message);
        setOptions([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => { alive = false; };
  }, [source]);

  if (!config) {
    return (
      <input
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    );
  }

  return (
    <div>
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} disabled={disabled || loading}>
        {allowEmpty && <option value="">{loading ? 'Loading...' : emptyLabel}</option>}
        {options.map((row) => {
          const optionValue = config.value(row);
          return <option key={optionValue} value={optionValue}>{config.label(row)}</option>;
        })}
      </select>
      {error && <div style={{ color: '#fca5a5', fontSize: 12, marginTop: 4 }}>Failed to load options: {error}</div>}
    </div>
  );
}

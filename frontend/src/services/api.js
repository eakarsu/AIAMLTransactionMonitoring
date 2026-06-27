const API_BASE =
  (typeof window !== 'undefined' && window.__API_BASE__) ||
  'http://localhost:3069/api';

export { API_BASE };

const TOKEN_KEY = 'aml_token';
const USER_KEY  = 'aml_user';

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch (_) { return null; }
}
export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch (_) {}
}
export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) { return null; }
}
export function setStoredUser(user) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch (_) {}
}
export function logout() {
  setToken(null);
  setStoredUser(null);
  if (typeof window !== 'undefined') {
    window.location.assign('/login');
  }
}

// Role helpers
export function getRole() {
  return (getStoredUser()?.role || 'viewer').toLowerCase();
}
export function canWrite() {
  return ['commander', 'analyst'].includes(getRole());
}
export function isCommander() {
  return getRole() === 'commander';
}

async function request(url, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  let res;
  try {
    res = await fetch(`${API_BASE}${url}`, { ...options, headers });
  } catch (e) {
    throw new Error(`Network error: ${e.message}`);
  }

  if (res.status === 401) {
    if (!url.startsWith('/auth/login')) {
      logout();
      throw new Error('Session expired');
    }
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// Generic CRUD factory
function crud(base) {
  return {
    list:   ()       => request(`/${base}`),
    get:    (id)     => request(`/${base}/${id}`),
    create: (data)   => request(`/${base}`, { method: 'POST', body: JSON.stringify(data) }),
    update: (id, d)  => request(`/${base}/${id}`, { method: 'PUT',  body: JSON.stringify(d) }),
    remove: (id)     => request(`/${base}/${id}`, { method: 'DELETE' }),
    bulkImport: (csv) => request(`/${base}/bulk-import`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/csv' },
      body: csv,
    }),
    listAttachments: (id) => request(`/${base}/${id}/attachments`),
    uploadAttachment: async (id, file) => {
      const token = getToken();
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API_BASE}/${base}/${id}/attachments`, {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
      return data;
    },
  };
}

// 18 AML CRUD entities
export const customersApi          = crud('customers');
export const accountsApi           = crud('accounts');
export const transactionsApi       = crud('transactions');
export const sanctionsHitsApi      = crud('sanctions-hits');
export const sarCasesApi           = crud('sar-cases');
export const ctrsApi               = crud('ctrs');
export const kycProfilesApi        = crud('kyc-profiles');
export const watchlistsApi         = crud('watchlists');
export const typologiesApi         = crud('typologies');
export const beneficialOwnersApi   = crud('beneficial-owners');
export const pepsApi               = crud('peps');
export const jurisdictionsApi      = crud('jurisdictions');
export const investigationsApi     = crud('investigations');
export const alertsApi             = crud('alerts');
export const auditLogApi           = crud('audit-log');
export const sourceOfFundsApi      = crud('source-of-funds');
export const eddCasesApi           = crud('edd-cases');
export const regulatoryFilingsApi  = crud('regulatory-filings');

// Dashboard
export const getDashboardStats = () => request('/dashboard');

// Auth
export const login = (email, password) =>
  request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
export const getMe = () => request('/auth/me');

// AI endpoints — 16 AML verbs
export const aiSarNarrativeDraft     = (body) => request('/ai/sar-narrative-draft',     { method: 'POST', body: JSON.stringify(body || {}) });
export const aiTypologyDetect        = (body) => request('/ai/typology-detect',         { method: 'POST', body: JSON.stringify(body || {}) });
export const aiKycRefreshSummary     = (body) => request('/ai/kyc-refresh-summary',     { method: 'POST', body: JSON.stringify(body || {}) });
export const aiSanctionNameMatch     = (body) => request('/ai/sanction-name-match',     { method: 'POST', body: JSON.stringify(body || {}) });
export const aiBeneficialOwnerTrace  = (body) => request('/ai/beneficial-owner-trace',  { method: 'POST', body: JSON.stringify(body || {}) });
export const aiTransactionAnomaly    = (body) => request('/ai/transaction-anomaly',     { method: 'POST', body: JSON.stringify(body || {}) });
export const aiPeerGroupCompare      = (body) => request('/ai/peer-group-compare',      { method: 'POST', body: JSON.stringify(body || {}) });
export const aiExecutiveBrief        = (body) => request('/ai/executive-brief',         { method: 'POST', body: JSON.stringify(body || {}) });
export const aiCustomerRiskScore     = (body) => request('/ai/customer-risk-score',     { method: 'POST', body: JSON.stringify(body || {}) });
export const aiEddQuestionnaire      = (body) => request('/ai/edd-questionnaire',       { method: 'POST', body: JSON.stringify(body || {}) });
export const aiInvestigationSummary  = (body) => request('/ai/investigation-summary',   { method: 'POST', body: JSON.stringify(body || {}) });
export const aiRegulatoryFilingDraft = (body) => request('/ai/regulatory-filing-draft', { method: 'POST', body: JSON.stringify(body || {}) });
export const aiSourceOfFundsExplain  = (body) => request('/ai/source-of-funds-explain', { method: 'POST', body: JSON.stringify(body || {}) });
export const aiJurisdictionalRisk    = (body) => request('/ai/jurisdictional-risk',     { method: 'POST', body: JSON.stringify(body || {}) });
export const aiFalsePositiveClassifier = (body) => request('/ai/false-positive-classifier', { method: 'POST', body: JSON.stringify(body || {}) });
export const aiNetworkAnalysis       = (body) => request('/ai/network-analysis',        { method: 'POST', body: JSON.stringify(body || {}) });

// AI history
export const getAIHistory = (feature, limit = 25) => {
  const qs = new URLSearchParams({
    ...(feature ? { feature } : {}),
    limit: String(limit),
  }).toString();
  return request(`/ai/history?${qs}`);
};

// AI sample fills
export const getAISamples = (feature) => {
  const qs = new URLSearchParams({ feature: feature || '' }).toString();
  return request(`/ai/samples?${qs}`);
};

// Notifications
export const getNotifications       = () => request('/notifications');
export const getUnreadNotifications = () => request('/notifications/unread');
export const markNotificationRead   = (id) => request(`/notifications/${id}/read`, { method: 'POST' });
export const markAllNotificationsRead = () => request('/notifications/mark-all-read', { method: 'POST' });

// Pass 7 — backlog
export const aiAdverseMediaScreen     = (body) => request('/ai/adverse-media-screen',     { method: 'POST', body: JSON.stringify(body || {}) });
export const aiKycOnboardingPrescreen = (body) => request('/ai/kyc-onboarding-prescreen', { method: 'POST', body: JSON.stringify(body || {}) });

export const getPeerBenchmarks = (params = {}) => {
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))).toString();
  return request(`/peer-benchmarks${qs ? `?${qs}` : ''}`);
};

export const ingestionApi = {
  ofacStatus:   ()       => request('/ingestion/ofac/status'),
  ofacRefresh:  ()       => request('/ingestion/ofac/sdn/refresh', { method: 'POST' }),
  adverseMediaStatus: () => request('/ingestion/adverse-media/status'),
  txStreamList: (params = {}) => {
    const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))).toString();
    return request(`/ingestion/tx-stream${qs ? `?${qs}` : ''}`);
  },
  txStreamPost: (body) => request('/ingestion/tx-stream', { method: 'POST', body: JSON.stringify(body || {}) }),
  txStreamProcess: (id) => request(`/ingestion/tx-stream/${id}/process`, { method: 'POST' }),
};

export const caseWorkflowApi = {
  transitions: () => request('/case-workflow/transitions'),
  history:     (caseType, caseRef) => request(`/case-workflow/${caseType}/${caseRef}/history`),
  transition:  (caseType, caseRef, body) => request(`/case-workflow/${caseType}/${caseRef}/transition`, {
    method: 'POST',
    body: JSON.stringify(body || {}),
  }),
};

export const escalationApi = {
  queues:        () => request('/escalation/queues'),
  createQueue:   (d) => request('/escalation/queues', { method: 'POST', body: JSON.stringify(d) }),
  updateQueue:   (id, d) => request(`/escalation/queues/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  route:         (d) => request('/escalation/route', { method: 'POST', body: JSON.stringify(d) }),
  assignments:   (params = {}) => {
    const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))).toString();
    return request(`/escalation/assignments${qs ? `?${qs}` : ''}`);
  },
};

export const fincenExportsApi = {
  mappings:     (filing_type) => {
    const qs = filing_type ? `?filing_type=${encodeURIComponent(filing_type)}` : '';
    return request(`/fincen-exports/mappings${qs}`);
  },
  caseRefs:     (filing_type) => {
    const qs = filing_type ? `?filing_type=${encodeURIComponent(filing_type)}` : '';
    return request(`/fincen-exports/case-refs${qs}`);
  },
  createMapping: (d) => request('/fincen-exports/mappings', { method: 'POST', body: JSON.stringify(d) }),
  export:       (filing_type, case_ref) => request(`/fincen-exports/${filing_type}/${encodeURIComponent(case_ref)}`),
};

export const advisoryApi = {
  list:         (params = {}) => {
    const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))).toString();
    return request(`/advisory${qs ? `?${qs}` : ''}`);
  },
  autoFile:     (d) => request('/advisory/auto-file',   { method: 'POST', body: JSON.stringify(d) }),
  autoFreeze:   (d) => request('/advisory/auto-freeze', { method: 'POST', body: JSON.stringify(d) }),
  review:       (id, d) => request(`/advisory/${id}/review`, { method: 'POST', body: JSON.stringify(d) }),
};

// Webhooks
export const webhooksApi = {
  list:    ()         => request('/webhooks'),
  create:  (d)        => request('/webhooks',          { method: 'POST', body: JSON.stringify(d) }),
  update:  (id, d)    => request(`/webhooks/${id}`,    { method: 'PUT',  body: JSON.stringify(d) }),
  remove:  (id)       => request(`/webhooks/${id}`,    { method: 'DELETE' }),
  test:    (event, payload) => request('/webhooks/test', {
    method: 'POST',
    body: JSON.stringify({ event, payload }),
  }),
  deliveries: (id)    => request(`/webhooks/${id}/deliveries`),
};

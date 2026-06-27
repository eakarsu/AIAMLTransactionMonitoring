const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const ai = require('../services/ai');

// Persist every AI result so the frontend history viewer can show it later.
async function record(feature, input, output) {
  try {
    await pool.query(
      'INSERT INTO ai_results (feature, input, output) VALUES ($1, $2, $3)',
      [feature, input || {}, output || {}]
    );
  } catch (e) {
    console.warn(`[ai] failed to record ${feature}:`, e.message);
  }
}

// ──────────────────────────────────────────────────────────────
// Sample fills — 5 realistic AML/BSA scenarios per verb.
// Returned values map 1:1 to the field `key`s used by the frontend
// AI page components.
// ──────────────────────────────────────────────────────────────
const SAMPLES = {
  'sar-narrative-draft': [
    {
      label: 'Structuring — Apex Trading (C-4421), 7 deposits below $10k',
      values: {
        customer_id: 'C-4421',
        suspicion: 'Large structured cash deposits over 7 days, customer C-4421 (Apex Trading LLC) - 7 deposits all between $9,750-$9,950 at Miami branch.',
        evidence_notes: 'TXN-90001, TXN-90002, TXN-90003 all below CTR threshold; same branch; same teller; total $29,450 in 72 hours.',
      },
    },
    {
      label: 'Tornado Cash mixer — Crypto Bridge SARL (C-4431)',
      values: {
        customer_id: 'C-4431',
        suspicion: 'Wire to Tornado Cash mixer 0xDEAD... $185,000 CHF from crypto-fiat account ACC-10012.',
        evidence_notes: 'On-chain forensics traced outbound through known sanctioned mixer contract; counterparty matches OFAC SDN smart-contract designation.',
      },
    },
    {
      label: 'PEP unusual flow — Vladimir Petrov (C-4426), Russian energy',
      values: {
        customer_id: 'C-4426',
        suspicion: 'PEP match score 87%, Russian energy minister - unusual $14.2M activity in private banking after 18-month dormancy.',
        evidence_notes: 'EU Consolidated and DPL hits; account opened during sanctions environment; SoF claims family wealth not supported by tax records.',
      },
    },
    {
      label: 'BVI shell layering — Pacific Nominees through C-4423',
      values: {
        customer_id: 'C-4423',
        suspicion: 'Beneficial owner trace BVI shell - $4.5M wire to BVI counterparty within 24h of inbound from Cyprus.',
        evidence_notes: 'BO veil includes Pacific Nominees Ltd (40%) and Maxim Sokolov (RU, 60%, unverified); no underlying commercial rationale.',
      },
    },
    {
      label: 'Trade-based ML — Sahel Mining (C-4429)',
      values: {
        customer_id: 'C-4429',
        suspicion: 'Mining export over-invoicing - $640K trade payment to DXB 4x average invoice value for declared cargo.',
        evidence_notes: 'Bill of lading inconsistent with declared volume; counterparty in jurisdiction without mining capacity; pattern repeated 5x in 60d.',
      },
    },
  ],

  'typology-detect': [
    { label: 'Default — current 30-day transaction window', values: {} },
    {
      label: 'Bias toward structuring',
      values: { focus: 'Weight detection toward structuring/smurfing across multiple branches and tellers within a 7-day window.' },
    },
    {
      label: 'Bias toward crypto exposure',
      values: { focus: 'Weight detection toward crypto mixer exposure, virtual asset service provider (VASP) hops, and chain-hopping patterns.' },
    },
    {
      label: 'Bias toward trade-based ML',
      values: { focus: 'Weight detection toward trade-based money laundering: over/under-invoicing, phantom shipments, and unusual third-party payments.' },
    },
    {
      label: 'Bias toward PEP / sanctions evasion',
      values: { focus: 'Weight detection toward PEP private banking flows and sanctions evasion via front companies in non-sanctioned jurisdictions.' },
    },
  ],

  'kyc-refresh-summary': [
    { label: 'Full queue — all KYC profiles', values: {} },
    { label: 'Expired documents focus', values: {} },
    { label: 'Enhanced due diligence focus', values: {} },
    { label: 'Refresh due this quarter', values: {} },
    { label: 'High-risk customer refresh queue', values: {} },
  ],

  'sanction-name-match': [
    {
      label: 'Vladimir Petrov — Russian Deputy Energy Minister',
      values: {
        name: 'Vladimir Petrov',
        country: 'RU',
        dob: '1965-04-12',
        context: 'PEP match score 87%, Russian energy minister, applying for $14.2M private banking onboarding.',
      },
    },
    {
      label: 'Olga Ivanova — Krasnodar Regional Governor',
      values: {
        name: 'Olga Ivanova',
        country: 'RU',
        dob: '1972-11-30',
        context: 'OFAC SDN list candidate, score 95, frozen private account ACC-10015.',
      },
    },
    {
      label: 'Sergey Volkov — restricted RU individual',
      values: {
        name: 'Sergey Volkov',
        country: 'RU',
        dob: '1980-02-18',
        context: 'OFAC SDN score 87, also OFAC SSI score 68, attempting EUR wire from frozen account.',
      },
    },
    {
      label: 'Caribbean Trust Partners — KY corporate entity',
      values: {
        name: 'Caribbean Trust Partners',
        country: 'KY',
        dob: '',
        context: 'OFAC 50% rule via opaque Trustco Nominee #4 (100% nominee owner); entity onboarding paused.',
      },
    },
    {
      label: 'Sahel Mining Corp — ML high-risk entity',
      values: {
        name: 'Sahel Mining Corp',
        country: 'ML',
        dob: '',
        context: 'UN 1267 candidate score 71 (false positive prior), but EU Consolidated re-match this cycle.',
      },
    },
  ],

  'beneficial-owner-trace': [
    {
      label: 'BVI Shell Holdings Ltd (C-4423)',
      values: {
        entity_id: 'C-4423',
        context: 'Beneficial owner trace BVI shell - opaque BO veil with Pacific Nominees Ltd and Maxim Sokolov (RU).',
      },
    },
    {
      label: 'Caribbean Trust Partners (C-4435)',
      values: {
        entity_id: 'C-4435',
        context: 'Cayman trust with Trustco Nominee #4 (100%) - pierce the veil for ultimate beneficial owner identification.',
      },
    },
    {
      label: 'Crypto Bridge SARL (C-4431)',
      values: {
        entity_id: 'C-4431',
        context: 'Swiss SARL with 50/50 split between Klaus Weber (CH, verified) and BlockChain Capital (KY, unverified).',
      },
    },
    {
      label: 'Sahel Mining Corp (C-4429)',
      values: {
        entity_id: 'C-4429',
        context: 'Mali mining entity with 55% Issa Diallo (PEP-005, Mining Cabinet member) and 45% Sahara Holdings SARL (CH).',
      },
    },
    {
      label: 'Apex Trading LLC (C-4421)',
      values: {
        entity_id: 'C-4421',
        context: 'US corporate with Sanderson family ownership - verify 25%+ owners under FinCEN CDD rule.',
      },
    },
  ],

  'transaction-anomaly': [
    { label: 'Default — current 30-day window', values: {} },
    {
      label: 'Focus — high-risk customers only',
      values: { hints: 'Restrict analysis to customers with risk_tier=high. Use z-score against 90-day baseline.' },
    },
    {
      label: 'Focus — cross-border wires',
      values: { hints: 'Restrict to cross-border wires above $50k equivalent. Baseline against customer history.' },
    },
    {
      label: 'Focus — cash transactions',
      values: { hints: 'Restrict to cash deposits/withdrawals. Flag sub-threshold structuring patterns.' },
    },
    {
      label: 'Focus — crypto / VASP exposure',
      values: { hints: 'Restrict to counterparties matching known crypto exchange or mixer patterns.' },
    },
  ],

  'peer-group-compare': [
    {
      label: 'Apex Trading LLC vs US corporate peers',
      values: {
        customer_id: 'C-4421',
        peer_group: 'US corporate, trading sector, mid-revenue',
      },
    },
    {
      label: 'Dragon Imports Co vs HK trade peers',
      values: {
        customer_id: 'C-4427',
        peer_group: 'HK corporate, import/export, mid-revenue',
      },
    },
    {
      label: 'Vladimir Petrov vs PEP private banking peers',
      values: {
        customer_id: 'C-4426',
        peer_group: 'PEP private banking, Russia',
      },
    },
    {
      label: 'Pacific Logistics Inc vs SG logistics peers',
      values: {
        customer_id: 'C-4433',
        peer_group: 'SG corporate, logistics, mid-revenue',
      },
    },
    {
      label: 'Crypto Bridge SARL vs Swiss crypto-fiat peers',
      values: {
        customer_id: 'C-4431',
        peer_group: 'CH crypto-fiat custodian',
      },
    },
  ],

  'executive-brief': [
    { label: 'Default snapshot — no bias', values: { notes: '' } },
    {
      label: 'Bias toward sanctions risk',
      values: { notes: 'Bias the brief toward OFAC SDN matches, frozen-account status, and OFAC 50% rule exposure.' },
    },
    {
      label: 'Bias toward filing backlog',
      values: { notes: 'Bias the brief toward SAR draft backlog, CTR pending count, and FinCEN filing deadlines.' },
    },
    {
      label: 'Bias toward KYC refresh',
      values: { notes: 'Bias the brief toward expired/expiring KYC profiles, EDD case throughput, and refresh queue health.' },
    },
    {
      label: 'Bias toward alert load',
      values: { notes: 'Bias the brief toward critical/high alert load, mean-time-to-investigate, and false-positive rate.' },
    },
  ],

  'customer-risk-score': [
    {
      label: 'Apex Trading LLC (C-4421) — structuring suspect',
      values: { customer_id: 'C-4421', signals_notes: 'Recent ATM structuring pattern; SAR draft open; US corporate.' },
    },
    {
      label: 'Vladimir Petrov (C-4426) — PEP RU',
      values: { customer_id: 'C-4426', signals_notes: 'PEP RU Deputy Energy Minister; 87% sanctions name match; $14.2M private banking.' },
    },
    {
      label: 'Sahel Mining Corp (C-4429) — high-risk jurisdiction',
      values: { customer_id: 'C-4429', signals_notes: 'Mali mining sector; PEP-linked BO; KYC expired; trade-based ML indicators.' },
    },
    {
      label: 'Caribbean Trust Partners (C-4435) — opaque trust',
      values: { customer_id: 'C-4435', signals_notes: 'Cayman trust; 100% nominee owner; OFAC 50% rule under review.' },
    },
    {
      label: 'Maria Rossi (C-4424) — low-risk individual',
      values: { customer_id: 'C-4424', signals_notes: 'IT individual; salary-funded; no adverse media; ATO indicators recently.' },
    },
  ],

  'edd-questionnaire': [
    {
      label: 'PEP designation — Vladimir Petrov (C-4426)',
      values: { customer_id: 'C-4426', trigger: 'PEP designation (Russian Deputy Energy Minister)' },
    },
    {
      label: 'OFAC SDN confirmed — Olga Ivanova (C-4434)',
      values: { customer_id: 'C-4434', trigger: 'OFAC SDN confirmed match score 95, account frozen' },
    },
    {
      label: 'Crypto mixer exposure — Crypto Bridge SARL (C-4431)',
      values: { customer_id: 'C-4431', trigger: 'Outbound wire to Tornado Cash mixer 0xDEAD..' },
    },
    {
      label: 'Opaque BO structure — Caribbean Trust Partners (C-4435)',
      values: { customer_id: 'C-4435', trigger: 'Caribbean trust opaque BO structure, 100% nominee owner' },
    },
    {
      label: 'High-risk jurisdiction — Sahel Mining (C-4429)',
      values: { customer_id: 'C-4429', trigger: 'High-risk jurisdiction (Mali) + mining sector + PEP-linked BO' },
    },
  ],

  'investigation-summary': [
    {
      label: 'INV-2026-001 — Apex ATM structuring',
      values: { inv_id: 'INV-2026-001', context: 'Track ATM clusters near Miami branch; structuring pattern.' },
    },
    {
      label: 'INV-2026-002 — BVI shell trace',
      values: { inv_id: 'INV-2026-002', context: 'Trace BVI shell network counterparties; layering case.' },
    },
    {
      label: 'INV-2026-004 — Tornado Cash chain analytics',
      values: { inv_id: 'INV-2026-004', context: 'Chain analytics on Tornado Cash outflow from C-4431.' },
    },
    {
      label: 'INV-2026-005 — Sahel mining over-invoicing',
      values: { inv_id: 'INV-2026-005', context: 'Audit Sahel mining export invoices for trade-based ML.' },
    },
    {
      label: 'INV-2026-008 — Caribbean trust BO veil',
      values: { inv_id: 'INV-2026-008', context: 'Pierce Caribbean trust BO veil; 100% nominee structure.' },
    },
  ],

  'regulatory-filing-draft': [
    {
      label: 'SAR — May 2026 batch',
      values: { filing_type: 'SAR', period: '2026-05', data_notes: 'Include SAR-2026-0001 (structuring), SAR-2026-0004 (mixer), SAR-2026-0006 (SDN-linked).' },
    },
    {
      label: 'CTR — week 20',
      values: { filing_type: 'CTR', period: '2026-W20', data_notes: 'Aggregate cash transactions > $10,000 reportable per BSA.' },
    },
    {
      label: 'FBAR — calendar year 2025',
      values: { filing_type: 'FBAR', period: '2025', data_notes: 'Annual FBAR consolidation for institutional foreign accounts.' },
    },
    {
      label: 'Form 8300 — April 2026',
      values: { filing_type: '8300', period: '2026-04', data_notes: 'Cash received in trade or business exceeding $10,000.' },
    },
    {
      label: 'OFAC Annual Report — Q1 2026',
      values: { filing_type: 'OFAC', period: '2026-Q1', data_notes: 'Blocked property and rejected transaction summary.' },
    },
  ],

  'source-of-funds-explain': [
    {
      label: 'Vladimir Petrov — family wealth claim',
      values: {
        customer_id: 'C-4426',
        claimed_source: 'Family wealth',
        claimed_amount_usd: 9500000,
        notes: 'Customer presents Russian trust statement; observed $14.2M in private banking inflows over 6 months.',
      },
    },
    {
      label: 'BVI Shell Holdings — asset sale claim',
      values: {
        customer_id: 'C-4423',
        claimed_source: 'Asset sale',
        claimed_amount_usd: 4500000,
        notes: 'Customer presents BVI property sale deed; observed $4.5M outbound to BVI counterparty same day.',
      },
    },
    {
      label: 'Olga Ivanova — unsupported $4.2M',
      values: {
        customer_id: 'C-4434',
        claimed_source: 'Unknown',
        claimed_amount_usd: 4200000,
        notes: 'No documentation provided; $920k attempted outbound blocked on frozen account.',
      },
    },
    {
      label: 'Crypto Bridge SARL — crypto liquidation claim',
      values: {
        customer_id: 'C-4431',
        claimed_source: 'Crypto liquidation',
        claimed_amount_usd: 3800000,
        notes: 'Exchange statement provided; observed $185k to Tornado Cash mixer same week.',
      },
    },
    {
      label: 'Sahel Mining — mining royalties claim',
      values: {
        customer_id: 'C-4429',
        claimed_source: 'Mining royalties',
        claimed_amount_usd: 2200000,
        notes: 'Mali mining contract presented; observed over-invoiced wire to DXB 4x declared volume.',
      },
    },
  ],

  'jurisdictional-risk': [
    {
      label: 'Russia',
      values: { country: 'Russia', context: 'PEP exposure, OFAC SDN concentration, comprehensive sanctions program.' },
    },
    {
      label: 'British Virgin Islands',
      values: { country: 'British Virgin Islands', context: 'Shell company concentration, opaque BO structures, FATF monitored.' },
    },
    {
      label: 'Cayman Islands',
      values: { country: 'Cayman Islands', context: 'Trust structures, nominee owners, OFAC 50% rule exposure.' },
    },
    {
      label: 'Mali',
      values: { country: 'Mali', context: 'FATF high-risk, mining sector ML typologies, PEP overlap.' },
    },
    {
      label: 'United Arab Emirates',
      values: { country: 'United Arab Emirates', context: 'Trade-based ML hub risk, real estate laundering, enhanced monitoring.' },
    },
  ],

  'false-positive-classifier': [
    { label: 'Default — current open alert queue', values: {} },
    {
      label: 'Focus — high severity only',
      values: { hints: 'Restrict to alerts with severity in [critical, high]; bias against auto-closure.' },
    },
    {
      label: 'Focus — sanctions match alerts',
      values: { hints: 'Restrict to alerts on rule containing "sanctions" or "OFAC"; require strict review.' },
    },
    {
      label: 'Focus — structuring rule alerts',
      values: { hints: 'Restrict to alerts on structuring rule; baseline against historical false-positive rate.' },
    },
    {
      label: 'Focus — ATM withdrawal pattern alerts',
      values: { hints: 'Restrict to alerts on ATM pattern rules; cross-check with cardholder location signal.' },
    },
  ],

  'network-analysis': [
    {
      label: 'Seed — Apex Trading LLC (C-4421)',
      values: { seed_id: 'C-4421', depth: 2 },
    },
    {
      label: 'Seed — BVI Shell Holdings (C-4423)',
      values: { seed_id: 'C-4423', depth: 2 },
    },
    {
      label: 'Seed — Crypto Bridge SARL (C-4431)',
      values: { seed_id: 'C-4431', depth: 2 },
    },
    {
      label: 'Seed — Sahel Mining Corp (C-4429)',
      values: { seed_id: 'C-4429', depth: 2 },
    },
    {
      label: 'Seed — Caribbean Trust Partners (C-4435)',
      values: { seed_id: 'C-4435', depth: 2 },
    },
  ],

  // Pass 7 — MECHANICAL backlog
  'adverse-media-screen': [
    {
      label: 'Vladimir Petrov — Russian Deputy Energy Minister',
      values: { name: 'Vladimir Petrov', country: 'RU', customer_id: 'C-4426', context: 'PEP onboarding, $14.2M private banking, alleged kickback news in EU press.' },
    },
    {
      label: 'Sahel Mining Corp — ML high-risk',
      values: { name: 'Sahel Mining Corp', country: 'ML', customer_id: 'C-4429', context: 'Mali mining export licensing controversy, PEP-linked BO.' },
    },
    {
      label: 'Crypto Bridge SARL — mixer exposure',
      values: { name: 'Crypto Bridge SARL', country: 'CH', customer_id: 'C-4431', context: 'Outbound to Tornado Cash, prior FINMA enforcement rumors.' },
    },
    {
      label: 'Caribbean Trust Partners — Cayman nominee',
      values: { name: 'Caribbean Trust Partners', country: 'KY', customer_id: 'C-4435', context: 'Pandora Papers reference; 100% nominee owner.' },
    },
    {
      label: 'Maria Rossi — low-risk individual',
      values: { name: 'Maria Rossi', country: 'IT', customer_id: 'C-4424', context: 'Salary-funded retail customer, no known adverse media.' },
    },
  ],

  'kyc-onboarding-prescreen': [
    {
      label: 'Apex Trading LLC — US corporate onboarding',
      values: { customer_id: 'C-4421', applicant_name: 'Apex Trading LLC', country: 'US', type: 'corporate',
        notes: 'New US trading firm, projected $20M annual throughput.' },
    },
    {
      label: 'Vladimir Petrov — PEP private banking applicant',
      values: { customer_id: 'C-4426', applicant_name: 'Vladimir Petrov', country: 'RU', type: 'individual',
        notes: 'PEP onboarding, Russian Deputy Energy Minister, $14.2M initial deposit claimed family wealth.' },
    },
    {
      label: 'Sahel Mining Corp — Mali mining',
      values: { customer_id: 'C-4429', applicant_name: 'Sahel Mining Corp', country: 'ML', type: 'corporate',
        notes: 'Mining sector, PEP-linked BO, high-risk jurisdiction.' },
    },
    {
      label: 'Caribbean Trust Partners — Cayman trust',
      values: { customer_id: 'C-4435', applicant_name: 'Caribbean Trust Partners', country: 'KY', type: 'trust',
        notes: 'Cayman trust, 100% nominee owner, OFAC 50% rule under review.' },
    },
    {
      label: 'Maria Rossi — IT retail individual',
      values: { customer_id: 'C-4424', applicant_name: 'Maria Rossi', country: 'IT', type: 'individual',
        notes: 'Salary-funded individual, $5k/mo deposits, no adverse media.' },
    },
  ],
};

// GET /api/ai/samples?feature=<verb>
router.get('/samples', (req, res) => {
  try {
    const feature = (req.query.feature || '').toString();
    if (!feature) {
      return res.json({ features: Object.keys(SAMPLES) });
    }
    const samples = SAMPLES[feature];
    if (!samples) {
      return res.status(404).json({ error: `unknown feature: ${feature}` });
    }
    res.json({ feature, samples });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/ai/history?feature=<name>&limit=<n>
router.get('/history', async (req, res) => {
  try {
    const feature = (req.query.feature || '').toString();
    const limit = Math.min(parseInt(req.query.limit, 10) || 25, 200);
    let r;
    if (feature) {
      r = await pool.query(
        'SELECT id, feature, input, output, created_at FROM ai_results WHERE feature = $1 ORDER BY created_at DESC LIMIT $2',
        [feature, limit]
      );
    } else {
      r = await pool.query(
        'SELECT id, feature, input, output, created_at FROM ai_results ORDER BY created_at DESC LIMIT $1',
        [limit]
      );
    }
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// helper to load a customer by customer_id (string) into a row
async function loadCustomer(customer_id) {
  if (!customer_id) return null;
  try {
    const r = await pool.query('SELECT * FROM customers WHERE customer_id = $1 LIMIT 1', [customer_id]);
    return r.rows[0] || { customer_id };
  } catch (_) { return { customer_id }; }
}

// 1. SAR Narrative Draft
router.post('/sar-narrative-draft', async (req, res) => {
  try {
    const { customer_id, suspicion, evidence_notes } = req.body || {};
    const customer = await loadCustomer(customer_id) || { customer_id: customer_id || 'C-UNKNOWN' };
    let evidence = [];
    if (customer_id) {
      const accts = await pool.query('SELECT account_id FROM accounts WHERE customer_id = $1', [customer_id]);
      const acctIds = accts.rows.map((r) => r.account_id);
      if (acctIds.length) {
        const t = await pool.query('SELECT * FROM transactions WHERE account_id = ANY($1::text[]) ORDER BY ts DESC LIMIT 25', [acctIds]);
        evidence = t.rows;
      }
    }
    const result = await ai.sarNarrativeDraft(customer, suspicion || 'general suspicious activity', evidence_notes ? [...evidence, { note: evidence_notes }] : evidence);
    await record('sar-narrative-draft', { customer_id, suspicion }, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2. Typology Detect
router.post('/typology-detect', async (req, res) => {
  try {
    let txns = req.body?.transactions;
    if (!txns) {
      const r = await pool.query('SELECT * FROM transactions ORDER BY ts DESC LIMIT 30');
      txns = r.rows;
    }
    const result = await ai.typologyDetect(txns);
    if (req.body?.focus) result.focus_applied = req.body.focus;
    await record('typology-detect', { txn_count: txns.length, focus: req.body?.focus }, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 3. KYC Refresh Summary
router.post('/kyc-refresh-summary', async (req, res) => {
  try {
    let profiles = req.body?.profiles;
    if (!profiles) {
      const r = await pool.query('SELECT * FROM kyc_profiles ORDER BY refresh_due ASC LIMIT 30');
      profiles = r.rows;
    }
    const result = await ai.kycRefreshSummary(profiles);
    await record('kyc-refresh-summary', { profile_count: profiles.length }, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 4. Sanction Name Match
router.post('/sanction-name-match', async (req, res) => {
  try {
    const { name, country, dob, context } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name is required' });
    const wl = await pool.query('SELECT * FROM watchlists WHERE status = $1 LIMIT 10', ['active']);
    const result = await ai.sanctionNameMatch({ name, country, dob, context }, wl.rows);
    await record('sanction-name-match', { name, country }, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 5. Beneficial Owner Trace
router.post('/beneficial-owner-trace', async (req, res) => {
  try {
    const { entity_id, context } = req.body || {};
    const entity = await loadCustomer(entity_id) || { entity_id };
    let owners = [];
    if (entity_id) {
      const r = await pool.query('SELECT * FROM beneficial_owners WHERE entity_id = $1', [entity_id]);
      owners = r.rows;
    }
    const result = await ai.beneficialOwnerTrace({ ...entity, context }, owners);
    await record('beneficial-owner-trace', { entity_id }, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 6. Transaction Anomaly
router.post('/transaction-anomaly', async (req, res) => {
  try {
    let txns = req.body?.transactions;
    if (!txns) {
      const r = await pool.query('SELECT * FROM transactions ORDER BY ts DESC LIMIT 30');
      txns = r.rows;
    }
    const result = await ai.transactionAnomaly(txns);
    if (req.body?.hints) result.hints_applied = req.body.hints;
    await record('transaction-anomaly', { txn_count: txns.length, hints: req.body?.hints }, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 7. Peer Group Compare
router.post('/peer-group-compare', async (req, res) => {
  try {
    const { customer_id, peer_group } = req.body || {};
    const customer = await loadCustomer(customer_id) || { customer_id };
    let peers = [];
    if (customer && customer.type) {
      const r = await pool.query('SELECT * FROM customers WHERE type = $1 AND customer_id <> $2 LIMIT 10', [customer.type, customer_id]);
      peers = r.rows;
    } else {
      const r = await pool.query('SELECT * FROM customers LIMIT 10');
      peers = r.rows;
    }
    const result = await ai.peerGroupCompare({ ...customer, peer_group }, peers);
    await record('peer-group-compare', { customer_id, peer_group }, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 8. Executive Brief
router.post('/executive-brief', async (req, res) => {
  try {
    const [customers, accounts, alerts, sars, ctrs, sanctions, kyc] = await Promise.all([
      pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE risk_tier='high') AS high_risk FROM customers"),
      pool.query("SELECT COUNT(*) FILTER (WHERE status='frozen') AS frozen, COUNT(*) AS total FROM accounts"),
      pool.query("SELECT COUNT(*) FILTER (WHERE status='open') AS open, COUNT(*) FILTER (WHERE severity='critical') AS critical, COUNT(*) FILTER (WHERE severity='high') AS high FROM alerts"),
      pool.query("SELECT COUNT(*) FILTER (WHERE status='draft') AS draft, COUNT(*) FILTER (WHERE status='filed') AS filed FROM sar_cases"),
      pool.query("SELECT COUNT(*) FILTER (WHERE status='pending') AS pending, COUNT(*) FILTER (WHERE status='filed') AS filed FROM ctrs"),
      pool.query("SELECT COUNT(*) FILTER (WHERE status='confirmed') AS confirmed, COUNT(*) FILTER (WHERE status='open') AS open FROM sanctions_hits"),
      pool.query("SELECT COUNT(*) FILTER (WHERE status='expired') AS expired, COUNT(*) FILTER (WHERE status='expiring') AS expiring FROM kyc_profiles"),
    ]);
    const snapshot = {
      customers: customers.rows[0],
      accounts: accounts.rows[0],
      alerts: alerts.rows[0],
      sars: sars.rows[0],
      ctrs: ctrs.rows[0],
      sanctions: sanctions.rows[0],
      kyc: kyc.rows[0],
      ...(req.body?.notes ? { notes: req.body.notes } : {}),
    };
    const result = await ai.executiveBrief(snapshot);
    const out = { snapshot, brief: result };
    await record('executive-brief', { notes: req.body?.notes || null }, out);
    res.json(out);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 9. Customer Risk Score
router.post('/customer-risk-score', async (req, res) => {
  try {
    const { customer_id, signals_notes } = req.body || {};
    const customer = await loadCustomer(customer_id) || { customer_id };
    let signals = { notes: signals_notes || '' };
    if (customer_id) {
      const [alerts, hits, sars] = await Promise.all([
        pool.query('SELECT COUNT(*) FROM alerts WHERE customer_id = $1', [customer_id]),
        pool.query('SELECT COUNT(*) FROM sanctions_hits WHERE customer_id = $1', [customer_id]),
        pool.query('SELECT COUNT(*) FROM sar_cases WHERE customer_id = $1', [customer_id]),
      ]);
      signals = {
        ...signals,
        alert_count: Number(alerts.rows[0].count),
        sanctions_hit_count: Number(hits.rows[0].count),
        sar_count: Number(sars.rows[0].count),
      };
    }
    const result = await ai.customerRiskScore(customer, signals);
    await record('customer-risk-score', { customer_id }, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 10. EDD Questionnaire
router.post('/edd-questionnaire', async (req, res) => {
  try {
    const { customer_id, trigger } = req.body || {};
    if (!trigger) return res.status(400).json({ error: 'trigger is required' });
    const customer = await loadCustomer(customer_id) || { customer_id };
    const result = await ai.eddQuestionnaire(customer, trigger);
    await record('edd-questionnaire', { customer_id, trigger }, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 11. Investigation Summary
router.post('/investigation-summary', async (req, res) => {
  try {
    const { inv_id, context } = req.body || {};
    let investigation = { inv_id, context };
    let evidence = [];
    if (inv_id) {
      const r = await pool.query('SELECT * FROM investigations WHERE inv_id = $1 LIMIT 1', [inv_id]);
      if (r.rows.length) {
        investigation = { ...r.rows[0], context };
        if (r.rows[0].case_id) {
          const sar = await pool.query('SELECT * FROM sar_cases WHERE case_id = $1', [r.rows[0].case_id]);
          evidence = sar.rows;
        }
      }
    }
    const result = await ai.investigationSummary(investigation, evidence);
    await record('investigation-summary', { inv_id }, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 12. Regulatory Filing Draft
router.post('/regulatory-filing-draft', async (req, res) => {
  try {
    const { filing_type, period, data_notes } = req.body || {};
    if (!filing_type) return res.status(400).json({ error: 'filing_type is required' });
    const r = await pool.query('SELECT * FROM regulatory_filings WHERE type = $1 ORDER BY created_at DESC LIMIT 10', [filing_type]);
    const result = await ai.regulatoryFilingDraft(filing_type, period || 'unspecified', { recent_filings: r.rows, notes: data_notes });
    await record('regulatory-filing-draft', { filing_type, period }, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 13. Source of Funds Explain
router.post('/source-of-funds-explain', async (req, res) => {
  try {
    const { customer_id, claimed_source, claimed_amount_usd, notes } = req.body || {};
    const customer = await loadCustomer(customer_id) || { customer_id };
    let txns = [];
    if (customer_id) {
      const accts = await pool.query('SELECT account_id FROM accounts WHERE customer_id = $1', [customer_id]);
      const acctIds = accts.rows.map((r) => r.account_id);
      if (acctIds.length) {
        const t = await pool.query('SELECT * FROM transactions WHERE account_id = ANY($1::text[]) ORDER BY ts DESC LIMIT 25', [acctIds]);
        txns = t.rows;
      }
    }
    const claimed = { source: claimed_source, amount_usd: claimed_amount_usd, notes };
    const result = await ai.sourceOfFundsExplain(customer, txns, claimed);
    await record('source-of-funds-explain', { customer_id, claimed_source, claimed_amount_usd }, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 14. Jurisdictional Risk
router.post('/jurisdictional-risk', async (req, res) => {
  try {
    const { country, context } = req.body || {};
    if (!country) return res.status(400).json({ error: 'country is required' });
    const j = await pool.query('SELECT * FROM jurisdictions WHERE country ILIKE $1 LIMIT 1', [`%${country}%`]);
    const signals = { record: j.rows[0] || null, context };
    const result = await ai.jurisdictionalRisk(country, signals);
    await record('jurisdictional-risk', { country }, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 15. False Positive Classifier
router.post('/false-positive-classifier', async (req, res) => {
  try {
    let alerts = req.body?.alerts;
    if (!alerts) {
      const r = await pool.query("SELECT * FROM alerts WHERE status IN ('open','investigating') ORDER BY opened_at DESC LIMIT 30");
      alerts = r.rows;
    }
    const result = await ai.falsePositiveClassifier(alerts);
    if (req.body?.hints) result.hints_applied = req.body.hints;
    await record('false-positive-classifier', { alert_count: alerts.length, hints: req.body?.hints }, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 16. Network Analysis
router.post('/network-analysis', async (req, res) => {
  try {
    const { seed_id, depth } = req.body || {};
    const seed = await loadCustomer(seed_id) || { seed_id };
    let txns = [];
    let owners = [];
    if (seed_id) {
      const accts = await pool.query('SELECT account_id FROM accounts WHERE customer_id = $1', [seed_id]);
      const acctIds = accts.rows.map((r) => r.account_id);
      if (acctIds.length) {
        const t = await pool.query('SELECT * FROM transactions WHERE account_id = ANY($1::text[]) ORDER BY ts DESC LIMIT 25', [acctIds]);
        txns = t.rows;
      }
      const bo = await pool.query('SELECT * FROM beneficial_owners WHERE entity_id = $1', [seed_id]);
      owners = bo.rows;
    }
    const result = await ai.networkAnalysis(seed, txns, owners);
    if (depth != null) result.depth_requested = depth;
    await record('network-analysis', { seed_id, depth }, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 17. Adverse Media Screener (Pass 7 — MECHANICAL)
// LLM-only fallback by design; commercial-feed creds (Refinitiv/Dow Jones)
// would be wired in here as `data_source: "commercial_feed"`.
router.post('/adverse-media-screen', async (req, res) => {
  try {
    const { name, country, context, customer_id } = req.body || {};
    if (!name && !customer_id) {
      return res.status(400).json({ error: 'name or customer_id is required' });
    }
    let subject = { name, country, context };
    if (customer_id) {
      const c = await loadCustomer(customer_id);
      subject = { ...c, ...subject };
    }
    let recentHits = [];
    if (customer_id) {
      const r = await pool.query(
        'SELECT * FROM sanctions_hits WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 10',
        [customer_id]
      );
      recentHits = r.rows;
    }
    const result = await ai.adverseMediaScreen(subject, recentHits);
    // Mark provider clearly when no commercial creds are wired.
    if (!result.data_source) result.data_source = 'llm_only';
    await record('adverse-media-screen', { name, country, customer_id }, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 18. KYC Onboarding Pre-Screen (Pass 7 — MECHANICAL)
// At-intake risk pre-screen (distinct from `kyc-refresh-summary` which is queue-summary).
router.post('/kyc-onboarding-prescreen', async (req, res) => {
  try {
    const { customer_id, applicant_name, country, type, notes } = req.body || {};
    let applicant = { customer_id, name: applicant_name, country, type, notes };
    if (customer_id) {
      const c = await loadCustomer(customer_id);
      applicant = { ...c, ...applicant };
    }
    // Pull peer-density signal for the applicant's country / type.
    let peerCount = 0;
    let highRiskCount = 0;
    if (country) {
      const r = await pool.query(
        "SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE risk_tier='high')::int AS high FROM customers WHERE country ILIKE $1",
        [`%${country}%`]
      );
      peerCount = r.rows[0]?.total || 0;
      highRiskCount = r.rows[0]?.high || 0;
    }
    const signals = { peer_count: peerCount, high_risk_peer_count: highRiskCount, notes };
    const result = await ai.kycOnboardingPrescreen(applicant, signals);
    await record('kyc-onboarding-prescreen', { customer_id, applicant_name, country, type }, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

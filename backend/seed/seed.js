const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

function buildPoolConfig() {
  if (process.env.DATABASE_URL) {
    return { connectionString: process.env.DATABASE_URL };
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'aml_monitoring',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  };
}

const pool = new Pool(buildPoolConfig());

async function run() {
  const client = await pool.connect();
  try {
    console.log('[seed] resetting tables...');
    await client.query(`
      DROP TABLE IF EXISTS customers           CASCADE;
      DROP TABLE IF EXISTS accounts            CASCADE;
      DROP TABLE IF EXISTS transactions        CASCADE;
      DROP TABLE IF EXISTS sanctions_hits      CASCADE;
      DROP TABLE IF EXISTS sar_cases           CASCADE;
      DROP TABLE IF EXISTS ctrs                CASCADE;
      DROP TABLE IF EXISTS kyc_profiles        CASCADE;
      DROP TABLE IF EXISTS watchlists          CASCADE;
      DROP TABLE IF EXISTS typologies          CASCADE;
      DROP TABLE IF EXISTS beneficial_owners   CASCADE;
      DROP TABLE IF EXISTS peps                CASCADE;
      DROP TABLE IF EXISTS jurisdictions       CASCADE;
      DROP TABLE IF EXISTS investigations      CASCADE;
      DROP TABLE IF EXISTS alerts              CASCADE;
      DROP TABLE IF EXISTS audit_log           CASCADE;
      DROP TABLE IF EXISTS source_of_funds     CASCADE;
      DROP TABLE IF EXISTS edd_cases           CASCADE;
      DROP TABLE IF EXISTS regulatory_filings  CASCADE;
      DROP TABLE IF EXISTS ai_results          CASCADE;

      DROP TABLE IF EXISTS users               CASCADE;
      DROP TABLE IF EXISTS notifications       CASCADE;
      DROP TABLE IF EXISTS attachments         CASCADE;
      DROP TABLE IF EXISTS webhooks            CASCADE;
      DROP TABLE IF EXISTS webhook_deliveries  CASCADE;
      DROP TABLE IF EXISTS case_state_transitions CASCADE;
      DROP TABLE IF EXISTS escalation_assignments CASCADE;
      DROP TABLE IF EXISTS escalation_queues      CASCADE;
      DROP TABLE IF EXISTS tx_events              CASCADE;
      DROP TABLE IF EXISTS fincen_field_mappings  CASCADE;
      DROP TABLE IF EXISTS advisory_actions       CASCADE;
    `);

    console.log('[seed] applying migrations...');
    const schema1 = fs.readFileSync(path.join(__dirname, '..', 'migrations', '001_schema.sql'), 'utf8');
    await client.query(schema1);
    const schema2 = fs.readFileSync(path.join(__dirname, '..', 'migrations', '002_schema.sql'), 'utf8');
    await client.query(schema2);
    const schema3 = fs.readFileSync(path.join(__dirname, '..', 'migrations', '003_pass7.sql'), 'utf8');
    await client.query(schema3);

    // ─── customers (15) ────────────────────────────────────────────
    console.log('[seed] inserting customers...');
    const customers = [
      ['C-4421', 'Apex Trading LLC',          'corporate',  'US', 'high',   'active'],
      ['C-4422', 'Sergey Volkov',             'individual', 'RU', 'high',   'restricted'],
      ['C-4423', 'BVI Shell Holdings Ltd',    'corporate',  'VG', 'high',   'active'],
      ['C-4424', 'Maria Rossi',               'individual', 'IT', 'low',    'active'],
      ['C-4425', 'Nile Cargo S.A.',           'corporate',  'PA', 'medium', 'active'],
      ['C-4426', 'Vladimir Petrov',           'pep',        'RU', 'high',   'review'],
      ['C-4427', 'Dragon Imports Co',         'corporate',  'HK', 'medium', 'active'],
      ['C-4428', 'James Thompson',            'individual', 'US', 'low',    'active'],
      ['C-4429', 'Sahel Mining Corp',         'corporate',  'ML', 'high',   'restricted'],
      ['C-4430', 'Sofia Garcia',              'individual', 'MX', 'medium', 'active'],
      ['C-4431', 'Crypto Bridge SARL',        'corporate',  'CH', 'high',   'active'],
      ['C-4432', 'Ahmed Al-Rashid',           'individual', 'AE', 'medium', 'active'],
      ['C-4433', 'Pacific Logistics Inc',     'corporate',  'SG', 'low',    'active'],
      ['C-4434', 'Olga Ivanova',              'pep',        'RU', 'high',   'frozen'],
      ['C-4435', 'Caribbean Trust Partners',  'corporate',  'KY', 'high',   'review'],
    ];
    for (const r of customers) {
      await client.query(
        'INSERT INTO customers (customer_id,name,type,country,risk_tier,status) VALUES ($1,$2,$3,$4,$5,$6)',
        r
      );
    }

    // ─── accounts (15) ─────────────────────────────────────────────
    console.log('[seed] inserting accounts...');
    const accounts = [
      ['ACC-10001', 'C-4421', 'checking',    1452300.55, 'USD', 'open'],
      ['ACC-10002', 'C-4421', 'savings',      820000.00, 'USD', 'open'],
      ['ACC-10003', 'C-4422', 'checking',     245000.00, 'EUR', 'frozen'],
      ['ACC-10004', 'C-4423', 'corporate',   8200000.00, 'USD', 'open'],
      ['ACC-10005', 'C-4424', 'checking',      28450.00, 'EUR', 'open'],
      ['ACC-10006', 'C-4425', 'trade',       1980000.00, 'USD', 'open'],
      ['ACC-10007', 'C-4426', 'private',    14200000.00, 'USD', 'review'],
      ['ACC-10008', 'C-4427', 'corporate',    760000.00, 'HKD', 'open'],
      ['ACC-10009', 'C-4428', 'checking',      42100.00, 'USD', 'open'],
      ['ACC-10010', 'C-4429', 'corporate',   3100000.00, 'USD', 'restricted'],
      ['ACC-10011', 'C-4430', 'remittance',    12800.00, 'MXN', 'open'],
      ['ACC-10012', 'C-4431', 'crypto-fiat', 4500000.00, 'CHF', 'open'],
      ['ACC-10013', 'C-4432', 'private',     1875000.00, 'AED', 'open'],
      ['ACC-10014', 'C-4433', 'corporate',    920000.00, 'SGD', 'open'],
      ['ACC-10015', 'C-4434', 'private',     6700000.00, 'USD', 'frozen'],
    ];
    for (const r of accounts) {
      await client.query(
        'INSERT INTO accounts (account_id,customer_id,type,balance,currency,status) VALUES ($1,$2,$3,$4,$5,$6)',
        r
      );
    }

    // ─── transactions (15) ────────────────────────────────────────
    console.log('[seed] inserting transactions...');
    const transactions = [
      ['TXN-90001', 'ACC-10001',    9800.00, 'USD', 'Cash deposit, Miami branch',           '2026-05-10 09:12+00'],
      ['TXN-90002', 'ACC-10001',    9750.00, 'USD', 'Cash deposit, Miami branch',           '2026-05-11 10:04+00'],
      ['TXN-90003', 'ACC-10001',    9900.00, 'USD', 'Cash deposit, Miami branch',           '2026-05-12 09:55+00'],
      ['TXN-90004', 'ACC-10004', 4500000.00, 'USD', 'Wire to BVI counterparty',             '2026-05-08 14:33+00'],
      ['TXN-90005', 'ACC-10007', 2100000.00, 'EUR', 'Wire to Cyprus shell account',         '2026-05-09 16:21+00'],
      ['TXN-90006', 'ACC-10012',  185000.00, 'CHF', 'Wire to Tornado Cash mixer 0xDEAD..',  '2026-05-13 11:18+00'],
      ['TXN-90007', 'ACC-10010',  640000.00, 'USD', 'Trade payment Sahel Mining to DXB',    '2026-05-07 08:40+00'],
      ['TXN-90008', 'ACC-10006',  280000.00, 'USD', 'Trade settlement Panama to Dubai',     '2026-05-11 13:00+00'],
      ['TXN-90009', 'ACC-10009',    1500.00, 'USD', 'POS purchase grocery',                 '2026-05-14 18:22+00'],
      ['TXN-90010', 'ACC-10005',    3200.00, 'EUR', 'ATM withdrawal Milano',                '2026-05-13 09:00+00'],
      ['TXN-90011', 'ACC-10008',   95000.00, 'HKD', 'Wire to Macau correspondent',          '2026-05-12 02:14+00'],
      ['TXN-90012', 'ACC-10003',  140000.00, 'EUR', 'Wire to Russian Federation bank',      '2026-05-10 07:55+00'],
      ['TXN-90013', 'ACC-10015',  920000.00, 'USD', 'Outbound wire blocked - frozen',       '2026-05-12 15:31+00'],
      ['TXN-90014', 'ACC-10014',   88000.00, 'SGD', 'Trade payment SG to ID timber',        '2026-05-13 06:42+00'],
      ['TXN-90015', 'ACC-10013',  410000.00, 'AED', 'Property purchase deposit',            '2026-05-09 12:11+00'],
    ];
    for (const r of transactions) {
      await client.query(
        'INSERT INTO transactions (txn_id,account_id,amount,currency,counterparty,ts) VALUES ($1,$2,$3,$4,$5,$6)',
        r
      );
    }

    // ─── sanctions_hits (15) ──────────────────────────────────────
    console.log('[seed] inserting sanctions_hits...');
    const sanctions_hits = [
      ['HIT-7001', 'C-4422', 'OFAC SDN',         87, 'name',           'open'],
      ['HIT-7002', 'C-4426', 'EU Consolidated',  92, 'name+dob',       'confirmed'],
      ['HIT-7003', 'C-4434', 'OFAC SDN',         95, 'name+country',   'confirmed'],
      ['HIT-7004', 'C-4429', 'UN 1267',          71, 'entity',         'false_positive'],
      ['HIT-7005', 'C-4423', 'OFAC SDN',         63, 'address',        'review'],
      ['HIT-7006', 'C-4427', 'HMT UK',           58, 'name',           'false_positive'],
      ['HIT-7007', 'C-4435', 'OFAC 50% Rule',    81, 'beneficial_own', 'open'],
      ['HIT-7008', 'C-4431', 'OFAC SDN',         74, 'counterparty',   'review'],
      ['HIT-7009', 'C-4422', 'OFAC SSI',         68, 'name',           'open'],
      ['HIT-7010', 'C-4426', 'DPL Entity List',  79, 'name+role',      'review'],
      ['HIT-7011', 'C-4434', 'UK HMT',           90, 'name',           'confirmed'],
      ['HIT-7012', 'C-4429', 'EU Consolidated',  65, 'country',        'false_positive'],
      ['HIT-7013', 'C-4423', 'BIS Denied',       55, 'entity',         'closed'],
      ['HIT-7014', 'C-4427', 'Hong Kong SFC',    49, 'name',           'closed'],
      ['HIT-7015', 'C-4435', 'Caribbean PEP',    72, 'name+dob',       'open'],
    ];
    for (const r of sanctions_hits) {
      await client.query(
        'INSERT INTO sanctions_hits (hit_id,customer_id,list,score,matched_field,status) VALUES ($1,$2,$3,$4,$5,$6)',
        r
      );
    }

    // ─── sar_cases (15) ───────────────────────────────────────────
    console.log('[seed] inserting sar_cases...');
    const sar_cases = [
      ['SAR-2026-0001', 'C-4421', 'Structuring - cash deposits below CTR threshold over 7 days',   'draft',  '2026-05-12 09:00+00', 'analyst@aml.io'],
      ['SAR-2026-0002', 'C-4423', 'Layering - rapid pass-through to BVI shells',                   'filed',  '2026-05-08 14:00+00', 'compliance@aml.io'],
      ['SAR-2026-0003', 'C-4426', 'PEP unusual private banking flow',                              'review', '2026-05-10 11:00+00', 'compliance@aml.io'],
      ['SAR-2026-0004', 'C-4431', 'Crypto mixer exposure (Tornado Cash)',                          'draft',  '2026-05-13 12:00+00', 'analyst@aml.io'],
      ['SAR-2026-0005', 'C-4429', 'Trade-based ML, mining export over-invoicing',                  'filed',  '2026-05-07 09:30+00', 'compliance@aml.io'],
      ['SAR-2026-0006', 'C-4434', 'Funds movement to SDN-linked counterparties',                   'filed',  '2026-05-09 15:00+00', 'compliance@aml.io'],
      ['SAR-2026-0007', 'C-4422', 'Sudden activity after dormancy, sanctioned origin',             'review', '2026-05-11 08:00+00', 'analyst@aml.io'],
      ['SAR-2026-0008', 'C-4435', 'Caribbean trust opaque BO structure',                           'draft',  '2026-05-12 16:00+00', 'compliance@aml.io'],
      ['SAR-2026-0009', 'C-4425', 'Smurfing across 12 sub-accounts',                               'filed',  '2026-05-06 10:00+00', 'analyst@aml.io'],
      ['SAR-2026-0010', 'C-4427', 'Macau correspondent banking concentration',                     'review', '2026-05-10 14:00+00', 'compliance@aml.io'],
      ['SAR-2026-0011', 'C-4421', 'ATM cash structuring pattern',                                  'draft',  '2026-05-13 09:00+00', 'analyst@aml.io'],
      ['SAR-2026-0012', 'C-4430', 'Funnel account inbound wires from 8 jurisdictions',             'review', '2026-05-09 13:00+00', 'analyst@aml.io'],
      ['SAR-2026-0013', 'C-4433', 'Round-tripping SG to ID to SG within 96 hours',                 'filed',  '2026-05-05 11:00+00', 'compliance@aml.io'],
      ['SAR-2026-0014', 'C-4432', 'High-value cash purchases of luxury property',                  'draft',  '2026-05-08 17:00+00', 'analyst@aml.io'],
      ['SAR-2026-0015', 'C-4424', 'Account takeover indicators + outbound to mule',                'review', '2026-05-12 20:00+00', 'analyst@aml.io'],
    ];
    for (const r of sar_cases) {
      await client.query(
        'INSERT INTO sar_cases (case_id,customer_id,suspicion,status,opened_at,owner) VALUES ($1,$2,$3,$4,$5,$6)',
        r
      );
    }

    // ─── ctrs (15) ────────────────────────────────────────────────
    console.log('[seed] inserting ctrs...');
    const ctrs = [
      ['CTR-2026-0001', 'C-4421',  29450.00, '2026-05-W2', '2026-05-13 17:00+00', 'filed'],
      ['CTR-2026-0002', 'C-4422',  15800.00, '2026-05-W2', '2026-05-12 17:00+00', 'pending'],
      ['CTR-2026-0003', 'C-4425',  18200.00, '2026-05-W1', '2026-05-08 17:00+00', 'filed'],
      ['CTR-2026-0004', 'C-4427',  22300.00, '2026-05-W2', '2026-05-13 17:00+00', 'filed'],
      ['CTR-2026-0005', 'C-4424',  14000.00, '2026-05-W1', '2026-05-09 17:00+00', 'filed'],
      ['CTR-2026-0006', 'C-4428',  10250.00, '2026-05-W2', '2026-05-14 17:00+00', 'pending'],
      ['CTR-2026-0007', 'C-4430',  16500.00, '2026-05-W1', '2026-05-07 17:00+00', 'filed'],
      ['CTR-2026-0008', 'C-4432',  41200.00, '2026-05-W2', '2026-05-12 17:00+00', 'filed'],
      ['CTR-2026-0009', 'C-4433',  19800.00, '2026-05-W1', '2026-05-06 17:00+00', 'filed'],
      ['CTR-2026-0010', 'C-4435',  35000.00, '2026-05-W2', '2026-05-13 17:00+00', 'review'],
      ['CTR-2026-0011', 'C-4421',  26800.00, '2026-05-W1', '2026-05-08 17:00+00', 'filed'],
      ['CTR-2026-0012', 'C-4426',  98000.00, '2026-05-W2', '2026-05-11 17:00+00', 'review'],
      ['CTR-2026-0013', 'C-4429',  56000.00, '2026-05-W1', '2026-05-06 17:00+00', 'filed'],
      ['CTR-2026-0014', 'C-4431',  88000.00, '2026-05-W2', '2026-05-12 17:00+00', 'review'],
      ['CTR-2026-0015', 'C-4423', 142000.00, '2026-05-W2', '2026-05-13 17:00+00', 'filed'],
    ];
    for (const r of ctrs) {
      await client.query(
        'INSERT INTO ctrs (ctr_id,customer_id,aggregate_amount,period,filed_at,status) VALUES ($1,$2,$3,$4,$5,$6)',
        r
      );
    }

    // ─── kyc_profiles (15) ────────────────────────────────────────
    console.log('[seed] inserting kyc_profiles...');
    const kyc_profiles = [
      ['KYC-30001', 'C-4421', 'Corporate Registration',   '2027-01-15', 'verified', '2026-12-15'],
      ['KYC-30002', 'C-4422', 'Passport',                 '2026-06-01', 'expiring', '2026-05-25'],
      ['KYC-30003', 'C-4423', 'Certificate of Incorp.',   '2026-09-30', 'verified', '2026-09-01'],
      ['KYC-30004', 'C-4424', 'Driver License (IT)',      '2030-04-12', 'verified', '2027-04-12'],
      ['KYC-30005', 'C-4425', 'Trade License (Panama)',   '2026-07-20', 'verified', '2026-07-01'],
      ['KYC-30006', 'C-4426', 'Diplomatic Passport',      '2028-03-15', 'enhanced', '2026-09-15'],
      ['KYC-30007', 'C-4427', 'BR Number HK',             '2026-12-31', 'verified', '2026-12-01'],
      ['KYC-30008', 'C-4428', 'US Passport',              '2032-08-10', 'verified', '2029-08-10'],
      ['KYC-30009', 'C-4429', 'Mali Trade Registry',      '2026-05-30', 'expired',  '2026-05-15'],
      ['KYC-30010', 'C-4430', 'INE Mexico',               '2028-11-22', 'verified', '2027-11-22'],
      ['KYC-30011', 'C-4431', 'Swiss UID',                '2027-05-05', 'enhanced', '2026-11-05'],
      ['KYC-30012', 'C-4432', 'Emirates ID',              '2029-02-28', 'verified', '2028-02-28'],
      ['KYC-30013', 'C-4433', 'ACRA SG',                  '2027-07-18', 'verified', '2027-01-18'],
      ['KYC-30014', 'C-4434', 'Russian Passport',         '2026-04-30', 'expired',  '2026-04-15'],
      ['KYC-30015', 'C-4435', 'Cayman Companies Reg.',    '2027-03-12', 'enhanced', '2026-09-12'],
    ];
    for (const r of kyc_profiles) {
      await client.query(
        'INSERT INTO kyc_profiles (profile_id,customer_id,doc_type,expires_at,status,refresh_due) VALUES ($1,$2,$3,$4,$5,$6)',
        r
      );
    }

    // ─── watchlists (15) ──────────────────────────────────────────
    console.log('[seed] inserting watchlists...');
    const watchlists = [
      ['WL-001', 'OFAC SDN List',                'US',       '2026-05-15', 'v2026.05.15', 'active'],
      ['WL-002', 'OFAC Consolidated Sanctions',  'US',       '2026-05-15', 'v2026.05.15', 'active'],
      ['WL-003', 'EU Consolidated List',         'EU',       '2026-05-14', 'v3.2026.05',  'active'],
      ['WL-004', 'UN 1267 / Al-Qaida / Daesh',   'INTL',     '2026-05-12', 'v2026.05',    'active'],
      ['WL-005', 'UK HMT Financial Sanctions',   'UK',       '2026-05-15', 'v2026.05.15', 'active'],
      ['WL-006', 'BIS Denied Persons List',      'US',       '2026-05-10', 'v2026.05.10', 'active'],
      ['WL-007', 'DPL Entity List',              'US',       '2026-05-08', 'v2026.05.08', 'active'],
      ['WL-008', 'FATF High-Risk Jurisdictions', 'INTL',     '2026-04-30', 'v2026.04',    'active'],
      ['WL-009', 'PEP Global (Dow Jones)',       'INTL',     '2026-05-15', 'v2026.05',    'active'],
      ['WL-010', 'Canada OSFI',                  'CA',       '2026-05-13', 'v2026.05.13', 'active'],
      ['WL-011', 'Australia DFAT',               'AU',       '2026-05-12', 'v2026.05.12', 'active'],
      ['WL-012', 'Japan METI End-User List',     'JP',       '2026-05-09', 'v2026.05.09', 'active'],
      ['WL-013', 'Swiss SECO',                   'CH',       '2026-05-14', 'v2026.05.14', 'active'],
      ['WL-014', 'Internal Adverse Media',       'INTERNAL', '2026-05-15', 'v2026.05.15', 'active'],
      ['WL-015', 'World Bank Debarment',         'INTL',     '2026-05-11', 'v2026.05.11', 'active'],
    ];
    for (const r of watchlists) {
      await client.query(
        'INSERT INTO watchlists (list_id,name,jurisdiction,last_updated,version,status) VALUES ($1,$2,$3,$4,$5,$6)',
        r
      );
    }

    // ─── typologies (15) ──────────────────────────────────────────
    console.log('[seed] inserting typologies...');
    const typologies = [
      ['TYP-001', 'Structuring (Smurfing)',          'Multiple cash deposits below CTR threshold to evade reporting.',                  'high',     'CTR aggregation; velocity rules',           'active'],
      ['TYP-002', 'Trade-Based Money Laundering',    'Over/under-invoicing of goods to move value across borders.',                     'critical', 'Trade docs review; counterparty risk',      'active'],
      ['TYP-003', 'Shell Company Layering',          'Use of opaque BVI/Caymans entities to obscure beneficial ownership.',             'high',     'BO verification; jurisdiction risk',        'active'],
      ['TYP-004', 'Crypto Mixer Exposure',           'Funds traced through Tornado Cash or similar mixers.',                            'critical', 'Chain analytics; outbound monitoring',      'active'],
      ['TYP-005', 'PEP Misuse',                      'Politically-exposed person routing through private banking.',                     'high',     'EDD; senior management approval',           'active'],
      ['TYP-006', 'Funnel Account',                  'Inbound from many jurisdictions consolidating to single outbound.',               'high',     'Inbound diversity rule; outbound match',    'active'],
      ['TYP-007', 'Round-Tripping',                  'Funds move out and back through related entities to fabricate revenue.',          'medium',   'Counterparty graph; reversal detection',    'active'],
      ['TYP-008', 'Bust-Out Fraud',                  'Sudden max-out of credit lines then default.',                                    'medium',   'Credit utilization velocity',               'active'],
      ['TYP-009', 'Cash-Intensive Business Misuse',  'Legitimate cash-heavy business commingling illicit cash.',                        'medium',   'Cash deposit ratio vs industry norm',       'active'],
      ['TYP-010', 'Real Estate Laundering',          'High-value property purchases in cash or via anonymous LLCs.',                    'high',     'GTO compliance; BO of buyer LLC',           'active'],
      ['TYP-011', 'Hawala / IVTS',                   'Informal value transfer systems bypassing banking channels.',                     'high',     'Cash-out + cash-in matching',               'active'],
      ['TYP-012', 'Sanctions Evasion via Front',     'Use of front company in non-sanctioned jurisdiction.',                            'critical', 'Ownership trace; secondary screening',      'active'],
      ['TYP-013', 'Mule Account Network',            'Multiple low-value accounts forwarding funds in chain.',                          'medium',   'Account graph clustering',                  'active'],
      ['TYP-014', 'Insurance Premium Laundering',    'Overpayment of premium then refund to clean account.',                            'medium',   'Premium-to-payout anomaly',                 'active'],
      ['TYP-015', 'Charity / NGO Diversion',         'Non-profit channels funds to designated entities.',                               'high',     'Beneficiary screening; geo-risk',           'active'],
    ];
    for (const r of typologies) {
      await client.query(
        'INSERT INTO typologies (typology_id,name,description,severity,controls,status) VALUES ($1,$2,$3,$4,$5,$6)',
        r
      );
    }

    // ─── beneficial_owners (15) ───────────────────────────────────
    console.log('[seed] inserting beneficial_owners...');
    const beneficial_owners = [
      ['BO-5001', 'C-4421', 'Robert Sanderson',     'US',  51.0, true ],
      ['BO-5002', 'C-4421', 'Linda Sanderson',      'US',  25.0, true ],
      ['BO-5003', 'C-4423', 'Maxim Sokolov',        'RU',  60.0, false],
      ['BO-5004', 'C-4423', 'Pacific Nominees Ltd', 'VG',  40.0, false],
      ['BO-5005', 'C-4425', 'Carlos Mendoza',       'PA', 100.0, true ],
      ['BO-5006', 'C-4427', 'Wei Chen',             'HK',  75.0, true ],
      ['BO-5007', 'C-4429', 'Issa Diallo',          'ML',  55.0, true ],
      ['BO-5008', 'C-4429', 'Sahara Holdings SARL', 'CH',  45.0, false],
      ['BO-5009', 'C-4431', 'Klaus Weber',          'CH',  50.0, true ],
      ['BO-5010', 'C-4431', 'BlockChain Capital',   'KY',  50.0, false],
      ['BO-5011', 'C-4433', 'Lim Wei Ming',         'SG', 100.0, true ],
      ['BO-5012', 'C-4435', 'Trustco Nominee #4',   'KY', 100.0, false],
      ['BO-5013', 'C-4422', 'Sergey Volkov',        'RU', 100.0, true ],
      ['BO-5014', 'C-4426', 'Vladimir Petrov',      'RU',  80.0, false],
      ['BO-5015', 'C-4434', 'Dmitry Ivanov',        'RU', 100.0, false],
    ];
    for (const r of beneficial_owners) {
      await client.query(
        'INSERT INTO beneficial_owners (owner_id,entity_id,name,country,pct_ownership,verified) VALUES ($1,$2,$3,$4,$5,$6)',
        r
      );
    }

    // ─── peps (15) ────────────────────────────────────────────────
    console.log('[seed] inserting peps...');
    const peps = [
      ['PEP-001', 'Vladimir Petrov',     'RU', 'Deputy Energy Minister',           '2018-03-01', 'active'],
      ['PEP-002', 'Olga Ivanova',        'RU', 'Regional Governor (Krasnodar)',    '2020-09-15', 'active'],
      ['PEP-003', 'Adebayo Okonkwo',     'NG', 'Petroleum Ministry SA',            '2019-05-20', 'active'],
      ['PEP-004', 'Ricardo Vasquez',     'VE', 'Central Bank Board',               '2021-01-10', 'active'],
      ['PEP-005', 'Issa Diallo',         'ML', 'Mining Cabinet member',            '2022-04-12', 'active'],
      ['PEP-006', 'Karim Mansour',       'EG', 'Senior General - military',        '2017-08-08', 'active'],
      ['PEP-007', 'Sofia Petrescu',      'RO', 'EU Parliament member',             '2019-07-02', 'active'],
      ['PEP-008', 'Jin-soo Park',        'KP', 'Workers Party Central Committee',  '2015-06-01', 'restricted'],
      ['PEP-009', 'Asif Khan',           'PK', 'ISI senior officer (retired)',     '2010-11-30', 'former'],
      ['PEP-010', 'Maria Hernandez',     'MX', 'State Attorney General',           '2023-02-14', 'active'],
      ['PEP-011', 'Wang Jianhua',        'CN', 'Provincial Party Secretary',       '2020-10-01', 'active'],
      ['PEP-012', 'Ahmed Al-Rashid',     'AE', 'Sovereign Wealth Fund director',   '2021-03-22', 'active'],
      ['PEP-013', 'James Carrington',    'GB', 'House of Lords member',            '2018-11-11', 'active'],
      ['PEP-014', 'Yelena Kuznetsova',   'BY', 'Presidential Administration',      '2016-09-09', 'active'],
      ['PEP-015', 'Roberto Da Silva',    'BR', 'State Development Bank board',     '2022-12-05', 'active'],
    ];
    for (const r of peps) {
      await client.query(
        'INSERT INTO peps (pep_id,name,country,role,since,status) VALUES ($1,$2,$3,$4,$5,$6)',
        r
      );
    }

    // ─── jurisdictions (15) ───────────────────────────────────────
    console.log('[seed] inserting jurisdictions...');
    const jurisdictions = [
      ['JUR-001', 'United States',           'compliant',   20,  'baseline',      '2026-04-30'],
      ['JUR-002', 'United Kingdom',          'compliant',   22,  'baseline',      '2026-04-30'],
      ['JUR-003', 'British Virgin Islands',  'enhanced',    72,  'monitored',     '2026-05-01'],
      ['JUR-004', 'Cayman Islands',          'enhanced',    70,  'monitored',     '2026-05-01'],
      ['JUR-005', 'Russia',                  'high-risk',   96,  'comprehensive', '2026-05-10'],
      ['JUR-006', 'North Korea (DPRK)',      'high-risk',  100,  'comprehensive', '2026-05-10'],
      ['JUR-007', 'Iran',                    'high-risk',   99,  'comprehensive', '2026-05-10'],
      ['JUR-008', 'Panama',                  'enhanced',    65,  'monitored',     '2026-05-02'],
      ['JUR-009', 'Hong Kong',               'compliant',   45,  'baseline',      '2026-04-28'],
      ['JUR-010', 'Singapore',               'compliant',   18,  'baseline',      '2026-04-28'],
      ['JUR-011', 'Switzerland',             'compliant',   28,  'baseline',      '2026-04-30'],
      ['JUR-012', 'United Arab Emirates',    'enhanced',    58,  'monitored',     '2026-05-03'],
      ['JUR-013', 'Mali',                    'high-risk',   88,  'targeted',      '2026-05-05'],
      ['JUR-014', 'Mexico',                  'compliant',   52,  'baseline',      '2026-04-29'],
      ['JUR-015', 'Venezuela',               'high-risk',   90,  'comprehensive', '2026-05-08'],
    ];
    for (const r of jurisdictions) {
      await client.query(
        'INSERT INTO jurisdictions (jur_id,country,fatf_rating,risk_score,sanctions_status,last_review) VALUES ($1,$2,$3,$4,$5,$6)',
        r
      );
    }

    // ─── investigations (15) ──────────────────────────────────────
    console.log('[seed] inserting investigations...');
    const investigations = [
      ['INV-2026-001', 'SAR-2026-0001', 'Track ATM clusters near Miami branch',           'open',    '2026-05-12 09:30+00', 'analyst@aml.io'],
      ['INV-2026-002', 'SAR-2026-0002', 'Trace BVI shell network counterparties',         'open',    '2026-05-08 14:30+00', 'compliance@aml.io'],
      ['INV-2026-003', 'SAR-2026-0003', 'Review PEP private banking transactions',        'open',    '2026-05-10 11:30+00', 'compliance@aml.io'],
      ['INV-2026-004', 'SAR-2026-0004', 'Chain analytics on Tornado Cash outflow',        'open',    '2026-05-13 12:30+00', 'analyst@aml.io'],
      ['INV-2026-005', 'SAR-2026-0005', 'Audit Sahel mining export invoices',             'pending', '2026-05-07 10:00+00', 'compliance@aml.io'],
      ['INV-2026-006', 'SAR-2026-0006', 'Identify SDN-linked counterparty entities',      'closed',  '2026-05-09 15:30+00', 'compliance@aml.io'],
      ['INV-2026-007', 'SAR-2026-0007', 'Verify dormant-to-active activity origin',       'open',    '2026-05-11 08:30+00', 'analyst@aml.io'],
      ['INV-2026-008', 'SAR-2026-0008', 'Pierce Caribbean trust BO veil',                 'open',    '2026-05-12 16:30+00', 'compliance@aml.io'],
      ['INV-2026-009', 'SAR-2026-0009', 'Map 12 sub-account smurfing graph',              'pending', '2026-05-06 10:30+00', 'analyst@aml.io'],
      ['INV-2026-010', 'SAR-2026-0010', 'Assess Macau correspondent risk concentration',  'open',    '2026-05-10 14:30+00', 'compliance@aml.io'],
      ['INV-2026-011', 'SAR-2026-0011', 'ATM video review structuring pattern',           'open',    '2026-05-13 09:30+00', 'analyst@aml.io'],
      ['INV-2026-012', 'SAR-2026-0012', 'Map funnel account inbound jurisdictions',       'open',    '2026-05-09 13:30+00', 'analyst@aml.io'],
      ['INV-2026-013', 'SAR-2026-0013', 'Audit SG-ID round-trip trade docs',              'closed',  '2026-05-05 11:30+00', 'compliance@aml.io'],
      ['INV-2026-014', 'SAR-2026-0014', 'GTO compliance audit on property purchase',      'open',    '2026-05-08 17:30+00', 'analyst@aml.io'],
      ['INV-2026-015', 'SAR-2026-0015', 'Forensic account takeover indicators',           'open',    '2026-05-12 20:30+00', 'analyst@aml.io'],
    ];
    for (const r of investigations) {
      await client.query(
        'INSERT INTO investigations (inv_id,case_id,lead,status,opened_at,owner) VALUES ($1,$2,$3,$4,$5,$6)',
        r
      );
    }

    // ─── alerts (15) ──────────────────────────────────────────────
    console.log('[seed] inserting alerts...');
    const alerts = [
      ['ALT-2026-0001', 'C-4421', 'Structuring - 3+ deposits below $10k in 7 days', 'high',     '2026-05-12 09:01+00', 'open'],
      ['ALT-2026-0002', 'C-4423', 'Large outbound wire to high-risk jurisdiction',  'critical', '2026-05-08 14:01+00', 'investigating'],
      ['ALT-2026-0003', 'C-4426', 'PEP transaction > $100k threshold',              'high',     '2026-05-10 11:01+00', 'open'],
      ['ALT-2026-0004', 'C-4431', 'Crypto counterparty matches mixer signature',    'critical', '2026-05-13 11:19+00', 'open'],
      ['ALT-2026-0005', 'C-4429', 'Trade payment 4x avg invoice value',             'high',     '2026-05-07 08:41+00', 'investigating'],
      ['ALT-2026-0006', 'C-4434', 'Frozen account attempted outbound',              'critical', '2026-05-12 15:32+00', 'closed'],
      ['ALT-2026-0007', 'C-4422', 'Sanctions name match (score 87)',                'high',     '2026-05-09 10:00+00', 'open'],
      ['ALT-2026-0008', 'C-4435', 'BO ownership over 25% in monitored jurisdiction','medium',   '2026-05-12 16:00+00', 'open'],
      ['ALT-2026-0009', 'C-4427', 'Macau correspondent - repeated activity',        'medium',   '2026-05-12 02:15+00', 'open'],
      ['ALT-2026-0010', 'C-4425', 'Funnel pattern detected, 8 source jurisdictions','high',     '2026-05-11 13:01+00', 'investigating'],
      ['ALT-2026-0011', 'C-4424', 'Account takeover indicators: device + geo',      'medium',   '2026-05-12 20:00+00', 'open'],
      ['ALT-2026-0012', 'C-4432', 'High-value cash buy of luxury property',         'medium',   '2026-05-09 12:12+00', 'open'],
      ['ALT-2026-0013', 'C-4433', 'Round-trip SG to ID to SG within 96h',           'high',     '2026-05-13 06:43+00', 'closed'],
      ['ALT-2026-0014', 'C-4430', 'New mule account chain link detected',           'medium',   '2026-05-10 09:00+00', 'open'],
      ['ALT-2026-0015', 'C-4428', 'Unusual ATM withdrawal pattern',                 'low',      '2026-05-14 18:23+00', 'closed'],
    ];
    for (const r of alerts) {
      await client.query(
        'INSERT INTO alerts (alert_id,customer_id,rule,severity,opened_at,status) VALUES ($1,$2,$3,$4,$5,$6)',
        r
      );
    }

    // ─── audit_log (15) ───────────────────────────────────────────
    console.log('[seed] inserting audit_log...');
    const audit_log = [
      ['AUD-100001', 'compliance@aml.io', 'SAR-2026-0002', 'file_sar',           'success',  '2026-05-08 14:30+00'],
      ['AUD-100002', 'analyst@aml.io',    'C-4421',        'open_case',          'success',  '2026-05-12 09:00+00'],
      ['AUD-100003', 'compliance@aml.io', 'ACC-10015',     'freeze_account',     'success',  '2026-05-09 16:00+00'],
      ['AUD-100004', 'analyst@aml.io',    'HIT-7001',      'review_hit',         'pending',  '2026-05-09 10:30+00'],
      ['AUD-100005', 'compliance@aml.io', 'EDD-9001',      'open_edd',           'success',  '2026-05-10 11:00+00'],
      ['AUD-100006', 'viewer@aml.io',     'C-4426',        'view_customer',      'success',  '2026-05-10 11:05+00'],
      ['AUD-100007', 'analyst@aml.io',    'INV-2026-004',  'add_evidence',       'success',  '2026-05-13 13:00+00'],
      ['AUD-100008', 'compliance@aml.io', 'CTR-2026-0014', 'approve_filing',     'success',  '2026-05-12 17:30+00'],
      ['AUD-100009', 'analyst@aml.io',    'C-4434',        'flag_customer',      'success',  '2026-05-09 15:30+00'],
      ['AUD-100010', 'compliance@aml.io', 'REG-2026-001',  'submit_regfiling',   'success',  '2026-05-11 18:00+00'],
      ['AUD-100011', 'analyst@aml.io',    'TXN-90006',     'investigate_txn',    'success',  '2026-05-13 12:00+00'],
      ['AUD-100012', 'compliance@aml.io', 'KYC-30009',     'mark_expired',       'success',  '2026-05-15 09:00+00'],
      ['AUD-100013', 'analyst@aml.io',    'ALT-2026-0010', 'escalate_alert',     'success',  '2026-05-11 13:30+00'],
      ['AUD-100014', 'compliance@aml.io', 'BO-5012',       'request_evidence',   'pending',  '2026-05-12 17:00+00'],
      ['AUD-100015', 'viewer@aml.io',     'dashboard',     'view_dashboard',     'success',  '2026-05-15 08:00+00'],
    ];
    for (const r of audit_log) {
      await client.query(
        'INSERT INTO audit_log (entry_id,actor,target,action,result,ts) VALUES ($1,$2,$3,$4,$5,$6)',
        r
      );
    }

    // ─── source_of_funds (15) ─────────────────────────────────────
    console.log('[seed] inserting source_of_funds...');
    const source_of_funds = [
      ['SOF-8001', 'C-4421', 'Business revenue',     1200000.00, 'Audited financials 2025',     'verified'],
      ['SOF-8002', 'C-4422', 'Inheritance',           850000.00, 'Notarized will Russia',       'review'],
      ['SOF-8003', 'C-4423', 'Asset sale',           4500000.00, 'Property sale deed BVI',      'pending'],
      ['SOF-8004', 'C-4424', 'Salary',                 72000.00, 'Italian employer payslips',   'verified'],
      ['SOF-8005', 'C-4425', 'Trade income',         1800000.00, 'Bill of lading set',          'verified'],
      ['SOF-8006', 'C-4426', 'Family wealth',        9500000.00, 'Russian trust statement',     'review'],
      ['SOF-8007', 'C-4427', 'Business revenue',      650000.00, 'HK audited accounts',         'verified'],
      ['SOF-8008', 'C-4428', 'Salary',                 95000.00, 'W-2 + 1099',                  'verified'],
      ['SOF-8009', 'C-4429', 'Mining royalties',     2200000.00, 'Mali mining contract',        'pending'],
      ['SOF-8010', 'C-4430', 'Remittances',            18000.00, 'Family wire records',         'verified'],
      ['SOF-8011', 'C-4431', 'Crypto liquidation',   3800000.00, 'Exchange statement',          'review'],
      ['SOF-8012', 'C-4432', 'Investment dividends', 1450000.00, 'SWF distribution slip',       'verified'],
      ['SOF-8013', 'C-4433', 'Trade revenue',         720000.00, 'Singapore audited accounts',  'verified'],
      ['SOF-8014', 'C-4434', 'Unknown',              4200000.00, 'No documentation provided',   'rejected'],
      ['SOF-8015', 'C-4435', 'Trust distribution',   5800000.00, 'Cayman trust deed',           'pending'],
    ];
    for (const r of source_of_funds) {
      await client.query(
        'INSERT INTO source_of_funds (sof_id,customer_id,source_type,amount,evidence,status) VALUES ($1,$2,$3,$4,$5,$6)',
        r
      );
    }

    // ─── edd_cases (15) ───────────────────────────────────────────
    console.log('[seed] inserting edd_cases...');
    const edd_cases = [
      ['EDD-9001', 'C-4426', 'PEP designation',                            'open',    '2026-05-10 11:00+00', 'compliance@aml.io'],
      ['EDD-9002', 'C-4423', 'BVI shell + 25%+ opaque BO',                 'open',    '2026-05-08 14:30+00', 'compliance@aml.io'],
      ['EDD-9003', 'C-4434', 'OFAC SDN confirmed match',                   'review',  '2026-05-09 16:00+00', 'compliance@aml.io'],
      ['EDD-9004', 'C-4429', 'High-risk jurisdiction + mining sector',     'open',    '2026-05-07 09:30+00', 'compliance@aml.io'],
      ['EDD-9005', 'C-4431', 'Crypto mixer exposure',                      'open',    '2026-05-13 12:00+00', 'analyst@aml.io'],
      ['EDD-9006', 'C-4422', 'Sanctions name match score 87',              'open',    '2026-05-09 10:30+00', 'compliance@aml.io'],
      ['EDD-9007', 'C-4435', 'Caribbean trust opaque structure',           'open',    '2026-05-12 16:30+00', 'compliance@aml.io'],
      ['EDD-9008', 'C-4427', 'Macau correspondent concentration',          'review',  '2026-05-10 14:30+00', 'compliance@aml.io'],
      ['EDD-9009', 'C-4421', 'Suspected structuring',                      'open',    '2026-05-12 09:30+00', 'analyst@aml.io'],
      ['EDD-9010', 'C-4425', 'Trade-based ML indicators',                  'open',    '2026-05-07 10:30+00', 'compliance@aml.io'],
      ['EDD-9011', 'C-4432', 'Luxury property cash purchase',              'review',  '2026-05-09 12:30+00', 'analyst@aml.io'],
      ['EDD-9012', 'C-4430', 'Funnel account pattern',                     'open',    '2026-05-10 09:00+00', 'analyst@aml.io'],
      ['EDD-9013', 'C-4433', 'Round-tripping indicators',                  'closed',  '2026-05-05 11:00+00', 'compliance@aml.io'],
      ['EDD-9014', 'C-4424', 'Account takeover indicators',                'review',  '2026-05-12 20:00+00', 'analyst@aml.io'],
      ['EDD-9015', 'C-4428', 'Adverse media match',                        'closed',  '2026-05-14 09:00+00', 'analyst@aml.io'],
    ];
    for (const r of edd_cases) {
      await client.query(
        'INSERT INTO edd_cases (edd_id,customer_id,trigger,status,opened_at,owner) VALUES ($1,$2,$3,$4,$5,$6)',
        r
      );
    }

    // ─── regulatory_filings (15) ──────────────────────────────────
    console.log('[seed] inserting regulatory_filings...');
    const regulatory_filings = [
      ['REG-2026-001', 'SAR',           '2026-04',  'filed',  '2026-05-08 14:30+00', 'compliance@aml.io'],
      ['REG-2026-002', 'CTR',           '2026-W18', 'filed',  '2026-05-05 18:00+00', 'compliance@aml.io'],
      ['REG-2026-003', 'SAR',           '2026-04',  'filed',  '2026-05-09 15:30+00', 'compliance@aml.io'],
      ['REG-2026-004', 'CTR',           '2026-W19', 'filed',  '2026-05-12 18:00+00', 'compliance@aml.io'],
      ['REG-2026-005', 'FBAR',          '2025',     'filed',  '2026-04-15 12:00+00', 'compliance@aml.io'],
      ['REG-2026-006', '8300',          '2026-04',  'filed',  '2026-05-10 09:00+00', 'compliance@aml.io'],
      ['REG-2026-007', 'SAR',           '2026-05',  'draft',  null,                  'analyst@aml.io'],
      ['REG-2026-008', 'CTR',           '2026-W20', 'review', null,                  'compliance@aml.io'],
      ['REG-2026-009', 'OFAC',          '2026-Q1',  'filed',  '2026-04-30 17:00+00', 'compliance@aml.io'],
      ['REG-2026-010', 'BSA-CIP',       '2026-Q1',  'filed',  '2026-04-30 17:00+00', 'compliance@aml.io'],
      ['REG-2026-011', 'SAR',           '2026-05',  'draft',  null,                  'analyst@aml.io'],
      ['REG-2026-012', 'CTR',           '2026-W20', 'draft',  null,                  'analyst@aml.io'],
      ['REG-2026-013', 'FinCEN-314a',   '2026-04',  'filed',  '2026-05-01 12:00+00', 'compliance@aml.io'],
      ['REG-2026-014', 'SAR',           '2026-05',  'review', null,                  'compliance@aml.io'],
      ['REG-2026-015', 'OFAC-Blocked',  '2026-04',  'filed',  '2026-05-02 12:00+00', 'compliance@aml.io'],
    ];
    for (const r of regulatory_filings) {
      await client.query(
        'INSERT INTO regulatory_filings (filing_id,type,period,status,filed_at,filer) VALUES ($1,$2,$3,$4,$5,$6)',
        r
      );
    }

    // ─── RBAC users (3) ───────────────────────────────────────────
    console.log('[seed] inserting users...');
    const users = [
      ['compliance@aml.io', 'admin123',   'Compliance Officer', 'commander'],
      ['analyst@aml.io',    'analyst123', 'AML Analyst',        'analyst'],
      ['viewer@aml.io',     'viewer123',  'View-Only',          'viewer'],
    ];
    for (const u of users) {
      await client.query(
        'INSERT INTO users (email,password,name,role) VALUES ($1,$2,$3,$4)',
        u
      );
    }

    // ─── Notifications (sample) ───────────────────────────────────
    console.log('[seed] inserting notifications...');
    const notifications = [
      [1, 'Critical sanctions hit',    'OFAC SDN confirmed match on C-4434 (Olga Ivanova)', 'critical', 'sanctions_hits'],
      [1, 'SAR filed',                 'SAR-2026-0002 layering case filed',                  'high',     'sar_cases'],
      [1, 'Crypto mixer exposure',     'C-4431 outbound traced to Tornado Cash 0xDEAD..',   'critical', 'alerts'],
      [2, 'KYC expired',               'C-4429 Mali Trade Registry doc expired',             'high',     'kyc_profiles'],
      [2, 'PEP private banking flow',  'Vladimir Petrov (C-4426) - review opened',           'high',     'sar_cases'],
    ];
    for (const n of notifications) {
      await client.query(
        'INSERT INTO notifications (user_id,title,body,severity,source) VALUES ($1,$2,$3,$4,$5)',
        n
      );
    }

    // ─── Webhooks (sample) ────────────────────────────────────────
    console.log('[seed] inserting webhooks...');
    const webhooks = [
      ['FinCEN SAR Bridge',     'https://httpbin.org/post', 'sec_fincen_2026', 'sar.filed,sar.created',     true],
      ['OFAC Blocked Property', 'https://httpbin.org/post', 'sec_ofac_2026',   'sanctions_hits.confirmed',  true],
    ];
    for (const w of webhooks) {
      await client.query(
        'INSERT INTO webhooks (name,url,secret,events,active) VALUES ($1,$2,$3,$4,$5)',
        w
      );
    }

    console.log('[seed] complete.');
  } catch (e) {
    console.error('[seed] error:', e);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();

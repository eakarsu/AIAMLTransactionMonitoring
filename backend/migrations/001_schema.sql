-- AIAMLTransactionMonitoring schema
-- 18 AML/BSA compliance entities: transaction monitoring, sanctions screening,
-- SAR/CTR filing, KYC, EDD, investigation workflow.

CREATE TABLE IF NOT EXISTS customers (
  id              SERIAL PRIMARY KEY,
  customer_id     VARCHAR(50) UNIQUE,
  name            VARCHAR(200) NOT NULL,
  type            VARCHAR(40),
  country         VARCHAR(80),
  risk_tier       VARCHAR(20) DEFAULT 'low',
  status          VARCHAR(30) DEFAULT 'active',
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accounts (
  id              SERIAL PRIMARY KEY,
  account_id      VARCHAR(50) UNIQUE,
  customer_id     VARCHAR(50),
  type            VARCHAR(40),
  balance         NUMERIC(18,2) DEFAULT 0,
  currency        VARCHAR(10) DEFAULT 'USD',
  status          VARCHAR(30) DEFAULT 'open',
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id              SERIAL PRIMARY KEY,
  txn_id          VARCHAR(50) UNIQUE,
  account_id      VARCHAR(50),
  amount          NUMERIC(18,2) DEFAULT 0,
  currency        VARCHAR(10) DEFAULT 'USD',
  counterparty    VARCHAR(200),
  ts              TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sanctions_hits (
  id              SERIAL PRIMARY KEY,
  hit_id          VARCHAR(50) UNIQUE,
  customer_id     VARCHAR(50),
  list            VARCHAR(80),
  score           INTEGER DEFAULT 0,
  matched_field   VARCHAR(80),
  status          VARCHAR(30) DEFAULT 'open',
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sar_cases (
  id              SERIAL PRIMARY KEY,
  case_id         VARCHAR(50) UNIQUE,
  customer_id     VARCHAR(50),
  suspicion       VARCHAR(300),
  status          VARCHAR(30) DEFAULT 'open',
  opened_at       TIMESTAMPTZ,
  owner           VARCHAR(120),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ctrs (
  id              SERIAL PRIMARY KEY,
  ctr_id          VARCHAR(50) UNIQUE,
  customer_id     VARCHAR(50),
  aggregate_amount NUMERIC(18,2) DEFAULT 0,
  period          VARCHAR(40),
  filed_at        TIMESTAMPTZ,
  status          VARCHAR(30) DEFAULT 'pending',
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kyc_profiles (
  id              SERIAL PRIMARY KEY,
  profile_id      VARCHAR(50) UNIQUE,
  customer_id     VARCHAR(50),
  doc_type        VARCHAR(60),
  expires_at      DATE,
  status          VARCHAR(30) DEFAULT 'verified',
  refresh_due     DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS watchlists (
  id              SERIAL PRIMARY KEY,
  list_id         VARCHAR(50) UNIQUE,
  name            VARCHAR(120),
  jurisdiction    VARCHAR(80),
  last_updated    DATE,
  version         VARCHAR(40),
  status          VARCHAR(30) DEFAULT 'active',
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS typologies (
  id              SERIAL PRIMARY KEY,
  typology_id     VARCHAR(50) UNIQUE,
  name            VARCHAR(160),
  description     TEXT,
  severity        VARCHAR(20) DEFAULT 'medium',
  controls        TEXT,
  status          VARCHAR(30) DEFAULT 'active',
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS beneficial_owners (
  id              SERIAL PRIMARY KEY,
  owner_id        VARCHAR(50) UNIQUE,
  entity_id       VARCHAR(50),
  name            VARCHAR(200),
  country         VARCHAR(80),
  pct_ownership   NUMERIC(5,2) DEFAULT 0,
  verified        BOOLEAN DEFAULT FALSE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS peps (
  id              SERIAL PRIMARY KEY,
  pep_id          VARCHAR(50) UNIQUE,
  name            VARCHAR(200),
  country         VARCHAR(80),
  role            VARCHAR(200),
  since           DATE,
  status          VARCHAR(30) DEFAULT 'active',
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jurisdictions (
  id              SERIAL PRIMARY KEY,
  jur_id          VARCHAR(50) UNIQUE,
  country         VARCHAR(80),
  fatf_rating     VARCHAR(40),
  risk_score      INTEGER DEFAULT 0,
  sanctions_status VARCHAR(40),
  last_review     DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS investigations (
  id              SERIAL PRIMARY KEY,
  inv_id          VARCHAR(50) UNIQUE,
  case_id         VARCHAR(50),
  lead            VARCHAR(200),
  status          VARCHAR(30) DEFAULT 'open',
  opened_at       TIMESTAMPTZ,
  owner           VARCHAR(120),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alerts (
  id              SERIAL PRIMARY KEY,
  alert_id        VARCHAR(50) UNIQUE,
  customer_id     VARCHAR(50),
  rule            VARCHAR(160),
  severity        VARCHAR(20) DEFAULT 'medium',
  opened_at       TIMESTAMPTZ,
  status          VARCHAR(30) DEFAULT 'open',
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id              SERIAL PRIMARY KEY,
  entry_id        VARCHAR(50) UNIQUE,
  actor           VARCHAR(160),
  target          VARCHAR(200),
  action          VARCHAR(120),
  result          VARCHAR(60),
  ts              TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS source_of_funds (
  id              SERIAL PRIMARY KEY,
  sof_id          VARCHAR(50) UNIQUE,
  customer_id     VARCHAR(50),
  source_type     VARCHAR(80),
  amount          NUMERIC(18,2) DEFAULT 0,
  evidence        VARCHAR(300),
  status          VARCHAR(30) DEFAULT 'pending',
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS edd_cases (
  id              SERIAL PRIMARY KEY,
  edd_id          VARCHAR(50) UNIQUE,
  customer_id     VARCHAR(50),
  trigger         VARCHAR(200),
  status          VARCHAR(30) DEFAULT 'open',
  opened_at       TIMESTAMPTZ,
  owner           VARCHAR(120),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS regulatory_filings (
  id              SERIAL PRIMARY KEY,
  filing_id       VARCHAR(50) UNIQUE,
  type            VARCHAR(60),
  period          VARCHAR(40),
  status          VARCHAR(30) DEFAULT 'draft',
  filed_at        TIMESTAMPTZ,
  filer           VARCHAR(160),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_results (
  id              SERIAL PRIMARY KEY,
  feature         VARCHAR(80) NOT NULL,
  input           JSONB,
  output          JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_results_feature_created
  ON ai_results (feature, created_at DESC);

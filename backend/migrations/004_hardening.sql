ALTER TABLE users ALTER COLUMN password TYPE VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) NOT NULL DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users (tenant_id, email);

CREATE TABLE IF NOT EXISTS normalized_transactions (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  source VARCHAR(80) NOT NULL,
  source_event_id VARCHAR(160) NOT NULL,
  account_id VARCHAR(120) NOT NULL,
  customer_id VARCHAR(120),
  amount NUMERIC(20,4) NOT NULL CHECK (amount > 0),
  currency CHAR(3) NOT NULL,
  direction VARCHAR(12) NOT NULL CHECK (direction IN ('credit','debit')),
  counterparty VARCHAR(240),
  occurred_at TIMESTAMPTZ NOT NULL,
  signals JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_hash CHAR(64) NOT NULL,
  ingested_by INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, source, source_event_id)
);
CREATE INDEX IF NOT EXISTS idx_normalized_tx_tenant_time ON normalized_transactions (tenant_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS monitoring_alerts (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  transaction_id BIGINT NOT NULL REFERENCES normalized_transactions(id),
  risk_score INTEGER NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
  severity VARCHAR(16) NOT NULL,
  typologies JSONB NOT NULL,
  explanation JSONB NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'open',
  created_by INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_monitoring_alert_tenant_status ON monitoring_alerts (tenant_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS watchlist_snapshots (
  id BIGSERIAL PRIMARY KEY, tenant_id VARCHAR(64) NOT NULL, source VARCHAR(120) NOT NULL,
  version VARCHAR(120) NOT NULL, published_at TIMESTAMPTZ, checksum CHAR(64) NOT NULL,
  entry_count INTEGER NOT NULL, imported_by INTEGER NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, source, version)
);
CREATE TABLE IF NOT EXISTS watchlist_snapshot_entries (
  id BIGSERIAL PRIMARY KEY, snapshot_id BIGINT NOT NULL REFERENCES watchlist_snapshots(id) ON DELETE CASCADE,
  external_id VARCHAR(160) NOT NULL, name VARCHAR(255) NOT NULL, normalized_name VARCHAR(255) NOT NULL,
  list_name VARCHAR(160), jurisdictions JSONB NOT NULL DEFAULT '[]'::jsonb, metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_watchlist_normalized_name ON watchlist_snapshot_entries (normalized_name);

CREATE TABLE IF NOT EXISTS analyst_dispositions (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  alert_id BIGINT NOT NULL REFERENCES monitoring_alerts(id),
  disposition VARCHAR(32) NOT NULL CHECK (disposition IN ('false_positive','monitor','escalate','sar_review')),
  reason TEXT NOT NULL,
  analyst_id INTEGER NOT NULL,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS compliance_audit_events (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  actor_id INTEGER,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(80) NOT NULL,
  resource_id VARCHAR(160) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_tenant ON compliance_audit_events (tenant_id, created_at DESC);
CREATE OR REPLACE FUNCTION prevent_compliance_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'compliance audit events are immutable'; END $$;
DROP TRIGGER IF EXISTS compliance_audit_immutable ON compliance_audit_events;
CREATE TRIGGER compliance_audit_immutable BEFORE UPDATE OR DELETE ON compliance_audit_events FOR EACH ROW EXECUTE FUNCTION prevent_compliance_audit_mutation();

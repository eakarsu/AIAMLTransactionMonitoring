# AML monitoring operations

Startup is intentionally read-only. It never installs dependencies, creates a database, runs migrations, provisions users, seeds records, or terminates unrelated processes.

## Explicit bootstrap

1. Copy `.env.example` to an untracked `.env` and replace every placeholder.
2. Create an empty PostgreSQL database and least-privilege application role outside this repository.
3. Run `npm run migrate` once per release. The runner checks checksums and refuses changed applied migrations.
4. Set `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, and `SEED_TENANT_ID`, then run `npm run create-admin` explicitly.
5. Run `npm test`, then `npm start`.

`npm run seed:demo` is destructive and remains blocked unless `ALLOW_DESTRUCTIVE_SEED=true`. It is never part of startup.

## Supported hardened workflow

- `POST /api/monitoring/transactions`: idempotent normalized transaction ingestion and deterministic scoring.
- `GET /api/monitoring/alerts`: tenant-scoped alert queue.
- `POST /api/monitoring/alerts/:id/disposition`: reasoned human disposition with segregation of duties.
- `POST /api/monitoring/backtest`: labeled precision/recall/false-positive evaluation.
- `POST /api/monitoring/watchlists/snapshots`: versioned, checksummed watchlist import.

Legacy global CRUD/AI routes are disabled by default because they predate tenant isolation. The development override must not be used for multi-tenant or sensitive data.

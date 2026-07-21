const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { authenticateToken } = require('./middleware/auth');
const pool = require('./config/database');
const { fireWebhook } = require('./services/webhooks');
const { getJwtSecret } = require('./lib/security');

const app = express();
const PORT = process.env.BACKEND_PORT || 3069;
try { getJwtSecret(); } catch (error) { console.error(`Configuration error: ${error.message}`); process.exit(1); }

// Middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3068,http://localhost:3069,http://localhost:3000')
  .split(',').map((o) => o.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Health check (public)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth (public)
app.use('/api/auth', require('./routes/auth'));

// Everything below requires a Bearer token.
app.use('/api', authenticateToken);
app.use('/api/monitoring', require('./routes/monitoringWorkflow'));
app.use('/api/monitoring/watchlists', require('./routes/watchlistIngestion'));
app.use('/api', (req, res, next) => {
  if (process.env.ENABLE_LEGACY_GLOBAL_ROUTES === 'true' || req.path.startsWith('/monitoring')) return next();
  return res.status(503).json({
    error: 'Legacy global routes are disabled because they are not tenant-isolated',
    supported_workflow: '/api/monitoring',
    development_override: 'ENABLE_LEGACY_GLOBAL_ROUTES=true',
  });
});

// 18 AML CRUD entities
app.use('/api/customers',           require('./routes/customers'));
app.use('/api/accounts',            require('./routes/accounts'));
app.use('/api/transactions',        require('./routes/transactions'));
app.use('/api/sanctions-hits',      require('./routes/sanctionsHits'));
app.use('/api/sar-cases',           require('./routes/sarCases'));
app.use('/api/ctrs',                require('./routes/ctrs'));
app.use('/api/kyc-profiles',        require('./routes/kycProfiles'));
app.use('/api/watchlists',          require('./routes/watchlists'));
app.use('/api/typologies',          require('./routes/typologies'));
app.use('/api/beneficial-owners',   require('./routes/beneficialOwners'));
app.use('/api/peps',                require('./routes/peps'));
app.use('/api/jurisdictions',       require('./routes/jurisdictions'));
app.use('/api/investigations',      require('./routes/investigations'));
app.use('/api/alerts',              require('./routes/alerts'));
app.use('/api/audit-log',           require('./routes/auditLog'));
app.use('/api/source-of-funds',     require('./routes/sourceOfFunds'));
app.use('/api/edd-cases',           require('./routes/eddCases'));
app.use('/api/regulatory-filings',  require('./routes/regulatoryFilings'));

// AI routes (16 sub-endpoints + history under /api/ai)
app.use('/api/ai', require('./routes/ai'));

// Cross-cutting
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/attachments',   require('./routes/attachments'));
app.use('/api/webhooks',      require('./routes/webhooks'));

// Dashboard stats
app.use('/api/dashboard', require('./routes/dashboard'));

// Custom domain compliance views (network graph, timeline, heatmap, funnel)
app.use('/api/custom-views', require('./routes/customViews'));

// Pass 7 — backlog implementation
app.use('/api/peer-benchmarks', require('./routes/peerBenchmarks'));    // MECHANICAL #3
app.use('/api/ingestion',       require('./routes/ingestion'));         // NEEDS-CREDS (503 stub) + product-decision default
app.use('/api/case-workflow',   require('./routes/caseWorkflow'));      // NEEDS-PRODUCT-DECISION default
app.use('/api/escalation',      require('./routes/escalation'));        // NEEDS-PRODUCT-DECISION default
app.use('/api/fincen-exports',  require('./routes/fincenExport'));      // NEEDS-SCHEMA
app.use('/api/advisory',        require('./routes/advisory'));          // TOO-RISKY → advisory-only
app.use('/api/structuring-risk', require('./routes/structuringRisk'));

app.listen(PORT, () => {
  console.log(`\nAI AML Transaction Monitoring API running on http://localhost:${PORT}\n`);
});

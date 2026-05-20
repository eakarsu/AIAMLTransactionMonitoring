const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { authenticateToken } = require('./middleware/auth');
const pool = require('./config/database');
const { fireWebhook } = require('./services/webhooks');

const app = express();
const PORT = process.env.BACKEND_PORT || 3069;

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

app.listen(PORT, () => {
  console.log(`\nAI AML Transaction Monitoring API running on http://localhost:${PORT}\n`);
});

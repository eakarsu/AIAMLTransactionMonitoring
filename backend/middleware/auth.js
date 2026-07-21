const jwt = require('jsonwebtoken');
const { getJwtSecret, tenantId } = require('../lib/security');

function authenticateToken(req, res, next) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return res.status(401).json({ error: 'Bearer access token required' });
  let secret;
  try { secret = getJwtSecret(); }
  catch (error) { return res.status(503).json({ error: 'Authentication is not configured' }); }
  try { req.user = jwt.verify(match[1], secret, { algorithms: ['HS256'] }); return next(); }
  catch (error) { return res.status(403).json({ error: 'Invalid or expired token' }); }
}
const ROLES=['viewer','analyst','commander'];
function requireRole(...allowed){return(req,res,next)=>{const role=req.user?.role||'viewer';return allowed.includes(role)?next():res.status(403).json({error:'Forbidden',required_roles:allowed});};}
function requireTenant(req,res,next){try{req.tenantId=tenantId(req.user);return next();}catch(error){return res.status(403).json({error:error.message});}}
const requireWriter=requireRole('commander','analyst');const requireCommander=requireRole('commander');
function withCrudRbac(router){router.use((req,res,next)=>['POST','PUT','PATCH','DELETE'].includes(req.method)?requireWriter(req,res,next):next());return router;}
module.exports={authenticateToken,ROLES,requireRole,requireWriter,requireCommander,requireTenant,withCrudRbac};

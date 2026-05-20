const buildCrud = require('./_crudFactory');
module.exports = buildCrud({
  table: 'kyc_profiles',
  fields: ['profile_id','customer_id','doc_type','expires_at','status','refresh_due','notes'],
});

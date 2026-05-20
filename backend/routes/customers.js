const buildCrud = require('./_crudFactory');
module.exports = buildCrud({
  table: 'customers',
  fields: ['customer_id','name','type','country','risk_tier','status','notes'],
});

const buildCrud = require('./_crudFactory');
module.exports = buildCrud({
  table: 'ctrs',
  fields: ['ctr_id','customer_id','aggregate_amount','period','filed_at','status','notes'],
});

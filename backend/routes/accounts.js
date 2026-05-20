const buildCrud = require('./_crudFactory');
module.exports = buildCrud({
  table: 'accounts',
  fields: ['account_id','customer_id','type','balance','currency','status','notes'],
});

const buildCrud = require('./_crudFactory');
module.exports = buildCrud({
  table: 'transactions',
  fields: ['txn_id','account_id','amount','currency','counterparty','ts','notes'],
});

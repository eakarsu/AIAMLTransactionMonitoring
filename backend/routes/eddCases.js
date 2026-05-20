const buildCrud = require('./_crudFactory');
module.exports = buildCrud({
  table: 'edd_cases',
  fields: ['edd_id','customer_id','trigger','status','opened_at','owner','notes'],
});

const buildCrud = require('./_crudFactory');
module.exports = buildCrud({
  table: 'sar_cases',
  fields: ['case_id','customer_id','suspicion','status','opened_at','owner','notes'],
});

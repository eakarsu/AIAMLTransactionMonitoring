const buildCrud = require('./_crudFactory');
module.exports = buildCrud({
  table: 'source_of_funds',
  fields: ['sof_id','customer_id','source_type','amount','evidence','status','notes'],
});

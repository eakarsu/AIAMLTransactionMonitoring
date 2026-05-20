const buildCrud = require('./_crudFactory');
module.exports = buildCrud({
  table: 'sanctions_hits',
  fields: ['hit_id','customer_id','list','score','matched_field','status','notes'],
});

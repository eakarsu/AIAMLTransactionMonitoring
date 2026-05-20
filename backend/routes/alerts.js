const buildCrud = require('./_crudFactory');
module.exports = buildCrud({
  table: 'alerts',
  fields: ['alert_id','customer_id','rule','severity','opened_at','status','notes'],
});

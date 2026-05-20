const buildCrud = require('./_crudFactory');
module.exports = buildCrud({
  table: 'watchlists',
  fields: ['list_id','name','jurisdiction','last_updated','version','status','notes'],
});

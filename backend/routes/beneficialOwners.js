const buildCrud = require('./_crudFactory');
module.exports = buildCrud({
  table: 'beneficial_owners',
  fields: ['owner_id','entity_id','name','country','pct_ownership','verified','notes'],
});

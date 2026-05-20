const buildCrud = require('./_crudFactory');
module.exports = buildCrud({
  table: 'peps',
  fields: ['pep_id','name','country','role','since','status','notes'],
});

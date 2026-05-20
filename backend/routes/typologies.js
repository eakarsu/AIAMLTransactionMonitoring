const buildCrud = require('./_crudFactory');
module.exports = buildCrud({
  table: 'typologies',
  fields: ['typology_id','name','description','severity','controls','status','notes'],
});

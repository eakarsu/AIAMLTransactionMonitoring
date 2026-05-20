const buildCrud = require('./_crudFactory');
module.exports = buildCrud({
  table: 'investigations',
  fields: ['inv_id','case_id','lead','status','opened_at','owner','notes'],
});

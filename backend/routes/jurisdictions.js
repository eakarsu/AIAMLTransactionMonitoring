const buildCrud = require('./_crudFactory');
module.exports = buildCrud({
  table: 'jurisdictions',
  fields: ['jur_id','country','fatf_rating','risk_score','sanctions_status','last_review','notes'],
});

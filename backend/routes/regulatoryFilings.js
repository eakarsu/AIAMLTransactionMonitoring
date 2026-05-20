const buildCrud = require('./_crudFactory');
module.exports = buildCrud({
  table: 'regulatory_filings',
  fields: ['filing_id','type','period','status','filed_at','filer','notes'],
});

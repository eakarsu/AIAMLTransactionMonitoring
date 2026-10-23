'use strict';
const test = require('node:test'); const assert = require('node:assert/strict');
const fp = require('../services/featurePack');
const sample = [ { txn_id:'T1', counterparty:'Acme', currency:'USD', amount:9900, notes:'cash' }, { txn_id:'T2', counterparty:'Acme', currency:'USD', amount:0, notes:'' } ];
test('tasks: create/list/update are owner-scoped', () => {
  const s = fp.createTaskStore(); const a = s.create('u1', { title: 'Review transaction' });
  assert.equal(s.list('u1').length, 1); assert.equal(s.list('u2').length, 0);
  assert.equal(s.update('u2', a.id, { status: 'done' }), null);
  assert.equal(s.update('u1', a.id, { status: 'done' }).status, 'done');
  assert.throws(() => s.create('u1', {}), /title is required/);
});
test('search/filter and export preserve values', () => {
  assert.equal(fp.filterRecords(sample, { q: 'Acme', searchFields: ["txn_id", "counterparty", "currency", "notes"] }).length, 2);
  assert.equal(fp.filterRecords(sample, { status: 'USD' }).length, 0);
  const csv = fp.toCsv(sample, ["id", "txn_id", "account_id", "amount", "currency", "counterparty"]); assert.match(csv, /,/);
  assert.ok(fp.toCsv([{ a: 0, b: false, c: '' }], ['a', 'b', 'c']).includes('0,false,'));
});
test('AI fallback is labelled deterministic and preserves 0/false', async () => {
  const saved = { OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY, OPENAI_API_KEY: process.env.OPENAI_API_KEY };
  delete process.env.OPENROUTER_API_KEY; delete process.env.OPENAI_API_KEY;
  try { for (const f of fp.AI_FEATURES) { const out = await fp.runAi(f.id, sample, {});
    assert.equal(out.aiGenerated, false); assert.equal(out.source, 'deterministic-fallback');
    assert.ok(JSON.stringify(out.sections).length > 2); }
    const empty = await fp.runAi(fp.AI_FEATURES[0].id, [], {}); assert.equal(empty.recordCount, 0);
  } finally { if (saved.OPENROUTER_API_KEY) process.env.OPENROUTER_API_KEY = saved.OPENROUTER_API_KEY; if (saved.OPENAI_API_KEY) process.env.OPENAI_API_KEY = saved.OPENAI_API_KEY; }
});

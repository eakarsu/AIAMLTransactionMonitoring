'use strict';
// Feature pack (wave 25B): tasks, search/filter, export and domain AI helpers.
// Pure helpers are unit-tested without a database. Provider calls happen only
// when OPENROUTER_API_KEY or OPENAI_API_KEY is configured; otherwise a clearly
// labelled deterministic fallback (aiGenerated:false) is returned.
const AI_FEATURES = [{"id": "structuring-band", "label": "Structuring band review"}, {"id": "counterparty-concentration", "label": "Counterparty concentration"}, {"id": "currency-amount-profile", "label": "Currency amount profile"}];
const DISCLAIMER = "Analyst support only; flags patterns for human review and does not make a final SAR or guilt determination.";
const TASK_STATUSES = ['todo', 'in_progress', 'done'];

function ownerKey(user) {
  return String((user && (user.id ?? user.userId ?? user.email)) ?? 'unknown');
}
function createTaskStore() {
  const tasks = new Map(); let seq = 1;
  return {
    list(owner, { q = '', status = '' } = {}) {
      return [...tasks.values()].filter((t) => t.owner === owner)
        .filter((t) => !status || t.status === status)
        .filter((t) => !q || `${t.title} ${t.notes || ''}`.toLowerCase().includes(String(q).toLowerCase()))
        .sort((a, b) => b.id - a.id);
    },
    create(owner, data = {}) {
      const title = String(data.title || '').trim();
      if (!title) throw Object.assign(new Error('title is required'), { status: 400 });
      if (data.status && !TASK_STATUSES.includes(data.status)) throw Object.assign(new Error('invalid status'), { status: 400 });
      const now = new Date().toISOString();
      const task = { id: seq++, owner, title, status: data.status || 'todo',
        priority: data.priority ?? null, notes: data.notes ? String(data.notes) : '',
        relatedRecordId: data.relatedRecordId ?? null, createdAt: now, updatedAt: now };
      tasks.set(task.id, task); return task;
    },
    update(owner, id, data = {}) {
      const task = tasks.get(Number(id));
      if (!task || task.owner !== owner) return null;
      if (data.status && !TASK_STATUSES.includes(data.status)) throw Object.assign(new Error('invalid status'), { status: 400 });
      if (data.title !== undefined) { if (!String(data.title).trim()) throw Object.assign(new Error('title cannot be empty'), { status: 400 }); task.title = String(data.title).trim(); }
      if (data.status !== undefined) task.status = data.status;
      if (data.priority !== undefined) task.priority = data.priority;
      if (data.notes !== undefined) task.notes = String(data.notes);
      if (data.relatedRecordId !== undefined) task.relatedRecordId = data.relatedRecordId;
      task.updatedAt = new Date().toISOString(); return task;
    },
  };
}
function filterRecords(records, { q = '', status = '', searchFields = [], statusField = 'status' } = {}) {
  const needle = String(q || '').toLowerCase();
  return (records || []).filter((r) => {
    if (status && String(r[statusField] ?? '') !== String(status)) return false;
    if (!needle) return true;
    return searchFields.some((f) => String(r[f] ?? '').toLowerCase().includes(needle));
  });
}
function csvCell(v) { if (v === null || v === undefined) return ''; const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }
function toCsv(records, fields) {
  const cols = fields && fields.length ? fields : [...new Set((records || []).flatMap((r) => Object.keys(r || {})))];
  return [cols.join(','), ...(records || []).map((r) => cols.map((c) => csvCell(r[c])).join(','))].join('\n') + '\n';
}
function countBy(records, field) { const out = {}; for (const r of records || []) { const k = r[field] === null || r[field] === undefined || r[field] === '' ? '(empty)' : String(r[field]); out[k] = (out[k] || 0) + 1; } return out; }
function sumBy(records, field) { return (records || []).reduce((a, r) => a + (Number(r[field]) || 0), 0); }


const BUILDERS = {
  'structuring-band': (rows) => ({ totalTransactions: rows.length, justBelow10k: rows.filter((r) => Number(r.amount) >= 9000 && Number(r.amount) < 10000).length, atOrAbove10k: rows.filter((r) => Number(r.amount) >= 10000).length, hasJustBelow10k: rows.some((r) => Number(r.amount) >= 9000 && Number(r.amount) < 10000) }),
  'counterparty-concentration': (rows) => ({ byCounterparty: countBy(rows, 'counterparty'), totalAmount: sumBy(rows, 'amount'), counterparties: Object.keys(countBy(rows, 'counterparty')).length }),
  'currency-amount-profile': (rows) => ({ byCurrency: countBy(rows, 'currency'), totalAmount: sumBy(rows, 'amount'), zeroAmount: rows.filter((r) => Number(r.amount) === 0).length }),
};

function buildFallback(feature, records) {
  const rows = Array.isArray(records) ? records : [];
  const builder = BUILDERS[feature];
  if (!builder) return null;
  return { feature, aiGenerated: false, source: 'deterministic-fallback',
    label: 'Deterministic fallback — no AI provider configured; this is not AI-generated.',
    disclaimer: DISCLAIMER, recordCount: rows.length, sections: builder(rows) };
}
function providerConfig(env = process.env) {
  const ok = (v) => Boolean(v && String(v).trim() && !/your_|placeholder|changeme/i.test(String(v)));
  if (ok(env.OPENROUTER_API_KEY)) return { provider: 'openrouter', key: env.OPENROUTER_API_KEY, model: env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5', url: 'https://openrouter.ai/api/v1/chat/completions' };
  if (ok(env.OPENAI_API_KEY)) return { provider: 'openai', key: env.OPENAI_API_KEY, model: env.OPENAI_MODEL || 'gpt-4o-mini', url: 'https://api.openai.com/v1/chat/completions' };
  return null;
}
async function runAi(feature, records, env = process.env, fetchImpl = global.fetch) {
  const fallback = buildFallback(feature, records);
  if (!fallback) return null;
  const cfg = providerConfig(env);
  if (!cfg || typeof fetchImpl !== 'function') return fallback;
  try {
    const prompt = `Analyse these records for feature "${feature}" and return JSON with labelled sections. Records: ${JSON.stringify(records).slice(0, 8000)}`;
    const res = await fetchImpl(cfg.url, { method: 'POST', headers: { Authorization: `Bearer ${cfg.key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: cfg.model, messages: [{ role: 'system', content: 'Return valid JSON only. ' + DISCLAIMER }, { role: 'user', content: prompt }], response_format: { type: 'json_object' } }) });
    if (!res.ok) throw new Error(`provider HTTP ${res.status}`);
    const data = await res.json(); const text = data.choices?.[0]?.message?.content || '';
    let parsed; try { parsed = JSON.parse(text); } catch { parsed = { summary: text }; }
    return { feature, aiGenerated: true, provider: cfg.provider, model: cfg.model, disclaimer: DISCLAIMER, recordCount: records.length, sections: parsed };
  } catch (e) { return { ...fallback, providerError: e.message }; }
}
module.exports = { AI_FEATURES, DISCLAIMER, TASK_STATUSES, ownerKey, createTaskStore, filterRecords, toCsv, countBy, sumBy, buildFallback, providerConfig, runAi };

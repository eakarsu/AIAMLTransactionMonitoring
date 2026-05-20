// AI helper service for AIAMLTransactionMonitoring
// Reads OPENROUTER_API_KEY and OPENROUTER_MODEL from:
//   1. this project's .env (already loaded by server.js)
//   2. fallback: /Users/erolakarsu/projects/beauty-wellness-ai/.env (canonical source)
// Never overwrites or wipes credentials.

const fs = require('fs');
const path = require('path');

const FALLBACK_ENV = '/Users/erolakarsu/projects/beauty-wellness-ai/.env';

function readFallbackEnv() {
  try {
    if (!fs.existsSync(FALLBACK_ENV)) return {};
    const raw = fs.readFileSync(FALLBACK_ENV, 'utf8');
    const out = {};
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let val = m[2];
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
      out[m[1]] = val;
    }
    return out;
  } catch (e) {
    console.warn('[ai] fallback env read failed:', e.message);
    return {};
  }
}

function getOpenRouterCreds() {
  const fb = readFallbackEnv();
  const key = process.env.OPENROUTER_API_KEY || fb.OPENROUTER_API_KEY || '';
  const model = process.env.OPENROUTER_MODEL || fb.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5';
  return { key, model };
}

const SYSTEM_PROMPT =
  'You are a senior AML / BSA compliance analyst supporting a transaction monitoring and ' +
  'sanctions screening platform. You provide rigorous, audit-defensible reasoning on ' +
  'transaction monitoring, sanctions screening, SAR/CTR filing, KYC/EDD, beneficial ownership, ' +
  'and investigations. Always return strict JSON in the exact schema requested. Treat every ' +
  'input as a tabletop exercise; do not include personally identifiable details beyond the inputs.';

function callOpenRouter(systemPrompt, userPrompt) {
  return new Promise((resolve, reject) => {
    const { key, model } = getOpenRouterCreds();
    if (!key) {
      return resolve({ error: 'OPENROUTER_API_KEY not configured' });
    }
    const https = require('https');
    const payload = JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.6,
      max_tokens: 2000,
    });

    const options = {
      hostname: 'openrouter.ai',
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        Authorization: `Bearer ${key}`,
        'HTTP-Referer': 'http://localhost:3068',
        'X-Title': 'AI AML Transaction Monitoring',
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.error) {
            return resolve({ error: parsed.error.message || 'OpenRouter error', raw: body });
          }
          const content = parsed.choices?.[0]?.message?.content || '';
          resolve(content);
        } catch (e) {
          resolve({ error: 'AI response parse failed', raw: body });
        }
      });
    });
    req.on('error', (e) => resolve({ error: e.message }));
    req.write(payload);
    req.end();
  });
}

function safeJsonParse(response, fallback) {
  if (response && typeof response === 'object' && response.error) {
    return { ...fallback, error: response.error };
  }
  if (response == null) return { ...fallback, summary: '' };
  if (typeof response === 'object') return response;
  const text = String(response).trim();
  try { return JSON.parse(text); } catch (_) {}
  try {
    const start = text.indexOf('{');
    if (start !== -1) {
      let depth = 0, inStr = false, esc = false;
      for (let i = start; i < text.length; i++) {
        const ch = text[i];
        if (esc) { esc = false; continue; }
        if (ch === '\\') { esc = true; continue; }
        if (ch === '"') { inStr = !inStr; continue; }
        if (inStr) continue;
        if (ch === '{') depth++;
        else if (ch === '}') { depth--; if (depth === 0) return JSON.parse(text.slice(start, i + 1)); }
      }
    }
  } catch (_) {}
  try {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenced && fenced[1]) return JSON.parse(fenced[1].trim());
  } catch (_) {}
  return { ...fallback, summary: text };
}

// ──────────────────────────────────────────────────────────────
// 1. SAR Narrative Draft
// ──────────────────────────────────────────────────────────────
async function sarNarrativeDraft(customer, suspicion, evidence = []) {
  const sys = `${SYSTEM_PROMPT} Draft a FinCEN SAR narrative. Return strict JSON:
{
  "narrative": string,
  "suspicious_activity_categories": [string],
  "indicators": [{ "indicator": string, "evidence_ref": string }],
  "time_period": { "from": string, "to": string },
  "dollar_amount_usd": number,
  "recommended_action": "file"|"hold"|"close",
  "filing_priority": "low"|"medium"|"high"|"critical",
  "summary": string
}`;
  const usr = `Customer:\n${JSON.stringify(customer, null, 2)}\nSuspicion: ${suspicion}\nEvidence:\n${JSON.stringify(evidence, null, 2)}`;
  const r = await callOpenRouter(sys, usr);
  return safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response', indicators: [] });
}

// ──────────────────────────────────────────────────────────────
// 2. Typology Detection
// ──────────────────────────────────────────────────────────────
async function typologyDetect(transactions) {
  const sys = `${SYSTEM_PROMPT} Detect AML typologies in the transaction window. Return strict JSON:
{
  "detected_typologies": [{
    "typology": string,
    "confidence": number,
    "matched_txn_ids": [string],
    "indicators": [string],
    "severity": "low"|"medium"|"high"|"critical"
  }],
  "no_match_reason": string,
  "recommended_alerts": [{ "rule": string, "severity": "low"|"medium"|"high"|"critical" }],
  "summary": string
}`;
  const usr = `Transactions:\n${JSON.stringify(transactions, null, 2)}`;
  const r = await callOpenRouter(sys, usr);
  return safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response', detected_typologies: [] });
}

// ──────────────────────────────────────────────────────────────
// 3. KYC Refresh Summary
// ──────────────────────────────────────────────────────────────
async function kycRefreshSummary(profiles = []) {
  const sys = `${SYSTEM_PROMPT} Summarize KYC refresh queue. Return strict JSON:
{
  "queue_health_score": number,
  "expired_count": number,
  "expiring_30d_count": number,
  "prioritized_refreshes": [{
    "profile_id": string,
    "customer_id": string,
    "reason": string,
    "due_date": string,
    "priority": "low"|"medium"|"high"|"critical"
  }],
  "recommended_actions": [string],
  "summary": string
}`;
  const usr = `KYC profiles:\n${JSON.stringify(profiles, null, 2)}`;
  const r = await callOpenRouter(sys, usr);
  return safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response', prioritized_refreshes: [] });
}

// ──────────────────────────────────────────────────────────────
// 4. Sanctions Name Match
// ──────────────────────────────────────────────────────────────
async function sanctionNameMatch(query, candidates = []) {
  const sys = `${SYSTEM_PROMPT} Score and triage a sanctions name screening hit. Return strict JSON:
{
  "query_subject": string,
  "matches": [{
    "list": string,
    "matched_name": string,
    "score": number,
    "verdict": "true_match"|"likely_match"|"possible_match"|"false_positive",
    "rationale": string,
    "recommended_action": "block"|"review"|"clear"
  }],
  "overall_recommendation": "block"|"review"|"clear",
  "summary": string
}`;
  const usr = `Query: ${JSON.stringify(query)}\nCandidates:\n${JSON.stringify(candidates, null, 2)}`;
  const r = await callOpenRouter(sys, usr);
  return safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response', matches: [] });
}

// ──────────────────────────────────────────────────────────────
// 5. Beneficial Owner Trace
// ──────────────────────────────────────────────────────────────
async function beneficialOwnerTrace(entity, owners = []) {
  const sys = `${SYSTEM_PROMPT} Trace beneficial ownership chain. Return strict JSON:
{
  "entity_id": string,
  "ownership_chain": [{
    "tier": number,
    "owner_id": string,
    "name": string,
    "country": string,
    "pct_ownership": number,
    "verified": boolean,
    "risk_flags": [string]
  }],
  "ultimate_beneficial_owners": [{ "name": string, "effective_pct": number, "risk_level": "low"|"medium"|"high"|"critical" }],
  "ofac_50_rule_implicated": boolean,
  "opacity_score": number,
  "summary": string
}`;
  const usr = `Entity:\n${JSON.stringify(entity, null, 2)}\nOwners:\n${JSON.stringify(owners, null, 2)}`;
  const r = await callOpenRouter(sys, usr);
  return safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response', ownership_chain: [] });
}

// ──────────────────────────────────────────────────────────────
// 6. Transaction Anomaly
// ──────────────────────────────────────────────────────────────
async function transactionAnomaly(transactions) {
  const sys = `${SYSTEM_PROMPT} Detect anomalies in transactions vs baseline. Return strict JSON:
{
  "anomalies": [{
    "txn_id": string,
    "anomaly_type": string,
    "z_score": number,
    "deviation_from_baseline": string,
    "severity": "low"|"medium"|"high"|"critical"
  }],
  "baseline_stats": { "avg_amount": number, "stddev": number, "txn_count": number },
  "recommended_alerts": [{ "rule": string, "severity": "low"|"medium"|"high"|"critical" }],
  "summary": string
}`;
  const usr = `Transactions:\n${JSON.stringify(transactions, null, 2)}`;
  const r = await callOpenRouter(sys, usr);
  return safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response', anomalies: [] });
}

// ──────────────────────────────────────────────────────────────
// 7. Peer Group Compare
// ──────────────────────────────────────────────────────────────
async function peerGroupCompare(customer, peers = []) {
  const sys = `${SYSTEM_PROMPT} Compare customer to peer group. Return strict JSON:
{
  "customer_id": string,
  "peer_group": string,
  "metric_comparisons": [{
    "metric": string,
    "customer_value": number,
    "peer_median": number,
    "percentile": number,
    "deviation_flag": "normal"|"elevated"|"outlier"
  }],
  "behavioral_outliers": [string],
  "risk_implication": "low"|"medium"|"high"|"critical",
  "summary": string
}`;
  const usr = `Customer:\n${JSON.stringify(customer, null, 2)}\nPeers:\n${JSON.stringify(peers, null, 2)}`;
  const r = await callOpenRouter(sys, usr);
  return safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response', metric_comparisons: [] });
}

// ──────────────────────────────────────────────────────────────
// 8. Executive Brief
// ──────────────────────────────────────────────────────────────
async function executiveBrief(snapshot = {}) {
  const sys = `${SYSTEM_PROMPT} Produce a CCO/BSA-Officer level compliance brief. Return strict JSON:
{
  "headline": string,
  "compliance_posture": string,
  "alert_load": { "open": number, "high": number, "critical": number, "narrative": string },
  "filing_status": { "sar_open": number, "ctr_pending": number, "narrative": string },
  "top_risks": [{ "risk": string, "severity": "low"|"medium"|"high"|"critical", "owner": string }],
  "decisions_required": [{ "decision": string, "deadline": string, "options": [string], "recommendation": string }],
  "next_24h_outlook": string,
  "summary": string
}`;
  const usr = `Compliance snapshot:\n${JSON.stringify(snapshot, null, 2)}`;
  const r = await callOpenRouter(sys, usr);
  return safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response' });
}

// ──────────────────────────────────────────────────────────────
// 9. Customer Risk Score
// ──────────────────────────────────────────────────────────────
async function customerRiskScore(customer, signals = {}) {
  const sys = `${SYSTEM_PROMPT} Compute a composite customer risk score. Return strict JSON:
{
  "customer_id": string,
  "overall_score": number,
  "tier": "low"|"medium"|"high"|"critical",
  "factor_breakdown": [{ "factor": string, "weight": number, "value": number, "contribution": number, "rationale": string }],
  "review_frequency_months": number,
  "recommended_controls": [string],
  "summary": string
}`;
  const usr = `Customer:\n${JSON.stringify(customer, null, 2)}\nSignals:\n${JSON.stringify(signals, null, 2)}`;
  const r = await callOpenRouter(sys, usr);
  return safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response', factor_breakdown: [] });
}

// ──────────────────────────────────────────────────────────────
// 10. EDD Questionnaire
// ──────────────────────────────────────────────────────────────
async function eddQuestionnaire(customer, trigger) {
  const sys = `${SYSTEM_PROMPT} Build an EDD questionnaire tailored to the trigger. Return strict JSON:
{
  "trigger": string,
  "sections": [{
    "section": string,
    "questions": [{ "q": string, "type": "text"|"select"|"document", "required": boolean, "rationale": string }]
  }],
  "required_documents": [string],
  "estimated_completion_minutes": number,
  "summary": string
}`;
  const usr = `Customer:\n${JSON.stringify(customer, null, 2)}\nTrigger: ${trigger}`;
  const r = await callOpenRouter(sys, usr);
  return safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response', sections: [] });
}

// ──────────────────────────────────────────────────────────────
// 11. Investigation Summary
// ──────────────────────────────────────────────────────────────
async function investigationSummary(investigation, evidence = []) {
  const sys = `${SYSTEM_PROMPT} Summarize an open AML investigation. Return strict JSON:
{
  "inv_id": string,
  "case_id": string,
  "status": string,
  "timeline": [{ "ts": string, "event": string, "evidence_ref": string }],
  "key_findings": [string],
  "evidence_strength": "weak"|"moderate"|"strong",
  "recommended_disposition": "file_sar"|"close_no_action"|"escalate"|"continue_monitor",
  "next_steps": [string],
  "summary": string
}`;
  const usr = `Investigation:\n${JSON.stringify(investigation, null, 2)}\nEvidence:\n${JSON.stringify(evidence, null, 2)}`;
  const r = await callOpenRouter(sys, usr);
  return safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response', timeline: [] });
}

// ──────────────────────────────────────────────────────────────
// 12. Regulatory Filing Draft
// ──────────────────────────────────────────────────────────────
async function regulatoryFilingDraft(filingType, period, dataPoints = {}) {
  const sys = `${SYSTEM_PROMPT} Draft a regulatory filing body for the specified type. Return strict JSON:
{
  "filing_type": string,
  "period": string,
  "header": { "filer": string, "period": string, "submitted_to": string },
  "sections": [{ "section": string, "content": string, "data_refs": [string] }],
  "totals": [{ "label": string, "value": number, "unit": string }],
  "required_attachments": [string],
  "compliance_warnings": [string],
  "summary": string
}`;
  const usr = `Filing type: ${filingType}\nPeriod: ${period}\nData points:\n${JSON.stringify(dataPoints, null, 2)}`;
  const r = await callOpenRouter(sys, usr);
  return safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response', sections: [] });
}

// ──────────────────────────────────────────────────────────────
// 13. Source of Funds Explain
// ──────────────────────────────────────────────────────────────
async function sourceOfFundsExplain(customer, transactions = [], claimed = {}) {
  const sys = `${SYSTEM_PROMPT} Reconcile source of funds claim with observed activity. Return strict JSON:
{
  "claimed_source": string,
  "claimed_amount_usd": number,
  "observed_aggregate_usd": number,
  "reconciliation": [{ "txn_id": string, "amount": number, "matches_claim": boolean, "rationale": string }],
  "unexplained_amount_usd": number,
  "verdict": "fully_supported"|"partially_supported"|"unsupported"|"contradictory",
  "follow_up_questions": [string],
  "summary": string
}`;
  const usr = `Customer:\n${JSON.stringify(customer, null, 2)}\nClaimed:\n${JSON.stringify(claimed, null, 2)}\nTransactions:\n${JSON.stringify(transactions, null, 2)}`;
  const r = await callOpenRouter(sys, usr);
  return safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response', reconciliation: [] });
}

// ──────────────────────────────────────────────────────────────
// 14. Jurisdictional Risk
// ──────────────────────────────────────────────────────────────
async function jurisdictionalRisk(country, signals = {}) {
  const sys = `${SYSTEM_PROMPT} Assess country/jurisdiction risk for AML/sanctions purposes. Return strict JSON:
{
  "country": string,
  "fatf_rating": string,
  "composite_score": number,
  "risk_drivers": [{ "driver": string, "weight": number, "narrative": string }],
  "sanctions_regimes": [string],
  "recommended_treatment": "baseline"|"enhanced"|"prohibited",
  "review_cadence_months": number,
  "summary": string
}`;
  const usr = `Country: ${country}\nSignals:\n${JSON.stringify(signals, null, 2)}`;
  const r = await callOpenRouter(sys, usr);
  return safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response', risk_drivers: [] });
}

// ──────────────────────────────────────────────────────────────
// 15. False Positive Classifier
// ──────────────────────────────────────────────────────────────
async function falsePositiveClassifier(alerts = []) {
  const sys = `${SYSTEM_PROMPT} Triage alerts and classify likely false positives. Return strict JSON:
{
  "alert_classifications": [{
    "alert_id": string,
    "verdict": "true_positive"|"likely_true_positive"|"likely_false_positive"|"false_positive",
    "confidence": number,
    "drivers": [string],
    "recommended_action": "escalate"|"investigate"|"hold"|"auto_close"
  }],
  "auto_close_count": number,
  "escalate_count": number,
  "analyst_hours_saved_estimate": number,
  "summary": string
}`;
  const usr = `Alerts:\n${JSON.stringify(alerts, null, 2)}`;
  const r = await callOpenRouter(sys, usr);
  return safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response', alert_classifications: [] });
}

// ──────────────────────────────────────────────────────────────
// 16. Network Analysis
// ──────────────────────────────────────────────────────────────
async function networkAnalysis(seedCustomer, transactions = [], owners = []) {
  const sys = `${SYSTEM_PROMPT} Build a counterparty / ownership network around the seed. Return strict JSON:
{
  "seed": string,
  "nodes": [{ "id": string, "label": string, "type": "customer"|"account"|"counterparty"|"entity", "risk_level": "low"|"medium"|"high"|"critical" }],
  "edges": [{ "from": string, "to": string, "type": "txn"|"ownership"|"shared_address"|"shared_phone", "weight": number, "rationale": string }],
  "clusters": [{ "cluster_id": string, "members": [string], "typology_hint": string }],
  "central_actors": [{ "id": string, "centrality_score": number, "narrative": string }],
  "summary": string
}`;
  const usr = `Seed customer:\n${JSON.stringify(seedCustomer, null, 2)}\nTransactions:\n${JSON.stringify(transactions, null, 2)}\nOwners:\n${JSON.stringify(owners, null, 2)}`;
  const r = await callOpenRouter(sys, usr);
  return safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response', nodes: [], edges: [] });
}

module.exports = {
  callOpenRouter,
  safeJsonParse,
  sarNarrativeDraft,
  typologyDetect,
  kycRefreshSummary,
  sanctionNameMatch,
  beneficialOwnerTrace,
  transactionAnomaly,
  peerGroupCompare,
  executiveBrief,
  customerRiskScore,
  eddQuestionnaire,
  investigationSummary,
  regulatoryFilingDraft,
  sourceOfFundsExplain,
  jurisdictionalRisk,
  falsePositiveClassifier,
  networkAnalysis,
};

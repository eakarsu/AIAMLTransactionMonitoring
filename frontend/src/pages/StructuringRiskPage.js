import React, { useState } from 'react';

export default function StructuringRiskPage() {
  const [form, setForm] = useState({ cashDeposits: 9, avgDepositAmount: 9400, daysWindow: 5, branchesUsed: 3, roundedAmountsPct: 72 });
  const [result, setResult] = useState(null);
  const submit = async () => {
    const response = await fetch('/api/structuring-risk/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      body: JSON.stringify(form),
    });
    setResult(await response.json());
  };
  return (
    <div className="panel">
      <h1>Structuring Risk</h1>
      {Object.entries(form).map(([key, value]) => (
        <label key={key}>{key.replace(/([A-Z])/g, ' $1')}<input type="number" value={value} onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })} /></label>
      ))}
      <button className="btn primary" onClick={submit}>Score structuring</button>
      {result && <section><h2>{result.level.toUpperCase()} · {result.score}/100</h2><ul>{result.actions.map((action) => <li key={action}>{action}</li>)}</ul></section>}
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, setToken, setStoredUser } from '../services/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { token, user } = await login(email, password);
      setToken(token);
      setStoredUser(user);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1 className="login-brand">AML COMPLIANCE</h1>
        <p className="login-sub">Transaction Monitoring & Sanctions Screening</p>

        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        {error && <div className="ai-error" style={{ marginBottom: 12 }}>{error}</div>}

        <button className="btn" type="submit" disabled={loading} style={{ width: '100%' }}>
          {loading ? <><span className="spinner" />Authenticating...</> : 'Sign In'}
        </button>

        <p className="login-hint">Use an account provisioned by an administrator.</p>
      </form>
    </div>
  );
}

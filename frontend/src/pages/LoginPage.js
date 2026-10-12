import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, setToken, setStoredUser } from '../services/api';

const DEMO_EMAIL = process.env.REACT_APP_DEMO_EMAIL || '';
const DEMO_PASSWORD = process.env.REACT_APP_DEMO_PASSWORD || '';
const DEMO_LOGIN_AVAILABLE = process.env.REACT_APP_ENABLE_DEMO_CREDENTIAL_AUTOFILL === 'true'
  && Boolean(DEMO_EMAIL && DEMO_PASSWORD);

export default function LoginPage() {
  const demoLoginLock = useRef(false);
  const [demoLoginBusy, setDemoLoginBusy] = useState(false);
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e, demoLoginCredentials) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { token, user } = await login((demoLoginCredentials?.email ?? email), (demoLoginCredentials?.password ?? password));
      setToken(token);
      setStoredUser(user);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (event) => {
    if (demoLoginLock.current || !DEMO_LOGIN_AVAILABLE) return;
    demoLoginLock.current = true;
    setDemoLoginBusy(true);
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    try {
      await handleSubmit(event, { email: DEMO_EMAIL, password: DEMO_PASSWORD });
    } finally {
      demoLoginLock.current = false;
      setDemoLoginBusy(false);
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

        <button
          type="button"
          onClick={handleDemoLogin}
          disabled={demoLoginBusy || loading || !DEMO_LOGIN_AVAILABLE}
          aria-label="Log in as Demo"
          title={DEMO_LOGIN_AVAILABLE ? 'Use the configured local demo account' : 'Demo login is not configured for this environment'}
          style={{ width: '100%', marginBottom: '12px', padding: '10px 14px', borderRadius: '8px', border: '1px solid currentColor', background: 'transparent', cursor: DEMO_LOGIN_AVAILABLE ? 'pointer' : 'not-allowed' }}
        >
          {demoLoginBusy ? 'Logging in as Demo...' : 'Log in as Demo'}
        </button>
        <button className="btn" type="submit" disabled={loading} style={{ width: '100%' }}>
          {loading ? <><span className="spinner" />Authenticating...</> : 'Sign In'}
        </button>

        <p className="login-hint">Use an account provisioned by an administrator.</p>
      </form>
    </div>
  );
}

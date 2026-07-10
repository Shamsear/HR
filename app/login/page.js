'use client';

import { useState, useEffect } from 'react';
import { useHR } from '../context';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { login, isAuthenticated, ready } = useHR();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ready && isAuthenticated) router.push('/');
  }, [ready, isAuthenticated, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    try {
      const success = await login(username, password);
      setLoading(false);
      if (success) router.push('/');
      else setError('Invalid username or password.');
    } catch (err) {
      setError('An error occurred during authentication.');
      setLoading(false);
    }
  };

  if (!ready) return null;

  const features = [
    { t: 'Vacation & accrual tracking', d: 'Automatic balances with 21/28-day rules' },
    { t: 'End-of-service settlements', d: 'Art. 54 gratuity & leave encashment' },
    { t: 'Document expiry alerts', d: 'QID, passport & license monitoring' },
  ];

  return (
    <div className="auth">
      {/* ── Brand showcase panel ── */}
      <aside className="auth-brand">
        <div className="auth-brand-top">
          <div className="auth-logo">HR</div>
          <span className="auth-brand-name">HR Portal</span>
        </div>

        <div className="auth-brand-mid">
          <h1>Manage your workforce with clarity.</h1>
          <p>Qatar vacation, document, and end-of-service management — accurate, auditable, and always up to date.</p>

          <ul className="auth-features">
            {features.map(f => (
              <li key={f.t}>
                <span className="auth-feat-ico">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                </span>
                <span>
                  <strong>{f.t}</strong>
                  <small>{f.d}</small>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="auth-brand-foot">© 2026 HR Portal · Qatar Labour Law compliant</div>
      </aside>

      {/* ── Form panel ── */}
      <main className="auth-panel">
        <div className="auth-form-wrap">
          <div className="auth-mobile-logo">
            <div className="auth-logo">HR</div>
            <span className="auth-brand-name">HR Portal</span>
          </div>

          <div className="auth-head">
            <h2>Welcome back</h2>
            <p>Sign in to your admin account to continue.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {error && (
              <div className="auth-error">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                <span>{error}</span>
              </div>
            )}

            <div className="auth-field">
              <label htmlFor="username">Username</label>
              <input type="text" id="username" placeholder="Enter your username" value={username} onChange={e => setUsername(e.target.value)} disabled={loading} autoComplete="username" />
            </div>

            <div className="auth-field">
              <label htmlFor="password">Password</label>
              <div className="auth-pw">
                <input type={showPw ? 'text' : 'password'} id="password" placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} disabled={loading} autoComplete="current-password" />
                <button type="button" className="auth-pw-toggle" onClick={() => setShowPw(s => !s)} aria-label={showPw ? 'Hide password' : 'Show password'} tabIndex={-1}>
                  {showPw
                    ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><path d="M1 1l22 22" /><path d="M4.7 7.3A18.6 18.6 0 0 0 2 12s3 8 10 8a9.3 9.3 0 0 0 4.3-1" /></svg>
                    : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8Z" /><circle cx="12" cy="12" r="3" /></svg>}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
              {loading ? <><span className="btn-spinner" /> Signing in…</> : 'Sign In'}
            </button>
          </form>

          <div className="auth-demo">
            <span>Demo credentials</span>
            <code>admin</code> / <code>admin123</code>
          </div>
        </div>
      </main>
    </div>
  );
}

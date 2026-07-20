import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

export default function AuthPage() {
  const { login, signup, googleLogin, authError, setAuthError } = useAuth();
  const [mode, setMode]           = useState('login');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [busy, setBusy]           = useState(false);
  const [localErr, setLocalErr]   = useState('');
  const googleBtnRef = useRef(null);
  const gsiMounted   = useRef(false);

  const error = localErr || authError;

  const mountGsiButton = useCallback(() => {
    if (!GOOGLE_CLIENT_ID || !googleBtnRef.current || gsiMounted.current) return;
    if (!window.google?.accounts?.id) return;
    gsiMounted.current = true;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async ({ credential }) => {
        setBusy(true);
        setLocalErr('');
        setAuthError('');
        try { await googleLogin(credential); }
        catch (e) { setLocalErr(e.message); }
        finally { setBusy(false); }
      },
    });
    window.google.accounts.id.renderButton(googleBtnRef.current, {
      theme: 'outline', size: 'large', width: '340', text: 'continue_with',
    });
  }, [googleLogin, setAuthError]);

  // Try immediately, then poll until GSI script loads
  useEffect(() => {
    gsiMounted.current = false;
    mountGsiButton();
    if (GOOGLE_CLIENT_ID && !gsiMounted.current) {
      const id = setInterval(() => {
        mountGsiButton();
        if (gsiMounted.current) clearInterval(id);
      }, 200);
      return () => clearInterval(id);
    }
  }, [mode, mountGsiButton]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalErr('');
    setAuthError('');
    if (!email || !password) { setLocalErr('Email and password are required.'); return; }
    if (mode === 'signup' && (!firstName || !lastName)) { setLocalErr('First and last name are required.'); return; }
    setBusy(true);
    try {
      if (mode === 'login') await login(email, password);
      else await signup(email, password, firstName, lastName);
    } catch (e) {
      setLocalErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const switchMode = () => {
    setLocalErr('');
    setAuthError('');
    setMode(m => m === 'login' ? 'signup' : 'login');
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <div style={styles.logo}>💸</div>
        <h1 style={styles.title}>MindfulSpend</h1>
        <p style={styles.sub}>{mode === 'login' ? 'Sign in to your account' : 'Create a new account'}</p>

        {error && <div style={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          {mode === 'signup' && (
            <div style={styles.row}>
              <input style={styles.input} placeholder="First name" value={firstName}
                onChange={e => setFirstName(e.target.value)} disabled={busy} />
              <input style={styles.input} placeholder="Last name" value={lastName}
                onChange={e => setLastName(e.target.value)} disabled={busy} />
            </div>
          )}
          <input style={styles.input} type="email" placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)} disabled={busy} autoComplete="email" />
          <input style={styles.input} type="password" placeholder="Password" value={password}
            onChange={e => setPassword(e.target.value)} disabled={busy}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />

          <button style={{ ...styles.btn, opacity: busy ? 0.7 : 1 }} type="submit" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div style={styles.dividerRow}>
          <div style={styles.dividerLine} />
          <span style={styles.dividerText}>or</span>
          <div style={styles.dividerLine} />
        </div>

        {GOOGLE_CLIENT_ID ? (
          /* GSI renders its own button into this div */
          <div ref={googleBtnRef} style={{ minHeight: 44 }} />
        ) : (
          /* Placeholder shown until the client ID is configured */
          <button style={styles.googleFallback} disabled>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
              <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.962L3.964 6.294C4.672 4.169 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continue with Google
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginLeft: 'auto' }}>(add Client ID to enable)</span>
          </button>
        )}

        <p style={styles.switchText}>
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button style={styles.switchLink} onClick={switchMode} type="button">
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--bg)', padding: '1rem',
  },
  card: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--card-radius)', boxShadow: 'var(--shadow)',
    padding: '2.5rem 2rem', width: '100%', maxWidth: 420,
    display: 'flex', flexDirection: 'column', gap: '0.75rem',
  },
  logo:  { fontSize: '2.2rem', textAlign: 'center', lineHeight: 1 },
  title: { fontSize: '1.5rem', fontWeight: 700, textAlign: 'center', color: 'var(--text)' },
  sub:   { fontSize: '0.9rem', textAlign: 'center', color: 'var(--muted)', marginBottom: '0.25rem' },
  errorBox: {
    background: '#fff0f0', border: '1px solid var(--red)', borderRadius: 8,
    color: 'var(--red)', padding: '0.6rem 0.9rem', fontSize: '0.85rem',
  },
  form:  { display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  row:   { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' },
  input: {
    width: '100%', padding: '0.65rem 0.9rem', borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--surface2)',
    color: 'var(--text)', fontSize: '0.95rem', outline: 'none',
  },
  btn: {
    marginTop: '0.25rem', padding: '0.75rem', borderRadius: 8, border: 'none',
    background: 'var(--accent)', color: '#fff', fontWeight: 600,
    fontSize: '1rem', cursor: 'pointer', transition: 'opacity 0.15s',
  },
  dividerRow:  { display: 'flex', alignItems: 'center', gap: '0.6rem' },
  dividerLine: { flex: 1, height: 1, background: 'var(--border)' },
  dividerText: { color: 'var(--muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' },
  googleFallback: {
    display: 'flex', alignItems: 'center', gap: '0.6rem',
    width: '100%', padding: '0.65rem 1rem', borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--surface2)',
    color: 'var(--text)', fontSize: '0.9rem', cursor: 'not-allowed',
    opacity: 0.75,
  },
  switchText: { textAlign: 'center', fontSize: '0.875rem', color: 'var(--muted)', marginTop: '0.25rem' },
  switchLink: {
    background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 600,
    cursor: 'pointer', fontSize: 'inherit', padding: 0,
  },
};

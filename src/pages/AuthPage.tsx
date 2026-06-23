import { signInWithGoogle } from '../lib/supabase';
import logoSrc from '../assets/logo.png';

export default function AuthPage() {
  const handleSignIn = async () => {
    const { error } = await signInWithGoogle();
    if (error) console.error('Sign-in error:', error);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #050e07 0%, #0a160e 50%, #051008 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 20px',
      gap: 32,
    }}>
      {/* Background radial glow */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 70% 40% at 50% 30%, rgba(34,197,94,0.10) 0%, transparent 70%)',
      }}/>

      {/* Logo */}
      <div style={{ textAlign: 'center', animation: 'rise .5s ease both' }}>
        <img src={logoSrc} alt="Daily Essentials" style={{ width: 130, marginBottom: 8, filter: 'drop-shadow(0 4px 24px rgba(34,197,94,0.35))' }} />
        <div style={{ fontSize: 14, color: 'var(--txt2)', fontWeight: 600, letterSpacing: 0.5 }}>
          🌿 Plan the vibe. Cover the essentials.
        </div>
      </div>

      {/* Card */}
      <div className="card" style={{ width: '100%', maxWidth: 360, textAlign: 'center', padding: '32px 24px', animation: 'rise .5s .1s ease both', opacity: 0 }}>
        <div style={{ fontSize: 26, marginBottom: 8 }}>👋</div>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Welcome back</div>
        <div style={{ fontSize: 14, color: 'var(--txt2)', fontWeight: 500, marginBottom: 28, lineHeight: 1.5 }}>
          Sign in to join your crew and plan tonight's session.
        </div>

        <button
          className="btn-3d-green"
          onClick={handleSignIn}
          style={{ gap: 12 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <div style={{ marginTop: 20, fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
          By signing in, you agree to our Terms of Service.<br/>Your location is never shared without your consent. 🌿
        </div>
      </div>

      <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', opacity: 0.6 }}>
        Daily Essentials v1.0 · Made with 💚 for your crew
      </div>
    </div>
  );
}

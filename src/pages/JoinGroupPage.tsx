import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { joinGroupByToken } from '../lib/queries';
import { supabase } from '../lib/supabase';

export default function JoinGroupPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState('');

  // Check if user is logged in, if not redirect to home (auth guard will handle it)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate('/');
    });
  }, [navigate]);

  const handleJoin = async () => {
    if (!token) return;
    setLoading(true);
    const group = await joinGroupByToken(token);
    setLoading(false);
    if (group) {
      setJoined(true);
      setTimeout(() => navigate('/'), 1500);
    } else {
      setError('Invalid or expired invite link. Ask your host for a new one!');
    }
  };

  if (joined) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: 'linear-gradient(160deg, #050e07 0%, #0a160e 100%)' }}>
        <div style={{ fontSize: 60 }}>🎉</div>
        <div style={{ fontSize: 22, fontWeight: 800 }}>You're in!</div>
        <div style={{ fontSize: 14, color: 'var(--txt2)' }}>Taking you to the app…</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', gap: 24, background: 'linear-gradient(160deg, #050e07 0%, #0a160e 100%)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🌿</div>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>You're invited!</div>
        <div style={{ fontSize: 14, color: 'var(--txt2)', fontWeight: 500 }}>Someone sent you an invite to join their crew on Daily Essentials</div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 14, padding: '14px 18px', fontSize: 13, color: '#FCA5A5', textAlign: 'center', maxWidth: 360, width: '100%' }}>
          {error}
        </div>
      )}

      <div className="card" style={{ width: '100%', maxWidth: 360, padding: '24px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
          Invite token: <code style={{ color: 'var(--accent)', fontFamily: 'monospace' }}>{token}</code>
        </div>
        <button className="btn-3d-green" onClick={handleJoin} disabled={loading}>
          {loading ? 'Joining...' : 'Join the Crew 🔥'}
        </button>
      </div>
    </div>
  );
}

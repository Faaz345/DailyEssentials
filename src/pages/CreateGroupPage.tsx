import { useState } from 'react';
import { SplashButton } from '../components/SplashButton';
import { createGroup, joinGroupByToken } from '../lib/queries';

interface Props {
  onGroupCreated: () => void;
}

export default function CreateGroupPage({ onGroupCreated }: Props) {
  const params = new URLSearchParams(window.location.search);
  const joinParam = params.get('join') ?? '';

  const [mode, setMode] = useState<'create' | 'join'>(joinParam ? 'join' : 'create');
  const [name, setName] = useState('');
  const [inviteToken, setInviteToken] = useState(joinParam);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    const group = await createGroup(name.trim());
    setLoading(false);
    if (group) {
      const link = `${window.location.origin}/join/${group.invite_token}`;
      setInviteLink(link);
    } else {
      setError('Failed to create group');
    }
  };

  const handleJoin = async () => {
    if (!inviteToken.trim()) return;
    setLoading(true);
    setError(null);
    const group = await joinGroupByToken(inviteToken.trim());
    setLoading(false);
    if (group) {
      onGroupCreated(); // Successfully joined, proceed to app
    } else {
      setError('Invalid invite code');
    }
  };

  const copyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
    }
  };

  if (inviteLink) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', gap: 20, background: 'linear-gradient(160deg, #050e07 0%, #0a160e 100%)' }}>
        <div style={{ fontSize: 48 }}>🎉</div>
        <div style={{ fontSize: 22, fontWeight: 800, textAlign: 'center' }}>Group created!</div>
        <div style={{ fontSize: 14, color: 'var(--txt2)', textAlign: 'center' }}>Share this link with your crew to invite them</div>
        <div className="card" style={{ width: '100%', maxWidth: 360, padding: '20px 18px' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, fontWeight: 600 }}>Invite Link</div>
          <div style={{ fontSize: 12, color: 'var(--txt)', wordBreak: 'break-all', background: 'rgba(255,255,255,0.04)', padding: '12px 14px', borderRadius: 12, marginBottom: 14, border: '1px solid rgba(255,255,255,0.07)' }}>
            {inviteLink}
          </div>
          <SplashButton className="btn-3d-green" sound="success" onClick={copyLink}>📋 Copy Invite Link</SplashButton>
        </div>
        <SplashButton className="btn-3d-dark" sound="whoosh" style={{ maxWidth: 360, width: '100%' }} onClick={onGroupCreated}>
          Continue to App →
        </SplashButton>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', gap: 24, background: 'linear-gradient(160deg, #050e07 0%, #0a160e 100%)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>👥</div>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>
          {mode === 'create' ? 'Create your crew' : 'Join a crew'}
        </div>
        <div style={{ fontSize: 14, color: 'var(--txt2)', fontWeight: 500 }}>
          {mode === 'create' ? 'Give your friend group a name to get started' : 'Enter an invite code from your friend'}
        </div>
      </div>

      <div className="card" style={{ width: '100%', maxWidth: 360, padding: '24px 20px' }}>
        {/* Toggle Mode */}
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 4, marginBottom: 20 }}>
          <button
            onClick={() => { setMode('create'); setError(null); }}
            style={{
              flex: 1, padding: '10px 0', fontSize: 14, fontWeight: 600,
              background: mode === 'create' ? 'rgba(255,255,255,0.1)' : 'transparent',
              color: mode === 'create' ? '#fff' : 'var(--muted)',
              borderRadius: 8, border: 'none', cursor: 'pointer', transition: 'all .2s'
            }}
          >
            Create Group
          </button>
          <button
            onClick={() => { setMode('join'); setError(null); }}
            style={{
              flex: 1, padding: '10px 0', fontSize: 14, fontWeight: 600,
              background: mode === 'join' ? 'rgba(255,255,255,0.1)' : 'transparent',
              color: mode === 'join' ? '#fff' : 'var(--muted)',
              borderRadius: 8, border: 'none', cursor: 'pointer', transition: 'all .2s'
            }}
          >
            Join Group
          </button>
        </div>

        {mode === 'create' ? (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt2)', marginBottom: 8 }}>Group Name</div>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Smoke Sesh Crew 🌿"
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 14, padding: '14px 16px',
                fontSize: 15, color: '#fff', fontFamily: 'Poppins, sans-serif',
                outline: 'none', marginBottom: 20,
              }}
            />
            {error && <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 12, textAlign: 'center' }}>{error}</div>}
            <SplashButton className="btn-3d-green" sound="pop" onClick={handleCreate} disabled={loading || !name.trim()}>
              {loading ? 'Creating...' : 'Create Group 🔥'}
            </SplashButton>
          </>
        ) : (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt2)', marginBottom: 8 }}>Invite Code</div>
            <input
              value={inviteToken}
              onChange={e => setInviteToken(e.target.value)}
              placeholder="e.g. AB12CD"
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 14, padding: '14px 16px',
                fontSize: 16, color: '#fff', fontFamily: 'monospace', fontWeight: 600,
                outline: 'none', marginBottom: 20, letterSpacing: 2, textTransform: 'uppercase'
              }}
            />
            {error && <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 12, textAlign: 'center' }}>{error}</div>}
            <SplashButton className="btn-3d-green" sound="pop" onClick={handleJoin} disabled={loading || !inviteToken.trim()}>
              {loading ? 'Joining...' : 'Join Group 🚀'}
            </SplashButton>
          </>
        )}
      </div>
    </div>
  );
}

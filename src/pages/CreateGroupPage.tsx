import { useState } from 'react';
import { SplashButton } from '../components/SplashButton';
import { createGroup } from '../lib/queries';

interface Props {
  onGroupCreated: () => void;
}

export default function CreateGroupPage({ onGroupCreated }: Props) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    const group = await createGroup(name.trim());
    setLoading(false);
    if (group) {
      const link = `${window.location.origin}/join/${group.invite_token}`;
      setInviteLink(link);
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
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Create your crew</div>
        <div style={{ fontSize: 14, color: 'var(--txt2)', fontWeight: 500 }}>Give your friend group a name to get started</div>
      </div>

      <div className="card" style={{ width: '100%', maxWidth: 360, padding: '24px 20px' }}>
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
        <SplashButton className="btn-3d-green" sound="pop" onClick={handleCreate} disabled={loading || !name.trim()}>
          {loading ? 'Creating...' : 'Create Group 🔥'}
        </SplashButton>
      </div>
    </div>
  );
}

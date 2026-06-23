import { useState } from 'react';
import { createMeetup } from '../lib/queries';
import { SplashButton } from '../components/SplashButton';

interface Props {
  groupId: string;
  onCreated: () => void;
  onSkip: () => void;
}

export default function CreateMeetupPage({ groupId, onCreated, onSkip }: Props) {
  const [title, setTitle] = useState('');
  const [place, setPlace] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setLoading(true);
    let start_at: string | undefined;
    if (date && time) {
      start_at = new Date(`${date}T${time}`).toISOString();
    }
    await createMeetup({ group_id: groupId, title: title.trim(), place_label: place.trim() || undefined, start_at });
    setLoading(false);
    onCreated();
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 14, padding: '14px 16px',
    fontSize: 15, color: '#fff', fontFamily: 'Poppins, sans-serif',
    outline: 'none', marginBottom: 14,
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', gap: 20, background: 'linear-gradient(160deg, #050e07 0%, #0a160e 100%)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>📍</div>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Plan the meetup</div>
        <div style={{ fontSize: 14, color: 'var(--txt2)', fontWeight: 500 }}>Set the details for your session</div>
      </div>

      <div className="card" style={{ width: '100%', maxWidth: 360, padding: '24px 20px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt2)', marginBottom: 6 }}>MEETUP TITLE *</div>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Smoke Sesh Tonight 🔥" style={inputStyle} />

        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt2)', marginBottom: 6 }}>LOCATION</div>
        <input value={place} onChange={e => setPlace(e.target.value)} placeholder="e.g. 123 Greenway Ave, LA" style={inputStyle} />

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt2)', marginBottom: 6 }}>DATE</div>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...inputStyle, colorScheme: 'dark' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt2)', marginBottom: 6 }}>TIME</div>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{ ...inputStyle, colorScheme: 'dark' }} />
          </div>
        </div>

        <SplashButton className="btn-3d-green" sound="pop" style={{ width: '100%', marginTop: 8 }} onClick={handleCreate} disabled={loading}>
          {loading ? 'Creating...' : 'Create Meetup 🚀'}
        </SplashButton>
      </div>

      <button onClick={onSkip} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 14, cursor: 'pointer', padding: 8 }}>
        Skip for now →
      </button>
    </div>
  );
}

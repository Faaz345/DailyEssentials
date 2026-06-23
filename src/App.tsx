import { useState, useRef, useEffect, createContext, useContext } from 'react';
import { useAnimate } from 'motion/react';
import { SplashButton } from './components/SplashButton';
import { EditProfileModal } from './components/EditProfileModal';
import { playSound, getSoundsEnabled, setSoundsEnabled } from './lib/sounds';
import './index.css';
import logoSrc from './assets/logo.png';
import _bgSrc from './assets/bg.png'; // imported so Vite bundles it
import avYou from './assets/av_you.png';

import { supabase, signOut } from './lib/supabase';
import {
  upsertProfile, fetchMyGroup, fetchLatestMeetup,
  fetchGroupMembers, fetchSupplies, fetchRsvps, claimSupply, unclaimSupply,
  addSupply, upsertRsvp, fetchOrCreateConversation, fetchMessages, sendMessage,
  fetchProfileStats, addMessageReaction, removeMessageReaction,
  deleteMessage, markMessagesRead, fetchReceipts
} from './lib/queries';
import type { Profile, Group, Meetup, Rsvp, Supply, Message, Membership } from './lib/queries';
import AuthPage from './pages/AuthPage';
import CreateGroupPage from './pages/CreateGroupPage';
import CreateMeetupPage from './pages/CreateMeetupPage';
import type { Session } from '@supabase/supabase-js';

// ─── App Context ────────────────────────────────────────────────
interface AppCtx {
  session: Session | null;
  profile: Profile | null;
  group: Group | null;
  meetup: Meetup | null;
  members: Membership[];
  rsvps: Rsvp[];
  supplies: Supply[];
  messages: Message[];
  conversationId: string | null;
  reloadData: () => void;
}
const AppContext = createContext<AppCtx>({
  session: null, profile: null, group: null, meetup: null,
  members: [], rsvps: [], supplies: [], messages: [], conversationId: null,
  reloadData: () => { },
});
const useApp = () => useContext(AppContext);

// ─────────────────────────────────────────────
// SVG Icons
// ─────────────────────────────────────────────
const IcoMeetup = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
      fill={active ? '#A3E635' : '#5A7C5C'} />
    <circle cx="12" cy="9" r="2.5" fill={active ? '#071208' : '#071208'} />
  </svg>
);
const IcoSupplies = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="7" width="18" height="14" rx="2.5" fill={active ? '#A3E635' : '#5A7C5C'} />
    <path d="M8 7V5a4 4 0 018 0v2" stroke={active ? '#A3E635' : '#5A7C5C'} strokeWidth="2" strokeLinecap="round" />
    <path d="M9 12h6M9 15.5h4" stroke={active ? '#071208' : '#071208'} strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const IcoChat = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
      fill={active ? '#A3E635' : '#5A7C5C'} />
    <circle cx="9" cy="10" r="1.2" fill={active ? '#071208' : '#071208'} />
    <circle cx="12" cy="10" r="1.2" fill={active ? '#071208' : '#071208'} />
    <circle cx="15" cy="10" r="1.2" fill={active ? '#071208' : '#071208'} />
  </svg>
);
const IcoProfile = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="8" r="4" fill={active ? '#A3E635' : '#5A7C5C'} />
    <path d="M4 20c0-3.31 3.58-6 8-6s8 2.69 8 6"
      stroke={active ? '#A3E635' : '#5A7C5C'} strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

// ─────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────
// No demo data

// Circular Progress Ring
const Ring = ({ pct }: { pct: number }) => {
  const r = 26, circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(pct, 100) / 100) * circ;
  return (
    <svg className="circ-ring" viewBox="0 0 62 62" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx="31" cy="31" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5.5" />
      <circle cx="31" cy="31" r={r} fill="none"
        stroke={pct >= 100 ? '#22C55E' : '#FACC15'}
        strokeWidth="5.5" strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset .5s ease, stroke .5s ease' }}
      />
      <g style={{ transform: 'rotate(90deg)', transformOrigin: 'center' }}>
        <text x="31" y="29" fill="#fff" fontSize="14" fontWeight="800"
          textAnchor="middle" fontFamily="Poppins,sans-serif" dy=".3em">{pct}%</text>
        <text x="31" y="42" fill="var(--muted)" fontSize="9" fontWeight="600"
          textAnchor="middle" fontFamily="Poppins,sans-serif">Covered</text>
      </g>
    </svg>
  );
};

// ─────────────────────────────────────────────
// MEETUP TAB
// ─────────────────────────────────────────────
function MeetupTab() {
  const { meetup, rsvps, members, session, reloadData } = useApp();
  const myRsvp = rsvps.find(r => r.user_id === session?.user?.id)?.status ?? null;
  const [rsvpLoading, setRsvpLoading] = useState(false);

  const handleRsvp = async (status: 'in' | 'out' | 'maybe') => {
    if (!meetup) return;
    setRsvpLoading(true);
    playSound('click');
    await upsertRsvp(meetup.id, status);
    await reloadData();
    setRsvpLoading(false);
  };

  const startDate = meetup?.start_at ? new Date(meetup.start_at) : null;
  const dateStr = startDate ? startDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) : 'TBD';
  const timeStr = startDate ? startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD';

  const membersWithStatus = members.map(m => {
    const rsvp = rsvps.find(r => r.user_id === m.user_id);
    const isMe = m.user_id === session?.user?.id;
    return {
      id: m.user_id,
      name: isMe ? 'You' : (m.profiles?.display_name ?? 'Member'),
      color: '#21C55D',
      avatar: m.profiles?.avatar_url ?? avYou,
      isHost: m.role === 'owner',
      status: rsvp?.status === 'in' ? "I'm In" : rsvp?.status === 'out' ? "Can't" : 'Maybe',
      pillCls: rsvp?.status === 'in' ? 'pill-in' : rsvp?.status === 'out' ? 'pill-cant' : 'pill-host',
    };
  });

  const displayMembers = membersWithStatus;

  return (
    <div style={{ animation: 'fade-in .2s ease' }}>
      <div className="card">
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div className="meetup-title">{meetup?.title ?? 'Smoke Sesh Tonight 🔥'}</div>
            <div className="meetup-info-row">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9BB09C" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" />
              </svg>
              {dateStr}
            </div>
            <div className="meetup-info-row">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9BB09C" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
              </svg>
              {timeStr}
            </div>
            {meetup?.place_label && (
              <div className="meetup-info-row">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="#5A7C5C">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                </svg>
                {meetup.place_label}
              </div>
            )}
          </div>
          <div className="nova-badge">
            <div style={{ fontSize: 28, lineHeight: 1, marginBottom: 4 }}>🌿</div>
            <div className="nova-number">420</div>
            <div className="nova-text">Nova</div>
          </div>
        </div>

        <SplashButton
          className="btn-3d-green"
          style={{ marginTop: 20, width: '100%' }}
          sound="whoosh"
          onClick={() => window.open(`https://maps.google.com/maps?q=${encodeURIComponent(meetup?.place_label ?? '123 Greenway Ave, Los Angeles')}`, '_blank')}
        >
          Open in Maps
        </SplashButton>
      </div>

      <div className="card" style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt2)' }}>Are you joining?</div>
        <div className="rsvp-row">
          <SplashButton className="btn-3d-green" sound="success" style={{ flex: 1, padding: '14px 0' }} onClick={() => handleRsvp('in')} disabled={rsvpLoading}>
            {myRsvp === 'in' ? '✓ I\'m In' : 'I\'m In'}
          </SplashButton>
          <SplashButton className="btn-3d-dark" sound="click" style={{ flex: 1, padding: '14px 0' }} onClick={() => handleRsvp('out')} disabled={rsvpLoading}>
            {myRsvp === 'out' ? '✓ Out' : 'Out'}
          </SplashButton>
          <SplashButton className="btn-3d-dark" sound="whoosh" style={{ flex: 1, padding: '14px 0' }} onClick={() => handleRsvp('maybe')} disabled={rsvpLoading}>
            {myRsvp === 'maybe' ? '✓ Maybe' : 'Maybe'}
          </SplashButton>
        </div>
      </div>

      <div className="card">
        <div className="who-coming-label">
          Who's coming <span>({displayMembers.length})</span>
        </div>
        <div className="avatar-row hide-scroll">
          {displayMembers.map((m: any) => (
            <div className="avatar-item" key={m.id}>
              <div className="avatar-circle" style={{ background: m.color }}>
                <img src={m.avatar} alt={m.name} />
                {m.isHost && <span className="avatar-crown">👑</span>}
              </div>
              <div className="avatar-name">{m.name}</div>
              <span className={`pill ${m.pillCls}`}>{m.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SUPPLIES TAB
// ─────────────────────────────────────────────
const TIPS = [
  "Don't forget to grab ice! The host has the venue ready, let's make sure the vibes are right. 🧊",
  "Bring your own rolling tray if you have a favorite one. 🛹",
  "Good music is essential. Add your tracks to the shared Spotify playlist! 🎵",
  "If you're bringing snacks, try to bring something sweet and something salty. 🥨"
];

export type SupplyItem = {
  id: string;
  name: string;
  imgSrc?: string;
  icon?: string;
  by: string | null;
};

function SuppliesTab() {
  const { supplies: ctxSupplies, meetup, reloadData } = useApp();
  const [tipIdx, setTipIdx] = useState(0);
  const [customName, setCustomName] = useState('');
  const [addingCustom, setAddingCustom] = useState(false);

  const supplies = ctxSupplies;

  useEffect(() => {
    const timer = setInterval(() => {
      setTipIdx(v => (v + 1) % TIPS.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const covered = supplies.filter((s: any) => s.by || s.claimed_by).length;
  const pct = Math.round((covered / Math.max(supplies.length, 1)) * 100);

  const toggle = async (s: any) => {
    playSound(s.claimed_by ? 'click' : 'pop');
    if (!meetup) return;
    if (s.claimed_by) {
      await unclaimSupply(s.id);
    } else {
      await claimSupply(s.id);
    }
    await reloadData();
  };

  const addCustomSupply = async () => {
    if (customName && customName.trim()) {
      playSound('pop');
      if (meetup) {
        await addSupply(meetup.id, customName.trim());
        await reloadData();
      }
      setCustomName('');
      setAddingCustom(false);
    }
  };

  return (
    <div style={{ animation: 'fade-in .2s ease', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 24, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10, marginLeft: 6, marginTop: 4 }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="#22C55E" style={{ filter: 'drop-shadow(0 2px 8px rgba(34,197,94,0.4))' }}>
          <rect x="3" y="7" width="18" height="14" rx="2.5" />
          <path d="M8 7V5a4 4 0 018 0v2" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" fill="none" />
        </svg>
        Supplies
      </div>

      <div className="card" style={{ padding: '20px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Session Supplies</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500, lineHeight: 1.4, paddingRight: 10 }}>
            {pct === 100 ? 'All covered! Let\'s go! 🎉' : 'Almost there! A few essentials left.'}
          </div>
        </div>
        <Ring pct={pct} />
      </div>

      <div>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--txt2)', marginBottom: 12, paddingLeft: 4 }}>Checklist</div>
        {supplies.map((s: any) => {
          const isClaimed = !!s.claimed_by;
          const claimedByName = s.profiles?.display_name ?? (s.claimed_by ? 'Someone' : null);
          const imgSrc = s.imgSrc;
          return (
            <div className="supply-row" key={s.id}>
              <div className="supply-icon" style={imgSrc ? { padding: 0, background: 'none', border: 'none', boxShadow: 'none' } : {}}>
                {imgSrc ? <img src={imgSrc} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))' }} /> : (s.icon ?? '📦')}
              </div>
              <div style={{ flex: 1 }}>
                <div className="supply-name">{s.name}</div>
                <div className="supply-by">
                  {isClaimed
                    ? <><span>Claimed by </span><span className="claimed">{claimedByName}</span></>
                    : <span className="needed">Still needed</span>
                  }
                </div>
              </div>
              <SplashButton className={isClaimed ? "supply-check-btn" : "supply-add-btn"} sound={isClaimed ? "click" : "pop"} onClick={() => toggle(s)}>
                {isClaimed ? '✓' : '+'}
              </SplashButton>
            </div>
          );
        })}

        {addingCustom ? (
          <div className="supply-row" style={{ marginTop: 10, marginBottom: 24, padding: '8px 12px' }}>
            <div style={{ flex: 1, display: 'flex', gap: 10 }}>
              <input
                autoFocus
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCustomSupply()}
                placeholder="Name a supply..."
                style={{
                  flex: 1, background: 'transparent', border: 'none', color: '#fff', fontSize: 15,
                  outline: 'none', fontFamily: 'Poppins, sans-serif'
                }}
              />
            </div>
            <SplashButton className="btn-3d-green" sound="pop" style={{ padding: '8px 16px', fontSize: 13 }} onClick={addCustomSupply}>
              Add
            </SplashButton>
            <SplashButton className="btn-3d-dark" sound="click" style={{ padding: '8px 16px', fontSize: 13 }} onClick={() => setAddingCustom(false)}>
              Cancel
            </SplashButton>
          </div>
        ) : (
          <SplashButton className="btn-3d-dark" sound="whoosh" style={{ marginTop: 10, marginBottom: 24, width: '100%' }} onClick={() => setAddingCustom(true)}>
            + Add Custom Supply
          </SplashButton>
        )}

        <div className="card" style={{
          padding: '16px',
          background: 'linear-gradient(145deg, rgba(34, 197, 94, 0.1), rgba(16, 42, 20, 0.4))',
          borderColor: 'rgba(34, 197, 94, 0.2)',
          display: 'flex', gap: 14, alignItems: 'flex-start',
          marginBottom: 16
        }}>
          <div style={{ fontSize: 26, flexShrink: 0, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>💡</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, color: 'var(--green-main)', marginBottom: 4, fontSize: 14 }}>Host Tip</div>
            <div style={{ fontSize: 13, color: 'var(--txt)', lineHeight: 1.4, fontWeight: 500, minHeight: 36 }}>
              {TIPS[tipIdx]}
            </div>
            <div className="tip-dots">
              {TIPS.map((_, i) => (
                <div key={i} className={`tip-dot ${i === tipIdx ? 'active' : ''}`} onClick={() => setTipIdx(i)} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────
// CHAT TAB
// ─────────────────────────────────────────────
function ChatTab() {
  const { messages: ctxMessages, conversationId, session, members, group, meetup, reloadData } = useApp();
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const channelRef = useRef<any>(null);
  const [receipts, setReceipts] = useState<Record<string, string[]>>({});
  const [menuMsg, setMenuMsg] = useState<string | null>(null); // message id for context menu
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const msgs = ctxMessages.map(m => ({
    id: m.id,
    text: m.body,
    time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    mine: m.sender_id === session?.user?.id,
    senderName: m.profiles?.display_name,
    senderAvatar: m.profiles?.avatar_url,
    senderColor: m.profiles?.accent_color ?? '#21C55D',
    createdAt: m.created_at,
    isDeleted: !!m.deleted_at,
  }));

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  // Auto mark all messages as read when chat opens or new messages arrive
  useEffect(() => {
    if (!conversationId || !ctxMessages.length) return;
    const ids = ctxMessages.map(m => m.id);
    markMessagesRead(conversationId, ids).then(() => {
      fetchReceipts(conversationId).then(setReceipts);
    });
  }, [conversationId, ctxMessages.length]);

  const send = async () => {
    if (!text.trim()) return;
    if (conversationId) {
      playSound('pop');
      await sendMessage(conversationId, text.trim());
      await reloadData();
    }
    setText('');
  };

  useEffect(() => {
    if (!conversationId || !session?.user) return;
    const channel = supabase.channel(`chat_sync:${conversationId}`, {
      config: { presence: { key: session.user.id } }
    });
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setOnlineUsers(Object.keys(state));
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        setTypingUsers(prev => {
          if (!prev.includes(payload.user_id)) return [...prev, payload.user_id];
          return prev;
        });
        setTimeout(() => {
          setTypingUsers(prev => prev.filter(id => id !== payload.user_id));
        }, 3000);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });
    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); channelRef.current = null; };
  }, [conversationId, session?.user]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      send();
    } else {
      if (channelRef.current && session?.user) {
        channelRef.current.send({ type: 'broadcast', event: 'typing', payload: { user_id: session.user.id } });
      }
    }
  };

  // Long-press handlers for context menu
  const startPress = (msgId: string) => {
    pressTimer.current = setTimeout(() => { setMenuMsg(msgId); playSound('click'); }, 500);
  };
  const endPress = () => {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
  };

  const handleDelete = async (msgId: string) => {
    setMenuMsg(null);
    await deleteMessage(msgId);
    await reloadData();
  };

  // Read receipt helpers
  const totalMembers = members.length;
  const getReceiptStatus = (msgId: string, isMe: boolean): 'sent' | 'delivered' | 'read' => {
    if (!isMe) return 'sent';
    const readers = receipts[msgId] ?? [];
    const othersRead = readers.filter(uid => uid !== session?.user?.id).length;
    if (othersRead >= totalMembers - 1 && totalMembers > 1) return 'read';
    if (othersRead > 0) return 'delivered';
    return 'sent';
  };

  return (
    <div style={{
      flex: 1,
      display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(180deg, rgba(3,9,5,0.6) 0%, rgba(3,9,5,0.45) 100%)',
      backdropFilter: 'blur(8px)',
      animation: 'fade-in .2s ease',
      overflow: 'hidden',
    }}>
      {/* Context menu overlay */}
      {menuMsg && (
        <>
          <div onClick={() => setMenuMsg(null)} style={{ position: 'fixed', inset: 0, zIndex: 200 }} />
          <div style={{
            position: 'fixed', bottom: 160, left: '50%', transform: 'translateX(-50%)',
            background: 'linear-gradient(160deg,#1A2E1C,#0F1E12)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16, zIndex: 201, overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
            minWidth: 200,
          }}>
            {(() => {
              const msg = msgs.find(m => m.id === menuMsg);
              const canDelete = msg?.mine && msg && (Date.now() - new Date(msg.createdAt).getTime()) < 5 * 60 * 1000;
              return (
                <>
                  {canDelete && (
                    <button onClick={() => handleDelete(menuMsg)} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      width: '100%', padding: '14px 18px', background: 'none', border: 'none',
                      color: '#f87171', fontSize: 14, fontWeight: 600, cursor: 'pointer', textAlign: 'left',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}>
                      🗑️ Delete for everyone
                    </button>
                  )}
                  <button onClick={() => {
                    const msg = msgs.find(m => m.id === menuMsg);
                    if (msg) { navigator.clipboard?.writeText(msg.text); }
                    setMenuMsg(null);
                  }} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    width: '100%', padding: '14px 18px', background: 'none', border: 'none',
                    color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', textAlign: 'left',
                  }}>
                    📋 Copy message
                  </button>
                </>
              );
            })()}
          </div>
        </>
      )}

      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 14px',
        background: 'linear-gradient(180deg,rgba(10,23,13,0.98) 0%,rgba(10,23,13,0.9) 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        flexShrink: 0,
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      }}>
        <div className="chat-hdr-avatars" onClick={() => setShowAddMembers(true)} style={{ position: 'relative', width: 46, height: 46, flexShrink: 0, cursor: 'pointer' }}>
          {members.slice(0, 2).map((m, i) => (
            <div key={m.user_id} className="chat-av" style={{
              position: 'absolute', width: 30, height: 30,
              top: i === 0 ? 0 : 'auto', bottom: i === 1 ? 0 : 'auto',
              left: i === 0 ? 0 : 'auto', right: i === 1 ? 0 : 'auto',
              background: m.profiles?.accent_color ?? '#21C55D',
              boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
            }}>
              {m.profiles?.avatar_url
                ? <img src={m.profiles.avatar_url} alt={m.profiles.display_name ?? 'Member'} referrerPolicy="no-referrer" />
                : <span style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>{(m.profiles?.display_name ?? 'M')[0].toUpperCase()}</span>
              }
            </div>
          ))}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
            {group?.name ?? 'Loading...'} <span style={{ fontSize: 15 }}>🌿</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 5, fontWeight: 500 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green-main)', display: 'inline-block', boxShadow: '0 0 6px var(--green-main)' }} />
            {Math.max(1, onlineUsers.length)} online
          </div>
        </div>
        <button className="chat-hdr-btn dark" onClick={() => setShowAddMembers(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
          </svg>
        </button>
      </div>

      <AddMembersModal open={showAddMembers} onClose={() => setShowAddMembers(false)} />

      {/* ── Pinned Meetup ── */}
      {meetup && (
        <div className="pinned-msg">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--green-main)" style={{ flexShrink: 0, marginTop: 2 }}>
            <path d="M16 3H8v2h1.5v6.5l-2.5 3v1h4v5l1 1 1-1v-5h4v-1l-2.5-3V5H16z" />
          </svg>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--green-main)', marginBottom: 1 }}>Pinned Meetup</div>
            <div style={{ fontSize: 13, color: 'var(--txt)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {meetup.title}{meetup.start_at ? ` · ${new Date(meetup.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
            </div>
          </div>
        </div>
      )}

      {/* ── Messages ── */}
      <div className="hide-scroll" style={{ flex: 1, overflowY: 'auto', padding: '12px 14px 8px' }}>
        {msgs.map((msg: any) => {
          const isMe = msg.mine;
          const avatar = msg.senderAvatar;
          const name = msg.senderName ?? 'Member';
          const color = msg.senderColor ?? '#21C55D';
          const rawMsg = ctxMessages.find(m => m.id === msg.id);
          const reactions = rawMsg?.message_reactions || [];
          const grouped: Record<string, number> = {};
          reactions.forEach((r: any) => { grouped[r.emoji] = (grouped[r.emoji] ?? 0) + 1; });
          const myReaction = reactions.find((r: any) => r.user_id === session?.user?.id);
          const receiptStatus = getReceiptStatus(msg.id, isMe);

          const toggleReaction = async (emoji: string) => {
            if (msg.isDeleted) return;
            playSound('click');
            if (myReaction?.emoji === emoji) {
              await removeMessageReaction(msg.id, emoji);
            } else {
              if (myReaction) await removeMessageReaction(msg.id, myReaction.emoji);
              await addMessageReaction(msg.id, emoji);
            }
            await reloadData();
          };

          return (
            <div key={msg.id} className={`chat-row${isMe ? ' me' : ''}`}
              onMouseDown={() => startPress(msg.id)}
              onMouseUp={endPress}
              onMouseLeave={endPress}
              onTouchStart={() => startPress(msg.id)}
              onTouchEnd={endPress}
            >
              {!isMe && (
                <div className="chat-av" style={{ background: color, flexShrink: 0 }}>
                  {avatar
                    ? <img src={avatar} alt={name} referrerPolicy="no-referrer" />
                    : <span style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>{name[0].toUpperCase()}</span>
                  }
                </div>
              )}
              <div className="chat-bubble-wrap">
                {!isMe && <div className="chat-sender">{name}</div>}

                <div className={`chat-bubble ${isMe ? 'mine' : 'theirs'}${msg.isDeleted ? ' deleted' : ''}`}
                  onDoubleClick={() => !msg.isDeleted && toggleReaction('🔥')}
                  style={msg.isDeleted ? { opacity: 0.55, fontStyle: 'italic', fontSize: 13 } : undefined}
                >
                  {msg.text}
                </div>

                {/* Emoji reactions */}
                {!msg.isDeleted && Object.keys(grouped).length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4, justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                    {Object.entries(grouped).map(([emoji, count]) => (
                      <button
                        key={emoji}
                        onClick={() => toggleReaction(emoji)}
                        style={{
                          background: myReaction?.emoji === emoji ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.08)',
                          border: `1px solid ${myReaction?.emoji === emoji ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.1)'}`,
                          borderRadius: 20, padding: '2px 8px', fontSize: 13,
                          color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                          fontFamily: 'inherit',
                        }}
                      >
                        {emoji} {count > 1 && <span style={{ fontSize: 11, opacity: 0.7 }}>{count}</span>}
                      </button>
                    ))}
                  </div>
                )}

                {/* Time + read receipt */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                  <span className="chat-time">{msg.time}</span>
                  {isMe && (
                    <span style={{ fontSize: 12, lineHeight: 1, marginBottom: 1 }}>
                      {receiptStatus === 'read'
                        ? <span style={{ color: '#4FC3F7', letterSpacing: -2 }}>✓✓</span>
                        : receiptStatus === 'delivered'
                          ? <span style={{ color: 'rgba(255,255,255,0.5)', letterSpacing: -2 }}>✓✓</span>
                          : <span style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: 0 }}>✓</span>
                      }
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {typingUsers.length > 0 && (
          <div className="chat-row" style={{ animation: 'fade-in 0.2s ease' }}>
            <div className="chat-bubble-wrap">
              <div className="chat-bubble theirs" style={{ fontSize: 13, fontStyle: 'italic', opacity: 0.7 }}>
                Someone is typing…
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* ── Input Bar ── */}
      <div style={{
        padding: '10px 14px',
        paddingBottom: 'calc(85px + max(10px, env(safe-area-inset-bottom)))',
        background: 'linear-gradient(0deg,rgba(8,18,10,0.98) 0%,rgba(8,18,10,0.9) 100%)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        flexShrink: 0,
      }}>
        <div className="chat-input-wrapper">
          <div className="chat-input-row">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7E9C80" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
            </svg>
            <input
              placeholder="Type a message..."
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7E9C80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, cursor: 'pointer' }}>
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
              <line x1="9" y1="9" x2="9.01" y2="9"></line>
              <line x1="15" y1="9" x2="15.01" y2="9"></line>
            </svg>
          </div>
          <SplashButton className="btn-3d-green" sound="pop" style={{ width: 44, height: 44, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} onClick={send}>
            <span style={{ fontSize: 18 }}>↑</span>
          </SplashButton>
        </div>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────
// PROFILE TAB
// ─────────────────────────────────────────────
function ProfileTab() {
  const { profile, group, reloadData } = useApp();
  const [soundsOn, setSoundsOn] = useState(getSoundsEnabled());
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [stats, setStats] = useState({ meetupsHosted: 0, sessionsAttended: 0 });

  useEffect(() => {
    fetchProfileStats().then(s => setStats(s));
  }, [profile]);

  const handleToggleSounds = () => {
    const newVal = !soundsOn;
    setSoundsOn(newVal);
    setSoundsEnabled(newVal);
    playSound('pop');
  };

  const copyInvite = () => {
    if (group?.invite_token) {
      navigator.clipboard.writeText(`${window.location.origin}/join/${group.invite_token}`);
      playSound('success');
    }
  };

  const displayName = profile?.display_name ?? 'You';
  const avatarUrl = profile?.avatar_url ?? avYou;
  const statusText = profile?.status_text ?? 'Keep it chill & positive 🌿';

  return (
    <div style={{ animation: 'fade-in .2s ease', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="card" style={{ padding: '22px 20px', display: 'flex', alignItems: 'center', gap: 18, marginBottom: 0 }}>
        <div style={{ position: 'relative' }}>
          <div className="profile-av" style={{ width: 88, height: 88, border: '3px solid var(--accent)', boxShadow: '0 0 16px rgba(33,197,93,0.25)' }}>
            {avatarUrl.startsWith('http') ? (
              <img src={avatarUrl} alt={displayName} referrerPolicy="no-referrer" />
            ) : (
              <img src={avatarUrl} alt={displayName} />
            )}
          </div>
          <div style={{
            position: 'absolute', bottom: -2, right: -4,
            width: 28, height: 28, borderRadius: '50%', background: 'var(--accent)',
            display: 'grid', placeItems: 'center', color: '#fff',
            boxShadow: '0 2px 8px rgba(0,0,0,.6)', border: '2px solid var(--bg-card)'
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
              <circle cx="12" cy="13" r="4"></circle>
            </svg>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{displayName}</div>
            <span className="profile-host-tag" style={{ padding: '3px 10px', fontSize: 11, letterSpacing: 0.3 }}>Host</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--txt2)', marginTop: 6, fontWeight: 500 }}>{statusText}</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 3 }}>All love, no drama.</div>

          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--txt)' }}><span style={{ fontSize: 16 }}>🌿</span> Level 7</span>
              <span><span style={{ color: 'var(--accent)' }}>1,250</span> <span style={{ color: 'var(--muted)', fontWeight: 500 }}>/ 2,000 XP</span></span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)' }}>
              <div style={{ height: '100%', width: '60%', background: 'linear-gradient(90deg, #16A34A, #3DD88C)', borderRadius: 3, boxShadow: '0 0 8px rgba(50,205,50,0.5)' }} />
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <SplashButton className="btn-3d-dark" sound="whoosh" style={{ width: '100%' }} onClick={() => setEditModalOpen(true)}>Edit Profile</SplashButton>
          </div>
        </div>
      </div>

      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', padding: '18px 12px', marginBottom: 0 }}>
        {[
          { icon: '👥', count: stats.meetupsHosted, label: 'Meetups\nHosted' },
          { icon: '🌿', count: stats.sessionsAttended, label: 'Sessions\nAttended' },
          { icon: '🔥', count: Math.round(stats.sessionsAttended * 15.4), label: 'Good Vibes\nEarned' },
          { icon: '🏆', count: Math.floor(stats.sessionsAttended / 5), label: 'Badges\nUnlocked' },
        ].map((stat, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 20, marginBottom: 6, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>{stat.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--txt)', lineHeight: 1 }}>{stat.count}</div>
            <div style={{ fontSize: 10, color: 'var(--txt2)', fontWeight: 500, lineHeight: 1.3, marginTop: 5, whiteSpace: 'pre-line' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt2)' }}>Crew Link</div>
        <SplashButton className="btn-3d-green" sound="success" style={{ width: '100%' }} onClick={copyInvite}>📋 Copy Invite Link</SplashButton>
      </div>

      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--txt2)', marginTop: 8, paddingLeft: 4 }}>Settings</div>
      <div className="card" style={{ padding: '0 20px' }}>
        <div style={{ padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Sound Effects</div>
          <div className="toggle" style={{ background: soundsOn ? 'var(--green-main)' : 'rgba(255,255,255,0.1)' }} onClick={handleToggleSounds}>
            <div className={`toggle-knob ${soundsOn ? 'on' : ''}`} />
          </div>
        </div>
      </div>

      <SplashButton className="btn-3d-dark" sound="crunch" style={{ width: '100%', marginTop: 24, color: '#f87171' }} onClick={signOut}>
        Log Out
      </SplashButton>

      <EditProfileModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        currentName={displayName}
        currentStatus={statusText}
        onSaved={reloadData}
      />
    </div>
  );
}

// ─────────────────────────────────────────────
// APP ROOT
// ─────────────────────────────────────────────
const TABS = [
  { id: 'meetup', label: 'Meetup', Icon: IcoMeetup },
  { id: 'supplies', label: 'Supplies', Icon: IcoSupplies },
  { id: 'chat', label: 'Chat', Icon: IcoChat },
  { id: 'profile', label: 'Profile', Icon: IcoProfile },
] as const;
type TabId = typeof TABS[number]['id'];

// ─────────────────────────────────────────────
// MENU DRAWER
// ─────────────────────────────────────────────
const MENU_ITEMS = [
  { icon: '🧑‍🤝‍🧑', label: 'Invite Friends', sub: 'Share your session link' },
  { icon: '📍', label: 'Live Location', sub: 'Coming soon' },
  { icon: '⚙️', label: 'Settings', sub: 'Preferences & account' },
  { icon: '💸', label: 'Split Calculator', sub: 'Divide costs evenly' },
  { icon: '🔔', label: 'Notification Prefs', sub: 'Manage alerts' },
  { icon: '❓', label: 'Help & Support', sub: 'FAQ & contact' },
];

function MenuDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: open ? 'rgba(0,0,0,0.55)' : 'transparent',
          pointerEvents: open ? 'all' : 'none',
          transition: 'background .25s',
          backdropFilter: open ? 'blur(3px)' : 'none',
        }}
      />
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0,
        width: 290, zIndex: 201,
        background: 'linear-gradient(160deg, #122016 0%, #0A1710 100%)',
        borderRight: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '12px 0 48px rgba(0,0,0,.6)',
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform .28s cubic-bezier(0.32,0,0.12,1)',
        display: 'flex', flexDirection: 'column',
        paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
      }}>
        <div style={{ padding: '54px 22px 22px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <img src={logoSrc} alt="Daily Essentials"
            style={{ height: 44, mixBlendMode: 'screen', filter: 'drop-shadow(0 0 10px rgba(163,230,53,.5))' }} />
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8, fontWeight: 500 }}>
            Your friend group hub 🌿
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
          {MENU_ITEMS.map(item => (
            <button key={item.label}
              onClick={onClose}
              style={{
                width: '100%', background: 'none', border: 'none',
                padding: '14px 22px', display: 'flex', alignItems: 'center', gap: 14,
                cursor: 'pointer', textAlign: 'left',
                transition: 'background .15s',
              }}
              onPointerEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
              onPointerLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <span style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                background: 'rgba(33,197,93,0.1)', border: '1px solid rgba(33,197,93,0.15)',
                display: 'grid', placeItems: 'center', fontSize: 18
              }}>{item.icon}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--txt)' }}>{item.label}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{item.sub}</div>
              </div>
            </button>
          ))}
        </div>
        <div style={{ padding: '16px 22px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Daily Essentials v1.0</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Built for real friends 🤙</div>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────
// NOTIFICATIONS PANEL
// ─────────────────────────────────────────────
const NOTIFS = [
  { id: 1, avatar: '🌿', msg: 'Maya joined the session!', time: '2m ago', read: false },
  { id: 2, avatar: '📍', msg: 'Jesse shared his location', time: '5m ago', read: false },
  { id: 3, avatar: '🛒', msg: 'Chris claimed Weed from supplies', time: '12m ago', read: true },
  { id: 4, avatar: '💬', msg: 'New message in Smoke Sesh Crew', time: '18m ago', read: true },
  { id: 5, avatar: '✅', msg: 'Tina updated her RSVP to Can\'t make it', time: '1h ago', read: true },
];

function NotifsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [notifs, setNotifs] = useState(NOTIFS);
  const markAll = () => setNotifs(p => p.map(n => ({ ...n, read: true })));
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: open ? 'rgba(0,0,0,0.5)' : 'transparent',
          pointerEvents: open ? 'all' : 'none',
          transition: 'background .25s',
          backdropFilter: open ? 'blur(3px)' : 'none',
        }}
      />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 300, zIndex: 201,
        background: 'linear-gradient(160deg,#122016 0%,#0A1710 100%)',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '-12px 0 48px rgba(0,0,0,.6)',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform .28s cubic-bezier(0.32,0,0.12,1)',
        display: 'flex', flexDirection: 'column',
        paddingBottom: 'max(20px,env(safe-area-inset-bottom))',
      }}>
        <div style={{ padding: '54px 18px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 17, fontWeight: 800 }}>Notifications</div>
          <button onClick={markAll} style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Mark all read</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {notifs.map(n => (
            <div key={n.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: '14px 18px',
              background: n.read ? 'none' : 'rgba(33,197,93,0.05)',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
              transition: 'background .2s',
            }}>
              <span style={{
                width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                background: n.read ? 'rgba(255,255,255,0.05)' : 'rgba(33,197,93,0.12)',
                border: `1px solid ${n.read ? 'rgba(255,255,255,0.06)' : 'rgba(33,197,93,0.2)'}`,
                display: 'grid', placeItems: 'center', fontSize: 17,
              }}>{n.avatar}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: n.read ? 500 : 700, color: n.read ? 'var(--txt2)' : 'var(--txt)', lineHeight: 1.4 }}>{n.msg}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{n.time}</div>
              </div>
              {!n.read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: 5 }} />}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function AddMembersModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'grid', placeItems: 'center', padding: 20,
      animation: 'fade-in .2s ease'
    }} onClick={onClose}>
      <div className="card" style={{ width: '100%', maxWidth: 360, padding: '24px 20px', margin: 0, animation: 'rise .3s cubic-bezier(0.34, 1.56, 0.64, 1)' }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>Add Members 🌿</div>
        <div className="chat-input-row" style={{ marginBottom: 16, padding: '10px 16px' }}>
          <input placeholder="Search active users..." autoFocus />
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--muted)' }}>
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 260, overflowY: 'auto', paddingRight: 6 }} className="hide-scroll">
          {[
            { name: 'Alex', color: '#EAB308', status: 'Online', inGroup: false },
            { name: 'Sam', color: '#EC4899', status: 'Online', inGroup: false },
            { name: 'Maya', color: '#60A5FA', status: 'In Group', inGroup: true },
            { name: 'Jesse', color: '#FBBF24', status: 'In Group', inGroup: true },
          ].map((u, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, opacity: u.inGroup ? 0.5 : 1 }}>
              <div className="chat-av" style={{ background: u.color, width: 38, height: 38, fontSize: 15 }}>{u.name[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{u.name}</div>
                <div style={{ fontSize: 11, color: u.status === 'Online' ? 'var(--green-main)' : 'var(--muted)', fontWeight: 600 }}>{u.status}</div>
              </div>
              {!u.inGroup && (
                <button className="chat-hdr-btn green" style={{ width: 32, height: 32, fontSize: 16, fontWeight: 800 }}>+</button>
              )}
            </div>
          ))}
        </div>
        <button className="btn-3d-green" style={{ marginTop: 24 }} onClick={onClose}>Done</button>
      </div>
    </div>
  )
}

// ─── Main App with Auth Guard ────────────────────────────────────
export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined); // undefined = loading
  const [profile, setProfile] = useState<Profile | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [meetup, setMeetup] = useState<Meetup | null>(null);
  const [members, setMembers] = useState<Membership[]>([]);
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [setupStep, setSetupStep] = useState<'group' | 'meetup' | 'done'>('done');

  const [tab, setTab] = useState<TabId>('meetup');
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifsOpen, setNotifsOpen] = useState(false);

  // ── Auth listener ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Load data when session changes ──
  const loadData = async () => {
    if (!session) return;
    // Profile
    const p = await upsertProfile(session);
    setProfile(p ?? null);
    // Group
    const g = await fetchMyGroup();
    setGroup(g);
    if (!g) { setSetupStep('group'); return; }
    // Members
    const mbs = await fetchGroupMembers(g.id);
    setMembers(mbs);
    // Meetup
    const m = await fetchLatestMeetup(g.id);
    setMeetup(m);

    // Always load conversation regardless of meetup
    const convId = await fetchOrCreateConversation(g.id);
    setConversationId(convId);
    if (convId) {
      const msgs = await fetchMessages(convId);
      setMessages(msgs);
    }

    if (!m) {
      setSetupStep('meetup');
    } else {
      setSetupStep('done');
      // RSVPs + Supplies
      const [r, s] = await Promise.all([
        fetchRsvps(m.id),
        fetchSupplies(m.id),
      ]);
      setRsvps(r);
      setSupplies(s);
    }
  };

  useEffect(() => { loadData(); }, [session]);

  // ── Realtime subscriptions ──
  useEffect(() => {
    if (!meetup?.id) return;
    const rsvpSub = supabase
      .channel(`rsvps:${meetup.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rsvps', filter: `meetup_id=eq.${meetup.id}` },
        () => fetchRsvps(meetup.id).then(setRsvps))
      .subscribe();
    const supplySub = supabase
      .channel(`supplies:${meetup.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'supplies', filter: `meetup_id=eq.${meetup.id}` },
        () => fetchSupplies(meetup.id).then(setSupplies))
      .subscribe();
    return () => { supabase.removeChannel(rsvpSub); supabase.removeChannel(supplySub); };
  }, [meetup?.id]);

  useEffect(() => {
    if (!conversationId) return;
    const msgSub = supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        () => fetchMessages(conversationId).then(setMessages))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' },
        () => fetchMessages(conversationId).then(setMessages))
      .subscribe();
    return () => { supabase.removeChannel(msgSub); };
  }, [conversationId]);

  // ── Loading state ──
  if (session === undefined) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#050e07' }}>
        <div style={{ fontSize: 40, animation: 'sparkle 1s infinite' }}>🌿</div>
      </div>
    );
  }

  // ── Not signed in ──
  if (!session) return <AuthPage />;

  // ── Setup flows ──
  if (setupStep === 'group') {
    return <CreateGroupPage onGroupCreated={() => { setSetupStep('meetup'); loadData(); }} />;
  }
  if (setupStep === 'meetup' && group) {
    return <CreateMeetupPage groupId={group.id} onCreated={() => { setSetupStep('done'); loadData(); }} onSkip={() => { setSetupStep('done'); loadData(); }} />;
  }

  // ── Main App ──
  const ctx: AppCtx = { session, profile, group, meetup, members, rsvps, supplies, messages, conversationId, reloadData: loadData };

  return (
    <AppContext.Provider value={ctx}>
      <div className="app-shell">
        <GlobalSmokeSplash />
        <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
        <NotifsPanel open={notifsOpen} onClose={() => setNotifsOpen(false)} />

        <header className="topbar">
          <button className="topbar-btn" aria-label="Menu" onClick={() => setMenuOpen(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
          <img src={logoSrc} alt="Daily Essentials" className="topbar-logo" />
          <button className="topbar-btn notif" aria-label="Notifications" onClick={() => setNotifsOpen(o => !o)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
            </svg>
          </button>
        </header>

        <div className={`scroll-body${tab === 'chat' ? ' no-scroll' : ''}`}>
          {tab === 'meetup' && <MeetupTab />}
          {tab === 'supplies' && <SuppliesTab />}
          {tab === 'profile' && <ProfileTab />}
        </div>

        {tab === 'chat' && (
          <div style={{
            position: 'fixed',
            top: 0, left: '50%',
            transform: 'translateX(-50%)',
            width: '100%',
            maxWidth: 430,
            bottom: 0,
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
            background: 'rgba(3,9,5,0.97)',
            overflow: 'hidden',
          }}>
            <ChatTab />
          </div>
        )}

        <nav className="bottom-nav" aria-label="Main navigation">
          <div className="bottom-nav-inner">
            {TABS.map(({ id, label, Icon }) => (
              <button key={id} id={`nav-${id}`}
                className={`nav-btn${tab === id ? ' active' : ''}`}
                onClick={() => setTab(id)}
                aria-current={tab === id ? 'page' : undefined}
              >
                <Icon active={tab === id} />
                {label}
              </button>
            ))}
          </div>
        </nav>
      </div>
    </AppContext.Provider>
  );
}

let audioCtx: AudioContext | null = null;
const playVibeSound = (btn: HTMLButtonElement) => {
  if (localStorage.getItem('soundsEnabled') === 'false') return;
  try {
    if (!audioCtx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      audioCtx = new AC();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const t = audioCtx.currentTime;
    const cls = btn.className || '';

    if (cls.includes('nav-btn')) {
      // Snap / light click for navigation
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(100, t + 0.05);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
      osc.start(t);
      osc.stop(t + 0.06);
    } else if (cls.includes('supply-add-btn') || cls.includes('supply-row')) {
      // Bubbles for adding supplies
      for (let i = 0; i < 3; i++) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sine';
        const start = t + i * 0.08;
        osc.frequency.setValueAtTime(150 + i * 20, start);
        osc.frequency.exponentialRampToValueAtTime(400 + i * 50, start + 0.05);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.15, start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, start + 0.05);
        osc.start(start);
        osc.stop(start + 0.06);
      }
    } else if (cls.includes('btn-3d-green') || cls.includes('btn-3d-dark')) {
      // Deep "Bong" / Bell for main actions
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, t); // Low A
      osc.frequency.exponentialRampToValueAtTime(210, t + 0.6);
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);
      osc.start(t);
      osc.stop(t + 0.6);
    } else {
      // Regular Pop for everything else
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.exponentialRampToValueAtTime(150, t + 0.1);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
      osc.start(t);
      osc.stop(t + 0.1);
    }
  } catch (e) { }
};

function GlobalSmokeSplash() {
  const [, animate] = useAnimate();

  useEffect(() => {
    const handleClick = async (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const button = target.closest('button') as HTMLButtonElement | null;
      if (!button) return;

      playVibeSound(button);

      if (getComputedStyle(button).position === 'static') {
        button.style.position = 'relative';
      }
      // Force stacking context so z-index: -1 children stay behind the button but above the background
      button.style.zIndex = '1';

      const wrapper = document.createElement("div");
      wrapper.style.position = "absolute";
      wrapper.style.left = "0";
      wrapper.style.top = "0";
      wrapper.style.width = "100%";
      wrapper.style.height = "100%";
      wrapper.style.pointerEvents = "none";
      wrapper.style.zIndex = "-1";
      wrapper.style.overflow = "visible";

      button.appendChild(wrapper);

      const rect = button.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const numElements = Math.floor(Math.random() * 10) + 12; // 12 to 22 particles
      const elements: HTMLElement[] = [];

      for (let i = 0; i < numElements; i++) {
        const ele = document.createElement("div");
        const size = Math.floor(Math.random() * 12) + 4; // 4 to 16px

        ele.style.position = 'absolute';
        ele.style.height = `${size}px`;
        ele.style.width = `${size}px`;
        ele.style.left = `${clickX}px`;
        ele.style.top = `${clickY}px`;
        ele.style.transform = "translate(-50%, -50%) scale(0)";
        ele.style.borderRadius = "50%";
        ele.style.background = Math.random() > 0.5 ? '#22C55E' : '#083D1B';
        ele.style.pointerEvents = 'none';

        wrapper.appendChild(ele);
        elements.push(ele);
      }

      await Promise.all(
        elements.map((ele) => {
          const angle = Math.random() * Math.PI * 2;
          const distance = Math.random() * 60 + 20; // 20 to 80px spread

          const xOffset = Math.cos(angle) * distance;
          const yOffset = Math.sin(angle) * distance;

          return animate(ele, {
            x: xOffset,
            y: yOffset,
            scale: [0, 1, 0],
            opacity: [1, 1, 0]
          }, { duration: 0.3 + Math.random() * 0.3, ease: "easeOut" });
        })
      );

      wrapper.remove();
    };

    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [animate]);

  return null;
}

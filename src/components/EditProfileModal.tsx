import { useState, useEffect } from 'react';
import { SplashButton } from './SplashButton';
import { updateProfile, uploadAvatar } from '../lib/queries';

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
  currentName: string;
  currentStatus: string;
  onSaved: () => void;
}

export function EditProfileModal({ open, onClose, currentName, currentStatus, onSaved }: EditProfileModalProps) {
  const [name, setName] = useState(currentName);
  const [status, setStatus] = useState(currentStatus);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  // Re-sync state every time the modal opens so stale values are never shown
  useEffect(() => {
    if (open) {
      setName(currentName);
      setStatus(currentStatus);
      setAvatarFile(null);
    }
  }, [open, currentName, currentStatus]);

  if (!open) return null;

  const handleSave = async () => {
    setLoading(true);
    let newAvatarUrl = undefined;
    
    if (avatarFile) {
      const uploadedUrl = await uploadAvatar(avatarFile);
      if (uploadedUrl) newAvatarUrl = uploadedUrl;
    }

    // Always save all fields — avoids the "nothing changed" false-negative
    const updates: any = {
      display_name: name.trim() || currentName,
      status_text: status.trim(),
    };
    if (newAvatarUrl) updates.avatar_url = newAvatarUrl;

    await updateProfile(updates);
    
    setLoading(false);
    onSaved();
    onClose();
  };

  return (
    <>
      <div 
        style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          animation: 'fade-in 0.2s ease'
        }}
        onClick={onClose}
      />
      <div className="card" style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: '90%', maxWidth: 360, zIndex: 301,
        padding: '24px 20px',
        animation: 'rise 0.3s ease both'
      }}>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>Edit Profile</div>
        
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, color: 'var(--txt2)', marginBottom: 6 }}>Display Name</label>
          <input 
            value={name} 
            onChange={e => setName(e.target.value)} 
            placeholder="Your name..."
            style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontSize: 15 }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, color: 'var(--txt2)', marginBottom: 6 }}>Status</label>
          <input 
            value={status} 
            onChange={e => setStatus(e.target.value)} 
            placeholder="What's the vibe?"
            style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontSize: 15 }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 13, color: 'var(--txt2)', marginBottom: 6 }}>Profile Picture</label>
          <input 
            type="file" 
            accept="image/*"
            onChange={e => e.target.files && setAvatarFile(e.target.files[0])}
            style={{ width: '100%', padding: '8px', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: 12, color: 'var(--muted)', fontSize: 13 }}
          />
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <SplashButton className="btn-3d-dark" sound="click" onClick={onClose} style={{ flex: 1 }}>Cancel</SplashButton>
          <SplashButton className="btn-3d-green" sound="success" onClick={handleSave} disabled={loading} style={{ flex: 1 }}>
            {loading ? 'Saving...' : 'Save Changes'}
          </SplashButton>
        </div>
      </div>
    </>
  );
}

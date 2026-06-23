import { supabase } from './supabase';

// ─── Types matching the DB schema ───────────────────────────────
export interface Profile {
  id: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  accent_color: string;
  status_emoji: string;
  status_text: string;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  invite_token: string;
  created_by: string;
  created_at: string;
}

export interface Membership {
  id: string;
  group_id: string;
  user_id: string;
  role: 'owner' | 'member';
  joined_at: string;
  profiles?: Profile;
}

export interface Meetup {
  id: string;
  group_id: string;
  title: string;
  place_label: string | null;
  lat: number | null;
  lng: number | null;
  start_at: string | null;
  created_by: string;
  created_at: string;
}

export interface Rsvp {
  id: string;
  meetup_id: string;
  user_id: string;
  status: 'in' | 'out' | 'maybe';
  updated_at: string;
  profiles?: Profile;
}

export interface Supply {
  id: string;
  meetup_id: string;
  name: string;
  claimed_by: string | null;
  note: string | null;
  created_at: string;
  profiles?: Profile;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
  profiles?: Profile;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  kind: 'text' | 'image' | 'system';
  reply_to_id: string | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  profiles?: Profile;
  message_reactions?: MessageReaction[];
}

// ─── Profile ─────────────────────────────────────────────────────
export const fetchProfile = async (userId: string): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) { console.error('fetchProfile:', error); return null; }
  return data;
};

export const upsertProfile = async (_session: unknown, displayName?: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const profile = {
    id: user.id,
    display_name: displayName ?? user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Anonymous',
    avatar_url: user.user_metadata?.avatar_url ?? null,
  };
  const { error } = await supabase.from('profiles').upsert(profile, { onConflict: 'id' });
  if (error) console.error('upsertProfile:', error);
  return fetchProfile(user.id);
};

export const updateProfile = async (updates: Partial<Profile>) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
  if (error) console.error('updateProfile:', error);
};

export const uploadAvatar = async (file: File): Promise<string | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  const fileExt = file.name.split('.').pop();
  const filePath = `${user.id}/${Math.random()}.${fileExt}`;
  
  const { error } = await supabase.storage.from('avatars').upload(filePath, file);
  if (error) { console.error('uploadAvatar:', error); return null; }
  
  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
  return publicUrl;
};

export const fetchProfileStats = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { meetupsHosted: 0, sessionsAttended: 0 };
  
  const { count: hostedCount } = await supabase.from('meetups').select('*', { count: 'exact', head: true }).eq('created_by', user.id);
  const { count: attendedCount } = await supabase.from('rsvps').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'in');
  
  return {
    meetupsHosted: hostedCount ?? 0,
    sessionsAttended: attendedCount ?? 0
  };
};

// ─── Groups ──────────────────────────────────────────────────────
export const fetchMyGroup = async (): Promise<Group | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('memberships')
    .select('groups(*)')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: true })
    .limit(1)
    .single();
  if (error || !data) return null;
  return (data as any).groups as Group;
};

export const createGroup = async (name: string): Promise<Group | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const token = Math.random().toString(36).substring(2, 8).toUpperCase();
  const { data: group, error: gErr } = await supabase
    .from('groups')
    .insert({ name, created_by: user.id, invite_token: token })
    .select()
    .single();
  if (gErr || !group) { console.error('createGroup:', gErr); return null; }
  await supabase.from('memberships').insert({ group_id: group.id, user_id: user.id, role: 'owner' });
  return group;
};

export const joinGroupByToken = async (token: string): Promise<Group | null> => {
  const { data: group, error } = await supabase
    .from('groups')
    .select('*')
    .eq('invite_token', token)
    .single();
  if (error || !group) { console.error('joinGroup:', error); return null; }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  await supabase.from('memberships').upsert({ group_id: group.id, user_id: user.id, role: 'member' }, { onConflict: 'group_id,user_id' });
  return group;
};

export const fetchGroupMembers = async (groupId: string): Promise<Membership[]> => {
  const { data, error } = await supabase
    .from('memberships')
    .select('*, profiles(*)')
    .eq('group_id', groupId);
  if (error) { console.error('fetchGroupMembers:', error); return []; }
  return data ?? [];
};

// ─── Meetups ─────────────────────────────────────────────────────
export const fetchLatestMeetup = async (groupId: string): Promise<Meetup | null> => {
  const { data, error } = await supabase
    .from('meetups')
    .select('*')
    .eq('group_id', groupId)
    .order('start_at', { ascending: true })
    .gte('start_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .limit(1)
    .single();
  if (error) return null;
  return data;
};

export const createMeetup = async (meetup: {
  group_id: string;
  title: string;
  place_label?: string;
  lat?: number;
  lng?: number;
  start_at?: string;
}): Promise<Meetup | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('meetups')
    .insert({ ...meetup, created_by: user.id })
    .select()
    .single();
  if (error) { console.error('createMeetup:', error); return null; }
  return data;
};

// ─── RSVPs ───────────────────────────────────────────────────────
export const fetchRsvps = async (meetupId: string): Promise<Rsvp[]> => {
  const { data, error } = await supabase
    .from('rsvps')
    .select('*, profiles(*)')
    .eq('meetup_id', meetupId);
  if (error) { console.error('fetchRsvps:', error); return []; }
  return data ?? [];
};

export const upsertRsvp = async (meetupId: string, status: 'in' | 'out' | 'maybe') => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase.from('rsvps').upsert(
    { meetup_id: meetupId, user_id: user.id, status, updated_at: new Date().toISOString() },
    { onConflict: 'meetup_id,user_id' },
  );
  if (error) console.error('upsertRsvp:', error);
};

// ─── Supplies ────────────────────────────────────────────────────
export const fetchSupplies = async (meetupId: string): Promise<Supply[]> => {
  const { data, error } = await supabase
    .from('supplies')
    .select('*, profiles:claimed_by(id, display_name, avatar_url)')
    .eq('meetup_id', meetupId)
    .order('created_at', { ascending: true });
  if (error) { console.error('fetchSupplies:', error); return []; }
  return data ?? [];
};

export const claimSupply = async (supplyId: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('supplies').update({ claimed_by: user.id }).eq('id', supplyId);
};

export const unclaimSupply = async (supplyId: string) => {
  await supabase.from('supplies').update({ claimed_by: null }).eq('id', supplyId);
};

export const addSupply = async (meetupId: string, name: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('supplies').insert({ meetup_id: meetupId, name, claimed_by: null });
};

export const deleteSupply = async (supplyId: string) => {
  await supabase.from('supplies').delete().eq('id', supplyId);
};

// ─── Chat / Messages ─────────────────────────────────────────────
export const fetchOrCreateConversation = async (groupId: string): Promise<string | null> => {
  let { data, error } = await supabase
    .from('conversations')
    .select('id')
    .eq('group_id', groupId)
    .eq('type', 'group')
    .single();
  if (!data) {
    const { data: created, error: cErr } = await supabase
      .from('conversations')
      .insert({ group_id: groupId, type: 'group' })
      .select('id')
      .single();
    if (cErr) { console.error('createConversation:', cErr); return null; }
    return created?.id ?? null;
  }
  if (error) { console.error('fetchConversation:', error); return null; }
  return data?.id ?? null;
};

export const fetchMessages = async (conversationId: string): Promise<Message[]> => {
  const { data, error } = await supabase
    .from('messages')
    .select('*, profiles:sender_id(id, display_name, avatar_url, accent_color), message_reactions(*, profiles:user_id(id, display_name))')
    .eq('conversation_id', conversationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(50);
  if (error) { console.error('fetchMessages:', error); return []; }
  return data ?? [];
};

export const sendMessage = async (conversationId: string, body: string, kind: 'text' | 'image' | 'system' = 'text') => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('messages').insert({ conversation_id: conversationId, sender_id: user.id, body, kind });
};

export const addMessageReaction = async (messageId: string, emoji: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('message_reactions').insert({ message_id: messageId, user_id: user.id, emoji });
};

export const removeMessageReaction = async (messageId: string, emoji: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('message_reactions').delete().match({ message_id: messageId, user_id: user.id, emoji });
};

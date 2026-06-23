-- ============================================================
-- Daily Essentials — Full Database Migration
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ── Profiles ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Anonymous',
  bio          TEXT,
  avatar_url   TEXT,
  accent_color TEXT DEFAULT '#21C55D',
  status_emoji TEXT DEFAULT '🌿',
  status_text  TEXT DEFAULT 'vibing',
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Auto-create a profile row when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), 'Anonymous'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Groups ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.groups (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  invite_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  created_by   UUID REFERENCES public.profiles(id),
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ── Memberships ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.memberships (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id  UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id   UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role      TEXT DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- ── Meetups ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.meetups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  place_label TEXT,
  lat         DOUBLE PRECISION,
  lng         DOUBLE PRECISION,
  start_at    TIMESTAMPTZ,
  created_by  UUID REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── RSVPs ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rsvps (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meetup_id  UUID REFERENCES public.meetups(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  status     TEXT NOT NULL CHECK (status IN ('in', 'out', 'maybe')),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(meetup_id, user_id)
);

-- ── Supplies ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.supplies (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meetup_id  UUID REFERENCES public.meetups(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  claimed_by UUID REFERENCES public.profiles(id),
  note       TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Conversations ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.conversations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  type       TEXT DEFAULT 'group' CHECK (type IN ('group', 'dm')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Messages ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id       UUID REFERENCES public.profiles(id),
  body            TEXT,
  kind            TEXT DEFAULT 'text' CHECK (kind IN ('text', 'image', 'system')),
  reply_to_id     UUID REFERENCES public.messages(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  edited_at       TIMESTAMPTZ,
  deleted_at      TIMESTAMPTZ
);

-- ── Reactions ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reactions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES public.profiles(id),
  emoji      TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- ── Read Receipts ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.message_receipts (
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES public.profiles(id),
  state      TEXT DEFAULT 'delivered' CHECK (state IN ('delivered', 'read')),
  at         TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY(message_id, user_id)
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetups          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rsvps            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplies         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_receipts ENABLE ROW LEVEL SECURITY;

-- PROFILES: readable by any authenticated user, writable only by owner
CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- SECURITY DEFINER FUNCTION to prevent infinite recursion
CREATE OR REPLACE FUNCTION public.is_member_of(_group_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE group_id = _group_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- GROUPS: visible to members or creator
CREATE POLICY "Groups visible to members or creator" ON public.groups
  FOR SELECT TO authenticated USING (
    created_by = auth.uid() OR public.is_member_of(id)
  );
CREATE POLICY "Authenticated users can create groups" ON public.groups
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

-- MEMBERSHIPS: visible to members of the group
CREATE POLICY "Memberships visible to group members" ON public.memberships
  FOR SELECT TO authenticated USING (
    public.is_member_of(group_id)
  );
CREATE POLICY "Authenticated users can join groups" ON public.memberships
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- MEETUPS: visible to group members
CREATE POLICY "Meetups visible to group members" ON public.meetups
  FOR ALL TO authenticated USING (
    public.is_member_of(group_id)
  );

-- RSVPS: visible to group members, mutable by owner
CREATE POLICY "RSVPs visible to group members" ON public.rsvps
  FOR SELECT TO authenticated USING (
    meetup_id IN (
      SELECT m.id FROM public.meetups m
      JOIN public.memberships mb ON mb.group_id = m.group_id
      WHERE mb.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can upsert their own RSVP" ON public.rsvps
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- SUPPLIES: visible to group members, mutable by members
CREATE POLICY "Supplies visible to group members" ON public.supplies
  FOR SELECT TO authenticated USING (
    meetup_id IN (
      SELECT m.id FROM public.meetups m
      JOIN public.memberships mb ON mb.group_id = m.group_id
      WHERE mb.user_id = auth.uid()
    )
  );
CREATE POLICY "Members can manage supplies" ON public.supplies
  FOR ALL TO authenticated USING (
    meetup_id IN (
      SELECT m.id FROM public.meetups m
      JOIN public.memberships mb ON mb.group_id = m.group_id
      WHERE mb.user_id = auth.uid()
    )
  );

-- CONVERSATIONS: visible to group members
CREATE POLICY "Conversations visible to group members" ON public.conversations
  FOR ALL TO authenticated USING (
    public.is_member_of(group_id)
  );

-- MESSAGES: visible to conversation members
CREATE POLICY "Messages visible to conversation members" ON public.messages
  FOR SELECT TO authenticated USING (
    conversation_id IN (
      SELECT c.id FROM public.conversations c
      JOIN public.memberships mb ON mb.group_id = c.group_id
      WHERE mb.user_id = auth.uid()
    )
  );
CREATE POLICY "Members can send messages" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (
    sender_id = auth.uid() AND
    conversation_id IN (
      SELECT c.id FROM public.conversations c
      JOIN public.memberships mb ON mb.group_id = c.group_id
      WHERE mb.user_id = auth.uid()
    )
  );

-- REACTIONS and RECEIPTS: visible to authenticated users in the conversation
CREATE POLICY "Reactions visible to conversation members" ON public.reactions
  FOR ALL TO authenticated USING (true);
CREATE POLICY "Receipts visible to authenticated users" ON public.message_receipts
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- ============================================================
-- REALTIME: Enable for live sync
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.rsvps;
ALTER PUBLICATION supabase_realtime ADD TABLE public.supplies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meetups;

-- ============================================================
-- Done! Your Daily Essentials database is ready.
-- ============================================================

 - -    % %  J o i n   G r o u p   R P C    % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % %
 C R E A T E   O R   R E P L A C E   F U N C T I O N   p u b l i c . j o i n _ g r o u p _ b y _ t o k e n ( i n v i t e _ c o d e   t e x t ) 
 R E T U R N S   u u i d 
 L A N G U A G E   p l p g s q l 
 S E C U R I T Y   D E F I N E R 
 A S   \ $ \ $ 
 D E C L A R E 
     f o u n d _ g r o u p _ i d   u u i d ; 
 B E G I N 
     S E L E C T   i d   I N T O   f o u n d _ g r o u p _ i d   F R O M   p u b l i c . g r o u p s   W H E R E   i n v i t e _ t o k e n   =   i n v i t e _ c o d e   L I M I T   1 ; 
     I F   f o u n d _ g r o u p _ i d   I S   N U L L   T H E N 
         R A I S E   E X C E P T I O N   ' I n v a l i d   i n v i t e   c o d e ' ; 
     E N D   I F ; 
 
     I N S E R T   I N T O   p u b l i c . m e m b e r s h i p s   ( g r o u p _ i d ,   u s e r _ i d ,   r o l e ) 
     V A L U E S   ( f o u n d _ g r o u p _ i d ,   a u t h . u i d ( ) ,   ' m e m b e r ' ) 
     O N   C O N F L I C T   D O   N O T H I N G ; 
 
     R E T U R N   f o u n d _ g r o u p _ i d ; 
 E N D ; 
 \ $ \ $ ;  
 
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = 
 - -   E N A B L E   R E A L T I M E 
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = 
 B E G I N ; 
     D R O P   P U B L I C A T I O N   I F   E X I S T S   s u p a b a s e _ r e a l t i m e ; 
     C R E A T E   P U B L I C A T I O N   s u p a b a s e _ r e a l t i m e ; 
 C O M M I T ; 
 A L T E R   P U B L I C A T I O N   s u p a b a s e _ r e a l t i m e   A D D   T A B L E   p u b l i c . p r o f i l e s ; 
 A L T E R   P U B L I C A T I O N   s u p a b a s e _ r e a l t i m e   A D D   T A B L E   p u b l i c . g r o u p s ; 
 A L T E R   P U B L I C A T I O N   s u p a b a s e _ r e a l t i m e   A D D   T A B L E   p u b l i c . m e m b e r s h i p s ; 
 A L T E R   P U B L I C A T I O N   s u p a b a s e _ r e a l t i m e   A D D   T A B L E   p u b l i c . m e e t u p s ; 
 A L T E R   P U B L I C A T I O N   s u p a b a s e _ r e a l t i m e   A D D   T A B L E   p u b l i c . r s v p s ; 
 A L T E R   P U B L I C A T I O N   s u p a b a s e _ r e a l t i m e   A D D   T A B L E   p u b l i c . s u p p l i e s ; 
 A L T E R   P U B L I C A T I O N   s u p a b a s e _ r e a l t i m e   A D D   T A B L E   p u b l i c . c o n v e r s a t i o n s ; 
 A L T E R   P U B L I C A T I O N   s u p a b a s e _ r e a l t i m e   A D D   T A B L E   p u b l i c . m e s s a g e s ; 
 A L T E R   P U B L I C A T I O N   s u p a b a s e _ r e a l t i m e   A D D   T A B L E   p u b l i c . m e s s a g e _ r e a c t i o n s ; 
 A L T E R   P U B L I C A T I O N   s u p a b a s e _ r e a l t i m e   A D D   T A B L E   p u b l i c . m e s s a g e _ r e c e i p t s ;  
 
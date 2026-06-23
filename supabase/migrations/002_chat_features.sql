-- ============================================================
-- Daily Essentials — Migration 002: Chat Features
-- ============================================================

-- 1. Add is_pinned to messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

-- 2. Create starred_messages table
CREATE TABLE IF NOT EXISTS public.starred_messages (
  user_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY(user_id, message_id)
);

-- 3. Enable RLS on starred_messages
ALTER TABLE public.starred_messages ENABLE ROW LEVEL SECURITY;

-- Users can only view and manage their own starred messages
CREATE POLICY "Users can view their own starred messages" ON public.starred_messages
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can star messages" ON public.starred_messages
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unstar messages" ON public.starred_messages
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 4. Enable Realtime for starred_messages
BEGIN;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.starred_messages;
COMMIT;

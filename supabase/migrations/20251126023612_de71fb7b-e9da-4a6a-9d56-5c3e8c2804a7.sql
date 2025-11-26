-- Create internal emails table
CREATE TABLE IF NOT EXISTS public.internal_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  starred BOOLEAN DEFAULT false,
  archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.internal_emails ENABLE ROW LEVEL SECURITY;

-- RLS policies for internal emails
CREATE POLICY "Users can view emails they sent or received"
  ON public.internal_emails FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send emails"
  ON public.internal_emails FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update emails they received"
  ON public.internal_emails FOR UPDATE
  USING (auth.uid() = recipient_id);

CREATE POLICY "Users can delete emails they sent or received"
  ON public.internal_emails FOR DELETE
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Create indexes for performance
CREATE INDEX idx_internal_emails_sender ON public.internal_emails(sender_id);
CREATE INDEX idx_internal_emails_recipient ON public.internal_emails(recipient_id);
CREATE INDEX idx_internal_emails_created_at ON public.internal_emails(created_at DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.internal_emails;
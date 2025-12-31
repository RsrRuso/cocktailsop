-- Create table to track user AI credits
CREATE TABLE public.user_ai_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  credits_balance INTEGER NOT NULL DEFAULT 0,
  total_purchased INTEGER NOT NULL DEFAULT 0,
  total_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_credits UNIQUE (user_id)
);

-- Create table to track credit transactions
CREATE TABLE public.ai_credit_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'usage', 'bonus', 'refund')),
  credits_amount INTEGER NOT NULL,
  description TEXT,
  stripe_session_id TEXT,
  feature_used TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table to define credit packages
CREATE TABLE public.ai_credit_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  credits INTEGER NOT NULL,
  price_cents INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_ai_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_credit_packages ENABLE ROW LEVEL SECURITY;

-- Policies for user_ai_credits
CREATE POLICY "Users can view their own credits"
ON public.user_ai_credits FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credits row"
ON public.user_ai_credits FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credits"
ON public.user_ai_credits FOR UPDATE
USING (auth.uid() = user_id);

-- Policies for ai_credit_transactions
CREATE POLICY "Users can view their own transactions"
ON public.ai_credit_transactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
ON public.ai_credit_transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policies for ai_credit_packages (public read)
CREATE POLICY "Anyone can view active packages"
ON public.ai_credit_packages FOR SELECT
USING (is_active = true);

-- Insert default credit packages
INSERT INTO public.ai_credit_packages (name, credits, price_cents, sort_order) VALUES
  ('Starter Pack', 50, 499, 1),
  ('Pro Pack', 150, 999, 2),
  ('Business Pack', 500, 2499, 3);

-- Create function to deduct credits
CREATE OR REPLACE FUNCTION public.deduct_ai_credits(
  p_user_id UUID,
  p_credits INTEGER,
  p_feature TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_balance INTEGER;
BEGIN
  -- Get current balance
  SELECT credits_balance INTO v_current_balance
  FROM public.user_ai_credits
  WHERE user_id = p_user_id;
  
  -- Check if user has record and sufficient balance
  IF v_current_balance IS NULL OR v_current_balance < p_credits THEN
    RETURN FALSE;
  END IF;
  
  -- Deduct credits
  UPDATE public.user_ai_credits
  SET 
    credits_balance = credits_balance - p_credits,
    total_used = total_used + p_credits,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Record transaction
  INSERT INTO public.ai_credit_transactions (user_id, transaction_type, credits_amount, feature_used, description)
  VALUES (p_user_id, 'usage', -p_credits, p_feature, 'AI feature usage: ' || COALESCE(p_feature, 'unknown'));
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to add credits
CREATE OR REPLACE FUNCTION public.add_ai_credits(
  p_user_id UUID,
  p_credits INTEGER,
  p_stripe_session_id TEXT DEFAULT NULL,
  p_transaction_type TEXT DEFAULT 'purchase'
)
RETURNS VOID AS $$
BEGIN
  -- Upsert credits balance
  INSERT INTO public.user_ai_credits (user_id, credits_balance, total_purchased)
  VALUES (p_user_id, p_credits, p_credits)
  ON CONFLICT (user_id) DO UPDATE SET
    credits_balance = user_ai_credits.credits_balance + p_credits,
    total_purchased = user_ai_credits.total_purchased + p_credits,
    updated_at = now();
  
  -- Record transaction
  INSERT INTO public.ai_credit_transactions (user_id, transaction_type, credits_amount, stripe_session_id, description)
  VALUES (p_user_id, p_transaction_type, p_credits, p_stripe_session_id, 'Credit purchase: ' || p_credits || ' credits');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for updated_at
CREATE TRIGGER update_user_ai_credits_updated_at
BEFORE UPDATE ON public.user_ai_credits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
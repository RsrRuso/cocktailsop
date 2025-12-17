-- Creator Monetization Tables

-- Table for tracking creator earnings and monetization settings
CREATE TABLE public.creator_monetization (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_creator BOOLEAN DEFAULT false,
  total_earnings NUMERIC(10,2) DEFAULT 0,
  available_balance NUMERIC(10,2) DEFAULT 0,
  pending_balance NUMERIC(10,2) DEFAULT 0,
  tips_enabled BOOLEAN DEFAULT false,
  badges_enabled BOOLEAN DEFAULT false,
  subscriptions_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Table for creator tips/donations
CREATE TABLE public.creator_tips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipper_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table for premium subscriptions offered by creators
CREATE TABLE public.creator_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price_monthly NUMERIC(10,2) NOT NULL,
  benefits TEXT[],
  is_active BOOLEAN DEFAULT true,
  subscriber_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table for user subscriptions to creators
CREATE TABLE public.user_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscriber_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES public.creator_subscriptions(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(subscriber_id, subscription_id)
);

-- Table for promoted content/ads
CREATE TABLE public.promoted_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  reel_id UUID REFERENCES public.reels(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  budget NUMERIC(10,2) NOT NULL,
  spent NUMERIC(10,2) DEFAULT 0,
  daily_budget NUMERIC(10,2),
  target_audience JSONB DEFAULT '{}',
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table for shop products
CREATE TABLE public.shop_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  compare_at_price NUMERIC(10,2),
  images TEXT[],
  category TEXT,
  product_type TEXT DEFAULT 'physical',
  is_digital BOOLEAN DEFAULT false,
  digital_file_url TEXT,
  inventory_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.creator_monetization ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promoted_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_products ENABLE ROW LEVEL SECURITY;

-- RLS Policies for creator_monetization
CREATE POLICY "Users can view own monetization" ON public.creator_monetization FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own monetization" ON public.creator_monetization FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own monetization" ON public.creator_monetization FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for creator_tips
CREATE POLICY "Creators can view their tips" ON public.creator_tips FOR SELECT USING (auth.uid() = creator_id);
CREATE POLICY "Users can send tips" ON public.creator_tips FOR INSERT WITH CHECK (auth.uid() = tipper_id);

-- RLS Policies for creator_subscriptions
CREATE POLICY "Anyone can view active subscriptions" ON public.creator_subscriptions FOR SELECT USING (is_active = true);
CREATE POLICY "Creators can manage own subscriptions" ON public.creator_subscriptions FOR ALL USING (auth.uid() = creator_id);

-- RLS Policies for user_subscriptions
CREATE POLICY "Users can view own subscriptions" ON public.user_subscriptions FOR SELECT USING (auth.uid() = subscriber_id);
CREATE POLICY "Users can manage own subscriptions" ON public.user_subscriptions FOR ALL USING (auth.uid() = subscriber_id);

-- RLS Policies for promoted_content
CREATE POLICY "Users can manage own promotions" ON public.promoted_content FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Active promotions visible to all" ON public.promoted_content FOR SELECT USING (status = 'active');

-- RLS Policies for shop_products
CREATE POLICY "Anyone can view active products" ON public.shop_products FOR SELECT USING (is_active = true);
CREATE POLICY "Sellers can manage own products" ON public.shop_products FOR ALL USING (auth.uid() = seller_id);

-- Indexes for performance
CREATE INDEX idx_creator_monetization_user ON public.creator_monetization(user_id);
CREATE INDEX idx_creator_tips_creator ON public.creator_tips(creator_id);
CREATE INDEX idx_creator_subscriptions_creator ON public.creator_subscriptions(creator_id);
CREATE INDEX idx_promoted_content_user ON public.promoted_content(user_id);
CREATE INDEX idx_promoted_content_status ON public.promoted_content(status);
CREATE INDEX idx_shop_products_seller ON public.shop_products(seller_id);
CREATE INDEX idx_shop_products_active ON public.shop_products(is_active);
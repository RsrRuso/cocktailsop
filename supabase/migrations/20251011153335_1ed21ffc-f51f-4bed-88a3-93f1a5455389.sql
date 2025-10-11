-- Drop bot_activity_log table
DROP TABLE IF EXISTS bot_activity_log CASCADE;

-- Create fake accounts
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES 
  ('10000000-0000-0000-0000-000000000001', 'maria@specverse.app', crypt('fake123', gen_salt('bf')), now(), now(), now()),
  ('10000000-0000-0000-0000-000000000002', 'james@specverse.app', crypt('fake123', gen_salt('bf')), now(), now(), now()),
  ('10000000-0000-0000-0000-000000000003', 'sarah@specverse.app', crypt('fake123', gen_salt('bf')), now(), now(), now()),
  ('10000000-0000-0000-0000-000000000004', 'david@specverse.app', crypt('fake123', gen_salt('bf')), now(), now(), now()),
  ('10000000-0000-0000-0000-000000000005', 'alex@specverse.app', crypt('fake123', gen_salt('bf')), now(), now(), now())
ON CONFLICT (id) DO NOTHING;

-- Create profiles for fake accounts
INSERT INTO profiles (id, username, full_name, avatar_url, bio, professional_title, badge_level, region, is_bot)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'maria_bar', 'Maria Rodriguez', 'https://api.dicebear.com/7.x/avataaars/svg?seed=maria', 'Bar Manager | Craft Cocktails | NYC', 'bar_manager', 'gold', 'USA', true),
  ('10000000-0000-0000-0000-000000000002', 'james_bartender', 'James Chen', 'https://api.dicebear.com/7.x/avataaars/svg?seed=james', 'Head Bartender | Premium Spirits', 'bartender', 'silver', 'USA', true),
  ('10000000-0000-0000-0000-000000000003', 'sarah_mix', 'Sarah Johnson', 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah', 'Award-winning Mixologist | London', 'mixologist', 'platinum', 'Europe', true),
  ('10000000-0000-0000-0000-000000000004', 'david_wine', 'David Kumar', 'https://api.dicebear.com/7.x/avataaars/svg?seed=david', 'Master Sommelier | Wine Expert', 'sommelier', 'gold', 'Asia', true),
  ('10000000-0000-0000-0000-000000000005', 'alex_brand', 'Alex Thompson', 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex', 'Brand Ambassador | Premium Brands', 'brand_ambassador', 'silver', 'Europe', true)
ON CONFLICT (id) DO NOTHING;

-- Create posts from fake accounts
INSERT INTO posts (user_id, content, media_urls, like_count, comment_count, created_at)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'Perfected our signature Old Fashioned! Balance of bourbon, bitters, orange. #bartending', ARRAY['https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800'], 45, 8, now() - interval '2 hours'),
  ('10000000-0000-0000-0000-000000000002', 'New cocktail menu tonight! House-made syrups, fresh ingredients 🍸', ARRAY['https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800'], 67, 12, now() - interval '4 hours'),
  ('10000000-0000-0000-0000-000000000003', 'Molecular mixology workshop! Edible spheres, smoked cocktails 🧪', ARRAY['https://images.unsplash.com/photo-1536935338788-846bb9981813?w=800'], 123, 24, now() - interval '6 hours'),
  ('10000000-0000-0000-0000-000000000004', 'Exceptional 2015 vintage. Perfect pairing for steak 🍷', ARRAY['https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800'], 89, 15, now() - interval '8 hours'),
  ('10000000-0000-0000-0000-000000000005', 'Premium craft spirits expo. Amazing innovations! ✨', ARRAY['https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=800'], 56, 9, now() - interval '10 hours'),
  ('10000000-0000-0000-0000-000000000001', 'Weekend prep: 200 bottles organized! 🍾', ARRAY['https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800'], 34, 5, now() - interval '12 hours'),
  ('10000000-0000-0000-0000-000000000002', 'Classic Negroni. Equal parts perfection 🥃', ARRAY['https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=800'], 78, 11, now() - interval '14 hours'),
  ('10000000-0000-0000-0000-000000000003', 'Cocktail masterclass weekend! Limited spots 🎓', NULL, 92, 18, now() - interval '16 hours')
ON CONFLICT DO NOTHING;

-- Create reels from fake accounts
INSERT INTO reels (user_id, video_url, caption, like_count, comment_count, view_count, created_at)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', 'Perfect Espresso Martini shake technique! 🔥 #bartending', 234, 45, 1567, now() - interval '3 hours'),
  ('10000000-0000-0000-0000-000000000002', 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', 'Flair bartending! Entertainment matters 🍹', 567, 89, 3421, now() - interval '5 hours'),
  ('10000000-0000-0000-0000-000000000003', 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', 'Smoking cocktail with rosemary vapor 🌿', 445, 67, 2890, now() - interval '7 hours'),
  ('10000000-0000-0000-0000-000000000004', 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', 'Wine tasting: look, swirl, smell, sip 🍷', 389, 52, 2134, now() - interval '9 hours'),
  ('10000000-0000-0000-0000-000000000005', 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4', 'Premium spirits launch event 🍾', 678, 92, 4123, now() - interval '11 hours')
ON CONFLICT DO NOTHING;
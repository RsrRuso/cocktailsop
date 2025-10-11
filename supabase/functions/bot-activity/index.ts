import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify admin access
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!roles || roles.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden - Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, numBots } = await req.json();

    if (action === 'create_bots') {
      return await createBots(supabase);
    } else if (action === 'generate_posts') {
      return await generateBotPosts(supabase, numBots || 5);
    } else if (action === 'generate_activity') {
      return await generateActivity(supabase);
    } else {
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function createBots(supabase: any) {
  const botProfiles = [
    { username: 'mixmaster_alex', full_name: 'Alex Martinez', bio: 'Award-winning Mixologist | 10+ years crafting signature cocktails', professional_title: 'mixologist', region: 'Dubai' },
    { username: 'chef_sarah_k', full_name: 'Sarah Kim', bio: 'Executive Chef | Michelin-trained | Fusion cuisine specialist', professional_title: 'chef', region: 'Abu Dhabi' },
    { username: 'bartender_mike', full_name: 'Mike Thompson', bio: 'Head Bartender | Classic cocktails enthusiast | Whiskey connoisseur', professional_title: 'bartender', region: 'Dubai' },
    { username: 'sommelier_emma', full_name: 'Emma Wilson', bio: 'Master Sommelier | Wine educator | 15 years experience', professional_title: 'sommelier', region: 'Dubai' },
    { username: 'barista_lisa', full_name: 'Lisa Chen', bio: 'Specialty Coffee Expert | Latte art champion 2024', professional_title: 'barista', region: 'Sharjah' },
    { username: 'chef_marco_r', full_name: 'Marco Rossi', bio: 'Italian Chef | Pasta specialist | Farm to table advocate', professional_title: 'chef', region: 'Dubai' },
    { username: 'mixo_jay', full_name: 'Jay Patel', bio: 'Creative Mixologist | Molecular cocktails | Bar consultant', professional_title: 'mixologist', region: 'Dubai' },
    { username: 'baker_nina', full_name: 'Nina Andersson', bio: 'Pastry Chef | French patisserie | Artisan breads', professional_title: 'chef', region: 'Abu Dhabi' },
    { username: 'bartender_carlos', full_name: 'Carlos Rodriguez', bio: 'Bar Manager | Tequila expert | Latin cocktails', professional_title: 'bartender', region: 'Dubai' },
    { username: 'wine_sophia', full_name: 'Sophia Laurent', bio: 'Wine Director | French wines specialist | WSET Diploma', professional_title: 'sommelier', region: 'Dubai' },
    { username: 'coffee_tom', full_name: 'Tom Anderson', bio: 'Head Barista | Coffee roaster | Brewing techniques', professional_title: 'barista', region: 'Dubai' },
    { username: 'chef_yuki', full_name: 'Yuki Tanaka', bio: 'Sushi Chef | Traditional Japanese cuisine | 12 years experience', professional_title: 'chef', region: 'Dubai' },
    { username: 'bar_manager_lee', full_name: 'Lee Park', bio: 'Bar Operations Manager | Team leadership | Inventory expert', professional_title: 'bar_manager', region: 'Abu Dhabi' },
    { username: 'mixo_amanda', full_name: 'Amanda Foster', bio: 'Craft Cocktail Specialist | Bitters expert | Bar trainer', professional_title: 'mixologist', region: 'Dubai' },
    { username: 'chef_andre', full_name: 'Andre Dubois', bio: 'Executive Sous Chef | Modern French | Fine dining', professional_title: 'chef', region: 'Dubai' },
    { username: 'beer_expert_dan', full_name: 'Dan Murphy', bio: 'Craft Beer Specialist | Cicerone certified | Brewery consultant', professional_title: 'sommelier', region: 'Dubai' },
    { username: 'pastry_elena', full_name: 'Elena Rossi', bio: 'Pastry Sous Chef | Dessert innovation | Chocolate artisan', professional_title: 'chef', region: 'Dubai' },
    { username: 'bar_owner_raj', full_name: 'Raj Malhotra', bio: 'Bar Owner | Entrepreneur | Industry mentor', professional_title: 'bar_manager', region: 'Dubai' },
    { username: 'spirit_kate', full_name: 'Kate Williams', bio: 'Spirits Educator | Whisky ambassador | Brand consultant', professional_title: 'sommelier', region: 'Abu Dhabi' },
    { username: 'barista_ahmed', full_name: 'Ahmed Al-Sayed', bio: 'Coffee Shop Manager | Arabic coffee specialist | Latte art', professional_title: 'barista', region: 'Dubai' },
  ];

  const createdBots = [];

  for (const botData of botProfiles) {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: `${botData.username}@bot.specverse.com`,
      password: crypto.randomUUID(),
      email_confirm: true,
      user_metadata: {
        username: botData.username,
        full_name: botData.full_name,
      }
    });

    if (authError) {
      console.error(`Error creating bot ${botData.username}:`, authError);
      continue;
    }

    // Update profile to mark as bot
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        is_bot: true,
        bio: botData.bio,
        professional_title: botData.professional_title,
        region: botData.region,
      })
      .eq('id', authData.user.id);

    if (profileError) {
      console.error(`Error updating bot profile ${botData.username}:`, profileError);
      continue;
    }

    createdBots.push({ id: authData.user.id, username: botData.username });
  }

  return new Response(JSON.stringify({ success: true, bots: createdBots }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function generateBotPosts(supabase: any, numPosts: number) {
  const { data: bots } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('is_bot', true);

  if (!bots || bots.length === 0) {
    return new Response(JSON.stringify({ error: 'No bots found. Create bots first.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
  const createdPosts = [];

  for (let i = 0; i < numPosts && i < bots.length; i++) {
    const bot = bots[i % bots.length];
    
    try {
      // Generate post content with AI
      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'system',
              content: 'You are a hospitality professional sharing insights about bartending, mixology, cocktails, or restaurant management. Be authentic and engaging.'
            },
            {
              role: 'user',
              content: 'Create a short social media post (2-3 sentences) about your work in the hospitality industry. Make it interesting, use relevant emojis, and make it feel natural.'
            }
          ],
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const content = aiData.choices[0].message.content;

        // Create post
        const { error } = await supabase
          .from('posts')
          .insert({
            user_id: bot.id,
            content,
            media_urls: []
          });

        if (!error) {
          await supabase.from('bot_activity_log').insert({ 
            bot_id: bot.id, 
            activity_type: 'create_post' 
          });
          createdPosts.push({ bot: bot.username, content });
        }
      }
      
      // Delay between requests
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`Error creating post for bot ${bot.username}:`, error);
    }
  }

  return new Response(JSON.stringify({ success: true, posts: createdPosts, count: createdPosts.length }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function generateActivity(supabase: any) {
  // Get all bots
  const { data: bots } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('is_bot', true);

  if (!bots || bots.length === 0) {
    return new Response(JSON.stringify({ error: 'No bots found. Create bots first.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Get all posts, reels for engagement
  const { data: posts } = await supabase.from('posts').select('id, user_id').limit(30);
  const { data: reels } = await supabase.from('reels').select('id, user_id').limit(30);
  const { data: profiles } = await supabase.from('profiles').select('id').eq('is_bot', false).limit(30);

  const activities = [];
  const comments = [
    'Great content! 🔥', 'Love this!', 'Amazing work! 👏', 'Impressive technique!', 
    'Keep it up!', 'So professional!', 'Learning so much from you!', 'Inspiring! ✨',
    'This is gold!', 'Excellent tips!', 'Thank you for sharing!', 'Brilliant! 💯',
    'Master at work!', 'Pure talent!', 'Such creativity!', 'Perfect execution!'
  ];

  for (const bot of bots) {
    // Each bot performs 2-4 random actions
    const numActions = Math.floor(Math.random() * 3) + 2;

    for (let i = 0; i < numActions; i++) {
      const actionType = Math.floor(Math.random() * 5);

      try {
        if (actionType === 0 && posts && posts.length > 0) {
          // Like a random post
          const post = posts[Math.floor(Math.random() * posts.length)];
          const { error } = await supabase.from('post_likes').insert({ user_id: bot.id, post_id: post.id });
          if (!error) {
            await supabase.from('bot_activity_log').insert({ bot_id: bot.id, activity_type: 'like_post', target_id: post.id });
            activities.push({ bot: bot.username, action: 'liked post' });
          }
        } else if (actionType === 1 && reels && reels.length > 0) {
          // Like a random reel
          const reel = reels[Math.floor(Math.random() * reels.length)];
          const { error } = await supabase.from('reel_likes').insert({ user_id: bot.id, reel_id: reel.id });
          if (!error) {
            await supabase.from('bot_activity_log').insert({ bot_id: bot.id, activity_type: 'like_reel', target_id: reel.id });
            activities.push({ bot: bot.username, action: 'liked reel' });
          }
        } else if (actionType === 2 && posts && posts.length > 0) {
          // Comment on a random post
          const post = posts[Math.floor(Math.random() * posts.length)];
          const comment = comments[Math.floor(Math.random() * comments.length)];
          const { error } = await supabase.from('post_comments').insert({ 
            user_id: bot.id, 
            post_id: post.id, 
            content: comment 
          });
          if (!error) {
            await supabase.from('bot_activity_log').insert({ bot_id: bot.id, activity_type: 'comment_post', target_id: post.id });
            activities.push({ bot: bot.username, action: 'commented on post' });
          }
        } else if (actionType === 3 && reels && reels.length > 0) {
          // Comment on a random reel
          const reel = reels[Math.floor(Math.random() * reels.length)];
          const comment = comments[Math.floor(Math.random() * comments.length)];
          const { error } = await supabase.from('reel_comments').insert({ 
            user_id: bot.id, 
            reel_id: reel.id, 
            content: comment 
          });
          if (!error) {
            await supabase.from('bot_activity_log').insert({ bot_id: bot.id, activity_type: 'comment_reel', target_id: reel.id });
            activities.push({ bot: bot.username, action: 'commented on reel' });
          }
        } else if (actionType === 4 && profiles && profiles.length > 0) {
          // Follow a random user
          const profile = profiles[Math.floor(Math.random() * profiles.length)];
          if (profile.id !== bot.id) {
            const { error } = await supabase.from('follows').insert({ 
              follower_id: bot.id, 
              following_id: profile.id 
            });
            if (!error) {
              await supabase.from('bot_activity_log').insert({ bot_id: bot.id, activity_type: 'follow_user', target_id: profile.id });
              activities.push({ bot: bot.username, action: 'followed user' });
            }
          }
        }
      } catch (error) {
        console.error(`Error generating activity for bot ${bot.username}:`, error);
      }
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return new Response(JSON.stringify({ success: true, activities, count: activities.length }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

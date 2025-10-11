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

    const { action } = await req.json();

    if (action === 'create_bots') {
      return await createBots(supabase);
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
  const botNames = [
    { username: 'mixmaster_alex', full_name: 'Alex Martinez', bio: 'Mixologist | Craft cocktails enthusiast', professional_title: 'mixologist' },
    { username: 'chef_sarah', full_name: 'Sarah Johnson', bio: 'Executive Chef | Food innovator', professional_title: 'chef' },
    { username: 'bartender_mike', full_name: 'Mike Thompson', bio: 'Head Bartender | Classic cocktails lover', professional_title: 'bartender' },
    { username: 'sommelier_emma', full_name: 'Emma Wilson', bio: 'Wine Expert | Sommelier', professional_title: 'sommelier' },
    { username: 'barista_lisa', full_name: 'Lisa Chen', bio: 'Coffee specialist | Latte art champion', professional_title: 'barista' },
  ];

  const createdBots = [];

  for (const botData of botNames) {
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

async function generateActivity(supabase: any) {
  // Get all bots
  const { data: bots } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('is_bot', true);

  if (!bots || bots.length === 0) {
    return new Response(JSON.stringify({ error: 'No bots found' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Get all posts, reels, and stories
  const { data: posts } = await supabase.from('posts').select('id, user_id').limit(20);
  const { data: reels } = await supabase.from('reels').select('id, user_id').limit(20);
  const { data: stories } = await supabase.from('stories').select('id, user_id').limit(10);
  const { data: profiles } = await supabase.from('profiles').select('id').eq('is_bot', false).limit(20);

  const activities = [];

  for (const bot of bots) {
    // Random number of actions per bot (1-5)
    const numActions = Math.floor(Math.random() * 5) + 1;

    for (let i = 0; i < numActions; i++) {
      const actionType = Math.floor(Math.random() * 5);

      try {
        if (actionType === 0 && posts && posts.length > 0) {
          // Like a random post
          const post = posts[Math.floor(Math.random() * posts.length)];
          await supabase.from('post_likes').insert({ user_id: bot.id, post_id: post.id });
          await supabase.from('bot_activity_log').insert({ bot_id: bot.id, activity_type: 'like_post', target_id: post.id });
          activities.push({ bot: bot.username, action: 'liked post' });
        } else if (actionType === 1 && reels && reels.length > 0) {
          // Like a random reel
          const reel = reels[Math.floor(Math.random() * reels.length)];
          await supabase.from('reel_likes').insert({ user_id: bot.id, reel_id: reel.id });
          await supabase.from('bot_activity_log').insert({ bot_id: bot.id, activity_type: 'like_reel', target_id: reel.id });
          activities.push({ bot: bot.username, action: 'liked reel' });
        } else if (actionType === 2 && posts && posts.length > 0) {
          // Comment on a random post
          const post = posts[Math.floor(Math.random() * posts.length)];
          const comments = ['Great content!', 'Love this!', 'Amazing work!', 'Impressive!', 'Keep it up!'];
          const comment = comments[Math.floor(Math.random() * comments.length)];
          await supabase.from('post_comments').insert({ user_id: bot.id, post_id: post.id, content: comment });
          await supabase.from('bot_activity_log').insert({ bot_id: bot.id, activity_type: 'comment_post', target_id: post.id });
          activities.push({ bot: bot.username, action: 'commented on post' });
        } else if (actionType === 3 && reels && reels.length > 0) {
          // Comment on a random reel
          const reel = reels[Math.floor(Math.random() * reels.length)];
          const comments = ['Awesome reel!', 'So cool!', 'Nice one!', 'Love it!', '🔥🔥🔥'];
          const comment = comments[Math.floor(Math.random() * comments.length)];
          await supabase.from('reel_comments').insert({ user_id: bot.id, reel_id: reel.id, content: comment });
          await supabase.from('bot_activity_log').insert({ bot_id: bot.id, activity_type: 'comment_reel', target_id: reel.id });
          activities.push({ bot: bot.username, action: 'commented on reel' });
        } else if (actionType === 4 && profiles && profiles.length > 0) {
          // Follow a random user
          const profile = profiles[Math.floor(Math.random() * profiles.length)];
          if (profile.id !== bot.id) {
            await supabase.from('follows').insert({ follower_id: bot.id, following_id: profile.id });
            await supabase.from('bot_activity_log').insert({ bot_id: bot.id, activity_type: 'follow_user', target_id: profile.id });
            activities.push({ bot: bot.username, action: 'followed user' });
          }
        }
      } catch (error) {
        console.error(`Error generating activity for bot ${bot.username}:`, error);
      }
    }
  }

  return new Response(JSON.stringify({ success: true, activities }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

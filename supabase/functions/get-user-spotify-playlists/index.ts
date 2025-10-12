import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user's auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    // Get user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    // Get user's Spotify connection
    const { data: connection, error: connectionError } = await supabase
      .from('spotify_connections')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (connectionError) {
      console.error('Connection error:', connectionError);
      throw connectionError;
    }

    if (!connection) {
      return new Response(
        JSON.stringify({ error: 'Spotify not connected', connected: false }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Check if token needs refresh
    const expiresAt = new Date(connection.expires_at);
    const now = new Date();
    
    let accessToken = connection.access_token;

    if (expiresAt <= now) {
      console.log('Token expired, refreshing...');
      
      const clientId = Deno.env.get('SPOTIFY_CLIENT_ID');
      const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET');

      const refreshResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`)
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: connection.refresh_token
        })
      });

      if (!refreshResponse.ok) {
        throw new Error('Failed to refresh token');
      }

      const refreshData = await refreshResponse.json();
      accessToken = refreshData.access_token;

      // Update token in database
      const newExpiresAt = new Date(Date.now() + refreshData.expires_in * 1000).toISOString();
      await supabase
        .from('spotify_connections')
        .update({
          access_token: accessToken,
          expires_at: newExpiresAt
        })
        .eq('user_id', user.id);
    }

    // Get user's playlists
    const playlistsResponse = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!playlistsResponse.ok) {
      const errorText = await playlistsResponse.text();
      console.error('Playlists error:', errorText);
      throw new Error('Failed to fetch playlists');
    }

    const playlistsData = await playlistsResponse.json();

    return new Response(
      JSON.stringify({ 
        connected: true,
        playlists: playlistsData.items 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in get-user-spotify-playlists:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
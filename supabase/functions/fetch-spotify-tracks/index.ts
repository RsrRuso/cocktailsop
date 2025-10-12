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
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Create a Supabase client with the user's JWT
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get the current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    console.log('Fetching Spotify connection for user:', user.id);

    // Get the user's Spotify connection
    const { data: connection, error: connectionError } = await supabaseAdmin
      .from('spotify_connections')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (connectionError || !connection) {
      throw new Error('No Spotify connection found. Please connect your Spotify account first.');
    }

    console.log('Fetching user top tracks from Spotify...');
    console.log('Using access token:', connection.access_token.substring(0, 20) + '...');

    // Fetch user's top tracks (most listened to)
    const topTracksResponse = await fetch('https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=medium_term', {
      headers: {
        'Authorization': `Bearer ${connection.access_token}`
      }
    });

    console.log('Top tracks response status:', topTracksResponse.status);

    if (!topTracksResponse.ok) {
      const errorText = await topTracksResponse.text();
      console.error('Spotify API error:', topTracksResponse.status, errorText);
      throw new Error(`Failed to fetch top tracks from Spotify: ${topTracksResponse.status} ${errorText}`);
    }

    const topTracksData = await topTracksResponse.json();
    console.log('Top tracks data:', JSON.stringify(topTracksData, null, 2));
    console.log(`Found ${topTracksData.items?.length || 0} top tracks`);

    const tracks = topTracksData.items || [];

    // Format tracks for database
    const formattedTracks = tracks.slice(0, 100).map((track: any) => ({
      track_id: track.id,
      title: track.name,
      artist: track.artists.map((a: any) => a.name).join(', '),
      duration: Math.floor(track.duration_ms / 1000 / 60) + ':' + 
                String(Math.floor(track.duration_ms / 1000) % 60).padStart(2, '0'),
      preview_url: track.album.images[0]?.url || null
    }));

    console.log('Clearing existing tracks...');
    await supabaseAdmin.from('popular_music').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('Inserting user tracks...');
    const { error: insertError } = await supabaseAdmin
      .from('popular_music')
      .insert(formattedTracks);
    
    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    console.log('Successfully updated music library!');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Successfully updated ${formattedTracks.length} tracks from your Spotify library`,
        count: formattedTracks.length 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error updating music library:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

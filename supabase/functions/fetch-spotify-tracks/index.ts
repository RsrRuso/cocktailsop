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
    // Create admin client to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const spotifyClientId = Deno.env.get('SPOTIFY_CLIENT_ID');
    const spotifyClientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET');

    console.log('Fetching Spotify access token...');
    
    // Get Spotify access token using client credentials
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${spotifyClientId}:${spotifyClientSecret}`)
      },
      body: 'grant_type=client_credentials'
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to get Spotify access token');
    }

    const { access_token } = await tokenResponse.json();
    console.log('Successfully got Spotify access token');

    // Fetch multiple playlists to get a good variety of popular tracks
    const playlistIds = [
      '37i9dQZEVXbMDoHDwVN2tF', // Global Top 50
      '37i9dQZEVXbLiRSasKsNU9', // Top Hits
      '37i9dQZEVXbNG2KDcFcKOF', // Top Songs - Global
    ];

    const allTracks: any[] = [];
    
    for (const playlistId of playlistIds) {
      console.log(`Fetching playlist: ${playlistId}`);
      const playlistResponse = await fetch(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`,
        {
          headers: {
            'Authorization': `Bearer ${access_token}`
          }
        }
      );

      if (playlistResponse.ok) {
        const playlistData = await playlistResponse.json();
        allTracks.push(...playlistData.items);
      }
    }

    console.log(`Fetched ${allTracks.length} total tracks from Spotify`);

    // Remove duplicates and format tracks
    const seenTrackIds = new Set();
    const formattedTracks = allTracks
      .filter(item => {
        if (!item.track || !item.track.id || seenTrackIds.has(item.track.id)) {
          return false;
        }
        seenTrackIds.add(item.track.id);
        return true;
      })
      .slice(0, 50) // Take top 50 unique tracks
      .map(item => ({
        track_id: item.track.id,
        title: item.track.name,
        artist: item.track.artists.map((a: any) => a.name).join(', '),
        duration: formatDuration(item.track.duration_ms),
        preview_url: item.track.preview_url || null
      }));

    console.log(`Formatted ${formattedTracks.length} popular tracks`);

    // Clear existing tracks and insert new ones using admin client
    console.log('Clearing existing tracks...');
    await supabaseAdmin.from('popular_music').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('Inserting new tracks...');
    const { error: insertError } = await supabaseAdmin.from('popular_music').insert(formattedTracks);
    
    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    console.log('Successfully updated music library!');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Successfully updated ${formattedTracks.length} tracks`,
        count: formattedTracks.length 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error fetching Spotify tracks:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

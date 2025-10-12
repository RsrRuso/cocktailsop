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

    // Search for popular tracks using various popular search terms
    const searchTerms = [
      'year:2024-2025',
      'year:2024',
      'pop',
      'hip hop',
      'rock',
      'electronic',
      'dance'
    ];

    const allTracks: any[] = [];
    
    for (const term of searchTerms) {
      console.log(`Searching for: ${term}`);
      const searchResponse = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(term)}&type=track&limit=50&market=US`,
        {
          headers: {
            'Authorization': `Bearer ${access_token}`
          }
        }
      );

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        const trackCount = searchData.tracks?.items?.length || 0;
        console.log(`Successfully fetched ${trackCount} tracks for "${term}"`);
        if (searchData.tracks?.items) {
          allTracks.push(...searchData.tracks.items);
        }
      } else {
        const errorText = await searchResponse.text();
        console.error(`Failed to search for "${term}": ${searchResponse.status} - ${errorText}`);
      }
    }

    console.log(`Fetched ${allTracks.length} total tracks from Spotify`);

    // Remove duplicates and format tracks
    const seenTrackIds = new Set();
    const formattedTracks = allTracks
      .filter(track => {
        if (!track || !track.id || seenTrackIds.has(track.id)) {
          return false;
        }
        seenTrackIds.add(track.id);
        return true;
      })
      .slice(0, 50) // Take top 50 unique tracks
      .map(track => ({
        track_id: track.id,
        title: track.name,
        artist: track.artists.map((a: any) => a.name).join(', '),
        duration: formatDuration(track.duration_ms),
        preview_url: track.preview_url || null
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

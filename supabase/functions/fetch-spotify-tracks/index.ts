import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientId = Deno.env.get('SPOTIFY_CLIENT_ID');
    const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new Error('Spotify credentials not configured');
    }

    // Get Spotify access token
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`)
      },
      body: 'grant_type=client_credentials'
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Spotify token error:', tokenResponse.status, errorText);
      throw new Error(`Failed to get Spotify access token: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Search for popular tracks instead of using a playlist
    const searches = [
      'Blinding Lights', 'Shape of You', 'Someone You Loved', 'Dance Monkey', 'Sunflower',
      'Circles', 'Memories', 'Senorita', 'Bad Guy', 'Old Town Road',
      'Happier', 'Shallow', 'Without Me', 'Rockstar', 'Perfect',
      'drivers license', 'Levitating', 'Save Your Tears', 'good 4 u', 'Heat Waves',
      'As It Was', 'Stay', 'Easy On Me', 'Anti-Hero', 'Flowers',
      'Calm Down', 'Unholy', 'Kill Bill', 'Creepin', 'Die For You'
    ];

    const trackPromises = searches.slice(0, 50).map(async (query) => {
      const searchResponse = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );
      
      if (searchResponse.ok) {
        const data = await searchResponse.json();
        const track = data.tracks?.items?.[0];
        if (track && track.preview_url) {
          return {
            track_id: track.id,
            title: track.name,
            artist: track.artists.map((a: any) => a.name).join(', '),
            duration: formatDuration(track.duration_ms),
            preview_url: track.preview_url
          };
        }
      }
      return null;
    });

    const trackResults = await Promise.all(trackPromises);
    const formattedTracks = trackResults.filter(t => t !== null);

    return new Response(
      JSON.stringify({ tracks: formattedTracks }),
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

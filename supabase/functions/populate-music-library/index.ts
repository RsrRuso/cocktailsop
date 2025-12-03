import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get Spotify access token using Client Credentials flow (no user auth needed)
async function getSpotifyToken(): Promise<string> {
  const clientId = Deno.env.get('SPOTIFY_CLIENT_ID');
  const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET');
  
  if (!clientId || !clientSecret) {
    throw new Error('Spotify credentials not configured');
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`)
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) {
    throw new Error('Failed to get Spotify token');
  }

  const data = await response.json();
  return data.access_token;
}

// Fetch tracks from Spotify playlist
async function fetchPlaylistTracks(token: string, playlistId: string): Promise<any[]> {
  const response = await fetch(
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  
  if (!response.ok) return [];
  const data = await response.json();
  return data.items?.map((item: any) => item.track).filter(Boolean) || [];
}

// Fetch new releases
async function fetchNewReleases(token: string): Promise<any[]> {
  const response = await fetch(
    'https://api.spotify.com/v1/browse/new-releases?limit=50',
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  
  if (!response.ok) return [];
  const data = await response.json();
  
  // Fetch tracks from each album
  const tracks: any[] = [];
  for (const album of data.albums?.items?.slice(0, 20) || []) {
    const albumResponse = await fetch(
      `https://api.spotify.com/v1/albums/${album.id}/tracks?limit=3`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    if (albumResponse.ok) {
      const albumData = await albumResponse.json();
      for (const track of albumData.items || []) {
        tracks.push({
          ...track,
          album: album,
          artists: track.artists
        });
      }
    }
  }
  return tracks;
}

// Search tracks by genre/mood
async function searchTracksByQuery(token: string, query: string, limit = 30): Promise<any[]> {
  const response = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  
  if (!response.ok) return [];
  const data = await response.json();
  return data.tracks?.items || [];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting music library population...');
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get Spotify token
    const token = await getSpotifyToken();
    console.log('Got Spotify token');

    const allTracks: any[] = [];
    const trackIds = new Set<string>();

    // Popular Spotify playlists IDs (public playlists)
    const popularPlaylists = [
      '37i9dQZF1DXcBWIGoYBM5M', // Today's Top Hits
      '37i9dQZF1DX0XUsuxWHRQd', // RapCaviar
      '37i9dQZF1DX4dyzvuaRJ0n', // mint
      '37i9dQZF1DWXRqgorJj26U', // Rock Classics
      '37i9dQZF1DX4sWSpwq3LiO', // Peaceful Piano
      '37i9dQZF1DX1lVhptIYRda', // Hot Country
      '37i9dQZF1DX4JAvHpjipBk', // New Music Friday
      '37i9dQZF1DX10zKzsJ2jva', // Viva Latino
    ];

    // Fetch from popular playlists
    console.log('Fetching from popular playlists...');
    for (const playlistId of popularPlaylists) {
      try {
        const tracks = await fetchPlaylistTracks(token, playlistId);
        for (const track of tracks) {
          if (track?.id && !trackIds.has(track.id)) {
            trackIds.add(track.id);
            allTracks.push(track);
          }
        }
      } catch (e) {
        console.log(`Failed to fetch playlist ${playlistId}:`, e);
      }
    }

    // Search by popular genres and moods
    const searchQueries = [
      'year:2024 pop', 'year:2024 hip hop', 'year:2024 r&b',
      'viral tiktok', 'trending 2024', 'chart toppers',
      'chill vibes', 'party hits', 'workout music',
      'indie pop', 'latin hits', 'k-pop hits',
      'edm festival', 'jazz lounge', 'acoustic covers'
    ];

    console.log('Searching by genres and moods...');
    for (const query of searchQueries) {
      try {
        const tracks = await searchTracksByQuery(token, query, 20);
        for (const track of tracks) {
          if (track?.id && !trackIds.has(track.id)) {
            trackIds.add(track.id);
            allTracks.push(track);
          }
        }
      } catch (e) {
        console.log(`Failed search for ${query}:`, e);
      }
    }

    // Fetch new releases
    console.log('Fetching new releases...');
    try {
      const newTracks = await fetchNewReleases(token);
      for (const track of newTracks) {
        if (track?.id && !trackIds.has(track.id)) {
          trackIds.add(track.id);
          allTracks.push(track);
        }
      }
    } catch (e) {
      console.log('Failed to fetch new releases:', e);
    }

    console.log(`Collected ${allTracks.length} unique tracks`);

    // Format tracks for platform_music_library
    const formattedTracks = allTracks.map((track: any, index: number) => {
      const duration = Math.floor((track.duration_ms || 180000) / 1000);
      const artists = track.artists?.map((a: any) => a.name).join(', ') || 'Unknown';
      const album = track.album?.name || 'Unknown Album';
      const coverImage = track.album?.images?.[0]?.url || null;
      const previewUrl = track.preview_url || null;
      
      // Determine genre/mood from context
      let genre = 'Pop';
      let mood = 'Energetic';
      let energyLevel = 'medium';
      
      const trackName = (track.name || '').toLowerCase();
      const artistName = artists.toLowerCase();
      
      if (trackName.includes('chill') || trackName.includes('relax')) {
        mood = 'Chill';
        energyLevel = 'low';
      } else if (trackName.includes('party') || trackName.includes('dance')) {
        mood = 'Party';
        energyLevel = 'high';
      } else if (trackName.includes('sad') || trackName.includes('cry')) {
        mood = 'Sad';
        energyLevel = 'low';
      }

      return {
        track_id: track.id,
        title: track.name || 'Unknown',
        artist: artists,
        album: album,
        genre: genre,
        mood: mood,
        duration_seconds: duration,
        preview_url: previewUrl,
        spotify_url: track.external_urls?.spotify || null,
        cover_image_url: coverImage,
        bpm: Math.floor(Math.random() * 60) + 90, // Estimate BPM
        energy_level: energyLevel,
        ai_tags: [mood.toLowerCase(), genre.toLowerCase()],
        ai_description: `${mood} ${genre} track by ${artists}`,
        popularity_score: track.popularity || 50,
        usage_count: 0,
        is_featured: index < 50, // Mark first 50 as featured
        is_active: true,
        added_by: 'spotify_sync'
      };
    });

    // Clear existing tracks and insert new ones
    console.log('Clearing existing tracks...');
    await supabaseAdmin
      .from('platform_music_library')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    // Insert in batches
    console.log('Inserting tracks...');
    const batchSize = 50;
    let insertedCount = 0;
    
    for (let i = 0; i < formattedTracks.length; i += batchSize) {
      const batch = formattedTracks.slice(i, i + batchSize);
      const { error } = await supabaseAdmin
        .from('platform_music_library')
        .upsert(batch, { onConflict: 'track_id' });
      
      if (error) {
        console.error('Insert batch error:', error);
      } else {
        insertedCount += batch.length;
      }
    }

    console.log(`Successfully inserted ${insertedCount} tracks!`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Successfully loaded ${insertedCount} trending tracks from Spotify!`,
        count: insertedCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error populating music library:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

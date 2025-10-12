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

    const youtubeApiKey = Deno.env.get('YOUTUBE_API_KEY');
    
    if (!youtubeApiKey) {
      throw new Error('YouTube API key not configured');
    }

    console.log('Fetching popular music videos from YouTube...');

    // Search for popular music using various popular search terms
    const searchTerms = [
      'popular music 2024',
      'top hits 2025',
      'trending songs',
      'pop music',
      'hip hop music',
      'rock music',
      'electronic music'
    ];

    const allVideos: any[] = [];
    
    for (const term of searchTerms) {
      console.log(`Searching YouTube for: ${term}`);
      const searchResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(term)}&type=video&videoCategoryId=10&maxResults=15&key=${youtubeApiKey}`,
        {
          headers: {
            'Accept': 'application/json'
          }
        }
      );

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        const videoCount = searchData.items?.length || 0;
        console.log(`Successfully fetched ${videoCount} videos for "${term}"`);
        if (searchData.items) {
          // Get video details for duration
          const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');
          const detailsResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds}&key=${youtubeApiKey}`
          );
          
          if (detailsResponse.ok) {
            const detailsData = await detailsResponse.json();
            const videosWithDuration = searchData.items.map((item: any, index: number) => ({
              ...item,
              duration: detailsData.items[index]?.contentDetails?.duration
            }));
            allVideos.push(...videosWithDuration);
          }
        }
      } else {
        const errorText = await searchResponse.text();
        console.error(`Failed to search for "${term}": ${searchResponse.status} - ${errorText}`);
      }
    }

    console.log(`Fetched ${allVideos.length} total videos from YouTube`);

    // Remove duplicates and format videos
    const seenVideoIds = new Set();
    const formattedTracks = allVideos
      .filter(video => {
        if (!video || !video.id?.videoId || seenVideoIds.has(video.id.videoId)) {
          return false;
        }
        seenVideoIds.add(video.id.videoId);
        return true;
      })
      .slice(0, 50) // Take top 50 unique videos
      .map(video => ({
        track_id: video.id.videoId,
        title: video.snippet.title,
        artist: video.snippet.channelTitle,
        duration: formatYouTubeDuration(video.duration || 'PT0S'),
        preview_url: video.snippet.thumbnails?.high?.url || video.snippet.thumbnails?.default?.url || null
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

function formatYouTubeDuration(duration: string): string {
  // Parse ISO 8601 duration format (e.g., PT4M33S)
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return '0:00';
  
  const hours = (match[1] || '').replace('H', '');
  const minutes = (match[2] || '').replace('M', '');
  const seconds = (match[3] || '').replace('S', '');
  
  const totalMinutes = (hours ? parseInt(hours) * 60 : 0) + (minutes ? parseInt(minutes) : 0);
  const totalSeconds = seconds ? parseInt(seconds) : 0;
  
  return `${totalMinutes}:${totalSeconds.toString().padStart(2, '0')}`;
}

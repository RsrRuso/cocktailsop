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

    console.log('Generating royalty-free music library...');
    
    // Curated list of royalty-free music with working preview URLs
    const formattedTracks = [
      { track_id: 'rf1', title: 'Summer Breeze', artist: 'Acoustic Vibes', duration: '3:24', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
      { track_id: 'rf2', title: 'Urban Dreams', artist: 'City Beats', duration: '3:15', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
      { track_id: 'rf3', title: 'Midnight Jazz', artist: 'Smooth Collective', duration: '3:42', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
      { track_id: 'rf4', title: 'Electric Pulse', artist: 'Synth Wave', duration: '3:18', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
      { track_id: 'rf5', title: 'Peaceful Morning', artist: 'Ambient Soul', duration: '3:56', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3' },
      { track_id: 'rf6', title: 'Night Drive', artist: 'Neo Tokyo', duration: '3:28', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3' },
      { track_id: 'rf7', title: 'Coffee Shop Vibes', artist: 'Lo-Fi Cafe', duration: '3:33', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3' },
      { track_id: 'rf8', title: 'Ocean Waves', artist: 'Coastal Sounds', duration: '3:45', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3' },
      { track_id: 'rf9', title: 'Mountain Echo', artist: 'Nature\'s Symphony', duration: '3:21', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3' },
      { track_id: 'rf10', title: 'Sunset Boulevard', artist: 'Chill Hop', duration: '3:38', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3' },
      { track_id: 'rf11', title: 'Neon Lights', artist: 'Retro Wave', duration: '3:29', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3' },
      { track_id: 'rf12', title: 'Forest Path', artist: 'Ambient Nature', duration: '3:52', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3' },
      { track_id: 'rf13', title: 'Downtown Groove', artist: 'Urban Funk', duration: '3:17', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3' },
      { track_id: 'rf14', title: 'Starlight', artist: 'Cosmic Dreams', duration: '3:41', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3' },
      { track_id: 'rf15', title: 'Rain Dance', artist: 'Percussion Collective', duration: '3:25', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3' },
      { track_id: 'rf16', title: 'Sunrise Meditation', artist: 'Zen Masters', duration: '3:54', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3' },
      { track_id: 'rf17', title: 'City Lights', artist: 'Metro Beats', duration: '3:19', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
      { track_id: 'rf18', title: 'Desert Wind', artist: 'World Travelers', duration: '3:47', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
      { track_id: 'rf19', title: 'Midnight Run', artist: 'Action Beats', duration: '3:22', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
      { track_id: 'rf20', title: 'Crystal Clear', artist: 'Pure Sounds', duration: '3:36', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
      { track_id: 'rf21', title: 'Velvet Sky', artist: 'Smooth Jazz Trio', duration: '3:48', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3' },
      { track_id: 'rf22', title: 'Digital Paradise', artist: 'Electro Pop', duration: '3:14', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3' },
      { track_id: 'rf23', title: 'Golden Hour', artist: 'Indie Folk', duration: '3:51', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3' },
      { track_id: 'rf24', title: 'Rhythm Nation', artist: 'Groove Masters', duration: '3:27', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3' },
      { track_id: 'rf25', title: 'Arctic Dreams', artist: 'Frozen Beats', duration: '3:43', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3' },
      { track_id: 'rf26', title: 'Tropical Nights', artist: 'Island Vibes', duration: '3:31', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3' },
      { track_id: 'rf27', title: 'Concrete Jungle', artist: 'Street Sounds', duration: '3:20', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3' },
      { track_id: 'rf28', title: 'Aurora Borealis', artist: 'Northern Lights', duration: '3:58', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3' },
      { track_id: 'rf29', title: 'Velocity', artist: 'Fast Lane', duration: '3:16', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3' },
      { track_id: 'rf30', title: 'Moonlight Serenade', artist: 'Classical Fusion', duration: '3:44', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3' },
      { track_id: 'rf31', title: 'Spring Festival', artist: 'World Music', duration: '3:26', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3' },
      { track_id: 'rf32', title: 'Neon Dreams', artist: 'Synthwave 80s', duration: '3:39', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3' },
      { track_id: 'rf33', title: 'Autumn Leaves', artist: 'Acoustic Sessions', duration: '3:50', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
      { track_id: 'rf34', title: 'Electric Dreams', artist: 'Future Bass', duration: '3:23', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
      { track_id: 'rf35', title: 'Winter Wonderland', artist: 'Holiday Sounds', duration: '3:35', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
      { track_id: 'rf36', title: 'Horizon', artist: 'Progressive House', duration: '3:46', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
      { track_id: 'rf37', title: 'Serenity', artist: 'Meditation Sounds', duration: '3:53', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3' },
      { track_id: 'rf38', title: 'Pulse', artist: 'Electronic Beats', duration: '3:12', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3' },
      { track_id: 'rf39', title: 'Harmony', artist: 'Classical Piano', duration: '3:49', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3' },
      { track_id: 'rf40', title: 'Energy Rush', artist: 'Workout Mix', duration: '3:11', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3' },
      { track_id: 'rf41', title: 'Twilight Zone', artist: 'Mysterious Melodies', duration: '3:37', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3' },
      { track_id: 'rf42', title: 'Skyline', artist: 'Urban Chill', duration: '3:32', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3' },
      { track_id: 'rf43', title: 'Paradise Found', artist: 'Tropical House', duration: '3:40', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3' },
      { track_id: 'rf44', title: 'Firefly', artist: 'Nature Beats', duration: '3:30', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3' },
      { track_id: 'rf45', title: 'Rush Hour', artist: 'Traffic Jam', duration: '3:13', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3' },
      { track_id: 'rf46', title: 'Blissful', artist: 'Happy Tunes', duration: '3:55', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3' },
      { track_id: 'rf47', title: 'Thunder Storm', artist: 'Epic Soundscapes', duration: '3:34', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3' },
      { track_id: 'rf48', title: 'Blossom', artist: 'Spring Collection', duration: '3:47', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3' },
      { track_id: 'rf49', title: 'Odyssey', artist: 'Adventure Sounds', duration: '3:22', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
      { track_id: 'rf50', title: 'Euphoria', artist: 'Feel Good Music', duration: '3:41', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' }
    ];

    console.log(`Generated ${formattedTracks.length} royalty-free tracks`);

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

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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Seeding popular music library with curated tracks...');

    // Curated list of popular music videos - no API required
    const popularTracks = [
      { track_id: 'dQw4w9WgXcQ', title: 'Never Gonna Give You Up', artist: 'Rick Astley', duration: '3:33' },
      { track_id: '9bZkp7q19f0', title: 'PSY - GANGNAM STYLE', artist: 'officialpsy', duration: '4:13' },
      { track_id: 'kJQP7kiw5Fk', title: 'Luis Fonsi - Despacito ft. Daddy Yankee', artist: 'Luis Fonsi', duration: '4:42' },
      { track_id: 'JGwWNGJdvx8', title: 'Ed Sheeran - Shape of You', artist: 'Ed Sheeran', duration: '3:54' },
      { track_id: 'RgKAFK5djSk', title: 'Wiz Khalifa - See You Again ft. Charlie Puth', artist: 'Wiz Khalifa', duration: '3:49' },
      { track_id: 'CevxZvSJLk8', title: 'Katy Perry - Roar', artist: 'Katy Perry', duration: '3:43' },
      { track_id: 'OPf0YbXqDm0', title: 'Mark Ronson - Uptown Funk ft. Bruno Mars', artist: 'Mark Ronson', duration: '4:30' },
      { track_id: '450p7goxZqg', title: 'All of Me (Edited Video)', artist: 'John Legend', duration: '4:30' },
      { track_id: 'hLQl3WQQoQ0', title: 'Adele - Someone Like You', artist: 'Adele', duration: '4:45' },
      { track_id: 'fWNaR-rxAic', title: 'Carly Rae Jepsen - Call Me Maybe', artist: 'Carly Rae Jepsen', duration: '3:13' },
      { track_id: '2vjPBrBU-TM', title: 'Shakira - Waka Waka (This Time for Africa)', artist: 'Shakira', duration: '3:29' },
      { track_id: 'YQHsXMglC9A', title: 'Adele - Hello', artist: 'Adele', duration: '6:07' },
      { track_id: 'e-ORhEE9VVg', title: 'Taylor Swift - Blank Space', artist: 'Taylor Swift', duration: '4:32' },
      { track_id: 'RBumgq5yVrA', title: 'Passenger - Let Her Go', artist: 'Passenger', duration: '4:12' },
      { track_id: 'pB-5XG-DbAA', title: 'Guns N\' Roses - Sweet Child O\' Mine', artist: 'Guns N\' Roses', duration: '5:56' },
      { track_id: 'lDK9QqIzhwk', title: 'Linkin Park - Numb', artist: 'Linkin Park', duration: '3:07' },
      { track_id: 'djV11Xbc914', title: 'a-ha - Take On Me', artist: 'a-ha', duration: '3:46' },
      { track_id: 'hTWKbfoikeg', title: 'Nirvana - Smells Like Teen Spirit', artist: 'Nirvana', duration: '5:01' },
      { track_id: 'HgzGwKwLmgM', title: 'Queen - Don\'t Stop Me Now', artist: 'Queen', duration: '3:29' },
      { track_id: 'fJ9rUzIMcZQ', title: 'Queen - Bohemian Rhapsody', artist: 'Queen', duration: '5:55' },
      { track_id: 'A_MjCqQoLLA', title: 'Hey Ya! - Outkast', artist: 'Outkast', duration: '3:55' },
      { track_id: '60ItHLz5WEA', title: 'Avicii - Wake Me Up', artist: 'Avicii', duration: '4:09' },
      { track_id: 'Zi_XLOBDo_Y', title: 'Michael Jackson - Billie Jean', artist: 'Michael Jackson', duration: '4:54' },
      { track_id: 'WpYeekQkAdc', title: 'The Weeknd - Blinding Lights', artist: 'The Weeknd', duration: '3:20' },
      { track_id: 'ru0K8uYEZWw', title: 'CKay - love nwantiti', artist: 'CKay', duration: '2:53' },
    ];

    const formattedTracks = popularTracks.map(track => ({
      track_id: track.track_id,
      title: track.title,
      artist: track.artist,
      duration: track.duration,
      preview_url: `https://img.youtube.com/vi/${track.track_id}/hqdefault.jpg`
    }));

    console.log('Clearing existing tracks...');
    await supabaseAdmin.from('popular_music').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('Inserting curated tracks...');
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

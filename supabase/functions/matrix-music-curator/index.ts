import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, data } = await req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    if (action === 'curate_music') {
      // AI curates music from Spotify and adds to platform library
      const { genre, mood, count = 20 } = data;
      
      const systemPrompt = `You are a professional music curator for a social media platform. 
Your job is to select trending, high-quality music tracks that work well for short-form video content (reels/stories).
Analyze music based on: energy level, mood, genre, BPM, and viral potential.
Consider what makes music work well for social media content.`;

      const userMessage = `Curate ${count} music tracks for ${genre || 'various genres'} with ${mood || 'various moods'} mood.
For each track, provide: title, artist, genre, mood, estimated BPM, energy level (low/medium/high), and 3-5 AI tags describing the vibe.
Also provide a brief description of why this track works for social content.
Format as JSON array with fields: title, artist, genre, mood, bpm, energy_level, ai_tags (array), ai_description.`;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage }
          ],
        }),
      });

      if (!aiResponse.ok) {
        throw new Error(`AI API error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      let responseText = aiData.choices[0].message.content;
      
      // Strip markdown code blocks
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const curatedTracks = JSON.parse(responseText);

      // Search Spotify for each track and add to library
      const addedTracks = [];
      for (const track of curatedTracks) {
        try {
          // Search Spotify for the track
          const spotifyResponse = await supabase.functions.invoke('search-spotify-music', {
            body: { query: `${track.title} ${track.artist}` }
          });

          if (spotifyResponse.data && spotifyResponse.data.length > 0) {
            const spotifyTrack = spotifyResponse.data[0];
            
            // Add to platform library
            const { data: insertedTrack, error } = await supabase
              .from('platform_music_library')
              .insert({
                track_id: spotifyTrack.track_id,
                title: spotifyTrack.title,
                artist: spotifyTrack.artist,
                genre: track.genre,
                mood: track.mood,
                duration: spotifyTrack.duration,
                preview_url: spotifyTrack.preview_url,
                spotify_url: spotifyTrack.spotify_url,
                bpm: track.bpm,
                energy_level: track.energy_level,
                ai_tags: track.ai_tags,
                ai_description: track.ai_description,
                is_active: true
              })
              .select()
              .single();

            if (!error) {
              addedTracks.push(insertedTrack);
            }
          }
        } catch (error) {
          console.error('Error adding track:', error);
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        added_count: addedTracks.length,
        tracks: addedTracks 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'generate_tags') {
      // AI generates smart tags for existing music
      const { track_id, title, artist, genre } = data;

      const systemPrompt = `You are an expert music analyst. Generate relevant tags and descriptions for music tracks that help users discover the right music for their content.`;

      const userMessage = `Analyze this track: "${title}" by ${artist} (${genre || 'Unknown genre'}).
Generate:
1. 5-7 descriptive tags (e.g., "upbeat", "melancholic", "party", "chill", "energetic", "romantic", "workout")
2. A brief description (1-2 sentences) explaining the vibe and when to use this track.

Format as JSON: { "ai_tags": ["tag1", "tag2", ...], "ai_description": "description" }`;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage }
          ],
        }),
      });

      if (!aiResponse.ok) {
        throw new Error(`AI API error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      let responseText = aiData.choices[0].message.content;
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const tagsData = JSON.parse(responseText);

      // Update track with AI tags
      const { error } = await supabase
        .from('platform_music_library')
        .update({
          ai_tags: tagsData.ai_tags,
          ai_description: tagsData.ai_description
        })
        .eq('track_id', track_id);

      if (error) throw error;

      return new Response(JSON.stringify({ 
        success: true,
        tags: tagsData 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'get_library') {
      // Fetch platform music library
      const { genre, mood, search, limit = 50 } = data || {};

      let query = supabase
        .from('platform_music_library')
        .select('*')
        .eq('is_active', true)
        .order('popularity_score', { ascending: false })
        .limit(limit);

      if (genre) query = query.eq('genre', genre);
      if (mood) query = query.eq('mood', mood);
      if (search) {
        query = query.or(`title.ilike.%${search}%,artist.ilike.%${search}%`);
      }

      const { data: tracks, error } = await query;

      if (error) throw error;

      return new Response(JSON.stringify({ 
        success: true,
        tracks 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error in matrix-music-curator:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

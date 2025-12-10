import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoUrl, fileName, userId } = await req.json();
    
    if (!videoUrl || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing videoUrl or userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Background task - extract audio and save to music library
    const backgroundTask = async () => {
      try {
        console.log("Starting background music extraction for:", fileName);
        
        // Fetch the video to get audio
        const videoResponse = await fetch(videoUrl);
        if (!videoResponse.ok) {
          console.error("Failed to fetch video:", videoResponse.status);
          return;
        }

        // Get video as blob
        const videoBlob = await videoResponse.blob();
        
        // For now, we'll store the video URL directly as audio source
        // since server-side FFmpeg extraction is complex
        // The audio will be extracted client-side on playback
        
        // Generate title from filename
        const title = generateTitleFromFile(fileName);
        
        // Insert into music_tracks with video as source
        const { error: insertError } = await supabase.from('music_tracks').insert({
          uploaded_by: userId,
          title: title,
          original_url: videoUrl,
          preview_url: videoUrl,
          duration_sec: 30, // Default, will be updated on first play
          category: 'extracted',
          tags: ['extracted', 'auto-detected', 'from-reel'],
          status: 'pending'
        });

        if (insertError) {
          console.error("Failed to save music track:", insertError);
          return;
        }

        console.log("Music track saved successfully:", title);
      } catch (error) {
        console.error("Background extraction error:", error);
      }
    };

    // Start background task without blocking response
    (globalThis as any).EdgeRuntime?.waitUntil?.(backgroundTask()) ?? backgroundTask();

    return new Response(
      JSON.stringify({ success: true, message: "Extraction started in background" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateTitleFromFile(filename: string): string {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  const cleanName = nameWithoutExt.replace(/[_-]/g, ' ');
  const title = cleanName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  return title || 'Extracted Audio';
}

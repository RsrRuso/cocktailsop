import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { filename, videoUrl } = await req.json();
    const AUDD_API_KEY = Deno.env.get("AUDD_API_KEY");
    
    console.log('Music recognition request for:', filename, 'URL:', videoUrl);
    
    // Try real music recognition with AudD if API key is available
    if (AUDD_API_KEY && videoUrl) {
      try {
        console.log('Attempting AudD music recognition...');
        
        const auddResponse = await fetch('https://api.audd.io/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            api_token: AUDD_API_KEY,
            url: videoUrl,
            return: 'apple_music,spotify',
          }),
        });
        
        if (auddResponse.ok) {
          const auddData = await auddResponse.json();
          console.log('AudD response:', JSON.stringify(auddData));
          
          if (auddData.status === 'success' && auddData.result) {
            const result = {
              title: auddData.result.title || cleanFilename(filename),
              artist: auddData.result.artist || 'Unknown Artist',
              recognized: true
            };
            console.log('Music recognized:', result);
            return new Response(
              JSON.stringify(result),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
        console.log('AudD did not recognize the music');
      } catch (auddError) {
        console.error('AudD recognition error:', auddError);
      }
    }

    // Fallback: just clean the filename, don't make up names
    const cleanedTitle = cleanFilename(filename);
    
    return new Response(
      JSON.stringify({ 
        title: cleanedTitle,
        artist: "Unknown Artist",
        recognized: false 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error: unknown) {
    console.error("Music recognition error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Just clean the filename - don't create fake names
function cleanFilename(filename: string): string {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  
  // Remove common prefixes and timestamps
  let cleanName = nameWithoutExt
    .replace(/^(IMG|VID|REC|AUD|MOV|VIDEO|Screen.?Recording)[-_]?\d*/gi, '')
    .replace(/\d{10,}/g, '') // Remove long number sequences (timestamps)
    .replace(/\d{4}[-_]\d{2}[-_]\d{2}/g, '') // Remove date patterns
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // If nothing meaningful left, return original filename without extension
  if (!cleanName || cleanName.length < 2) {
    return nameWithoutExt.replace(/[_-]/g, ' ').trim() || 'Untitled';
  }
  
  // Title case
  return cleanName
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

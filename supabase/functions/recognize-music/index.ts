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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      // Fallback to filename-based title
      return new Response(
        JSON.stringify({ 
          title: generateTitleFromFilename(filename),
          artist: "Unknown Artist",
          recognized: false 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use AI to analyze filename and suggest a proper music title
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a music recognition assistant. Analyze the given filename and try to identify the song title and artist. 
            
Rules:
- If the filename contains obvious song/artist info, extract it
- Clean up any file extensions, underscores, hyphens, numbers
- Format as proper title case
- If you can't identify it, generate a creative title based on the filename
- Always return valid JSON

Return ONLY a JSON object with this format:
{"title": "Song Title", "artist": "Artist Name", "confidence": "high/medium/low"}`
          },
          {
            role: "user",
            content: `Analyze this filename and identify the music: "${filename}"`
          }
        ],
        max_tokens: 200,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error("AI gateway error:", response.status);
      return new Response(
        JSON.stringify({ 
          title: generateTitleFromFilename(filename),
          artist: "Unknown Artist",
          recognized: false 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Parse AI response
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
      
      const parsed = JSON.parse(jsonStr);
      return new Response(
        JSON.stringify({
          title: parsed.title || generateTitleFromFilename(filename),
          artist: parsed.artist || "Unknown Artist",
          recognized: parsed.confidence === "high" || parsed.confidence === "medium"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      return new Response(
        JSON.stringify({ 
          title: generateTitleFromFilename(filename),
          artist: "Unknown Artist",
          recognized: false 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error: unknown) {
    console.error("Music recognition error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateTitleFromFilename(filename: string): string {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  const cleanName = nameWithoutExt
    .replace(/[_-]/g, ' ')
    .replace(/\d{4,}/g, '') // Remove long numbers (timestamps)
    .replace(/\s+/g, ' ')
    .trim();
  
  const title = cleanName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  return title || 'Extracted Audio';
}

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
    
    console.log('Music recognition request for:', filename);
    
    if (!LOVABLE_API_KEY) {
      console.log('No API key, using filename fallback');
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
            content: `You are a music title analyzer. Your job is to clean up video/audio filenames and create proper song titles.

Rules:
1. Remove file extensions (.mp4, .mov, .mp3, etc.)
2. Remove random numbers, timestamps, IDs (like 1733884523456, IMG_1234, VID_20240101)
3. Replace underscores and hyphens with spaces
4. Clean up any technical prefixes (IMG_, VID_, REC_, etc.)
5. If there's artist - song pattern, extract both
6. Format in proper title case
7. If completely unrecognizable, create a pleasant generic name like "Rhythm Track", "Melody Mix", "Vibes Beat"

IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks.

Examples:
- "VID_20240101_music_fire.mp4" → {"title": "Music Fire", "artist": "Unknown Artist", "confidence": "medium"}
- "Drake_-_God's_Plan.mp3" → {"title": "God's Plan", "artist": "Drake", "confidence": "high"}
- "1733884523456.mp4" → {"title": "Rhythm Track", "artist": "Unknown Artist", "confidence": "low"}
- "summer_vibes_remix_2024.mov" → {"title": "Summer Vibes Remix", "artist": "Unknown Artist", "confidence": "medium"}`
          },
          {
            role: "user",
            content: `Analyze this filename and extract music info: "${filename}"`
          }
        ],
        max_tokens: 150,
        temperature: 0.2,
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
    
    console.log('AI raw response:', content);
    
    // Parse AI response - handle markdown code blocks if present
    try {
      let jsonStr = content.trim();
      
      // Remove markdown code blocks if present
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      }
      
      // Extract JSON object
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
      
      const parsed = JSON.parse(jsonStr);
      const result = {
        title: parsed.title || generateTitleFromFilename(filename),
        artist: parsed.artist || "Unknown Artist",
        recognized: parsed.confidence === "high" || parsed.confidence === "medium"
      };
      
      console.log('Music recognition result:', result);
      
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError, content);
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
  
  // Remove common prefixes and timestamps
  let cleanName = nameWithoutExt
    .replace(/^(IMG|VID|REC|AUD|MOV|VIDEO)[-_]?\d*/gi, '')
    .replace(/\d{10,}/g, '') // Remove long number sequences (timestamps)
    .replace(/\d{4}[-_]\d{2}[-_]\d{2}/g, '') // Remove date patterns
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // If nothing left, use a generic name
  if (!cleanName || cleanName.length < 2) {
    return 'Audio Track';
  }
  
  // Title case
  const title = cleanName
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  return title || 'Audio Track';
}

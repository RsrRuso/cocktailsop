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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, data } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Fetch user profile and career data
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    const { data: careerProfile } = await supabase
      .from("career_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: skills } = await supabase
      .from("skill_progress")
      .select("*")
      .eq("user_id", user.id);

    const { data: activities } = await supabase
      .from("career_activities")
      .select("*")
      .eq("user_id", user.id)
      .order("achievement_date", { ascending: false })
      .limit(10);

    const { data: recommendations } = await supabase
      .from("career_recommendations")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("priority", { ascending: false })
      .limit(5);

    let systemPrompt = "";
    let userMessage = "";

    if (action === "analyze_career") {
      systemPrompt = `You are an expert career mentor in the hospitality and beverage industry. Analyze the user's profile and provide:
1. Career Assessment (current strengths, gaps, opportunities)
2. Skill Development Priorities (top 3 skills to focus on)
3. Next Steps (actionable career moves)
4. Industry Positioning (where they stand in the industry)

Keep response focused, actionable, and under 300 words.`;

      userMessage = `Analyze my career profile:
- Current Role: ${careerProfile?.role_title || "Not specified"}
- Experience: ${careerProfile?.experience_years || 0} years
- Skills: ${careerProfile?.skills?.join(", ") || "None listed"}
- Goals: ${careerProfile?.career_goals?.join(", ") || "Not defined"}
- Recent Activities: ${activities?.map(a => a.title).join(", ") || "None"}
- Current Skill Levels: ${skills?.map(s => `${s.skill_name} (${s.current_level}/10)`).join(", ") || "None"}`;

    } else if (action === "generate_recommendations") {
      systemPrompt = `You are a career strategist for the hospitality industry. Generate 5 personalized recommendations for career growth. For each recommendation, provide:
1. Type (competition, job, event, course, or skill)
2. Title
3. Description (2-3 sentences)
4. Priority (1-10, where 10 is highest)
5. AI Reasoning (why this matters for their career)

Return as JSON array: [{ type, title, description, priority, ai_reasoning }]`;

      userMessage = `Generate recommendations for:
- Role: ${careerProfile?.role_title || "Bartender"}
- Experience: ${careerProfile?.experience_years || 0} years
- Skills: ${careerProfile?.skills?.join(", ") || "Basic bartending"}
- Target Positions: ${careerProfile?.target_positions?.join(", ") || "Head Bartender"}
- Interests: ${careerProfile?.interests?.join(", ") || "Mixology"}
- Location Preferences: ${careerProfile?.preferred_locations?.join(", ") || "Any"}`;

    } else if (action === "skill_roadmap") {
      systemPrompt = `You are a skills development coach for bartenders and hospitality professionals. Create a personalized skill development roadmap. For each skill gap, provide:
1. Skill name
2. Current level (1-10)
3. Target level (1-10)
4. Learning path (3-5 action steps)
5. Estimated timeline
6. Resources

Return as JSON array.`;

      userMessage = `Create skill roadmap for:
- Current Skills: ${skills?.map(s => `${s.skill_name} (${s.current_level}/10)`).join(", ") || "None"}
- Target Skills: ${careerProfile?.skills?.join(", ") || "Advanced mixology"}
- Career Goals: ${careerProfile?.career_goals?.join(", ") || "None"}`;

    } else {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call Lovable AI
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
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const aiResult = aiData.choices[0].message.content;

    // If generating recommendations, store them
    if (action === "generate_recommendations") {
      try {
        const recs = JSON.parse(aiResult);
        const insertData = recs.map((rec: any) => ({
          user_id: user.id,
          recommendation_type: rec.type,
          title: rec.title,
          description: rec.description,
          priority: rec.priority,
          ai_reasoning: rec.ai_reasoning,
          status: "pending",
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        }));

        await supabase.from("career_recommendations").insert(insertData);
      } catch (e) {
        console.error("Failed to parse/store recommendations:", e);
      }
    }

    return new Response(JSON.stringify({ result: aiResult, action }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Career AI error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
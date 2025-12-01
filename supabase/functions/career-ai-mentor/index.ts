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
    console.log("Career AI Mentor function called");
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    console.log("User authenticated:", user.id);

    const { action, data } = await req.json();
    console.log("Action requested:", action);
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
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
      systemPrompt = `You are an elite AI career strategist specializing in hospitality and beverage industry. Use advanced pattern recognition to provide:

1. **Deep Career Assessment**: Analyze current trajectory, hidden strengths, untapped potential, competitive advantages
2. **Strategic Skill Gaps**: Identify critical missing skills blocking next-level progression with market demand data
3. **Personalized Action Plan**: 5 specific, time-bound steps with success metrics and milestones
4. **Industry Intelligence**: Real-time positioning analysis, emerging opportunities, market trends affecting their role
5. **Smart Predictions**: AI-powered forecast of career trajectory and recommended pivots

Use data-driven insights, industry benchmarks, and predictive analytics. Be specific, actionable, and transformative.`;

      userMessage = `Perform comprehensive career intelligence analysis:

**Profile Data:**
- Role: ${careerProfile?.role_title || "Not specified"}
- Experience: ${careerProfile?.experience_years || 0} years  
- Current Skills: ${careerProfile?.skills?.join(", ") || "None listed"}
- Career Aspirations: ${careerProfile?.career_goals?.join(", ") || "Not defined"}
- Target Roles: ${careerProfile?.target_positions?.join(", ") || "None"}
- Interests: ${careerProfile?.interests?.join(", ") || "General hospitality"}
- Location Preferences: ${careerProfile?.preferred_locations?.join(", ") || "Flexible"}

**Activity History:**
${activities?.map(a => `- ${a.title} (${a.activity_type})`).join("\n") || "No activities recorded"}

**Skill Development:**
${skills?.map(s => `- ${s.skill_name}: Level ${s.current_level}/${s.target_level}`).join("\n") || "No skills tracked"}

Provide strategic, AI-powered career intelligence with specific recommendations and predictions.`;

    } else if (action === "generate_recommendations") {
      systemPrompt = `You are an AI-powered career intelligence system for hospitality professionals. Generate 8 highly personalized, data-driven recommendations using predictive analytics and market intelligence.

**Recommendation Types:**
- **competition**: Industry competitions, awards, contests
- **job**: Specific job opportunities matching their profile
- **event**: Networking events, conferences, masterclasses
- **course**: Certifications, training programs, skill development
- **skill**: Specific skills to master for career advancement

**For each recommendation provide:**
{
  "type": "competition|job|event|course|skill",
  "title": "Specific, actionable title",
  "description": "Compelling 2-3 sentence description with concrete details and benefits",
  "priority": 1-10 (based on career impact and relevance),
  "ai_reasoning": "Data-driven explanation: Why this is crucial NOW for their specific career path, expected outcomes, and strategic value"
}

**Selection Criteria:**
- Match their experience level and career trajectory
- Address identified skill gaps
- Align with stated goals and interests
- Consider location preferences
- Prioritize high-impact opportunities
- Include mix of short-term wins and long-term investments
- Focus on opportunities available within next 3-6 months

Return ONLY valid JSON array: [{ type, title, description, priority, ai_reasoning }]`;

      userMessage = `Generate intelligent career recommendations:

**Profile:**
- Current Role: ${careerProfile?.role_title || "Bartender"}
- Experience: ${careerProfile?.experience_years || 0} years
- Skill Set: ${careerProfile?.skills?.join(", ") || "Basic bartending"}
- Career Goals: ${careerProfile?.career_goals?.join(", ") || "Career advancement"}
- Target Roles: ${careerProfile?.target_positions?.join(", ") || "Senior positions"}
- Interests: ${careerProfile?.interests?.join(", ") || "Mixology, service excellence"}
- Locations: ${careerProfile?.preferred_locations?.join(", ") || "Any location"}
- Certifications: ${careerProfile?.certifications?.join(", ") || "None"}

**Recent Activities:**
${activities?.slice(0, 5).map(a => `- ${a.title}`).join("\n") || "No recent activities"}

**Existing Recommendations:**
${recommendations?.map(r => `- ${r.title} (${r.recommendation_type})`).join("\n") || "None"}

Generate 8 unique, strategic recommendations that accelerate career growth. Avoid duplicates. Focus on actionable opportunities.`;

    } else if (action === "skill_roadmap") {
      systemPrompt = `You are an AI-powered skills development architect for hospitality professionals. Create a comprehensive, data-driven skill development roadmap using learning science principles.

For each skill provide:
{
  "skill_name": "Specific skill name",
  "current_level": 1-10,
  "target_level": 1-10,
  "priority": "critical|high|medium",
  "learning_path": [
    "Step 1: Specific action with timeframe",
    "Step 2: Progressive milestone",
    "Step 3: Mastery activity",
    "Step 4: Real-world application",
    "Step 5: Assessment/certification"
  ],
  "estimated_timeline": "X weeks/months",
  "resources": [
    "Resource 1: Specific course/book/platform",
    "Resource 2: Practice opportunity",
    "Resource 3: Mentorship/community"
  ],
  "success_metrics": ["Measurable outcome 1", "Measurable outcome 2"],
  "career_impact": "How this skill unlocks specific opportunities"
}

Focus on skills with highest ROI for career goals. Include both technical and soft skills. Return valid JSON array.`;

      userMessage = `Create intelligent skill development roadmap:

**Current Skill Levels:**
${skills?.map(s => `- ${s.skill_name}: ${s.current_level}/10 → Target: ${s.target_level}/10`).join("\n") || "No skills tracked"}

**Desired Skills:**
${careerProfile?.skills?.join(", ") || "Advanced mixology, leadership, operations"}

**Career Objectives:**
${careerProfile?.career_goals?.join(", ") || "Advance to senior role"}

**Target Positions:**
${careerProfile?.target_positions?.join(", ") || "Management level"}

Generate personalized, prioritized learning roadmap with actionable steps and realistic timelines.`;

    } else {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call Lovable AI
    console.log("Calling Lovable AI with model: google/gemini-2.5-flash");
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
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
    console.log("AI response received, length:", aiResult.length);

    // If generating recommendations, store them
    if (action === "generate_recommendations") {
      try {
        console.log("Parsing AI recommendations...");
        const recs = JSON.parse(aiResult);
        console.log("Parsed recommendations:", recs.length);
        
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

        const { error: insertError } = await supabase.from("career_recommendations").insert(insertData);
        if (insertError) {
          console.error("Insert error:", insertError);
          throw insertError;
        }
        console.log("Recommendations stored successfully");
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
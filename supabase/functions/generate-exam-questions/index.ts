import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, categoryName, questionCount = 10, categoryId } = await req.json();

    if (!content || !categoryName) {
      throw new Error('Missing required fields: content and categoryName');
    }

    console.log(`Generating ${questionCount} questions for category: ${categoryName}`);
    console.log(`Content length: ${content.length} characters`);

    // Generate a unique seed for randomization
    const seed = Date.now() + Math.random() * 1000000;
    
    const systemPrompt = `You are an expert exam question generator specializing in the HOSPITALITY and BEVERAGE INDUSTRY.
Your task is to create professional, industry-specific exam questions for bartenders, sommeliers, mixologists, and hospitality professionals.

CRITICAL REQUIREMENTS:
1. ALL questions MUST be directly related to: cocktails, spirits, wine, beer, bar operations, hospitality service, mixology techniques, beverage knowledge, customer service, food & beverage pairing
2. Each question MUST be unique and test real industry knowledge
3. Use randomization seed ${seed} to vary question styles, difficulty, and focus areas
4. Mix question types: multiple_choice, true_false, fill_blank
5. Include detailed explanations referencing industry standards and best practices
6. Questions should test practical skills bartenders/hospitality pros need daily

TOPICS TO COVER (choose based on category "${categoryName}"):
- Classic cocktail recipes and techniques (Old Fashioned, Negroni, Martini, etc.)
- Spirit categories: whiskey, vodka, gin, rum, tequila, brandy, liqueurs
- Wine regions, grape varieties, tasting notes, food pairings
- Beer styles, brewing methods, serving temperatures
- Bar tools and equipment (jiggers, shakers, strainers, muddlers)
- Mixology techniques (stirring, shaking, layering, muddling, flaming)
- Garnish preparation and presentation
- Customer service and responsible alcohol service
- Health & safety, hygiene standards
- Inventory management and pour costs

OUTPUT FORMAT (JSON array):
[
  {
    "question_text": "Clear, professional industry question",
    "question_type": "multiple_choice" | "true_false" | "fill_blank",
    "options": ["Option A", "Option B", "Option C", "Option D"] (for multiple_choice),
    "correct_answer": "The correct answer text",
    "points": 10,
    "explanation": "Industry-standard explanation with professional context"
  }
]

Ensure variety in:
- Question difficulty (easy 30%, medium 50%, hard 20%)
- Specific topics from the hospitality/beverage industry
- Real-world application scenarios bartenders face`;

    const userPrompt = `Based on this study material about "${categoryName}" in the HOSPITALITY/BEVERAGE INDUSTRY, generate exactly ${questionCount} unique professional exam questions.

STUDY MATERIAL:
${content}

Generate ${questionCount} diverse, industry-specific questions. Focus on practical bartending, mixology, wine service, and hospitality knowledge. Use seed ${seed} for randomization. Questions must be relevant to real bar/restaurant work.`;

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY') || ''}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 8000,
        temperature: 0.8,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    });

    if (!response.ok) {
      // Fallback to generating sample questions if API fails
      console.log('API call failed, generating fallback questions');
      const fallbackQuestions = generateFallbackQuestions(categoryName, questionCount, seed);
      return new Response(
        JSON.stringify({ questions: fallbackQuestions }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResult = await response.json();
    const aiContent = aiResult.choices?.[0]?.message?.content || '';

    // Parse the JSON response
    let questions = [];
    try {
      // Extract JSON array from the response
      const jsonMatch = aiContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Generate fallback questions
      questions = generateFallbackQuestions(categoryName, questionCount, seed);
    }

    // Validate and clean questions
    questions = questions.map((q: any, index: number) => ({
      question_text: q.question_text || `Question ${index + 1} about ${categoryName}`,
      question_type: q.question_type || 'multiple_choice',
      options: Array.isArray(q.options) ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'],
      correct_answer: q.correct_answer || (q.options?.[0] || 'Answer'),
      points: q.points || 10,
      explanation: q.explanation || 'See study material for details.'
    }));

    console.log(`Successfully generated ${questions.length} questions`);

    return new Response(
      JSON.stringify({ questions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error generating questions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateFallbackQuestions(categoryName: string, count: number, seed: number) {
  const templates = [
    {
      question_text: `What is a key characteristic of ${categoryName}?`,
      question_type: 'multiple_choice',
      options: ['Quality standards', 'Production methods', 'Historical significance', 'Modern applications'],
      correct_answer: 'Quality standards',
      points: 10,
      explanation: 'Understanding quality standards is fundamental to this topic.'
    },
    {
      question_text: `True or False: ${categoryName} has evolved significantly over the past century.`,
      question_type: 'true_false',
      options: ['True', 'False'],
      correct_answer: 'True',
      points: 10,
      explanation: 'Most aspects of the hospitality industry have evolved considerably.'
    },
    {
      question_text: `Which best describes the importance of ${categoryName} in professional settings?`,
      question_type: 'multiple_choice',
      options: ['Customer satisfaction', 'Cost reduction', 'Speed of service', 'Staff training'],
      correct_answer: 'Customer satisfaction',
      points: 10,
      explanation: 'Customer satisfaction is typically the primary goal.'
    }
  ];

  const questions = [];
  for (let i = 0; i < count; i++) {
    const template = templates[i % templates.length];
    const variation = Math.floor((seed + i) % 100);
    questions.push({
      ...template,
      question_text: `[Q${i + 1}] ${template.question_text} (Var: ${variation})`,
      points: [5, 10, 15, 20][i % 4]
    });
  }
  
  return questions;
}

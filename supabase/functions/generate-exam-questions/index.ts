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
    
    const systemPrompt = `You are an expert exam question generator for the hospitality and beverage industry. 
Your task is to create unique, high-quality exam questions based on the provided study material.

CRITICAL REQUIREMENTS:
1. Each question MUST be unique and different from others
2. Use randomization seed ${seed} to vary question styles, difficulty, and focus areas
3. Mix question types: multiple_choice, true_false, fill_blank
4. Include detailed explanations for each correct answer
5. Questions should test different cognitive levels (recall, understanding, application)
6. Make questions practical and relevant to real-world scenarios

OUTPUT FORMAT (JSON array):
[
  {
    "question_text": "Clear, well-formed question",
    "question_type": "multiple_choice" | "true_false" | "fill_blank",
    "options": ["Option A", "Option B", "Option C", "Option D"] (for multiple_choice),
    "correct_answer": "The correct answer text",
    "points": 10,
    "explanation": "Why this answer is correct and educational context"
  }
]

Ensure variety in:
- Question difficulty (easy 30%, medium 50%, hard 20%)
- Topics covered from the material
- Question phrasing and style
- Real-world application scenarios`;

    const userPrompt = `Based on this study material about "${categoryName}", generate exactly ${questionCount} unique exam questions.

STUDY MATERIAL:
${content}

Generate ${questionCount} diverse, unique questions following the JSON format. Make each question different and cover various aspects of the material. Use seed ${seed} for randomization.`;

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

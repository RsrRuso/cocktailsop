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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      throw new Error('AI service not configured');
    }

    // Generate a unique seed for randomization
    const seed = Date.now() + Math.random() * 1000000;
    
    const systemPrompt = `You are an expert exam question generator specializing in the HOSPITALITY and BEVERAGE INDUSTRY.
Your task is to create professional, industry-specific exam questions based STRICTLY on the provided study material.

CRITICAL REQUIREMENTS:
1. ALL questions MUST be directly derived from the provided study material content
2. Do NOT invent information - only use facts from the material
3. Each question MUST be unique and test knowledge from the material
4. Use randomization seed ${seed} to vary question styles and focus areas
5. Mix question types: multiple_choice (60%), true_false (30%), fill_blank (10%)
6. Include detailed explanations referencing the study material

QUESTION TYPES:
- multiple_choice: 4 options, one correct answer
- true_false: True or False statement
- fill_blank: Short answer requiring specific term/phrase from material

OUTPUT FORMAT (JSON array only, no markdown):
[
  {
    "question_text": "Clear question based on study material",
    "question_type": "multiple_choice",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": "The correct answer text",
    "points": 10,
    "explanation": "Explanation referencing the study material"
  }
]

For true_false questions, options should be ["True", "False"] and correct_answer should be "True" or "False".
For fill_blank questions, options can be null and correct_answer is the expected short answer.`;

    const userPrompt = `Based STRICTLY on this study material about "${categoryName}", generate exactly ${questionCount} unique exam questions.

STUDY MATERIAL:
${content}

IMPORTANT: Every question must be answerable from the material above. Do not create questions about topics not covered in the material. Use seed ${seed} for randomization.

Generate ${questionCount} questions now as a JSON array:`;

    console.log('Calling Lovable AI...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 8000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI service error: ${response.status}`);
    }

    const aiResult = await response.json();
    const aiContent = aiResult.choices?.[0]?.message?.content || '';
    
    console.log('AI response received, parsing...');

    // Parse the JSON response
    let questions = [];
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanContent = aiContent.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.slice(7);
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith('```')) {
        cleanContent = cleanContent.slice(0, -3);
      }
      cleanContent = cleanContent.trim();
      
      // Extract JSON array from the response
      const jsonMatch = cleanContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      } else {
        // Try parsing the whole content as JSON
        questions = JSON.parse(cleanContent);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Raw response:', aiContent.substring(0, 500));
      throw new Error('Failed to parse generated questions');
    }

    // Validate and clean questions
    questions = questions.map((q: any, index: number) => ({
      question_text: q.question_text || `Question ${index + 1} about ${categoryName}`,
      question_type: q.question_type || 'multiple_choice',
      options: Array.isArray(q.options) ? q.options : 
               q.question_type === 'true_false' ? ['True', 'False'] :
               ['Option A', 'Option B', 'Option C', 'Option D'],
      correct_answer: q.correct_answer || (q.options?.[0] || 'Answer'),
      points: q.points || 10,
      explanation: q.explanation || 'See study material for details.'
    }));

    console.log(`Successfully generated ${questions.length} questions from study material`);

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

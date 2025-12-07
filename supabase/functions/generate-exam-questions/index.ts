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

    console.log(`=== GENERATING EXAM QUESTIONS ===`);
    console.log(`Category: ${categoryName}`);
    console.log(`Question count: ${questionCount}`);
    console.log(`Content length: ${content.length} characters`);
    console.log(`Content preview: ${content.substring(0, 300)}...`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      throw new Error('AI service not configured');
    }

    const systemPrompt = `You are an expert exam question generator for the HOSPITALITY and BEVERAGE INDUSTRY.

YOUR TASK: Create exam questions based EXCLUSIVELY on the study material provided by the user.

CRITICAL RULES:
1. EVERY question MUST be derived from SPECIFIC facts, ingredients, measurements, techniques, or steps mentioned in the study material
2. NEVER generate generic questions - each question must reference specific details from the content
3. Questions should test knowledge of: specific ingredients and quantities, preparation steps, techniques, temperatures, equipment, garnishes, glassware
4. Include the actual values/terms from the material in questions and answers

QUESTION TYPES (generate a mix):
- multiple_choice: 4 specific options based on material, one correct
- true_false: Statements using exact details from material
- fill_blank: Fill in specific measurements, ingredients, or techniques

OUTPUT: Return ONLY a JSON array with this exact structure:
[
  {
    "question_text": "Question referencing specific content detail",
    "question_type": "multiple_choice",
    "options": ["Specific option A", "Specific option B", "Specific option C", "Specific option D"],
    "correct_answer": "The exact correct answer",
    "points": 10,
    "explanation": "Explanation citing the specific content"
  }
]

EXAMPLES of GOOD questions based on cocktail content:
- "What is the brewing temperature for the tea extraction?" (tests specific temp: 99°C)
- "How many grams of tropical dried tea are used?" (tests specific amount: 4g)
- "What spirit is the base of this cocktail?" (tests base spirit)
- "True or False: The extraction drips into a frozen pot to chill to approximately 5°C" (tests technique)`;

    const userPrompt = `STUDY MATERIAL FOR "${categoryName}":

---BEGIN CONTENT---
${content}
---END CONTENT---

Based on the SPECIFIC details in this content, generate exactly ${questionCount} exam questions.

Each question MUST reference actual facts from the content above - specific ingredients, measurements, techniques, temperatures, steps, or equipment mentioned.

Return ONLY the JSON array, no other text:`;

    console.log('Calling Lovable AI with content-focused prompt...');

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
        temperature: 0.3,
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
    
    console.log('AI response received');
    console.log('Response preview:', aiContent.substring(0, 500));

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
        questions = JSON.parse(cleanContent);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Raw response:', aiContent);
      throw new Error('Failed to parse generated questions. Please try again.');
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      console.error('No questions in parsed response');
      throw new Error('AI did not generate any questions. Please try again.');
    }

    // Validate and clean questions
    questions = questions.map((q: any, index: number) => ({
      question_text: q.question_text || `Question ${index + 1}`,
      question_type: q.question_type || 'multiple_choice',
      options: Array.isArray(q.options) ? q.options : 
               q.question_type === 'true_false' ? ['True', 'False'] :
               ['Option A', 'Option B', 'Option C', 'Option D'],
      correct_answer: q.correct_answer || (q.options?.[0] || 'Answer'),
      points: q.points || 10,
      explanation: q.explanation || 'Refer to the study material for details.'
    }));

    console.log(`Successfully generated ${questions.length} content-based questions`);
    console.log('Sample question:', questions[0]?.question_text);

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
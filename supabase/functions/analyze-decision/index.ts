import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { caseId } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the decision case
    const { data: decisionCase, error: fetchError } = await supabase
      .from('decision_cases')
      .select('*')
      .eq('id', caseId)
      .single();

    if (fetchError || !decisionCase) {
      console.error('Error fetching decision case:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Decision case not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare the prompt for AI analysis
    const prompt = `Analyze this business decision comprehensively:

Title: ${decisionCase.title}
Description: ${decisionCase.description}
${decisionCase.constraints ? `Constraints: ${decisionCase.constraints}` : ''}
${decisionCase.context ? `Context: ${decisionCase.context}` : ''}
${decisionCase.risks ? `Known Risks: ${decisionCase.risks}` : ''}
${decisionCase.objectives ? `Objectives: ${decisionCase.objectives}` : ''}
${decisionCase.additional_text ? `Additional Information: ${decisionCase.additional_text}` : ''}

Provide a comprehensive decision analysis including:
1. A clear summary of the decision
2. Key arguments for and against
3. 3-5 distinct decision paths with their implications
4. Effects and trade-offs for each path
5. Probability-based reasoning
6. Potential blind spots
7. Your recommended path with justification
8. Follow-up questions that should be considered

Return your analysis in JSON format with these exact keys:
{
  "summary": "string",
  "key_arguments": {"for": ["string"], "against": ["string"]},
  "decision_paths": [{"name": "string", "description": "string", "pros": ["string"], "cons": ["string"], "probability_success": "number"}],
  "effects_tradeoffs": {"short_term": ["string"], "long_term": ["string"], "risks": ["string"], "opportunities": ["string"]},
  "probability_reasoning": "string",
  "blind_spots": ["string"],
  "recommended_path": "string",
  "follow_up_questions": ["string"]
}`;

    // Call Lovable AI (Gemini)
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'You are a strategic business decision analyst. Provide comprehensive, structured analysis in valid JSON format only.' 
          },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'AI analysis failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const analysisText = aiData.choices[0].message.content;
    
    // Extract JSON from response (handling markdown code blocks)
    let analysisData;
    try {
      const jsonMatch = analysisText.match(/```json\n([\s\S]*?)\n```/) || analysisText.match(/```\n([\s\S]*?)\n```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : analysisText;
      analysisData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Response:', analysisText);
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store the analysis in the database
    const { data: analysis, error: insertError } = await supabase
      .from('decision_analyses')
      .insert({
        case_id: caseId,
        user_id: decisionCase.user_id,
        summary: analysisData.summary,
        key_arguments: analysisData.key_arguments,
        decision_paths: analysisData.decision_paths,
        effects_tradeoffs: analysisData.effects_tradeoffs,
        probability_reasoning: analysisData.probability_reasoning,
        blind_spots: analysisData.blind_spots,
        recommended_path: analysisData.recommended_path,
        follow_up_questions: analysisData.follow_up_questions,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error storing analysis:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to store analysis' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add a revision entry
    await supabase.from('decision_revisions').insert({
      case_id: caseId,
      user_id: decisionCase.user_id,
      revision_type: 'analysis_generated',
      content: 'AI analysis completed',
      metadata: { analysis_id: analysis.id }
    });

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-decision:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
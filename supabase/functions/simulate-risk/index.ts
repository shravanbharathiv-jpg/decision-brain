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
    const groqApiKey = Deno.env.get('GROQ_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the decision case and its analysis
    const { data: decisionCase, error: caseError } = await supabase
      .from('decision_cases')
      .select('*, decision_analyses(*)')
      .eq('id', caseId)
      .single();

    if (caseError || !decisionCase) {
      console.error('Error fetching decision case:', caseError);
      return new Response(
        JSON.stringify({ error: 'Decision case not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the latest analysis
    const analysis = decisionCase.decision_analyses?.[0];

    const prompt = `You are a risk simulation expert. Analyze this decision and run a comprehensive risk simulation.

Decision: ${decisionCase.title}
Description: ${decisionCase.description}
${decisionCase.risks ? `Known Risks: ${decisionCase.risks}` : ''}
${analysis ? `Previous Analysis Summary: ${analysis.summary}` : ''}

Run a 100-iteration Monte Carlo-style risk simulation and provide:
1. Expected value calculations (monetary and non-monetary)
2. Best-case scenario (90th percentile)
3. Worst-case scenario (10th percentile)
4. Simulation results summary
5. Probability distribution data for charting

Return your simulation in JSON format with these exact keys:
{
  "expected_value": {"monetary": "number or null", "impact_score": "number 1-10", "confidence": "number 0-1"},
  "best_case": {"description": "string", "probability": "number 0-1", "impact": "string"},
  "worst_case": {"description": "string", "probability": "number 0-1", "impact": "string"},
  "simulation_results": {"iterations": 100, "success_rate": "number 0-1", "average_outcome": "string", "variance": "string"},
  "probability_data": [{"outcome": "string", "probability": "number 0-1", "impact_level": "number 1-10"}]
}`;

    // Call Groq for simulation
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { 
            role: 'system', 
            content: 'You are a risk simulation engine that provides detailed Monte Carlo-style analysis in valid JSON format only.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error('Groq API error:', groqResponse.status, errorText);
      
      return new Response(
        JSON.stringify({ error: 'Risk simulation failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const groqData = await groqResponse.json();
    const simulationText = groqData.choices[0].message.content;
    
    // Extract JSON from response
    let simulationData;
    try {
      const jsonMatch = simulationText.match(/```json\n([\s\S]*?)\n```/) || simulationText.match(/```\n([\s\S]*?)\n```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : simulationText;
      simulationData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Response:', simulationText);
      return new Response(
        JSON.stringify({ error: 'Failed to parse simulation response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store the simulation in the database
    const { data: simulation, error: insertError } = await supabase
      .from('risk_simulations')
      .insert({
        case_id: caseId,
        user_id: decisionCase.user_id,
        expected_value: simulationData.expected_value,
        best_case: simulationData.best_case,
        worst_case: simulationData.worst_case,
        simulation_results: simulationData.simulation_results,
        probability_data: simulationData.probability_data,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error storing simulation:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to store simulation' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add a revision entry
    await supabase.from('decision_revisions').insert({
      case_id: caseId,
      user_id: decisionCase.user_id,
      revision_type: 'simulation_run',
      content: 'Risk simulation completed',
      metadata: { simulation_id: simulation.id }
    });

    return new Response(
      JSON.stringify({ simulation }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in simulate-risk:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
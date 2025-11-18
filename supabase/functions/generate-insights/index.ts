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
    const { userId } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all decision cases for this user
    const { data: cases, error: casesError } = await supabase
      .from('decision_cases')
      .select('*, decision_analyses(*), risk_simulations(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (casesError) {
      console.error('Error fetching cases:', casesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch decision data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!cases || cases.length === 0) {
      return new Response(
        JSON.stringify({ 
          insights: {
            overall_summary: "No decisions yet. Create your first decision case to get started!",
            key_trends: [],
            recommendations: [],
            risk_overview: "No data available"
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare data summary for AI
    const dataSummary = cases.map(c => ({
      title: c.title,
      status: c.status,
      risks: c.risks,
      has_analysis: c.decision_analyses?.length > 0,
      has_simulation: c.risk_simulations?.length > 0,
    }));

    const prompt = `Analyze this business's decision-making patterns and provide strategic insights.

Total Decisions: ${cases.length}
Decision Summary: ${JSON.stringify(dataSummary, null, 2)}

Provide comprehensive business insights including:
1. Overall decision-making summary
2. Key trends and patterns
3. Strategic recommendations
4. Risk overview across all decisions
5. Opportunities identified
6. Potential blind spots

Return your insights in JSON format with these exact keys:
{
  "overall_summary": "string",
  "key_trends": ["string"],
  "recommendations": ["string"],
  "risk_overview": "string",
  "opportunities": ["string"],
  "blind_spots": ["string"]
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
            content: 'You are a strategic business insights analyst. Provide actionable insights in valid JSON format only.' 
          },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429 || aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ 
            insights: {
              overall_summary: "Unable to generate insights due to AI service limits. Please try again later.",
              key_trends: [],
              recommendations: [],
              risk_overview: "Service temporarily unavailable"
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to generate insights' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const insightsText = aiData.choices[0].message.content;
    
    // Extract JSON from response
    let insights;
    try {
      const jsonMatch = insightsText.match(/```json\n([\s\S]*?)\n```/) || insightsText.match(/```\n([\s\S]*?)\n```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : insightsText;
      insights = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Response:', insightsText);
      return new Response(
        JSON.stringify({ error: 'Failed to parse insights response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ insights }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-insights:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { caseId, format } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get decision case with analysis and simulation
    const { data: decisionCase, error: caseError } = await supabase
      .from('decision_cases')
      .select('*, decision_analyses(*), risk_simulations(*)')
      .eq('id', caseId)
      .single();

    if (caseError) throw caseError;

    if (format === 'csv') {
      // Generate CSV
      const csvRows = [
        ['Field', 'Value'],
        ['Title', decisionCase.title],
        ['Description', decisionCase.description],
        ['Status', decisionCase.status],
        ['Context', decisionCase.context || 'N/A'],
        ['Constraints', decisionCase.constraints || 'N/A'],
        ['Objectives', decisionCase.objectives || 'N/A'],
        ['Risks', decisionCase.risks || 'N/A'],
        ['Created', new Date(decisionCase.created_at).toLocaleDateString()],
        [''],
      ];

      if (decisionCase.decision_analyses && decisionCase.decision_analyses.length > 0) {
        const analysis = decisionCase.decision_analyses[0];
        csvRows.push(['Analysis Summary', analysis.summary || 'N/A']);
        csvRows.push(['Recommended Path', analysis.recommended_path || 'N/A']);
        csvRows.push(['Probability Reasoning', analysis.probability_reasoning || 'N/A']);
      }

      const csv = csvRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

      return new Response(csv, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="decision-${caseId}.csv"`,
        },
      });
    } else {
      // Generate PDF (HTML format for browser printing)
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${decisionCase.title}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
            h1 { color: #2563eb; border-bottom: 3px solid #2563eb; padding-bottom: 10px; }
            h2 { color: #3b82f6; margin-top: 30px; }
            .section { margin: 20px 0; }
            .label { font-weight: bold; color: #64748b; }
            .badge { background: #e0f2fe; color: #0c4a6e; padding: 4px 12px; border-radius: 12px; font-size: 12px; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>${decisionCase.title}</h1>
          <p class="badge">${decisionCase.status}</p>
          
          <div class="section">
            <div class="label">Description:</div>
            <p>${decisionCase.description}</p>
          </div>

          ${decisionCase.context ? `
          <div class="section">
            <div class="label">Context:</div>
            <p>${decisionCase.context}</p>
          </div>
          ` : ''}

          ${decisionCase.constraints ? `
          <div class="section">
            <div class="label">Constraints:</div>
            <p>${decisionCase.constraints}</p>
          </div>
          ` : ''}

          ${decisionCase.objectives ? `
          <div class="section">
            <div class="label">Objectives:</div>
            <p>${decisionCase.objectives}</p>
          </div>
          ` : ''}

          ${decisionCase.risks ? `
          <div class="section">
            <div class="label">Risks:</div>
            <p>${decisionCase.risks}</p>
          </div>
          ` : ''}

          ${decisionCase.decision_analyses && decisionCase.decision_analyses.length > 0 ? `
          <h2>AI Analysis</h2>
          <div class="section">
            <div class="label">Summary:</div>
            <p>${decisionCase.decision_analyses[0].summary || 'N/A'}</p>
          </div>
          
          <div class="section">
            <div class="label">Recommended Path:</div>
            <p>${decisionCase.decision_analyses[0].recommended_path || 'N/A'}</p>
          </div>

          <div class="section">
            <div class="label">Probability Reasoning:</div>
            <p>${decisionCase.decision_analyses[0].probability_reasoning || 'N/A'}</p>
          </div>
          ` : ''}

          ${decisionCase.risk_simulations && decisionCase.risk_simulations.length > 0 ? `
          <h2>Risk Simulation</h2>
          <div class="section">
            <div class="label">Expected Value:</div>
            <p>${JSON.stringify(decisionCase.risk_simulations[0].expected_value || {})}</p>
          </div>
          ` : ''}

          <div class="section" style="margin-top: 40px; color: #64748b; font-size: 12px;">
            Generated on ${new Date().toLocaleString()}
          </div>

          <script class="no-print">
            window.print();
          </script>
        </body>
        </html>
      `;

      return new Response(html, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html',
        },
      });
    }
  } catch (error) {
    console.error('Export error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

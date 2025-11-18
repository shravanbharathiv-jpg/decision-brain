import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Brain, AlertTriangle, TrendingUp, Loader2, History } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import TeamManager from "@/components/TeamManager";

const DecisionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [decisionCase, setDecisionCase] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [simulation, setSimulation] = useState<any>(null);
  const [revisions, setRevisions] = useState<any[]>([]);
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    checkAuth();
  }, [id]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUserId(session.user.id);
    loadData();
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: caseData, error } = await supabase
        .from("decision_cases")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setDecisionCase(caseData);

      const { data: analysisData } = await supabase
        .from("decision_analyses")
        .select("*")
        .eq("case_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      setAnalysis(analysisData);

      const { data: simulationData } = await supabase
        .from("risk_simulations")
        .select("*")
        .eq("case_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      setSimulation(simulationData);

      const { data: revisionsData } = await supabase
        .from("decision_revisions")
        .select("*")
        .eq("case_id", id)
        .order("created_at", { ascending: false });

      setRevisions(revisionsData || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-decision", {
        body: { caseId: id },
      });

      if (error) throw error;

      toast({
        title: "Analysis complete",
        description: "Your decision has been analyzed",
      });

      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSimulate = async () => {
    setSimulating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data: canCreate, error: checkError } = await supabase
        .rpc("can_create_simulation", { check_user_id: session.user.id });

      if (checkError) throw checkError;

      if (!canCreate) {
        toast({
          title: "Limit Reached",
          description: "You've reached your monthly simulation limit. Upgrade to continue.",
          variant: "destructive",
        });
        navigate("/pricing");
        return;
      }

      const { data, error } = await supabase.functions.invoke("simulate-risk", {
        body: { caseId: id },
      });

      if (error) throw error;

      toast({
        title: "Simulation complete",
        description: "Risk analysis has been generated",
      });

      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSimulating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <header className="border-b bg-card/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <Skeleton className="h-8 w-64" />
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <Skeleton className="h-96 w-full" />
        </main>
      </div>
    );
  }

  if (!decisionCase) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Decision not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="p-2 bg-gradient-to-br from-primary to-accent rounded-xl">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold flex-1">{decisionCase.title}</h1>
          <div className="flex gap-2">
            <Button onClick={handleAnalyze} disabled={analyzing} variant="outline">
              {analyzing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {analyzing ? "Analyzing..." : "Re-Analyze"}
            </Button>
            <Button onClick={handleSimulate} disabled={simulating || !analysis}>
              {simulating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {simulating ? "Simulating..." : "Simulate Risk"}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="simulation">Risk Simulation</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Decision Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground">{decisionCase.description}</p>
                </div>
                {decisionCase.objectives && (
                  <div>
                    <h3 className="font-semibold mb-2">Objectives</h3>
                    <p className="text-muted-foreground">{decisionCase.objectives}</p>
                  </div>
                )}
                {decisionCase.constraints && (
                  <div>
                    <h3 className="font-semibold mb-2">Constraints</h3>
                    <p className="text-muted-foreground">{decisionCase.constraints}</p>
                  </div>
                )}
                {decisionCase.context && (
                  <div>
                    <h3 className="font-semibold mb-2">Context</h3>
                    <p className="text-muted-foreground">{decisionCase.context}</p>
                  </div>
                )}
                {decisionCase.risks && (
                  <div>
                    <h3 className="font-semibold mb-2">Known Risks</h3>
                    <p className="text-muted-foreground">{decisionCase.risks}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis">
            {!analysis ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Brain className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No analysis yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Generate an AI-powered analysis of this decision
                  </p>
                  <Button onClick={handleAnalyze} disabled={analyzing}>
                    {analyzing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Generate Analysis
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-accent" />
                      Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{analysis.summary}</p>
                  </CardContent>
                </Card>

                {analysis.decision_paths && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Decision Paths</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {analysis.decision_paths.map((path: any, i: number) => (
                        <div key={i} className="border-l-4 border-primary pl-4">
                          <h4 className="font-semibold mb-2">{path.name}</h4>
                          <p className="text-sm text-muted-foreground mb-2">{path.description}</p>
                          <div className="grid md:grid-cols-2 gap-4 mt-3">
                            <div>
                              <p className="text-sm font-medium text-accent mb-1">Pros</p>
                              <ul className="text-sm space-y-1">
                                {path.pros?.map((pro: string, j: number) => (
                                  <li key={j} className="text-muted-foreground">+ {pro}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-destructive mb-1">Cons</p>
                              <ul className="text-sm space-y-1">
                                {path.cons?.map((con: string, j: number) => (
                                  <li key={j} className="text-muted-foreground">- {con}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {analysis.recommended_path && (
                  <Card className="border-accent">
                    <CardHeader>
                      <CardTitle className="text-accent">Recommended Path</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{analysis.recommended_path}</p>
                    </CardContent>
                  </Card>
                )}

                {analysis.blind_spots && analysis.blind_spots.length > 0 && (
                  <Card className="border-warning">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-warning">
                        <AlertTriangle className="w-5 h-5" />
                        Potential Blind Spots
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {analysis.blind_spots.map((spot: string, i: number) => (
                          <li key={i} className="text-muted-foreground">• {spot}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="simulation">
            {!simulation ? (
              <Card className="text-center py-12">
                <CardContent>
                  <AlertTriangle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No simulation yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Run a Monte Carlo-style risk simulation
                  </p>
                  <Button onClick={handleSimulate} disabled={simulating || !analysis}>
                    {simulating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Run Simulation
                  </Button>
                  {!analysis && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Generate an analysis first
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                <div className="grid md:grid-cols-3 gap-4">
                  <Card className="border-accent">
                    <CardHeader>
                      <CardTitle className="text-sm">Expected Value</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-accent">
                        {simulation.expected_value?.impact_score || "N/A"}/10
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Confidence: {((simulation.expected_value?.confidence || 0) * 100).toFixed(0)}%
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-accent">
                    <CardHeader>
                      <CardTitle className="text-sm">Best Case</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-2">
                        {simulation.best_case?.description}
                      </p>
                      <Badge variant="outline" className="text-accent border-accent">
                        {((simulation.best_case?.probability || 0) * 100).toFixed(0)}% probability
                      </Badge>
                    </CardContent>
                  </Card>

                  <Card className="border-warning">
                    <CardHeader>
                      <CardTitle className="text-sm">Worst Case</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-2">
                        {simulation.worst_case?.description}
                      </p>
                      <Badge variant="outline" className="text-warning border-warning">
                        {((simulation.worst_case?.probability || 0) * 100).toFixed(0)}% probability
                      </Badge>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Simulation Results</CardTitle>
                    <CardDescription>Based on 100 Monte Carlo iterations</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm font-medium mb-1">Success Rate</p>
                      <p className="text-2xl font-bold text-primary">
                        {((simulation.simulation_results?.success_rate || 0) * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">Average Outcome</p>
                      <p className="text-muted-foreground">{simulation.simulation_results?.average_outcome}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="team">
            <TeamManager caseId={id!} userId={userId} />
          </TabsContent>

          <TabsContent value="timeline">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Decision Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                {revisions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No activity yet</p>
                ) : (
                  <div className="space-y-4">
                    {revisions.map((revision) => (
                      <div key={revision.id} className="border-l-2 border-primary pl-4 pb-4">
                        <p className="font-medium capitalize">{revision.revision_type.replace(/_/g, " ")}</p>
                        <p className="text-sm text-muted-foreground">{revision.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(revision.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default DecisionDetail;
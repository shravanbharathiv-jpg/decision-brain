import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Brain, Plus, TrendingUp, AlertTriangle, LogOut, Crown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface DecisionCase {
  id: string;
  title: string;
  status: string;
  created_at: string;
  decision_analyses: any[];
  risk_simulations: any[];
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState<DecisionCase[]>([]);
  const [insights, setInsights] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("free");
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    setUserId(session.user.id);
    loadData(session.user.id);
    loadUserRole(session.user.id);
  };

  const loadUserRole = async (uid: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .single();
    
    if (data) {
      setUserRole(data.role);
    }
  };

  const loadData = async (uid: string) => {
    setLoading(true);
    try {
      const { data: casesData, error } = await supabase
        .from("decision_cases")
        .select("*, decision_analyses(*), risk_simulations(*)")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCases(casesData || []);

      // Load insights
      if (casesData && casesData.length > 0) {
        const { data: insightsData } = await supabase.functions.invoke("generate-insights", {
          body: { userId: uid },
        });
        
        if (insightsData?.insights) {
          setInsights(insightsData.insights);
        }
      }
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const casesThisMonth = cases.filter(c => {
    const caseDate = new Date(c.created_at);
    const now = new Date();
    return caseDate.getMonth() === now.getMonth() && caseDate.getFullYear() === now.getFullYear();
  }).length;

  const canCreateMore = userRole !== "free" || casesThisMonth < 3;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-primary to-accent rounded-xl">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold">Decision Intelligence Hub</h1>
          </div>
          <div className="flex items-center gap-3">
            {userRole === "free" && (
              <Button variant="outline" onClick={() => navigate("/pricing")} className="gap-2">
                <Crown className="w-4 h-4" />
                Upgrade
              </Button>
            )}
            <Button variant="ghost" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="space-y-6">
            <Skeleton className="h-48 w-full" />
            <div className="grid gap-6 md:grid-cols-3">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
          </div>
        ) : (
          <>
            {insights && (
              <Card className="mb-8 shadow-card border-accent/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-accent" />
                    AI-Generated Insights
                  </CardTitle>
                  <CardDescription>Based on your decision-making patterns</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">{insights.overall_summary}</p>
                  {insights.key_trends?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Key Trends</h4>
                      <ul className="text-sm space-y-1">
                        {insights.key_trends.map((trend: string, i: number) => (
                          <li key={i} className="text-muted-foreground">• {trend}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="grid gap-6 md:grid-cols-3 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Total Decisions</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-primary">{cases.length}</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">This Month</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-accent">{casesThisMonth}</p>
                  {userRole === "free" && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {3 - casesThisMonth} remaining on Free plan
                    </p>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Plan</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold capitalize">{userRole}</p>
                  {userRole === "free" && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="mt-2"
                      onClick={() => navigate("/pricing")}
                    >
                      Upgrade Plan
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Your Decisions</h2>
              <Button 
                onClick={() => canCreateMore ? navigate("/new") : navigate("/pricing")}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                {canCreateMore ? "New Decision" : "Upgrade to Continue"}
              </Button>
            </div>

            {cases.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Brain className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No decisions yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first decision case to get AI-powered analysis
                  </p>
                  <Button onClick={() => navigate("/new")}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Decision
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {cases.map((case_) => (
                  <Card 
                    key={case_.id} 
                    className="hover:shadow-elevated transition-shadow cursor-pointer"
                    onClick={() => navigate(`/decision/${case_.id}`)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{case_.title}</CardTitle>
                          <CardDescription>
                            Created {new Date(case_.created_at).toLocaleDateString()}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          {case_.decision_analyses?.length > 0 && (
                            <div className="px-2 py-1 bg-accent/10 text-accent text-xs rounded-full">
                              Analyzed
                            </div>
                          )}
                          {case_.risk_simulations?.length > 0 && (
                            <div className="px-2 py-1 bg-warning/10 text-warning text-xs rounded-full flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Simulated
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
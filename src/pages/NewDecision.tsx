import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Brain, Loader2 } from "lucide-react";

const NewDecision = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    constraints: "",
    context: "",
    risks: "",
    objectives: "",
    additional_text: "",
  });

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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: newCase, error: insertError } = await supabase
        .from("decision_cases")
        .insert({
          ...formData,
          user_id: userId,
          status: "active",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      toast({
        title: "Decision created!",
        description: "Generating AI analysis...",
      });

      // Trigger AI analysis in background
      supabase.functions.invoke("analyze-decision", {
        body: { caseId: newCase.id },
      }).then(() => {
        toast({
          title: "Analysis complete",
          description: "Your decision has been analyzed",
        });
      });

      navigate(`/decision/${newCase.id}`);
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
          <h1 className="text-2xl font-bold">New Decision Case</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Card className="shadow-elevated">
          <CardHeader>
            <CardTitle>Create Decision Case</CardTitle>
            <CardDescription>
              Provide details about your decision. The more context you provide, the better the AI analysis.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Decision Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Should we expand to a new market?"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the decision you need to make..."
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="objectives">Objectives</Label>
                <Textarea
                  id="objectives"
                  value={formData.objectives}
                  onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                  placeholder="What are you trying to achieve?"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="constraints">Constraints</Label>
                <Textarea
                  id="constraints"
                  value={formData.constraints}
                  onChange={(e) => setFormData({ ...formData, constraints: e.target.value })}
                  placeholder="Budget, timeline, resource limitations..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="context">Context</Label>
                <Textarea
                  id="context"
                  value={formData.context}
                  onChange={(e) => setFormData({ ...formData, context: e.target.value })}
                  placeholder="Background information, market conditions, company situation..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="risks">Known Risks</Label>
                <Textarea
                  id="risks"
                  value={formData.risks}
                  onChange={(e) => setFormData({ ...formData, risks: e.target.value })}
                  placeholder="What risks are you aware of?"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="additional_text">Additional Information</Label>
                <Textarea
                  id="additional_text"
                  value={formData.additional_text}
                  onChange={(e) => setFormData({ ...formData, additional_text: e.target.value })}
                  placeholder="Any other relevant information..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate("/")} disabled={loading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating & Analyzing...
                    </>
                  ) : (
                    "Create Decision"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default NewDecision;
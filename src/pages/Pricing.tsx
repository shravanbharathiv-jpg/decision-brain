import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Check, Crown, Loader2 } from "lucide-react";

const Pricing = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
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

  const handleUpgrade = async (plan: "pro" | "premium") => {
    setLoading(plan);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { 
          userId,
          plan,
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error("No checkout URL received");

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const plans = [
    {
      name: "Free",
      price: "£0",
      period: "forever",
      features: [
        "3 Decision Cases per month",
        "AI-powered analysis",
        "Risk simulations",
        "Basic insights",
      ],
      current: userRole === "free",
      canUpgrade: false,
    },
    {
      name: "Pro",
      price: "£10",
      period: "per month",
      features: [
        "Unlimited Decision Cases",
        "AI-powered analysis",
        "Advanced risk simulations",
        "Comprehensive insights",
        "Team collaboration",
        "Priority support",
      ],
      current: userRole === "pro",
      canUpgrade: userRole === "free",
      plan: "pro" as const,
    },
    {
      name: "Lifetime",
      price: "£50",
      period: "one-time",
      features: [
        "Unlimited Decision Cases forever",
        "AI-powered analysis",
        "Advanced risk simulations",
        "Comprehensive insights",
        "Team collaboration",
        "Lifetime updates",
        "Premium support",
      ],
      badge: "Best Value",
      current: userRole === "premium",
      canUpgrade: userRole !== "premium",
      plan: "premium" as const,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">Pricing Plans</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Choose Your Plan</h2>
          <p className="text-xl text-muted-foreground">
            Unlock unlimited strategic decision-making power
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative ${
                plan.badge ? "border-accent shadow-elevated" : ""
              } ${plan.current ? "border-primary" : ""}`}
            >
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="bg-accent text-white px-4 py-1 rounded-full text-sm font-semibold">
                    {plan.badge}
                  </div>
                </div>
              )}
              {plan.current && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="bg-primary text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    Current Plan
                  </div>
                </div>
              )}
              <CardHeader className="text-center pt-8">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground ml-2">{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                {plan.canUpgrade && plan.plan && (
                  <Button
                    className="w-full"
                    onClick={() => handleUpgrade(plan.plan!)}
                    disabled={loading === plan.plan}
                  >
                    {loading === plan.plan ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      `Upgrade to ${plan.name}`
                    )}
                  </Button>
                )}
                {plan.current && (
                  <Button className="w-full" variant="outline" disabled>
                    Current Plan
                  </Button>
                )}
                {!plan.canUpgrade && !plan.current && (
                  <Button className="w-full" variant="outline" disabled>
                    {userRole === "premium" ? "Already Premium" : "Not Available"}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-muted-foreground">
            All plans include secure data storage and regular updates
          </p>
        </div>
      </main>
    </div>
  );
};

export default Pricing;
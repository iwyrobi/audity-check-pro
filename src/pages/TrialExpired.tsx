import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldX, LogOut, CreditCard } from "lucide-react";
import { useCheckout } from "@/hooks/useCheckout";
import { useState } from "react";

const plans = [
  { tier: "starter", name: "Starter", priceUSD: "$25/mo", desc: "Up to 5 users" },
  { tier: "professional", name: "Professional", priceUSD: "$59/mo", desc: "Up to 25 users" },
  { tier: "enterprise", name: "Business", priceUSD: "Custom", desc: "Unlimited" },
];

export default function TrialExpired() {
  const { signOut } = useAuth();
  const { checkout, loading } = useCheckout({
    onSuccess: () => window.location.reload(),
  });
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handleSubscribe = (tier: string) => {
    if (tier === "enterprise") {
      window.location.href = "mailto:sales@opsecta.com?subject=Enterprise Subscription Inquiry";
      return;
    }
    setSelectedPlan(tier);
    checkout(tier, "monthly");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg text-center">
        <CardHeader className="pb-4">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <ShieldX className="w-8 h-8 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-2xl">Your trial has expired</CardTitle>
          <CardDescription className="text-base mt-2">
            Your 30-day free trial has ended. Subscribe to a plan to continue
            using Opsecta and access all your data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className="p-4 rounded-xl border border-border bg-muted/30 flex flex-col justify-between"
              >
                <div>
                  <p className="font-semibold text-foreground">{plan.name}</p>
                  <p className="text-lg font-bold text-primary mt-1">{plan.priceUSD}</p>
                  <p className="text-xs text-muted-foreground mt-1">{plan.desc}</p>
                </div>
                <Button
                  size="sm"
                  className="w-full mt-3"
                  variant={plan.tier === "enterprise" ? "outline" : "default"}
                  disabled={loading && selectedPlan === plan.tier}
                  onClick={() => handleSubscribe(plan.tier)}
                >
                  <CreditCard className="w-3 h-3 mr-1" />
                  {plan.tier === "enterprise"
                    ? "Contact Sales"
                    : loading && selectedPlan === plan.tier
                      ? "Processing..."
                      : "Subscribe Now"}
                </Button>
              </div>
            ))}
          </div>

          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={signOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
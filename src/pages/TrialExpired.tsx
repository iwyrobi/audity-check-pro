import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldX, LogOut, Mail, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function TrialExpired() {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();

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
            {[
              { name: "Starter", price: "$25/mo", desc: "Up to 5 users" },
              { name: "Professional", price: "$59/mo", desc: "Up to 25 users" },
              { name: "Business", price: "Custom", desc: "Unlimited" },
            ].map((plan) => (
              <div
                key={plan.name}
                className="p-4 rounded-xl border border-border bg-muted/30"
              >
                <p className="font-semibold text-foreground">{plan.name}</p>
                <p className="text-lg font-bold text-primary mt-1">{plan.price}</p>
                <p className="text-xs text-muted-foreground mt-1">{plan.desc}</p>
              </div>
            ))}
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={() =>
              (window.location.href =
                "mailto:sales@opsecta.com?subject=Subscription Inquiry")
            }
          >
            <Mail className="w-4 h-4 mr-2" />
            Contact Sales to Subscribe
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate("/")}
          >
            View Pricing
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>

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

import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle2, Clock, XCircle, ArrowLeft, LayoutDashboard, Settings, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type PaymentStatus = "finish" | "unfinish" | "error";

const statusConfig: Record<PaymentStatus, {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  bgColor: string;
}> = {
  finish: {
    icon: <CheckCircle2 className="w-16 h-16" />,
    title: "Payment Successful!",
    description: "Your subscription has been activated. Thank you for choosing Opsecta!",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  unfinish: {
    icon: <Clock className="w-16 h-16" />,
    title: "Payment Pending",
    description: "Your payment is being processed. We'll update your subscription once it's confirmed. You can safely close this page.",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  error: {
    icon: <XCircle className="w-16 h-16" />,
    title: "Payment Failed",
    description: "Something went wrong with your payment. Please try again or contact support if the issue persists.",
    color: "text-destructive",
    bgColor: "bg-destructive/10",
  },
};

export default function PaymentResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const statusParam = searchParams.get("status") as PaymentStatus | null;
  const orderId = searchParams.get("order_id");
  const [countdown, setCountdown] = useState(10);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<string | null>(null);

  const status = statusParam && statusConfig[statusParam] ? statusParam : "error";
  const config = statusConfig[status];

  // Verify payment with backend on successful/pending redirect
  useEffect(() => {
    if ((status === "finish" || status === "unfinish") && orderId) {
      setVerifying(true);
      supabase.functions
        .invoke("verify-payment", {
          body: { order_id: orderId },
        })
        .then(({ data, error }) => {
          if (error) {
            console.error("Payment verification error:", error);
            setVerificationResult("verification_error");
          } else {
            console.log("Payment verified:", data);
            setVerificationResult(data?.status || "unknown");
          }
        })
        .finally(() => setVerifying(false));
    }
  }, [status, orderId]);

  // Auto-redirect to dashboard after countdown for successful payments
  useEffect(() => {
    if (status === "finish" && !verifying) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            navigate("/dashboard");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [status, navigate, verifying]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img 
            src="/opsecta-logo.png" 
            alt="Opsecta" 
            className="h-10 cursor-pointer"
            onClick={() => navigate("/")}
          />
        </div>

        <Card className="border-border/50 shadow-xl">
          <CardContent className="pt-10 pb-8 px-8 text-center space-y-6">
            {/* Status Icon */}
            <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${config.bgColor} ${config.color} mx-auto`}>
              {config.icon}
            </div>

            {/* Title & Description */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">{config.title}</h1>
              <p className="text-muted-foreground leading-relaxed">{config.description}</p>
            </div>

            {/* Verification status */}
            {verifying && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying payment and activating subscription...</span>
              </div>
            )}

            {verificationResult === "active" && (
              <div className="bg-emerald-500/10 text-emerald-600 rounded-lg px-4 py-2 text-sm font-medium">
                ✓ Subscription activated successfully
              </div>
            )}

            {verificationResult === "pending" && (
              <div className="bg-amber-500/10 text-amber-600 rounded-lg px-4 py-2 text-sm font-medium">
                Payment is being processed — your subscription will activate shortly
              </div>
            )}

            {/* Order ID */}
            {orderId && (
              <div className="bg-muted/50 rounded-lg px-4 py-3">
                <p className="text-xs text-muted-foreground">Order ID</p>
                <p className="text-sm font-mono text-foreground">{orderId}</p>
              </div>
            )}

            {/* Auto-redirect notice */}
            {status === "finish" && !verifying && countdown > 0 && (
              <p className="text-sm text-muted-foreground">
                Redirecting to dashboard in {countdown} seconds...
              </p>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {status === "finish" ? (
                <>
                  <Button 
                    className="flex-1" 
                    onClick={() => navigate("/dashboard")}
                  >
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    Go to Dashboard
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => navigate("/settings?tab=subscription")}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    View Subscription
                  </Button>
                </>
              ) : status === "unfinish" ? (
                <>
                  <Button 
                    className="flex-1"
                    onClick={() => navigate("/dashboard")}
                  >
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    Go to Dashboard
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => navigate("/settings?tab=subscription")}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Check Status
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    className="flex-1"
                    onClick={() => navigate("/settings?tab=subscription")}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => navigate("/dashboard")}
                  >
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    Go to Dashboard
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Need help? Contact us at{" "}
          <a href="mailto:support@opsecta.com" className="text-primary hover:underline">
            support@opsecta.com
          </a>
        </p>
      </div>
    </div>
  );
}

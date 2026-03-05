import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle2, Clock, XCircle, ArrowLeft, LayoutDashboard, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";

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

  const status = statusParam && statusConfig[statusParam] ? statusParam : "error";
  const config = statusConfig[status];

  // Auto-redirect to dashboard after countdown for successful payments
  useEffect(() => {
    if (status === "finish") {
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
  }, [status, navigate]);

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

            {/* Order ID */}
            {orderId && (
              <div className="bg-muted/50 rounded-lg px-4 py-3">
                <p className="text-xs text-muted-foreground">Order ID</p>
                <p className="text-sm font-mono text-foreground">{orderId}</p>
              </div>
            )}

            {/* Auto-redirect notice */}
            {status === "finish" && countdown > 0 && (
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
                    onClick={() => navigate("/settings")}
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
                    onClick={() => navigate("/settings")}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Check Status
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    className="flex-1"
                    onClick={() => navigate("/settings")}
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

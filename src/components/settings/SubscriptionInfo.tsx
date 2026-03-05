import { useState } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { useCheckout } from "@/hooks/useCheckout";
import { usePayments, Payment } from "@/hooks/usePayments";
import { useAuth } from "@/contexts/AuthContext";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Users, 
  Building2, 
  HardDrive, 
  Video, 
  Wrench, 
  BarChart3, 
  Shield,
  Check,
  X,
  Loader2,
  CreditCard,
  ArrowUpRight,
  Zap,
  Mail,
  Calendar,
  Receipt,
  Download,
  Clock
} from "lucide-react";
import { format } from "date-fns";

const EXCHANGE_RATE = 16000;
type Currency = "IDR" | "USD";

const formatPrice = (amount: number, currency: Currency): string => {
  if (currency === "IDR") {
    return `Rp ${amount.toLocaleString("id-ID")}`;
  }
  return `$${amount.toLocaleString("en-US")}`;
};

const formatPaymentAmount = (amount: number, currency: string): string => {
  if (currency === "IDR") {
    return `Rp ${amount.toLocaleString("id-ID")}`;
  }
  return `$${amount.toLocaleString("en-US")}`;
};

const plans = [
  {
    name: "Starter",
    tier: "starter",
    priceMonthlyUSD: 25,
    priceYearlyUSD: Math.round(25 * 12 * 0.85),
    priceMonthlyIDR: 400000,
    priceYearlyIDR: Math.round(400000 * 12 * 0.85),
    description: "Perfect for small teams getting started.",
    features: ["Up to 5 users", "Up to 3 departments", "10 GB storage", "Work Orders"],
  },
  {
    name: "Professional",
    tier: "professional",
    priceMonthlyUSD: 59,
    priceYearlyUSD: Math.round(59 * 12 * 0.85),
    priceMonthlyIDR: 950000,
    priceYearlyIDR: Math.round(950000 * 12 * 0.85),
    description: "For growing teams that need analytics.",
    features: ["Up to 25 users", "Up to 15 departments", "100 GB storage", "Work Orders", "Analytics", "Video Uploads"],
  },
  {
    name: "Business",
    tier: "enterprise",
    priceMonthlyUSD: null,
    priceYearlyUSD: null,
    priceMonthlyIDR: null,
    priceYearlyIDR: null,
    description: "Custom needs and compliance.",
    features: ["Unlimited users", "Unlimited departments", "500 GB storage", "All features"],
  },
];

const tierOrder = ["starter", "professional", "enterprise"];

const tierNames: Record<string, string> = {
  starter: "Starter",
  professional: "Professional",
  enterprise: "Business",
};

function getPaymentStatusBadge(status: string) {
  switch (status) {
    case "active":
    case "settlement":
      return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Paid</Badge>;
    case "pending":
      return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Pending</Badge>;
    case "cancelled":
    case "expire":
      return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Cancelled</Badge>;
    case "refunded":
      return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">Refunded</Badge>;
    default:
      return <Badge variant="outline" className="capitalize">{status}</Badge>;
  }
}

export function SubscriptionInfo() {
  const { subscription, loading, storageUsagePercent, formatBytes } = useSubscription();
  const { checkout, loading: checkoutLoading } = useCheckout();
  const { payments, loading: paymentsLoading } = usePayments();
  const { isSuperAdmin } = useAuth();
  const [isYearly, setIsYearly] = useState(false);
  const [currency, setCurrency] = useState<Currency>("IDR");

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        No subscription information available. Contact your administrator.
      </div>
    );
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "enterprise":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "professional":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default:
        return "bg-green-500/10 text-green-500 border-green-500/20";
    }
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) return <Badge variant="outline" className="text-muted-foreground">No subscription</Badge>;
    switch (status) {
      case "active":
      case "settlement":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Active</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Pending</Badge>;
      case "trialing":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Trial</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground capitalize">{status}</Badge>;
    }
  };

  const currentTierIndex = tierOrder.indexOf(subscription.tier);

  const featuresList = [
    { name: "Work Orders", enabled: subscription.can_use_work_orders, icon: Wrench },
    { name: "Analytics", enabled: subscription.can_use_analytics, icon: BarChart3 },
    { name: "Video Uploads", enabled: subscription.can_upload_videos, icon: Video },
    { name: "Advanced Permissions", enabled: subscription.can_use_advanced_permissions, icon: Shield },
  ];

  const handleSubscribe = (planTier: string) => {
    const billingCycle = isYearly ? "yearly" : "monthly";
    checkout(planTier, billingCycle);
  };

  const isSubscriptionExpiringSoon = subscription.subscription_expires_at 
    ? new Date(subscription.subscription_expires_at).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000
    : false;

  return (
    <div className="space-y-6">
      {/* Current Plan Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Current Plan
              </CardTitle>
              <CardDescription>Your organization's subscription details</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(subscription.stripe_subscription_status)}
              <Badge className={getTierColor(subscription.tier)}>
                {subscription.plan_name}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Subscription Expiry Info */}
          {subscription.subscription_expires_at && subscription.stripe_subscription_status === "active" && (
            <div className={`flex items-center gap-3 p-3 rounded-lg border ${
              isSubscriptionExpiringSoon 
                ? "bg-amber-500/10 border-amber-500/20 text-amber-700" 
                : "bg-muted/50 border-border"
            }`}>
              <Calendar className={`w-4 h-4 ${isSubscriptionExpiringSoon ? "text-amber-500" : "text-primary"}`} />
              <div className="text-sm">
                <span className="font-medium">Subscription {isSubscriptionExpiringSoon ? "expires soon" : "active until"}: </span>
                <span>{format(new Date(subscription.subscription_expires_at), "MMMM d, yyyy")}</span>
              </div>
            </div>
          )}

          {/* Usage Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Users className="w-4 h-4 text-primary" />
                <span>Users</span>
              </div>
              <div className="text-2xl font-bold">
                {subscription.max_users === 999999 ? "Unlimited" : `Up to ${subscription.max_users}`}
              </div>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Building2 className="w-4 h-4 text-primary" />
                <span>Departments</span>
              </div>
              <div className="text-2xl font-bold">
                {subscription.max_departments === null ? "Unlimited" : `Up to ${subscription.max_departments}`}
              </div>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <HardDrive className="w-4 h-4 text-primary" />
                <span>Storage</span>
              </div>
              <div className="text-2xl font-bold">
                {formatBytes(subscription.storage_limit_bytes)}
              </div>
            </div>
          </div>

          {/* Storage Usage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Storage Used</span>
              <span className="font-medium">
                {formatBytes(subscription.storage_used_bytes)} / {formatBytes(subscription.storage_limit_bytes)}
              </span>
            </div>
            <Progress value={storageUsagePercent()} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {storageUsagePercent()}% of your storage quota used
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle>Features</CardTitle>
          <CardDescription>What's included in your plan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {featuresList.map((feature) => (
              <div 
                key={feature.name}
                className={`p-4 rounded-lg border ${
                  feature.enabled 
                    ? "bg-primary/5 border-primary/20" 
                    : "bg-muted/30 border-border opacity-50"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <feature.icon className={`w-4 h-4 ${feature.enabled ? "text-primary" : "text-muted-foreground"}`} />
                  {feature.enabled ? (
                    <Check className="w-3 h-3 text-green-500" />
                  ) : (
                    <X className="w-3 h-3 text-muted-foreground" />
                  )}
                </div>
                <p className={`text-sm font-medium ${feature.enabled ? "" : "text-muted-foreground"}`}>
                  {feature.name}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payment History & Invoices */}
      {isSuperAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Payment History & Invoices
            </CardTitle>
            <CardDescription>View your payment transactions and download invoices</CardDescription>
          </CardHeader>
          <CardContent>
            {paymentsLoading ? (
              <div className="flex items-center justify-center p-6">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No payment history yet</p>
                <p className="text-sm mt-1">Your payment transactions will appear here after your first subscription.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Billing</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Period</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-mono text-xs">
                          {payment.invoice_number || payment.order_id.slice(0, 20)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {payment.paid_at 
                            ? format(new Date(payment.paid_at), "MMM d, yyyy")
                            : format(new Date(payment.created_at), "MMM d, yyyy")
                          }
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {tierNames[payment.plan_tier] || payment.plan_tier}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm capitalize">
                          {payment.billing_cycle}
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          {formatPaymentAmount(payment.amount, payment.currency)}
                        </TableCell>
                        <TableCell>
                          {getPaymentStatusBadge(payment.status)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {payment.subscription_start && payment.subscription_end ? (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(payment.subscription_start), "MMM d")} — {format(new Date(payment.subscription_end), "MMM d, yyyy")}
                            </div>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upgrade / Subscribe Section */}
      {isSuperAdmin && subscription.tier !== "enterprise" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  {subscription.stripe_subscription_status === "active" ? "Upgrade Plan" : "Subscribe Now"}
                </CardTitle>
                <CardDescription>
                  {subscription.stripe_subscription_status === "active"
                    ? "Unlock more features by upgrading your plan" 
                    : "Choose a plan to continue using Opsecta"}
                </CardDescription>
              </div>
              <div className="flex items-center gap-4">
                {/* Currency Toggle */}
                <div className="flex items-center gap-2 text-sm">
                  <button
                    onClick={() => setCurrency("IDR")}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      currency === "IDR" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    IDR
                  </button>
                  <button
                    onClick={() => setCurrency("USD")}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      currency === "USD" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    USD
                  </button>
                </div>
                {/* Billing Toggle */}
                <div className="flex items-center gap-2 text-sm">
                  <span className={!isYearly ? "font-medium" : "text-muted-foreground"}>Monthly</span>
                  <Switch checked={isYearly} onCheckedChange={setIsYearly} />
                  <span className={isYearly ? "font-medium" : "text-muted-foreground"}>
                    Yearly
                    <Badge variant="outline" className="ml-1 text-xs text-green-600 border-green-500/30">
                      Save 15%
                    </Badge>
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.map((plan) => {
                const planTierIndex = tierOrder.indexOf(plan.tier);
                const isCurrent = plan.tier === subscription.tier;
                const isUpgrade = planTierIndex > currentTierIndex;

                const price = currency === "IDR"
                  ? (isYearly ? plan.priceYearlyIDR : plan.priceMonthlyIDR)
                  : (isYearly ? plan.priceYearlyUSD : plan.priceMonthlyUSD);

                return (
                  <div
                    key={plan.tier}
                    className={`relative p-5 rounded-xl border-2 transition-all ${
                      isCurrent 
                        ? "border-primary bg-primary/5" 
                        : isUpgrade 
                          ? "border-border hover:border-primary/50 hover:shadow-md" 
                          : "border-border opacity-60"
                    }`}
                  >
                    {isCurrent && (
                      <Badge className="absolute -top-2.5 left-4 bg-primary text-primary-foreground text-xs">
                        Current Plan
                      </Badge>
                    )}
                    <h3 className="font-semibold text-lg mt-1">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                    
                    <div className="mt-4">
                      {price !== null ? (
                        <div>
                          <span className="text-2xl font-bold">{formatPrice(price, currency)}</span>
                          <span className="text-sm text-muted-foreground">/{isYearly ? "year" : "month"}</span>
                        </div>
                      ) : (
                        <span className="text-2xl font-bold">Custom</span>
                      )}
                    </div>

                    <ul className="mt-4 space-y-2">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm">
                          <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-5">
                      {isCurrent && (!subscription.stripe_subscription_status || subscription.stripe_subscription_status !== "active") ? (
                        <Button 
                          className="w-full" 
                          onClick={() => handleSubscribe(plan.tier)}
                          disabled={checkoutLoading}
                        >
                          {checkoutLoading ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <CreditCard className="w-4 h-4 mr-2" />
                          )}
                          Subscribe Now
                        </Button>
                      ) : isCurrent ? (
                        <Button variant="outline" className="w-full" disabled>
                          Current Plan
                        </Button>
                      ) : plan.tier === "enterprise" ? (
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => window.open("mailto:sales@opsecta.com?subject=Enterprise Plan Inquiry", "_blank")}
                        >
                          <Mail className="w-4 h-4 mr-2" />
                          Contact Sales
                        </Button>
                      ) : isUpgrade ? (
                        <Button 
                          className="w-full" 
                          onClick={() => handleSubscribe(plan.tier)}
                          disabled={checkoutLoading}
                        >
                          {checkoutLoading ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4 mr-2" />
                          )}
                          {subscription.stripe_subscription_status === "active" ? "Upgrade Now" : "Subscribe Now"}
                        </Button>
                      ) : (
                        <Button variant="ghost" className="w-full" disabled>
                          Downgrade
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Non-admin hint */}
      {!isSuperAdmin && subscription.tier !== "enterprise" && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Need more features?</h3>
                <p className="text-sm text-muted-foreground">
                  Contact your administrator to upgrade your plan.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

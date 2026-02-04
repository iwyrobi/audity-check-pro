import { useSubscription } from "@/hooks/useSubscription";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Loader2
} from "lucide-react";

export function SubscriptionInfo() {
  const { subscription, loading, storageUsagePercent, formatBytes } = useSubscription();

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

  const features = [
    { 
      name: "Work Orders", 
      enabled: subscription.can_use_work_orders, 
      icon: Wrench 
    },
    { 
      name: "Analytics", 
      enabled: subscription.can_use_analytics, 
      icon: BarChart3 
    },
    { 
      name: "Video Uploads", 
      enabled: subscription.can_upload_videos, 
      icon: Video 
    },
    { 
      name: "Advanced Permissions", 
      enabled: subscription.can_use_advanced_permissions, 
      icon: Shield 
    },
  ];

  return (
    <div className="space-y-6">
      {/* Plan Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>Your organization's subscription details</CardDescription>
            </div>
            <Badge className={getTierColor(subscription.tier)}>
              {subscription.plan_name}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Usage Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Users */}
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Users className="w-4 h-4 text-primary" />
                <span>Users</span>
              </div>
              <div className="text-2xl font-bold">
                {subscription.max_users === 999999 ? "Unlimited" : `Up to ${subscription.max_users}`}
              </div>
            </div>

            {/* Departments */}
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Building2 className="w-4 h-4 text-primary" />
                <span>Departments</span>
              </div>
              <div className="text-2xl font-bold">
                {subscription.max_departments === null ? "Unlimited" : `Up to ${subscription.max_departments}`}
              </div>
            </div>

            {/* Storage */}
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
            {features.map((feature) => (
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

      {/* Upgrade CTA for non-enterprise */}
      {subscription.tier !== "enterprise" && (
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

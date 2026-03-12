import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { 
  User, 
  ClipboardCheck, 
  Wrench, 
  TrendingUp, 
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  Save,
  KeyRound,
  Crown,
  Zap,
  HardDrive,
  Users,
  Building2,
  Video,
  BarChart3,
  Shield,
  ArrowUpRight,
  Bell,
  BellOff,
  BellRing
} from "lucide-react";
import { requestPushPermission, isPushSupported, getPushPermissionStatus } from "@/lib/pushNotifications";

interface UserStats {
  totalInspections: number;
  completedInspections: number;
  avgScore: number;
  totalWorkOrders: number;
  openWorkOrders: number;
  completedWorkOrders: number;
  overdueWorkOrders: number;
}

export default function Profile() {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "profile";
  const { user, profile, department, roles, isAdmin, isDepartmentHead, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const { subscription, loading: subscriptionLoading, storageUsagePercent, formatBytes, hasFeature } = useSubscription();
  
  const [stats, setStats] = useState<UserStats>({
    totalInspections: 0,
    completedInspections: 0,
    avgScore: 0,
    totalWorkOrders: 0,
    openWorkOrders: 0,
    completedWorkOrders: 0,
    overdueWorkOrders: 0,
  });
  const [loading, setLoading] = useState(true);
  
  // Profile form
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [saving, setSaving] = useState(false);
  
  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [pushStatus, setPushStatus] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    setPushStatus(getPushPermissionStatus());
  }, []);

  useEffect(() => {
    if (profile?.full_name) {
      setFullName(profile.full_name);
    }
  }, [profile]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      
      try {
        // Fetch inspection stats - inspections created by user
        const { data: inspections } = await supabase
          .from("inspections")
          .select("id, status, percentage")
          .eq("created_by", user.id);

        const totalInspections = inspections?.length || 0;
        const completedInspections = inspections?.filter(i => i.status === "completed").length || 0;
        const avgScore = inspections?.length 
          ? inspections.reduce((sum, i) => sum + (i.percentage || 0), 0) / inspections.length 
          : 0;

        // Fetch work order stats - work orders created by user
        const { data: workOrders } = await supabase
          .from("work_orders")
          .select("id, status, due_date")
          .eq("created_by", user.id);

        const totalWorkOrders = workOrders?.length || 0;
        const openWorkOrders = workOrders?.filter(w => w.status === "open").length || 0;
        const completedWorkOrders = workOrders?.filter(w => w.status === "completed").length || 0;
        const overdueWorkOrders = workOrders?.filter(w => 
          w.status !== "completed" && w.due_date && new Date(w.due_date) < new Date()
        ).length || 0;

        setStats({
          totalInspections,
          completedInspections,
          avgScore: Math.round(avgScore),
          totalWorkOrders,
          openWorkOrders,
          completedWorkOrders,
          overdueWorkOrders,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "New password and confirmation must match.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: "Password changed",
        description: "Your password has been changed successfully.",
      });
      
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to change password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const getRoleBadge = () => {
    if (isSuperAdmin) return <Badge variant="destructive">Super Admin</Badge>;
    if (isAdmin) return <Badge variant="destructive">Admin</Badge>;
    if (isDepartmentHead) return <Badge variant="default">Dept Head</Badge>;
    return <Badge variant="secondary">User</Badge>;
  };

  return (
    <AppLayout title="My Profile">
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Profile Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center">
                <User className="w-10 h-10 text-primary-foreground" />
              </div>
              <div className="text-center sm:text-left flex-1">
                <h2 className="text-2xl font-bold">{profile?.full_name || "User"}</h2>
                <p className="text-muted-foreground">{user?.email}</p>
                <div className="flex flex-wrap gap-2 mt-2 justify-center sm:justify-start">
                  {getRoleBadge()}
                  {department && <Badge variant="outline">{department.name}</Badge>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Status Card */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">Subscription Plan</CardTitle>
              </div>
              {subscription && (
                <Badge 
                  variant={subscription.tier === "enterprise" ? "default" : subscription.tier === "professional" ? "secondary" : "outline"}
                  className="capitalize"
                >
                  {subscription.plan_name}
                </Badge>
              )}
            </div>
            <CardDescription>Your current plan and usage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {subscriptionLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : subscription ? (
              <>
                {/* Storage Usage */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-muted-foreground" />
                      <span>Storage</span>
                    </div>
                    <span className="text-muted-foreground">
                      {formatBytes(subscription.storage_used_bytes)} / {formatBytes(subscription.storage_limit_bytes)}
                    </span>
                  </div>
                  <Progress value={storageUsagePercent()} className="h-2" />
                </div>

                {/* Plan Limits */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                    <Users className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{subscription.max_users}</p>
                      <p className="text-xs text-muted-foreground">Max Users</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                    <Building2 className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">
                        {subscription.max_departments === null ? "Unlimited" : subscription.max_departments}
                      </p>
                      <p className="text-xs text-muted-foreground">Max Depts</p>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Features</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className={`flex items-center gap-2 text-sm ${hasFeature("work_orders") ? "text-foreground" : "text-muted-foreground"}`}>
                      {hasFeature("work_orders") ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                      <span>Work Orders</span>
                    </div>
                    <div className={`flex items-center gap-2 text-sm ${hasFeature("analytics") ? "text-foreground" : "text-muted-foreground"}`}>
                      {hasFeature("analytics") ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                      <span>Analytics</span>
                    </div>
                    <div className={`flex items-center gap-2 text-sm ${hasFeature("videos") ? "text-foreground" : "text-muted-foreground"}`}>
                      {hasFeature("videos") ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                      <span>Video Uploads</span>
                    </div>
                    <div className={`flex items-center gap-2 text-sm ${hasFeature("advanced_permissions") ? "text-foreground" : "text-muted-foreground"}`}>
                      {hasFeature("advanced_permissions") ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                      <span>Advanced Perms</span>
                    </div>
                  </div>
                </div>

                {/* Upgrade CTA */}
                {subscription.tier !== "enterprise" && (
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Need more?</p>
                        <p className="text-xs text-muted-foreground">
                          Upgrade to unlock more features
                        </p>
                      </div>
                      <Button 
                        size="sm"
                        onClick={() => window.location.href = "/settings"}
                        className="gap-1"
                      >
                        <Zap className="w-4 h-4" />
                        Upgrade
                        <ArrowUpRight className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <p>No subscription information available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-primary" />
                <span className="text-sm text-muted-foreground">Total Inspections</span>
              </div>
              <p className="text-2xl font-bold mt-1">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.totalInspections}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <span className="text-sm text-muted-foreground">Avg Score</span>
              </div>
              <p className="text-2xl font-bold mt-1">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : `${stats.avgScore}%`}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-blue-500" />
                <span className="text-sm text-muted-foreground">Work Orders</span>
              </div>
              <p className="text-2xl font-bold mt-1">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.totalWorkOrders}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                <span className="text-sm text-muted-foreground">Overdue</span>
              </div>
              <p className="text-2xl font-bold mt-1">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.overdueWorkOrders}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Stats */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5" />
                Inspection Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Created</span>
                <span className="font-medium">{stats.totalInspections}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-muted-foreground">Completed</span>
                </div>
                <span className="font-medium">{stats.completedInspections}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-500" />
                  <span className="text-muted-foreground">In Progress</span>
                </div>
                <span className="font-medium">{stats.totalInspections - stats.completedInspections}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground">Average Score</span>
                </div>
                <span className="font-medium">{stats.avgScore}%</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wrench className="w-5 h-5" />
                Work Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Created</span>
                <span className="font-medium">{stats.totalWorkOrders}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-500" />
                  <span className="text-muted-foreground">Open</span>
                </div>
                <span className="font-medium">{stats.openWorkOrders}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-muted-foreground">Completed</span>
                </div>
                <span className="font-medium">{stats.completedWorkOrders}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <span className="text-muted-foreground">Overdue</span>
                </div>
                <span className="font-medium">{stats.overdueWorkOrders}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Settings Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Account Settings</CardTitle>
            <CardDescription>Manage your profile and security settings</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="profile">
              <TabsList className="grid w-full grid-cols-3 max-w-lg">
                <TabsTrigger value="profile">
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </TabsTrigger>
                <TabsTrigger value="security">
                  <KeyRound className="w-4 h-4 mr-2" />
                  Security
                </TabsTrigger>
                <TabsTrigger value="notifications">
                  <Bell className="w-4 h-4 mr-2" />
                  Notifications
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="profile" className="mt-6">
                <div className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={user?.email || ""}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={department?.name || "Not assigned"}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">Contact an admin to change department</p>
                  </div>
                  
                  <Button onClick={handleUpdateProfile} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="security" className="mt-6">
                <div className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />
                  </div>
                  
                  <Button 
                    onClick={handleChangePassword} 
                    disabled={changingPassword || !newPassword || !confirmPassword}
                  >
                    {changingPassword ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Changing...
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4 mr-2" />
                        Change Password
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="notifications" className="mt-6">
                <div className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Push Notifications</h3>
                    <p className="text-xs text-muted-foreground">
                      Get notified about work orders, inspections, and defects even when the app is in the background.
                    </p>
                  </div>

                  {!isPushSupported() ? (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                      <BellOff className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Not Supported</p>
                        <p className="text-xs text-muted-foreground">
                          Push notifications are not supported in this browser. Try installing the app first.
                        </p>
                      </div>
                    </div>
                  ) : pushStatus === "granted" ? (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <BellRing className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="text-sm font-medium">Enabled</p>
                        <p className="text-xs text-muted-foreground">
                          You will receive push notifications for important events.
                        </p>
                      </div>
                    </div>
                  ) : pushStatus === "denied" ? (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                      <BellOff className="w-5 h-5 text-destructive" />
                      <div>
                        <p className="text-sm font-medium">Blocked</p>
                        <p className="text-xs text-muted-foreground">
                          Push notifications are blocked. Please enable them in your browser settings.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <Button
                      onClick={async () => {
                        const granted = await requestPushPermission();
                        setPushStatus(granted ? "granted" : "denied");
                        toast({
                          title: granted ? "Notifications enabled" : "Notifications blocked",
                          description: granted
                            ? "You will now receive push notifications."
                            : "Please enable notifications in your browser settings.",
                          variant: granted ? "default" : "destructive",
                        });
                      }}
                      className="gap-2"
                    >
                      <Bell className="w-4 h-4" />
                      Enable Push Notifications
                    </Button>
                  )}

                  <div className="pt-4 border-t space-y-2">
                    <h3 className="text-sm font-medium">In-App Notifications</h3>
                    <p className="text-xs text-muted-foreground">
                      You'll always receive in-app notifications via the bell icon in the header.
                      These include:
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                      <li>Work order assignments and new work orders</li>
                      <li>Inspection completions in your department</li>
                      <li>Defect reports from inspections</li>
                    </ul>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

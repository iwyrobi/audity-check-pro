import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
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
  KeyRound
} from "lucide-react";

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
  const { user, profile, department, roles, isAdmin, isDepartmentHead, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  
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
              <TabsList className="grid w-full grid-cols-2 max-w-md">
                <TabsTrigger value="profile">
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </TabsTrigger>
                <TabsTrigger value="security">
                  <KeyRound className="w-4 h-4 mr-2" />
                  Security
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
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

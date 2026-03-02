import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useDepartments } from "@/hooks/useDepartments";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Pencil, Search, Loader2, Building2, Plus, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserWithProfile {
  id: string;
  email: string;
  full_name: string | null;
  department_id: string | null;
  department_name: string | null;
  roles: string[];
}

export function UserManagement() {
  const { isSuperAdmin, profile } = useAuth();
  const { departments } = useDepartments();
  const { subscription, canAddUser, formatBytes, storageUsagePercent } = useSubscription();
  const { toast } = useToast();

  const [users, setUsers] = useState<UserWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithProfile | null>(null);
  const [formData, setFormData] = useState({ department_id: "", role: "", newPassword: "" });
  const [createFormData, setCreateFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    department_id: "",
    role: "user",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch profiles with department info - filtered by organization
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select(`
          id,
          user_id,
          full_name,
          department_id,
          departments:department_id(name)
        `)
        .eq("organization_id", profile?.organization_id ?? "");

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Combine data
      const userMap = new Map<string, UserWithProfile>();

      profiles?.forEach((profile: any) => {
        const userRoles = roles?.filter((r) => r.user_id === profile.user_id).map((r) => r.role) || [];
        userMap.set(profile.user_id, {
          id: profile.user_id,
          email: "", // We don't have access to auth.users email directly
          full_name: profile.full_name,
          department_id: profile.department_id,
          department_name: profile.departments?.name || null,
          roles: userRoles,
        });
      });

      setUsers(Array.from(userMap.values()));
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchUsers();
    }
  }, [isSuperAdmin]);

  const handleOpenEdit = async (user: UserWithProfile) => {
    setEditingUser(user);
    const primaryRole = user.roles.includes("super_admin") 
      ? "super_admin" 
      : user.roles.includes("admin") 
        ? "admin" 
        : user.roles.includes("department_head") 
          ? "department_head" 
          : "user";
    setFormData({
      department_id: user.department_id || "",
      role: primaryRole,
      newPassword: "",
    });
    setShowEditPassword(false);
    setIsEditModalOpen(true);

    // Fetch email for the user
    try {
      const response = await supabase.functions.invoke("get-user-email", {
        body: { user_id: user.id },
      });
      if (response.data?.email) {
        setEditingUser((prev) => prev ? { ...prev, email: response.data.email } : null);
      }
    } catch (error) {
      console.error("Failed to fetch user email:", error);
    }
  };

  const handleOpenCreate = async () => {
    // Check user limit
    const canAdd = await canAddUser();
    if (!canAdd) {
      toast({
        title: "User limit reached",
        description: `Your ${subscription?.plan_name || "current"} plan allows up to ${subscription?.max_users || 0} users. Please upgrade to add more users.`,
        variant: "destructive",
      });
      return;
    }

    setCreateFormData({
      email: "",
      password: "",
      full_name: "",
      department_id: "",
      role: "user",
    });
    setShowPassword(false);
    setIsCreateModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingUser) return;

    setSaving(true);
    try {
      // Update department
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ department_id: formData.department_id || null })
        .eq("user_id", editingUser.id);

      if (profileError) throw profileError;

      // Update role atomically using security definer function
      const { error: roleError } = await supabase.rpc("set_user_role", {
        _target_user_id: editingUser.id,
        _new_role: formData.role as "super_admin" | "admin" | "department_head" | "user",
      });

      if (roleError) throw roleError;

      // Update password if provided
      if (formData.newPassword && formData.newPassword.length >= 6) {
        const response = await supabase.functions.invoke("update-user-password", {
          body: {
            user_id: editingUser.id,
            new_password: formData.newPassword,
          },
        });

        if (response.error) {
          throw new Error(response.error.message || "Failed to update password");
        }

        if (response.data?.error) {
          throw new Error(response.data.error);
        }
      }

      toast({ title: "User updated successfully" });
      await fetchUsers();
      setIsEditModalOpen(false);
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async () => {
    if (!createFormData.email || !createFormData.password) {
      toast({
        title: "Error",
        description: "Email and password are required",
        variant: "destructive",
      });
      return;
    }

    if (createFormData.password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const response = await supabase.functions.invoke("create-user", {
        body: {
          email: createFormData.email,
          password: createFormData.password,
          full_name: createFormData.full_name,
          department_id: createFormData.department_id || null,
          role: createFormData.role,
          organization_id: profile?.organization_id || null,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to create user");
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast({ title: "User created successfully" });
      await fetchUsers();
      setIsCreateModalOpen(false);
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(searchLower) ||
      user.department_name?.toLowerCase().includes(searchLower) ||
      user.roles.some((r) => r.toLowerCase().includes(searchLower))
    );
  });

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "super_admin":
        return "destructive";
      case "admin":
        return "default";
      case "department_head":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Only super administrators can manage users.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Users & Roles</h3>
        </div>
        <div className="flex items-center gap-3 flex-1 justify-end">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={handleOpenCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {filteredUsers.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {users.length === 0 ? "No users found." : "No users match your search."}
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.full_name || "—"}
                  </TableCell>
                  <TableCell>
                    {user.department_name ? (
                      <span className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                        {user.department_name}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => (
                        <Badge key={role} variant={getRoleBadgeVariant(role)}>
                          {role.replace("_", " ")}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(user)}
                      className="h-8 w-8"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit User Dialog */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="mb-1.5 block">Name</Label>
              <Input value={editingUser?.full_name || "—"} disabled />
            </div>
            <div>
              <Label className="mb-1.5 block">Username (Email)</Label>
              <Input value={editingUser?.email || "—"} disabled className="text-muted-foreground" />
            </div>
            <div>
              <Label className="mb-1.5 block">Department</Label>
              <Select
                value={formData.department_id || "none"}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, department_id: value === "none" ? "" : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Department</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, role: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="department_head">Department Head</SelectItem>
                  <SelectItem value="admin">Admin (Department)</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block">New Password (optional)</Label>
              <div className="relative">
                <Input
                  type={showEditPassword ? "text" : "password"}
                  value={formData.newPassword}
                  onChange={(e) => setFormData((prev) => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Leave blank to keep current password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowEditPassword(!showEditPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {formData.newPassword && formData.newPassword.length > 0 && formData.newPassword.length < 6 && (
                <p className="text-xs text-destructive mt-1">Password must be at least 6 characters</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="mb-1.5 block">Full Name</Label>
              <Input
                value={createFormData.full_name}
                onChange={(e) => setCreateFormData((prev) => ({ ...prev, full_name: e.target.value }))}
                placeholder="Enter full name"
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Email</Label>
              <Input
                type="email"
                value={createFormData.email}
                onChange={(e) => setCreateFormData((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email address"
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={createFormData.password}
                  onChange={(e) => setCreateFormData((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter password (min 6 characters)"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block">Department</Label>
              <Select
                value={createFormData.department_id || "none"}
                onValueChange={(value) => setCreateFormData((prev) => ({ ...prev, department_id: value === "none" ? "" : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Department</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block">Role</Label>
              <Select
                value={createFormData.role}
                onValueChange={(value) => setCreateFormData((prev) => ({ ...prev, role: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="department_head">Department Head</SelectItem>
                  <SelectItem value="admin">Admin (Department)</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateUser} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

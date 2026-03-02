import { useState } from "react";
import { useDepartments, Department } from "@/hooks/useDepartments";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Pencil, Trash2, Building2, Loader2, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function DepartmentManagement() {
  const { departments, loading, fetchDepartments } = useDepartments();
  const { isSuperAdmin, profile } = useAuth();
  const { subscription, canAddDepartment } = useSubscription();
  const { toast } = useToast();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "", parent_id: "" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Get parent department name
  const getParentName = (parentId: string | null | undefined) => {
    if (!parentId) return null;
    const parent = departments.find(d => d.id === parentId);
    return parent?.name || null;
  };

  // Build hierarchical display name with indentation
  const getHierarchicalDepartments = () => {
    const result: { dept: Department; level: number }[] = [];
    
    const addDepartment = (dept: Department, level: number) => {
      result.push({ dept, level });
      const children = departments.filter(d => d.parent_id === dept.id);
      children.forEach(child => addDepartment(child, level + 1));
    };
    
    // Start with root departments (no parent)
    const rootDepartments = departments.filter(d => !d.parent_id);
    rootDepartments.forEach(dept => addDepartment(dept, 0));
    
    return result;
  };

  const handleOpenCreate = async () => {
    // Check department limit
    const canAdd = await canAddDepartment();
    if (!canAdd) {
      toast({
        title: "Department limit reached",
        description: `Your ${subscription?.plan_name || "current"} plan allows up to ${subscription?.max_departments || 0} departments. Please upgrade to add more.`,
        variant: "destructive",
      });
      return;
    }

    setEditingDepartment(null);
    setFormData({ name: "", description: "", parent_id: "" });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (dept: Department) => {
    setEditingDepartment(dept);
    setFormData({ 
      name: dept.name, 
      description: dept.description || "",
      parent_id: dept.parent_id || ""
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      if (editingDepartment) {
        // Prevent setting parent to self or to a descendant
        if (formData.parent_id === editingDepartment.id) {
          toast({ title: "Department cannot be its own parent", variant: "destructive" });
          setSaving(false);
          return;
        }

        const { error } = await supabase
          .from("departments")
          .update({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            parent_id: formData.parent_id || null,
          })
          .eq("id", editingDepartment.id);

        if (error) throw error;
        toast({ title: "Department updated" });
      } else {
        const { error } = await supabase.from("departments").insert({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          parent_id: formData.parent_id || null,
          organization_id: profile?.organization_id || null,
        });

        if (error) throw error;
        toast({ title: "Department created" });
      }

      await fetchDepartments();
      setIsModalOpen(false);
    } catch (error: any) {
      console.error("Error saving department:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save department",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (dept: Department) => {
    // Check if department has children
    const hasChildren = departments.some(d => d.parent_id === dept.id);
    if (hasChildren) {
      toast({
        title: "Cannot delete",
        description: "This department has sub-departments. Delete or reassign them first.",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`Are you sure you want to delete "${dept.name}"? This cannot be undone.`)) {
      return;
    }

    setDeleting(dept.id);
    try {
      const { error } = await supabase
        .from("departments")
        .delete()
        .eq("id", dept.id);

      if (error) throw error;
      toast({ title: "Department deleted" });
      await fetchDepartments();
    } catch (error: any) {
      console.error("Error deleting department:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete department. It may have linked records.",
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Only super administrators can manage departments.
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

  const hierarchicalDepartments = getHierarchicalDepartments();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Departments</h3>
        </div>
        <Button onClick={handleOpenCreate} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Department
        </Button>
      </div>

      {departments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No departments yet. Create your first department to get started.
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hierarchicalDepartments.map(({ dept, level }) => (
                <TableRow key={dept.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-1" style={{ paddingLeft: `${level * 20}px` }}>
                      {level > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                      {dept.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {getParentName(dept.parent_id) || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {dept.description || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(dept)}
                        className="h-8 w-8"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(dept)}
                        disabled={deleting === dept.id}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        {deleting === dept.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingDepartment ? "Edit Department" : "Create Department"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Security, Engineering, Operations"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Parent Department</label>
              <Select 
                value={formData.parent_id || "none"} 
                onValueChange={(value) => setFormData((prev) => ({ ...prev, parent_id: value === "none" ? "" : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None (Top-level department)" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="none">None (Top-level department)</SelectItem>
                  {departments
                    .filter(d => !editingDepartment || d.id !== editingDepartment.id)
                    .map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Select a parent to create this as a sub-department
              </p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingDepartment ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState, useEffect } from "react";
import { AlertTriangle, Wrench, MapPin, Calendar, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface Department {
  id: string;
  name: string;
  displayName?: string;
}

interface CreateWorkOrderFromDefectProps {
  open: boolean;
  onClose: () => void;
  onCancel?: () => void;
  defect?: {
    questionText: string;
    sectionTitle: string;
    checklistTitle: string;
  };
  onSave: (workOrder: any) => void;
  departments?: Department[];
  defaultDepartmentId?: string;
}

const priorities = [
  { value: "low", label: "Low", color: "text-muted-foreground" },
  { value: "medium", label: "Medium", color: "text-info" },
  { value: "high", label: "High", color: "text-warning" },
  { value: "critical", label: "Critical", color: "text-destructive" },
];

export function CreateWorkOrderFromDefect({
  open,
  onClose,
  onCancel,
  defect,
  onSave,
  departments = [],
  defaultDepartmentId,
}: CreateWorkOrderFromDefectProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");

  // Reset form when modal opens with new defect
  useEffect(() => {
    if (open && defect) {
      setTitle(`Fix: ${defect.questionText}`);
      setDescription(
        `Defect identified during inspection:\n\nChecklist: ${defect.checklistTitle}\nSection: ${defect.sectionTitle}\nIssue: ${defect.questionText}`
      );
      setSelectedDepartment(defaultDepartmentId || "");
    }
  }, [open, defect, defaultDepartmentId]);

  const handleCancel = () => {
    onCancel?.();
    onClose();
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      handleCancel();
    }
  };

  const handleSave = () => {
    if (!title.trim()) {
      toast.error("Please enter a work order title");
      return;
    }

    const workOrder = {
      id: `WO-${Date.now().toString().slice(-6)}`,
      title,
      description,
      location,
      priority,
      status: "open",
      dueDate: dueDate || "Not set",
      createdAt: new Date().toISOString(),
      linkedDefect: defect,
      departmentId: selectedDepartment || undefined,
    };

    onSave(workOrder);
    toast.success("Work order created from defect!");
    
    // Reset form
    setTitle("");
    setDescription("");
    setLocation("");
    setPriority("medium");
    setDueDate("");
    setSelectedDepartment("");
    
    onClose();
  };

  const showDepartmentSelector = departments.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            Create Work Order from Defect
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Defect Info */}
          {defect && (
            <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
              <p className="text-sm font-medium text-destructive mb-1">Linked Defect</p>
              <p className="text-sm text-foreground">{defect.questionText}</p>
              <p className="text-xs text-muted-foreground mt-1">
                From: {defect.checklistTitle} → {defect.sectionTitle}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Work Order Title *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of the issue"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of the work required..."
              rows={4}
            />
          </div>

          {showDepartmentSelector && (
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                Assign to Department
              </label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.displayName || dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                Location
              </label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Building A, Floor 2"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                Priority
              </label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      <span className={p.color}>{p.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              Due Date
            </label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Wrench className="w-4 h-4 mr-2" />
            Create Work Order
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
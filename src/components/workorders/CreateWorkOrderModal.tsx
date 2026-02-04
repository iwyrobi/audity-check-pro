import { useState, useEffect } from "react";
import { Save, Wrench, Building2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { useAuth } from "@/contexts/AuthContext";
import { MediaUploader, UploadedMedia } from "@/components/media/MediaUploader";

interface CreateWorkOrderModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    description?: string;
    location?: string;
    priority?: string;
    dueDate?: string;
    departmentId?: string;
    tempWorkOrderId?: string;
  }) => void;
  defaultValues?: {
    title?: string;
    description?: string;
    location?: string;
  };
  departments?: { id: string; name: string; displayName?: string }[];
}

const priorities = [
  { value: "critical", label: "Critical", color: "text-destructive" },
  { value: "high", label: "High", color: "text-warning" },
  { value: "medium", label: "Medium", color: "text-info" },
  { value: "low", label: "Low", color: "text-muted-foreground" },
];

export function CreateWorkOrderModal({ 
  open, 
  onClose, 
  onSave,
  defaultValues,
  departments = [],
}: CreateWorkOrderModalProps) {
  const [title, setTitle] = useState(defaultValues?.title || "");
  const [description, setDescription] = useState(defaultValues?.description || "");
  const [location, setLocation] = useState(defaultValues?.location || "");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [tempWorkOrderId] = useState(() => crypto.randomUUID());
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia[]>([]);

  const { profile, isAdmin } = useAuth();

  useEffect(() => {
    if (open && defaultValues) {
      setTitle(defaultValues.title || "");
      setDescription(defaultValues.description || "");
      setLocation(defaultValues.location || "");
    }
  }, [open, defaultValues]);

  const handleSave = () => {
    if (!title.trim()) return;

    onSave({
      title,
      description: description || undefined,
      location: location || undefined,
      priority,
      dueDate: dueDate || undefined,
      departmentId: selectedDepartment || undefined,
      tempWorkOrderId: uploadedMedia.length > 0 ? tempWorkOrderId : undefined,
    });

    // Reset form
    setTitle("");
    setDescription("");
    setLocation("");
    setPriority("medium");
    setDueDate("");
    setSelectedDepartment("");
    setUploadedMedia([]);
  };

  const handleMediaUpload = (media: UploadedMedia) => {
    setUploadedMedia((prev) => [...prev, media]);
  };

  const handleMediaDelete = (mediaId: string) => {
    setUploadedMedia((prev) => prev.filter((m) => m.id !== mediaId));
  };

  const showDepartmentSelector = departments.length > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-accent" />
            </div>
            Create Work Order
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., HVAC System Repair"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue or task..."
              rows={3}
            />
          </div>

          {showDepartmentSelector && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Assign to Department
              </Label>
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
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Building A, Floor 3"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
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
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {/* Media Upload Section */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Photos & Attachments
            </Label>
            <MediaUploader
              associatedType="work_order"
              associatedId={tempWorkOrderId}
              existingMedia={uploadedMedia}
              onUpload={handleMediaUpload}
              onDelete={handleMediaDelete}
              maxFiles={5}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!title.trim()}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            <Save className="w-4 h-4 mr-2" />
            Create Work Order
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

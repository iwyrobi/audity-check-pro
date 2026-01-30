import { useState, useEffect } from "react";
import { X, Save, Wrench, Clock, MapPin, User, Building2, MessageSquare, Send, Camera, Loader2 } from "lucide-react";
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
import { MediaUploader } from "@/components/media/MediaUploader";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";

interface WorkOrderComment {
  id: string;
  comment: string;
  created_by: string;
  created_at: string;
  profile?: {
    full_name: string | null;
  };
}

interface WorkOrderDetailModalProps {
  open: boolean;
  onClose: () => void;
  workOrder: {
    id: string;
    title: string;
    description?: string;
    location?: string;
    priority: string;
    status: string;
    department_id: string;
    assigned_to?: string | null;
    due_date?: string | null;
    created_at: string;
  } | null;
  onUpdate: (id: string, updates: Record<string, any>) => Promise<boolean>;
  departments?: { id: string; name: string }[];
}

const statuses = [
  { value: "open", label: "Open", color: "bg-info/10 text-info" },
  { value: "in-progress", label: "In Progress", color: "bg-warning/10 text-warning" },
  { value: "pending", label: "Pending", color: "bg-muted text-muted-foreground" },
  { value: "completed", label: "Completed", color: "bg-success/10 text-success" },
];

const priorities = [
  { value: "critical", label: "Critical", color: "text-destructive" },
  { value: "high", label: "High", color: "text-warning" },
  { value: "medium", label: "Medium", color: "text-info" },
  { value: "low", label: "Low", color: "text-muted-foreground" },
];

export function WorkOrderDetailModal({
  open,
  onClose,
  workOrder,
  onUpdate,
  departments = [],
}: WorkOrderDetailModalProps) {
  const [status, setStatus] = useState(workOrder?.status || "open");
  const [priority, setPriority] = useState(workOrder?.priority || "medium");
  const [assignedDepartment, setAssignedDepartment] = useState(workOrder?.department_id || "");
  const [comments, setComments] = useState<WorkOrderComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [saving, setSaving] = useState(false);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (workOrder) {
      setStatus(workOrder.status);
      setPriority(workOrder.priority);
      setAssignedDepartment(workOrder.department_id);
      fetchComments();
    }
  }, [workOrder?.id]);

  const fetchComments = async () => {
    if (!workOrder) return;
    setLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from("work_order_comments")
        .select(`
          id,
          comment,
          created_by,
          created_at
        `)
        .eq("work_order_id", workOrder.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async () => {
    if (!workOrder || !newComment.trim() || !user) return;
    
    setSubmittingComment(true);
    try {
      const { error } = await supabase
        .from("work_order_comments")
        .insert({
          work_order_id: workOrder.id,
          comment: newComment.trim(),
          created_by: user.id,
        });

      if (error) throw error;
      
      setNewComment("");
      await fetchComments();
      toast({ title: "Comment added" });
    } catch (error: any) {
      console.error("Error adding comment:", error);
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      });
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleSave = async () => {
    if (!workOrder) return;
    
    setSaving(true);
    try {
      const updates: Record<string, any> = {
        status,
        priority,
      };
      
      // Only update department if user has permission (admin can change departments)
      if (assignedDepartment !== workOrder.department_id) {
        updates.department_id = assignedDepartment;
      }
      
      if (status === "completed" && workOrder.status !== "completed") {
        updates.completed_at = new Date().toISOString();
      }

      const success = await onUpdate(workOrder.id, updates);
      if (success) {
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  if (!workOrder) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-accent" />
            </div>
            <div className="flex-1">
              <span className="block">{workOrder.title}</span>
              <span className="text-sm font-normal text-muted-foreground">#{workOrder.id.slice(0, 8)}</span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      <span className={cn("inline-flex items-center gap-2", s.color)}>
                        {s.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
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

          {/* Assign to Department */}
          {departments.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Assigned Department
              </Label>
              <Select value={assignedDepartment} onValueChange={setAssignedDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Details */}
          {workOrder.description && (
            <div className="space-y-2">
              <Label>Description</Label>
              <p className="text-sm text-muted-foreground bg-secondary/50 p-3 rounded-lg">
                {workOrder.description}
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {workOrder.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {workOrder.location}
              </span>
            )}
            {workOrder.due_date && (
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Due: {format(new Date(workOrder.due_date), "MMM d, yyyy")}
              </span>
            )}
          </div>

          {/* Media Uploads */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Camera className="w-4 h-4" />
              Photos & Attachments
            </Label>
            <MediaUploader
              associatedType="work_order"
              associatedId={workOrder.id}
              maxFiles={10}
            />
          </div>

          {/* Comments Section */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Comments
            </Label>

            {/* Comments List */}
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {loadingComments ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No comments yet
                </p>
              ) : (
                comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="bg-secondary/50 p-3 rounded-lg space-y-1"
                  >
                    <p className="text-sm">{comment.comment}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Add Comment */}
            <div className="flex gap-2">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                rows={2}
                className="flex-1"
              />
              <Button
                onClick={handleAddComment}
                disabled={!newComment.trim() || submittingComment}
                size="icon"
                className="self-end bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {submittingComment ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={saving}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

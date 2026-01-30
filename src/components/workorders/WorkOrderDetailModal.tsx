import { useState, useEffect, useRef } from "react";
import { Save, Wrench, Clock, MapPin, Building2, MessageSquare, Send, Camera, Loader2, Paperclip, Image, X, FileText, Users, UserPlus, UserMinus } from "lucide-react";
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
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CommentMedia {
  id: string;
  file_path: string;
  file_name: string;
  file_type: string | null;
  url: string;
}

interface WorkOrderComment {
  id: string;
  comment: string;
  created_by: string;
  created_at: string;
  profile?: {
    full_name: string | null;
  };
  media?: CommentMedia[];
}

interface Completer {
  id: string;
  user_id: string;
  completed_at: string;
  user_name: string;
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
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, string>>({});
  const [completers, setCompleters] = useState<Completer[]>([]);
  const [loadingCompleters, setLoadingCompleters] = useState(false);
  const [addingCompleter, setAddingCompleter] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { uploadFile, uploading } = useMediaUpload();

  useEffect(() => {
    if (workOrder) {
      setStatus(workOrder.status);
      setPriority(workOrder.priority);
      setAssignedDepartment(workOrder.department_id);
      fetchComments();
      fetchCompleters();
    }
  }, [workOrder?.id]);

  useEffect(() => {
    // Scroll to bottom when comments change
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  const fetchComments = async () => {
    if (!workOrder) return;
    setLoadingComments(true);
    try {
      // Fetch comments
      const { data: commentsData, error: commentsError } = await supabase
        .from("work_order_comments")
        .select("id, comment, created_by, created_at")
        .eq("work_order_id", workOrder.id)
        .order("created_at", { ascending: true });

      if (commentsError) throw commentsError;

      // Fetch user profiles for all unique user IDs
      const userIds = [...new Set(commentsData?.map(c => c.created_by) || [])];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);
        
        const profileMap: Record<string, string> = {};
        profiles?.forEach(p => {
          profileMap[p.user_id] = p.full_name || "Unknown User";
        });
        setUserProfiles(profileMap);
      }

      // Fetch media for all comments
      const commentIds = commentsData?.map(c => c.id) || [];
      let mediaMap: Record<string, CommentMedia[]> = {};
      
      if (commentIds.length > 0) {
        const { data: mediaData } = await supabase
          .from("media")
          .select("id, file_path, file_name, file_type, associated_id")
          .eq("associated_type", "work_order_comment")
          .in("associated_id", commentIds);

        mediaData?.forEach(m => {
          const url = supabase.storage.from("uploads").getPublicUrl(m.file_path).data.publicUrl;
          if (!mediaMap[m.associated_id]) {
            mediaMap[m.associated_id] = [];
          }
          mediaMap[m.associated_id].push({
            id: m.id,
            file_path: m.file_path,
            file_name: m.file_name,
            file_type: m.file_type,
            url
          });
        });
      }

      // Combine comments with media
      const commentsWithMedia = commentsData?.map(c => ({
        ...c,
        media: mediaMap[c.id] || []
      })) || [];

      setComments(commentsWithMedia);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoadingComments(false);
    }
  };

  const fetchCompleters = async () => {
    if (!workOrder) return;
    setLoadingCompleters(true);
    try {
      const { data, error } = await supabase
        .from("work_order_completers")
        .select("id, user_id, completed_at")
        .eq("work_order_id", workOrder.id)
        .order("completed_at", { ascending: true });

      if (error) throw error;

      // Fetch names for all completers using security definer function
      const completersWithNames = await Promise.all(
        (data || []).map(async (c) => {
          const { data: name } = await supabase.rpc("get_profile_name", { _user_id: c.user_id });
          return {
            ...c,
            user_name: name || "Unknown",
          };
        })
      );

      setCompleters(completersWithNames);
    } catch (error) {
      console.error("Error fetching completers:", error);
    } finally {
      setLoadingCompleters(false);
    }
  };

  const toggleCompleter = async () => {
    if (!workOrder || !user) return;
    
    const isAlreadyCompleter = completers.some(c => c.user_id === user.id);
    setAddingCompleter(true);
    
    try {
      if (isAlreadyCompleter) {
        // Remove self
        const { error } = await supabase
          .from("work_order_completers")
          .delete()
          .eq("work_order_id", workOrder.id)
          .eq("user_id", user.id);
        
        if (error) throw error;
        toast({ title: "Removed from completers" });
      } else {
        // Add self
        const { error } = await supabase
          .from("work_order_completers")
          .insert({
            work_order_id: workOrder.id,
            user_id: user.id,
          });
        
        if (error) throw error;
        toast({ title: "Added to completers" });
      }
      
      await fetchCompleters();
    } catch (error: any) {
      console.error("Error toggling completer:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update completers",
        variant: "destructive",
      });
    } finally {
      setAddingCompleter(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPendingFiles(prev => [...prev, ...files]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddComment = async () => {
    if (!workOrder || (!newComment.trim() && pendingFiles.length === 0) || !user) return;
    
    setSubmittingComment(true);
    try {
      // Create comment
      const { data: commentData, error: commentError } = await supabase
        .from("work_order_comments")
        .insert({
          work_order_id: workOrder.id,
          comment: newComment.trim() || "(attached files)",
          created_by: user.id,
        })
        .select("id")
        .single();

      if (commentError) throw commentError;

      // Upload files attached to this comment
      for (const file of pendingFiles) {
        await uploadFile(file, "work_order_comment", commentData.id);
      }
      
      setNewComment("");
      setPendingFiles([]);
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
      // Handle department reassignment via dedicated RPC (bypasses RLS issues)
      if (assignedDepartment !== workOrder.department_id) {
        const { error: rpcError } = await supabase.rpc("reassign_work_order_department", {
          _work_order_id: workOrder.id,
          _new_department_id: assignedDepartment,
        });

        if (rpcError) {
          console.error("Error reassigning department:", rpcError);
          toast({
            title: "Error",
            description: rpcError.message || "Failed to reassign department",
            variant: "destructive",
          });
          setSaving(false);
          return;
        }
      }

      // Update other fields (status, priority, completed_at)
      const updates: Record<string, any> = {
        status,
        priority,
      };
      
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

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const isImageFile = (fileType: string | null) => {
    return fileType?.startsWith("image/");
  };

  if (!workOrder) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
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

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
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

          {/* Completed By Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Completed By
              </Label>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleCompleter}
                disabled={addingCompleter}
                className="h-8"
              >
                {addingCompleter ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : completers.some(c => c.user_id === user?.id) ? (
                  <>
                    <UserMinus className="w-4 h-4 mr-1" />
                    Remove Me
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-1" />
                    Add Me
                  </>
                )}
              </Button>
            </div>
            
            {loadingCompleters ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading...</span>
              </div>
            ) : completers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No one has marked this as completed yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {completers.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 text-success text-sm"
                  >
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[10px] bg-success/20 text-success">
                        {c.user_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <span>{c.user_name}</span>
                  </div>
                ))}
              </div>
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

          {/* Chat-like Comments Section */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Discussion
            </Label>

            {/* Chat Messages */}
            <div className="bg-secondary/30 rounded-lg border">
              <ScrollArea className="h-64 p-3">
                {loadingComments ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : comments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-sm">No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {comments.map((comment) => {
                      const isOwnMessage = comment.created_by === user?.id;
                      const userName = userProfiles[comment.created_by] || "Unknown User";
                      
                      return (
                        <div
                          key={comment.id}
                          className={cn(
                            "flex gap-2",
                            isOwnMessage ? "flex-row-reverse" : "flex-row"
                          )}
                        >
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarFallback className="text-xs bg-accent/20 text-accent">
                              {getInitials(userName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className={cn(
                            "max-w-[75%] space-y-1",
                            isOwnMessage ? "items-end" : "items-start"
                          )}>
                            <div className={cn(
                              "text-xs text-muted-foreground",
                              isOwnMessage ? "text-right" : "text-left"
                            )}>
                              {userName}
                            </div>
                            <div className={cn(
                              "rounded-lg p-3 text-sm",
                              isOwnMessage 
                                ? "bg-accent text-accent-foreground rounded-br-sm" 
                                : "bg-background border rounded-bl-sm"
                            )}>
                              {comment.comment !== "(attached files)" && (
                                <p>{comment.comment}</p>
                              )}
                              
                              {/* Media attachments */}
                              {comment.media && comment.media.length > 0 && (
                                <div className="mt-2 space-y-2">
                                  {comment.media.map((m) => (
                                    <div key={m.id}>
                                      {isImageFile(m.file_type) ? (
                                        <a href={m.url} target="_blank" rel="noopener noreferrer">
                                          <img 
                                            src={m.url} 
                                            alt={m.file_name}
                                            className="max-w-full max-h-40 rounded-md object-cover hover:opacity-90 transition-opacity"
                                          />
                                        </a>
                                      ) : (
                                        <a 
                                          href={m.url} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className={cn(
                                            "flex items-center gap-2 p-2 rounded-md text-xs hover:opacity-80 transition-opacity",
                                            isOwnMessage ? "bg-accent-foreground/10" : "bg-secondary"
                                          )}
                                        >
                                          <FileText className="w-4 h-4" />
                                          <span className="truncate">{m.file_name}</span>
                                        </a>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className={cn(
                              "text-[10px] text-muted-foreground",
                              isOwnMessage ? "text-right" : "text-left"
                            )}>
                              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={commentsEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Pending Files Preview */}
              {pendingFiles.length > 0 && (
                <div className="px-3 py-2 border-t bg-secondary/50 flex flex-wrap gap-2">
                  {pendingFiles.map((file, index) => (
                    <div 
                      key={index}
                      className="flex items-center gap-1 bg-background rounded-md px-2 py-1 text-xs border"
                    >
                      {file.type.startsWith("image/") ? (
                        <Image className="w-3 h-3" />
                      ) : (
                        <FileText className="w-3 h-3" />
                      )}
                      <span className="max-w-20 truncate">{file.name}</span>
                      <button
                        onClick={() => removePendingFile(index)}
                        className="hover:bg-destructive/10 rounded p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Message Input */}
              <div className="p-3 border-t flex gap-2 items-end">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  className="shrink-0"
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Type a message..."
                  rows={1}
                  className="flex-1 min-h-[38px] max-h-24 resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleAddComment();
                    }
                  }}
                />
                <Button
                  onClick={handleAddComment}
                  disabled={(!newComment.trim() && pendingFiles.length === 0) || submittingComment || uploading}
                  size="icon"
                  className="shrink-0 bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  {submittingComment || uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
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

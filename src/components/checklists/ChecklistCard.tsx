import { ClipboardCheck, MoreVertical, Calendar, User, Play, Pencil, Copy, Archive, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ChecklistTemplateDB } from "@/hooks/useChecklistTemplates";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";

export interface Checklist {
  id: string;
  title: string;
  description: string;
  departmentName?: string;
  itemCount: number;
  lastUsed?: string;
  assignedTo?: string;
  status: "active" | "draft" | "archived";
}

interface ChecklistCardProps {
  checklist: Checklist;
  templateData?: ChecklistTemplateDB;
  onClick?: () => void;
  onEdit?: () => void;
  onCopy?: () => void;
  onArchive?: () => void;
}

const statusStyles = {
  active: "status-badge-success",
  draft: "status-badge-pending",
  archived: "status-badge-info",
};

export function ChecklistCard({ 
  checklist, 
  templateData, 
  onClick, 
  onEdit, 
  onCopy,
  onArchive 
}: ChecklistCardProps) {
  const navigate = useNavigate();
  const { isAdmin, isDepartmentHead } = useAuth();
  const canManage = isAdmin || isDepartmentHead;

  const handleStartInspection = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate("/run-inspection", { 
      state: { 
        templateId: checklist.id,
        templateName: checklist.title,
        templateData 
      } 
    });
  };

  const handleMenuClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  return (
    <div
      className="action-card group"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <ClipboardCheck className="w-5 h-5 text-primary" />
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("status-badge capitalize", statusStyles[checklist.status])}>
            {checklist.status}
          </span>
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => handleMenuClick(e as any, onEdit || (() => {}))}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit Template
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => handleMenuClick(e as any, onCopy || (() => {}))}>
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={(e) => handleMenuClick(e as any, onArchive || (() => {}))}
                  className="text-destructive focus:text-destructive"
                >
                  <Archive className="w-4 h-4 mr-2" />
                  Archive
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <h3 className="font-semibold text-foreground mb-1 line-clamp-1">{checklist.title}</h3>
      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
        {checklist.description}
      </p>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <ClipboardCheck className="w-3.5 h-3.5" />
          {checklist.itemCount} items
        </span>
        {checklist.lastUsed && (
          <span className="inline-flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {checklist.lastUsed}
          </span>
        )}
        {checklist.assignedTo && (
          <span className="inline-flex items-center gap-1">
            <User className="w-3.5 h-3.5" />
            {checklist.assignedTo}
          </span>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
        <span className="text-xs font-medium text-accent flex items-center gap-1">
          <Building2 className="w-3.5 h-3.5" />
          {checklist.departmentName || "No Department"}
        </span>
        {checklist.status === "active" && (
          <Button
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90 h-8"
            onClick={handleStartInspection}
          >
            <Play className="w-3.5 h-3.5 mr-1" />
            Start
          </Button>
        )}
      </div>
    </div>
  );
}

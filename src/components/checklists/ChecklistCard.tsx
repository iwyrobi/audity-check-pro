import { ClipboardCheck, MoreVertical, Calendar, User, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ChecklistTemplateDB } from "@/hooks/useChecklistTemplates";

export interface Checklist {
  id: string;
  title: string;
  description: string;
  category: string;
  itemCount: number;
  lastUsed?: string;
  assignedTo?: string;
  status: "active" | "draft" | "archived";
}

interface ChecklistCardProps {
  checklist: Checklist;
  templateData?: ChecklistTemplateDB;
  onClick?: () => void;
}

const statusStyles = {
  active: "status-badge-success",
  draft: "status-badge-pending",
  archived: "status-badge-info",
};

export function ChecklistCard({ checklist, templateData, onClick }: ChecklistCardProps) {
  const navigate = useNavigate();

  const handleStartInspection = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Pass template data via state for the inspection
    navigate("/run-inspection", { 
      state: { 
        templateId: checklist.id,
        templateName: checklist.title,
        templateData 
      } 
    });
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
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
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
        <span className="text-xs font-medium text-accent">{checklist.category}</span>
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

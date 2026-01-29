import { Wrench, MapPin, Clock, AlertCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WorkOrder {
  id: string;
  title: string;
  description: string;
  location: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "open" | "in-progress" | "pending" | "completed";
  assignedTo?: string;
  dueDate: string;
  createdAt: string;
}

interface WorkOrderCardProps {
  workOrder: WorkOrder;
  onClick?: () => void;
}

const priorityStyles = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-info/10 text-info",
  high: "bg-warning/10 text-warning",
  critical: "bg-destructive/10 text-destructive",
};

const statusStyles = {
  open: "status-badge-info",
  "in-progress": "status-badge-warning",
  pending: "status-badge-pending",
  completed: "status-badge-success",
};

export function WorkOrderCard({ workOrder, onClick }: WorkOrderCardProps) {
  return (
    <div
      className="action-card group"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={cn("status-badge", statusStyles[workOrder.status])}>
            {workOrder.status.replace("-", " ")}
          </span>
          <span className={cn("status-badge capitalize", priorityStyles[workOrder.priority])}>
            {workOrder.priority}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">#{workOrder.id}</span>
      </div>

      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
          <Wrench className="w-5 h-5 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground mb-1 truncate">{workOrder.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{workOrder.description}</p>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-border flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" />
          {workOrder.location}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          Due: {workOrder.dueDate}
        </span>
        {workOrder.assignedTo && (
          <span className="inline-flex items-center gap-1">
            <User className="w-3.5 h-3.5" />
            {workOrder.assignedTo}
          </span>
        )}
      </div>
    </div>
  );
}

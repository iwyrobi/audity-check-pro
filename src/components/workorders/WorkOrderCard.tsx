import { Wrench, MapPin, Clock, User, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WorkOrder {
  id: string;
  title: string;
  description: string;
  location: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "open" | "in-progress" | "pending" | "completed";
  assignedTo?: string;
  createdBy?: string;
  dueDate?: string;
  createdAt: string;
}

interface WorkOrderCardProps {
  workOrder: WorkOrder;
  onClick?: () => void;
  variant?: "grid" | "list";
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

export function WorkOrderCard({ workOrder, onClick, variant = "grid" }: WorkOrderCardProps) {
  if (variant === "list") {
    return (
      <div
        className="action-card group flex items-center gap-4 p-4"
        onClick={onClick}
      >
        {/* Icon */}
        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
          <Wrench className="w-5 h-5 text-accent" />
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 flex items-center gap-6">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{workOrder.title}</h3>
            <p className="text-sm text-muted-foreground truncate">{workOrder.description}</p>
          </div>

          {/* Created by */}
          {workOrder.createdBy && (
            <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground min-w-[100px]">
              <UserCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{workOrder.createdBy}</span>
            </div>
          )}

          {/* Location */}
          <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground min-w-[120px]">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{workOrder.location || "No location"}</span>
          </div>

          {/* Due date */}
          {workOrder.dueDate && (
            <div className="hidden lg:flex items-center gap-1 text-xs text-muted-foreground min-w-[100px]">
              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{workOrder.dueDate}</span>
            </div>
          )}

          {/* Assignee */}
          {workOrder.assignedTo && (
            <div className="hidden lg:flex items-center gap-1 text-xs text-muted-foreground min-w-[100px]">
              <User className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{workOrder.assignedTo}</span>
            </div>
          )}
        </div>

        {/* Status and Priority badges */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={cn("status-badge", statusStyles[workOrder.status])}>
            {workOrder.status.replace("-", " ")}
          </span>
          <span className={cn("status-badge capitalize", priorityStyles[workOrder.priority])}>
            {workOrder.priority}
          </span>
        </div>

        {/* ID */}
        <span className="text-xs text-muted-foreground hidden sm:block">#{workOrder.id.slice(0, 8)}</span>
      </div>
    );
  }

  // Grid variant (default)
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
        <span className="text-xs text-muted-foreground">#{workOrder.id.slice(0, 8)}</span>
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
        {workOrder.createdBy && (
          <span className="inline-flex items-center gap-1">
            <UserCircle className="w-3.5 h-3.5" />
            Created by: {workOrder.createdBy}
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" />
          {workOrder.location || "No location"}
        </span>
        {workOrder.dueDate && (
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Due: {workOrder.dueDate}
          </span>
        )}
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

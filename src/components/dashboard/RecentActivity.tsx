import { ClipboardCheck, Wrench, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Activity {
  id: string;
  type: "inspection" | "workorder" | "issue" | "completed";
  title: string;
  description: string;
  time: string;
}

const activities: Activity[] = [
  {
    id: "1",
    type: "completed",
    title: "Safety Inspection Completed",
    description: "Warehouse A - Floor 2",
    time: "10 min ago",
  },
  {
    id: "2",
    type: "issue",
    title: "Issue Raised",
    description: "Fire extinguisher needs replacement",
    time: "25 min ago",
  },
  {
    id: "3",
    type: "workorder",
    title: "Work Order Created",
    description: "HVAC maintenance - Building C",
    time: "1 hour ago",
  },
  {
    id: "4",
    type: "inspection",
    title: "Inspection Started",
    description: "Monthly equipment check",
    time: "2 hours ago",
  },
  {
    id: "5",
    type: "completed",
    title: "Quality Audit Completed",
    description: "Production Line 3",
    time: "3 hours ago",
  },
];

const iconMap = {
  inspection: ClipboardCheck,
  workorder: Wrench,
  issue: AlertTriangle,
  completed: CheckCircle2,
};

const colorMap = {
  inspection: "text-info bg-info/10",
  workorder: "text-warning bg-warning/10",
  issue: "text-destructive bg-destructive/10",
  completed: "text-success bg-success/10",
};

export function RecentActivity() {
  return (
    <div className="stat-card">
      <h3 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h3>
      <div className="space-y-4">
        {activities.map((activity, index) => {
          const Icon = iconMap[activity.type];
          return (
            <div
              key={activity.id}
              className="flex items-start gap-3 animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div
                className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                  colorMap[activity.type]
                )}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {activity.title}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {activity.description}
                </p>
              </div>
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {activity.time}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

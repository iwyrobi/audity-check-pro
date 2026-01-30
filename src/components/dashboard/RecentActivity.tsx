import { useState, useEffect } from "react";
import { ClipboardCheck, Wrench, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

interface Activity {
  id: string;
  type: "inspection" | "workorder" | "issue" | "completed";
  title: string;
  description: string;
  time: string;
  linkType: "inspection" | "workorder";
  linkId: string;
}

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
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRecentActivity();
  }, []);

  const fetchRecentActivity = async () => {
    setLoading(true);
    try {
      // Fetch recent inspections
      const { data: inspections } = await supabase
        .from("inspections")
        .select("id, title, status, location, created_at, completed_at")
        .order("created_at", { ascending: false })
        .limit(5);

      // Fetch recent work orders
      const { data: workOrders } = await supabase
        .from("work_orders")
        .select("id, title, status, location, created_at, completed_at")
        .order("created_at", { ascending: false })
        .limit(5);

      // Fetch recent defects with inspection_id
      const { data: defects } = await supabase
        .from("inspection_answers")
        .select("id, question_text, created_at, inspection_id")
        .eq("is_defect", true)
        .order("created_at", { ascending: false })
        .limit(3);

      // Build activity list
      const allActivities: Activity[] = [];

      // Add inspections
      (inspections || []).forEach((i) => {
        if (i.status === "completed") {
          allActivities.push({
            id: `inspection-completed-${i.id}`,
            type: "completed",
            title: "Inspection Completed",
            description: i.title,
            time: formatDistanceToNow(new Date(i.completed_at || i.created_at), { addSuffix: true }),
            linkType: "inspection",
            linkId: i.id,
          });
        } else {
          allActivities.push({
            id: `inspection-${i.id}`,
            type: "inspection",
            title: "Inspection Started",
            description: i.title,
            time: formatDistanceToNow(new Date(i.created_at), { addSuffix: true }),
            linkType: "inspection",
            linkId: i.id,
          });
        }
      });

      // Add work orders
      (workOrders || []).forEach((wo) => {
        if (wo.status === "completed") {
          allActivities.push({
            id: `wo-completed-${wo.id}`,
            type: "completed",
            title: "Work Order Completed",
            description: wo.title,
            time: formatDistanceToNow(new Date(wo.completed_at || wo.created_at), { addSuffix: true }),
            linkType: "workorder",
            linkId: wo.id,
          });
        } else {
          allActivities.push({
            id: `wo-${wo.id}`,
            type: "workorder",
            title: "Work Order Created",
            description: wo.title,
            time: formatDistanceToNow(new Date(wo.created_at), { addSuffix: true }),
            linkType: "workorder",
            linkId: wo.id,
          });
        }
      });

      // Add defects - link to their inspection
      (defects || []).forEach((d) => {
        allActivities.push({
          id: `defect-${d.id}`,
          type: "issue",
          title: "Issue Reported",
          description: d.question_text,
          time: formatDistanceToNow(new Date(d.created_at), { addSuffix: true }),
          linkType: "inspection",
          linkId: d.inspection_id,
        });
      });

      // Sort by most recent and take top 8
      allActivities.sort((a, b) => {
        const timeA = a.time.includes("ago") ? 0 : 1;
        const timeB = b.time.includes("ago") ? 0 : 1;
        return timeA - timeB;
      });

      setActivities(allActivities.slice(0, 8));
    } catch (error) {
      console.error("Error fetching recent activity:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleActivityClick = (activity: Activity) => {
    if (activity.linkType === "inspection") {
      navigate(`/inspections/${activity.linkId}`);
    } else if (activity.linkType === "workorder") {
      navigate(`/work-orders?selected=${activity.linkId}`);
    }
  };

  if (loading) {
    return (
      <div className="stat-card">
        <h3 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h3>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="stat-card">
      <h3 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h3>
      {activities.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
      ) : (
        <div className="space-y-2">
          {activities.map((activity, index) => {
            const Icon = iconMap[activity.type];
            return (
              <div
                key={activity.id}
                onClick={() => handleActivityClick(activity)}
                className="flex items-start gap-3 animate-slide-up p-2 -mx-2 rounded-lg cursor-pointer hover:bg-secondary/50 transition-colors"
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
      )}
    </div>
  );
}

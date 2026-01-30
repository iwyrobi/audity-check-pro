import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { ChecklistCard } from "@/components/checklists/ChecklistCard";
import { WorkOrderCard } from "@/components/workorders/WorkOrderCard";
import { WorkOrderDetailModal } from "@/components/workorders/WorkOrderDetailModal";
import { ClipboardCheck, Wrench, AlertTriangle, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDepartments } from "@/hooks/useDepartments";
import { formatDistanceToNow, subDays, startOfWeek } from "date-fns";

interface DashboardStats {
  totalInspections: number;
  openWorkOrders: number;
  issuesReported: number;
  completedThisWeek: number;
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalInspections: 0,
    openWorkOrders: 0,
    issuesReported: 0,
    completedThisWeek: 0,
  });
  const [recentTemplates, setRecentTemplates] = useState<any[]>([]);
  const [recentWorkOrders, setRecentWorkOrders] = useState<any[]>([]);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<any>(null);
  const { user } = useAuth();
  const { departments } = useDepartments();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const weekStart = startOfWeek(new Date()).toISOString();

      // Fetch stats in parallel
      const [
        { count: totalInspections },
        { count: openWorkOrders },
        { count: issuesReported },
        { count: completedThisWeek },
        { data: templates },
        { data: workOrders },
      ] = await Promise.all([
        supabase.from("inspections").select("*", { count: "exact", head: true }),
        supabase.from("work_orders").select("*", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("inspection_answers").select("*", { count: "exact", head: true }).eq("is_defect", true),
        supabase.from("work_orders").select("*", { count: "exact", head: true }).eq("status", "completed").gte("completed_at", weekStart),
        supabase.from("checklist_templates").select("id, name, description, category, created_at, department_id, departments(name)").order("created_at", { ascending: false }).limit(4),
        supabase.from("work_orders").select("*").order("created_at", { ascending: false }).limit(4),
      ]);

      setStats({
        totalInspections: totalInspections || 0,
        openWorkOrders: openWorkOrders || 0,
        issuesReported: issuesReported || 0,
        completedThisWeek: completedThisWeek || 0,
      });

      // Format templates for ChecklistCard
      const formattedTemplates = (templates || []).map((t: any) => ({
        id: t.id,
        title: t.name,
        description: t.description || "",
        departmentName: t.departments?.name || "Unknown",
        itemCount: 0, // We'll skip counting questions for now
        lastUsed: formatDistanceToNow(new Date(t.created_at), { addSuffix: true }),
        status: "active" as const,
      }));
      setRecentTemplates(formattedTemplates);

      // Fetch creator names for work orders
      const creatorIds = [...new Set((workOrders || []).map((wo: any) => wo.created_by))];
      const profileMap = new Map<string, string>();
      await Promise.all(
        creatorIds.map(async (userId) => {
          const { data: name } = await supabase.rpc("get_profile_name", { _user_id: userId });
          profileMap.set(userId as string, name || "Unknown");
        })
      );

      // Format work orders for WorkOrderCard - keep raw data for modal
      const formattedWorkOrders = (workOrders || []).map((wo: any) => ({
        id: wo.id,
        title: wo.title,
        description: wo.description || "",
        location: wo.location || "",
        priority: wo.priority as "critical" | "high" | "medium" | "low",
        status: wo.status as "open" | "in-progress" | "pending" | "completed",
        createdBy: profileMap.get(wo.created_by) || "Unknown",
        dueDate: wo.due_date || undefined,
        createdAt: formatDistanceToNow(new Date(wo.created_at), { addSuffix: true }),
        // Keep raw data for modal
        department_id: wo.department_id,
        assigned_to: wo.assigned_to,
        due_date: wo.due_date,
        created_at: wo.created_at,
      }));
      setRecentWorkOrders(formattedWorkOrders);

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Inspections"
            value={stats.totalInspections}
            icon={<ClipboardCheck className="w-6 h-6 text-primary" />}
            href="/inspections"
          />
          <StatCard
            title="Open Work Orders"
            value={stats.openWorkOrders}
            icon={<Wrench className="w-6 h-6 text-accent" />}
            href="/work-orders"
          />
          <StatCard
            title="Issues Reported"
            value={stats.issuesReported}
            icon={<AlertTriangle className="w-6 h-6 text-warning" />}
            href="/inspections"
          />
          <StatCard
            title="Completed This Week"
            value={stats.completedThisWeek}
            icon={<CheckCircle2 className="w-6 h-6 text-success" />}
            href="/work-orders"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="lg:col-span-1">
            <RecentActivity />
          </div>

          {/* Quick Access */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Checklists/Templates */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">Recent Templates</h2>
                <Link to="/checklists">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    View all
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
              {recentTemplates.length === 0 ? (
                <p className="text-sm text-muted-foreground">No templates yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recentTemplates.map((checklist) => (
                    <ChecklistCard 
                      key={checklist.id} 
                      checklist={checklist}
                      onClick={() => navigate(`/checklists?template=${checklist.id}`)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Recent Work Orders */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">Recent Work Orders</h2>
                <Link to="/work-orders">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    View all
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
              {recentWorkOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No work orders yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recentWorkOrders.map((workOrder) => (
                    <WorkOrderCard 
                      key={workOrder.id} 
                      workOrder={workOrder}
                      onClick={() => setSelectedWorkOrder(workOrder)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Work Order Detail Modal */}
      <WorkOrderDetailModal
        open={!!selectedWorkOrder}
        onClose={() => setSelectedWorkOrder(null)}
        workOrder={selectedWorkOrder}
        onUpdate={async () => {
          fetchDashboardData();
          return true;
        }}
        departments={departments}
      />
    </AppLayout>
  );
}

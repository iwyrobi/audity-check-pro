import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { ChecklistCard, Checklist } from "@/components/checklists/ChecklistCard";
import { WorkOrderCard, WorkOrder } from "@/components/workorders/WorkOrderCard";
import { ClipboardCheck, Wrench, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const recentChecklists: Checklist[] = [
  {
    id: "1",
    title: "Daily Safety Inspection",
    description: "Comprehensive daily safety check for warehouse operations",
    category: "Safety",
    itemCount: 24,
    lastUsed: "Today",
    status: "active",
  },
  {
    id: "2",
    title: "Equipment Maintenance",
    description: "Monthly equipment inspection and maintenance checklist",
    category: "Maintenance",
    itemCount: 18,
    lastUsed: "3 days ago",
    status: "active",
  },
];

const recentWorkOrders: WorkOrder[] = [
  {
    id: "WO-001",
    title: "HVAC System Repair",
    description: "Air conditioning unit in Building A needs immediate repair",
    location: "Building A, Floor 3",
    priority: "high",
    status: "in-progress",
    assignedTo: "John Smith",
    dueDate: "Today",
    createdAt: "2 days ago",
  },
  {
    id: "WO-002",
    title: "Fire Extinguisher Replacement",
    description: "Replace expired fire extinguishers in warehouse section B",
    location: "Warehouse B",
    priority: "critical",
    status: "open",
    dueDate: "Tomorrow",
    createdAt: "1 day ago",
  },
];

export default function Dashboard() {
  return (
    <AppLayout title="Dashboard">
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Inspections"
            value={156}
            icon={<ClipboardCheck className="w-6 h-6 text-primary" />}
            trend={{ value: 12, isPositive: true }}
          />
          <StatCard
            title="Open Work Orders"
            value={23}
            icon={<Wrench className="w-6 h-6 text-accent" />}
            trend={{ value: 5, isPositive: false }}
          />
          <StatCard
            title="Issues Reported"
            value={8}
            icon={<AlertTriangle className="w-6 h-6 text-warning" />}
          />
          <StatCard
            title="Completed This Week"
            value={42}
            icon={<CheckCircle2 className="w-6 h-6 text-success" />}
            trend={{ value: 18, isPositive: true }}
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
            {/* Recent Checklists */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">Recent Checklists</h2>
                <Link to="/checklists">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    View all
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recentChecklists.map((checklist) => (
                  <ChecklistCard key={checklist.id} checklist={checklist} />
                ))}
              </div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recentWorkOrders.map((workOrder) => (
                  <WorkOrderCard key={workOrder.id} workOrder={workOrder} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

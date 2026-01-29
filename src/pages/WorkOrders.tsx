import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { WorkOrderCard, WorkOrder } from "@/components/workorders/WorkOrderCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, SlidersHorizontal } from "lucide-react";

const workOrders: WorkOrder[] = [
  {
    id: "WO-001",
    title: "HVAC System Repair",
    description: "Air conditioning unit in Building A needs immediate repair. System is making unusual noises and not cooling properly.",
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
    description: "Replace expired fire extinguishers in warehouse section B. Total of 6 units need replacement.",
    location: "Warehouse B",
    priority: "critical",
    status: "open",
    dueDate: "Tomorrow",
    createdAt: "1 day ago",
  },
  {
    id: "WO-003",
    title: "Lighting Fixture Installation",
    description: "Install new LED lighting fixtures in the parking garage as part of energy efficiency upgrade.",
    location: "Parking Garage",
    priority: "medium",
    status: "pending",
    assignedTo: "Mike Johnson",
    dueDate: "Next Week",
    createdAt: "3 days ago",
  },
  {
    id: "WO-004",
    title: "Door Lock Repair",
    description: "Security door lock on main entrance needs repair. Currently requires manual override.",
    location: "Main Entrance",
    priority: "high",
    status: "open",
    dueDate: "Today",
    createdAt: "5 hours ago",
  },
  {
    id: "WO-005",
    title: "Plumbing Leak Fix",
    description: "Minor water leak detected in the restroom on the second floor.",
    location: "Building B, Floor 2",
    priority: "medium",
    status: "in-progress",
    assignedTo: "Sarah Wilson",
    dueDate: "Today",
    createdAt: "1 day ago",
  },
  {
    id: "WO-006",
    title: "Elevator Maintenance",
    description: "Scheduled quarterly maintenance for elevators in the main building.",
    location: "Main Building",
    priority: "low",
    status: "pending",
    dueDate: "Next Month",
    createdAt: "1 week ago",
  },
  {
    id: "WO-007",
    title: "Window Replacement",
    description: "Replace cracked window in office 302. Window was damaged during recent storm.",
    location: "Building C, Office 302",
    priority: "low",
    status: "completed",
    assignedTo: "Tom Brown",
    dueDate: "Completed",
    createdAt: "2 weeks ago",
  },
  {
    id: "WO-008",
    title: "Generator Testing",
    description: "Monthly backup generator testing and fuel level check.",
    location: "Facility Grounds",
    priority: "medium",
    status: "completed",
    assignedTo: "Mike Johnson",
    dueDate: "Completed",
    createdAt: "3 days ago",
  },
];

const statusFilters = ["All", "Open", "In Progress", "Pending", "Completed"];
const priorityFilters = ["All Priorities", "Critical", "High", "Medium", "Low"];

export default function WorkOrders() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedPriority, setSelectedPriority] = useState("All Priorities");

  const filteredWorkOrders = workOrders.filter((wo) => {
    const matchesSearch = wo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wo.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wo.location.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = selectedStatus === "All" || 
      wo.status.replace("-", " ").toLowerCase() === selectedStatus.toLowerCase();
    
    const matchesPriority = selectedPriority === "All Priorities" || 
      wo.priority.toLowerCase() === selectedPriority.toLowerCase();
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const openCount = workOrders.filter(wo => wo.status === "open").length;
  const inProgressCount = workOrders.filter(wo => wo.status === "in-progress").length;
  const criticalCount = workOrders.filter(wo => wo.priority === "critical").length;

  return (
    <AppLayout title="Work Orders">
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="stat-card flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Open</p>
              <p className="text-2xl font-bold text-foreground">{openCount}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
              <span className="text-info font-bold">{openCount}</span>
            </div>
          </div>
          <div className="stat-card flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">In Progress</p>
              <p className="text-2xl font-bold text-foreground">{inProgressCount}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <span className="text-warning font-bold">{inProgressCount}</span>
            </div>
          </div>
          <div className="stat-card flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Critical</p>
              <p className="text-2xl font-bold text-foreground">{criticalCount}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <span className="text-destructive font-bold">{criticalCount}</span>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search work orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full sm:w-64"
              />
            </div>
            <Button variant="outline" size="icon">
              <SlidersHorizontal className="w-4 h-4" />
            </Button>
          </div>
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="w-4 h-4 mr-2" />
            Create Work Order
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="flex gap-2 overflow-x-auto">
            {statusFilters.map((status) => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedStatus === status
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-secondary text-secondary-foreground border-0 cursor-pointer"
          >
            {priorityFilters.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </div>

        {/* Work Orders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWorkOrders.map((workOrder, index) => (
            <div
              key={workOrder.id}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <WorkOrderCard workOrder={workOrder} />
            </div>
          ))}
        </div>

        {filteredWorkOrders.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No work orders found matching your criteria.</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

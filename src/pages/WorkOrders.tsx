import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { WorkOrderCard } from "@/components/workorders/WorkOrderCard";
import { CreateWorkOrderModal } from "@/components/workorders/CreateWorkOrderModal";
import { WorkOrderDetailModal } from "@/components/workorders/WorkOrderDetailModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Loader2, LayoutGrid, List, User, Calendar, ArrowUpDown } from "lucide-react";
import { useWorkOrders } from "@/hooks/useWorkOrders";
import { useDepartments } from "@/hooks/useDepartments";
import { useAuth } from "@/contexts/AuthContext";
import { format, formatDistanceToNow, startOfDay, startOfWeek, startOfMonth, isAfter, isBefore, endOfDay } from "date-fns";
import { useSearchParams } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const statusFilters = ["All", "Open", "In Progress", "Pending", "Completed"];
const priorityFilters = ["All Priorities", "Critical", "High", "Medium", "Low"];
const dateFilters = [
  { value: "today", label: "Today" },
  { value: "this-week", label: "This Week" },
  { value: "this-month", label: "This Month" },
  { value: "custom", label: "Custom Range" },
  { value: "all", label: "All Time" },
];

const sortOptions = [
  { value: "date-desc", label: "Newest First" },
  { value: "date-asc", label: "Oldest First" },
  { value: "status", label: "By Status" },
];

const statusOrder: Record<string, number> = {
  "open": 0,
  "in-progress": 1,
  "pending": 2,
  "completed": 3,
};

type ViewMode = "grid" | "list";

export default function WorkOrders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("Open");
  const [selectedPriority, setSelectedPriority] = useState("All Priorities");
  const [selectedDateRange, setSelectedDateRange] = useState("this-month");
  const [sortBy, setSortBy] = useState("date-desc");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<typeof workOrders[0] | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [showMyWorkOrders, setShowMyWorkOrders] = useState(false);

  const { workOrders, loading, createWorkOrder, updateWorkOrder } = useWorkOrders();
  const { hierarchicalDepartments } = useDepartments();
  const { user, profile, isAdmin } = useAuth();

  const getDateRange = (): { start: Date | null; end: Date | null } => {
    switch (selectedDateRange) {
      case "today":
        return { start: startOfDay(new Date()), end: endOfDay(new Date()) };
      case "this-week":
        return { start: startOfWeek(new Date()), end: endOfDay(new Date()) };
      case "this-month":
        return { start: startOfMonth(new Date()), end: endOfDay(new Date()) };
      case "custom":
        return { 
          start: customStartDate ? startOfDay(customStartDate) : null, 
          end: customEndDate ? endOfDay(customEndDate) : null 
        };
      default:
        return { start: null, end: null };
    }
  };

  const filteredWorkOrders = workOrders.filter((wo) => {
    const matchesSearch = 
      wo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (wo.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (wo.location?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    
    const statusMap: Record<string, string> = {
      "Open": "open",
      "In Progress": "in-progress",
      "Pending": "pending",
      "Completed": "completed",
    };
    const matchesStatus = selectedStatus === "All" || wo.status === statusMap[selectedStatus];
    
    const matchesPriority = selectedPriority === "All Priorities" || 
      wo.priority.toLowerCase() === selectedPriority.toLowerCase();
    
    const matchesMyWorkOrders = !showMyWorkOrders || wo.created_by === user?.id;
    
    const { start, end } = getDateRange();
    const woDate = new Date(wo.created_at);
    const matchesDateRange = 
      (!start || isAfter(woDate, start) || woDate.getTime() === start.getTime()) && 
      (!end || isBefore(woDate, end) || woDate.getTime() === end.getTime());
    
    return matchesSearch && matchesStatus && matchesPriority && matchesMyWorkOrders && matchesDateRange;
  }).sort((a, b) => {
    switch (sortBy) {
      case "date-asc":
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case "status":
        return (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
      case "date-desc":
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const myWorkOrdersCount = workOrders.filter(wo => wo.created_by === user?.id).length;

  const openCount = workOrders.filter(wo => wo.status === "open").length;
  const inProgressCount = workOrders.filter(wo => wo.status === "in-progress").length;
  const criticalCount = workOrders.filter(wo => wo.priority === "critical").length;

  // Handle URL-based work order selection (from dashboard click)
  useEffect(() => {
    const selectedId = searchParams.get("selected");
    if (selectedId && workOrders.length > 0) {
      const wo = workOrders.find(w => w.id === selectedId);
      if (wo) {
        setSelectedWorkOrder(wo);
        // Clear the URL param after opening
        setSearchParams({});
      }
    }
  }, [searchParams, workOrders]);

  const handleCreateWorkOrder = async (data: {
    title: string;
    description?: string;
    location?: string;
    priority?: string;
    dueDate?: string;
    departmentId?: string;
    tempWorkOrderId?: string;
  }) => {
    const result = await createWorkOrder(data);
    if (result) {
      setIsCreateModalOpen(false);
    }
  };

  const handleUpdateWorkOrder = async (id: string, updates: Record<string, any>) => {
    return await updateWorkOrder(id, updates);
  };

  if (loading) {
    return (
      <AppLayout title="Work Orders">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

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
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search work orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full sm:w-64"
              />
            </div>
            <Button 
              className="bg-accent text-accent-foreground hover:bg-accent/90 w-full sm:w-auto"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Work Order
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Date Range Filter */}
            <Select value={selectedDateRange} onValueChange={setSelectedDateRange}>
              <SelectTrigger className="w-[140px] bg-secondary border-0">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dateFilters.map((filter) => (
                  <SelectItem key={filter.value} value={filter.value}>
                    {filter.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Custom Date Pickers - only show when custom is selected */}
            {selectedDateRange === "custom" && (
              <>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[130px] justify-start text-left font-normal",
                        !customStartDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {customStartDate ? format(customStartDate, "MMM d, yyyy") : "Start"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={customStartDate}
                      onSelect={(date) => {
                        setCustomStartDate(date);
                        if (date) setSelectedDateRange("custom");
                      }}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground">-</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[130px] justify-start text-left font-normal",
                        !customEndDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {customEndDate ? format(customEndDate, "MMM d, yyyy") : "End"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={customEndDate}
                      onSelect={(date) => {
                        setCustomEndDate(date);
                        if (date) setSelectedDateRange("custom");
                      }}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4">
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

            
            {/* My Work Orders Toggle */}
            <button
              onClick={() => setShowMyWorkOrders(!showMyWorkOrders)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                showMyWorkOrders
                  ? "bg-accent text-accent-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              <User className="w-4 h-4" />
              My WOs ({myWorkOrdersCount})
            </button>
          </div>
          
          {/* Sort & View Toggle */}
          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[150px] bg-secondary border-0">
                <ArrowUpDown className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === "grid"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === "list"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Not assigned to department warning */}
        {!profile?.department_id && (
          <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg text-warning">
            You are not assigned to a department. Please contact an administrator.
          </div>
        )}

        {/* Work Orders Grid/List */}
        <div className={
          viewMode === "grid" 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            : "flex flex-col gap-3"
        }>
          {filteredWorkOrders.map((workOrder, index) => (
            <div
              key={workOrder.id}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <WorkOrderCard 
                workOrder={{
                  id: workOrder.id,
                  title: workOrder.title,
                  description: workOrder.description || "",
                  location: workOrder.location || "",
                  priority: workOrder.priority as "critical" | "high" | "medium" | "low",
                  status: workOrder.status as "open" | "in-progress" | "pending" | "completed",
                  createdBy: workOrder.creator_name,
                  dueDate: workOrder.due_date || undefined,
                  createdAt: format(new Date(workOrder.created_at), "MMM d, yyyy h:mm a"),
                }}
                onClick={() => setSelectedWorkOrder(workOrder)}
                variant={viewMode}
              />
            </div>
          ))}
        </div>

        {filteredWorkOrders.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {workOrders.length === 0 
                ? "No work orders yet. Create your first work order to get started."
                : "No work orders found matching your criteria."
              }
            </p>
          </div>
        )}
      </div>

      {/* Create Work Order Modal */}
      <CreateWorkOrderModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateWorkOrder}
        departments={hierarchicalDepartments}
      />

      {/* Work Order Detail Modal */}
      <WorkOrderDetailModal
        open={!!selectedWorkOrder}
        onClose={() => setSelectedWorkOrder(null)}
        workOrder={selectedWorkOrder}
        onUpdate={handleUpdateWorkOrder}
        departments={hierarchicalDepartments}
      />
    </AppLayout>
  );
}

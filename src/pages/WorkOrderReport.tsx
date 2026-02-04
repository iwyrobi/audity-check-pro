import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Download,
  Calendar,
  Wrench,
  Loader2,
  FileSpreadsheet,
  FileText,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkOrders } from "@/hooks/useWorkOrders";
import { useDepartments } from "@/hooks/useDepartments";
import { useToast } from "@/hooks/use-toast";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  format,
  startOfDay,
  startOfWeek,
  startOfMonth,
  endOfDay,
  isAfter,
  isBefore,
  subDays,
} from "date-fns";

const dateFilters = [
  { value: "today", label: "Today" },
  { value: "this-week", label: "This Week" },
  { value: "this-month", label: "This Month" },
  { value: "last-30-days", label: "Last 30 Days" },
  { value: "custom", label: "Custom Range" },
  { value: "all", label: "All Time" },
];

const statusFilters = [
  { value: "all", label: "All Status" },
  { value: "open", label: "Open" },
  { value: "in-progress", label: "In Progress" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
];

const priorityFilters = [
  { value: "all", label: "All Priorities" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

export default function WorkOrderReport() {
  const [selectedDateRange, setSelectedDateRange] = useState("this-month");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [exporting, setExporting] = useState(false);

  const { workOrders, loading } = useWorkOrders();
  const { hierarchicalDepartments } = useDepartments();
  const { toast } = useToast();

  const getDateRange = (): { start: Date | null; end: Date | null } => {
    const now = new Date();
    switch (selectedDateRange) {
      case "today":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "this-week":
        return { start: startOfWeek(now), end: endOfDay(now) };
      case "this-month":
        return { start: startOfMonth(now), end: endOfDay(now) };
      case "last-30-days":
        return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
      case "custom":
        return {
          start: customStartDate ? startOfDay(customStartDate) : null,
          end: customEndDate ? endOfDay(customEndDate) : null,
        };
      default:
        return { start: null, end: null };
    }
  };

  const filteredWorkOrders = useMemo(() => {
    const { start, end } = getDateRange();
    
    return workOrders.filter((wo) => {
      // Date filter
      const itemDate = new Date(wo.created_at);
      const afterStart = !start || isAfter(itemDate, start) || itemDate.getTime() === start.getTime();
      const beforeEnd = !end || isBefore(itemDate, end) || itemDate.getTime() === end.getTime();
      if (!afterStart || !beforeEnd) return false;

      // Department filter
      if (selectedDepartmentId !== "all" && wo.department_id !== selectedDepartmentId) return false;

      // Status filter
      if (selectedStatus !== "all" && wo.status !== selectedStatus) return false;

      // Priority filter
      if (selectedPriority !== "all" && wo.priority !== selectedPriority) return false;

      return true;
    });
  }, [workOrders, selectedDateRange, customStartDate, customEndDate, selectedDepartmentId, selectedStatus, selectedPriority]);

  // Calculate stats
  const stats = useMemo(() => {
    const open = filteredWorkOrders.filter((wo) => wo.status === "open").length;
    const inProgress = filteredWorkOrders.filter((wo) => wo.status === "in-progress").length;
    const pending = filteredWorkOrders.filter((wo) => wo.status === "pending").length;
    const completed = filteredWorkOrders.filter((wo) => wo.status === "completed").length;
    const critical = filteredWorkOrders.filter((wo) => wo.priority === "critical").length;
    
    return { total: filteredWorkOrders.length, open, inProgress, pending, completed, critical };
  }, [filteredWorkOrders]);

  const getDepartmentName = (deptId: string) => {
    const dept = hierarchicalDepartments.find((d) => d.id === deptId);
    return dept?.name || "Unknown";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-info/10 text-info";
      case "in-progress": return "bg-warning/10 text-warning";
      case "pending": return "bg-muted text-muted-foreground";
      case "completed": return "bg-success/10 text-success";
      default: return "";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "text-destructive";
      case "high": return "text-warning";
      case "medium": return "text-info";
      case "low": return "text-muted-foreground";
      default: return "";
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 15;

      // Title
      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      pdf.text("Work Order Report", margin, 20);
      
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Generated on ${format(new Date(), "MMMM d, yyyy")}`, margin, 28);
      pdf.text(`Date Range: ${dateFilters.find(f => f.value === selectedDateRange)?.label || "All Time"}`, margin, 34);
      if (selectedDepartmentId !== "all") {
        pdf.text(`Department: ${getDepartmentName(selectedDepartmentId)}`, margin, 40);
      }

      // Summary
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Summary", margin, 52);
      
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      const summary = [
        `Total Work Orders: ${stats.total}`,
        `Open: ${stats.open}`,
        `In Progress: ${stats.inProgress}`,
        `Pending: ${stats.pending}`,
        `Completed: ${stats.completed}`,
        `Critical Priority: ${stats.critical}`,
      ];
      summary.forEach((text, i) => {
        pdf.text(text, margin, 60 + i * 6);
      });

      // Table
      pdf.addPage();
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Work Order Details", margin, 20);

      const headers = ["Title", "Department", "Status", "Priority", "Location", "Date"];
      const colWidths = [70, 45, 35, 30, 40, 35];
      let startX = margin;
      let startY = 30;

      pdf.setFillColor(240, 240, 240);
      pdf.rect(margin, startY - 5, pageWidth - margin * 2, 10, "F");
      
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      headers.forEach((header, i) => {
        pdf.text(header, startX, startY);
        startX += colWidths[i];
      });

      pdf.setFont("helvetica", "normal");
      startY += 10;

      filteredWorkOrders.forEach((wo) => {
        if (startY > 180) {
          pdf.addPage();
          startY = 20;
        }
        startX = margin;
        const row = [
          wo.title.length > 30 ? wo.title.substring(0, 27) + "..." : wo.title,
          getDepartmentName(wo.department_id),
          wo.status.charAt(0).toUpperCase() + wo.status.slice(1).replace("-", " "),
          wo.priority.charAt(0).toUpperCase() + wo.priority.slice(1),
          (wo.location || "—").length > 15 ? (wo.location || "").substring(0, 12) + "..." : (wo.location || "—"),
          format(new Date(wo.created_at), "MMM d, yyyy"),
        ];
        row.forEach((cell, i) => {
          pdf.text(cell, startX, startY);
          startX += colWidths[i];
        });
        startY += 8;
      });

      pdf.save(`work-order-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast({ title: "Export Complete", description: "PDF report downloaded successfully" });
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast({ title: "Export Failed", description: "Failed to generate PDF", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.utils.book_new();

      // Details sheet
      const data = filteredWorkOrders.map((wo) => ({
        Title: wo.title,
        Description: wo.description || "",
        Department: getDepartmentName(wo.department_id),
        Status: wo.status.charAt(0).toUpperCase() + wo.status.slice(1).replace("-", " "),
        Priority: wo.priority.charAt(0).toUpperCase() + wo.priority.slice(1),
        Location: wo.location || "",
        "Created By": wo.creator_name || "",
        "Due Date": wo.due_date ? format(new Date(wo.due_date), "yyyy-MM-dd") : "",
        "Created Date": format(new Date(wo.created_at), "yyyy-MM-dd"),
        "Completed Date": wo.completed_at ? format(new Date(wo.completed_at), "yyyy-MM-dd") : "",
      }));
      const sheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, sheet, "Work Orders");

      // Summary sheet
      const summaryData = [
        { Metric: "Total Work Orders", Value: stats.total },
        { Metric: "Open", Value: stats.open },
        { Metric: "In Progress", Value: stats.inProgress },
        { Metric: "Pending", Value: stats.pending },
        { Metric: "Completed", Value: stats.completed },
        { Metric: "Critical Priority", Value: stats.critical },
      ];
      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

      XLSX.writeFile(workbook, `work-order-report-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
      toast({ title: "Export Complete", description: "Excel report downloaded successfully" });
    } catch (error) {
      console.error("Error exporting Excel:", error);
      toast({ title: "Export Failed", description: "Failed to generate Excel", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Work Order Report">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Work Order Report">
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="w-4 h-4 text-muted-foreground" />
            
            {/* Department Filter */}
            <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
              <SelectTrigger className="w-[180px] bg-background">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">All Departments</SelectItem>
                {hierarchicalDepartments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.displayName || dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Range Filter */}
            <Select value={selectedDateRange} onValueChange={setSelectedDateRange}>
              <SelectTrigger className="w-[150px] bg-background">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {dateFilters.map((filter) => (
                  <SelectItem key={filter.value} value={filter.value}>
                    {filter.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Custom Date Pickers */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[120px] justify-start text-left font-normal",
                    !customStartDate && "text-muted-foreground"
                  )}
                >
                  {customStartDate ? format(customStartDate, "MMM d") : "Start"}
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
                    "w-[120px] justify-start text-left font-normal",
                    !customEndDate && "text-muted-foreground"
                  )}
                >
                  {customEndDate ? format(customEndDate, "MMM d") : "End"}
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

            {/* Status Filter */}
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[140px] bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {statusFilters.map((filter) => (
                  <SelectItem key={filter.value} value={filter.value}>
                    {filter.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Priority Filter */}
            <Select value={selectedPriority} onValueChange={setSelectedPriority}>
              <SelectTrigger className="w-[140px] bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {priorityFilters.map((filter) => (
                  <SelectItem key={filter.value} value={filter.value}>
                    {filter.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Export Buttons */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button disabled={exporting}>
                {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover">
              <DropdownMenuItem onClick={handleExportPDF}>
                <FileText className="w-4 h-4 mr-2" />
                Export PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportExcel}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="stat-card">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-muted-foreground">Open</p>
            <p className="text-2xl font-bold text-info">{stats.open}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-muted-foreground">In Progress</p>
            <p className="text-2xl font-bold text-warning">{stats.inProgress}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold text-muted-foreground">{stats.pending}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold text-success">{stats.completed}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-muted-foreground">Critical</p>
            <p className="text-2xl font-bold text-destructive">{stats.critical}</p>
          </div>
        </div>

        {/* Data Table */}
        <div className="stat-card overflow-hidden">
          <div className="flex items-center gap-2 mb-4">
            <Wrench className="w-5 h-5 text-accent" />
            <h3 className="font-semibold">Work Order Details</h3>
            <Badge variant="secondary" className="ml-auto">
              {filteredWorkOrders.length} records
            </Badge>
          </div>
          
          <div className="border border-border rounded-lg overflow-auto max-h-[500px]">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWorkOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No work orders found matching your filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredWorkOrders.map((wo) => (
                    <TableRow key={wo.id}>
                      <TableCell className="font-medium">{wo.title}</TableCell>
                      <TableCell>{getDepartmentName(wo.department_id)}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(wo.status)}>
                          {wo.status.charAt(0).toUpperCase() + wo.status.slice(1).replace("-", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={cn("font-medium", getPriorityColor(wo.priority))}>
                          {wo.priority.charAt(0).toUpperCase() + wo.priority.slice(1)}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{wo.location || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{wo.creator_name || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(wo.created_at), "MMM d, yyyy")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

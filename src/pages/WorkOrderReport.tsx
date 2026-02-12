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

  // Calculate overdue work orders
  const overdueCount = useMemo(() => {
    return filteredWorkOrders.filter(wo => 
      wo.status !== "completed" && wo.due_date && new Date(wo.due_date) < new Date()
    ).length;
  }, [filteredWorkOrders]);

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
      pdf.text(`Generated on ${format(new Date(), "MMMM d, yyyy HH:mm")}`, margin, 28);
      pdf.text(`Date Range: ${dateFilters.find(f => f.value === selectedDateRange)?.label || "All Time"}`, margin, 34);
      
      let filterY = 40;
      if (selectedDepartmentId !== "all") {
        pdf.text(`Department: ${getDepartmentName(selectedDepartmentId)}`, margin, filterY);
        filterY += 6;
      }
      if (selectedStatus !== "all") {
        pdf.text(`Status: ${statusFilters.find(f => f.value === selectedStatus)?.label}`, margin, filterY);
        filterY += 6;
      }
      if (selectedPriority !== "all") {
        pdf.text(`Priority: ${priorityFilters.find(f => f.value === selectedPriority)?.label}`, margin, filterY);
        filterY += 6;
      }

      // Summary
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Summary", margin, filterY + 8);
      
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      const summary = [
        `Total Work Orders: ${stats.total}`,
        `Open: ${stats.open}`,
        `In Progress: ${stats.inProgress}`,
        `Pending: ${stats.pending}`,
        `Completed: ${stats.completed}`,
        `Critical Priority: ${stats.critical}`,
        `Overdue: ${overdueCount}`,
      ];
      summary.forEach((text, i) => {
        pdf.text(text, margin, filterY + 16 + i * 6);
      });

      // Detailed list
      pdf.addPage();
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Work Order Details", margin, 20);

      let startY = 30;
      const contentWidth = pageWidth - margin * 2;
      const labelX = margin;
      const valueX = margin + 45;

      filteredWorkOrders.forEach((wo, index) => {
        const isOverdue = wo.status !== "completed" && wo.due_date && new Date(wo.due_date) < new Date();
        const statusText = wo.status.charAt(0).toUpperCase() + wo.status.slice(1).replace("-", " ");
        const priorityText = wo.priority.charAt(0).toUpperCase() + wo.priority.slice(1);

        // Check if we need a new page (each card ~60mm tall)
        if (startY > 150) {
          pdf.addPage();
          startY = 20;
        }

        // Card background
        pdf.setFillColor(248, 248, 248);
        pdf.setDrawColor(220, 220, 220);
        pdf.roundedRect(margin, startY - 5, contentWidth, 58, 2, 2, "FD");

        // Card header: # and title
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        pdf.text(`#${index + 1}  ${wo.title}`, margin + 4, startY + 2);

        // Status & Priority badges on same line
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        const badgeText = `${statusText}  |  ${priorityText}${isOverdue ? "  |  ⚠ OVERDUE" : ""}`;
        pdf.text(badgeText, margin + 4, startY + 9);

        // Details in two columns
        pdf.setFontSize(9);
        const col1X = margin + 4;
        const col2X = margin + contentWidth / 2;
        let detailY = startY + 18;

        // Column 1
        pdf.setFont("helvetica", "bold");
        pdf.text("Department:", col1X, detailY);
        pdf.setFont("helvetica", "normal");
        pdf.text(getDepartmentName(wo.department_id), col1X + 30, detailY);

        pdf.setFont("helvetica", "bold");
        pdf.text("Created By:", col1X, detailY + 7);
        pdf.setFont("helvetica", "normal");
        pdf.text(wo.creator_name || "Unknown", col1X + 30, detailY + 7);

        pdf.setFont("helvetica", "bold");
        pdf.text("Location:", col1X, detailY + 14);
        pdf.setFont("helvetica", "normal");
        pdf.text(wo.location || "—", col1X + 30, detailY + 14);

        // Column 2
        pdf.setFont("helvetica", "bold");
        pdf.text("Created:", col2X, detailY);
        pdf.setFont("helvetica", "normal");
        pdf.text(format(new Date(wo.created_at), "MMM d, yyyy h:mm a"), col2X + 25, detailY);

        pdf.setFont("helvetica", "bold");
        pdf.text("Due Date:", col2X, detailY + 7);
        pdf.setFont("helvetica", "normal");
        pdf.text(wo.due_date ? format(new Date(wo.due_date), "MMM d, yyyy") : "—", col2X + 25, detailY + 7);

        pdf.setFont("helvetica", "bold");
        pdf.text("Completed:", col2X, detailY + 14);
        pdf.setFont("helvetica", "normal");
        pdf.text(wo.completed_at ? format(new Date(wo.completed_at), "MMM d, yyyy h:mm a") : "—", col2X + 25, detailY + 14);

        // Description row
        if (wo.description) {
          pdf.setFont("helvetica", "bold");
          pdf.text("Description:", col1X, detailY + 23);
          pdf.setFont("helvetica", "normal");
          const descText = wo.description.length > 120 ? wo.description.substring(0, 117) + "..." : wo.description;
          pdf.text(descText, col1X + 30, detailY + 23);
        }

        startY += 65;
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

      // Details sheet with more columns
      const data = filteredWorkOrders.map((wo) => {
        const isOverdue = wo.status !== "completed" && wo.due_date && new Date(wo.due_date) < new Date();
        return {
          Title: wo.title,
          Description: wo.description || "",
          Department: getDepartmentName(wo.department_id),
          "Created By": wo.creator_name || "Unknown",
          Status: wo.status.charAt(0).toUpperCase() + wo.status.slice(1).replace("-", " "),
          Priority: wo.priority.charAt(0).toUpperCase() + wo.priority.slice(1),
          Location: wo.location || "",
          "Due Date": wo.due_date ? format(new Date(wo.due_date), "yyyy-MM-dd") : "",
          "Is Overdue": isOverdue ? "Yes" : "No",
          "Created Date": format(new Date(wo.created_at), "yyyy-MM-dd HH:mm"),
          "Completed Date": wo.completed_at ? format(new Date(wo.completed_at), "yyyy-MM-dd HH:mm") : "",
          "Duration (Days)": wo.completed_at
            ? Math.ceil((new Date(wo.completed_at).getTime() - new Date(wo.created_at).getTime()) / (1000 * 60 * 60 * 24))
            : "",
          "Linked Inspection": wo.linked_inspection_id ? "Yes" : "No",
          "Defect Question": wo.linked_defect_question || "",
        };
      });
      const sheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, sheet, "Work Orders");

      // Summary sheet with more metrics
      const summaryData = [
        { Metric: "Report Generated", Value: format(new Date(), "yyyy-MM-dd HH:mm") },
        { Metric: "Date Range", Value: dateFilters.find(f => f.value === selectedDateRange)?.label || "All Time" },
        { Metric: "Department Filter", Value: selectedDepartmentId !== "all" ? getDepartmentName(selectedDepartmentId) : "All Departments" },
        { Metric: "Status Filter", Value: statusFilters.find(f => f.value === selectedStatus)?.label || "All" },
        { Metric: "Priority Filter", Value: priorityFilters.find(f => f.value === selectedPriority)?.label || "All" },
        { Metric: "", Value: "" },
        { Metric: "Total Work Orders", Value: stats.total },
        { Metric: "Open", Value: stats.open },
        { Metric: "In Progress", Value: stats.inProgress },
        { Metric: "Pending", Value: stats.pending },
        { Metric: "Completed", Value: stats.completed },
        { Metric: "Overdue", Value: overdueCount },
        { Metric: "", Value: "" },
        { Metric: "Critical Priority", Value: stats.critical },
        { Metric: "High Priority", Value: filteredWorkOrders.filter(wo => wo.priority === "high").length },
        { Metric: "Medium Priority", Value: filteredWorkOrders.filter(wo => wo.priority === "medium").length },
        { Metric: "Low Priority", Value: filteredWorkOrders.filter(wo => wo.priority === "low").length },
      ];
      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

      // Department breakdown sheet
      const deptBreakdown = hierarchicalDepartments.map(dept => {
        const deptWOs = filteredWorkOrders.filter(wo => wo.department_id === dept.id);
        return {
          Department: dept.name,
          "Total Work Orders": deptWOs.length,
          Open: deptWOs.filter(wo => wo.status === "open").length,
          "In Progress": deptWOs.filter(wo => wo.status === "in-progress").length,
          Pending: deptWOs.filter(wo => wo.status === "pending").length,
          Completed: deptWOs.filter(wo => wo.status === "completed").length,
          Critical: deptWOs.filter(wo => wo.priority === "critical").length,
          Overdue: deptWOs.filter(wo => wo.status !== "completed" && wo.due_date && new Date(wo.due_date) < new Date()).length,
        };
      }).filter(d => d["Total Work Orders"] > 0);
      
      if (deptBreakdown.length > 0) {
        const deptSheet = XLSX.utils.json_to_sheet(deptBreakdown);
        XLSX.utils.book_append_sheet(workbook, deptSheet, "By Department");
      }

      // Priority breakdown sheet
      const priorityBreakdown = [
        { Priority: "Critical", Count: stats.critical },
        { Priority: "High", Count: filteredWorkOrders.filter(wo => wo.priority === "high").length },
        { Priority: "Medium", Count: filteredWorkOrders.filter(wo => wo.priority === "medium").length },
        { Priority: "Low", Count: filteredWorkOrders.filter(wo => wo.priority === "low").length },
      ];
      const prioritySheet = XLSX.utils.json_to_sheet(priorityBreakdown);
      XLSX.utils.book_append_sheet(workbook, prioritySheet, "By Priority");

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
        <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
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
          <div className="stat-card">
            <p className="text-sm text-muted-foreground">Overdue</p>
            <p className="text-2xl font-bold text-destructive">{overdueCount}</p>
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
                  <TableHead>Created By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Created</TableHead>
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
                  filteredWorkOrders.map((wo) => {
                    const isOverdue = wo.status !== "completed" && wo.due_date && new Date(wo.due_date) < new Date();
                    return (
                      <TableRow key={wo.id}>
                        <TableCell className="font-medium max-w-[200px] truncate">{wo.title}</TableCell>
                        <TableCell>{getDepartmentName(wo.department_id)}</TableCell>
                        <TableCell className="text-muted-foreground">{wo.creator_name || "Unknown"}</TableCell>
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
                        <TableCell>
                          {wo.due_date ? (
                            <span className={cn(isOverdue && "text-destructive font-medium")}>
                              {format(new Date(wo.due_date), "MMM d, yyyy")}
                              {isOverdue && " ⚠"}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(wo.created_at), "MMM d, yyyy")}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

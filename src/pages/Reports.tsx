import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  ClipboardCheck,
  Wrench,
  Loader2,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInspections } from "@/hooks/useInspections";
import { useWorkOrders } from "@/hooks/useWorkOrders";
import { useDepartments } from "@/hooks/useDepartments";
import { useAuth } from "@/contexts/AuthContext";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
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
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
} from "date-fns";

const dateFilters = [
  { value: "today", label: "Today" },
  { value: "this-week", label: "This Week" },
  { value: "this-month", label: "This Month" },
  { value: "last-30-days", label: "Last 30 Days" },
  { value: "custom", label: "Custom Range" },
  { value: "all", label: "All Time" },
];

const CHART_COLORS = {
  primary: "hsl(var(--primary))",
  success: "hsl(var(--success))",
  warning: "hsl(var(--warning))",
  destructive: "hsl(var(--destructive))",
  info: "hsl(var(--info))",
  accent: "hsl(var(--accent))",
  muted: "hsl(var(--muted-foreground))",
};

const PIE_COLORS = ["#22c55e", "#f59e0b", "#ef4444", "#3b82f6"];

export default function Reports() {
  const [selectedDateRange, setSelectedDateRange] = useState("this-month");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("all");
  const [exporting, setExporting] = useState(false);

  const { inspections, loading: inspectionsLoading } = useInspections();
  const { workOrders, loading: workOrdersLoading } = useWorkOrders();
  const { departments } = useDepartments();
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const loading = inspectionsLoading || workOrdersLoading;

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

  const filterByDateRange = <T extends { created_at: string }>(items: T[]): T[] => {
    const { start, end } = getDateRange();
    return items.filter((item) => {
      const itemDate = new Date(item.created_at);
      const afterStart = !start || isAfter(itemDate, start) || itemDate.getTime() === start.getTime();
      const beforeEnd = !end || isBefore(itemDate, end) || itemDate.getTime() === end.getTime();
      return afterStart && beforeEnd;
    });
  };

  const filteredInspections = useMemo(() => {
    let filtered = filterByDateRange(inspections);
    if (selectedDepartmentId !== "all") {
      filtered = filtered.filter((i) => i.department_id === selectedDepartmentId);
    }
    return filtered;
  }, [inspections, selectedDateRange, customStartDate, customEndDate, selectedDepartmentId]);

  const filteredWorkOrders = useMemo(() => {
    let filtered = filterByDateRange(workOrders);
    if (selectedDepartmentId !== "all") {
      filtered = filtered.filter((wo) => wo.department_id === selectedDepartmentId);
    }
    return filtered;
  }, [workOrders, selectedDateRange, customStartDate, customEndDate, selectedDepartmentId]);

  // Calculate stats
  const inspectionStats = useMemo(() => {
    const completed = filteredInspections.filter((i) => i.status === "completed");
    const drafts = filteredInspections.filter((i) => i.status === "in-progress");
    const avgScore = completed.length > 0
      ? Math.round(completed.reduce((acc, i) => acc + (i.percentage || 0), 0) / completed.length)
      : 0;
    const defects = completed.filter((i) => (i.percentage || 0) < 80).length;
    
    return { total: filteredInspections.length, completed: completed.length, drafts: drafts.length, avgScore, defects };
  }, [filteredInspections]);

  const workOrderStats = useMemo(() => {
    const open = filteredWorkOrders.filter((wo) => wo.status === "open").length;
    const inProgress = filteredWorkOrders.filter((wo) => wo.status === "in-progress").length;
    const pending = filteredWorkOrders.filter((wo) => wo.status === "pending").length;
    const completed = filteredWorkOrders.filter((wo) => wo.status === "completed").length;
    const critical = filteredWorkOrders.filter((wo) => wo.priority === "critical").length;
    
    return { total: filteredWorkOrders.length, open, inProgress, pending, completed, critical };
  }, [filteredWorkOrders]);

  // Chart data
  const workOrderStatusData = useMemo(() => [
    { name: "Open", value: workOrderStats.open, color: PIE_COLORS[3] },
    { name: "In Progress", value: workOrderStats.inProgress, color: PIE_COLORS[1] },
    { name: "Pending", value: workOrderStats.pending, color: PIE_COLORS[2] },
    { name: "Completed", value: workOrderStats.completed, color: PIE_COLORS[0] },
  ].filter(d => d.value > 0), [workOrderStats]);

  const workOrderPriorityData = useMemo(() => {
    const critical = filteredWorkOrders.filter((wo) => wo.priority === "critical").length;
    const high = filteredWorkOrders.filter((wo) => wo.priority === "high").length;
    const medium = filteredWorkOrders.filter((wo) => wo.priority === "medium").length;
    const low = filteredWorkOrders.filter((wo) => wo.priority === "low").length;
    
    return [
      { name: "Critical", value: critical, color: "#ef4444" },
      { name: "High", value: high, color: "#f59e0b" },
      { name: "Medium", value: medium, color: "#3b82f6" },
      { name: "Low", value: low, color: "#22c55e" },
    ].filter(d => d.value > 0);
  }, [filteredWorkOrders]);

  const trendData = useMemo(() => {
    const { start, end } = getDateRange();
    if (!start || !end) return [];
    
    const days = eachDayOfInterval({ start, end }).slice(-14); // Last 14 days max
    
    return days.map((day) => {
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);
      
      const inspCount = filteredInspections.filter((i) => {
        const date = new Date(i.created_at);
        return date >= dayStart && date <= dayEnd;
      }).length;
      
      const woCount = filteredWorkOrders.filter((wo) => {
        const date = new Date(wo.created_at);
        return date >= dayStart && date <= dayEnd;
      }).length;
      
      return {
        date: format(day, "MMM d"),
        inspections: inspCount,
        workOrders: woCount,
      };
    });
  }, [filteredInspections, filteredWorkOrders, selectedDateRange, customStartDate, customEndDate]);

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
      pdf.text("Analytics Report", margin, 20);
      
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Generated on ${format(new Date(), "MMMM d, yyyy")}`, margin, 28);
      pdf.text(`Date Range: ${selectedDateRange === "custom" && customStartDate && customEndDate 
        ? `${format(customStartDate, "MMM d, yyyy")} - ${format(customEndDate, "MMM d, yyyy")}`
        : dateFilters.find(f => f.value === selectedDateRange)?.label || "All Time"}`, margin, 34);

      // Inspection Summary
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Inspection Summary", margin, 48);
      
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      const inspSummary = [
        `Total Inspections: ${inspectionStats.total}`,
        `Completed: ${inspectionStats.completed}`,
        `Drafts: ${inspectionStats.drafts}`,
        `Average Score: ${inspectionStats.avgScore}%`,
        `Defects Found: ${inspectionStats.defects}`,
      ];
      inspSummary.forEach((text, i) => {
        pdf.text(text, margin, 56 + i * 6);
      });

      // Work Order Summary
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Work Order Summary", pageWidth / 2, 48);
      
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      const woSummary = [
        `Total Work Orders: ${workOrderStats.total}`,
        `Open: ${workOrderStats.open}`,
        `In Progress: ${workOrderStats.inProgress}`,
        `Pending: ${workOrderStats.pending}`,
        `Completed: ${workOrderStats.completed}`,
        `Critical Priority: ${workOrderStats.critical}`,
      ];
      woSummary.forEach((text, i) => {
        pdf.text(text, pageWidth / 2, 56 + i * 6);
      });

      // Recent Inspections Table
      pdf.addPage();
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Recent Inspections", margin, 20);

      const inspHeaders = ["Title", "Status", "Score", "Date"];
      const inspColWidths = [100, 40, 30, 50];
      let startX = margin;
      let startY = 30;

      pdf.setFillColor(240, 240, 240);
      pdf.rect(margin, startY - 5, pageWidth - margin * 2, 10, "F");
      
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      inspHeaders.forEach((header, i) => {
        pdf.text(header, startX, startY);
        startX += inspColWidths[i];
      });

      pdf.setFont("helvetica", "normal");
      startY += 10;

      filteredInspections.slice(0, 20).forEach((insp) => {
        if (startY > 180) {
          pdf.addPage();
          startY = 20;
        }
        startX = margin;
        const row = [
          insp.title.length > 40 ? insp.title.substring(0, 37) + "..." : insp.title,
          insp.status === "completed" ? "Completed" : "Draft",
          insp.percentage !== null ? `${Math.round(insp.percentage)}%` : "N/A",
          format(new Date(insp.created_at), "MMM d, yyyy"),
        ];
        row.forEach((cell, i) => {
          pdf.text(cell, startX, startY);
          startX += inspColWidths[i];
        });
        startY += 8;
      });

      pdf.save(`analytics-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
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

      // Inspections sheet
      const inspData = filteredInspections.map((i) => {
        const dept = departments.find((d) => d.id === i.department_id);
        return {
          Title: i.title,
          Status: i.status === "completed" ? "Completed" : "Draft",
          Department: dept?.name || "Unknown",
          Score: i.percentage !== null ? `${Math.round(i.percentage)}%` : "N/A",
          "Total Score": i.total_score || 0,
          "Max Score": i.max_score || 0,
          Location: i.location || "",
          "Created Date": format(new Date(i.created_at), "yyyy-MM-dd"),
          "Completed Date": i.completed_at ? format(new Date(i.completed_at), "yyyy-MM-dd") : "",
        };
      });
      const inspSheet = XLSX.utils.json_to_sheet(inspData);
      XLSX.utils.book_append_sheet(workbook, inspSheet, "Inspections");

      // Work Orders sheet
      const woData = filteredWorkOrders.map((wo) => {
        const dept = departments.find((d) => d.id === wo.department_id);
        return {
          Title: wo.title,
          Description: wo.description || "",
          Status: wo.status,
          Priority: wo.priority,
          Department: dept?.name || "Unknown",
          Location: wo.location || "",
          "Due Date": wo.due_date ? format(new Date(wo.due_date), "yyyy-MM-dd") : "",
          "Created Date": format(new Date(wo.created_at), "yyyy-MM-dd"),
          "Completed Date": wo.completed_at ? format(new Date(wo.completed_at), "yyyy-MM-dd") : "",
        };
      });
      const woSheet = XLSX.utils.json_to_sheet(woData);
      XLSX.utils.book_append_sheet(workbook, woSheet, "Work Orders");

      // Summary sheet
      const summaryData = [
        { Metric: "Total Inspections", Value: inspectionStats.total },
        { Metric: "Completed Inspections", Value: inspectionStats.completed },
        { Metric: "Draft Inspections", Value: inspectionStats.drafts },
        { Metric: "Average Score", Value: `${inspectionStats.avgScore}%` },
        { Metric: "Defects Found", Value: inspectionStats.defects },
        { Metric: "", Value: "" },
        { Metric: "Total Work Orders", Value: workOrderStats.total },
        { Metric: "Open Work Orders", Value: workOrderStats.open },
        { Metric: "In Progress", Value: workOrderStats.inProgress },
        { Metric: "Pending", Value: workOrderStats.pending },
        { Metric: "Completed Work Orders", Value: workOrderStats.completed },
        { Metric: "Critical Priority", Value: workOrderStats.critical },
      ];
      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

      XLSX.writeFile(workbook, `analytics-report-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
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
      <AppLayout title="Reports">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Reports">
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
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

            {isAdmin && (
              <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
                <SelectTrigger className="w-full sm:w-[180px] bg-background">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Export Button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button disabled={exporting} className="bg-accent text-accent-foreground hover:bg-accent/90">
                  {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover">
                <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer">
                  <FileText className="w-4 h-4 mr-2" />
                  Export to PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportExcel} className="cursor-pointer">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Export to Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="stat-card">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <ClipboardCheck className="w-4 h-4" />
              <span className="text-xs">Inspections</span>
            </div>
            <p className="text-2xl font-bold">{inspectionStats.total}</p>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs">Completed</span>
            </div>
            <p className="text-2xl font-bold text-success">{inspectionStats.completed}</p>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs">Avg Score</span>
            </div>
            <p className={cn("text-2xl font-bold", inspectionStats.avgScore >= 80 ? "text-success" : inspectionStats.avgScore >= 60 ? "text-warning" : "text-destructive")}>
              {inspectionStats.avgScore}%
            </p>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Wrench className="w-4 h-4" />
              <span className="text-xs">Work Orders</span>
            </div>
            <p className="text-2xl font-bold">{workOrderStats.total}</p>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs">Open WOs</span>
            </div>
            <p className="text-2xl font-bold text-info">{workOrderStats.open}</p>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs">Critical</span>
            </div>
            <p className="text-2xl font-bold text-destructive">{workOrderStats.critical}</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trend Chart */}
          <div className="action-card">
            <h3 className="font-semibold mb-4">Activity Trend</h3>
            <div className="h-64">
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="inspections" stroke="#3b82f6" strokeWidth={2} name="Inspections" />
                    <Line type="monotone" dataKey="workOrders" stroke="#f59e0b" strokeWidth={2} name="Work Orders" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No data available for selected period
                </div>
              )}
            </div>
          </div>

          {/* Work Order Status Pie */}
          <div className="action-card">
            <h3 className="font-semibold mb-4">Work Order Status</h3>
            <div className="h-64">
              {workOrderStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={workOrderStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {workOrderStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No work orders in selected period
                </div>
              )}
            </div>
          </div>

          {/* Work Order Priority Bar */}
          <div className="action-card lg:col-span-2">
            <h3 className="font-semibold mb-4">Work Order Priority Distribution</h3>
            <div className="h-64">
              {workOrderPriorityData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={workOrderPriorityData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis dataKey="name" type="category" tick={{ fill: "hsl(var(--muted-foreground))" }} width={80} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {workOrderPriorityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No work orders in selected period
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Data Tables */}
        <Tabs defaultValue="inspections" className="w-full">
          <TabsList>
            <TabsTrigger value="inspections" className="flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4" />
              Inspections ({filteredInspections.length})
            </TabsTrigger>
            <TabsTrigger value="workorders" className="flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              Work Orders ({filteredWorkOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inspections" className="mt-4">
            <div className="rounded-lg border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInspections.slice(0, 10).map((inspection) => {
                    const dept = departments.find((d) => d.id === inspection.department_id);
                    return (
                      <TableRow key={inspection.id}>
                        <TableCell className="font-medium">{inspection.title}</TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "status-badge",
                              inspection.status === "completed" ? "status-badge-success" : "status-badge-warning"
                            )}
                          >
                            {inspection.status === "completed" ? "Completed" : "Draft"}
                          </span>
                        </TableCell>
                        <TableCell>{dept?.name || "Unknown"}</TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "font-medium",
                              inspection.percentage !== null
                                ? inspection.percentage >= 80
                                  ? "text-success"
                                  : inspection.percentage >= 60
                                  ? "text-warning"
                                  : "text-destructive"
                                : "text-muted-foreground"
                            )}
                          >
                            {inspection.percentage !== null ? `${Math.round(inspection.percentage)}%` : "N/A"}
                          </span>
                        </TableCell>
                        <TableCell>{format(new Date(inspection.created_at), "MMM d, yyyy")}</TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredInspections.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No inspections found for selected period
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="workorders" className="mt-4">
            <div className="rounded-lg border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWorkOrders.slice(0, 10).map((wo) => {
                    const dept = departments.find((d) => d.id === wo.department_id);
                    return (
                      <TableRow key={wo.id}>
                        <TableCell className="font-medium">{wo.title}</TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "status-badge",
                              wo.status === "completed"
                                ? "status-badge-success"
                                : wo.status === "open"
                                ? "status-badge-info"
                                : wo.status === "in-progress"
                                ? "status-badge-warning"
                                : "status-badge-error"
                            )}
                          >
                            {wo.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "priority-badge",
                              wo.priority === "critical"
                                ? "priority-badge-critical"
                                : wo.priority === "high"
                                ? "priority-badge-high"
                                : wo.priority === "medium"
                                ? "priority-badge-medium"
                                : "priority-badge-low"
                            )}
                          >
                            {wo.priority}
                          </span>
                        </TableCell>
                        <TableCell>{dept?.name || "Unknown"}</TableCell>
                        <TableCell>{format(new Date(wo.created_at), "MMM d, yyyy")}</TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredWorkOrders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No work orders found for selected period
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

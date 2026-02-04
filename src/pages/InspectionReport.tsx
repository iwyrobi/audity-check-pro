import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Download,
  Calendar,
  ClipboardCheck,
  Loader2,
  FileSpreadsheet,
  FileText,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInspections } from "@/hooks/useInspections";
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
  { value: "completed", label: "Completed" },
  { value: "in-progress", label: "In Progress" },
];

const scoreFilters = [
  { value: "all", label: "All Scores" },
  { value: "90-100", label: "90-100% (Excellent)" },
  { value: "80-89", label: "80-89% (Good)" },
  { value: "70-79", label: "70-79% (Fair)" },
  { value: "below-70", label: "Below 70% (Poor)" },
];

export default function InspectionReport() {
  const [selectedDateRange, setSelectedDateRange] = useState("this-month");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedScore, setSelectedScore] = useState<string>("all");
  const [exporting, setExporting] = useState(false);

  const { inspections, loading } = useInspections();
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

  const filteredInspections = useMemo(() => {
    const { start, end } = getDateRange();
    
    return inspections.filter((insp) => {
      // Date filter
      const itemDate = new Date(insp.created_at);
      const afterStart = !start || isAfter(itemDate, start) || itemDate.getTime() === start.getTime();
      const beforeEnd = !end || isBefore(itemDate, end) || itemDate.getTime() === end.getTime();
      if (!afterStart || !beforeEnd) return false;

      // Department filter
      if (selectedDepartmentId !== "all" && insp.department_id !== selectedDepartmentId) return false;

      // Status filter
      if (selectedStatus !== "all" && insp.status !== selectedStatus) return false;

      // Score filter
      if (selectedScore !== "all") {
        const score = insp.percentage || 0;
        switch (selectedScore) {
          case "90-100":
            if (score < 90) return false;
            break;
          case "80-89":
            if (score < 80 || score >= 90) return false;
            break;
          case "70-79":
            if (score < 70 || score >= 80) return false;
            break;
          case "below-70":
            if (score >= 70) return false;
            break;
        }
      }

      return true;
    });
  }, [inspections, selectedDateRange, customStartDate, customEndDate, selectedDepartmentId, selectedStatus, selectedScore]);

  // Calculate stats
  const stats = useMemo(() => {
    const completed = filteredInspections.filter((i) => i.status === "completed");
    const avgScore = completed.length > 0
      ? Math.round(completed.reduce((acc, i) => acc + (i.percentage || 0), 0) / completed.length)
      : 0;
    const excellent = completed.filter((i) => (i.percentage || 0) >= 90).length;
    const poor = completed.filter((i) => (i.percentage || 0) < 70).length;
    const totalDefects = filteredInspections.reduce((acc, i) => acc + (i.defect_count || 0), 0);
    
    return { total: filteredInspections.length, completed: completed.length, avgScore, excellent, poor, totalDefects };
  }, [filteredInspections]);

  const getDepartmentName = (deptId: string) => {
    const dept = hierarchicalDepartments.find((d) => d.id === deptId);
    return dept?.name || "Unknown";
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
      pdf.text("Inspection Report", margin, 20);
      
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
      if (selectedScore !== "all") {
        pdf.text(`Score Filter: ${scoreFilters.find(f => f.value === selectedScore)?.label}`, margin, filterY);
        filterY += 6;
      }

      // Summary
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Summary", margin, filterY + 8);
      
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      const summary = [
        `Total Inspections: ${stats.total}`,
        `Completed: ${stats.completed}`,
        `In Progress: ${stats.total - stats.completed}`,
        `Average Score: ${stats.avgScore}%`,
        `Excellent (90%+): ${stats.excellent}`,
        `Poor (<70%): ${stats.poor}`,
        `Total Defects Found: ${stats.totalDefects}`,
      ];
      summary.forEach((text, i) => {
        pdf.text(text, margin, filterY + 16 + i * 6);
      });

      // Table
      pdf.addPage();
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Inspection Details", margin, 20);

      const headers = ["Title", "Template", "Department", "Inspector", "Status", "Score", "Defects", "Date"];
      const colWidths = [50, 40, 35, 35, 25, 20, 20, 30];
      let startX = margin;
      let startY = 30;

      pdf.setFillColor(240, 240, 240);
      pdf.rect(margin, startY - 5, pageWidth - margin * 2, 10, "F");
      
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      headers.forEach((header, i) => {
        pdf.text(header, startX, startY);
        startX += colWidths[i];
      });

      pdf.setFont("helvetica", "normal");
      startY += 10;

      filteredInspections.forEach((insp) => {
        if (startY > 180) {
          pdf.addPage();
          startY = 20;
        }
        startX = margin;
        const row = [
          insp.title.length > 25 ? insp.title.substring(0, 22) + "..." : insp.title,
          (insp.template_name || "N/A").length > 20 ? (insp.template_name || "").substring(0, 17) + "..." : (insp.template_name || "N/A"),
          getDepartmentName(insp.department_id).length > 18 ? getDepartmentName(insp.department_id).substring(0, 15) + "..." : getDepartmentName(insp.department_id),
          (insp.creator_name || "Unknown").length > 18 ? (insp.creator_name || "").substring(0, 15) + "..." : (insp.creator_name || "Unknown"),
          insp.status === "completed" ? "Done" : "In Prog",
          insp.percentage !== null ? `${Math.round(insp.percentage)}%` : "N/A",
          String(insp.defect_count || 0),
          format(new Date(insp.created_at), "MMM d, yyyy"),
        ];
        row.forEach((cell, i) => {
          pdf.text(cell, startX, startY);
          startX += colWidths[i];
        });
        startY += 8;
      });

      pdf.save(`inspection-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
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
      const data = filteredInspections.map((i) => ({
        Title: i.title,
        "Template Name": i.template_name || "N/A",
        Department: getDepartmentName(i.department_id),
        "Inspector Name": i.creator_name || "Unknown",
        Status: i.status === "completed" ? "Completed" : "In Progress",
        "Score (%)": i.percentage !== null ? Math.round(i.percentage) : "N/A",
        "Score Earned": i.total_score || 0,
        "Max Possible Score": i.max_score || 0,
        "Defects Found": i.defect_count || 0,
        Location: i.location || "",
        "Created Date": format(new Date(i.created_at), "yyyy-MM-dd HH:mm"),
        "Completed Date": i.completed_at ? format(new Date(i.completed_at), "yyyy-MM-dd HH:mm") : "",
        "Duration (Days)": i.completed_at 
          ? Math.ceil((new Date(i.completed_at).getTime() - new Date(i.created_at).getTime()) / (1000 * 60 * 60 * 24))
          : "",
      }));
      const sheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, sheet, "Inspections");

      // Summary sheet with more metrics
      const summaryData = [
        { Metric: "Report Generated", Value: format(new Date(), "yyyy-MM-dd HH:mm") },
        { Metric: "Date Range", Value: dateFilters.find(f => f.value === selectedDateRange)?.label || "All Time" },
        { Metric: "Department Filter", Value: selectedDepartmentId !== "all" ? getDepartmentName(selectedDepartmentId) : "All Departments" },
        { Metric: "Status Filter", Value: statusFilters.find(f => f.value === selectedStatus)?.label || "All" },
        { Metric: "Score Filter", Value: scoreFilters.find(f => f.value === selectedScore)?.label || "All" },
        { Metric: "", Value: "" },
        { Metric: "Total Inspections", Value: stats.total },
        { Metric: "Completed", Value: stats.completed },
        { Metric: "In Progress", Value: stats.total - stats.completed },
        { Metric: "Average Score", Value: `${stats.avgScore}%` },
        { Metric: "Excellent (90%+)", Value: stats.excellent },
        { Metric: "Good (80-89%)", Value: filteredInspections.filter(i => (i.percentage || 0) >= 80 && (i.percentage || 0) < 90).length },
        { Metric: "Fair (70-79%)", Value: filteredInspections.filter(i => (i.percentage || 0) >= 70 && (i.percentage || 0) < 80).length },
        { Metric: "Poor (<70%)", Value: stats.poor },
        { Metric: "Total Defects Found", Value: stats.totalDefects },
      ];
      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

      // Department breakdown sheet
      const deptBreakdown = hierarchicalDepartments.map(dept => {
        const deptInspections = filteredInspections.filter(i => i.department_id === dept.id);
        const completed = deptInspections.filter(i => i.status === "completed");
        const avgScore = completed.length > 0 
          ? Math.round(completed.reduce((acc, i) => acc + (i.percentage || 0), 0) / completed.length)
          : 0;
        return {
          Department: dept.name,
          "Total Inspections": deptInspections.length,
          Completed: completed.length,
          "In Progress": deptInspections.length - completed.length,
          "Average Score": `${avgScore}%`,
          "Total Defects": deptInspections.reduce((acc, i) => acc + (i.defect_count || 0), 0),
        };
      }).filter(d => d["Total Inspections"] > 0);
      
      if (deptBreakdown.length > 0) {
        const deptSheet = XLSX.utils.json_to_sheet(deptBreakdown);
        XLSX.utils.book_append_sheet(workbook, deptSheet, "By Department");
      }

      XLSX.writeFile(workbook, `inspection-report-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
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
      <AppLayout title="Inspection Report">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Inspection Report">
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

            {/* Score Filter */}
            <Select value={selectedScore} onValueChange={setSelectedScore}>
              <SelectTrigger className="w-[160px] bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {scoreFilters.map((filter) => (
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
            <p className="text-sm text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold text-success">{stats.completed}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-muted-foreground">Avg Score</p>
            <p className="text-2xl font-bold">{stats.avgScore}%</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-muted-foreground">Excellent</p>
            <p className="text-2xl font-bold text-primary">{stats.excellent}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-muted-foreground">Poor</p>
            <p className="text-2xl font-bold text-destructive">{stats.poor}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-muted-foreground">Defects</p>
            <p className="text-2xl font-bold text-warning">{stats.totalDefects}</p>
          </div>
        </div>

        {/* Data Table */}
        <div className="stat-card overflow-hidden">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardCheck className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Inspection Details</h3>
            <Badge variant="secondary" className="ml-auto">
              {filteredInspections.length} records
            </Badge>
          </div>
          
          <div className="border border-border rounded-lg overflow-auto max-h-[500px]">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Inspector</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Defects</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInspections.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No inspections found matching your filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInspections.map((insp) => (
                    <TableRow key={insp.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">{insp.title}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[150px] truncate">
                        {insp.template_name || "N/A"}
                      </TableCell>
                      <TableCell>{getDepartmentName(insp.department_id)}</TableCell>
                      <TableCell className="text-muted-foreground">{insp.creator_name || "Unknown"}</TableCell>
                      <TableCell>
                        <Badge variant={insp.status === "completed" ? "default" : "secondary"}>
                          {insp.status === "completed" ? "Completed" : "In Progress"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {insp.percentage !== null ? (
                          <span className={cn(
                            "font-medium",
                            insp.percentage >= 90 ? "text-success" :
                            insp.percentage >= 70 ? "text-warning" :
                            "text-destructive"
                          )}>
                            {Math.round(insp.percentage)}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {(insp.defect_count || 0) > 0 ? (
                          <Badge variant="destructive">{insp.defect_count}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(insp.created_at), "MMM d, yyyy")}
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

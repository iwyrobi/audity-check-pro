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
    
    return { total: filteredInspections.length, completed: completed.length, avgScore, excellent, poor };
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
        `Total Inspections: ${stats.total}`,
        `Completed: ${stats.completed}`,
        `Average Score: ${stats.avgScore}%`,
        `Excellent (90%+): ${stats.excellent}`,
        `Poor (<70%): ${stats.poor}`,
      ];
      summary.forEach((text, i) => {
        pdf.text(text, margin, 60 + i * 6);
      });

      // Table
      pdf.addPage();
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Inspection Details", margin, 20);

      const headers = ["Title", "Department", "Status", "Score", "Date"];
      const colWidths = [80, 50, 35, 25, 40];
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

      filteredInspections.forEach((insp) => {
        if (startY > 180) {
          pdf.addPage();
          startY = 20;
        }
        startX = margin;
        const row = [
          insp.title.length > 35 ? insp.title.substring(0, 32) + "..." : insp.title,
          getDepartmentName(insp.department_id),
          insp.status === "completed" ? "Completed" : "Draft",
          insp.percentage !== null ? `${Math.round(insp.percentage)}%` : "N/A",
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

      // Details sheet
      const data = filteredInspections.map((i) => ({
        Title: i.title,
        Department: getDepartmentName(i.department_id),
        Status: i.status === "completed" ? "Completed" : "Draft",
        Score: i.percentage !== null ? `${Math.round(i.percentage)}%` : "N/A",
        "Total Score": i.total_score || 0,
        "Max Score": i.max_score || 0,
        Location: i.location || "",
        "Created Date": format(new Date(i.created_at), "yyyy-MM-dd"),
        "Completed Date": i.completed_at ? format(new Date(i.completed_at), "yyyy-MM-dd") : "",
      }));
      const sheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, sheet, "Inspections");

      // Summary sheet
      const summaryData = [
        { Metric: "Total Inspections", Value: stats.total },
        { Metric: "Completed", Value: stats.completed },
        { Metric: "Average Score", Value: `${stats.avgScore}%` },
        { Metric: "Excellent (90%+)", Value: stats.excellent },
        { Metric: "Poor (<70%)", Value: stats.poor },
      ];
      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInspections.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No inspections found matching your filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInspections.map((insp) => (
                    <TableRow key={insp.id}>
                      <TableCell className="font-medium">{insp.title}</TableCell>
                      <TableCell>{getDepartmentName(insp.department_id)}</TableCell>
                      <TableCell>
                        <Badge variant={insp.status === "completed" ? "default" : "secondary"}>
                          {insp.status === "completed" ? "Completed" : "Draft"}
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
                      <TableCell className="text-muted-foreground">{insp.location || "—"}</TableCell>
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

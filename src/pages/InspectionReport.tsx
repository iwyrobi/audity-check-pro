import { useState, useMemo, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Download,
  Calendar,
  ClipboardCheck,
  Loader2,
  FileSpreadsheet,
  FileText,
  Filter,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInspections } from "@/hooks/useInspections";
import { useDepartments } from "@/hooks/useDepartments";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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

interface DefectItem {
  id: string;
  inspection_id: string;
  inspection_title: string;
  question_text: string;
  notes: string | null;
  created_at: string;
  department_id: string;
  inspector_name: string;
}

export default function InspectionReport() {
  const [selectedDateRange, setSelectedDateRange] = useState("this-month");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedScore, setSelectedScore] = useState<string>("all");
  const [exporting, setExporting] = useState(false);
  const [defects, setDefects] = useState<DefectItem[]>([]);
  const [loadingDefects, setLoadingDefects] = useState(true);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const { inspections, loading } = useInspections();
  const { hierarchicalDepartments } = useDepartments();
  const { toast } = useToast();

  // Fetch all defects
  useEffect(() => {
    const fetchDefects = async () => {
      setLoadingDefects(true);
      try {
        // Get all inspection answers that are defects
        const { data: answersData, error: answersError } = await supabase
          .from("inspection_answers")
          .select(`
            id,
            inspection_id,
            question_text,
            notes,
            created_at
          `)
          .eq("is_defect", true);

        if (answersError) throw answersError;

        // Map defects to their inspections
        const defectItems: DefectItem[] = [];
        
        for (const answer of answersData || []) {
          const inspection = inspections.find(i => i.id === answer.inspection_id);
          if (inspection) {
            defectItems.push({
              id: answer.id,
              inspection_id: answer.inspection_id,
              inspection_title: inspection.title,
              question_text: answer.question_text,
              notes: answer.notes,
              created_at: inspection.created_at,
              department_id: inspection.department_id,
              inspector_name: inspection.creator_name || "Unknown",
            });
          }
        }

        setDefects(defectItems);
      } catch (error) {
        console.error("Error fetching defects:", error);
      } finally {
        setLoadingDefects(false);
      }
    };

    if (!loading && inspections.length > 0) {
      fetchDefects();
    } else if (!loading) {
      setLoadingDefects(false);
    }
  }, [inspections, loading]);

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

  // Filtered defects based on date/department filters
  const filteredDefects = useMemo(() => {
    const { start, end } = getDateRange();
    
    return defects.filter((defect) => {
      // Date filter
      const itemDate = new Date(defect.created_at);
      const afterStart = !start || isAfter(itemDate, start) || itemDate.getTime() === start.getTime();
      const beforeEnd = !end || isBefore(itemDate, end) || itemDate.getTime() === end.getTime();
      if (!afterStart || !beforeEnd) return false;

      // Department filter
      if (selectedDepartmentId !== "all" && defect.department_id !== selectedDepartmentId) return false;

      return true;
    });
  }, [defects, selectedDateRange, customStartDate, customEndDate, selectedDepartmentId]);

  // Critical status inspections (score < 70%)
  const criticalInspections = useMemo(() => {
    return filteredInspections
      .filter((i) => i.status === "completed" && (i.percentage || 0) < 70)
      .sort((a, b) => (a.percentage || 0) - (b.percentage || 0));
  }, [filteredInspections]);

  // Excellent inspections (score >= 90%)
  const excellentInspections = useMemo(() => {
    return filteredInspections
      .filter((i) => i.status === "completed" && (i.percentage || 0) >= 90)
      .sort((a, b) => (b.percentage || 0) - (a.percentage || 0));
  }, [filteredInspections]);

  // Completed inspections
  const completedInspections = useMemo(() => {
    return filteredInspections
      .filter((i) => i.status === "completed")
      .sort((a, b) => new Date(b.completed_at || b.created_at).getTime() - new Date(a.completed_at || a.created_at).getTime());
  }, [filteredInspections]);

  const handleStatClick = (section: string) => {
    setActiveSection(prev => prev === section ? null : section);
    setTimeout(() => {
      const el = document.getElementById(`section-${section}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

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

      // Critical Status Page
      if (criticalInspections.length > 0) {
        pdf.addPage();
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text("Critical Status Inspections (Score < 70%)", margin, 20);

        const critHeaders = ["Title", "Department", "Inspector", "Score", "Defects", "Date"];
        const critColWidths = [60, 50, 50, 25, 25, 40];
        startX = margin;
        startY = 30;

        pdf.setFillColor(255, 220, 220);
        pdf.rect(margin, startY - 5, pageWidth - margin * 2, 10, "F");
        
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold");
        critHeaders.forEach((header, i) => {
          pdf.text(header, startX, startY);
          startX += critColWidths[i];
        });

        pdf.setFont("helvetica", "normal");
        startY += 10;

        criticalInspections.forEach((insp) => {
          if (startY > 180) {
            pdf.addPage();
            startY = 20;
          }
          startX = margin;
          const row = [
            insp.title.length > 30 ? insp.title.substring(0, 27) + "..." : insp.title,
            getDepartmentName(insp.department_id).length > 25 ? getDepartmentName(insp.department_id).substring(0, 22) + "..." : getDepartmentName(insp.department_id),
            (insp.creator_name || "Unknown").length > 25 ? (insp.creator_name || "").substring(0, 22) + "..." : (insp.creator_name || "Unknown"),
            insp.percentage !== null ? `${Math.round(insp.percentage)}%` : "N/A",
            String(insp.defect_count || 0),
            format(new Date(insp.created_at), "MMM d, yyyy"),
          ];
          row.forEach((cell, i) => {
            pdf.text(cell, startX, startY);
            startX += critColWidths[i];
          });
          startY += 8;
        });
      }

      // Defect List Page
      if (filteredDefects.length > 0) {
        pdf.addPage();
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text("Defect List", margin, 20);

        const defHeaders = ["Defect Description", "Inspection", "Department", "Inspector", "Date"];
        const defColWidths = [70, 50, 45, 45, 40];
        startX = margin;
        startY = 30;

        pdf.setFillColor(255, 243, 205);
        pdf.rect(margin, startY - 5, pageWidth - margin * 2, 10, "F");
        
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold");
        defHeaders.forEach((header, i) => {
          pdf.text(header, startX, startY);
          startX += defColWidths[i];
        });

        pdf.setFont("helvetica", "normal");
        startY += 10;

        filteredDefects.forEach((defect) => {
          if (startY > 180) {
            pdf.addPage();
            startY = 20;
          }
          startX = margin;
          const row = [
            defect.question_text.length > 35 ? defect.question_text.substring(0, 32) + "..." : defect.question_text,
            defect.inspection_title.length > 25 ? defect.inspection_title.substring(0, 22) + "..." : defect.inspection_title,
            getDepartmentName(defect.department_id).length > 22 ? getDepartmentName(defect.department_id).substring(0, 19) + "..." : getDepartmentName(defect.department_id),
            defect.inspector_name.length > 22 ? defect.inspector_name.substring(0, 19) + "..." : defect.inspector_name,
            format(new Date(defect.created_at), "MMM d, yyyy"),
          ];
          row.forEach((cell, i) => {
            pdf.text(cell, startX, startY);
            startX += defColWidths[i];
          });
          startY += 8;
        });
      }

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

      // Critical Status sheet
      const criticalData = criticalInspections.map((i) => ({
        Title: i.title,
        Department: getDepartmentName(i.department_id),
        Inspector: i.creator_name || "Unknown",
        "Score (%)": i.percentage !== null ? Math.round(i.percentage) : "N/A",
        "Defects Found": i.defect_count || 0,
        Date: format(new Date(i.created_at), "yyyy-MM-dd"),
      }));
      if (criticalData.length > 0) {
        const criticalSheet = XLSX.utils.json_to_sheet(criticalData);
        XLSX.utils.book_append_sheet(workbook, criticalSheet, "Critical Status");
      }

      // Defects sheet
      const defectsData = filteredDefects.map((d) => ({
        "Defect Description": d.question_text,
        Inspection: d.inspection_title,
        Department: getDepartmentName(d.department_id),
        Inspector: d.inspector_name,
        Notes: d.notes || "",
        Date: format(new Date(d.created_at), "yyyy-MM-dd"),
      }));
      if (defectsData.length > 0) {
        const defectsSheet = XLSX.utils.json_to_sheet(defectsData);
        XLSX.utils.book_append_sheet(workbook, defectsSheet, "Defect List");
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
          <div className="stat-card cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all" onClick={() => handleStatClick("all")}>
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className={cn("stat-card cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all", activeSection === "completed" && "ring-2 ring-primary")} onClick={() => handleStatClick("completed")}>
            <p className="text-sm text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold text-success">{stats.completed}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-muted-foreground">Avg Score</p>
            <p className="text-2xl font-bold">{stats.avgScore}%</p>
          </div>
          <div className={cn("stat-card cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all", activeSection === "excellent" && "ring-2 ring-primary")} onClick={() => handleStatClick("excellent")}>
            <p className="text-sm text-muted-foreground">Excellent</p>
            <p className="text-2xl font-bold text-primary">{stats.excellent}</p>
          </div>
          <div className={cn("stat-card cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all", activeSection === "poor" && "ring-2 ring-destructive")} onClick={() => handleStatClick("poor")}>
            <p className="text-sm text-muted-foreground">Poor</p>
            <p className="text-2xl font-bold text-destructive">{stats.poor}</p>
          </div>
          <div className={cn("stat-card cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all", activeSection === "defects" && "ring-2 ring-warning")} onClick={() => handleStatClick("defects")}>
            <p className="text-sm text-muted-foreground">Defects</p>
            <p className="text-2xl font-bold text-warning">{stats.totalDefects}</p>
          </div>
        </div>

        {/* Completed Inspections - shown when clicked */}
        {activeSection === "completed" && (
          <div id="section-completed" className="stat-card overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardCheck className="w-5 h-5 text-success" />
              <h3 className="font-semibold">Completed Inspections</h3>
              <Badge variant="default" className="ml-auto">{completedInspections.length} records</Badge>
            </div>
            <div className="border border-border rounded-lg overflow-auto max-h-[400px]">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Inspector</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Defects</TableHead>
                    <TableHead>Completed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedInspections.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No completed inspections</TableCell></TableRow>
                  ) : completedInspections.map((insp) => (
                    <TableRow key={insp.id} className="bg-success/5">
                      <TableCell className="font-medium max-w-[200px] truncate">{insp.title}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[150px] truncate">{insp.template_name || "N/A"}</TableCell>
                      <TableCell>{getDepartmentName(insp.department_id)}</TableCell>
                      <TableCell className="text-muted-foreground">{insp.creator_name || "Unknown"}</TableCell>
                      <TableCell>
                        <span className={cn("font-medium", (insp.percentage || 0) >= 90 ? "text-success" : (insp.percentage || 0) >= 70 ? "text-warning" : "text-destructive")}>
                          {insp.percentage !== null ? `${Math.round(insp.percentage)}%` : "N/A"}
                        </span>
                      </TableCell>
                      <TableCell>{(insp.defect_count || 0) > 0 ? <Badge variant="destructive">{insp.defect_count}</Badge> : <span className="text-muted-foreground">0</span>}</TableCell>
                      <TableCell className="text-muted-foreground">{insp.completed_at ? format(new Date(insp.completed_at), "MMM d, yyyy") : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Excellent Inspections - shown when clicked */}
        {activeSection === "excellent" && (
          <div id="section-excellent" className="stat-card overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardCheck className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Excellent Inspections</h3>
              <span className="text-sm text-muted-foreground">(Score 90%+)</span>
              <Badge variant="default" className="ml-auto">{excellentInspections.length} records</Badge>
            </div>
            <div className="border border-border rounded-lg overflow-auto max-h-[400px]">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Inspector</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {excellentInspections.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No excellent inspections</TableCell></TableRow>
                  ) : excellentInspections.map((insp) => (
                    <TableRow key={insp.id} className="bg-primary/5">
                      <TableCell className="font-medium max-w-[200px] truncate">{insp.title}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[150px] truncate">{insp.template_name || "N/A"}</TableCell>
                      <TableCell>{getDepartmentName(insp.department_id)}</TableCell>
                      <TableCell className="text-muted-foreground">{insp.creator_name || "Unknown"}</TableCell>
                      <TableCell><span className="font-bold text-success">{insp.percentage !== null ? `${Math.round(insp.percentage)}%` : "N/A"}</span></TableCell>
                      <TableCell className="text-muted-foreground">{format(new Date(insp.created_at), "MMM d, yyyy")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Poor Inspections - shown when clicked */}
        {activeSection === "poor" && (
          <div id="section-poor" className="stat-card overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <h3 className="font-semibold">Poor Inspections</h3>
              <span className="text-sm text-muted-foreground">(Score below 70%)</span>
              <Badge variant="destructive" className="ml-auto">{criticalInspections.length} records</Badge>
            </div>
            <div className="border border-border rounded-lg overflow-auto max-h-[400px]">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Inspector</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Defects</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {criticalInspections.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No poor inspections</TableCell></TableRow>
                  ) : criticalInspections.map((insp) => (
                    <TableRow key={insp.id} className="bg-destructive/5">
                      <TableCell className="font-medium max-w-[200px] truncate">{insp.title}</TableCell>
                      <TableCell>{getDepartmentName(insp.department_id)}</TableCell>
                      <TableCell className="text-muted-foreground">{insp.creator_name || "Unknown"}</TableCell>
                      <TableCell><span className="font-bold text-destructive">{insp.percentage !== null ? `${Math.round(insp.percentage)}%` : "N/A"}</span></TableCell>
                      <TableCell>{(insp.defect_count || 0) > 0 ? <Badge variant="destructive">{insp.defect_count}</Badge> : <span className="text-muted-foreground">0</span>}</TableCell>
                      <TableCell className="text-muted-foreground">{format(new Date(insp.created_at), "MMM d, yyyy")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Defects - shown when clicked */}
        {activeSection === "defects" && (
          <div id="section-defects" className="stat-card overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <h3 className="font-semibold">Defect List</h3>
              <Badge variant="outline" className="ml-auto border-warning text-warning">{filteredDefects.length} defects</Badge>
            </div>
            {loadingDefects ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : (
              <div className="border border-border rounded-lg overflow-auto max-h-[400px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead>Defect Description</TableHead>
                      <TableHead>Inspection</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Inspector</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDefects.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No defects found</TableCell></TableRow>
                    ) : filteredDefects.map((defect) => (
                      <TableRow key={defect.id} className="bg-warning/5">
                        <TableCell className="font-medium max-w-[250px]">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                            <span className="truncate">{defect.question_text}</span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate text-muted-foreground">{defect.inspection_title}</TableCell>
                        <TableCell>{getDepartmentName(defect.department_id)}</TableCell>
                        <TableCell className="text-muted-foreground">{defect.inspector_name}</TableCell>
                        <TableCell className="max-w-[150px] truncate text-muted-foreground">{defect.notes || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{format(new Date(defect.created_at), "MMM d, yyyy")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

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

        {/* Critical Status Inspections */}
        <div className="stat-card overflow-hidden">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <h3 className="font-semibold">Critical Status Inspections</h3>
            <span className="text-sm text-muted-foreground">(Score below 70%)</span>
            <Badge variant="destructive" className="ml-auto">
              {criticalInspections.length} records
            </Badge>
          </div>
          
          <div className="border border-border rounded-lg overflow-auto max-h-[400px]">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Inspector</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Defects</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {criticalInspections.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No critical status inspections found
                    </TableCell>
                  </TableRow>
                ) : (
                  criticalInspections.map((insp) => (
                    <TableRow key={insp.id} className="bg-destructive/5">
                      <TableCell className="font-medium max-w-[200px] truncate">{insp.title}</TableCell>
                      <TableCell>{getDepartmentName(insp.department_id)}</TableCell>
                      <TableCell className="text-muted-foreground">{insp.creator_name || "Unknown"}</TableCell>
                      <TableCell>
                        <span className="font-bold text-destructive">
                          {insp.percentage !== null ? `${Math.round(insp.percentage)}%` : "N/A"}
                        </span>
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

        {/* Defect List */}
        <div className="stat-card overflow-hidden">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <h3 className="font-semibold">Defect List</h3>
            <Badge variant="outline" className="ml-auto border-warning text-warning">
              {filteredDefects.length} defects
            </Badge>
          </div>
          
          {loadingDefects ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-auto max-h-[400px]">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead>Defect Description</TableHead>
                    <TableHead>Inspection</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Inspector</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDefects.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No defects found in the selected period
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDefects.map((defect) => (
                      <TableRow key={defect.id} className="bg-warning/5">
                        <TableCell className="font-medium max-w-[250px]">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                            <span className="truncate">{defect.question_text}</span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate text-muted-foreground">
                          {defect.inspection_title}
                        </TableCell>
                        <TableCell>{getDepartmentName(defect.department_id)}</TableCell>
                        <TableCell className="text-muted-foreground">{defect.inspector_name}</TableCell>
                        <TableCell className="max-w-[150px] truncate text-muted-foreground">
                          {defect.notes || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(defect.created_at), "MMM d, yyyy")}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

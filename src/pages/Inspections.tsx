import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Play,
  Eye,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Calendar,
  Building2,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import { useInspections, InspectionDB } from "@/hooks/useInspections";
import { useAuth } from "@/contexts/AuthContext";
import { useDepartments } from "@/hooks/useDepartments";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function Inspections() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("all");
  
  const { inspections, loading } = useInspections();
  const { isAdmin } = useAuth();
  const { departments } = useDepartments();

  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("drafts");
  const [exporting, setExporting] = useState(false);

  const filteredInspections = inspections.filter((inspection) => {
    const matchesSearch = inspection.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDepartment = selectedDepartmentId === "all" || inspection.department_id === selectedDepartmentId;
    return matchesSearch && matchesDepartment;
  });

  const draftInspections = filteredInspections.filter((i) => i.status === "in-progress");
  const completedInspections = filteredInspections.filter((i) => i.status === "completed");

  const getExportData = () => {
    const dataToExport = activeTab === "drafts" ? draftInspections : completedInspections;
    return dataToExport.map((inspection) => {
      const department = departments.find((d) => d.id === inspection.department_id);
      return {
        Title: inspection.title,
        Status: inspection.status === "completed" ? "Completed" : "Draft",
        Department: department?.name || "Unknown",
        Score: inspection.percentage !== null ? `${Math.round(inspection.percentage)}%` : "N/A",
        Date: format(new Date(inspection.created_at), "MMM d, yyyy"),
      };
    });
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const XLSX = await import("xlsx");
      const data = getExportData();
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Inspections");
      
      // Auto-size columns
      const colWidths = [
        { wch: 30 }, // Title
        { wch: 12 }, // Status
        { wch: 20 }, // Department
        { wch: 10 }, // Score
        { wch: 15 }, // Date
      ];
      worksheet["!cols"] = colWidths;
      
      const fileName = `inspections-${activeTab}-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      toast({
        title: "Export Complete",
        description: `${data.length} inspections exported to Excel`,
      });
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export to Excel. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const { jsPDF } = await import("jspdf");
      const data = getExportData();
      
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 15;
      
      // Title
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.text(`Inspections Report - ${activeTab === "drafts" ? "Drafts" : "Completed"}`, margin, 20);
      
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Generated on ${format(new Date(), "MMMM d, yyyy")}`, margin, 28);
      
      // Table headers
      const headers = ["Title", "Status", "Department", "Score", "Date"];
      const colWidths = [80, 30, 50, 25, 35];
      let startX = margin;
      let startY = 40;
      
      pdf.setFillColor(240, 240, 240);
      pdf.rect(margin, startY - 5, pageWidth - margin * 2, 10, "F");
      
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      headers.forEach((header, i) => {
        pdf.text(header, startX, startY);
        startX += colWidths[i];
      });
      
      // Table rows
      pdf.setFont("helvetica", "normal");
      startY += 10;
      
      data.forEach((row, index) => {
        if (startY > 180) {
          pdf.addPage();
          startY = 20;
        }
        
        startX = margin;
        const values = [row.Title, row.Status, row.Department, row.Score, row.Date];
        values.forEach((value, i) => {
          const text = value.length > 35 ? value.substring(0, 32) + "..." : value;
          pdf.text(text, startX, startY);
          startX += colWidths[i];
        });
        startY += 8;
      });
      
      const fileName = `inspections-${activeTab}-${format(new Date(), "yyyy-MM-dd")}.pdf`;
      pdf.save(fileName);
      
      toast({
        title: "Export Complete",
        description: `${data.length} inspections exported to PDF`,
      });
    } catch (error) {
      console.error("Error exporting to PDF:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export to PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleResume = (inspection: InspectionDB) => {
    // Navigate to run inspection with the inspection data
    navigate("/run-inspection", {
      state: {
        templateId: inspection.template_id,
        templateName: inspection.title,
        resumeInspectionId: inspection.id,
      },
    });
  };

  const handleView = (inspection: InspectionDB) => {
    navigate(`/inspections/${inspection.id}`);
  };

  const getScoreColor = (percentage: number | null) => {
    if (percentage === null) return "text-muted-foreground";
    if (percentage >= 80) return "text-success";
    if (percentage >= 60) return "text-warning";
    return "text-destructive";
  };

  const InspectionCard = ({ inspection, showResume }: { inspection: InspectionDB; showResume?: boolean }) => {
    const department = departments.find((d) => d.id === inspection.department_id);
    
    return (
      <div className="action-card">
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <span
            className={cn(
              "status-badge",
              inspection.status === "completed" ? "status-badge-success" : "status-badge-warning"
            )}
          >
            {inspection.status === "completed" ? "Completed" : "Draft"}
          </span>
        </div>

        <h3 className="font-semibold text-foreground mb-1 line-clamp-1">{inspection.title}</h3>
        
        {inspection.status === "completed" && inspection.percentage !== null && (
          <div className="flex items-center gap-2 mb-2">
            <span className={cn("text-lg font-bold", getScoreColor(inspection.percentage))}>
              {Math.round(inspection.percentage)}%
            </span>
            <span className="text-sm text-muted-foreground">
              ({inspection.total_score}/{inspection.max_score} pts)
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-4">
          <span className="inline-flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {format(new Date(inspection.created_at), "MMM d, yyyy")}
          </span>
          {inspection.completed_at && (
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {format(new Date(inspection.completed_at), "MMM d, yyyy")}
            </span>
          )}
        </div>

        <div className="pt-3 border-t border-border flex items-center justify-between">
          <span className="text-xs font-medium text-accent flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5" />
            {department?.name || "Unknown"}
          </span>
          {showResume ? (
            <Button
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-8"
              onClick={() => handleResume(inspection)}
            >
              <Play className="w-3.5 h-3.5 mr-1" />
              Resume
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() => handleView(inspection)}
            >
              <Eye className="w-3.5 h-3.5 mr-1" />
              View
            </Button>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <AppLayout title="Inspections">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Inspections">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search inspections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full sm:w-64"
            />
          </div>
          {isAdmin && (
            <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
              <SelectTrigger className="w-[180px] bg-background">
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
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="stat-card">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-sm">Drafts</span>
            </div>
            <p className="text-2xl font-bold text-warning">{draftInspections.length}</p>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm">Completed</span>
            </div>
            <p className="text-2xl font-bold text-success">{completedInspections.length}</p>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <FileText className="w-4 h-4" />
              <span className="text-sm">Total</span>
            </div>
            <p className="text-2xl font-bold">{filteredInspections.length}</p>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">Avg Score</span>
            </div>
            <p className="text-2xl font-bold">
              {completedInspections.length > 0
                ? Math.round(
                    completedInspections.reduce((acc, i) => acc + (i.percentage || 0), 0) /
                      completedInspections.length
                  )
                : 0}
              %
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <TabsList>
              <TabsTrigger value="drafts" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Drafts ({draftInspections.length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Completed ({completedInspections.length})
              </TabsTrigger>
            </TabsList>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={exporting} className="flex items-center gap-2">
                  {exporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Export List
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover">
                <DropdownMenuItem onClick={handleExportPDF} className="flex items-center gap-2 cursor-pointer">
                  <FileText className="w-4 h-4" />
                  Export to PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportExcel} className="flex items-center gap-2 cursor-pointer">
                  <FileSpreadsheet className="w-4 h-4" />
                  Export to Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <TabsContent value="drafts" className="mt-4">
            {draftInspections.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No draft inspections</p>
                <Button
                  className="mt-4"
                  onClick={() => navigate("/checklists")}
                >
                  Start New Inspection
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {draftInspections.map((inspection, index) => (
                  <div
                    key={inspection.id}
                    className="animate-slide-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <InspectionCard inspection={inspection} showResume />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-4">
            {completedInspections.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No completed inspections yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {completedInspections.map((inspection, index) => (
                  <div
                    key={inspection.id}
                    className="animate-slide-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <InspectionCard inspection={inspection} />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

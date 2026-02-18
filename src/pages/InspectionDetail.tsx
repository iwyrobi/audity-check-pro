import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { InspectionDB, InspectionAnswerDB } from "@/hooks/useInspections";
import { useDepartments } from "@/hooks/useDepartments";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Download,
  FileText,
  Calendar,
  Building2,
  CheckCircle2,
  XCircle,
  Loader2,
  MapPin,
  User,
  Clock,
} from "lucide-react";

export default function InspectionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { departments } = useDepartments();
  const printRef = useRef<HTMLDivElement>(null);

  const [inspection, setInspection] = useState<InspectionDB | null>(null);
  const [answers, setAnswers] = useState<InspectionAnswerDB[]>([]);
  const [completedByName, setCompletedByName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [defectWorkOrders, setDefectWorkOrders] = useState<Record<string, string>>({});

  useEffect(() => {
    if (id) {
      fetchInspectionData();
    }
  }, [id]);

  const fetchInspectionData = async () => {
    setLoading(true);
    try {
      // Fetch inspection
      const { data: inspectionData, error: inspectionError } = await supabase
        .from("inspections")
        .select("*")
        .eq("id", id)
        .single();

      if (inspectionError) throw inspectionError;
      setInspection(inspectionData);

      // Fetch user who completed the inspection
      if (inspectionData.created_by) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", inspectionData.created_by)
          .maybeSingle();
        
        setCompletedByName(profileData?.full_name || "Unknown User");
      }

      // Fetch answers
      const { data: answersData, error: answersError } = await supabase
        .from("inspection_answers")
        .select("*")
        .eq("inspection_id", id)
        .order("created_at", { ascending: true });

      if (answersError) throw answersError;
      setAnswers(answersData || []);

      // Fetch linked work orders for defects
      const { data: workOrdersData } = await supabase
        .from("work_orders")
        .select("id, linked_defect_question")
        .eq("linked_inspection_id", id!)
        .not("linked_defect_question", "is", null);

      if (workOrdersData) {
        const mapping: Record<string, string> = {};
        workOrdersData.forEach((wo) => {
          if (wo.linked_defect_question) {
            mapping[wo.linked_defect_question] = wo.id;
          }
        });
        setDefectWorkOrders(mapping);
      }
    } catch (error: any) {
      console.error("Error fetching inspection:", error);
      toast({
        title: "Error",
        description: "Failed to load inspection details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (percentage: number | null) => {
    if (percentage === null) return "text-muted-foreground";
    if (percentage >= 80) return "text-success";
    if (percentage >= 60) return "text-warning";
    return "text-destructive";
  };

  const getScoreBgColor = (percentage: number | null) => {
    if (percentage === null) return "bg-muted";
    if (percentage >= 80) return "bg-success/10";
    if (percentage >= 60) return "bg-warning/10";
    return "bg-destructive/10";
  };

  const handleExportPDF = async () => {
    if (!printRef.current || !inspection) return;
    
    setExporting(true);
    try {
      // Dynamic import to reduce initial bundle size
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      
      const element = printRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });
      
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`inspection-${inspection.title.replace(/\s+/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.pdf`);
      
      toast({
        title: "PDF Exported",
        description: "Inspection report has been downloaded",
      });
    } catch (error: any) {
      console.error("Error exporting PDF:", error);
      toast({
        title: "Export Failed",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const department = departments.find((d) => d.id === inspection?.department_id);

  if (loading) {
    return (
      <AppLayout title="Inspection Details">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!inspection) {
    return (
      <AppLayout title="Inspection Details">
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Inspection not found</p>
          <Button className="mt-4" onClick={() => navigate("/inspections")}>
            Back to Inspections
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Inspection Details">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <Button
            variant="outline"
            onClick={() => navigate("/inspections")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Inspections
          </Button>
          <Button
            onClick={handleExportPDF}
            disabled={exporting}
            className="flex items-center gap-2"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Export to PDF
          </Button>
        </div>

        {/* Printable Content */}
        <div ref={printRef} className="bg-background p-6 rounded-lg space-y-6">
          {/* Inspection Header */}
          <div className="border-b border-border pb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">{inspection.title}</h1>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="w-4 h-4" />
                    {department?.name || "Unknown Department"}
                  </span>
                  {inspection.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {inspection.location}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(inspection.created_at), "MMMM d, yyyy")}
                  </span>
                </div>
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

            {/* Score Summary */}
            {inspection.status === "completed" && inspection.percentage !== null && (
              <div
                className={cn(
                  "p-4 rounded-lg flex flex-col sm:flex-row items-center gap-4",
                  getScoreBgColor(inspection.percentage)
                )}
              >
                <div className="text-center sm:text-left">
                  <p className="text-sm text-muted-foreground mb-1">Overall Score</p>
                  <p className={cn("text-4xl font-bold", getScoreColor(inspection.percentage))}>
                    {Math.round(inspection.percentage)}%
                  </p>
                </div>
                <div className="h-12 w-px bg-border hidden sm:block" />
                <div className="flex gap-6 text-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Points Earned</p>
                    <p className="text-xl font-semibold text-foreground">{inspection.total_score}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Max Points</p>
                    <p className="text-xl font-semibold text-foreground">{inspection.max_score}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Questions</p>
                    <p className="text-xl font-semibold text-foreground">{answers.length}</p>
                  </div>
                </div>
                {inspection.completed_at && (
                  <>
                    <div className="h-12 w-px bg-border hidden sm:block" />
                    <div className="text-center sm:text-left">
                      <p className="text-sm text-muted-foreground">Completed On</p>
                      <p className="text-lg font-medium text-foreground flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {format(new Date(inspection.completed_at), "MMM d, yyyy h:mm a")}
                      </p>
                    </div>
                  </>
                )}
                {completedByName && (
                  <>
                    <div className="h-12 w-px bg-border hidden sm:block" />
                    <div className="text-center sm:text-left">
                      <p className="text-sm text-muted-foreground">Completed By</p>
                      <p className="text-lg font-medium text-foreground flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {completedByName}
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Answers List */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">Inspection Responses</h2>
            {answers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-8 h-8 mx-auto mb-2" />
                <p>No responses recorded</p>
              </div>
            ) : (
              <div className="space-y-3">
                {answers.map((answer, index) => (
                  <div
                    key={answer.id}
                    className={cn(
                      "p-4 rounded-lg border",
                      answer.is_defect
                        ? "border-destructive/50 bg-destructive/5 cursor-pointer hover:bg-destructive/10 transition-colors"
                        : "border-border bg-card"
                    )}
                    onClick={() => {
                      if (answer.is_defect && defectWorkOrders[answer.question_text]) {
                        navigate(`/work-orders?highlight=${defectWorkOrders[answer.question_text]}`);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-muted-foreground">
                            Q{index + 1}
                          </span>
                          {answer.is_defect && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">
                              Defect
                            </span>
                          )}
                        </div>
                        <p className="font-medium text-foreground">{answer.question_text}</p>
                        {answer.notes && (
                          <p className="text-sm text-muted-foreground mt-2 italic">
                            Notes: {answer.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Answer</p>
                          <div className="flex items-center gap-1">
                            {answer.answer === "Yes" || answer.answer === "Pass" ? (
                              <CheckCircle2 className="w-4 h-4 text-success" />
                            ) : answer.answer === "No" || answer.answer === "Fail" ? (
                              <XCircle className="w-4 h-4 text-destructive" />
                            ) : null}
                            <span className="font-medium text-foreground">
                              {answer.answer || "N/A"}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Score</p>
                          <p
                            className={cn(
                              "font-semibold",
                              answer.score_earned === answer.max_score
                                ? "text-success"
                                : answer.score_earned === 0
                                ? "text-destructive"
                                : "text-warning"
                            )}
                          >
                            {answer.score_earned ?? 0}/{answer.max_score ?? 0}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Defects Summary */}
          {answers.filter((a) => a.is_defect).length > 0 && (
            <div className="border-t border-border pt-6">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-destructive" />
                Defects Summary ({answers.filter((a) => a.is_defect).length})
              </h2>
              <div className="space-y-2">
                {answers
                  .filter((a) => a.is_defect)
                  .map((defect, index) => (
                    <div
                      key={defect.id}
                      className={cn(
                        "p-3 rounded-lg bg-destructive/5 border border-destructive/20",
                        defectWorkOrders[defect.question_text] && "cursor-pointer hover:bg-destructive/10 transition-colors"
                      )}
                      onClick={() => {
                        if (defectWorkOrders[defect.question_text]) {
                          navigate(`/work-orders?highlight=${defectWorkOrders[defect.question_text]}`);
                        }
                      }}
                    >
                      <p className="font-medium text-foreground">{defect.question_text}</p>
                      {defect.notes && (
                        <p className="text-sm text-muted-foreground mt-1">{defect.notes}</p>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

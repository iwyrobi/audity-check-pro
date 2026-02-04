import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { InspectionRunner, QuestionAnswer } from "@/components/checklists/InspectionRunner";
import { CreateWorkOrderFromDefect } from "@/components/checklists/CreateWorkOrderFromDefect";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Send, CheckCircle2, AlertTriangle, Loader2, WifiOff } from "lucide-react";
import { TemplateSection, QuestionItem } from "@/components/checklists/TemplateBuilder";
import { useInspections } from "@/hooks/useInspections";
import { useWorkOrders } from "@/hooks/useWorkOrders";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { ChecklistTemplateDB } from "@/hooks/useChecklistTemplates";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default function RunInspection() {
  const location = useLocation();
  const navigate = useNavigate();
  const { templateId, templateName, templateData, resumeInspectionId } = (location.state as {
    templateId?: string;
    templateName?: string;
    templateData?: ChecklistTemplateDB;
    resumeInspectionId?: string;
  }) || {};

  const { createInspection, saveInspectionAnswers, completeInspection } = useInspections();
  const { createWorkOrder } = useWorkOrders();
  const { isOnline, saveInspectionOffline, getOfflineInspection } = useOfflineSync();

  const [inspectionId, setInspectionId] = useState<string | null>(resumeInspectionId || null);
  const [inspectionTitle, setInspectionTitle] = useState(templateName || "Daily Safety Inspection");
  const [answers, setAnswers] = useState<Record<string, QuestionAnswer>>({});
  const [workOrderModal, setWorkOrderModal] = useState<{
    open: boolean;
    question?: QuestionItem;
    section?: TemplateSection;
  }>({ open: false });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!resumeInspectionId);
  const [sections, setSections] = useState<TemplateSection[]>([]);

  // Load template and answers when resuming an inspection
  useEffect(() => {
    const loadResumeData = async () => {
      if (!resumeInspectionId || !templateId) return;

      setLoading(true);
      try {
        // First check if we have offline data for this inspection
        const offlineData = getOfflineInspection(resumeInspectionId);
        
        // Fetch the template with sections and questions
        const { data: templateResult, error: templateError } = await supabase
          .from("checklist_templates")
          .select(`
            *,
            sections:template_sections(
              *,
              questions:template_questions(*)
            )
          `)
          .eq("id", templateId)
          .maybeSingle();

        if (templateError) throw templateError;

        if (templateResult?.sections) {
          // Sort sections and questions by sort_order
          const sortedSections = (templateResult.sections || [])
            .sort((a: any, b: any) => a.sort_order - b.sort_order)
            .map((section: any) => ({
              ...section,
              questions: (section.questions || []).sort(
                (a: any, b: any) => a.sort_order - b.sort_order
              ),
            }));

          // Convert to TemplateSection format
          const convertedSections: TemplateSection[] = sortedSections.map((section: any) => ({
            id: section.id,
            title: section.name,
            isExpanded: true,
            questions: (section.questions || []).map((q: any) => ({
              id: q.id,
              text: q.question,
              type: q.type as "yes-no" | "score" | "text" | "multiple-choice",
              score: q.score,
              required: q.required,
              options: q.options,
            })),
          }));

          setSections(convertedSections);
        }

        // Prioritize offline data if available
        if (offlineData) {
          const loadedAnswers: Record<string, QuestionAnswer> = {};
          offlineData.answers.forEach((a) => {
            loadedAnswers[a.questionId] = {
              questionId: a.questionId,
              value: a.answer === "yes" || a.answer === "no" || a.answer === "na" 
                ? a.answer 
                : isNaN(Number(a.answer)) ? a.answer : Number(a.answer),
              score: a.scoreEarned,
              maxScore: a.maxScore,
              isDefect: a.isDefect,
              notes: a.notes,
            };
          });
          setAnswers(loadedAnswers);
          toast.info("Loaded offline saved data");
        } else {
          // Fetch saved answers from server
          const { data: answersData, error: answersError } = await supabase
            .from("inspection_answers")
            .select("*")
            .eq("inspection_id", resumeInspectionId);

          if (answersError) throw answersError;

          const loadedAnswers: Record<string, QuestionAnswer> = {};
          (answersData || []).forEach((a) => {
            if (a.question_id) {
              loadedAnswers[a.question_id] = {
                questionId: a.question_id,
                value: a.answer === "yes" || a.answer === "no" || a.answer === "na" 
                  ? a.answer 
                  : isNaN(Number(a.answer)) ? a.answer : Number(a.answer),
                score: a.score_earned || 0,
                maxScore: a.max_score || 0,
                isDefect: a.is_defect || false,
                notes: a.notes || undefined,
              };
            }
          });
          setAnswers(loadedAnswers);
        }

      } catch (error) {
        console.error("Error loading resume data:", error);
        toast.error("Failed to load inspection data");
      } finally {
        setLoading(false);
      }
    };

    loadResumeData();
  }, [resumeInspectionId, templateId, getOfflineInspection]);

  // Convert template data to sections format if passed via navigation (new inspection)
  useEffect(() => {
    if (templateData?.sections && !resumeInspectionId) {
      const convertedSections: TemplateSection[] = templateData.sections.map((section) => ({
        id: section.id,
        title: section.name,
        isExpanded: true,
        questions: (section.questions || []).map((q) => ({
          id: q.id,
          text: q.question,
          type: q.type as "yes-no" | "score" | "text" | "multiple-choice",
          score: q.score,
          required: q.required,
          options: q.options,
        })),
      }));
      setSections(convertedSections);
    }
  }, [templateData, resumeInspectionId]);

  // Initialize inspection in database when using real template (new inspection only)
  useEffect(() => {
    const initInspection = async () => {
      if (templateId && !inspectionId && templateData && !resumeInspectionId) {
        const inspection = await createInspection(templateId, inspectionTitle);
        if (inspection) {
          setInspectionId(inspection.id);
        }
      }
    };
    initInspection();
  }, [templateId, templateData, resumeInspectionId]);

  const handleAnswer = (questionId: string, answer: Partial<QuestionAnswer>) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        questionId,
        ...answer,
      } as QuestionAnswer,
    }));
  };

  const handleCreateWorkOrder = (question: QuestionItem, section: TemplateSection) => {
    setWorkOrderModal({ open: true, question, section });
  };

  const handleSaveWorkOrder = async (data: any) => {
    if (templateId || resumeInspectionId) {
      await createWorkOrder({
        title: data.title,
        description: data.description,
        priority: data.priority,
        location: data.location,
        linkedInspectionId: inspectionId || undefined,
        linkedDefectQuestion: workOrderModal.question?.text,
      });
    } else {
      toast.success("Work order created!");
    }
    setWorkOrderModal({ open: false });
  };

  // Calculate totals
  const totalQuestions = sections.reduce((acc, s) => acc + s.questions.length, 0);
  const answeredQuestions = Object.keys(answers).length;
  const totalScore = Object.values(answers).reduce((acc, a) => acc + (a.score || 0), 0);
  const maxScore = sections.reduce(
    (acc, s) => acc + s.questions.reduce((qacc, q) => qacc + q.score, 0),
    0
  );
  const defectCount = Object.values(answers).filter((a) => a.isDefect).length;
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  const handleSaveDraft = async () => {
    if (!inspectionId) {
      toast.info("Draft saved locally");
      return;
    }

    setSaving(true);

    const answerData = Object.entries(answers).map(([questionId, answer]) => {
      const question = sections
        .flatMap((s) => s.questions)
        .find((q) => q.id === questionId);

      return {
        questionId,
        questionText: question?.text || "",
        answer: String(answer.value),
        scoreEarned: answer.score,
        maxScore: answer.maxScore,
        isDefect: answer.isDefect,
        notes: answer.notes,
      };
    });

    if (isOnline) {
      await saveInspectionAnswers(inspectionId, answerData);
      toast.success("Draft saved successfully");
    } else {
      // Save offline
      saveInspectionOffline({
        inspectionId,
        title: inspectionTitle,
        templateId: templateId || "",
        answers: answerData,
        totalScore,
        maxScore,
        isComplete: false,
      });
      toast.success("Draft saved offline - will sync when online");
    }
    
    setSaving(false);
  };

  const handleSubmit = async () => {
    if (answeredQuestions < totalQuestions) {
      toast.error(`Please answer all questions (${answeredQuestions}/${totalQuestions} completed)`);
      return;
    }

    setSaving(true);

    if (inspectionId) {
      const answerData = Object.entries(answers).map(([questionId, answer]) => {
        const question = sections
          .flatMap((s) => s.questions)
          .find((q) => q.id === questionId);

        return {
          questionId,
          questionText: question?.text || "",
          answer: String(answer.value),
          scoreEarned: answer.score,
          maxScore: answer.maxScore,
          isDefect: answer.isDefect,
          notes: answer.notes,
        };
      });

      if (isOnline) {
        await saveInspectionAnswers(inspectionId, answerData);
        await completeInspection(inspectionId, totalScore, maxScore);
      } else {
        // Save for offline sync
        saveInspectionOffline({
          inspectionId,
          title: inspectionTitle,
          templateId: templateId || "",
          answers: answerData,
          totalScore,
          maxScore,
          isComplete: true,
        });
        toast.success("Inspection saved offline - will sync when online");
      }
    } else {
      toast.success("Inspection submitted successfully!");
    }

    setSaving(false);
    navigate("/inspections");
  };

  if (loading) {
    return (
      <AppLayout title="Loading Inspection...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (sections.length === 0) {
    return (
      <AppLayout title="Inspection">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertTriangle className="w-12 h-12 text-warning" />
          <p className="text-muted-foreground">No template data found. Please start a new inspection from the checklists page.</p>
          <Button onClick={() => navigate("/checklists")}>
            Go to Checklists
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={inspectionTitle}>
      <div className="space-y-6">
        {/* Offline Banner */}
        {!isOnline && (
          <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/30 rounded-lg text-warning">
            <WifiOff className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-sm">You're offline</p>
              <p className="text-xs opacity-80">Changes will be saved locally and synced when you're back online</p>
            </div>
            <Badge variant="outline" className="border-warning text-warning">Offline Mode</Badge>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Button variant="ghost" onClick={() => navigate("/checklists")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Checklists
          </Button>
          <div className="flex items-center gap-3">
            <Button variant="outline" disabled={saving} onClick={handleSaveDraft}>
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
            <Button
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Submit Inspection
            </Button>
          </div>
        </div>

        {/* Progress Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="stat-card">
            <p className="text-sm text-muted-foreground">Progress</p>
            <p className="text-2xl font-bold">
              {answeredQuestions}/{totalQuestions}
            </p>
            <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${(answeredQuestions / totalQuestions) * 100}%` }}
              />
            </div>
          </div>
          <div className="stat-card">
            <p className="text-sm text-muted-foreground">Current Score</p>
            <p
              className={cn(
                "text-2xl font-bold",
                percentage >= 80
                  ? "text-success"
                  : percentage >= 60
                  ? "text-warning"
                  : "text-destructive"
              )}
            >
              {percentage}%
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {totalScore}/{maxScore} pts
            </p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-muted-foreground">Defects Found</p>
            <div className="flex items-center gap-2">
              {defectCount > 0 ? (
                <AlertTriangle className="w-6 h-6 text-destructive" />
              ) : (
                <CheckCircle2 className="w-6 h-6 text-success" />
              )}
              <p className="text-2xl font-bold">{defectCount}</p>
            </div>
          </div>
          <div className="stat-card">
            <p className="text-sm text-muted-foreground">Status</p>
            <span
              className={cn(
                "status-badge mt-2",
                answeredQuestions === totalQuestions
                  ? "status-badge-success"
                  : "status-badge-warning"
              )}
            >
              {answeredQuestions === totalQuestions ? "Ready to Submit" : "In Progress"}
            </span>
          </div>
        </div>

        {/* Inspection Questions */}
        <InspectionRunner
          sections={sections}
          answers={answers}
          onAnswer={handleAnswer}
          onCreateWorkOrder={handleCreateWorkOrder}
          inspectionId={inspectionId || undefined}
        />

        {/* Work Order Modal */}
        <CreateWorkOrderFromDefect
          open={workOrderModal.open}
          onClose={() => setWorkOrderModal({ open: false })}
          defect={
            workOrderModal.question && workOrderModal.section
              ? {
                  questionText: workOrderModal.question.text,
                  sectionTitle: workOrderModal.section.title,
                  checklistTitle: inspectionTitle,
                }
              : undefined
          }
          onSave={handleSaveWorkOrder}
        />
      </div>
    </AppLayout>
  );
}
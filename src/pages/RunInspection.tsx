import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { InspectionRunner, QuestionAnswer } from "@/components/checklists/InspectionRunner";
import { CreateWorkOrderFromDefect } from "@/components/checklists/CreateWorkOrderFromDefect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, Send, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { TemplateSection, QuestionItem } from "@/components/checklists/TemplateBuilder";
import { useInspections } from "@/hooks/useInspections";
import { useWorkOrders } from "@/hooks/useWorkOrders";
import { ChecklistTemplateDB } from "@/hooks/useChecklistTemplates";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Sample template for demo (used when no template is passed)
const sampleTemplate: TemplateSection[] = [
  {
    id: "section-1",
    title: "Personal Protective Equipment",
    isExpanded: true,
    questions: [
      { id: "q1", text: "Are all workers wearing required PPE?", type: "yes-no", required: true, score: 5 },
      { id: "q2", text: "Is PPE in good condition without visible damage?", type: "yes-no", required: true, score: 5 },
      { id: "q3", text: "Are safety glasses being worn in designated areas?", type: "yes-no", required: true, score: 3 },
      { id: "q4", text: "Rate the overall PPE compliance", type: "score", required: true, score: 10 },
    ],
  },
  {
    id: "section-2",
    title: "Fire Safety",
    isExpanded: true,
    questions: [
      { id: "q5", text: "Are fire extinguishers accessible and not blocked?", type: "yes-no", required: true, score: 5 },
      { id: "q6", text: "Are fire extinguisher inspection tags current?", type: "yes-no", required: true, score: 5 },
      { id: "q7", text: "Are emergency exits clearly marked and unobstructed?", type: "yes-no", required: true, score: 5 },
      { id: "q8", text: "Is the fire alarm system functional?", type: "yes-no", required: true, score: 10 },
    ],
  },
  {
    id: "section-3",
    title: "Housekeeping",
    isExpanded: true,
    questions: [
      { id: "q9", text: "Are walkways clear of obstructions?", type: "yes-no", required: true, score: 4 },
      { id: "q10", text: "Is the work area clean and organized?", type: "yes-no", required: true, score: 4 },
      { id: "q11", text: "Are spills cleaned up promptly?", type: "yes-no", required: true, score: 5 },
      { id: "q12", text: "Rate the overall housekeeping condition", type: "score", required: false, score: 10 },
    ],
  },
];

export default function RunInspection() {
  const location = useLocation();
  const navigate = useNavigate();
  const { templateId, templateName, templateData } = (location.state as {
    templateId?: string;
    templateName?: string;
    templateData?: ChecklistTemplateDB;
  }) || {};

  const { createInspection, saveInspectionAnswers, completeInspection } = useInspections();
  const { createWorkOrder } = useWorkOrders();

  const [inspectionId, setInspectionId] = useState<string | null>(null);
  const [inspectionTitle, setInspectionTitle] = useState(templateName || "Daily Safety Inspection");
  const [answers, setAnswers] = useState<Record<string, QuestionAnswer>>({});
  const [workOrderModal, setWorkOrderModal] = useState<{
    open: boolean;
    question?: QuestionItem;
    section?: TemplateSection;
  }>({ open: false });
  const [saving, setSaving] = useState(false);
  const [sections, setSections] = useState<TemplateSection[]>(sampleTemplate);

  // Convert template data to sections format if passed via navigation
  useEffect(() => {
    if (templateData?.sections) {
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
  }, [templateData]);

  // Initialize inspection in database when using real template
  useEffect(() => {
    const initInspection = async () => {
      if (templateId && !inspectionId && templateData) {
        const inspection = await createInspection(templateId, inspectionTitle);
        if (inspection) {
          setInspectionId(inspection.id);
        }
      }
    };
    initInspection();
  }, [templateId, templateData]);

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
    if (templateData) {
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

  const handleSubmit = async () => {
    if (answeredQuestions < totalQuestions) {
      toast.error(`Please answer all questions (${answeredQuestions}/${totalQuestions} completed)`);
      return;
    }

    setSaving(true);

    if (inspectionId && templateData) {
      // Save to database
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

      await saveInspectionAnswers(inspectionId, answerData);
      await completeInspection(inspectionId, totalScore, maxScore);
    } else {
      toast.success("Inspection submitted successfully!");
    }

    setSaving(false);
    navigate("/checklists");
  };

  return (
    <AppLayout title={inspectionTitle}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Button variant="ghost" onClick={() => navigate("/checklists")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Checklists
          </Button>
          <div className="flex items-center gap-3">
            <Button variant="outline" disabled={saving}>
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

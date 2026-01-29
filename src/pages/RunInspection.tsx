import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { InspectionRunner, QuestionAnswer } from "@/components/checklists/InspectionRunner";
import { CreateWorkOrderFromDefect } from "@/components/checklists/CreateWorkOrderFromDefect";
import { TemplateSection, QuestionItem } from "@/components/checklists/TemplateBuilder";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Send, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Sample template for demo
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
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Record<string, QuestionAnswer>>({});
  const [workOrderModal, setWorkOrderModal] = useState<{
    open: boolean;
    question?: QuestionItem;
    section?: TemplateSection;
  }>({ open: false });

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

  const handleSaveWorkOrder = (workOrder: any) => {
    console.log("Work order created:", workOrder);
    // In real app, save to database
  };

  // Calculate totals
  const totalQuestions = sampleTemplate.reduce((acc, s) => acc + s.questions.length, 0);
  const answeredQuestions = Object.keys(answers).length;
  const totalScore = Object.values(answers).reduce((acc, a) => acc + (a.score || 0), 0);
  const maxScore = sampleTemplate.reduce(
    (acc, s) => acc + s.questions.reduce((qacc, q) => qacc + q.score, 0),
    0
  );
  const defectCount = Object.values(answers).filter((a) => a.isDefect).length;
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  const handleSubmit = () => {
    if (answeredQuestions < totalQuestions) {
      toast.error(`Please answer all questions (${answeredQuestions}/${totalQuestions} completed)`);
      return;
    }
    toast.success("Inspection submitted successfully!");
    navigate("/checklists");
  };

  return (
    <AppLayout title="Daily Safety Inspection">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/checklists")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Checklists
          </Button>
          <div className="flex items-center gap-3">
            <Button variant="outline">
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
            <Button
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={handleSubmit}
            >
              <Send className="w-4 h-4 mr-2" />
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
          sections={sampleTemplate}
          answers={answers}
          onAnswer={handleAnswer}
          onCreateWorkOrder={handleCreateWorkOrder}
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
                  checklistTitle: "Daily Safety Inspection",
                }
              : undefined
          }
          onSave={handleSaveWorkOrder}
        />
      </div>
    </AppLayout>
  );
}

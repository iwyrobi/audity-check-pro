import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  Camera,
  MessageSquare,
  Wrench,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { TemplateSection, QuestionItem } from "./TemplateBuilder";
import { MediaUploader } from "@/components/media/MediaUploader";

export type AnswerValue = "yes" | "no" | "na" | number | string;

export interface QuestionAnswer {
  questionId: string;
  value: AnswerValue;
  notes?: string;
  photos?: string[];
  score: number;
  maxScore: number;
  isDefect: boolean;
}

interface InspectionRunnerProps {
  sections: TemplateSection[];
  answers: Record<string, QuestionAnswer>;
  onAnswer: (questionId: string, answer: Partial<QuestionAnswer>) => void;
  onCreateWorkOrder: (question: QuestionItem, section: TemplateSection) => void;
  inspectionId?: string;
}

export function InspectionRunner({
  sections,
  answers,
  onAnswer,
  onCreateWorkOrder,
  inspectionId,
}: InspectionRunnerProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(
    sections.map((s) => s.id)
  );
  const [showNotes, setShowNotes] = useState<Record<string, boolean>>({});
  const [showPhotos, setShowPhotos] = useState<Record<string, boolean>>({});

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleYesNoAnswer = (question: QuestionItem, value: "yes" | "no" | "na") => {
    const isDefect = value === "no";
    const score = value === "yes" ? question.score : 0;
    onAnswer(question.id, {
      value,
      score,
      maxScore: question.score,
      isDefect,
    });
  };

  const handleScoreAnswer = (question: QuestionItem, value: number) => {
    const isDefect = value < question.score * 0.6; // Less than 60% is a defect
    onAnswer(question.id, {
      value,
      score: value,
      maxScore: question.score,
      isDefect,
    });
  };

  const getSectionScore = (section: TemplateSection) => {
    let earned = 0;
    let max = 0;
    section.questions.forEach((q) => {
      const answer = answers[q.id];
      if (answer) {
        earned += answer.score;
      }
      max += q.score;
    });
    return { earned, max, percentage: max > 0 ? Math.round((earned / max) * 100) : 0 };
  };

  const getSectionDefects = (section: TemplateSection) => {
    return section.questions.filter((q) => answers[q.id]?.isDefect).length;
  };

  return (
    <div className="space-y-4">
      {sections.map((section) => {
        const isExpanded = expandedSections.includes(section.id);
        const sectionScore = getSectionScore(section);
        const defectCount = getSectionDefects(section);

        return (
          <div
            key={section.id}
            className="border border-border rounded-xl overflow-hidden bg-card"
          >
            {/* Section Header */}
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center justify-between p-4 bg-secondary/50 hover:bg-secondary/70 transition-colors"
            >
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-foreground">{section.title}</h3>
                {defectCount > 0 && (
                  <span className="status-badge bg-destructive/10 text-destructive">
                    {defectCount} defect{defectCount > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span
                    className={cn(
                      "text-lg font-bold",
                      sectionScore.percentage >= 80
                        ? "text-success"
                        : sectionScore.percentage >= 60
                        ? "text-warning"
                        : "text-destructive"
                    )}
                  >
                    {sectionScore.percentage}%
                  </span>
                  <span className="text-sm text-muted-foreground ml-2">
                    ({sectionScore.earned}/{sectionScore.max} pts)
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            </button>

            {/* Questions */}
            {isExpanded && (
              <div className="divide-y divide-border">
                {section.questions.map((question, qIndex) => {
                  const answer = answers[question.id];
                  const isDefect = answer?.isDefect;

                  return (
                    <div
                      key={question.id}
                      className={cn(
                        "p-4 transition-colors",
                        isDefect && "bg-destructive/5"
                      )}
                    >
                      <div className="flex items-start gap-4">
                        {/* Question Number & Text */}
                        <div className="flex-1">
                          <div className="flex items-start gap-2">
                            <span className="text-sm font-medium text-muted-foreground">
                              {qIndex + 1}.
                            </span>
                            <div className="flex-1">
                              <p className="font-medium text-foreground">
                                {question.text || "Untitled Question"}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {question.score} pts · {question.required ? "Required" : "Optional"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Answer Controls */}
                        <div className="flex items-center gap-2">
                          {question.type === "yes-no" && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleYesNoAnswer(question, "yes")}
                                className={cn(
                                  "p-2 rounded-lg border transition-all",
                                  answer?.value === "yes"
                                    ? "bg-success/10 border-success text-success"
                                    : "border-border hover:bg-secondary"
                                )}
                              >
                                <CheckCircle2 className="w-6 h-6" />
                              </button>
                              <button
                                onClick={() => handleYesNoAnswer(question, "no")}
                                className={cn(
                                  "p-2 rounded-lg border transition-all",
                                  answer?.value === "no"
                                    ? "bg-destructive/10 border-destructive text-destructive"
                                    : "border-border hover:bg-secondary"
                                )}
                              >
                                <XCircle className="w-6 h-6" />
                              </button>
                              <button
                                onClick={() => handleYesNoAnswer(question, "na")}
                                className={cn(
                                  "p-2 rounded-lg border transition-all",
                                  answer?.value === "na"
                                    ? "bg-muted border-muted-foreground text-muted-foreground"
                                    : "border-border hover:bg-secondary"
                                )}
                              >
                                <MinusCircle className="w-6 h-6" />
                              </button>
                            </div>
                          )}

                          {question.type === "score" && (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min={0}
                                max={question.score}
                                value={(answer?.value as number) || ""}
                                onChange={(e) =>
                                  handleScoreAnswer(
                                    question,
                                    Math.min(parseInt(e.target.value) || 0, question.score)
                                  )
                                }
                                className="w-20"
                                placeholder="0"
                              />
                              <span className="text-sm text-muted-foreground">
                                / {question.score}
                              </span>
                            </div>
                          )}

                          {question.type === "text" && (
                            <Input
                              value={(answer?.value as string) || ""}
                              onChange={(e) =>
                                onAnswer(question.id, {
                                  value: e.target.value,
                                  score: e.target.value ? question.score : 0,
                                  maxScore: question.score,
                                  isDefect: false,
                                })
                              }
                              placeholder="Enter response..."
                              className="w-48"
                            />
                          )}

                          {/* Action buttons */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setShowNotes((prev) => ({
                                ...prev,
                                [question.id]: !prev[question.id],
                              }))
                            }
                            className={cn(
                              showNotes[question.id] && "bg-secondary"
                            )}
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setShowPhotos((prev) => ({
                                ...prev,
                                [question.id]: !prev[question.id],
                              }))
                            }
                            className={cn(
                              showPhotos[question.id] && "bg-secondary"
                            )}
                          >
                            <Camera className="w-4 h-4" />
                          </Button>

                          {isDefect && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onCreateWorkOrder(question, section)}
                              className="border-destructive/50 text-destructive hover:bg-destructive/10"
                            >
                              <Wrench className="w-4 h-4 mr-1" />
                              Create WO
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Notes section */}
                      {showNotes[question.id] && (
                        <div className="mt-3 ml-6">
                          <Textarea
                            value={answer?.notes || ""}
                            onChange={(e) =>
                              onAnswer(question.id, { notes: e.target.value })
                            }
                            placeholder="Add notes or comments..."
                            rows={2}
                            className="text-sm"
                          />
                        </div>
                      )}

                      {/* Photos section */}
                      {showPhotos[question.id] && inspectionId && (
                        <div className="mt-3 ml-6">
                          <MediaUploader
                            associatedType="inspection_answer"
                            associatedId={`${inspectionId}_${question.id}`}
                            compact
                            maxFiles={5}
                          />
                        </div>
                      )}

                      {/* Defect indicator */}
                      {isDefect && (
                        <div className="mt-3 ml-6 flex items-center gap-2 text-destructive">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            Defect identified - Create work order to address
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

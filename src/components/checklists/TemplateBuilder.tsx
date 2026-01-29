import { useState } from "react";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface QuestionItem {
  id: string;
  text: string;
  type: "yes-no" | "score" | "text" | "multiple-choice";
  required: boolean;
  score: number;
  options?: string[];
  category?: string;
}

export interface TemplateSection {
  id: string;
  title: string;
  questions: QuestionItem[];
  isExpanded: boolean;
}

interface TemplateBuilderProps {
  sections: TemplateSection[];
  onChange: (sections: TemplateSection[]) => void;
}

const questionTypes = [
  { value: "yes-no", label: "Yes / No / N/A" },
  { value: "score", label: "Score (0-10)" },
  { value: "text", label: "Text Response" },
  { value: "multiple-choice", label: "Multiple Choice" },
];

export function TemplateBuilder({ sections, onChange }: TemplateBuilderProps) {
  const addSection = () => {
    const newSection: TemplateSection = {
      id: `section-${Date.now()}`,
      title: "New Section",
      questions: [],
      isExpanded: true,
    };
    onChange([...sections, newSection]);
  };

  const updateSection = (sectionId: string, updates: Partial<TemplateSection>) => {
    onChange(
      sections.map((s) => (s.id === sectionId ? { ...s, ...updates } : s))
    );
  };

  const deleteSection = (sectionId: string) => {
    onChange(sections.filter((s) => s.id !== sectionId));
  };

  const addQuestion = (sectionId: string) => {
    const newQuestion: QuestionItem = {
      id: `question-${Date.now()}`,
      text: "",
      type: "yes-no",
      required: true,
      score: 1,
    };
    onChange(
      sections.map((s) =>
        s.id === sectionId
          ? { ...s, questions: [...s.questions, newQuestion] }
          : s
      )
    );
  };

  const updateQuestion = (
    sectionId: string,
    questionId: string,
    updates: Partial<QuestionItem>
  ) => {
    onChange(
      sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              questions: s.questions.map((q) =>
                q.id === questionId ? { ...q, ...updates } : q
              ),
            }
          : s
      )
    );
  };

  const deleteQuestion = (sectionId: string, questionId: string) => {
    onChange(
      sections.map((s) =>
        s.id === sectionId
          ? { ...s, questions: s.questions.filter((q) => q.id !== questionId) }
          : s
      )
    );
  };

  const toggleSection = (sectionId: string) => {
    updateSection(sectionId, {
      isExpanded: !sections.find((s) => s.id === sectionId)?.isExpanded,
    });
  };

  const totalScore = sections.reduce(
    (acc, s) => acc + s.questions.reduce((qacc, q) => qacc + q.score, 0),
    0
  );

  return (
    <div className="space-y-4">
      {/* Score Summary */}
      <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/10">
        <span className="text-sm font-medium text-foreground">Total Possible Score</span>
        <span className="text-2xl font-bold text-primary">{totalScore} pts</span>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((section, sectionIndex) => (
          <div
            key={section.id}
            className="border border-border rounded-xl overflow-hidden bg-card"
          >
            {/* Section Header */}
            <div className="flex items-center gap-3 p-4 bg-secondary/50">
              <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab" />
              <Input
                value={section.title}
                onChange={(e) =>
                  updateSection(section.id, { title: e.target.value })
                }
                className="flex-1 font-semibold bg-transparent border-0 p-0 h-auto focus-visible:ring-0"
                placeholder="Section Title"
              />
              <span className="text-sm text-muted-foreground">
                {section.questions.length} questions
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleSection(section.id)}
              >
                {section.isExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteSection(section.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            {/* Questions */}
            {section.isExpanded && (
              <div className="p-4 space-y-3">
                {section.questions.map((question, qIndex) => (
                  <div
                    key={question.id}
                    className="flex gap-3 p-4 bg-secondary/30 rounded-lg border border-border/50 animate-fade-in"
                  >
                    <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab mt-2" />
                    <div className="flex-1 space-y-3">
                      <div className="flex gap-3">
                        <span className="text-sm font-medium text-muted-foreground mt-2 w-8">
                          Q{qIndex + 1}
                        </span>
                        <Input
                          value={question.text}
                          onChange={(e) =>
                            updateQuestion(section.id, question.id, {
                              text: e.target.value,
                            })
                          }
                          placeholder="Enter question text..."
                          className="flex-1"
                        />
                      </div>
                      <div className="flex flex-wrap gap-3 pl-11">
                        <Select
                          value={question.type}
                          onValueChange={(value: QuestionItem["type"]) =>
                            updateQuestion(section.id, question.id, { type: value })
                          }
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {questionTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-muted-foreground">Score:</label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={question.score}
                            onChange={(e) =>
                              updateQuestion(section.id, question.id, {
                                score: parseInt(e.target.value) || 0,
                              })
                            }
                            className="w-20"
                          />
                          <span className="text-sm text-muted-foreground">pts</span>
                        </div>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={question.required}
                            onChange={(e) =>
                              updateQuestion(section.id, question.id, {
                                required: e.target.checked,
                              })
                            }
                            className="rounded border-border"
                          />
                          Required
                        </label>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteQuestion(section.id, question.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}

                <Button
                  variant="outline"
                  className="w-full border-dashed"
                  onClick={() => addQuestion(section.id)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Question
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Section Button */}
      <Button
        variant="outline"
        className="w-full border-dashed border-2"
        onClick={addSection}
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Section
      </Button>
    </div>
  );
}

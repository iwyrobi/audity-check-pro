import { useState } from "react";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
  defaultCollapsed?: boolean; // If true, section starts collapsed when running inspection
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

interface SortableQuestionProps {
  question: QuestionItem;
  index: number;
  sectionId: string;
  onUpdate: (sectionId: string, questionId: string, updates: Partial<QuestionItem>) => void;
  onDelete: (sectionId: string, questionId: string) => void;
}

function SortableQuestion({ question, index, sectionId, onUpdate, onDelete }: SortableQuestionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex gap-3 p-4 bg-secondary/30 rounded-lg border border-border/50",
        isDragging && "opacity-50 shadow-lg z-50"
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="w-5 h-5 text-muted-foreground mt-2" />
      </div>
      <div className="flex-1 space-y-3">
        <div className="flex gap-3">
          <span className="text-sm font-medium text-muted-foreground mt-2 w-8">
            Q{index + 1}
          </span>
          <Input
            value={question.text}
            onChange={(e) =>
              onUpdate(sectionId, question.id, { text: e.target.value })
            }
            placeholder="Enter question text..."
            className="flex-1"
          />
        </div>
        <div className="flex flex-wrap gap-3 pl-11">
          <Select
            value={question.type}
            onValueChange={(value: QuestionItem["type"]) =>
              onUpdate(sectionId, question.id, { type: value })
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
                onUpdate(sectionId, question.id, {
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
                onUpdate(sectionId, question.id, {
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
        onClick={() => onDelete(sectionId, question.id)}
        className="text-destructive hover:text-destructive"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}

interface SortableSectionProps {
  section: TemplateSection;
  sectionIndex: number;
  onUpdateSection: (sectionId: string, updates: Partial<TemplateSection>) => void;
  onDeleteSection: (sectionId: string) => void;
  onAddQuestion: (sectionId: string) => void;
  onUpdateQuestion: (sectionId: string, questionId: string, updates: Partial<QuestionItem>) => void;
  onDeleteQuestion: (sectionId: string, questionId: string) => void;
  onReorderQuestions: (sectionId: string, oldIndex: number, newIndex: number) => void;
}

function SortableSection({
  section,
  sectionIndex,
  onUpdateSection,
  onDeleteSection,
  onAddQuestion,
  onUpdateQuestion,
  onDeleteQuestion,
  onReorderQuestions,
}: SortableSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleQuestionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = section.questions.findIndex((q) => q.id === active.id);
      const newIndex = section.questions.findIndex((q) => q.id === over.id);
      onReorderQuestions(section.id, oldIndex, newIndex);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "border border-border rounded-xl overflow-hidden bg-card",
        isDragging && "opacity-50 shadow-lg"
      )}
    >
      {/* Section Header */}
      <div className="flex items-center gap-3 p-4 bg-secondary/50">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical className="w-5 h-5 text-muted-foreground" />
        </div>
        <Input
          value={section.title}
          onChange={(e) => onUpdateSection(section.id, { title: e.target.value })}
          className="flex-1 font-semibold bg-transparent border-0 p-0 h-auto focus-visible:ring-0"
          placeholder="Section Title"
        />
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {section.questions.length} questions
          </span>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={section.defaultCollapsed || false}
              onChange={(e) =>
                onUpdateSection(section.id, { defaultCollapsed: e.target.checked })
              }
              className="rounded border-border w-3.5 h-3.5"
            />
            Collapse by default
          </label>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() =>
            onUpdateSection(section.id, { isExpanded: !section.isExpanded })
          }
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
          onClick={() => onDeleteSection(section.id)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Questions */}
      {section.isExpanded && (
        <div className="p-4 space-y-3">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleQuestionDragEnd}
          >
            <SortableContext
              items={section.questions.map((q) => q.id)}
              strategy={verticalListSortingStrategy}
            >
              {section.questions.map((question, qIndex) => (
                <SortableQuestion
                  key={question.id}
                  question={question}
                  index={qIndex}
                  sectionId={section.id}
                  onUpdate={onUpdateQuestion}
                  onDelete={onDeleteQuestion}
                />
              ))}
            </SortableContext>
          </DndContext>

          <Button
            variant="outline"
            className="w-full border-dashed"
            onClick={() => onAddQuestion(section.id)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Question
          </Button>
        </div>
      )}
    </div>
  );
}

export function TemplateBuilder({ sections, onChange }: TemplateBuilderProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  const reorderQuestions = (sectionId: string, oldIndex: number, newIndex: number) => {
    onChange(
      sections.map((s) =>
        s.id === sectionId
          ? { ...s, questions: arrayMove(s.questions, oldIndex, newIndex) }
          : s
      )
    );
  };

  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sections.findIndex((s) => s.id === active.id);
      const newIndex = sections.findIndex((s) => s.id === over.id);
      onChange(arrayMove(sections, oldIndex, newIndex));
    }
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
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleSectionDragEnd}
      >
        <SortableContext
          items={sections.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4">
            {sections.map((section, sectionIndex) => (
              <SortableSection
                key={section.id}
                section={section}
                sectionIndex={sectionIndex}
                onUpdateSection={updateSection}
                onDeleteSection={deleteSection}
                onAddQuestion={addQuestion}
                onUpdateQuestion={updateQuestion}
                onDeleteQuestion={deleteQuestion}
                onReorderQuestions={reorderQuestions}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

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

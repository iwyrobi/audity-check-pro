import { useState, useEffect } from "react";
import { X, Save, ClipboardCheck, Copy, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { TemplateBuilder, TemplateSection } from "./TemplateBuilder";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { ChecklistTemplateDB } from "@/hooks/useChecklistTemplates";

interface CreateTemplateModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (template: {
    title: string;
    description: string;
    onceDaily: boolean;
    sections: { title: string; questions: { text: string; type: string; score: number; required: boolean }[] }[];
  }) => void;
  editTemplate?: ChecklistTemplateDB | null;
  copyTemplate?: ChecklistTemplateDB | null;
}

export function CreateTemplateModal({ open, onClose, onSave, editTemplate, copyTemplate }: CreateTemplateModalProps) {
  const { department } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [onceDaily, setOnceDaily] = useState(false);
  const [sections, setSections] = useState<TemplateSection[]>([
    {
      id: "section-1",
      title: "General Inspection",
      questions: [
        {
          id: "q-1",
          text: "",
          type: "yes-no",
          required: true,
          score: 1,
        },
      ],
      isExpanded: true,
    },
  ]);

  // Populate form when editing or copying
  useEffect(() => {
    const template = editTemplate || copyTemplate;
    if (template && open) {
      setTitle(copyTemplate ? `${template.name} (Copy)` : template.name);
      setDescription(template.description || "");
      setOnceDaily(template.once_daily || false);
      
      if (template.sections && template.sections.length > 0) {
        setSections(
          template.sections.map((s) => ({
            id: s.id,
            title: s.name,
            questions: (s.questions || []).map((q) => ({
              id: q.id,
              text: q.question,
              type: q.type as "yes-no" | "score" | "text" | "multiple-choice",
              required: q.required,
              score: q.score,
            })),
            isExpanded: true,
          }))
        );
      }
    } else if (!editTemplate && !copyTemplate && open) {
      // Reset form for new template
      setTitle("");
      setDescription("");
      setOnceDaily(false);
      setSections([
        {
          id: "section-1",
          title: "General Inspection",
          questions: [
            {
              id: "q-1",
              text: "",
              type: "yes-no",
              required: true,
              score: 1,
            },
          ],
          isExpanded: true,
        },
      ]);
    }
  }, [editTemplate, copyTemplate, open]);

  const handleSave = () => {
    if (!title.trim()) {
      toast.error("Please enter a template title");
      return;
    }

    const hasQuestions = sections.some(s => s.questions.some(q => q.text.trim()));
    if (!hasQuestions) {
      toast.error("Please add at least one question");
      return;
    }

    const templateData = {
      title,
      description,
      onceDaily,
      sections: sections.map(s => ({
        title: s.title,
        questions: s.questions
          .filter(q => q.text.trim())
          .map(q => ({
            text: q.text,
            type: q.type,
            score: q.score,
            required: q.required,
          })),
      })).filter(s => s.questions.length > 0),
    };

    onSave(templateData);
    toast.success(editTemplate ? "Checklist updated!" : "Checklist template created!");
    
    // Reset form
    setTitle("");
    setDescription("");
    setOnceDaily(false);
    setSections([
      {
        id: "section-1",
        title: "General Inspection",
        questions: [
          {
            id: "q-1",
            text: "",
            type: "yes-no",
            required: true,
            score: 1,
          },
        ],
        isExpanded: true,
      },
    ]);
  };

  const totalQuestions = sections.reduce((acc, s) => acc + s.questions.filter(q => q.text.trim()).length, 0);
  const totalScore = sections.reduce(
    (acc, s) => acc + s.questions.filter(q => q.text.trim()).reduce((qacc, q) => qacc + q.score, 0),
    0
  );

  const modalTitle = editTemplate 
    ? "Edit Checklist Template" 
    : copyTemplate 
    ? "Copy Checklist Template" 
    : "Create Checklist Template";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              {copyTemplate ? (
                <Copy className="w-5 h-5 text-primary" />
              ) : (
                <ClipboardCheck className="w-5 h-5 text-primary" />
              )}
            </div>
            {modalTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Template Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Template Title *</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Daily Safety Inspection"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Department</label>
              <Input
                value={department?.name || "Not assigned"}
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the purpose and scope of this checklist..."
              rows={3}
            />
          </div>

          {/* Once Daily Toggle */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <CalendarClock className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Execute Once Daily</p>
                <p className="text-xs text-muted-foreground">
                  When enabled, this checklist can only be started once per day
                </p>
              </div>
            </div>
            <Switch
              checked={onceDaily}
              onCheckedChange={setOnceDaily}
            />
          </div>

          {/* Stats Bar */}
          <div className="flex items-center gap-6 p-4 bg-secondary rounded-lg">
            <div>
              <span className="text-sm text-muted-foreground">Sections</span>
              <p className="text-xl font-bold">{sections.length}</p>
            </div>
            <div className="w-px h-10 bg-border" />
            <div>
              <span className="text-sm text-muted-foreground">Questions</span>
              <p className="text-xl font-bold">{totalQuestions}</p>
            </div>
            <div className="w-px h-10 bg-border" />
            <div>
              <span className="text-sm text-muted-foreground">Max Score</span>
              <p className="text-xl font-bold text-primary">{totalScore} pts</p>
            </div>
          </div>

          {/* Template Builder */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Questions & Sections (drag to reorder)</label>
            <TemplateBuilder sections={sections} onChange={setSections} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Save className="w-4 h-4 mr-2" />
            {editTemplate ? "Update Template" : "Save Template"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

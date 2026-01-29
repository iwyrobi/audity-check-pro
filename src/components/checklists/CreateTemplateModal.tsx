import { useState } from "react";
import { X, Save, ClipboardCheck } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TemplateBuilder, TemplateSection } from "./TemplateBuilder";
import { toast } from "sonner";

interface CreateTemplateModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (template: ChecklistTemplate) => void;
}

export interface ChecklistTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  sections: TemplateSection[];
  createdAt: string;
}

const categories = ["Safety", "Maintenance", "Quality", "Fleet", "Hygiene", "IT", "HR", "Other"];

export function CreateTemplateModal({ open, onClose, onSave }: CreateTemplateModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Safety");
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

  const handleSave = () => {
    if (!title.trim()) {
      toast.error("Please enter a template title");
      return;
    }

    const template: ChecklistTemplate = {
      id: `template-${Date.now()}`,
      title,
      description,
      category,
      sections,
      createdAt: new Date().toISOString(),
    };

    onSave(template);
    toast.success("Checklist template created successfully!");
    onClose();
    
    // Reset form
    setTitle("");
    setDescription("");
    setCategory("Safety");
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

  const totalQuestions = sections.reduce((acc, s) => acc + s.questions.length, 0);
  const totalScore = sections.reduce(
    (acc, s) => acc + s.questions.reduce((qacc, q) => qacc + q.score, 0),
    0
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5 text-primary" />
            </div>
            Create Checklist Template
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
              <label className="text-sm font-medium">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <label className="text-sm font-medium">Questions & Sections</label>
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
            Save Template
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

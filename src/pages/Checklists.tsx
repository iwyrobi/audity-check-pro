import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ChecklistCard } from "@/components/checklists/ChecklistCard";
import { CreateTemplateModal } from "@/components/checklists/CreateTemplateModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Grid, List, Loader2 } from "lucide-react";
import { useChecklistTemplates, ChecklistTemplateDB } from "@/hooks/useChecklistTemplates";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useDepartments } from "@/hooks/useDepartments";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Checklists() {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ChecklistTemplateDB | null>(null);
  const [copyingTemplate, setCopyingTemplate] = useState<ChecklistTemplateDB | null>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("all");
  
  const { templates, loading, createTemplate, updateTemplate, deleteTemplate } = useChecklistTemplates();
  const { profile, department, isDepartmentHead, isAdmin } = useAuth();
  const { departments } = useDepartments();
  const { toast } = useToast();

  const canCreateTemplates = isAdmin || isDepartmentHead;

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (template.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    
    // Filter by department for admins
    if (isAdmin && selectedDepartmentId !== "all") {
      return matchesSearch && template.department_id === selectedDepartmentId;
    }
    
    return matchesSearch;
  });

  const handleSaveTemplate = async (templateData: {
    title: string;
    description: string;
    onceDaily: boolean;
    sections: { title: string; questions: { text: string; type: string; score: number; required: boolean }[] }[];
  }) => {
    if (editingTemplate) {
      // Update existing template
      const result = await updateTemplate(
        editingTemplate.id,
        templateData.title,
        templateData.description,
        templateData.sections,
        templateData.onceDaily
      );
      if (result) {
        setIsCreateModalOpen(false);
        setEditingTemplate(null);
      }
    } else {
      // Create new template (or copy)
      const result = await createTemplate(
        templateData.title,
        templateData.description,
        department?.name || "General",
        templateData.sections,
        templateData.onceDaily
      );
      if (result) {
        setIsCreateModalOpen(false);
        setCopyingTemplate(null);
      }
    }
  };

  const handleEdit = (template: ChecklistTemplateDB) => {
    setEditingTemplate(template);
    setCopyingTemplate(null);
    setIsCreateModalOpen(true);
  };

  const handleCopy = (template: ChecklistTemplateDB) => {
    setCopyingTemplate(template);
    setEditingTemplate(null);
    setIsCreateModalOpen(true);
  };

  const handleArchive = async (template: ChecklistTemplateDB) => {
    if (!confirm(`Are you sure you want to archive "${template.name}"?`)) {
      return;
    }
    await deleteTemplate(template.id);
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    setEditingTemplate(null);
    setCopyingTemplate(null);
  };

  const getQuestionCount = (template: typeof templates[0]) => {
    return (template.sections || []).reduce(
      (acc, section) => acc + (section.questions?.length || 0),
      0
    );
  };

  if (loading) {
    return (
      <AppLayout title="Checklists">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Checklists">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search checklists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full sm:w-64"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center border border-border rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded ${viewMode === "grid" ? "bg-secondary" : ""}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded ${viewMode === "list" ? "bg-secondary" : ""}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            {canCreateTemplates && (
              <Button 
                className="bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={() => {
                  setEditingTemplate(null);
                  setCopyingTemplate(null);
                  setIsCreateModalOpen(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Checklist
              </Button>
            )}
          </div>
        </div>

        {/* Department Filter */}
        <div className="p-3 bg-primary/5 border border-primary/10 rounded-lg text-sm flex items-center gap-2">
          <span>Showing checklists for:</span>
          {isAdmin ? (
            <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
              <SelectTrigger className="w-[180px] h-8 bg-background">
                <SelectValue placeholder="Select department" />
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
          ) : (
            <strong>{department?.name || "No Department"}</strong>
          )}
        </div>

        {/* Not assigned to department warning */}
        {!profile?.department_id && (
          <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg text-warning">
            You are not assigned to a department. Please contact an administrator.
          </div>
        )}

        {/* Checklists Grid */}
        <div className={viewMode === "grid" 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          : "space-y-3"
        }>
          {filteredTemplates.map((template, index) => (
            <div
              key={template.id}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <ChecklistCard 
                checklist={{
                  id: template.id,
                  title: template.name,
                  description: template.description || "",
                  departmentName: template.department?.name || "No Department",
                  itemCount: getQuestionCount(template),
                  status: "active",
                }}
                templateData={template}
                onEdit={() => handleEdit(template)}
                onCopy={() => handleCopy(template)}
                onArchive={() => handleArchive(template)}
              />
            </div>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {templates.length === 0 
                ? "No checklists yet. Create your first template to get started."
                : "No checklists found matching your criteria."
              }
            </p>
          </div>
        )}
      </div>

      {/* Create/Edit Template Modal */}
      <CreateTemplateModal
        open={isCreateModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveTemplate}
        editTemplate={editingTemplate}
        copyTemplate={copyingTemplate}
      />
    </AppLayout>
  );
}

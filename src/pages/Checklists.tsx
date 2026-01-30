import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ChecklistCard } from "@/components/checklists/ChecklistCard";
import { CreateTemplateModal } from "@/components/checklists/CreateTemplateModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, Grid, List, Loader2 } from "lucide-react";
import { useChecklistTemplates } from "@/hooks/useChecklistTemplates";
import { useAuth } from "@/contexts/AuthContext";

const categories = ["All", "Safety", "Maintenance", "Quality", "Fleet", "Hygiene", "IT", "HR"];

export default function Checklists() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  const { templates, loading, createTemplate } = useChecklistTemplates();
  const { profile, isDepartmentHead, isAdmin } = useAuth();

  const canCreateTemplates = isAdmin || isDepartmentHead;

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (template.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesCategory = selectedCategory === "All" || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSaveTemplate = async (templateData: {
    title: string;
    description: string;
    category: string;
    sections: { title: string; questions: { text: string; type: string; score: number; required: boolean }[] }[];
  }) => {
    const result = await createTemplate(
      templateData.title,
      templateData.description,
      templateData.category,
      templateData.sections
    );
    if (result) {
      setIsCreateModalOpen(false);
    }
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
            <Button variant="outline" size="icon">
              <Filter className="w-4 h-4" />
            </Button>
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
                onClick={() => setIsCreateModalOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Checklist
              </Button>
            )}
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === category
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {category}
            </button>
          ))}
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
                  category: template.category || "Other",
                  itemCount: getQuestionCount(template),
                  status: "active",
                }}
                templateData={template}
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

      {/* Create Template Modal */}
      <CreateTemplateModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleSaveTemplate}
      />
    </AppLayout>
  );
}

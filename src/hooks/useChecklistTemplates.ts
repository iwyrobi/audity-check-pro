import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface ChecklistTemplateDB {
  id: string;
  department_id: string;
  name: string;
  description: string | null;
  category: string | null;
  created_by: string | null;
  created_at: string;
  once_daily: boolean;
  assigned_to: string | null;
  sections?: TemplateSectionDB[];
  department?: {
    id: string;
    name: string;
  };
  assigned_profile?: {
    full_name: string | null;
  } | null;
}

export interface TemplateSectionDB {
  id: string;
  template_id: string;
  name: string;
  sort_order: number;
  questions?: TemplateQuestionDB[];
}

export interface TemplateQuestionDB {
  id: string;
  section_id: string;
  question: string;
  type: string;
  score: number;
  options: any;
  required: boolean;
  sort_order: number;
}

export function useChecklistTemplates() {
  const [templates, setTemplates] = useState<ChecklistTemplateDB[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const fetchTemplates = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("checklist_templates")
        .select(`
          *,
          department:departments(id, name),
          assigned_profile:profiles!checklist_templates_assigned_to_fkey(full_name),
          sections:template_sections(
            *,
            questions:template_questions(*)
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Sort sections and questions by sort_order
      const sorted = (data || []).map((template: any) => ({
        ...template,
        sections: (template.sections || [])
          .sort((a: any, b: any) => a.sort_order - b.sort_order)
          .map((section: any) => ({
            ...section,
            questions: (section.questions || []).sort(
              (a: any, b: any) => a.sort_order - b.sort_order
            ),
          })),
      }));

      setTemplates(sorted);
    } catch (error: any) {
      console.error("Error fetching templates:", error);
      toast({
        title: "Error",
        description: "Failed to load templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTemplates();
    }
  }, [user]);

  const createTemplate = async (
    name: string,
    description: string,
    category: string,
    sections: { title: string; questions: { text: string; type: string; score: number; required: boolean }[] }[],
    onceDaily: boolean = false,
    assignedTo: string | null = null
  ) => {
    if (!user || !profile?.department_id) {
      toast({
        title: "Error",
        description: "You must be assigned to a department to create templates",
        variant: "destructive",
      });
      return null;
    }

    try {
      // Create template
      const { data: template, error: templateError } = await supabase
        .from("checklist_templates")
        .insert({
          department_id: profile.department_id,
          name,
          description,
          category,
          created_by: user.id,
          once_daily: onceDaily,
          assigned_to: assignedTo,
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Create sections and questions
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        const { data: sectionData, error: sectionError } = await supabase
          .from("template_sections")
          .insert({
            template_id: template.id,
            name: section.title,
            sort_order: i,
          })
          .select()
          .single();

        if (sectionError) throw sectionError;

        // Create questions for this section
        const questionInserts = section.questions.map((q, qIndex) => ({
          section_id: sectionData.id,
          question: q.text,
          type: q.type,
          score: q.score,
          required: q.required,
          sort_order: qIndex,
        }));

        if (questionInserts.length > 0) {
          const { error: questionsError } = await supabase
            .from("template_questions")
            .insert(questionInserts);

          if (questionsError) throw questionsError;
        }
      }

      await fetchTemplates();
      return template;
    } catch (error: any) {
      console.error("Error creating template:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create template",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateTemplate = async (
    templateId: string,
    name: string,
    description: string,
    sections: { title: string; questions: { text: string; type: string; score: number; required: boolean }[] }[],
    onceDaily: boolean = false,
    assignedTo: string | null = null
  ) => {
    if (!user) return null;

    try {
      // Update template
      const { error: templateError } = await supabase
        .from("checklist_templates")
        .update({ name, description, once_daily: onceDaily, assigned_to: assignedTo })
        .eq("id", templateId);

      if (templateError) throw templateError;

      // Delete existing sections (cascade will delete questions)
      const { error: deleteSectionsError } = await supabase
        .from("template_sections")
        .delete()
        .eq("template_id", templateId);

      if (deleteSectionsError) throw deleteSectionsError;

      // Re-create sections and questions
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        const { data: sectionData, error: sectionError } = await supabase
          .from("template_sections")
          .insert({
            template_id: templateId,
            name: section.title,
            sort_order: i,
          })
          .select()
          .single();

        if (sectionError) throw sectionError;

        const questionInserts = section.questions.map((q, qIndex) => ({
          section_id: sectionData.id,
          question: q.text,
          type: q.type,
          score: q.score,
          required: q.required,
          sort_order: qIndex,
        }));

        if (questionInserts.length > 0) {
          const { error: questionsError } = await supabase
            .from("template_questions")
            .insert(questionInserts);

          if (questionsError) throw questionsError;
        }
      }

      await fetchTemplates();
      return { id: templateId };
    } catch (error: any) {
      console.error("Error updating template:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update template",
        variant: "destructive",
      });
      return null;
    }
  };

  const deleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from("checklist_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;

      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
      toast({ title: "Template deleted" });
    } catch (error: any) {
      console.error("Error deleting template:", error);
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive",
      });
    }
  };

  return {
    templates,
    loading,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
}

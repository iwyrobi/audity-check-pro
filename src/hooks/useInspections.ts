import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface InspectionDB {
  id: string;
  template_id: string | null;
  department_id: string;
  title: string;
  location: string | null;
  status: string;
  total_score: number | null;
  max_score: number | null;
  percentage: number | null;
  created_by: string;
  completed_at: string | null;
  created_at: string;
  creator_name?: string;
  defect_count?: number;
  template_name?: string;
}

export interface InspectionAnswerDB {
  id: string;
  inspection_id: string;
  question_id: string | null;
  question_text: string;
  answer: string | null;
  score_earned: number | null;
  max_score: number | null;
  is_defect: boolean | null;
  notes: string | null;
}

export function useInspections() {
  const [inspections, setInspections] = useState<InspectionDB[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const fetchInspections = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch inspections with template name
      const { data, error } = await supabase
        .from("inspections")
        .select(`
          *,
          checklist_templates:template_id (name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch creator names using security definer function
      const creatorIds = [...new Set((data || []).map(i => i.created_by))];
      const profileMap = new Map<string, string>();
      
      await Promise.all(
        creatorIds.map(async (userId) => {
          const { data: name } = await supabase.rpc("get_profile_name", { _user_id: userId });
          profileMap.set(userId, name || "Unknown");
        })
      );

      // Fetch defect counts for each inspection
      const inspectionIds = (data || []).map(i => i.id);
      const { data: answersData } = await supabase
        .from("inspection_answers")
        .select("inspection_id, is_defect")
        .in("inspection_id", inspectionIds)
        .eq("is_defect", true);

      const defectCounts = new Map<string, number>();
      (answersData || []).forEach(a => {
        defectCounts.set(a.inspection_id, (defectCounts.get(a.inspection_id) || 0) + 1);
      });

      // Enrich inspections with creator names and defect counts
      const enrichedData = (data || []).map(i => ({
        ...i,
        creator_name: profileMap.get(i.created_by) || "Unknown",
        defect_count: defectCounts.get(i.id) || 0,
        template_name: i.checklist_templates?.name || "N/A",
      }));

      setInspections(enrichedData);
    } catch (error: any) {
      console.error("Error fetching inspections:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchInspections();
    }
  }, [user]);

  const createInspection = async (
    templateId: string,
    title: string,
    location?: string
  ) => {
    if (!user || !profile?.department_id) {
      toast({
        title: "Error",
        description: "You must be assigned to a department",
        variant: "destructive",
      });
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("inspections")
        .insert({
          template_id: templateId,
          department_id: profile.department_id,
          title,
          location,
          created_by: user.id,
          status: "in-progress",
        })
        .select()
        .single();

      if (error) throw error;
      await fetchInspections();
      return data;
    } catch (error: any) {
      console.error("Error creating inspection:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create inspection",
        variant: "destructive",
      });
      return null;
    }
  };

  const saveInspectionAnswers = async (
    inspectionId: string,
    answers: {
      questionId: string | null;
      questionText: string;
      answer: string | null;
      scoreEarned: number;
      maxScore: number;
      isDefect: boolean;
      notes?: string;
    }[]
  ) => {
    try {
      // Delete existing answers
      await supabase
        .from("inspection_answers")
        .delete()
        .eq("inspection_id", inspectionId);

      // Insert new answers
      const inserts = answers.map((a) => ({
        inspection_id: inspectionId,
        question_id: a.questionId,
        question_text: a.questionText,
        answer: a.answer,
        score_earned: a.scoreEarned,
        max_score: a.maxScore,
        is_defect: a.isDefect,
        notes: a.notes,
      }));

      const { error } = await supabase.from("inspection_answers").insert(inserts);

      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error("Error saving answers:", error);
      toast({
        title: "Error",
        description: "Failed to save inspection answers",
        variant: "destructive",
      });
      return false;
    }
  };

  const completeInspection = async (
    inspectionId: string,
    totalScore: number,
    maxScore: number
  ) => {
    try {
      const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

      const { error } = await supabase
        .from("inspections")
        .update({
          status: "completed",
          total_score: totalScore,
          max_score: maxScore,
          percentage: Math.round(percentage * 100) / 100,
          completed_at: new Date().toISOString(),
        })
        .eq("id", inspectionId);

      if (error) throw error;
      await fetchInspections();
      toast({ title: "Inspection completed!" });
      return true;
    } catch (error: any) {
      console.error("Error completing inspection:", error);
      toast({
        title: "Error",
        description: "Failed to complete inspection",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    inspections,
    loading,
    fetchInspections,
    createInspection,
    saveInspectionAnswers,
    completeInspection,
  };
}

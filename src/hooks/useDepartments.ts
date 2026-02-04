import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Department {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
}

export function useDepartments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name, description, parent_id")
        .order("name");

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error("Error fetching departments:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  return {
    departments,
    loading,
    fetchDepartments,
  };
}

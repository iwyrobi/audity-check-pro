import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Department {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
}

export interface HierarchicalDepartment extends Department {
  level: number;
  displayName: string;
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

  // Build hierarchical list with indentation
  const hierarchicalDepartments = useMemo((): HierarchicalDepartment[] => {
    const result: HierarchicalDepartment[] = [];
    
    const addDepartment = (dept: Department, level: number) => {
      const indent = level > 0 ? "└ ".padStart(level * 2 + 2, "  ") : "";
      result.push({
        ...dept,
        level,
        displayName: `${indent}${dept.name}`,
      });
      const children = departments.filter(d => d.parent_id === dept.id);
      children.forEach(child => addDepartment(child, level + 1));
    };
    
    // Start with root departments (no parent)
    const rootDepartments = departments.filter(d => !d.parent_id);
    rootDepartments.forEach(dept => addDepartment(dept, 0));
    
    return result;
  }, [departments]);

  // Get parent department name
  const getParentName = (parentId: string | null | undefined): string | null => {
    if (!parentId) return null;
    const parent = departments.find(d => d.id === parentId);
    return parent?.name || null;
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  return {
    departments,
    hierarchicalDepartments,
    loading,
    fetchDepartments,
    getParentName,
  };
}

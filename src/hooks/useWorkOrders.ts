import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface WorkOrderDB {
  id: string;
  department_id: string;
  title: string;
  description: string | null;
  location: string | null;
  priority: string;
  status: string;
  assigned_to: string | null;
  linked_inspection_id: string | null;
  linked_defect_question: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  creator_name?: string;
}

export function useWorkOrders() {
  const [workOrders, setWorkOrders] = useState<WorkOrderDB[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const fetchWorkOrders = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch work orders
      const { data, error } = await supabase
        .from("work_orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch creator names using security definer function (bypasses RLS)
      const creatorIds = [...new Set((data || []).map(wo => wo.created_by))];
      const profileMap = new Map<string, string>();
      
      // Fetch each creator's name via RPC
      await Promise.all(
        creatorIds.map(async (userId) => {
          const { data: name } = await supabase.rpc("get_profile_name", { _user_id: userId });
          profileMap.set(userId, name || "Unknown");
        })
      );

      // Enrich work orders with creator names
      const enrichedData = (data || []).map(wo => ({
        ...wo,
        creator_name: profileMap.get(wo.created_by) || "Unknown",
      }));

      setWorkOrders(enrichedData);
    } catch (error: any) {
      console.error("Error fetching work orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchWorkOrders();
    }
  }, [user]);

  const createWorkOrder = async (data: {
    title: string;
    description?: string;
    location?: string;
    priority?: string;
    dueDate?: string;
    linkedInspectionId?: string;
    linkedDefectQuestion?: string;
    departmentId?: string;
    tempWorkOrderId?: string;
  }) => {
    if (!user || !profile?.department_id) {
      toast({
        title: "Error",
        description: "You must be assigned to a department",
        variant: "destructive",
      });
      return null;
    }

    try {
      // Use specified department or default to user's department
      const targetDepartment = data.departmentId || profile.department_id;

      const { data: workOrder, error } = await supabase
        .from("work_orders")
        .insert({
          department_id: targetDepartment,
          title: data.title,
          description: data.description,
          location: data.location,
          priority: data.priority || "medium",
          status: "open",
          due_date: data.dueDate,
          linked_inspection_id: data.linkedInspectionId,
          linked_defect_question: data.linkedDefectQuestion,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // If there was a temp ID used for media uploads, update those media records
      // to point to the real work order ID
      if (data.tempWorkOrderId && workOrder) {
        const { error: mediaError } = await supabase
          .from("media")
          .update({ associated_id: workOrder.id })
          .eq("associated_id", data.tempWorkOrderId)
          .eq("associated_type", "work_order");

        if (mediaError) {
          console.error("Error updating media associations:", mediaError);
          // Don't fail the whole operation, just log the error
        }
      }

      await fetchWorkOrders();
      toast({ title: "Work order created!" });
      return workOrder;
    } catch (error: any) {
      console.error("Error creating work order:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create work order",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateWorkOrder = async (
    id: string,
    updates: Partial<{
      title: string;
      description: string;
      location: string;
      priority: string;
      status: string;
      assigned_to: string;
      due_date: string;
    }>
  ) => {
    try {
      const { error } = await supabase
        .from("work_orders")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      await fetchWorkOrders();
      toast({ title: "Work order updated" });
      return true;
    } catch (error: any) {
      console.error("Error updating work order:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update work order",
        variant: "destructive",
      });
      return false;
    }
  };

  const completeWorkOrder = async (id: string) => {
    try {
      const { error } = await supabase
        .from("work_orders")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      await fetchWorkOrders();
      toast({ title: "Work order completed!" });
      return true;
    } catch (error: any) {
      console.error("Error completing work order:", error);
      toast({
        title: "Error",
        description: "Failed to complete work order",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteWorkOrder = async (id: string) => {
    try {
      const { error } = await supabase
        .from("work_orders")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setWorkOrders((prev) => prev.filter((wo) => wo.id !== id));
      toast({ title: "Work order deleted" });
      return true;
    } catch (error: any) {
      console.error("Error deleting work order:", error);
      toast({
        title: "Error",
        description: "Failed to delete work order",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    workOrders,
    loading,
    fetchWorkOrders,
    createWorkOrder,
    updateWorkOrder,
    completeWorkOrder,
    deleteWorkOrder,
  };
}

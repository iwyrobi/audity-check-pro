import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type TableName = keyof Database["public"]["Tables"];

interface OfflineAction {
  id: string;
  type: "create" | "update" | "delete";
  table: TableName;
  data: Record<string, any>;
  timestamp: number;
}

export interface OfflineInspection {
  id: string;
  inspectionId: string;
  title: string;
  templateId: string;
  answers: {
    questionId: string;
    questionText: string;
    answer: string;
    scoreEarned: number;
    maxScore: number;
    isDefect: boolean;
    notes?: string;
  }[];
  totalScore: number;
  maxScore: number;
  isComplete: boolean;
  timestamp: number;
}

const STORAGE_KEY = "offline_queue";
const INSPECTION_STORAGE_KEY = "offline_inspections";

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingActions, setPendingActions] = useState<OfflineAction[]>([]);
  const [offlineInspections, setOfflineInspections] = useState<OfflineInspection[]>([]);
  const { toast } = useToast();

  // Load pending actions from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setPendingActions(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse offline queue:", e);
      }
    }

    const storedInspections = localStorage.getItem(INSPECTION_STORAGE_KEY);
    if (storedInspections) {
      try {
        setOfflineInspections(JSON.parse(storedInspections));
      } catch (e) {
        console.error("Failed to parse offline inspections:", e);
      }
    }
  }, []);

  // Save pending actions to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingActions));
  }, [pendingActions]);

  // Save offline inspections to localStorage
  useEffect(() => {
    localStorage.setItem(INSPECTION_STORAGE_KEY, JSON.stringify(offlineInspections));
  }, [offlineInspections]);

  const totalPendingCount = pendingActions.length + offlineInspections.length;

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "You're back online",
        description: totalPendingCount > 0 
          ? `Syncing ${totalPendingCount} pending changes...` 
          : "All changes are up to date",
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "You're offline",
        description: "Changes will be saved locally and synced when you're back online",
        variant: "destructive",
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [totalPendingCount]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && totalPendingCount > 0 && !isSyncing) {
      syncAll();
    }
  }, [isOnline, totalPendingCount]);

  const queueAction = useCallback((action: Omit<OfflineAction, "id" | "timestamp">) => {
    const newAction: OfflineAction = {
      ...action,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    setPendingActions((prev) => [...prev, newAction]);
    return newAction.id;
  }, []);

  const removeAction = useCallback((id: string) => {
    setPendingActions((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // Save inspection for offline sync
  const saveInspectionOffline = useCallback((inspection: Omit<OfflineInspection, "id" | "timestamp">) => {
    const newInspection: OfflineInspection = {
      ...inspection,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    
    // Update or add the inspection
    setOfflineInspections((prev) => {
      const existing = prev.findIndex((i) => i.inspectionId === inspection.inspectionId);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = newInspection;
        return updated;
      }
      return [...prev, newInspection];
    });
    
    return newInspection.id;
  }, []);

  const removeOfflineInspection = useCallback((inspectionId: string) => {
    setOfflineInspections((prev) => prev.filter((i) => i.inspectionId !== inspectionId));
  }, []);

  const getOfflineInspection = useCallback((inspectionId: string) => {
    return offlineInspections.find((i) => i.inspectionId === inspectionId);
  }, [offlineInspections]);

  // Sync offline inspections
  const syncOfflineInspections = async () => {
    if (!isOnline || offlineInspections.length === 0) return { synced: 0, failed: 0 };

    let syncedCount = 0;
    let failedCount = 0;

    for (const inspection of offlineInspections) {
      try {
        // Delete existing answers first
        await supabase
          .from("inspection_answers")
          .delete()
          .eq("inspection_id", inspection.inspectionId);

        // Insert new answers
        const inserts = inspection.answers.map((a) => ({
          inspection_id: inspection.inspectionId,
          question_id: a.questionId,
          question_text: a.questionText,
          answer: a.answer,
          score_earned: a.scoreEarned,
          max_score: a.maxScore,
          is_defect: a.isDefect,
          notes: a.notes,
        }));

        if (inserts.length > 0) {
          const { error: insertError } = await supabase
            .from("inspection_answers")
            .insert(inserts);

          if (insertError) throw insertError;
        }

        // If complete, update the inspection status
        if (inspection.isComplete) {
          const percentage = inspection.maxScore > 0 
            ? (inspection.totalScore / inspection.maxScore) * 100 
            : 0;

          const { error: updateError } = await supabase
            .from("inspections")
            .update({
              status: "completed",
              total_score: inspection.totalScore,
              max_score: inspection.maxScore,
              percentage: Math.round(percentage * 100) / 100,
              completed_at: new Date().toISOString(),
            })
            .eq("id", inspection.inspectionId);

          if (updateError) throw updateError;
        }

        removeOfflineInspection(inspection.inspectionId);
        syncedCount++;
      } catch (e) {
        console.error(`Error syncing inspection ${inspection.inspectionId}:`, e);
        failedCount++;
      }
    }

    return { synced: syncedCount, failed: failedCount };
  };

  const syncPendingActions = async () => {
    if (!isOnline || isSyncing || pendingActions.length === 0) return { synced: 0, failed: 0 };

    const actionsToSync = [...pendingActions];
    let syncedCount = 0;
    let failedCount = 0;

    for (const action of actionsToSync) {
      try {
        let error: any = null;

        switch (action.type) {
          case "create":
            const insertResult = await supabase
              .from(action.table)
              .insert(action.data as any);
            error = insertResult.error;
            break;

          case "update":
            const { id: updateId, ...updateData } = action.data;
            const updateResult = await supabase
              .from(action.table)
              .update(updateData as any)
              .eq("id", updateId);
            error = updateResult.error;
            break;

          case "delete":
            const deleteResult = await supabase
              .from(action.table)
              .delete()
              .eq("id", action.data.id);
            error = deleteResult.error;
            break;
        }

        if (error) {
          console.error(`Sync failed for action ${action.id}:`, error);
          failedCount++;
        } else {
          removeAction(action.id);
          syncedCount++;
        }
      } catch (e) {
        console.error(`Error syncing action ${action.id}:`, e);
        failedCount++;
      }
    }

    return { synced: syncedCount, failed: failedCount };
  };

  const syncAll = async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);

    const [actionsResult, inspectionsResult] = await Promise.all([
      syncPendingActions(),
      syncOfflineInspections(),
    ]);

    const totalSynced = actionsResult.synced + inspectionsResult.synced;
    const totalFailed = actionsResult.failed + inspectionsResult.failed;

    setIsSyncing(false);

    if (totalSynced > 0 || totalFailed > 0) {
      toast({
        title: "Sync complete",
        description: `Synced ${totalSynced} changes${totalFailed > 0 ? `, ${totalFailed} failed` : ""}`,
      });
    }
  };

  const executeWithOfflineSupport = async <T>(
    table: TableName,
    type: "create" | "update" | "delete",
    data: Record<string, any>,
    onlineExecutor: () => Promise<T>
  ): Promise<{ success: boolean; data?: T; offline?: boolean }> => {
    if (isOnline) {
      try {
        const result = await onlineExecutor();
        return { success: true, data: result };
      } catch (error) {
        console.error("Online operation failed, queuing offline:", error);
        queueAction({ type, table, data });
        return { success: true, offline: true };
      }
    } else {
      queueAction({ type, table, data });
      return { success: true, offline: true };
    }
  };

  return {
    isOnline,
    isSyncing,
    pendingCount: totalPendingCount,
    offlineInspections,
    queueAction,
    syncPendingActions: syncAll,
    executeWithOfflineSupport,
    saveInspectionOffline,
    removeOfflineInspection,
    getOfflineInspection,
  };
}
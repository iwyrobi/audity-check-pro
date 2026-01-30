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

const STORAGE_KEY = "offline_queue";

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingActions, setPendingActions] = useState<OfflineAction[]>([]);
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
  }, []);

  // Save pending actions to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingActions));
  }, [pendingActions]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "You're back online",
        description: pendingActions.length > 0 
          ? `Syncing ${pendingActions.length} pending changes...` 
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
  }, [pendingActions.length]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingActions.length > 0 && !isSyncing) {
      syncPendingActions();
    }
  }, [isOnline, pendingActions.length]);

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

  const syncPendingActions = async () => {
    if (!isOnline || isSyncing || pendingActions.length === 0) return;

    setIsSyncing(true);
    const actionsToSync = [...pendingActions];
    let syncedCount = 0;
    let failedCount = 0;

    for (const action of actionsToSync) {
      try {
        let error: any = null;

        switch (action.type) {
          case "create":
            // Use generic approach for offline sync
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

    setIsSyncing(false);

    if (syncedCount > 0) {
      toast({
        title: "Sync complete",
        description: `Synced ${syncedCount} changes${failedCount > 0 ? `, ${failedCount} failed` : ""}`,
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
    pendingCount: pendingActions.length,
    queueAction,
    syncPendingActions,
    executeWithOfflineSupport,
  };
}

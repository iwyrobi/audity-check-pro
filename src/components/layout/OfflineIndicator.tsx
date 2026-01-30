import { WifiOff, Cloud, CloudOff, Loader2 } from "lucide-react";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function OfflineIndicator() {
  const { isOnline, isSyncing, pendingCount, syncPendingActions } = useOfflineSync();

  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => isOnline && pendingCount > 0 && syncPendingActions()}
            className={cn(
              "gap-2 text-xs",
              !isOnline && "text-destructive",
              pendingCount > 0 && isOnline && "text-warning"
            )}
          >
            {!isOnline ? (
              <>
                <WifiOff className="w-4 h-4" />
                Offline
                {pendingCount > 0 && (
                  <span className="bg-destructive/20 px-1.5 py-0.5 rounded-full text-[10px]">
                    {pendingCount}
                  </span>
                )}
              </>
            ) : isSyncing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Syncing...
              </>
            ) : pendingCount > 0 ? (
              <>
                <CloudOff className="w-4 h-4" />
                {pendingCount} pending
              </>
            ) : (
              <>
                <Cloud className="w-4 h-4" />
                Synced
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {!isOnline 
            ? "You're offline. Changes will sync when back online."
            : pendingCount > 0 
              ? "Click to sync pending changes"
              : "All changes synced"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

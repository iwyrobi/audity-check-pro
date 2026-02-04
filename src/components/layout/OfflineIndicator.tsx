import { WifiOff, Cloud, CloudOff, Loader2, ClipboardCheck } from "lucide-react";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function OfflineIndicator() {
  const { isOnline, isSyncing, pendingCount, offlineInspections, syncPendingActions } = useOfflineSync();

  if (isOnline && pendingCount === 0) {
    return null;
  }

  const hasOfflineInspections = offlineInspections.length > 0;

  return (
    <TooltipProvider>
      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  if (isOnline && pendingCount > 0 && !hasOfflineInspections) {
                    e.preventDefault();
                    syncPendingActions();
                  }
                }}
                className={cn(
                  "gap-2 text-xs",
                  !isOnline && "text-destructive",
                  pendingCount > 0 && isOnline && "text-warning"
                )}
              >
                {!isOnline ? (
                  <>
                    <WifiOff className="w-4 h-4" />
                    <span className="hidden sm:inline">Offline</span>
                    {pendingCount > 0 && (
                      <span className="bg-destructive/20 px-1.5 py-0.5 rounded-full text-[10px]">
                        {pendingCount}
                      </span>
                    )}
                  </>
                ) : isSyncing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="hidden sm:inline">Syncing...</span>
                  </>
                ) : pendingCount > 0 ? (
                  <>
                    <CloudOff className="w-4 h-4" />
                    <span className="hidden sm:inline">{pendingCount} pending</span>
                    <span className="sm:hidden">{pendingCount}</span>
                  </>
                ) : (
                  <>
                    <Cloud className="w-4 h-4" />
                    <span className="hidden sm:inline">Synced</span>
                  </>
                )}
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>
            {!isOnline 
              ? "You're offline. Changes will sync when back online."
              : pendingCount > 0 
                ? hasOfflineInspections 
                  ? "Click to view pending items"
                  : "Click to sync pending changes"
                : "All changes synced"}
          </TooltipContent>
        </Tooltip>

        {(hasOfflineInspections || pendingCount > 0) && (
          <PopoverContent className="w-72" align="end">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Pending Sync</h4>
                {isOnline && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={syncPendingActions}
                    disabled={isSyncing}
                    className="h-7 text-xs"
                  >
                    {isSyncing ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Syncing
                      </>
                    ) : (
                      "Sync Now"
                    )}
                  </Button>
                )}
              </div>
              
              {offlineInspections.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Inspections</p>
                  {offlineInspections.map((inspection) => (
                    <div
                      key={inspection.id}
                      className="flex items-center gap-2 p-2 bg-secondary/50 rounded-md text-sm"
                    >
                      <ClipboardCheck className="w-4 h-4 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{inspection.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {inspection.isComplete ? "Ready to submit" : "Draft"}
                          {" · "}
                          {inspection.answers.length} answers
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {!isOnline && (
                <p className="text-xs text-muted-foreground">
                  Connect to the internet to sync your changes
                </p>
              )}
            </div>
          </PopoverContent>
        )}
      </Popover>
    </TooltipProvider>
  );
}
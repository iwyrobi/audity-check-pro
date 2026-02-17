import { Bell, Check, CheckCheck, Trash2, X, AlertTriangle, Info, CheckCircle, ClipboardList, FileSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

function getCategoryIcon(category: string) {
  switch (category) {
    case "work_order": return <ClipboardList className="w-4 h-4 text-primary" />;
    case "inspection": return <FileSearch className="w-4 h-4 text-primary" />;
    case "defect": return <AlertTriangle className="w-4 h-4 text-destructive" />;
    default: return <Info className="w-4 h-4 text-muted-foreground" />;
  }
}

function getTypeColor(type: string) {
  switch (type) {
    case "warning": return "border-l-yellow-500";
    case "success": return "border-l-green-500";
    case "error": return "border-l-destructive";
    default: return "border-l-primary";
  }
}

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAll } = useNotifications();
  const navigate = useNavigate();

  const handleClick = (notif: Notification) => {
    if (!notif.is_read) markAsRead(notif.id);
    if (notif.reference_id && notif.reference_type) {
      if (notif.reference_type === "work_order") {
        navigate("/work-orders");
      } else if (notif.reference_type === "inspection") {
        navigate(`/inspections/${notif.reference_id}`);
      }
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 sm:w-96 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h3 className="font-semibold text-sm">Notifications</h3>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllAsRead}>
                <CheckCheck className="w-3 h-3 mr-1" />
                Read all
              </Button>
            )}
            {notifications.length > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={clearAll}>
                <Trash2 className="w-3 h-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="max-h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No notifications
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={cn(
                    "flex items-start gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors border-l-2",
                    getTypeColor(notif.type),
                    !notif.is_read && "bg-muted/30"
                  )}
                  onClick={() => handleClick(notif)}
                >
                  <div className="mt-0.5">{getCategoryIcon(notif.category)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn("text-sm truncate", !notif.is_read && "font-semibold")}>
                        {notif.title}
                      </p>
                      {!notif.is_read && (
                        <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{notif.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notif.id);
                    }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

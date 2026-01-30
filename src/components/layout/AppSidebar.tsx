import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardCheck,
  ClipboardList,
  Wrench,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Plus,
  Bell,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Checklists", href: "/checklists", icon: ClipboardCheck },
  { name: "Inspections", href: "/inspections", icon: ClipboardList },
  { name: "Work Orders", href: "/work-orders", icon: Wrench },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Settings", href: "/settings", icon: Settings },
];

interface AppSidebarProps {
  onClose?: () => void;
}

export function AppSidebar({ onClose }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { department } = useAuth();

  const handleNewInspection = () => {
    navigate("/checklists");
    onClose?.();
  };

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-14 sm:h-16 px-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5 text-sidebar-primary-foreground" />
            </div>
            <span className="font-semibold text-sidebar-foreground">CheckMate</span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center mx-auto">
            <ClipboardCheck className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
        )}
        {/* Mobile close button */}
        {onClose && !collapsed && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg hover:bg-sidebar-accent"
          >
            <X className="w-5 h-5 text-sidebar-foreground" />
          </button>
        )}
      </div>

      {/* Department badge */}
      {!collapsed && department && (
        <div className="px-3 py-2">
          <div className="px-3 py-1.5 bg-sidebar-accent rounded-lg text-xs font-medium text-sidebar-accent-foreground text-center truncate">
            {department.name}
          </div>
        </div>
      )}

      {/* Quick Action */}
      <div className="p-3">
        <Button
          onClick={handleNewInspection}
          className={cn(
            "w-full bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 transition-all",
            collapsed ? "px-2" : "px-4"
          )}
        >
          <Plus className="w-4 h-4" />
          {!collapsed && <span className="ml-2">New Inspection</span>}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={onClose}
              className={cn(
                "nav-item",
                isActive && "nav-item-active"
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Notifications indicator */}
      <div className="p-3 border-t border-sidebar-border">
        <button className="nav-item w-full justify-start relative">
          <Bell className="w-5 h-5" />
          {!collapsed && <span>Notifications</span>}
          <span className="absolute top-1.5 left-6 w-2 h-2 bg-accent rounded-full" />
        </button>
      </div>

      {/* Collapse Toggle - hidden on mobile */}
      <div className="hidden lg:block p-3 border-t border-sidebar-border">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="nav-item w-full justify-center"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

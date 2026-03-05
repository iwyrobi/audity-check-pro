import { useState, useEffect } from "react";
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
  ChevronDown,
  Plus,
  Bell,
  X,
  BarChart3,
  Lock } from
"lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger } from
"@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger } from
"@/components/ui/tooltip";

const baseNavigation = [
{ name: "Dashboard", href: "/", icon: LayoutDashboard, roles: ["all"], feature: null },
{ name: "Checklists", href: "/checklists", icon: ClipboardCheck, roles: ["super_admin", "admin", "user"], feature: null },
{ name: "Inspections", href: "/inspections", icon: ClipboardList, roles: ["all"], feature: null },
{ name: "Work Orders", href: "/work-orders", icon: Wrench, roles: ["all"], feature: "work_orders" as const },
{ name: "Settings", href: "/settings", icon: Settings, roles: ["super_admin"], feature: null }];


const reportsSubmenu = [
{ name: "Dashboard", href: "/reports", icon: BarChart3, feature: "analytics" as const },
{ name: "Inspection Report", href: "/reports/inspections", icon: ClipboardList, feature: null },
{ name: "Work Order Report", href: "/reports/work-orders", icon: Wrench, feature: "work_orders" as const }];


interface AppSidebarProps {
  onClose?: () => void;
}

export function AppSidebar({ onClose }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { department, isSuperAdmin, isAdmin, isDepartmentHead, roles } = useAuth();
  const { hasFeature, subscription } = useSubscription();

  // Check if current route is under reports
  const isReportsActive = location.pathname.startsWith("/reports");
  const [reportsOpen, setReportsOpen] = useState(isReportsActive);

  // Filter navigation based on user role
  const userRole = roles.find((r) => r.role === "super_admin")?.role ||
  roles.find((r) => r.role === "admin")?.role ||
  roles.find((r) => r.role === "department_head")?.role ||
  "user";

  const navigation = baseNavigation.filter((item) => {
    if (item.roles.includes("all")) return true;
    return item.roles.includes(userRole);
  });

  const handleNewInspection = () => {
    navigate("/checklists");
    onClose?.();
  };

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}>

      {/* Logo */}
      <div className="flex items-center justify-between h-14 sm:h-16 px-4 border-b border-sidebar-border">
        {!collapsed &&
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 overflow-hidden flex items-center justify-center">
              <img src="/opsecta-logo.png" alt="Opsecta" className="scale-[3.5]" />
            </div>
            <span className="font-semibold text-sidebar-foreground">Opsecta</span>
          </div>
        }
        {collapsed &&
        <div className="mx-auto w-8 h-8 overflow-hidden flex items-center justify-center">
            <img src="/opsecta-logo.png" alt="Opsecta" className="scale-[3.5]" />
          </div>
        }
        {/* Mobile close button */}
        {onClose && !collapsed &&
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg hover:bg-sidebar-accent">

            <X className="w-5 h-5 text-sidebar-foreground" />
          </button>
        }
      </div>

      {/* Department badge */}
      {!collapsed && department &&
      <div className="px-3 py-2">
          <div className="px-3 py-1.5 bg-sidebar-accent rounded-lg text-xs font-medium text-sidebar-accent-foreground text-center truncate">
            {department.name}
          </div>
        </div>
      }

      {/* Quick Action */}
      <div className="p-3">
        <Button
          onClick={handleNewInspection}
          className={cn(
            "w-full bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 transition-all",
            collapsed ? "px-2" : "px-4"
          )}>

          <Plus className="w-4 h-4" />
          {!collapsed && <span className="ml-2">New Inspection</span>}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        <TooltipProvider>
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            const isFeatureLocked = item.feature && !hasFeature(item.feature);

            if (isFeatureLocked) {
              return (
                <Tooltip key={item.name}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "nav-item opacity-50 cursor-not-allowed"
                      )}>

                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {!collapsed &&
                      <>
                          <span>{item.name}</span>
                          <Lock className="w-3 h-3 ml-auto text-muted-foreground" />
                        </>
                      }
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Upgrade to unlock {item.name}</p>
                  </TooltipContent>
                </Tooltip>);

            }

            return (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={onClose}
                className={cn(
                  "nav-item",
                  isActive && "nav-item-active"
                )}>

                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>{item.name}</span>}
              </NavLink>);

          })}

          {/* Reports with submenu */}
          {collapsed ?
          <NavLink
            to="/reports"
            onClick={onClose}
            className={cn(
              "nav-item",
              isReportsActive && "nav-item-active"
            )}>

              <FileText className="w-5 h-5 flex-shrink-0" />
            </NavLink> :

          <Collapsible open={reportsOpen} onOpenChange={setReportsOpen}>
              <CollapsibleTrigger asChild>
                <button
                className={cn(
                  "nav-item w-full justify-between",
                  isReportsActive && "nav-item-active"
                )}>

                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 flex-shrink-0" />
                    <span>Reports</span>
                  </div>
                  <ChevronDown className={cn(
                  "w-4 h-4 transition-transform",
                  reportsOpen && "rotate-180"
                )} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-4 mt-1 space-y-1">
                {reportsSubmenu.map((subItem) => {
                const isSubActive = location.pathname === subItem.href;
                const isSubLocked = subItem.feature && !hasFeature(subItem.feature);

                if (isSubLocked) {
                  return (
                    <Tooltip key={subItem.name}>
                        <TooltipTrigger asChild>
                          <div
                          className={cn(
                            "nav-item text-sm opacity-50 cursor-not-allowed"
                          )}>

                            <subItem.icon className="w-4 h-4 flex-shrink-0" />
                            <span>{subItem.name}</span>
                            <Lock className="w-3 h-3 ml-auto text-muted-foreground" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>Upgrade to unlock {subItem.name}</p>
                        </TooltipContent>
                      </Tooltip>);

                }

                return (
                  <NavLink
                    key={subItem.name}
                    to={subItem.href}
                    onClick={onClose}
                    className={cn(
                      "nav-item text-sm",
                      isSubActive && "nav-item-active"
                    )}>

                      <subItem.icon className="w-4 h-4 flex-shrink-0" />
                      <span>{subItem.name}</span>
                    </NavLink>);

              })}
              </CollapsibleContent>
            </Collapsible>
          }
        </TooltipProvider>
      </nav>

      {/* Notifications indicator */}
      







      {/* Collapse Toggle - hidden on mobile */}
      <div className="hidden lg:block p-3 border-t border-sidebar-border">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="nav-item w-full justify-center">

          {collapsed ?
          <ChevronRight className="w-5 h-5" /> :

          <>
              <ChevronLeft className="w-5 h-5" />
              <span>Collapse</span>
            </>
          }
        </button>
      </div>
    </aside>);

}
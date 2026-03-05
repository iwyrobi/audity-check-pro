import { ReactNode, useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { OfflineIndicator } from "./OfflineIndicator";
import { TrialBanner } from "@/components/trial/TrialBanner";
import { Search, User, LogOut, Menu } from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger } from
"@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  const { user, profile, department, roles, signOut, isSuperAdmin, isAdmin, isDepartmentHead } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const getRoleBadge = () => {
    if (isSuperAdmin) return <Badge variant="destructive">Super Admin</Badge>;
    if (isAdmin) return <Badge variant="destructive">Admin</Badge>;
    if (isDepartmentHead) return <Badge variant="default">Dept Head</Badge>;
    return <Badge variant="secondary">User</Badge>;
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Mobile sidebar overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 lg:hidden transition-opacity",
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setSidebarOpen(false)} />
      
      
      {/* Sidebar */}
      <div
        className={cn("fixed inset-y-0 left-0 z-50 lg:relative lg:z-0 transition-transform lg:translate-x-0 bg-primary",

        sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
        
        <AppSidebar onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Trial Banner */}
        <TrialBanner />
        {/* Header */}
        <header className="h-14 sm:h-16 border-b border-border bg-card flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}>
              
              <Menu className="w-5 h-5" />
            </Button>
            {title &&
            <h1 className="text-lg sm:text-xl font-semibold text-foreground truncate">
                {title}
              </h1>
            }
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <OfflineIndicator />
            <NotificationBell />
            
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="w-48 lg:w-64 pl-9 bg-secondary border-0 focus-visible:ring-1" />
              
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-secondary transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <User className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <span className="hidden md:block text-sm font-medium truncate max-w-[120px]">
                    {profile?.full_name || user?.email?.split("@")[0]}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium">{profile?.full_name || "User"}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {getRoleBadge()}
                      {department &&
                      <Badge variant="outline">{department.name}</Badge>
                      }
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => window.location.href = "/profile"}
                  className="cursor-pointer">
                  
                  <User className="w-4 h-4 mr-2" />
                  My Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={signOut} className="text-destructive cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>);

}
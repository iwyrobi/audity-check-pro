import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { User, Bell, Shield, Palette, Building, CreditCard, Sun, Moon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { DepartmentManagement } from "@/components/settings/DepartmentManagement";
import { UserManagement } from "@/components/settings/UserManagement";
import { CompanySettings } from "@/components/settings/CompanySettings";
import { SubscriptionInfo } from "@/components/settings/SubscriptionInfo";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const settingsSections = [
  {
    id: "profile",
    title: "Profile Settings",
    description: "Manage your personal information",
    icon: User,
    action: "navigate" as const,
    target: "/profile?tab=profile",
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "Configure alert preferences",
    icon: Bell,
    action: "navigate" as const,
    target: "/profile?tab=notifications",
  },
  {
    id: "security",
    title: "Security",
    description: "Password and authentication",
    icon: Shield,
    action: "navigate" as const,
    target: "/profile?tab=security",
  },
  {
    id: "appearance",
    title: "Appearance",
    description: "Theme and display settings",
    icon: Palette,
    action: "inline" as const,
    target: "",
  },
];

function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return document.documentElement.classList.contains("dark");
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  // Init from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      setIsDark(true);
    } else if (saved === "light") {
      setIsDark(false);
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setIsDark(true);
    }
  }, []);

  return [isDark, setIsDark] as const;
}

export default function Settings() {
  const { isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isDark, setIsDark] = useDarkMode();

  const handleCardClick = (section: typeof settingsSections[number]) => {
    if (section.action === "navigate") {
      navigate(section.target);
    }
    // "inline" action cards don't navigate — they have inline controls
  };

  return (
    <AppLayout title="Settings">
      <div className="max-w-4xl space-y-6">
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="mb-6 w-full overflow-x-auto flex justify-start">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="subscription">Subscription</TabsTrigger>
            {isSuperAdmin && <TabsTrigger value="company">Company</TabsTrigger>}
            {isSuperAdmin && <TabsTrigger value="users">Users & Roles</TabsTrigger>}
            {isSuperAdmin && <TabsTrigger value="departments">Departments</TabsTrigger>}
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            {/* Settings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {settingsSections.map((section, index) => (
                <div
                  key={section.id}
                  className={`action-card animate-slide-up transition-colors ${
                    section.action === "navigate" ? "cursor-pointer hover:border-primary/30" : ""
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => handleCardClick(section)}
                  role={section.action === "navigate" ? "button" : undefined}
                  tabIndex={section.action === "navigate" ? 0 : undefined}
                  onKeyDown={(e) => e.key === "Enter" && handleCardClick(section)}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <section.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{section.title}</h3>
                      <p className="text-sm text-muted-foreground">{section.description}</p>

                      {/* Inline dark mode toggle for Appearance card */}
                      {section.id === "appearance" && (
                        <div className="mt-3 flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-2">
                            {isDark ? (
                              <Moon className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <Sun className="w-4 h-4 text-muted-foreground" />
                            )}
                            <span className="text-sm font-medium">Dark Mode</span>
                          </div>
                          <Switch
                            checked={isDark}
                            onCheckedChange={setIsDark}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Settings */}
            <div className="stat-card">
              <h2 className="text-lg font-semibold mb-4">Quick Settings</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive email alerts for new work orders</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Push Notifications</p>
                    <p className="text-sm text-muted-foreground">Get instant notifications on mobile</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Auto-save Inspections</p>
                    <p className="text-sm text-muted-foreground">Automatically save progress every minute</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Offline Mode</p>
                    <p className="text-sm text-muted-foreground">Enable offline inspection capabilities</p>
                  </div>
                  <Switch />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="subscription">
            <SubscriptionInfo />
          </TabsContent>

          {isSuperAdmin && (
            <TabsContent value="company">
              <div className="stat-card">
                <CompanySettings />
              </div>
            </TabsContent>
          )}

          {isSuperAdmin && (
            <TabsContent value="users">
              <div className="stat-card">
                <UserManagement />
              </div>
            </TabsContent>
          )}

          {isSuperAdmin && (
            <TabsContent value="departments">
              <div className="stat-card">
                <DepartmentManagement />
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AppLayout>
  );
}

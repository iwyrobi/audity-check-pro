import { AppLayout } from "@/components/layout/AppLayout";
import { User, Bell, Shield, Database, Palette, Globe, Building2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { DepartmentManagement } from "@/components/settings/DepartmentManagement";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const settingsSections = [
  {
    id: "profile",
    title: "Profile Settings",
    description: "Manage your personal information",
    icon: User,
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "Configure alert preferences",
    icon: Bell,
  },
  {
    id: "security",
    title: "Security",
    description: "Password and authentication",
    icon: Shield,
  },
  {
    id: "data",
    title: "Data Management",
    description: "Export and backup options",
    icon: Database,
  },
  {
    id: "appearance",
    title: "Appearance",
    description: "Theme and display settings",
    icon: Palette,
  },
  {
    id: "language",
    title: "Language & Region",
    description: "Localization preferences",
    icon: Globe,
  },
];

export default function Settings() {
  const { isAdmin } = useAuth();

  return (
    <AppLayout title="Settings">
      <div className="max-w-4xl space-y-6">
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="general">General</TabsTrigger>
            {isAdmin && <TabsTrigger value="departments">Departments</TabsTrigger>}
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            {/* Settings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {settingsSections.map((section, index) => (
                <div
                  key={section.id}
                  className="action-card animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <section.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{section.title}</h3>
                      <p className="text-sm text-muted-foreground">{section.description}</p>
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

          {isAdmin && (
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

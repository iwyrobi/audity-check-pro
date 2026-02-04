import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Building, Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CompanySettingsData {
  id: string;
  name: string;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
}

export function CompanySettings() {
  const { isSuperAdmin } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<CompanySettingsData>({
    id: "",
    name: "",
    logo_url: null,
    address: null,
    phone: null,
    email: null,
    website: null,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("company_settings")
        .select("*")
        .limit(1)
        .single();

      if (error) throw error;
      
      if (data) {
        setFormData({
          id: data.id,
          name: data.name,
          logo_url: data.logo_url,
          address: data.address,
          phone: data.phone,
          email: data.email,
          website: data.website,
        });
      }
    } catch (error: any) {
      console.error("Error fetching company settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({ title: "Company name is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("company_settings")
        .update({
          name: formData.name.trim(),
          logo_url: formData.logo_url?.trim() || null,
          address: formData.address?.trim() || null,
          phone: formData.phone?.trim() || null,
          email: formData.email?.trim() || null,
          website: formData.website?.trim() || null,
        })
        .eq("id", formData.id);

      if (error) throw error;
      toast({ title: "Company settings saved" });
    } catch (error: any) {
      console.error("Error saving company settings:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Only super administrators can manage company settings.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Company Information</h3>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Company Name *</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Enter company name"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Logo URL</label>
            <Input
              value={formData.logo_url || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, logo_url: e.target.value }))}
              placeholder="https://example.com/logo.png"
            />
            <p className="text-xs text-muted-foreground mt-1">
              URL to your company logo image
            </p>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Website</label>
            <Input
              value={formData.website || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, website: e.target.value }))}
              placeholder="https://www.example.com"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Email</label>
            <Input
              type="email"
              value={formData.email || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="contact@example.com"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Phone</label>
            <Input
              value={formData.phone || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="+1 (555) 123-4567"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Address</label>
            <Textarea
              value={formData.address || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
              placeholder="123 Main Street, City, State, ZIP"
              rows={3}
            />
          </div>
        </div>
      </div>

      {formData.logo_url && (
        <div className="border border-border rounded-lg p-4">
          <p className="text-sm font-medium mb-2">Logo Preview</p>
          <img
            src={formData.logo_url}
            alt="Company Logo"
            className="max-h-20 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      )}
    </div>
  );
}

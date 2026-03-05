import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SubscriptionInfo {
  plan_name: string;
  tier: "starter" | "professional" | "enterprise";
  max_users: number;
  max_departments: number | null;
  storage_limit_bytes: number;
  storage_used_bytes: number;
  can_upload_videos: boolean;
  can_use_work_orders: boolean;
  can_use_analytics: boolean;
  can_use_advanced_permissions: boolean;
  stripe_subscription_status: string | null;
  subscription_expires_at: string | null;
}

export function useSubscription() {
  const { profile } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    if (!profile?.organization_id) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .rpc("get_org_subscription", { _org_id: profile.organization_id });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setSubscription(data[0] as SubscriptionInfo);
      }
    } catch (error) {
      console.error("Error fetching subscription:", error);
    } finally {
      setLoading(false);
    }
  }, [profile?.organization_id]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Check if a specific feature is available
  const hasFeature = (feature: "work_orders" | "analytics" | "videos" | "advanced_permissions"): boolean => {
    if (!subscription) return false;
    
    switch (feature) {
      case "work_orders":
        return subscription.can_use_work_orders;
      case "analytics":
        return subscription.can_use_analytics;
      case "videos":
        return subscription.can_upload_videos;
      case "advanced_permissions":
        return subscription.can_use_advanced_permissions;
      default:
        return false;
    }
  };

  // Check if can add more users
  const canAddUser = async (): Promise<boolean> => {
    if (!profile?.organization_id) return false;
    
    try {
      const { data, error } = await supabase
        .rpc("can_org_add_user", { _org_id: profile.organization_id });
      
      if (error) throw error;
      return data ?? false;
    } catch (error) {
      console.error("Error checking user limit:", error);
      return false;
    }
  };

  // Check if can add more departments
  const canAddDepartment = async (): Promise<boolean> => {
    if (!profile?.organization_id) return false;
    
    try {
      const { data, error } = await supabase
        .rpc("can_org_add_department", { _org_id: profile.organization_id });
      
      if (error) throw error;
      return data ?? false;
    } catch (error) {
      console.error("Error checking department limit:", error);
      return false;
    }
  };

  // Check if can upload a file of given size
  const canUpload = async (fileSizeBytes: number): Promise<boolean> => {
    if (!profile?.organization_id) return false;
    
    try {
      const { data, error } = await supabase
        .rpc("can_org_upload", { 
          _org_id: profile.organization_id,
          _file_size_bytes: fileSizeBytes 
        });
      
      if (error) throw error;
      return data ?? false;
    } catch (error) {
      console.error("Error checking upload limit:", error);
      return false;
    }
  };

  // Get storage usage percentage
  const storageUsagePercent = (): number => {
    if (!subscription || subscription.storage_limit_bytes === 0) return 0;
    return Math.round((subscription.storage_used_bytes / subscription.storage_limit_bytes) * 100);
  };

  // Format bytes to human readable
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return {
    subscription,
    loading,
    hasFeature,
    canAddUser,
    canAddDepartment,
    canUpload,
    storageUsagePercent,
    formatBytes,
    refetch: fetchSubscription,
  };
}

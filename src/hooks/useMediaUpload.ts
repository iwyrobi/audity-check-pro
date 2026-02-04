import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";

interface UploadedMedia {
  id: string;
  file_path: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  url: string;
}

export function useMediaUpload() {
  const [uploading, setUploading] = useState(false);
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { canUpload, hasFeature, formatBytes, subscription } = useSubscription();

  // Helper function to get signed URL for private bucket
  const getSignedUrl = async (filePath: string): Promise<string> => {
    const { data, error } = await supabase.storage
      .from("uploads")
      .createSignedUrl(filePath, 3600); // 1 hour expiry
    
    if (error || !data?.signedUrl) {
      console.error("Error creating signed URL:", error);
      return "";
    }
    
    return data.signedUrl;
  };

  const uploadFile = async (
    file: File,
    associatedType: "inspection" | "work_order" | "inspection_answer" | "work_order_comment",
    associatedId: string
  ): Promise<UploadedMedia | null> => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to upload files.",
        variant: "destructive",
      });
      return null;
    }

    // Check if video upload is allowed
    const isVideo = file.type.startsWith("video/");
    if (isVideo && !hasFeature("videos")) {
      toast({
        title: "Video upload not available",
        description: "Your current plan doesn't include video uploads. Please upgrade to Professional or Enterprise.",
        variant: "destructive",
      });
      return null;
    }

    // Check storage quota
    const canUploadFile = await canUpload(file.size);
    if (!canUploadFile) {
      const remaining = subscription 
        ? subscription.storage_limit_bytes - subscription.storage_used_bytes
        : 0;
      toast({
        title: "Storage limit exceeded",
        description: `This file (${formatBytes(file.size)}) exceeds your remaining storage (${formatBytes(Math.max(0, remaining))}). Please upgrade your plan or delete some files.`,
        variant: "destructive",
      });
      return null;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${associatedType}/${associatedId}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("uploads")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get signed URL for private bucket
      const signedUrl = await getSignedUrl(fileName);

      // Save media record
      const { data: mediaData, error: mediaError } = await supabase
        .from("media")
        .insert({
          file_path: fileName,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          associated_type: associatedType,
          associated_id: associatedId,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (mediaError) throw mediaError;

      // Update organization storage usage
      if (profile?.organization_id) {
        await supabase.rpc("update_org_storage", {
          _org_id: profile.organization_id,
          _bytes_delta: file.size,
        });
      }

      return {
        ...mediaData,
        url: signedUrl,
      };
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload file. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const getMediaForItem = async (
    associatedType: string,
    associatedId: string
  ): Promise<UploadedMedia[]> => {
    try {
      const { data, error } = await supabase
        .from("media")
        .select("*")
        .eq("associated_type", associatedType)
        .eq("associated_id", associatedId);

      if (error) throw error;

      // Get signed URLs for all media items
      const mediaWithUrls = await Promise.all(
        (data || []).map(async (item) => {
          const signedUrl = await getSignedUrl(item.file_path);
          return {
            ...item,
            url: signedUrl,
          };
        })
      );

      return mediaWithUrls;
    } catch (error) {
      console.error("Error fetching media:", error);
      return [];
    }
  };

  const deleteMedia = async (mediaId: string, filePath: string): Promise<boolean> => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("uploads")
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete record
      const { error: dbError } = await supabase
        .from("media")
        .delete()
        .eq("id", mediaId);

      if (dbError) throw dbError;

      return true;
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete file.",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    uploading,
    uploadFile,
    getMediaForItem,
    deleteMedia,
    getSignedUrl,
  };
}

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

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
  const { user } = useAuth();
  const { toast } = useToast();

  const uploadFile = async (
    file: File,
    associatedType: "inspection" | "work_order" | "inspection_answer",
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

    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${associatedType}/${associatedId}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("uploads")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("uploads")
        .getPublicUrl(fileName);

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

      return {
        ...mediaData,
        url: urlData.publicUrl,
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

      return (data || []).map((item) => ({
        ...item,
        url: supabase.storage.from("uploads").getPublicUrl(item.file_path).data.publicUrl,
      }));
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
  };
}

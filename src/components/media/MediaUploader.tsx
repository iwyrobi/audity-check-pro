import { useState, useRef, useEffect } from "react";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { Button } from "@/components/ui/button";
import { Camera, Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadedMedia {
  id: string;
  file_path: string;
  file_name: string;
  file_type: string | null;
  url: string;
}

interface MediaUploaderProps {
  associatedType: "inspection" | "work_order" | "inspection_answer" | "work_order_comment";
  associatedId: string;
  existingMedia?: UploadedMedia[];
  onUpload?: (media: UploadedMedia) => void;
  onDelete?: (mediaId: string) => void;
  compact?: boolean;
  maxFiles?: number;
}

export function MediaUploader({
  associatedType,
  associatedId,
  existingMedia = [],
  onUpload,
  onDelete,
  compact = false,
  maxFiles = 5,
}: MediaUploaderProps) {
  const { uploading, uploadFile, deleteMedia, getMediaForItem } = useMediaUpload();
  const [media, setMedia] = useState<UploadedMedia[]>(existingMedia);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Fetch existing media when component mounts or associatedId changes
  useEffect(() => {
    const fetchExistingMedia = async () => {
      if (!associatedId) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const existingFiles = await getMediaForItem(associatedType, associatedId);
        setMedia(existingFiles);
      } catch (error) {
        console.error("Error fetching existing media:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchExistingMedia();
  }, [associatedId, associatedType]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      if (media.length >= maxFiles) {
        break;
      }

      const uploaded = await uploadFile(file, associatedType, associatedId);
      if (uploaded) {
        setMedia((prev) => [...prev, uploaded]);
        onUpload?.(uploaded);
      }
    }

    // Reset input
    if (e.target) e.target.value = "";
  };

  const handleDelete = async (item: UploadedMedia) => {
    const success = await deleteMedia(item.id, item.file_path);
    if (success) {
      setMedia((prev) => prev.filter((m) => m.id !== item.id));
      onDelete?.(item.id);
    }
  };

  const canAddMore = media.length < maxFiles;

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {loading ? (
          <div className="w-16 h-16 rounded-lg border border-border flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {media.map((item) => (
          <div
            key={item.id}
            className="relative w-16 h-16 rounded-lg overflow-hidden border border-border group"
          >
            {item.file_type?.startsWith("image/") ? (
              <img
                src={item.url}
                alt={item.file_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <ImageIcon className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleDelete(item);
              }}
              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        ))}
        {canAddMore && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                fileInputRef.current?.click();
              }}
              disabled={uploading}
              className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center hover:border-primary transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              ) : (
                <Camera className="w-5 h-5 text-muted-foreground" />
              )}
            </button>
          </>
        )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading attachments...</span>
        </div>
      )}

      {/* Media Grid */}
      {!loading && media.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {media.map((item) => (
            <div
              key={item.id}
              className="relative aspect-video rounded-lg overflow-hidden border border-border group"
            >
              {item.file_type?.startsWith("image/") ? (
                <img
                  src={item.url}
                  alt={item.file_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-muted p-2">
                  <ImageIcon className="w-8 h-8 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground truncate max-w-full">
                    {item.file_name}
                  </span>
                </div>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleDelete(item);
                }}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Buttons */}
      {canAddMore && (
        <div className="flex gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,.pdf"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              cameraInputRef.current?.click();
            }}
            disabled={uploading}
            className="flex-1"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Camera className="w-4 h-4 mr-2" />
            )}
            Take Photo
          </Button>
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              fileInputRef.current?.click();
            }}
            disabled={uploading}
            className="flex-1"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            Upload File
          </Button>
        </div>
      )}

      {!canAddMore && (
        <p className="text-sm text-muted-foreground text-center">
          Maximum {maxFiles} files allowed
        </p>
      )}
    </div>
  );
}

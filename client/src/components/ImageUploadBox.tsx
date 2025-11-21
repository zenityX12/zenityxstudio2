import { useState, useRef, DragEvent, ChangeEvent, useEffect } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ImageUploadBoxProps {
  maxImages?: number;
  maxSizeMB?: number;
  uploadedFiles: File[];
  onFilesChange: (files: File[]) => void;
  onUpload: (files: File[]) => Promise<string[]>;
  isUploading: boolean;
  label?: string;
  description?: string;
  required?: boolean;
  initialUrls?: string[]; // URLs to display as initial preview (for Reuse feature)
  onUrlsRemove?: (urls: string[]) => void; // Callback when URL preview is removed
}

export function ImageUploadBox({
  maxImages = 10,
  maxSizeMB = 10,
  uploadedFiles,
  onFilesChange,
  onUpload,
  isUploading,
  label = "Upload Images",
  description,
  required = false,
  initialUrls = [],
  onUrlsRemove,
}: ImageUploadBoxProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>(initialUrls);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialUrlsStringRef = useRef<string>(JSON.stringify(initialUrls));

  // Sync previewUrls with initialUrls when it changes
  // But don't sync if user has uploaded new files
  useEffect(() => {
    const currentUrlsString = JSON.stringify(initialUrls);
    if (uploadedFiles.length === 0 && currentUrlsString !== initialUrlsStringRef.current) {
      initialUrlsStringRef.current = currentUrlsString;
      setPreviewUrls(initialUrls);
    }
  }, [initialUrls, uploadedFiles.length]);

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    await processFiles(files);
  };

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    await processFiles(Array.from(files));
    
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const processFiles = async (files: File[]) => {
    // Filter only image files
    const imageFiles = files.filter((file) =>
      file.type.startsWith("image/")
    );

    if (imageFiles.length === 0) {
      toast.error("Please select valid image files");
      return;
    }

    // Check if adding these files would exceed the limit
    const remainingSlots = maxImages - uploadedFiles.length;
    if (remainingSlots <= 0) {
      toast.error(`Maximum ${maxImages} image${maxImages > 1 ? "s" : ""} allowed`);
      return;
    }

    // Take only the files that fit
    const filesToAdd = imageFiles.slice(0, remainingSlots);

    // Check file sizes
    const oversizedFiles = filesToAdd.filter(
      (file) => file.size > maxSizeMB * 1024 * 1024
    );
    if (oversizedFiles.length > 0) {
      toast.error(`Some files exceed ${maxSizeMB}MB limit`);
      return;
    }

    try {
      // Clear preview URLs when uploading new files
      if (previewUrls.length > 0) {
        setPreviewUrls([]);
        if (onUrlsRemove) {
          onUrlsRemove([]);
        }
      }
      
      // Upload files
      await onUpload(filesToAdd);
      
      // Update state
      onFilesChange([...uploadedFiles, ...filesToAdd]);
      
      if (filesToAdd.length < imageFiles.length) {
        toast.warning(`Only ${filesToAdd.length} file(s) added (limit: ${maxImages})`);
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload images");
    }
  };

  const removeImage = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    onFilesChange(newFiles);
  };

  const removePreviewUrl = (index: number) => {
    const newUrls = previewUrls.filter((_, i) => i !== index);
    setPreviewUrls(newUrls);
    if (onUrlsRemove) {
      onUrlsRemove(newUrls);
    }
  };

  const handleBoxClick = () => {
    if (!isUploading && uploadedFiles.length < maxImages) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="space-y-2">
      {/* Label */}
      {label && (
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label} {required && <span className="text-red-500">*</span>}
          {description && (
            <span className="text-xs text-gray-500 ml-2 font-normal">
              {description}
            </span>
          )}
        </label>
      )}

      {/* Upload Box */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center
          transition-all duration-200 ease-in-out
          ${isDragging
            ? "border-purple-500 bg-purple-50"
            : "border-gray-300 hover:border-purple-400 hover:bg-gray-50"
          }
          ${isUploading || uploadedFiles.length >= maxImages
            ? "cursor-not-allowed opacity-60"
            : "cursor-pointer"
          }
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleBoxClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          multiple={maxImages > 1}
          className="hidden"
          disabled={isUploading || uploadedFiles.length >= maxImages}
        />

        <div className="flex flex-col items-center space-y-3">
          {isUploading ? (
            <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
          ) : (
            <Upload className={`w-12 h-12 ${isDragging ? "text-purple-500" : "text-gray-400"}`} />
          )}

          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-700">
              {isUploading
                ? "Uploading..."
                : isDragging
                ? "Drop images here"
                : uploadedFiles.length >= maxImages
                ? `Maximum ${maxImages} image${maxImages > 1 ? "s" : ""} reached`
                : "Click to upload or drag and drop"}
            </p>
            <p className="text-xs text-gray-500">
              {maxImages > 1
                ? `PNG, JPG, WebP (Max ${maxSizeMB}MB each, up to ${maxImages} images)`
                : `PNG, JPG, WebP (Max ${maxSizeMB}MB)`}
            </p>
          </div>
        </div>
      </div>

      {/* Preview Grid */}
      {(uploadedFiles.length > 0 || previewUrls.length > 0) && (
        <div className={`grid gap-3 mt-4 ${maxImages > 1 ? "grid-cols-3" : "grid-cols-1"}`}>
          {/* Preview from URLs (Reuse feature) */}
          {previewUrls.map((url, index) => (
            <div key={`url-${index}`} className="relative group">
              <img
                src={url}
                alt={`Preview ${index + 1}`}
                className={`w-full object-contain rounded-lg border border-gray-200 bg-gray-50 ${
                  maxImages > 1 ? "h-32" : "h-48"
                }`}
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removePreviewUrl(index);
                }}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 
                         opacity-0 group-hover:opacity-100 transition-opacity
                         hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                aria-label="Remove image"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                From URL
              </div>
            </div>
          ))}
          
          {/* Preview from uploaded files */}
          {uploadedFiles.map((file, index) => (
            <div key={`file-${index}`} className="relative group">
              <img
                src={URL.createObjectURL(file)}
                alt={`Upload ${index + 1}`}
                className={`w-full object-contain rounded-lg border border-gray-200 bg-gray-50 ${
                  maxImages > 1 ? "h-32" : "h-48"
                }`}
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(index);
                }}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 
                         opacity-0 group-hover:opacity-100 transition-opacity
                         hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                aria-label="Remove image"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


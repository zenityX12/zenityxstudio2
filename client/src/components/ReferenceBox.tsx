import { X, Upload } from "lucide-react";
import { useRef } from "react";

interface ReferenceBoxProps {
  type: "style" | "character" | "upload";
  label: string;
  imageUrl?: string;
  onImageSelect: (file: File) => void;
  onImageRemove: () => void;
  accept?: string;
  maxSizeMB?: number;
}

export function ReferenceBox({
  type,
  label,
  imageUrl,
  onImageSelect,
  onImageRemove,
  accept = "image/*",
  maxSizeMB = 10,
}: ReferenceBoxProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (!imageUrl) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size
      if (file.size > maxSizeMB * 1024 * 1024) {
        alert(`File size must be less than ${maxSizeMB}MB`);
        e.target.value = ''; // Reset input
        return;
      }
      onImageSelect(file);
      e.target.value = ''; // Reset input to allow re-uploading same file
    }
  };

  const getIcon = () => {
    switch (type) {
      case "style":
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
        );
      case "character":
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case "upload":
        return <Upload className="w-6 h-6" />;
    }
  };

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />
      
      {imageUrl ? (
        // Show uploaded image
        <div className="relative group">
          <div className="aspect-square rounded-lg overflow-hidden border-2 border-border">
            <img
              src={imageUrl}
              alt={label}
              className="w-full h-full object-cover"
            />
          </div>
          <button
            onClick={onImageRemove}
            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
          <span className="text-xs text-center block mt-1 truncate">{label}</span>
        </div>
      ) : (
        // Show upload box
        <button
          onClick={handleClick}
          type="button"
          className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 p-4 hover:border-muted-foreground/50 transition-colors aspect-square w-full"
        >
          {getIcon()}
          <span className="text-xs text-muted-foreground">{label}</span>
        </button>
      )}
    </div>
  );
}


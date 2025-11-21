import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { X, ZoomIn, ZoomOut, Download, Share2, Maximize2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ImageViewerProps {
  src: string;
  alt: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImageViewer({ src, alt, open, onOpenChange }: ImageViewerProps) {
  const [zoom, setZoom] = useState(100);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 50));
  const handleReset = () => setZoom(100);

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: alt,
          url: src,
        });
      } else {
        await navigator.clipboard.writeText(src);
        toast.success("Link copied to clipboard");
      }
    } catch (error) {
      console.error("Share failed:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh] p-0">
        <VisuallyHidden>
          <DialogTitle>{alt}</DialogTitle>
        </VisuallyHidden>
        <div className="relative w-full h-full flex flex-col bg-black/95">
          {/* Toolbar */}
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomOut}
                disabled={zoom <= 50}
                className="text-white hover:bg-white/20"
              >
                <ZoomOut className="h-5 w-5" />
              </Button>
              <span className="text-white font-medium min-w-[60px] text-center">
                {zoom}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomIn}
                disabled={zoom >= 200}
                className="text-white hover:bg-white/20"
              >
                <ZoomIn className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleReset}
                className="text-white hover:bg-white/20"
              >
                <Maximize2 className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleShare}
                className="text-white hover:bg-white/20"
              >
                <Share2 className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                asChild
                className="text-white hover:bg-white/20"
              >
                <a href={src} download target="_blank" rel="noopener noreferrer">
                  <Download className="h-5 w-5" />
                </a>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="text-white hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Image Container */}
          <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
            <img
              src={src}
              alt={alt}
              style={{ transform: `scale(${zoom / 100})` }}
              className="max-w-full max-h-full object-contain transition-transform duration-200"
            />
          </div>

          {/* Caption */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <p className="text-white text-sm text-center line-clamp-2">{alt}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


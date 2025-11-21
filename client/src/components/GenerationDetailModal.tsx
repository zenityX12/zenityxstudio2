import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Download, 
  Copy, 
  RefreshCw, 
  Share2, 
  Trash2, 
  X,
  Calendar,
  Sparkles,
  Image as ImageIcon,
  Video as VideoIcon
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Generation {
  id: string;
  userId: string;
  modelId: string;
  type: "image" | "video";
  prompt: string;
  status: "pending" | "processing" | "completed" | "failed";
  taskId: string | null;
  resultUrl: string | null;
  resultUrls: string | null;
  thumbnailUrl: string | null;
  parameters: string | null;
  errorMessage: string | null;
  creditsUsed: string;
  kieCreditsUsed: string;
  refunded: number;
  isHidden: number;
  createdAt: Date | null;
  completedAt: Date | null;
}

interface Model {
  id: string;
  modelId: string;
  name: string;
  type: "image" | "video";
}

interface GenerationDetailModalProps {
  generation: Generation | null;
  model: Model | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegenerate?: () => void;
  onDelete?: () => void;
}

export function GenerationDetailModal({
  generation,
  model,
  open,
  onOpenChange,
  onRegenerate,
  onDelete,
}: GenerationDetailModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  if (!generation || !model) return null;

  const isImage = model.type === "image";
  let urls: string[] = [];

  if (generation.status === "completed" && (generation.resultUrl || generation.resultUrls)) {
    if (generation.resultUrls) {
      try {
        urls = JSON.parse(generation.resultUrls);
      } catch (e) {
        urls = generation.resultUrl ? [generation.resultUrl] : [];
      }
    } else if (generation.resultUrl) {
      urls = [generation.resultUrl];
    }
  }

  const currentUrl = urls[currentImageIndex] || generation.thumbnailUrl || "";

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(generation.prompt);
    toast.success("Prompt copied to clipboard");
  };

  const handleDownload = (url: string, index?: number) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = `generation-${generation.id}${index !== undefined ? `-${index + 1}` : ""}.${isImage ? "png" : "mp4"}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Download started");
  };

  const handleDownloadAll = () => {
    urls.forEach((url, index) => {
      setTimeout(() => handleDownload(url, index), index * 500);
    });
  };

  const handleShare = () => {
    if (navigator.share && currentUrl) {
      navigator.share({
        title: "Generated Content",
        text: generation.prompt,
        url: currentUrl,
      }).catch(() => {
        navigator.clipboard.writeText(currentUrl);
        toast.success("URL copied to clipboard");
      });
    } else {
      navigator.clipboard.writeText(currentUrl);
      toast.success("URL copied to clipboard");
    }
  };

  let settings: Record<string, any> = {};
  let negativePrompt: string | null = null;
  if (generation.parameters) {
    try {
      const params = JSON.parse(generation.parameters);
      settings = params;
      negativePrompt = params.negativePrompt || null;
    } catch (e) {
      // Ignore
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="!max-w-[95vw] !w-[95vw] !h-[95vh] p-0 gap-0 overflow-hidden rounded-2xl"
        showCloseButton={false}
      >
        <VisuallyHidden>
          <DialogTitle>Generation Details</DialogTitle>
        </VisuallyHidden>
        <div className="flex h-full">
          {/* Left - Media */}
          <div className="flex-1 bg-black relative">
            {generation.status === "completed" && currentUrl ? (
              <>
                {isImage ? (
                  <img
                    src={currentUrl}
                    alt={generation.prompt}
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                ) : (
                  <video
                    src={currentUrl}
                    controls
                    className="absolute inset-0 w-full h-full object-contain"
                    autoPlay
                    loop
                  />
                )}

                {isImage && urls.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/80 px-4 py-2 rounded-full">
                    {urls.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`w-2 h-2 rounded-full transition-all ${
                          index === currentImageIndex
                            ? "bg-white w-6"
                            : "bg-white/50 hover:bg-white/75"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-white text-center">
                <p className="text-lg">
                  {generation.status === "processing" || generation.status === "pending"
                    ? "Processing..."
                    : "Failed to load"}
                </p>
              </div>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-white hover:bg-white/20"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Right - Details */}
          <div className="w-[420px] bg-background/95 backdrop-blur-xl flex flex-col overflow-hidden border-l border-border/50">
            <div className="p-6 border-b">
              <div className="flex items-center gap-2 mb-2">
                {isImage ? (
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <VideoIcon className="h-5 w-5 text-muted-foreground" />
                )}
                <h2 className="text-lg font-semibold">{model.name}</h2>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {generation.createdAt ? formatDistanceToNow(new Date(generation.createdAt), { addSuffix: true }) : 'Unknown'}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Prompt
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyPrompt}
                    className="h-7 px-2"
                  >
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    Copy
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {generation.prompt}
                </p>
              </div>

              {negativePrompt && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Negative Prompt</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {negativePrompt}
                  </p>
                </div>
              )}

              <Separator />

              {Object.keys(settings).length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-3">Settings</h3>
                  <div className="space-y-2">
                    {Object.entries(settings).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-muted-foreground capitalize">
                          {key.replace(/([A-Z])/g, " $1").trim()}
                        </span>
                        <span className="font-medium">
                          {typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {urls.length > 1 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Batch</h3>
                  <Badge variant="secondary">{urls.length} {isImage ? "images" : "videos"}</Badge>
                </div>
              )}
            </div>

            <div className="p-6 border-t space-y-2">
              {urls.length > 0 && (
                <>
                  {urls.length === 1 ? (
                    <Button
                      className="w-full"
                      onClick={() => handleDownload(currentUrl)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleDownload(currentUrl, currentImageIndex)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Current
                      </Button>
                      <Button onClick={handleDownloadAll}>
                        <Download className="h-4 w-4 mr-2" />
                        All ({urls.length})
                      </Button>
                    </div>
                  )}
                </>
              )}

              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" size="sm" onClick={handleShare}>
                  <Share2 className="h-4 w-4" />
                </Button>
                {onRegenerate && (
                  <Button variant="outline" size="sm" onClick={onRegenerate}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onDelete}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


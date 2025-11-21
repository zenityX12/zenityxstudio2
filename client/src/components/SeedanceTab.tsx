import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Upload, X, Film, Clock, Maximize2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";

// Helper function to format credits (remove .0 if whole number)
const formatCredits = (value: number | string): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  return num % 1 === 0 ? num.toString() : num.toFixed(1);
};

interface AIModel {
  id: string;
  name: string;
  modelId: string;
  costPerGeneration: number;
  pricingOptions?: string | null;
}

interface SeedanceTabProps {
  selectedModel: AIModel | undefined;
  models: AIModel[];
  onModelChange: (modelId: string) => void;
  onGenerate: (params: {
    modelId: string;
    prompt: string;
    aspectRatio?: string;
    imageUrl?: string;
    resolution?: "480p" | "720p" | "1080p";
    duration?: "5" | "10";
    cameraFixed?: boolean;
    seed?: number;
    enableSafetyChecker?: boolean;
  }) => void;
  isGenerating: boolean;
}

export function SeedanceTab({
  selectedModel,
  models,
  onModelChange,
  onGenerate,
  isGenerating,
}: SeedanceTabProps) {
  // Load settings from localStorage
  const [modelTier, setModelTier] = useState<"lite" | "pro">(() => {
    const saved = localStorage.getItem("seedance_modelTier");
    return (saved as "lite" | "pro") || "lite";
  });
  
  const [duration, setDuration] = useState<"5" | "10">(() => {
    const saved = localStorage.getItem("seedance_duration");
    return (saved as "5" | "10") || "5";
  });
  
  const [aspectRatio, setAspectRatio] = useState(() => {
    return localStorage.getItem("seedance_aspectRatio") || "16:9";
  });
  
  const [resolution, setResolution] = useState<"480p" | "720p" | "1080p">(() => {
    const saved = localStorage.getItem("seedance_resolution");
    return (saved as "480p" | "720p" | "1080p") || "720p";
  });

  const [prompt, setPrompt] = useState("");
  const [cameraFixed, setCameraFixed] = useState(false);
  const [seed, setSeed] = useState(-1);
  const [enableSafetyChecker, setEnableSafetyChecker] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // First Frame upload states
  const [firstFrameFile, setFirstFrameFile] = useState<File | null>(null);
  const [firstFrameUrl, setFirstFrameUrl] = useState<string>("");
  const [isUploadingFirstFrame, setIsUploadingFirstFrame] = useState(false);
  
  const uploadMutation = trpc.upload.useMutation();

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem("seedance_modelTier", modelTier);
  }, [modelTier]);

  useEffect(() => {
    localStorage.setItem("seedance_duration", duration);
  }, [duration]);

  useEffect(() => {
    localStorage.setItem("seedance_aspectRatio", aspectRatio);
  }, [aspectRatio]);

  useEffect(() => {
    localStorage.setItem("seedance_resolution", resolution);
  }, [resolution]);

  // Get all Seedance models
  const seedanceModels = models.filter((m) => m.modelId?.startsWith("bytedance/v1"));
  
  // Auto-detect mode based on image upload
  const hasImage = firstFrameFile !== null;
  
  // Get the actual model based on tier and mode (text-to-video or image-to-video)
  const getActualModel = (): AIModel | undefined => {
    const mode = hasImage ? "image-to-video" : "text-to-video";
    const modelId = `bytedance/v1-${modelTier}-${mode}`;
    return models.find((m) => m.modelId === modelId);
  };
  
  const actualModel = getActualModel();
  
  // Calculate current cost based on resolution and duration
  const getCurrentCost = (): number => {
    if (!actualModel) return 0;
    
    if (actualModel.pricingOptions) {
      try {
        const pricing = JSON.parse(actualModel.pricingOptions);
        const key = `${resolution}-${duration}s`;
        return pricing[key] || actualModel.costPerGeneration;
      } catch {
        return actualModel.costPerGeneration;
      }
    }
    
    return actualModel.costPerGeneration;
  };

  // Handle First Frame file selection
  const handleFirstFrameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    setFirstFrameFile(file);
    
    // Upload immediately
    setIsUploadingFirstFrame(true);
    try {
      const buffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );

      const result = await uploadMutation.mutateAsync({
        filename: file.name,
        contentType: file.type,
        file: base64,
      });

      setFirstFrameUrl(result.url);
      toast.success("First Frame uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload First Frame");
      setFirstFrameFile(null);
    } finally {
      setIsUploadingFirstFrame(false);
    }
  };

  // Remove First Frame
  const removeFirstFrame = () => {
    setFirstFrameFile(null);
    setFirstFrameUrl("");
  };

  const handleGenerate = () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    if (!actualModel) {
      toast.error("Model not found");
      return;
    }

    onGenerate({
      modelId: actualModel.modelId,
      prompt: prompt.trim(),
      aspectRatio,
      imageUrl: firstFrameUrl || undefined,
      resolution,
      duration,
      cameraFixed,
      seed: seed > 0 ? seed : undefined,
      enableSafetyChecker,
    });
  };

  return (
    <div className="space-y-4">
      {/* First Frame Upload */}
      <div>
        <div className="relative">
          <input
            type="file"
            id="first-frame-upload"
            accept="image/*"
            onChange={handleFirstFrameChange}
            className="hidden"
            disabled={isUploadingFirstFrame}
          />
          <label
            htmlFor="first-frame-upload"
            className={`
              flex flex-col items-center justify-center
              w-full h-40 border-2 border-dashed rounded-lg
              cursor-pointer transition-colors
              ${firstFrameFile ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-accent"}
              ${isUploadingFirstFrame ? "opacity-50 cursor-not-allowed" : ""}
            `}
          >
            {isUploadingFirstFrame ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Uploading...</span>
              </div>
            ) : firstFrameFile ? (
              <div className="relative w-full h-full p-2">
                <img
                  src={URL.createObjectURL(firstFrameFile)}
                  alt="First Frame"
                  className="w-full h-full object-contain rounded"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-3 right-3 h-8 w-8"
                  onClick={(e) => {
                    e.preventDefault();
                    removeFirstFrame();
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm font-medium">First Frame</span>
                <span className="text-xs text-muted-foreground">Click to upload (optional)</span>
              </div>
            )}
          </label>
        </div>
      </div>

      {/* Prompt */}
      <Textarea
        placeholder="Describe your video..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="min-h-[100px] resize-none"
        disabled={isGenerating}
      />

      {/* Inline Controls */}
      <div className="flex flex-wrap gap-2">
        {/* Model Tier */}
        <Select value={modelTier} onValueChange={(v) => setModelTier(v as "lite" | "pro")} disabled={isGenerating}>
          <SelectTrigger className="w-[140px] h-10">
            <div className="flex items-center gap-2">
              <Film className="h-4 w-4" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lite">Lite</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
          </SelectContent>
        </Select>

        {/* Duration */}
        <Select value={duration} onValueChange={(v) => setDuration(v as "5" | "10")} disabled={isGenerating}>
          <SelectTrigger className="w-[120px] h-10">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5s</SelectItem>
            <SelectItem value="10">10s</SelectItem>
          </SelectContent>
        </Select>

        {/* Aspect Ratio */}
        <Select value={aspectRatio} onValueChange={setAspectRatio} disabled={isGenerating}>
          <SelectTrigger className="w-[120px] h-10">
            <div className="flex items-center gap-2">
              <Maximize2 className="h-4 w-4" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="16:9">16:9</SelectItem>
            <SelectItem value="9:16">9:16</SelectItem>
            <SelectItem value="1:1">1:1</SelectItem>
          </SelectContent>
        </Select>

        {/* Resolution */}
        <Select value={resolution} onValueChange={(v) => setResolution(v as "480p" | "720p" | "1080p")} disabled={isGenerating}>
          <SelectTrigger className="w-[120px] h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="480p">480p</SelectItem>
            <SelectItem value="720p">720p</SelectItem>
            <SelectItem value="1080p">1080p</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Advanced Settings */}
      <div className="border rounded-lg">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between p-3 hover:bg-accent transition-colors"
        >
          <span className="text-sm font-medium">Advanced Settings</span>
          {showAdvanced ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
        
        {showAdvanced && (
          <div className="p-4 space-y-4 border-t">
            {/* Camera Fixed */}
            <div className="flex items-center justify-between">
              <Label htmlFor="camera-fixed" className="text-sm">
                Camera Fixed
              </Label>
              <Switch
                id="camera-fixed"
                checked={cameraFixed}
                onCheckedChange={setCameraFixed}
                disabled={isGenerating}
              />
            </div>

            {/* Seed */}
            <div className="space-y-2">
              <Label htmlFor="seed" className="text-sm">
                Seed (-1 for random)
              </Label>
              <Input
                id="seed"
                type="number"
                value={seed}
                onChange={(e) => setSeed(parseInt(e.target.value) || -1)}
                placeholder="-1"
                disabled={isGenerating}
              />
            </div>

            {/* Safety Checker */}
            <div className="flex items-center justify-between">
              <Label htmlFor="safety-checker" className="text-sm">
                Safety Checker
              </Label>
              <Switch
                id="safety-checker"
                checked={enableSafetyChecker}
                onCheckedChange={setEnableSafetyChecker}
                disabled={isGenerating}
              />
            </div>
          </div>
        )}
      </div>

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={isGenerating || !prompt.trim()}
        className="w-full"
        size="lg"
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>Generate Video ({formatCredits(getCurrentCost())} credits)</>
        )}
      </Button>
    </div>
  );
}


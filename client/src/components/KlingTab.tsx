import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Upload, X, Film, Clock } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

// Helper function to format credits (remove .0 if whole number)
const formatCredits = (value: number | string): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  return num % 1 === 0 ? num.toString() : num.toFixed(1);
};

interface KlingTabProps {
  models: any[];
  credits: number;
  prompt: string;
  setPrompt: (prompt: string) => void;
  selectedModel: string;
  setSelectedModel: (modelId: string) => void;
  onGenerate: (params: {
    modelId: string;
    prompt: string;
    duration?: "5" | "10";
    negativePrompt?: string;
    seed?: number; // Will be used for cfg_scale
    imageUrl?: string; // First frame
    endImageUrl?: string; // End frame (Pro only)
  }) => void;
  isGenerating: boolean;
}

export function KlingTab({
  models,
  credits,
  prompt,
  setPrompt,
  selectedModel,
  setSelectedModel,
  onGenerate,
  isGenerating,
}: KlingTabProps) {
  // Load settings from localStorage
  const [duration, setDuration] = useState<"5" | "10">(() => {
    const saved = localStorage.getItem("kling_duration");
    return (saved as "5" | "10") || "5";
  });
  const [negativePrompt, setNegativePrompt] = useState("blur, distort, and low quality");
  const [cfgScale, setCfgScale] = useState<number>(() => {
    const saved = localStorage.getItem("kling_cfgScale");
    return saved ? parseFloat(saved) : 0.5;
  });
  
  // First Frame
  const [firstFramePreview, setFirstFramePreview] = useState<string | null>(null);
  const [firstFrameUrl, setFirstFrameUrl] = useState<string | null>(null);
  const [isUploadingFirst, setIsUploadingFirst] = useState(false);
  
  // End Frame (optional, Pro only)
  const [endFramePreview, setEndFramePreview] = useState<string | null>(null);
  const [endFrameUrl, setEndFrameUrl] = useState<string | null>(null);
  const [isUploadingEnd, setIsUploadingEnd] = useState(false);
  
  const uploadMutation = trpc.upload.useMutation();

  // Filter Kling models
  const klingModels = models.filter((m) => 
    m.isActive && m.modelId?.startsWith("kling/v2-1")
  );

  // Set Pro as default if no model selected (use useEffect to avoid setState in render)
  useEffect(() => {
    if (!selectedModel && klingModels.length > 0) {
      const proModel = klingModels.find(m => m.modelId === "kling/v2-1-pro");
      if (proModel) {
        setSelectedModel(proModel.id);
      }
    }
  }, [klingModels, selectedModel, setSelectedModel]);

  const selectedModelData = models.find((m) => m.id === selectedModel);
  const isProModel = selectedModelData?.modelId === "kling/v2-1-pro";
  
  // Calculate credit cost based on model and duration
  const calculateCost = () => {
    if (!selectedModelData) return 0;
    
    try {
      const pricingOptions = selectedModelData.pricingOptions 
        ? JSON.parse(selectedModelData.pricingOptions) 
        : null;
      
      if (pricingOptions) {
        const key = `${duration}s`;
        return pricingOptions[key] || selectedModelData.costPerGeneration;
      }
      
      return selectedModelData.costPerGeneration;
    } catch (e) {
      return selectedModelData.costPerGeneration;
    }
  };
  
  const creditCost = calculateCost();

  // Helper function to convert File to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result as string;
        // Remove data:image/...;base64, prefix
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // Handle First Frame upload (upload immediately)
  const handleFirstFrameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
      toast.error("กรุณาเลือกไฟล์รูปภาพ");
      return;
    }
    
    // Check file size (20MB limit for Kling)
    const maxSize = 20 * 1024 * 1024; // 20MB in bytes
    if (file.size > maxSize) {
      toast.error("ไฟล์มีขนาดใหญ่เกิน 20MB กรุณาเลือกไฟล์ที่มีขนาดเล็กกว่า");
      e.target.value = ""; // Clear input
      return;
    }
    
    // Show preview immediately
    const previewUrl = URL.createObjectURL(file);
    setFirstFramePreview(previewUrl);
    
    // Upload immediately
    setIsUploadingFirst(true);
    try {
      const base64 = await fileToBase64(file);
      const result = await uploadMutation.mutateAsync({
        file: base64,
        filename: file.name,
        contentType: file.type,
      });
      
      setFirstFrameUrl(result.url);
      toast.success("First Frame uploaded successfully");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload First Frame");
      // Clear preview on error
      URL.revokeObjectURL(previewUrl);
      setFirstFramePreview(null);
    } finally {
      setIsUploadingFirst(false);
    }
  };

  const removeFirstFrame = () => {
    if (firstFramePreview) {
      URL.revokeObjectURL(firstFramePreview);
    }
    setFirstFramePreview(null);
    setFirstFrameUrl(null);
  };

  // Handle End Frame upload (upload immediately)
  const handleEndFrameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
      toast.error("กรุณาเลือกไฟล์รูปภาพ");
      return;
    }
    
    // Check file size (20MB limit for Kling)
    const maxSize = 20 * 1024 * 1024; // 20MB in bytes
    if (file.size > maxSize) {
      toast.error("ไฟล์มีขนาดใหญ่เกิน 20MB กรุณาเลือกไฟล์ที่มีขนาดเล็กกว่า");
      e.target.value = ""; // Clear input
      return;
    }
    
    // Show preview immediately
    const previewUrl = URL.createObjectURL(file);
    setEndFramePreview(previewUrl);
    
    // Upload immediately
    setIsUploadingEnd(true);
    try {
      const base64 = await fileToBase64(file);
      const result = await uploadMutation.mutateAsync({
        file: base64,
        filename: file.name,
        contentType: file.type,
      });
      
      setEndFrameUrl(result.url);
      toast.success("End Frame uploaded successfully");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload End Frame");
      // Clear preview on error
      URL.revokeObjectURL(previewUrl);
      setEndFramePreview(null);
    } finally {
      setIsUploadingEnd(false);
    }
  };

  const removeEndFrame = () => {
    if (endFramePreview) {
      URL.revokeObjectURL(endFramePreview);
    }
    setEndFramePreview(null);
    setEndFrameUrl(null);
  };

  const handleGenerate = () => {
    if (!prompt.trim()) {
      toast.error("กรุณาใส่ Prompt");
      return;
    }

    if (!firstFrameUrl) {
      toast.error("กรุณาอัปโหลด First Frame");
      return;
    }

    if (credits < creditCost) {
      toast.error("เครดิตไม่เพียงพอ");
      return;
    }

    // Use already uploaded URLs
    onGenerate({
      modelId: selectedModel,
      prompt: prompt.trim(),
      duration,
      negativePrompt: negativePrompt.trim() || undefined,
      seed: cfgScale, // Pass cfg_scale as seed (will be mapped in backend)
      imageUrl: firstFrameUrl,
      endImageUrl: endFrameUrl || undefined,
    });
  };

  return (
    <div className="space-y-4">
      {/* Image Upload Section - Top */}
      <div className="grid grid-cols-2 gap-4">
        {/* First Frame */}
        <div>
          {!firstFramePreview ? (
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent/50 transition-colors">
              <div className="flex flex-col items-center justify-center">
                <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">First Frame</p>
              </div>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleFirstFrameChange}
                disabled={isUploadingFirst}
              />
            </label>
          ) : (
            <div className="relative h-48">
              <img
                src={firstFramePreview}
                alt="First Frame"
                className="w-full h-full object-cover rounded-lg border"
              />
              {isUploadingFirst && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                  <div className="flex flex-col items-center gap-2 text-white">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span className="text-sm">Uploading...</span>
                  </div>
                </div>
              )}
              {!isUploadingFirst && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={removeFirstFrame}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* End Frame (Pro only) */}
        {isProModel && (
          <div>
            {!endFramePreview ? (
              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent/50 transition-colors">
                <div className="flex flex-col items-center justify-center">
                  <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">End Frame (Optional)</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleEndFrameChange}
                  disabled={isUploadingEnd}
                />
              </label>
            ) : (
              <div className="relative h-48">
                <img
                  src={endFramePreview}
                  alt="End Frame"
                  className="w-full h-full object-cover rounded-lg border"
                />
                {isUploadingEnd && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                    <div className="flex flex-col items-center gap-2 text-white">
                      <Loader2 className="w-8 h-8 animate-spin" />
                      <span className="text-sm">Uploading...</span>
                    </div>
                  </div>
                )}
                {!isUploadingEnd && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={removeEndFrame}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Prompt */}
      <Textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe the motion and scene you want..."
        className="min-h-[100px] resize-none"
        maxLength={5000}
      />

      {/* Negative Prompt */}
      <Textarea
        value={negativePrompt}
        onChange={(e) => setNegativePrompt(e.target.value)}
        placeholder="What you don't want in the video..."
        className="min-h-[60px] resize-none"
        maxLength={500}
      />

      {/* Clean & Minimal Controls - Inline Dropdowns */}
      <div className="flex gap-2 flex-wrap">
        {/* CFG Scale Dropdown */}
        <Select value={cfgScale.toString()} onValueChange={(value) => {
          const newValue = parseFloat(value);
          setCfgScale(newValue);
          localStorage.setItem("kling_cfgScale", newValue.toString());
        }}>
          <SelectTrigger className="w-[140px] h-11">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">CFG</span>
              <SelectValue>{cfgScale.toFixed(1)}</SelectValue>
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0.0">0.0</SelectItem>
            <SelectItem value="0.1">0.1</SelectItem>
            <SelectItem value="0.2">0.2</SelectItem>
            <SelectItem value="0.3">0.3</SelectItem>
            <SelectItem value="0.4">0.4</SelectItem>
            <SelectItem value="0.5">0.5</SelectItem>
            <SelectItem value="0.6">0.6</SelectItem>
            <SelectItem value="0.7">0.7</SelectItem>
            <SelectItem value="0.8">0.8</SelectItem>
            <SelectItem value="0.9">0.9</SelectItem>
            <SelectItem value="1.0">1.0</SelectItem>
          </SelectContent>
        </Select>

        {/* Duration Dropdown */}        <Select value={duration} onValueChange={(value: "5" | "10") => {
          setDuration(value);
          localStorage.setItem("kling_duration", value);
        }}>
          <SelectTrigger className="w-[120px] h-11">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <SelectValue>{duration}s</SelectValue>
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5 seconds</SelectItem>
            <SelectItem value="10">10 seconds</SelectItem>
          </SelectContent>
        </Select>

        {/* Model Dropdown */}
        <Select value={selectedModel} onValueChange={setSelectedModel}>
          <SelectTrigger className="w-[160px] h-11">
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4" />
              <SelectValue placeholder="Select Model">
                {selectedModelData?.modelId === "kling/v2-1-pro" ? "Pro" : selectedModelData?.modelId === "kling/v2-1-standard" ? "Standard" : "Select Model"}
              </SelectValue>
            </div>
          </SelectTrigger>
          <SelectContent>
            {klingModels.map((model) => {
              // Display "Pro" or "Standard" instead of full name
              const displayName = model.modelId === "kling/v2-1-pro" ? "Pro" : "Standard";
              return (
                <SelectItem key={model.id} value={model.id}>
                  {displayName}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={isGenerating || isUploadingFirst || isUploadingEnd || !firstFrameUrl}
        className="w-full h-12 text-base font-semibold"
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Generating Video...
          </>
        ) : (
          <>
            Generate Video ({formatCredits(creditCost)} credits)
          </>
        )}
      </Button>
    </div>
  );
}


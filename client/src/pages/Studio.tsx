import { useAuth } from "@/_core/hooks/useAuth";
import { useSidebar } from "@/contexts/SidebarContext";
import { useIsMobile } from "@/hooks/useMediaQuery";
import MobileStudio from "./mobile/MobileStudio";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { 
  Coins, Image as ImageIcon, Video, Loader2, Download, Gift, Trash2, 
  Share2, Heart, Copy, ZoomIn, Maximize2, RefreshCw, Sparkles, CreditCard, Play
} from "lucide-react";
import { useState, useEffect, useRef } from "react";

// Helper function to format credits (remove .0 if whole number)
const formatCredits = (value: number | string): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  return num % 1 === 0 ? num.toString() : num.toFixed(1);
};
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { ImageViewer } from "@/components/ImageViewer";
import { GenerationDetailModal } from "@/components/GenerationDetailModal";
import { PromptTemplates } from "@/components/PromptTemplates";
import { PromptHistory } from "@/components/PromptHistory";
import { Sora2Tab } from "@/components/Sora2Tab";
import { Veo3Tab } from "@/components/Veo3Tab";
import { SeedanceTab } from "@/components/SeedanceTab";
import { KlingTab } from "@/components/KlingTab";
import { ImageUploadBox } from "@/components/ImageUploadBox";
import { ReferenceBox } from "@/components/ReferenceBox";
import { UserMenu } from "@/components/UserMenu";
import { Logo, LogoImage } from "@/components/Logo";
import { TopupModal } from "@/components/TopupModal";
import { Sidebar } from "@/components/Sidebar";
import { VerifyCodeModal } from "@/components/VerifyCodeModal";
// @ts-ignore - no types available
// import Masonry from "react-masonry-css"; // Replaced with CSS Grid
import { ChevronLeft, ChevronRight, Grid3x3, LayoutGrid, LayoutList, Lock, Layers } from "lucide-react";

function DesktopStudio() {
  const { user, isAuthenticated } = useAuth();
  const [location] = useLocation();
  
  // Get tab from URL query parameter
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const tabFromUrl = urlParams.get('tab') || 'image';
  
  const { isCollapsed: sidebarCollapsed, toggleCollapsed: toggleSidebar } = useSidebar();
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [currentTab, setCurrentTab] = useState<string>(tabFromUrl);

  // Sync currentTab with URL changes
  useEffect(() => {
    const urlParams = new URLSearchParams(location.split('?')[1] || '');
    const tab = urlParams.get('tab') || 'image';
    setCurrentTab(tab);
  }, [location]);
  
  // Get imageSubTab from URL
  const imageSubTabFromUrl = (() => {
    const urlParams = new URLSearchParams(location.split('?')[1] || '');
    return urlParams.get('imageSubTab') || 'seedream';
  })();
  
  const [imageSubTab, setImageSubTab] = useState<string>(imageSubTabFromUrl); // seedream, nano-banana, ideogram
  
  // Handle imageSubTab change with URL update
  const handleImageSubTabChange = (value: string) => {
    setImageSubTab(value);
    const urlParams = new URLSearchParams(location.split('?')[1] || '');
    urlParams.set('imageSubTab', value);
    const newUrl = `${location.split('?')[0]}?${urlParams.toString()}`;
    window.history.replaceState({}, '', newUrl);
  };
  
  // Sync imageSubTab with URL changes
  useEffect(() => {
    const urlParams = new URLSearchParams(location.split('?')[1] || '');
    const imageSubTabParam = urlParams.get('imageSubTab');
    if (imageSubTabParam && imageSubTabParam !== imageSubTab) {
      setImageSubTab(imageSubTabParam);
    }
  }, [location]);
  
  const [videoSubTab, setVideoSubTab] = useState<string>("sora2"); // sora2, veo, seedance, kling
  const [imageModel, setImageModel] = useState<string>("");
  const [sora2Model, setSora2Model] = useState<string>("");
  const [veoModel, setVeoModel] = useState<string>("");
  const [seedanceModel, setSeedanceModel] = useState<string>("");
  const [klingModel, setKlingModel] = useState<string>("");
  const [viewSize, setViewSize] = useState<"compact" | "comfortable" | "spacious">(() => {
    const saved = localStorage.getItem("studio-viewSize");
    return (saved as "compact" | "comfortable" | "spacious") || "comfortable";
  });
  const [viewMode, setViewMode] = useState<"grid" | "card">(() => {
    const saved = localStorage.getItem("studio-viewMode");
    return (saved as "grid" | "card") || "grid";
  }); // grid or card view
  const [currentPage, setCurrentPage] = useState(1);
  // View-based pagination: Spacious (15), Comfortable (24), Compact (35)
  const itemsPerPage = viewSize === "spacious" ? 15 : viewSize === "comfortable" ? 24 : 35;
  const [inviteCode, setInviteCode] = useState("");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [topupModalOpen, setTopupModalOpen] = useState(false);
  const [verifyCodeModalOpen, setVerifyCodeModalOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerImage, setViewerImage] = useState({ src: "", alt: "" });
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedGeneration, setSelectedGeneration] = useState<typeof generations[0] | null>(null);
  const [aspectRatio, setAspectRatio] = useState(() => {
    // Load aspect ratio based on current imageSubTab
    const saved = localStorage.getItem(`aspectRatio_${imageSubTabFromUrl}`);
    if (saved) return saved;
    // Default values based on tab
    return imageSubTabFromUrl === "nano-banana" ? "1:1" : "square";
  });
  const [imageResolution, setImageResolution] = useState<"1K" | "2K" | "4K">("1K");
  const [videoAspectRatio, setVideoAspectRatio] = useState<"16:9" | "9:16" | "Auto">("16:9");
  const [videoGenerationType, setVideoGenerationType] = useState<"TEXT_2_VIDEO" | "FIRST_AND_LAST_FRAMES_2_VIDEO" | "REFERENCE_2_VIDEO">("TEXT_2_VIDEO");
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const [imageUploadFiles, setImageUploadFiles] = useState<File[]>([]);
  const [imageUploadPreviews, setImageUploadPreviews] = useState<string[]>([]);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [isVeoImageUploading, setIsVeoImageUploading] = useState(false);
  const [veoUploadedFiles, setVeoUploadedFiles] = useState<File[]>([]);
  const [promptHistory, setPromptHistory] = useState<Array<{
    id: string;
    prompt: string;
    timestamp: Date;
    modelName: string;
  }>>([]);
  
  // Image Tab - New features
  const [outputFormat, setOutputFormat] = useState<"png" | "jpeg">("png"); // Nano Banana
  const [maxImages, setMaxImages] = useState<number>(1); // Seedream V4: 1-4
  const [numImages, setNumImages] = useState<"1" | "2" | "3" | "4">("1"); // Ideogram: 1-4
  const [referenceImageFiles, setReferenceImageFiles] = useState<File[]>([]);
  const [referenceImageUrls, setReferenceImageUrls] = useState<string[]>([]);
  const [renderingSpeed, setRenderingSpeed] = useState<"TURBO" | "BALANCED" | "QUALITY">("BALANCED");
  const [style, setStyle] = useState<"AUTO" | "REALISTIC" | "FICTION">("AUTO");
  const [expandPrompt, setExpandPrompt] = useState<boolean>(true); // Default true per API docs
  const [strength, setStrength] = useState<number>(0.8);
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined); // For Character Remix
  const imageUrlRef = useRef<string | undefined>(undefined); // Ref to avoid closure problem
  const [styleImageFiles, setStyleImageFiles] = useState<File[]>([]);

  // Debug: Track imageUrl changes and sync with ref
  useEffect(() => {
    console.log('[State] imageUrl changed to:', imageUrl);
    imageUrlRef.current = imageUrl; // Sync ref with state
  }, [imageUrl]);
  
  // Load aspect ratio from localStorage when imageSubTab changes
  useEffect(() => {
    const saved = localStorage.getItem(`aspectRatio_${imageSubTab}`);
    if (saved) {
      setAspectRatio(saved);
    } else {
      // Set default if no saved value
      const defaultValue = imageSubTab === "nano-banana" ? "1:1" : "square";
      setAspectRatio(defaultValue);
    }
  }, [imageSubTab]);
  const [styleImageUrls, setStyleImageUrls] = useState<string[]>([]);
  const [isReferenceImageUploading, setIsReferenceImageUploading] = useState(false);
  const [isStyleImageUploading, setIsStyleImageUploading] = useState(false);
  
  // REFERENCES section - New state for reference boxes
  const [uploadImages, setUploadImages] = useState<Array<{ file?: File; url: string }>>([]);
  const [characterImage, setCharacterImage] = useState<{ file?: File; url: string } | null>(null);
  const [styleImage, setStyleImage] = useState<{ file?: File; url: string } | null>(null);

  const { data: credits = 0 } = trpc.credits.get.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: models = [] } = trpc.models.list.useQuery();
  const { data: generations = [] } = trpc.generations.list.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 5000,
  });

  // Debug: Log generations data
  useEffect(() => {
    if (generations.length > 0) {
      console.log('[Debug] Generations data:', generations);
      console.log('[Debug] First generation:', generations[0]);
      console.log('[Debug] First generation taskId:', generations[0].taskId);
    }
  }, [generations]);

  // Auto-select models for each tab
  useEffect(() => {
    if (models.length === 0) return;

    // Filter to show only base models (exclude edit variants from dropdown)
    // Edit models will be used automatically when images are uploaded
    const imageModels = models.filter((m) => 
      m.type === "image" && 
      !m.modelId?.includes("-edit") && 
      !m.modelId?.includes("Edit")
    );
    // Filter Sora 2 models - only show text-to-video base models (exclude image-to-video variants)
    const sora2Models = models.filter((m) => 
      m.type === "video" && 
      m.modelId?.startsWith("sora") && 
      !m.modelId?.includes("image-to-video") &&
      m.isActive
    );
    const veoModels = models.filter((m) => m.type === "video" && m.modelId?.startsWith("veo"));
    const seedanceModels = models.filter((m) => 
      m.type === "video" && m.modelId?.startsWith("bytedance/v1")
    );

    // Auto-select from last generation or first model
    if (!imageModel && imageModels.length > 0) {
      const lastImageGen = generations.find(g => {
        const model = models.find(m => m.id === g.modelId);
        return model?.type === "image" && !model.modelId?.includes("-edit");
      });
      setImageModel(lastImageGen?.modelId || imageModels[0].id);
    }

    if (!sora2Model && sora2Models.length > 0) {
      const lastSora2Gen = generations.find(g => {
        const model = models.find(m => m.id === g.modelId);
        return model?.modelId?.startsWith("sora");
      });
      setSora2Model(lastSora2Gen?.modelId || sora2Models[0].id);
    }

    if (!veoModel && veoModels.length > 0) {
      const lastVeoGen = generations.find(g => {
        const model = models.find(m => m.id === g.modelId);
        return model?.modelId?.startsWith("veo");
      });
      setVeoModel(lastVeoGen?.modelId || veoModels[0].id);
    }

    if (!seedanceModel && seedanceModels.length > 0) {
      const lastSeedanceGen = generations.find(g => {
        const model = models.find(m => m.id === g.modelId);
        return model?.modelId?.startsWith("bytedance/v1");
      });
      setSeedanceModel(lastSeedanceGen?.modelId || seedanceModels[0].id);
    }
  }, [models, generations, imageModel, sora2Model, veoModel, seedanceModel]);

  // Auto-select model based on imageSubTab
  useEffect(() => {
    if (currentTab === "image" && models.length > 0) {
      if (imageSubTab === "seedream") {
        const seedreamModel = models.find(m => m.modelId?.includes("seedream-v4") && !m.modelId?.includes("-edit"));
        if (seedreamModel) {
          setImageModel(seedreamModel.id);
          setSelectedModel(seedreamModel.id);
        }
      } else if (imageSubTab === "nano-banana") {
        const nanoBananaModel = models.find(m => m.modelId?.includes("nano-banana") && !m.modelId?.includes("-edit"));
        if (nanoBananaModel) {
          setImageModel(nanoBananaModel.id);
          setSelectedModel(nanoBananaModel.id);
        }
      } else if (imageSubTab === "ideogram") {
        // For ideogram, auto-select first ideogram model if no model selected
        const ideogramModel = models.find(m => m.modelId?.startsWith("ideogram/"));
        if (ideogramModel && (!selectedModel || !models.find(m => m.id === selectedModel)?.modelId?.startsWith("ideogram/"))) {
          setImageModel(ideogramModel.id);
          setSelectedModel(ideogramModel.id);
        }
      }
    }
  }, [imageSubTab, currentTab, models]);

  // Sync selectedModel with current tab and sub-tabs
  useEffect(() => {
    if (currentTab === "image") {
      setSelectedModel(imageModel);
    } else if (currentTab === "video") {
      if (videoSubTab === "sora2") {
        setSelectedModel(sora2Model);
      } else if (videoSubTab === "veo") {
        setSelectedModel(veoModel);
      } else if (videoSubTab === "seedance") {
        setSelectedModel(seedanceModel);
      } else if (videoSubTab === "kling") {
        setSelectedModel(klingModel);
      }
    }
  }, [currentTab, videoSubTab, imageModel, sora2Model, veoModel, seedanceModel]);

  const utils = trpc.useUtils();
  const uploadMutation = trpc.upload.useMutation();
  
  // Helper function to upload image and return URL
  const uploadImageFile = async (file: File): Promise<string> => {
    const reader = new FileReader();
    const base64 = await new Promise<string>((resolve) => {
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remove data:image/...;base64, prefix
      };
      reader.readAsDataURL(file);
    });
    
    const result = await uploadMutation.mutateAsync({
      file: base64,
      filename: file.name,
      contentType: file.type,
    });
    
    return result.url;
  };

  // Sidebar state now managed by SidebarContext

  // Load prompt history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("promptHistory");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPromptHistory(parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        })));
      } catch (e) {
        console.error("Failed to parse prompt history:", e);
      }
    }
  }, []);

  // Save prompt history to localStorage
  const saveToHistory = (prompt: string, modelId: string) => {
    const model = models.find(m => m.id === modelId);
    if (!model) return;

    const newItem = {
      id: Date.now().toString(),
      prompt,
      timestamp: new Date(),
      modelName: model.name,
    };

    const updated = [newItem, ...promptHistory].slice(0, 50); // Keep last 50
    setPromptHistory(updated);
    localStorage.setItem("promptHistory", JSON.stringify(updated));
  };

  const createMutation = trpc.generations.create.useMutation({
    onSuccess: () => {
      toast.success("Generation started!");
      if (prompt && selectedModel) {
        saveToHistory(prompt, selectedModel);
      }
      // Keep prompt for easy re-generation
      // setPrompt("");
      // setNegativePrompt("");
      utils.generations.list.invalidate();
      utils.credits.get.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = trpc.generations.delete.useMutation({
    onSuccess: () => {
      toast.success("Generation deleted");
      utils.generations.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const get1080pMutation = trpc.generations.get1080p.useMutation({
    onSuccess: (data) => {
      window.open(data.url, "_blank");
      toast.success("1080P video ready!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to get 1080P video");
    },
  });

  const redeemMutation = trpc.redeemInvite.useMutation({
    onSuccess: (data: { credits: number }) => {
      toast.success(`Redeemed! You received ${data.credits} credits`);
      setInviteCode("");
      setInviteDialogOpen(false);
      utils.credits.get.invalidate();
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const handleRedeemInvite = () => {
    if (!inviteCode.trim()) {
      toast.error("Please enter an invite code");
      return;
    }
    redeemMutation.mutate({ code: inviteCode });
  };

  const handleGenerate = async () => {
    if (!selectedModel || !prompt.trim()) {
      toast.error("Please select a model and enter a prompt");
      return;
    }

    let actualModelId = selectedModel;
    let imageUrl: string | undefined = undefined;

    // Handle Seedream V4 and Google Nano Banana automatic model selection
    const model = models.find(m => m.id === selectedModel);
    const isSeedreamV4 = model?.modelId?.startsWith("bytedance/seedream-v4");
    const isGoogleNanoBanana = model?.modelId?.startsWith("google/nano-banana");
    const isCharacterRemix = model?.modelId === 'ideogram/character-remix';
    let imageUrls: string[] = [];
    
    console.log('[Generate] Model:', model?.name, model?.modelId);
    console.log('[Generate] isSeedreamV4:', isSeedreamV4);
    console.log('[Generate] isGoogleNanoBanana:', isGoogleNanoBanana);
    console.log('[Generate] imageUrl (state):', imageUrl);
    console.log('[Generate] imageUrl (ref):', imageUrlRef.current);
    console.log('[Generate] imageUploadFiles.length:', imageUploadFiles.length);
    
    // Use uploadImages from REFERENCES section for Seedream V4 and Nano Banana
    const uploadedImageUrls = uploadImages.filter(img => img.url).map(img => img.url);
    
    if ((isSeedreamV4 || isGoogleNanoBanana) && uploadedImageUrls.length > 0) {
      imageUrls = uploadedImageUrls;
      console.log('[Generate] Using images from REFERENCES section:', imageUrls);
      
      // Switch to edit model if images are present
      if (isSeedreamV4) {
        const editModel = models.find(m => m.modelId === "bytedance/seedream-v4-edit");
        if (editModel) {
          actualModelId = editModel.id;
          console.log('[Generate] Switched to Seedream V4 Edit model');
        }
      } else if (isGoogleNanoBanana) {
        const editModel = models.find(m => m.modelId === "google/nano-banana-edit");
        if (editModel) {
          actualModelId = editModel.id;
          console.log('[Generate] Switched to Nano Banana Edit model');
        }
      }
    } else if (isCharacterRemix && uploadedImageUrls.length > 0) {
      // For Character Remix, use first upload image as base image
      imageUrls = [uploadedImageUrls[0]];
      console.log('[Generate] Using base image for Character Remix:', imageUrls);
    }

    const isVeo3 = model?.modelId === "veo3" || model?.modelId === "veo3_fast";

    // Validate image requirements for different generation types
    if (isVeo3 && videoGenerationType !== "TEXT_2_VIDEO") {
      if (uploadedImageUrls.length === 0) {
        toast.error("Please upload at least one image for this generation type");
        return;
      }
      if (videoGenerationType === "FIRST_AND_LAST_FRAMES_2_VIDEO" && uploadedImageUrls.length > 2) {
        toast.error("Maximum 2 images allowed for First-and-Last-Frames mode");
        return;
      }
      if (videoGenerationType === "REFERENCE_2_VIDEO" && uploadedImageUrls.length > 3) {
        toast.error("Maximum 3 images allowed for Reference mode");
        return;
      }
    }

    // Handle Ideogram reference images from REFERENCES section
    const isIdeogramModel = model?.modelId?.startsWith('ideogram/');
    let uploadedReferenceUrls: string[] = [];
    let uploadedStyleUrls: string[] = [];
    
    if (isIdeogramModel) {
      // Use characterImage from REFERENCES section
      if (characterImage?.url) {
        uploadedReferenceUrls = [characterImage.url];
        console.log('[Generate] Using character image from REFERENCES:', characterImage.url);
      }
      
      // Use styleImage from REFERENCES section (for Character Remix)
      if (styleImage?.url) {
        uploadedStyleUrls = [styleImage.url];
        console.log('[Generate] Using style image from REFERENCES:', styleImage.url);
      }
      
      // Check Ideogram model requirements
      if (uploadedReferenceUrls.length === 0) {
        toast.error("Please upload a character reference image for Ideogram models");
        return;
      }
    }

    // Validate Character Remix requires image_url
    if (isCharacterRemix && imageUrls.length === 0 && !imageUrl) {
      toast.error("Please upload an image to remix for Character Remix model");
      return;
    }

    createMutation.mutate({
      modelId: actualModelId,
      prompt: prompt.trim(),
      ...(!isVeo3 && { aspectRatio: aspectRatio }),
      ...(imageUrls.length > 0 && (isSeedreamV4 || isGoogleNanoBanana) && { imageUrls: imageUrls }),
      // Add Seedream V4 parameters
      ...(isSeedreamV4 && { 
        imageResolution: imageResolution,
        maxImages: maxImages,
      }),
      // Add Nano Banana parameters
      ...(isGoogleNanoBanana && {
        outputFormat: outputFormat,
      }),
      // Add Ideogram parameters
      ...(isIdeogramModel && {
        referenceImageUrls: uploadedReferenceUrls,
        renderingSpeed: renderingSpeed,
        style: style,
        expandPrompt: expandPrompt,
        numImages: numImages,
        negativePrompt: negativePrompt,
        ...(model?.modelId === 'ideogram/character-remix' && {
          imageUrl: imageUrl || imageUrls[0], // Use imageUrl state if available (from Reuse), otherwise from upload
          strength: strength,
          ...(uploadedStyleUrls.length > 0 && { styleImageUrls: uploadedStyleUrls }),
        }),
      }),
      // Add Veo 3.1 parameters if applicable
      ...(isVeo3 && {
        aspectRatio: videoAspectRatio,
        generationType: videoGenerationType,
        imageUrls: uploadedImageUrls.length > 0 ? uploadedImageUrls : undefined,
      }),
    });

    // Keep image upload files for re-generation

    // Save to history
    saveToHistory(prompt.trim(), actualModelId);
  };

  const handleShare = async (url: string, prompt: string) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: prompt,
          url: url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
      }
    } catch (error) {
      console.error("Share failed:", error);
    }
  };

  const handleCopyPrompt = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Prompt copied to clipboard");
  };

  const handleViewImage = (src: string, alt: string) => {
    setViewerImage({ src, alt });
    setViewerOpen(true);
  };

  const imageModels = models.filter((m) => m.type === "image" && !m.modelId?.includes("-edit"));
  const sora2Models = models.filter((m) => m.type === "video" && m.modelId?.startsWith("sora"));
  const veoModels = models.filter((m) => m.type === "video" && m.modelId?.startsWith("veo"));
  const seedanceModels = models.filter((m) => m.type === "video" && m.modelId?.startsWith("bytedance/v1"));

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>Please sign in to access the studio</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href={getLoginUrl()}>Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar 
        isCollapsed={sidebarCollapsed} 
        onToggle={toggleSidebar}
        currentTab={currentTab}
        onTabChange={setCurrentTab}
      />

      {/* Main Content */}
      <div 
        className="transition-all duration-300 ease-in-out overflow-x-hidden"
        style={{
          marginLeft: '0px',
        }}
      >
        {/* Header */}
        <header className="border-b bg-card/50 backdrop-blur-sm">
          <div className="px-4 h-16 flex items-center justify-between">
            <div className="flex-1">
              {sidebarCollapsed && (
                <LogoImage className="h-8 w-auto" />
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-card border rounded-lg">
                <Coins className="h-5 w-5 text-yellow-600" />
                <span className="font-semibold">{credits}</span>
                <span className="text-sm text-muted-foreground">credits</span>
              </div>

              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={user?.isVerified ? () => setTopupModalOpen(true) : () => setVerifyCodeModalOpen(true)}
                title={!user?.isVerified ? "สิทธิพิเศษสำหรับนักเรียนเซนนิตี้เอ็กซ์ ติดต่อขอ Verified Code / สมัครเรียนได้ที่ Messenger" : ""}
              >
                {!user?.isVerified ? (
                  <Lock className="h-4 w-4" />
                ) : (
                  <CreditCard className="h-4 w-4" />
                )}
                Top-up Credits
              </Button>

              {user?.role === "admin" && (
                <Button variant="outline" size="sm" asChild>
                  <Link href="/admin">Admin</Link>
                </Button>
              )}

              <UserMenu />
            </div>
          </div>
        </header>

        <div className="pr-4 pl-4 py-4">
          {/* Verification Banner for Unverified Users */}
          {user && !user.isVerified && (
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    สิทธิพิเศษสำหรับนักเรียนเซนนิตี้เอ็กซ์
                  </h3>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                    คุณสามารถดูหน้าต่างๆ ได้ แต่ยังไม่สามารถใช้งาน Generate และ Top-up Credits ได้ กรุณากรอก Verified Code เพื่อปลดล็อคฟีเจอร์ทั้งหมด
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => setVerifyCodeModalOpen(true)}
                      className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
                    >
                      กรอก Verified Code
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      asChild
                      className="border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                    >
                      <a href="https://m.me/zenityXAiStudio" target="_blank" rel="noopener noreferrer">
                        ติดต่อขอ Verified Code / สมัครเรียน
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex gap-8">
            {/* Generation Form */}
            <div className="w-full max-w-[350px] flex-shrink-0">
            {/* Image Generator */}
            {currentTab === "image" && (
              <div className="space-y-4">
                {/* Image Sub-tabs */}
                <Tabs value={imageSubTab} onValueChange={handleImageSubTabChange} className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="seedream">Seedream V4</TabsTrigger>
                    <TabsTrigger value="nano-banana">Nano Banana</TabsTrigger>
                    <TabsTrigger value="ideogram">Ideogram</TabsTrigger>
                  </TabsList>
                </Tabs>
                
                <Card>
                  <CardContent className="space-y-4 pt-0">
                    {/* MODEL Section */}
                    {imageSubTab === "ideogram" && (
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase text-muted-foreground">Model</Label>
                        <Select value={imageModel} onValueChange={(value) => {
                          setImageModel(value);
                          setSelectedModel(value);
                        }}>
                          <SelectTrigger className="h-16 w-full">
                            <SelectValue placeholder="Select a model">
                              {imageModel && imageModels.find(m => m.id === imageModel)?.name}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {imageModels.filter(m => m.modelId?.startsWith('ideogram/')).map((model) => (
                              <SelectItem key={model.id} value={model.id}>
                                {model.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* PROMPT Section */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold uppercase text-muted-foreground">Prompt</Label>
                        <div className="flex gap-1">
                          <PromptHistory
                            history={promptHistory}
                            onSelectPrompt={setPrompt}
                            onClearHistory={() => {
                              setPromptHistory([]);
                              localStorage.removeItem("promptHistory");
                              toast.success("History cleared");
                            }}
                          />
                          <PromptTemplates
                            onSelectTemplate={setPrompt}
                            type="image"
                          />
                        </div>
                      </div>
                      <Textarea
                        placeholder="Describe what you want to create..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        rows={6}
                        className="min-h-[140px] resize-none"
                      />
                    </div>

                    {/* REFERENCES Section - Dynamic based on model */}
                    {selectedModel && (() => {
                      const model = models.find(m => m.id === selectedModel);
                      const modelId = model?.modelId || '';
                      
                      // Determine which boxes to show
                      const showStyleBox = modelId === 'ideogram/character-remix';
                      const showCharacterBox = modelId === 'ideogram/character' || modelId === 'ideogram/character-remix';
                      const showUploadBox = modelId.includes('seedream-v4') || modelId.includes('nano-banana') || (!showCharacterBox && !showStyleBox);
                      
                      // Max images based on model
                      const maxUploadImages = modelId.includes('seedream-v4') || modelId.includes('nano-banana') ? 10 : 1;
                      
                      if (!showStyleBox && !showCharacterBox && !showUploadBox) return null;
                      
                      return (
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold uppercase text-muted-foreground">References</Label>
                          <div className="grid grid-cols-3 gap-3">
                            {/* Style Box - Ideogram Character Remix only */}
                            {showStyleBox && (
                              <ReferenceBox
                                type="style"
                                label="Style"
                                imageUrl={styleImage?.url}
                                onImageSelect={async (file) => {
                                  try {
                                    const url = await uploadImageFile(file);
                                    setStyleImage({ file, url });
                                    toast.success('Style image uploaded');
                                  } catch (error) {
                                    toast.error('Failed to upload style image');
                                  }
                                }}
                                onImageRemove={() => {
                                  setStyleImage(null);
                                  toast.success('Style image removed');
                                }}
                              />
                            )}
                            
                            {/* Character Box - Ideogram Character & Character Remix */}
                            {showCharacterBox && (
                              <ReferenceBox
                                type="character"
                                label="Character"
                                imageUrl={characterImage?.url}
                                onImageSelect={async (file) => {
                                  try {
                                    const url = await uploadImageFile(file);
                                    setCharacterImage({ file, url });
                                    toast.success('Character image uploaded');
                                  } catch (error) {
                                    toast.error('Failed to upload character image');
                                  }
                                }}
                                onImageRemove={() => {
                                  setCharacterImage(null);
                                  toast.success('Character image removed');
                                }}
                              />
                            )}
                            
                            {/* Upload Boxes - Show uploaded images only */}
                            {showUploadBox && uploadImages.filter(img => img.url).map((img, index) => (
                              <ReferenceBox
                                key={index}
                                type="upload"
                                label={`@img${index + 1}`}
                                imageUrl={img.url}
                                onImageSelect={async (file) => {
                                  try {
                                    const url = await uploadImageFile(file);
                                    const newImages = [...uploadImages];
                                    newImages[index] = { file, url };
                                    setUploadImages(newImages);
                                    toast.success('Image uploaded');
                                  } catch (error) {
                                    toast.error('Failed to upload image');
                                  }
                                }}
                                onImageRemove={() => {
                                  const newImages = uploadImages.filter((_, i) => i !== index);
                                  setUploadImages(newImages);
                                  toast.success('Image removed');
                                }}
                              />
                            ))}
                            
                            {/* Show empty upload box if not at max (count only uploaded images) */}
                            {showUploadBox && uploadImages.filter(img => img.url).length < maxUploadImages && (
                              <ReferenceBox
                                type="upload"
                                label="Upload"
                                onImageSelect={async (file) => {
                                  try {
                                    const url = await uploadImageFile(file);
                                    // Add new image to the array
                                    setUploadImages([...uploadImages, { file, url }]);
                                    toast.success('Image uploaded');
                                  } catch (error) {
                                    toast.error('Failed to upload image');
                                  }
                                }}
                                onImageRemove={() => {}}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Old ImageUploadBox - Keep for non-REFERENCES models */}
                    {false && selectedModel && models.find(m => m.id === selectedModel)?.modelId !== 'ideogram/character' && models.find(m => m.id === selectedModel)?.modelId !== 'ideogram/character-remix' && (
                      <ImageUploadBox
                        maxImages={10}
                        maxSizeMB={10}
                        uploadedFiles={imageUploadFiles}
                        onFilesChange={setImageUploadFiles}
                        // @ts-expect-error - imageUrl can be undefined but component expects string[]
                        initialUrls={imageUrl ? [imageUrl] : []}
                        onUrlsRemove={(urls) => {
                          if (urls.length === 0) {
                            setImageUrl("");
                          }
                        }}
                        onUpload={async (files) => {
                          setIsImageUploading(true);
                          try {
                            const uploadPromises = files.map(async (file) => {
                              // Convert file to base64
                              const reader = new FileReader();
                              const base64 = await new Promise<string>((resolve) => {
                                reader.onloadend = () => {
                                  const result = reader.result as string;
                                  resolve(result.split(',')[1]); // Remove data:image/...;base64, prefix
                                };
                                reader.readAsDataURL(file);
                              });
                              
                              // Upload via tRPC
                              const result = await uploadMutation.mutateAsync({
                                file: base64,
                                filename: file.name,
                                contentType: file.type,
                              });
                              
                              return result.url;
                            });

                            const urls = await Promise.all(uploadPromises);
                            return urls;
                          } finally {
                            setIsImageUploading(false);
                          }
                        }}
                        isUploading={isImageUploading}
                        label="Image Upload"
                        description="Optional, for image editing models"
                      />
                    )}

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase text-muted-foreground">Aspect Ratio</Label>
                      <Select value={aspectRatio} onValueChange={(value) => {
                        setAspectRatio(value);
                        localStorage.setItem(`aspectRatio_${imageSubTab}`, value);
                      }}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {imageSubTab === "seedream" ? (
                            // Seedream V4 aspect ratios
                            <>
                              <SelectItem value="square">Square</SelectItem>
                              <SelectItem value="square_hd">Square HD</SelectItem>
                              <SelectItem value="portrait_4_3">Portrait 3:4</SelectItem>
                              <SelectItem value="portrait_3_2">Portrait 2:3</SelectItem>
                              <SelectItem value="portrait_16_9">Portrait 9:16</SelectItem>
                              <SelectItem value="landscape_4_3">Landscape 4:3</SelectItem>
                              <SelectItem value="landscape_3_2">Landscape 3:2</SelectItem>
                              <SelectItem value="landscape_16_9">Landscape 16:9</SelectItem>
                              <SelectItem value="landscape_21_9">Landscape 21:9</SelectItem>
                            </>
                          ) : imageSubTab === "nano-banana" ? (
                            // Nano Banana aspect ratios
                            <>
                              <SelectItem value="1:1">1:1</SelectItem>
                              <SelectItem value="9:16">9:16</SelectItem>
                              <SelectItem value="16:9">16:9</SelectItem>
                              <SelectItem value="3:4">3:4</SelectItem>
                              <SelectItem value="4:3">4:3</SelectItem>
                              <SelectItem value="3:2">3:2</SelectItem>
                              <SelectItem value="2:3">2:3</SelectItem>
                              <SelectItem value="5:4">5:4</SelectItem>
                              <SelectItem value="4:5">4:5</SelectItem>
                              <SelectItem value="21:9">21:9</SelectItem>
                              <SelectItem value="auto">auto</SelectItem>
                            </>
                          ) : imageSubTab === "ideogram" ? (
                            // Ideogram aspect ratios
                            <>
                              <SelectItem value="square">Square (1:1)</SelectItem>
                              <SelectItem value="square_hd">Square HD</SelectItem>
                              <SelectItem value="portrait_4_3">Portrait (3:4)</SelectItem>
                              <SelectItem value="portrait_16_9">Portrait (9:16)</SelectItem>
                              <SelectItem value="landscape_4_3">Landscape (4:3)</SelectItem>
                              <SelectItem value="landscape_16_9">Landscape (16:9)</SelectItem>
                            </>
                          ) : null}
                        </SelectContent>
                      </Select>
                    </div>







                    {/* Seedream V4 - Image Resolution and Number of Images */}
                    {imageSubTab === "seedream" && (
                      <>
                        <div className="space-y-2">
                          <Label>Image Resolution</Label>
                          <div className="grid grid-cols-3 gap-2">
                            <Button
                              type="button"
                              variant={imageResolution === "1K" ? "default" : "outline"}
                              onClick={() => setImageResolution("1K")}
                              className="w-full"
                            >
                              1K
                            </Button>
                            <Button
                              type="button"
                              variant={imageResolution === "2K" ? "default" : "outline"}
                              onClick={() => setImageResolution("2K")}
                              className="w-full"
                            >
                              2K
                            </Button>
                            <Button
                              type="button"
                              variant={imageResolution === "4K" ? "default" : "outline"}
                              onClick={() => setImageResolution("4K")}
                              className="w-full"
                            >
                              4K
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Number of Images</Label>
                          <div className="grid grid-cols-4 gap-2">
                            {[1, 2, 3, 4].map((num) => {
                              const isDisabled = num === 3; // Disable 3 due to Kie API bug (confirmed still broken)
                              return (
                                <Button
                                  key={num}
                                  type="button"
                                  variant={maxImages === num ? "default" : "outline"}
                                  onClick={() => !isDisabled && setMaxImages(num)}
                                  disabled={isDisabled}
                                  className="w-full"
                                >
                                  {num}
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Nano Banana - Output Format */}
                    {imageSubTab === "nano-banana" && (
                      <>
                        <div className="space-y-2">
                          <Label>Output Format</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              type="button"
                              variant={outputFormat === "png" ? "default" : "outline"}
                              onClick={() => setOutputFormat("png")}
                              className="w-full"
                            >
                              PNG
                            </Button>
                            <Button
                              type="button"
                              variant={outputFormat === "jpeg" ? "default" : "outline"}
                              onClick={() => setOutputFormat("jpeg")}
                              className="w-full"
                            >
                              JPEG
                            </Button>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Ideogram - Rendering Speed */}
                    {imageSubTab === "ideogram" && (
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase text-muted-foreground">Rendering Speed</Label>
                        <Select value={renderingSpeed} onValueChange={(value) => setRenderingSpeed(value as "TURBO" | "BALANCED" | "QUALITY")}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="TURBO">Turbo</SelectItem>
                            <SelectItem value="BALANCED">Balanced</SelectItem>
                            <SelectItem value="QUALITY">Quality</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Ideogram - Style */}
                    {imageSubTab === "ideogram" && (
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase text-muted-foreground">Style</Label>
                        <Select value={style} onValueChange={(value) => setStyle(value as "AUTO" | "REALISTIC" | "FICTION")}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AUTO">Auto</SelectItem>
                            <SelectItem value="REALISTIC">Realistic</SelectItem>
                            <SelectItem value="FICTION">Fiction</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Ideogram - MagicPrompt */}
                    {imageSubTab === "ideogram" && (
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase text-muted-foreground">MagicPrompt</Label>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">Enhance prompt automatically</p>
                          <Switch
                            checked={expandPrompt}
                            onCheckedChange={setExpandPrompt}
                          />
                        </div>
                      </div>
                    )}

                    {/* Ideogram - Number of Images */}
                    {imageSubTab === "ideogram" && (
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase text-muted-foreground">Number of Images</Label>
                        <div className="grid grid-cols-4 gap-2">
                          {[1, 2, 3, 4].map((num) => (
                            <Button
                              key={num}
                              type="button"
                              variant={parseInt(numImages) === num ? "default" : "outline"}
                              onClick={() => setNumImages(num.toString() as "1" | "2" | "3" | "4")}
                              className="w-full"
                            >
                              {num}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button
                      onClick={user?.isVerified ? handleGenerate : () => setVerifyCodeModalOpen(true)}
                      disabled={createMutation.isPending || !selectedModel || !prompt.trim()}
                      className="w-full h-12 text-base font-semibold relative"
                      size="lg"
                      title={!user?.isVerified ? "สิทธิพิเศษสำหรับนักเรียนเซนนิตี้เอ็กซ์ ติดต่อขอ Verified Code / สมัครเรียนได้ที่ Messenger" : ""}
                    >
                      {createMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          {!user?.isVerified ? (
                            <Lock className="mr-2 h-4 w-4" />
                          ) : (
                            <Sparkles className="mr-2 h-4 w-4" />
                          )}
                          Generate Image
                          {selectedModel && models.find(m => m.id === selectedModel) && (() => {
                            const model = models.find(m => m.id === selectedModel);
                            let cost = Number(model?.costPerGeneration) || 0;
                            
                            // Calculate actual cost based on parameters
                            if (model?.modelId.startsWith('ideogram/')) {
                              // Get cost from pricingOptions based on rendering_speed
                              if (renderingSpeed && model.pricingOptions) {
                                try {
                                  const pricingOptions = JSON.parse(model.pricingOptions);
                                  if (pricingOptions[renderingSpeed]) {
                                    cost = pricingOptions[renderingSpeed];
                                  }
                                } catch (e) {
                                  console.error('[Pricing] Failed to parse pricingOptions:', e);
                                }
                              }
                              const numImagesInt = parseInt(numImages);
                              cost = cost * numImagesInt;
                            } else if (model?.modelId.startsWith('bytedance/seedream-v4')) {
                              cost = cost * maxImages;
                            }
                            
                            return (
                              <span className="ml-2 text-base">
                                ({cost % 1 === 0 ? Math.floor(cost) : cost} credits)
                              </span>
                            );
                          })()}
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Video Generator */}
            {currentTab === "video" && (
              <div className="space-y-4">
                {/* Video Sub-tabs */}
                <Tabs value={videoSubTab} onValueChange={setVideoSubTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="sora2">Sora 2</TabsTrigger>
                    <TabsTrigger value="veo">Veo 3.1</TabsTrigger>
                    <TabsTrigger value="seedance">Seedance</TabsTrigger>
                    <TabsTrigger value="kling">Kling 2.1</TabsTrigger>
                  </TabsList>
                  
                  {/* Sora 2 Sub-tab */}
                  <TabsContent value="sora2" className="space-y-4 mt-4">
                    <Card>
                      <CardContent className="space-y-4 pt-0">
                        <Sora2Tab
                          models={models}
                          credits={credits as any}
                          prompt={prompt}
                          setPrompt={setPrompt}
                          selectedModel={sora2Model}
                          setSelectedModel={(value) => {
                            setSora2Model(value);
                            setSelectedModel(value);
                          }}
                          onGenerate={(params) => {
                            createMutation.mutate(params);
                          }}
                          isGenerating={createMutation.isPending}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Veo 3.1 Sub-tab */}
                  <TabsContent value="veo" className="space-y-4 mt-4">
                    <Card>
                      <CardContent className="space-y-4 pt-0">
                        <Veo3Tab
                          models={models}
                          credits={credits as any}
                          prompt={prompt}
                          setPrompt={setPrompt}
                          selectedModel={veoModel}
                          setSelectedModel={(value) => {
                            setVeoModel(value);
                            setSelectedModel(value);
                          }}
                          onGenerate={(params) => {
                            createMutation.mutate(params);
                          }}
                          isGenerating={createMutation.isPending}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Seedance Sub-tab */}
                  <TabsContent value="seedance" className="space-y-4 mt-4">
                    <Card>
                      <CardContent className="space-y-4 pt-0">
                        <SeedanceTab
                          models={seedanceModels as any}
                          selectedModel={seedanceModels.find(m => m.id === seedanceModel) as any}
                          onModelChange={(value) => {
                            setSeedanceModel(value);
                            setSelectedModel(value);
                          }}
                          onGenerate={(params) => {
                            createMutation.mutate(params);
                          }}
                          isGenerating={createMutation.isPending}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Kling 2.1 Sub-tab */}
                  <TabsContent value="kling" className="space-y-4 mt-4">
                    <Card>
                      <CardContent className="space-y-4 pt-0">
                        <KlingTab
                          models={models}
                          credits={credits as any}
                          prompt={prompt}
                          setPrompt={setPrompt}
                          selectedModel={klingModel}
                          setSelectedModel={(value) => {
                            setKlingModel(value);
                            setSelectedModel(value);
                          }}
                          onGenerate={(params) => {
                            createMutation.mutate(params);
                          }}
                          isGenerating={createMutation.isPending}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            )}


            </div>

          {/* Results */}
          <div className="flex-1 space-y-4">
            {/* Header with View Size Controls */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold">Your Generations</h2>
                {generations.length > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {generations.length} total
                  </span>
                )}
              </div>
              
              {generations.length > 0 && (
                <div className="flex items-center gap-4">
                  {/* View Mode Toggle */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Mode:</span>
                    <Button
                      variant={viewMode === "grid" ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setViewMode("grid");
                        localStorage.setItem("studio-viewMode", "grid");
                      }}
                      className="h-8 px-3"
                    >
                      <Grid3x3 className="h-4 w-4 mr-1" />
                      Grid
                    </Button>
                    <Button
                      variant={viewMode === "card" ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setViewMode("card");
                        localStorage.setItem("studio-viewMode", "card");
                      }}
                      className="h-8 px-3"
                    >
                      <LayoutList className="h-4 w-4 mr-1" />
                      Card
                    </Button>
                  </div>

                  {/* Density Controls */}
                  <div className="flex items-center gap-2 border-l pl-4">
                    <span className="text-sm text-muted-foreground">Density:</span>
                    <Button
                      variant={viewSize === "compact" ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setViewSize("compact");
                        localStorage.setItem("studio-viewSize", "compact");
                      }}
                      className="h-8 px-3"
                    >
                      Compact
                    </Button>
                    <Button
                      variant={viewSize === "comfortable" ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setViewSize("comfortable");
                        localStorage.setItem("studio-viewSize", "comfortable");
                      }}
                      className="h-8 px-3"
                    >
                      Comfortable
                    </Button>
                    <Button
                      variant={viewSize === "spacious" ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setViewSize("spacious");
                        localStorage.setItem("studio-viewSize", "spacious");
                      }}
                      className="h-8 px-3"
                    >
                      Spacious
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {generations.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <Sparkles className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-lg font-medium mb-2">No generations yet</p>
                  <p className="text-muted-foreground">
                    Create your first AI-generated image or video
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Conditional View: Grid or Card */}
                {viewMode === "grid" ? (
                  /* Grid View - Clean Minimal */
                  <div
                    className={`grid gap-${viewSize === "compact" ? "2" : viewSize === "comfortable" ? "3" : "4"} ${
                      viewSize === "compact"
                        ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7"
                        : viewSize === "comfortable"
                        ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
                        : "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                    }`}
                  >
                    {[...generations]
                      .sort((a, b) => {
                        const dateA = new Date(a.createdAt || 0).getTime();
                        const dateB = new Date(b.createdAt || 0).getTime();
                        return dateB - dateA;
                      })
                      .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                      .map((gen) => {
                        const model = models.find((m) => m.id === gen.modelId) || models.find((m) => m.modelId === gen.modelId);
                        const isImage = model?.type === "image";
                        let urls: string[] = [];
                        
                        if (gen.status === "completed" && (gen.resultUrl || gen.resultUrls)) {
                          if (gen.resultUrls) {
                            try {
                              urls = JSON.parse(gen.resultUrls);
                            } catch (e) {
                              urls = gen.resultUrl ? [gen.resultUrl] : [];
                            }
                          } else if (gen.resultUrl) {
                            urls = [gen.resultUrl];
                          }
                        }

                        const firstUrl = urls[0] || gen.thumbnailUrl;
                        // Use square aspect ratio for grid
                        const paddingBottom = "100%";

                        return (
                          <div
                            key={gen.id}
                            className="group relative overflow-hidden rounded-lg bg-muted cursor-pointer transition-transform duration-300 hover:scale-105 hover:z-10 aspect-square"
                            onClick={() => {
                              if (gen.status === "completed") {
                                setSelectedGeneration(gen);
                                setDetailModalOpen(true);
                              }
                            }}
                          >
                            {gen.status === "completed" && firstUrl ? (
                              <>
                                {isImage && urls.length > 1 ? (
                                  /* Multi-Image Grid Display */
                                  <div className="absolute inset-0 w-full h-full">
                                    {urls.length === 2 ? (
                                      /* 2 images - horizontal split */
                                      <div className="grid grid-cols-2 gap-0.5 h-full">
                                        {urls.slice(0, 2).map((url, idx) => (
                                          <div key={idx} className="h-full">
                                            <img
                                              src={url}
                                              alt={gen.prompt}
                                              className="w-full h-full object-cover"
                                            />
                                          </div>
                                        ))}
                                      </div>
                                    ) : urls.length === 3 ? (
                                      /* 3 images - 1 large + 2 small */
                                      <div className="grid grid-cols-2 grid-rows-2 gap-0.5 h-full">
                                        <div className="col-span-1 row-span-2">
                                          <img
                                            src={urls[0]}
                                            alt={gen.prompt}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                        <div className="col-span-1 row-span-1">
                                          <img
                                            src={urls[1]}
                                            alt={gen.prompt}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                        <div className="col-span-1 row-span-1">
                                          <img
                                            src={urls[2]}
                                            alt={gen.prompt}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                      </div>
                                    ) : (
                                      /* 4+ images - 2x2 grid */
                                      <div className="grid grid-cols-2 grid-rows-2 gap-0.5 h-full">
                                        {urls.slice(0, 4).map((url, idx) => (
                                          <div key={idx} className="h-full">
                                            <img
                                              src={url}
                                              alt={gen.prompt}
                                              className="w-full h-full object-cover"
                                            />
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    {/* Show +N indicator if more than 4 images */}
                                    {urls.length > 4 && (
                                      <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded-full font-medium">
                                        +{urls.length - 4}
                                      </div>
                                    )}
                                  </div>
                                ) : isImage ? (
                                  /* Single Image */
                                  <img
                                    src={firstUrl}
                                    alt={gen.prompt}
                                    className="absolute inset-0 w-full h-full object-cover"
                                  />
                                ) : (
                                  /* Video with Autoplay on Hover */
                                  <>
                                    <video
                                      src={firstUrl}
                                      className="absolute inset-0 w-full h-full object-cover"
                                      muted
                                      loop
                                      playsInline
                                      poster={gen.thumbnailUrl || undefined}
                                      onMouseEnter={(e) => e.currentTarget.play()}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.pause();
                                        e.currentTarget.currentTime = 0;
                                      }}
                                    />
                                    {/* Video Icon Indicator - Hide on Hover */}
                                    <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm p-1.5 rounded-full group-hover:opacity-0 transition-opacity duration-200">
                                      <Play className="h-3.5 w-3.5 text-white fill-white" />
                                    </div>
                                  </>
                                )}
                              </>
                            ) : gen.status === "processing" || gen.status === "pending" ? (
                              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                              </div>
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                                <p className="text-sm text-muted-foreground">Failed</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  /* Card View with Modal */
                  <div
                    className={`grid gap-4 ${
                      viewSize === "compact"
                        ? "grid-cols-[repeat(auto-fill,minmax(200px,1fr))]"
                        : viewSize === "comfortable"
                        ? "grid-cols-[repeat(auto-fill,minmax(300px,1fr))]"
                        : "grid-cols-[repeat(auto-fill,minmax(450px,1fr))]"
                    }`}
                  >
                  {[...generations]
                    .sort((a, b) => {
                      const dateA = new Date(a.createdAt || 0).getTime();
                      const dateB = new Date(b.createdAt || 0).getTime();
                      return dateB - dateA; // Newest first
                    })
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map((gen) => {
                      // Support both id and modelId lookup (backward compatibility)
                      const model = models.find((m) => m.id === gen.modelId) || models.find((m) => m.modelId === gen.modelId);
                      const isImage = model?.type === "image";

                      return (
                        <Card key={gen.id} className={`overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:z-10 cursor-pointer ${
                          viewSize === "compact" ? "mb-3" : viewSize === "comfortable" ? "mb-4" : "mb-6"
                        }`} onClick={() => {
                          setSelectedGeneration(gen);
                          setDetailModalOpen(true);
                        }}>
                          <CardContent className="p-0">
                            {/* Result Display */}
                            {gen.status === "completed" && (gen.resultUrl || gen.resultUrls) && (
                              <div className="relative group">
                                {/* Video Icon Indicator */}
                                {!isImage && (
                                  <div className="absolute top-2 right-2 z-10 bg-black/60 backdrop-blur-sm rounded-full p-2 group-hover:opacity-0 transition-opacity duration-300">
                                    <Play className="h-4 w-4 text-white" fill="white" />
                                  </div>
                                )}
                                {isImage ? (
                                  (() => {
                                    // Use resultUrls if available (batch generation), otherwise fallback to resultUrl
                                    let urls: string[] = [];
                                    if (gen.resultUrls) {
                                      try {
                                        urls = JSON.parse(gen.resultUrls);
                                      } catch (e) {
                                        console.error('Failed to parse resultUrls:', e);
                                        urls = gen.resultUrl ? [gen.resultUrl] : [];
                                      }
                                    } else if (gen.resultUrl) {
                                      urls = [gen.resultUrl];
                                    }

                                    // Multiple images - display in grid
                                    if (urls.length > 1) {
                                      return (
                                        <div className={`grid gap-2 p-2 ${urls.length === 2 ? 'grid-cols-2' : urls.length === 3 ? 'grid-cols-2' : 'grid-cols-2'}`}>
                                          {urls.map((url: string, idx: number) => (
                                            <div key={idx} className="relative group/img">
                                              <img
                                                src={url}
                                                alt={`${gen.prompt} - ${idx + 1}`}
                                                className="w-full h-auto rounded-lg object-cover"
                                              />

                                            </div>
                                          ))}
                                        </div>
                                      );
                                    }

                                    // Single image - display normally
                                    return (
                                      <>
                                        <img
                                          src={urls[0]}
                                          alt={gen.prompt}
                                          className="w-full object-cover"
                                          style={{
                                            aspectRatio: viewSize === "compact" ? "1/1" : "auto"
                                          }}
                                        />

                                      </>
                                    );
                                  })()
                                ) : (
                                  <video
                                    src={gen.resultUrl || undefined}
                                    controls
                                    className="w-full h-auto"
                                  />
                                )}
                              </div>
                            )}

                            {/* Processing State */}
                            {gen.status === "processing" && (
                              <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
                                <div className="text-center space-y-3">
                                  <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                                  <p className="text-sm font-medium">Generating...</p>
                                  <p className="text-xs text-muted-foreground">This may take a few minutes</p>
                                </div>
                              </div>
                            )}

                            {/* Pending State */}
                            {gen.status === "pending" && (
                              <div className="aspect-square bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
                                <div className="text-center space-y-3">
                                  <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-600" />
                                  <p className="text-sm font-medium">In Queue...</p>
                                </div>
                              </div>
                            )}

                            {/* Failed State */}
                            {gen.status === "failed" && (
                              <div className="aspect-square bg-gradient-to-br from-red-50 to-red-100 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
                                <div className="text-center space-y-2 p-4">
                                  <p className="text-sm font-medium text-red-800 dark:text-red-400">Generation Failed</p>
                                  {gen.errorMessage && (
                                    <p className="text-xs text-red-600 dark:text-red-300">{gen.errorMessage}</p>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Info Section */}
                            <div className={`space-y-3 ${
                              viewSize === "compact" ? "p-3" : viewSize === "comfortable" ? "p-4" : "p-5"
                            }`}>
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className={`font-semibold mb-1 line-clamp-2 ${
                                    viewSize === "compact" ? "text-xs" : "text-sm"
                                  }`}>{gen.prompt}</p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <span className={`px-2 py-0.5 rounded-full font-medium bg-primary/10 dark:bg-black text-primary dark:text-white ${
                                      viewSize === "compact" ? "text-[10px]" : "text-xs"
                                    }`}>
                                      {model?.name}
                                    </span>
                                  </div>
                                </div>
                                <div className={`px-2 py-1 rounded font-medium whitespace-nowrap ${
                                  viewSize === "compact" ? "text-[10px]" : "text-xs"
                                } ${
                                  gen.status === "completed" ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400" :
                                  gen.status === "failed" ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400" :
                                  gen.status === "processing" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400" :
                                  "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300"
                                }`}>
                                  {gen.status}
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center justify-between pt-2 border-t">
                                <div className={`flex items-center gap-3 text-muted-foreground ${
                                  viewSize === "compact" ? "text-[10px]" : "text-xs"
                                }`}>
                                  <span className="flex items-center gap-1">
                                    <Coins className="h-3 w-3" />
                                    {formatCredits(gen.creditsUsed)}
                                  </span>
                                  <span>
                                    {gen.completedAt ? (
                                      <>
                                        {new Date(gen.completedAt).toLocaleDateString()}{' '}
                                        {new Date(gen.completedAt).toLocaleTimeString()}
                                        {gen.createdAt && (() => {
                                          const start = new Date(gen.createdAt).getTime();
                                          const end = new Date(gen.completedAt).getTime();
                                          const duration = Math.floor((end - start) / 1000); // seconds
                                          const minutes = Math.floor(duration / 60);
                                          const seconds = duration % 60;
                                          return ` (${minutes > 0 ? `${minutes}m ` : ''}${seconds}s)`;
                                        })()}
                                      </>
                                    ) : gen.createdAt ? (
                                      new Date(gen.createdAt).toLocaleDateString()
                                    ) : ''}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1">
                                  {(gen.status === "completed" || gen.status === "failed") && (
                                    <>
                                      {/* Get 1080P button for Veo 3.1 videos */}
                                      {gen.status === "completed" && (gen.modelId === "veo3" || gen.modelId === "veo3-fast") && gen.taskId && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 text-xs"
                                          onClick={() => {
                                            toast.info("Fetching 1080P version...");
                                            get1080pMutation.mutate({ taskId: gen.taskId! });
                                          }}
                                          disabled={get1080pMutation.isPending}
                                        >
                                          {get1080pMutation.isPending ? "Loading..." : "1080P"}
                                        </Button>
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => handleCopyPrompt(gen.prompt)}
                                      >
                                        <Copy className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={async () => {
                                          // Load prompt
                                          setPrompt(gen.prompt);
                                          
                                          // Debug: Check model selection and parameters
                                          console.log('[Reuse] Generation:', gen);
                                          console.log('[Reuse] Parameters:', gen.parameters);
                                          const foundModel = models.find(m => m.id === gen.modelId);
                                          console.log('[Reuse] Found model:', foundModel);
                                          
                                          // Map edit models back to base models for dropdown selection
                                          // Edit models are used automatically when images are uploaded
                                          let displayModelId = gen.modelId;
                                          console.log('[Reuse] Original modelId:', gen.modelId);
                                          console.log('[Reuse] Found model:', foundModel);
                                          if (foundModel?.name) {
                                            console.log('[Reuse] Found model.name:', foundModel.name);
                                            // Remove " Edit" suffix from model name to get base model name
                                            // e.g., "Seedream V4 Edit" -> "Seedream V4"
                                            const baseName = foundModel.name.replace(/ Edit$/, '');
                                            console.log('[Reuse] Base name after replace:', baseName);
                                            // Find the base model by name
                                            const baseModel = models.find(m => m.name === baseName && m.type === foundModel.type);
                                            console.log('[Reuse] Found base model:', baseModel);
                                            if (baseModel) {
                                              displayModelId = baseModel.id;
                                              console.log('[Reuse] Mapped edit model to base model:', foundModel.name, '->', baseName, '(', displayModelId, ')');
                                            } else {
                                              console.log('[Reuse] Base model not found, using original modelId');
                                            }
                                          }
                                          console.log('[Reuse] Final displayModelId:', displayModelId);
                                          
                                          // Switch to correct tab and set the tab-specific model state
                                          if (gen.type === 'image') {
                                            setCurrentTab('image');
                                            setImageModel(displayModelId); // Use mapped base model for dropdown
                                          } else if (gen.type === 'video') {
                                            // Determine which video tab based on model
                                            const model = models.find(m => m.id === gen.modelId);
                                            if (model?.modelId?.startsWith('sora')) {
                                              setCurrentTab('video');
                                              setVideoSubTab('sora2');
                                              // Map Sora 2 variants back to base model for dropdown
                                              // sora-2-image-to-video -> sora-2, sora-2-pro-image-to-video -> sora-2-pro
                                              let targetDatabaseId = gen.modelId;
                                              if (gen.modelId === 'sora-2-image-to-video') {
                                                targetDatabaseId = 'sora-2';
                                              } else if (gen.modelId === 'sora-2-pro-image-to-video') {
                                                targetDatabaseId = 'sora-2-pro';
                                              }
                                              // Use the target database ID directly (no need to find model)
                                              setSora2Model(targetDatabaseId);
                                            } else if (model?.modelId?.startsWith('veo')) {
                                              setCurrentTab('video');
                                              setVideoSubTab('veo');
                                              setVeoModel(gen.modelId);
                                            } else if (model?.modelId?.startsWith('bytedance/v1')) {
                                              setCurrentTab('video');
                                              setVideoSubTab('seedance');
                                              setSeedanceModel(gen.modelId);
                                            } else if (model?.modelId?.startsWith('kling/v2-1')) {
                                              setCurrentTab('video');
                                              setVideoSubTab('kling');
                                              setKlingModel(gen.modelId);
                                            }
                                          }
                                          
                                          // Load parameters if available
                                          if (gen.parameters) {
                                            try {
                                              const params = JSON.parse(gen.parameters);
                                              
                                              // Image parameters
                                              if (params.aspectRatio) setAspectRatio(params.aspectRatio);
                                              if (params.imageResolution) setImageResolution(params.imageResolution);
                                              if (params.outputFormat) setOutputFormat(params.outputFormat);
                                              if (params.maxImages) setMaxImages(params.maxImages);
                                              if (params.renderingSpeed) setRenderingSpeed(params.renderingSpeed);
                                              if (params.style) setStyle(params.style);
                                              if (params.expandPrompt !== undefined) setExpandPrompt(params.expandPrompt);
                                              if (params.numImages) setNumImages(params.numImages);
                                              if (params.strength !== undefined) setStrength(params.strength);
                                              if (params.negativePrompt) setNegativePrompt(params.negativePrompt);
                                              
                                              // Video parameters (add when video tab has state variables)
                                              
                                              // Reuse URLs directly from S3 storage (no need to download + re-upload)
                                              // This saves bandwidth and is much faster
                                              
                                              // Load imageUrl (for Character Remix, single image)
                                              if (params.imageUrl) {
                                                console.log('[Reuse] Setting imageUrl:', params.imageUrl);
                                                setImageUrl(params.imageUrl);
                                                setImageUploadFiles([]); // Clear files since we're using URL
                                              }
                                              
                                              // Load imageUrls (for image editing models like Seedream V4 Edit)
                                              console.log('[Reuse] Checking params.imageUrls:', params.imageUrls);
                                              if (params.imageUrls && params.imageUrls.length > 0) {
                                                console.log('[Reuse] Setting imageUrl from imageUrls[0]:', params.imageUrls[0]);
                                                // For editing models, imageUrls should be loaded into the appropriate upload field
                                                // This depends on the model - for Seedream V4 Edit, it uses imageUrls
                                                setImageUrl(params.imageUrls[0]); // Use first image
                                                setImageUploadFiles([]); // Clear files since we're using URL
                                                console.log('[Reuse] imageUrl should now be:', params.imageUrls[0]);
                                              } else {
                                                console.log('[Reuse] No imageUrls found in parameters');
                                              }
                                              
                                              // Load character reference URLs directly
                                              console.log('[Reuse] referenceImageUrls from params:', params.referenceImageUrls);
                                              if (params.referenceImageUrls && params.referenceImageUrls.length > 0) {
                                                console.log('[Reuse] Setting referenceImageUrls:', params.referenceImageUrls);
                                                setReferenceImageUrls(params.referenceImageUrls);
                                                setReferenceImageFiles([]); // Clear files since we're using URLs
                                              } else {
                                                console.log('[Reuse] No referenceImageUrls found in parameters');
                                              }
                                              
                                              // Load style reference URLs directly
                                              if (params.styleImageUrls && params.styleImageUrls.length > 0) {
                                                setStyleImageUrls(params.styleImageUrls);
                                                setStyleImageFiles([]); // Clear files since we're using URLs
                                              }
                                              
                                              toast.success("Prompt, settings, and reference images loaded!");
                                            } catch (e) {
                                              console.error('Failed to parse parameters:', e);
                                              toast.success("Prompt loaded");
                                            }
                                          } else {
                                            toast.success("Prompt loaded");
                                          }
                                        }}
                                      >
                                        <RefreshCw className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => deleteMutation.mutate({ id: gen.id })}
                                    disabled={deleteMutation.isPending}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
                )}

                {/* Pagination */}
                {generations.length > itemsPerPage && (
                  <div className="flex items-center justify-center gap-2 pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-2">
                      {Array.from({ length: Math.ceil(generations.length / itemsPerPage) }, (_, i) => i + 1)
                        .filter(page => {
                          const totalPages = Math.ceil(generations.length / itemsPerPage);
                          if (totalPages <= 7) return true;
                          if (page === 1 || page === totalPages) return true;
                          if (page >= currentPage - 1 && page <= currentPage + 1) return true;
                          return false;
                        })
                        .map((page, index, array) => {
                          const showEllipsis = index > 0 && page - array[index - 1] > 1;
                          return (
                            <div key={page} className="flex items-center gap-2">
                              {showEllipsis && <span className="text-muted-foreground">...</span>}
                              <Button
                                variant={currentPage === page ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage(page)}
                                className="h-8 w-8 p-0"
                              >
                                {page}
                              </Button>
                            </div>
                          );
                        })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(Math.ceil(generations.length / itemsPerPage), p + 1))}
                      disabled={currentPage >= Math.ceil(generations.length / itemsPerPage)}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

        {/* Image Viewer */}
        <ImageViewer
          src={viewerImage.src}
          alt={viewerImage.alt}
          open={viewerOpen}
          onOpenChange={setViewerOpen}
        />

        {/* Generation Detail Modal */}
        <GenerationDetailModal
          generation={selectedGeneration}
          model={selectedGeneration ? models.find((m) => m.id === selectedGeneration.modelId) || models.find((m) => m.modelId === selectedGeneration.modelId) || null : null}
          open={detailModalOpen}
          onOpenChange={setDetailModalOpen}
          onRegenerate={() => {
            if (selectedGeneration) {
              setPrompt(selectedGeneration.prompt);
              // Try to get negativePrompt from parameters JSON
              if (selectedGeneration.parameters) {
                try {
                  const params = JSON.parse(selectedGeneration.parameters);
                  if (params.negativePrompt) {
                    setNegativePrompt(params.negativePrompt);
                  }
                } catch (e) {
                  // Ignore parse error
                }
              }
              setDetailModalOpen(false);
              toast.success("Prompt loaded. Adjust settings and generate again.");
            }
          }}
          onDelete={() => {
            toast.info("Delete functionality coming soon");
          }}
        />
        
        {/* Top-up Modal */}
        <TopupModal open={topupModalOpen} onOpenChange={setTopupModalOpen} />
        
        {/* Verify Code Modal */}
        <VerifyCodeModal open={verifyCodeModalOpen} onOpenChange={setVerifyCodeModalOpen} />
      </div>
    </div>
  );
}

// Wrapper component to handle mobile/desktop routing
export default function Studio() {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return <MobileStudio />;
  }
  
  return <DesktopStudio />;
}


import { useAuth } from "@/_core/hooks/useAuth";
import { useIsMobile } from "@/hooks/useMediaQuery";
import MobileGallery from "./mobile/MobileGallery";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Coins, Image as ImageIcon, Video, Download, Trash2, Loader2, Sparkles, Lock, CreditCard } from "lucide-react";
import { Link } from "wouter";
import { UserMenu } from "@/components/UserMenu";
import { Logo, LogoImage } from "@/components/Logo";
import { useSidebar } from "@/contexts/SidebarContext";
import { TopupModal } from "@/components/TopupModal";
import { VerifyCodeModal } from "@/components/VerifyCodeModal";
import { toast } from "sonner";
// @ts-ignore - no types available
import Masonry from "react-masonry-css";
import { ChevronLeft, ChevronRight, Grid3x3, LayoutGrid, LayoutList } from "lucide-react";
import { useState } from "react";
import { VideoPlayer } from "@/components/VideoPlayer";

// Helper function to format credits (remove .0 if whole number)
const formatCredits = (value: number | string): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  return num % 1 === 0 ? num.toString() : num.toFixed(1);
};

function DesktopGallery() {
  const { user, isAuthenticated } = useAuth();
  const { isCollapsed } = useSidebar(); // Move to top before any early returns
  const [viewSize, setViewSize] = useState<"compact" | "comfortable" | "spacious">("comfortable");
  const [currentPage, setCurrentPage] = useState(1);
  const [topupModalOpen, setTopupModalOpen] = useState(false);
  const [verifyCodeModalOpen, setVerifyCodeModalOpen] = useState(false);
  // View-based pagination: Spacious (10), Comfortable (15), Compact (25)
  const itemsPerPage = viewSize === "spacious" ? 10 : viewSize === "comfortable" ? 15 : 25;

  const { data: credits = 0 } = trpc.credits.get.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: models = [] } = trpc.models.list.useQuery();
  const { data: generations = [] } = trpc.generations.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const utils = trpc.useUtils();

  const deleteMutation = trpc.generations.delete.useMutation({
    onSuccess: () => {
      toast.success("Deleted successfully");
      utils.generations.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const get1080pMutation = trpc.generations.get1080p.useMutation({
    onSuccess: (data) => {
      // Open 1080p video in new tab
      window.open(data.url, '_blank');
      toast.success("Opening 1080P video...");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to get 1080P video");
    },
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <p className="mb-4">Please sign in to view your gallery</p>
            <Button asChild>
              <a href={getLoginUrl()}>Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completedGenerations = generations.filter((g) => g.status === "completed" && g.resultUrl);
  const imageGenerations = completedGenerations.filter((g) => {
    const model = models.find((m) => m.id === g.modelId);
    return model?.type === "image";
  });
  const videoGenerations = completedGenerations.filter((g) => {
    const model = models.find((m) => m.id === g.modelId);
    return model?.type === "video";
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="px-4 h-16 flex items-center justify-between">
          <div className="flex-1">
            {isCollapsed && <LogoImage className="h-8 w-auto" />}
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

            {(user?.role === "admin" || user?.role === "sale") && (
              <Link href="/admin">
                <Button variant="outline" size="sm">Admin</Button>
              </Link>
            )}

            <UserMenu />
          </div>
        </div>
      </header>

      <main className="flex-1 container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Gallery</h1>
          <p className="text-muted-foreground">
            View all your completed AI generations
          </p>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="all">All ({completedGenerations.length})</TabsTrigger>
            <TabsTrigger value="images">
              <ImageIcon className="h-4 w-4 mr-2" />
              Images ({imageGenerations.length})
            </TabsTrigger>
            <TabsTrigger value="videos">
              <Video className="h-4 w-4 mr-2" />
              Videos ({videoGenerations.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            {completedGenerations.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <p>No completed generations yet</p>
                  <Button asChild className="mt-4">
                    <Link href="/studio">Create Something</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* View Size Controls */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {Math.min((currentPage - 1) * itemsPerPage + 1, completedGenerations.length)}-{Math.min(currentPage * itemsPerPage, completedGenerations.length)} of {completedGenerations.length}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground mr-2">View:</span>
                    <Button
                      variant={viewSize === "compact" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewSize("compact")}
                      className="h-8 px-3"
                    >
                      <Grid3x3 className="h-4 w-4 mr-1" />
                      Compact
                    </Button>
                    <Button
                      variant={viewSize === "comfortable" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewSize("comfortable")}
                      className="h-8 px-3"
                    >
                      <LayoutGrid className="h-4 w-4 mr-1" />
                      Comfortable
                    </Button>
                    <Button
                      variant={viewSize === "spacious" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewSize("spacious")}
                      className="h-8 px-3"
                    >
                      <LayoutList className="h-4 w-4 mr-1" />
                      Spacious
                    </Button>
                  </div>
                </div>

                {/* Masonry Grid */}
                <Masonry
                  breakpointCols={{
                    default: viewSize === "compact" ? 4 : viewSize === "comfortable" ? 3 : 2,
                    1536: viewSize === "compact" ? 3 : viewSize === "comfortable" ? 2 : 1,
                    1024: viewSize === "compact" ? 2 : 1,
                    640: 1
                  }}
                  className="flex -ml-4 w-auto"
                  columnClassName="pl-4 bg-clip-padding"
                >
                  {[...completedGenerations]
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
                        <Card key={gen.id} className={`overflow-hidden hover:shadow-lg transition-shadow ${
                          viewSize === "compact" ? "mb-3" : viewSize === "comfortable" ? "mb-4" : "mb-6"
                        }`}>
                          <CardContent className="p-0">
                            {(() => {
                              // Parse resultUrls array for batch generations
                              let mediaUrls: string[] = [];
                              try {
                                if (gen.resultUrls) {
                                  mediaUrls = JSON.parse(gen.resultUrls);
                                }
                              } catch (e) {
                                console.error('Failed to parse resultUrls:', e);
                              }
                              
                              // Fallback to single resultUrl if no resultUrls array
                              if (mediaUrls.length === 0 && gen.resultUrl) {
                                mediaUrls = [gen.resultUrl];
                              }
                              
                              // Display multiple media items in grid if batch generation
                              if (mediaUrls.length > 1) {
                                return (
                                  <div className="grid grid-cols-2 gap-2 p-2">
                                    {mediaUrls.map((url, idx) => (
                                      <div key={idx} className="relative group">
                                        {isImage ? (
                                          <img
                                            src={url}
                                            alt={`${gen.prompt} - ${idx + 1}`}
                                            className="w-full h-auto object-contain rounded"
                                          />
                                        ) : (
                                          <VideoPlayer
                                            src={url}
                                            thumbnailUrl={gen.thumbnailUrl}
                                            prompt={gen.prompt}
                                            className="rounded"
                                          />
                                        )}
                                        <div className="absolute top-2 right-2 z-10">
                                          <Button size="icon" variant="secondary" asChild>
                                            <a href={url} download target="_blank" rel="noopener noreferrer">
                                              <Download className="h-4 w-4" />
                                            </a>
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                );
                              } else {
                                // Single media display
                                return (
                                  <div className="relative group">
                                    {isImage ? (
                                      <img
                                        src={mediaUrls[0] || gen.resultUrl!}
                                        alt={gen.prompt}
                                        className="w-full h-auto object-contain"
                                      />
                                    ) : (
                                      <VideoPlayer
                                        src={mediaUrls[0] || gen.resultUrl!}
                                        thumbnailUrl={gen.thumbnailUrl}
                                        prompt={gen.prompt}
                                      />
                                    )}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
                                      <div className="pointer-events-auto flex gap-2">
                                        <Button size="icon" variant="secondary" asChild>
                                          <a href={mediaUrls[0] || gen.resultUrl!} download target="_blank" rel="noopener noreferrer">
                                            <Download className="h-4 w-4" />
                                          </a>
                                        </Button>
                                        {model?.type === "video" && model?.modelId?.startsWith('veo3') && gen.taskId && (
                                          <Button
                                            variant="default"
                                            size="sm"
                                            onClick={() => get1080pMutation.mutate({ taskId: gen.taskId! })}
                                            disabled={get1080pMutation.isPending}
                                            title="Download 1080P version"
                                          >
                                            {get1080pMutation.isPending ? (
                                              <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                              <>
                                                <Sparkles className="h-4 w-4 mr-1" />
                                                1080P
                                              </>
                                            )}
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                            })()}
                            {/* Delete button - separate from media hover */}
                            <div className="absolute top-2 right-2 z-10">
                              <Button
                                variant="destructive"
                                size="icon"
                                onClick={() => deleteMutation.mutate({ id: gen.id })}
                                disabled={deleteMutation.isPending}
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                {deleteMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>

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
                                    <span className={`px-2 py-0.5 rounded-full font-medium bg-primary/10 text-primary ${
                                      viewSize === "compact" ? "text-[10px]" : "text-xs"
                                    }`}>
                                      {model?.name}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Date and Credits */}
                              <div className={`flex items-center justify-between pt-2 border-t text-muted-foreground ${
                                viewSize === "compact" ? "text-[10px]" : "text-xs"
                              }`}>
                                <span className="flex items-center gap-1">
                                  <Coins className="h-3 w-3" />
                                  {formatCredits(gen.creditsUsed)}
                                </span>
                                <span>{gen.createdAt ? new Date(gen.createdAt).toLocaleDateString() : ''}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </Masonry>

                {/* Pagination */}
                {completedGenerations.length > itemsPerPage && (
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
                      {Array.from({ length: Math.ceil(completedGenerations.length / itemsPerPage) }, (_, i) => i + 1)
                        .filter(page => {
                          const totalPages = Math.ceil(completedGenerations.length / itemsPerPage);
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
                      onClick={() => setCurrentPage(p => Math.min(Math.ceil(completedGenerations.length / itemsPerPage), p + 1))}
                      disabled={currentPage >= Math.ceil(completedGenerations.length / itemsPerPage)}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="images" className="mt-6">
            {imageGenerations.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <p>No image generations yet</p>
                  <Button asChild className="mt-4">
                    <Link href="/studio">Create Images</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* View Size Controls for Images */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {Math.min((currentPage - 1) * itemsPerPage + 1, imageGenerations.length)}-{Math.min(currentPage * itemsPerPage, imageGenerations.length)} of {imageGenerations.length}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground mr-2">View:</span>
                    <Button
                      variant={viewSize === "compact" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewSize("compact")}
                      className="h-8 px-3"
                    >
                      <Grid3x3 className="h-4 w-4 mr-1" />
                      Compact
                    </Button>
                    <Button
                      variant={viewSize === "comfortable" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewSize("comfortable")}
                      className="h-8 px-3"
                    >
                      <LayoutGrid className="h-4 w-4 mr-1" />
                      Comfortable
                    </Button>
                    <Button
                      variant={viewSize === "spacious" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewSize("spacious")}
                      className="h-8 px-3"
                    >
                      <LayoutList className="h-4 w-4 mr-1" />
                      Spacious
                    </Button>
                  </div>
                </div>

                {/* Masonry Grid for Images */}
                <Masonry
                  breakpointCols={{
                    default: viewSize === "compact" ? 4 : viewSize === "comfortable" ? 3 : 2,
                    1536: viewSize === "compact" ? 3 : viewSize === "comfortable" ? 2 : 1,
                    1024: viewSize === "compact" ? 2 : 1,
                    640: 1
                  }}
                  className="flex -ml-4 w-auto"
                  columnClassName="pl-4 bg-clip-padding"
                >
                  {[...imageGenerations]
                    .sort((a, b) => {
                      const dateA = new Date(a.createdAt || 0).getTime();
                      const dateB = new Date(b.createdAt || 0).getTime();
                      return dateB - dateA;
                    })
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map((gen) => {
                      // Support both id and modelId lookup (backward compatibility)
                      const model = models.find((m) => m.id === gen.modelId) || models.find((m) => m.modelId === gen.modelId);
                      return (
                        <Card key={gen.id} className={`overflow-hidden hover:shadow-lg transition-shadow ${
                          viewSize === "compact" ? "mb-3" : viewSize === "comfortable" ? "mb-4" : "mb-6"
                        }`}>
                          <CardContent className="p-0">
                            {(() => {
                              // Parse resultUrls array for batch generations
                              let imageUrls: string[] = [];
                              try {
                                if (gen.resultUrls) {
                                  imageUrls = JSON.parse(gen.resultUrls);
                                }
                              } catch (e) {
                                console.error('Failed to parse resultUrls:', e);
                              }
                              
                              // Fallback to single resultUrl if no resultUrls array
                              if (imageUrls.length === 0 && gen.resultUrl) {
                                imageUrls = [gen.resultUrl];
                              }
                              
                              // Display multiple images in grid if batch generation
                              if (imageUrls.length > 1) {
                                return (
                                  <div className="grid grid-cols-2 gap-2 p-2">
                                    {imageUrls.map((url, idx) => (
                                      <div key={idx} className="relative group">
                                        <img
                                          src={url}
                                          alt={`${gen.prompt} - ${idx + 1}`}
                                          className="w-full h-auto object-contain rounded"
                                        />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                          <Button size="icon" variant="secondary" asChild>
                                            <a href={url} download target="_blank" rel="noopener noreferrer">
                                              <Download className="h-4 w-4" />
                                            </a>
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                );
                              } else {
                                // Single image display
                                return (
                                  <div className="relative group">
                                    <img
                                      src={imageUrls[0] || gen.resultUrl!}
                                      alt={gen.prompt}
                                      className="w-full h-auto object-contain"
                                    />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                      <Button size="icon" variant="secondary" asChild>
                                        <a href={imageUrls[0] || gen.resultUrl!} download target="_blank" rel="noopener noreferrer">
                                          <Download className="h-4 w-4" />
                                        </a>
                                      </Button>
                                    </div>
                                  </div>
                                );
                              }
                            })()}
                            {/* Delete button - separate from image hover */}
                            <div className="absolute top-2 right-2 z-10">
                              <Button
                                variant="destructive"
                                size="icon"
                                onClick={() => deleteMutation.mutate({ id: gen.id })}
                                disabled={deleteMutation.isPending}
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                {deleteMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                            <div className={`space-y-3 ${
                              viewSize === "compact" ? "p-3" : viewSize === "comfortable" ? "p-4" : "p-5"
                            }`}>
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className={`font-semibold mb-1 line-clamp-2 ${
                                    viewSize === "compact" ? "text-xs" : "text-sm"
                                  }`}>{gen.prompt}</p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <span className={`px-2 py-0.5 rounded-full font-medium bg-primary/10 text-primary ${
                                      viewSize === "compact" ? "text-[10px]" : "text-xs"
                                    }`}>
                                      {model?.name}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className={`flex items-center justify-between pt-2 border-t text-muted-foreground ${
                                viewSize === "compact" ? "text-[10px]" : "text-xs"
                              }`}>
                                <span className="flex items-center gap-1">
                                  <Coins className="h-3 w-3" />
                                  {formatCredits(gen.creditsUsed)}
                                </span>
                                <span>{gen.createdAt ? new Date(gen.createdAt).toLocaleDateString() : ''}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </Masonry>

                {/* Pagination for Images */}
                {imageGenerations.length > itemsPerPage && (
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
                      {Array.from({ length: Math.ceil(imageGenerations.length / itemsPerPage) }, (_, i) => i + 1)
                        .filter(page => {
                          const totalPages = Math.ceil(imageGenerations.length / itemsPerPage);
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
                      onClick={() => setCurrentPage(p => Math.min(Math.ceil(imageGenerations.length / itemsPerPage), p + 1))}
                      disabled={currentPage >= Math.ceil(imageGenerations.length / itemsPerPage)}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="videos" className="mt-6">
            {videoGenerations.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <p>No video generations yet</p>
                  <Button asChild className="mt-4">
                    <Link href="/studio">Create Videos</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* View Size Controls for Videos */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {Math.min((currentPage - 1) * itemsPerPage + 1, videoGenerations.length)}-{Math.min(currentPage * itemsPerPage, videoGenerations.length)} of {videoGenerations.length}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground mr-2">View:</span>
                    <Button
                      variant={viewSize === "compact" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewSize("compact")}
                      className="h-8 px-3"
                    >
                      <Grid3x3 className="h-4 w-4 mr-1" />
                      Compact
                    </Button>
                    <Button
                      variant={viewSize === "comfortable" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewSize("comfortable")}
                      className="h-8 px-3"
                    >
                      <LayoutGrid className="h-4 w-4 mr-1" />
                      Comfortable
                    </Button>
                    <Button
                      variant={viewSize === "spacious" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewSize("spacious")}
                      className="h-8 px-3"
                    >
                      <LayoutList className="h-4 w-4 mr-1" />
                      Spacious
                    </Button>
                  </div>
                </div>

                {/* Masonry Grid for Videos */}
                <Masonry
                  breakpointCols={{
                    default: viewSize === "compact" ? 4 : viewSize === "comfortable" ? 3 : 2,
                    1536: viewSize === "compact" ? 3 : viewSize === "comfortable" ? 2 : 1,
                    1024: viewSize === "compact" ? 2 : 1,
                    640: 1
                  }}
                  className="flex -ml-4 w-auto"
                  columnClassName="pl-4 bg-clip-padding"
                >
                  {[...videoGenerations]
                    .sort((a, b) => {
                      const dateA = new Date(a.createdAt || 0).getTime();
                      const dateB = new Date(b.createdAt || 0).getTime();
                      return dateB - dateA;
                    })
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map((gen) => {
                      // Support both id and modelId lookup (backward compatibility)
                      const model = models.find((m) => m.id === gen.modelId) || models.find((m) => m.modelId === gen.modelId);
                      return (
                        <Card key={gen.id} className={`overflow-hidden hover:shadow-lg transition-shadow ${
                          viewSize === "compact" ? "mb-3" : viewSize === "comfortable" ? "mb-4" : "mb-6"
                        }`}>
                          <CardContent className="p-0">
                            {(() => {
                              // Parse resultUrls array for batch video generations
                              let videoUrls: string[] = [];
                              try {
                                if (gen.resultUrls) {
                                  videoUrls = JSON.parse(gen.resultUrls);
                                }
                              } catch (e) {
                                console.error('Failed to parse resultUrls:', e);
                              }
                              
                              // Fallback to single resultUrl if no resultUrls array
                              if (videoUrls.length === 0 && gen.resultUrl) {
                                videoUrls = [gen.resultUrl];
                              }
                              
                              // Display multiple videos in grid if batch generation
                              if (videoUrls.length > 1) {
                                return (
                                  <div className="grid grid-cols-2 gap-2 p-2">
                                    {videoUrls.map((url, idx) => (
                                      <div key={idx} className="relative group">
                                        <VideoPlayer
                                          src={url}
                                          thumbnailUrl={gen.thumbnailUrl}
                                          prompt={gen.prompt}
                                          className="rounded"
                                        />
                                        <div className="absolute top-2 right-2 z-10">
                                          <Button size="icon" variant="secondary" asChild>
                                            <a href={url} download target="_blank" rel="noopener noreferrer">
                                              <Download className="h-4 w-4" />
                                            </a>
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                );
                              } else {
                                // Single video display
                                return (
                                  <div className="relative group">
                                    <video
                                      src={videoUrls[0] || gen.resultUrl!}
                                      poster={gen.thumbnailUrl || undefined}
                                      controls
                                      preload="metadata"
                                      className="w-full aspect-video bg-black"
                                    />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
                                      <div className="pointer-events-auto flex gap-2">
                                        <Button size="icon" variant="secondary" asChild>
                                          <a href={videoUrls[0] || gen.resultUrl!} download target="_blank" rel="noopener noreferrer">
                                            <Download className="h-4 w-4" />
                                          </a>
                                        </Button>
                                        {model?.modelId?.startsWith('veo3') && gen.taskId && (
                                          <Button
                                            variant="default"
                                            size="sm"
                                            onClick={() => get1080pMutation.mutate({ taskId: gen.taskId! })}
                                            disabled={get1080pMutation.isPending}
                                            title="Download 1080P version"
                                          >
                                            {get1080pMutation.isPending ? (
                                              <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                              <>
                                                <Sparkles className="h-4 w-4 mr-1" />
                                                1080P
                                              </>
                                            )}
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                            })()}
                            {/* Delete button - separate from video hover */}
                            <div className="absolute top-2 right-2 z-10">
                              <Button
                                variant="destructive"
                                size="icon"
                                onClick={() => deleteMutation.mutate({ id: gen.id })}
                                disabled={deleteMutation.isPending}
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                {deleteMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                            <div className={`space-y-3 ${
                              viewSize === "compact" ? "p-3" : viewSize === "comfortable" ? "p-4" : "p-5"
                            }`}>
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className={`font-semibold mb-1 line-clamp-2 ${
                                    viewSize === "compact" ? "text-xs" : "text-sm"
                                  }`}>{gen.prompt}</p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <span className={`px-2 py-0.5 rounded-full font-medium bg-primary/10 text-primary ${
                                      viewSize === "compact" ? "text-[10px]" : "text-xs"
                                    }`}>
                                      {model?.name}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className={`flex items-center justify-between pt-2 border-t text-muted-foreground ${
                                viewSize === "compact" ? "text-[10px]" : "text-xs"
                              }`}>
                                <span className="flex items-center gap-1">
                                  <Coins className="h-3 w-3" />
                                  {formatCredits(gen.creditsUsed)}
                                </span>
                                <span>{gen.createdAt ? new Date(gen.createdAt).toLocaleDateString() : ''}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </Masonry>

                {/* Pagination for Videos */}
                {videoGenerations.length > itemsPerPage && (
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
                      {Array.from({ length: Math.ceil(videoGenerations.length / itemsPerPage) }, (_, i) => i + 1)
                        .filter(page => {
                          const totalPages = Math.ceil(videoGenerations.length / itemsPerPage);
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
                      onClick={() => setCurrentPage(p => Math.min(Math.ceil(videoGenerations.length / itemsPerPage), p + 1))}
                      disabled={currentPage >= Math.ceil(videoGenerations.length / itemsPerPage)}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>


        </Tabs>
      </main>

      <TopupModal
        open={topupModalOpen}
        onOpenChange={setTopupModalOpen}
      />

      <VerifyCodeModal
        open={verifyCodeModalOpen}
        onOpenChange={setVerifyCodeModalOpen}
      />
    </div>
  );
}

// Wrapper component to handle mobile/desktop routing
export default function Gallery() {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return <MobileGallery />;
  }
  
  return <DesktopGallery />;
}


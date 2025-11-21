import { useState, useEffect, useRef } from 'react';
import MobileLayout from '@/components/mobile/MobileLayout';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { Loader2, Play } from 'lucide-react';
import { getLoginUrl } from '@/const';
import { useVerificationGuard } from '@/hooks/useVerificationGuard';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@/components/ui/visually-hidden";

/**
 * Mobile Gallery Page - Instagram Explore Style with Dynamic Video Preview
 * 3-column square grid with auto-playing videos in viewport
 * Uses Intersection Observer for performance optimization
 * Videos play only when visible, pause when scrolled away
 * Infinite scroll for seamless content loading
 */
export default function MobileGallery() {
  const { isAuthenticated } = useAuth();
  useVerificationGuard(); // Redirect if not verified
  const [selectedGeneration, setSelectedGeneration] = useState<any>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showSearchBar, setShowSearchBar] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [displayLimit, setDisplayLimit] = useState(30);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Fetch generations
  const { data: generations = [], isLoading } = trpc.generations.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Fetch models for name lookup
  const { data: models = [] } = trpc.models.list.useQuery();

  // Filter only completed generations
  const completedGenerations = generations.filter((gen) => gen.status === 'completed');

  // Sort by newest first
  const sortedGenerations = [...completedGenerations].sort((a, b) => {
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    return dateB - dateA;
  });

  const hasMore = sortedGenerations.length > displayLimit;

  // Handle scroll to hide/show search bar (Instagram style)
  useEffect(() => {
    const scrollContainer = document.querySelector('main.overflow-y-auto');
    if (!scrollContainer) return;

    const handleScroll = () => {
      const currentScrollY = scrollContainer.scrollTop;
      
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setShowSearchBar(false);
      } else if (currentScrollY < lastScrollY) {
        setShowSearchBar(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Infinite scroll - load more when near bottom
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting) {
          // User scrolled near bottom - load more
          setIsLoadingMore(true);
          
          // Simulate loading delay for smooth UX
          setTimeout(() => {
            setDisplayLimit(prev => prev + 30);
            setIsLoadingMore(false);
          }, 500);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '200px', // Start loading 200px before reaching the element
      }
    );

    observer.observe(loadMoreRef.current);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoadingMore]);

  // Handle grid item click
  const handleItemClick = (gen: any) => {
    setSelectedGeneration(gen);
    setCurrentImageIndex(0);
  };

  // Handle modal close
  const handleCloseModal = () => {
    setSelectedGeneration(null);
    setCurrentImageIndex(0);
  };

  // Handle swipe/navigation
  const handleNextImage = () => {
    if (!selectedGeneration) return;
    const resultUrls = parseResultUrls(selectedGeneration.resultUrls);
    if (currentImageIndex < resultUrls.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    }
  };

  const handlePrevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  };

  // Parse resultUrls (can be string or array)
  const parseResultUrls = (resultUrls: any): string[] => {
    if (!resultUrls) return [];
    if (typeof resultUrls === 'string') {
      try {
        const parsed = JSON.parse(resultUrls);
        return Array.isArray(parsed) ? parsed : [resultUrls];
      } catch {
        return [resultUrls];
      }
    }
    return Array.isArray(resultUrls) ? resultUrls : [resultUrls];
  };

  // Get model name helper
  const getModelName = (modelId: string) => {
    const model = models.find((m) => m.id === modelId) || models.find((m) => m.modelId === modelId);
    return model?.name || 'Unknown Model';
  };

  // Allow viewing gallery without authentication
  // Users will see empty state if not authenticated

  return (
    <MobileLayout>
      {/* Search Bar with Slide Animation */}
      <div
        className={`sticky top-0 z-10 bg-background border-b transition-transform duration-300 ${
          showSearchBar ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="px-4 py-3">
          <input
            type="text"
            placeholder="Search generations..."
            className="w-full px-4 py-2 rounded-full bg-muted border-none focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Gallery Content */}
      <div className="pb-4">
        {isLoading ? (
          // Loading State
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !isAuthenticated ? (
          // Login Prompt for Unauthenticated Users
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <div className="text-6xl mb-4">🎨</div>
            <h3 className="text-xl font-semibold mb-2">เข้าสู่ระบบเพื่อดู Gallery</h3>
            <p className="text-muted-foreground mb-6">
              เข้าสู่ระบบเพื่อดูผลงานและสร้างสรรค์ด้วย AI
            </p>
          </div>
        ) : sortedGenerations.length === 0 ? (
          // Empty State for Authenticated Users
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <div className="text-6xl mb-4">🖼️</div>
            <h3 className="text-xl font-semibold mb-2">No Completed Generations</h3>
            <p className="text-muted-foreground mb-6">
              Your completed generations will appear here
            </p>
          </div>
        ) : (
          <>
            {/* Instagram Explore Style Grid - 3 columns, square thumbnails */}
            <div className="grid grid-cols-3 gap-1 p-1">
              {sortedGenerations.slice(0, displayLimit).map((gen) => {
                const model = models.find((m) => m.id === gen.modelId) || models.find((m) => m.modelId === gen.modelId);
                const isVideo = model?.type === 'video';
                const resultUrls = parseResultUrls(gen.resultUrls);
                const hasMultipleImages = resultUrls.length > 1;
                
                return (
                  <GalleryItem
                    key={gen.id}
                    generation={gen}
                    isVideo={isVideo}
                    hasMultipleImages={hasMultipleImages}
                    resultUrls={resultUrls}
                    onClick={() => handleItemClick(gen)}
                  />
                );
              })}
            </div>

            {/* Infinite Scroll Trigger & Loading Indicator */}
            {hasMore && (
              <div 
                ref={loadMoreRef}
                className="flex items-center justify-center py-8"
              >
                {isLoadingMore && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Loading more...</span>
                  </div>
                )}
              </div>
            )}

            {/* End of Content Indicator */}
            {!hasMore && sortedGenerations.length > 30 && (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <span className="text-sm">You've reached the end</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Viewer */}
      {selectedGeneration && (
        <Dialog open={!!selectedGeneration} onOpenChange={handleCloseModal}>
          <DialogContent className="max-w-full h-full p-0 bg-black border-none">
            <VisuallyHidden>
              <DialogTitle>Media Viewer</DialogTitle>
            </VisuallyHidden>
            {(() => {
              const model = models.find((m) => m.id === selectedGeneration.modelId) || 
                           models.find((m) => m.modelId === selectedGeneration.modelId);
              const isVideo = model?.type === 'video';
              const resultUrls = parseResultUrls(selectedGeneration.resultUrls);
              const currentUrl = resultUrls[currentImageIndex] || '';

              return (
                <div className="relative w-full h-full flex flex-col">
                  {/* Close Button */}
                  <button
                    onClick={handleCloseModal}
                    className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  {/* Media Display */}
                  <div className="flex-1 flex items-center justify-center relative">
                    {isVideo ? (
                      <video
                        key={currentUrl}
                        src={currentUrl}
                        className="max-w-full max-h-full"
                        controls
                        autoPlay
                        playsInline
                        onLoadedData={(e) => {
                          e.currentTarget.play().catch(() => {});
                        }}
                      />
                    ) : (
                      <img
                        src={currentUrl}
                        alt=""
                        className="max-w-full max-h-full object-contain"
                      />
                    )}

                    {/* Navigation Arrows (for multiple images) */}
                    {resultUrls.length > 1 && (
                      <>
                        {currentImageIndex > 0 && (
                          <button
                            onClick={handlePrevImage}
                            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>
                        )}
                        {currentImageIndex < resultUrls.length - 1 && (
                          <button
                            onClick={handleNextImage}
                            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  {/* Info Bar */}
                  <div className="bg-black/80 text-white p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{model?.name || 'Unknown Model'}</p>
                        <p className="text-sm text-white/60 line-clamp-1">{selectedGeneration.prompt}</p>
                      </div>
                      {resultUrls.length > 1 && (
                        <div className="ml-4 text-sm text-white/80">
                          {currentImageIndex + 1}/{resultUrls.length}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      )}
    </MobileLayout>
  );
}

/**
 * GalleryItem Component with Intersection Observer
 * Plays video only when visible in viewport
 */
interface GalleryItemProps {
  generation: any;
  isVideo: boolean;
  hasMultipleImages: boolean;
  resultUrls: string[];
  onClick: () => void;
}

function GalleryItem({ generation, isVideo, hasMultipleImages, resultUrls, onClick }: GalleryItemProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    if (!isVideo || !videoRef.current) return;

    const video = videoRef.current;
    
    // Intersection Observer to detect when video is in viewport
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsInView(entry.isIntersecting);
          
          if (entry.isIntersecting) {
            // Video is visible - play it
            video.play().catch(() => {
              // Ignore autoplay errors (browser restrictions)
            });
          } else {
            // Video scrolled out of view - pause it
            video.pause();
            video.currentTime = 0; // Reset to start
          }
        });
      },
      {
        threshold: 0.5, // Play when 50% visible
        rootMargin: '50px', // Start loading slightly before entering viewport
      }
    );

    observer.observe(video);

    return () => {
      observer.disconnect();
    };
  }, [isVideo]);

  const videoUrl = resultUrls[0] || '';
  const thumbnailUrl = generation.thumbnailUrl || resultUrls[0] || '';

  return (
    <div
      className="aspect-square relative cursor-pointer overflow-hidden rounded bg-muted"
      onClick={onClick}
    >
      {isVideo ? (
        <>
          {/* Video Preview (auto-play when in view) */}
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-cover"
            loop
            muted
            playsInline
            preload="metadata"
            poster={generation.thumbnailUrl || undefined}
          />
          
          {/* Video Indicator */}
          <div className="absolute top-2 right-2 bg-black/60 rounded-full p-1.5">
            <Play className="w-3 h-3 text-white fill-white" />
          </div>
        </>
      ) : (
        <>
          {hasMultipleImages ? (
            /* Multi-Image Grid Display */
            <div className="w-full h-full relative">
              {resultUrls.length === 2 ? (
                /* 2 images - horizontal split */
                <div className="grid grid-cols-2 gap-0.5 h-full">
                  <div className="h-full">
                    <img
                      src={resultUrls[0]}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="h-full">
                    <img
                      src={resultUrls[1]}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                </div>
              ) : resultUrls.length === 3 ? (
                /* 3 images - 1 large + 2 small */
                <div className="grid grid-cols-2 grid-rows-2 gap-0.5 h-full">
                  <div className="col-span-1 row-span-2">
                    <img
                      src={resultUrls[0]}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="col-span-1 row-span-1">
                    <img
                      src={resultUrls[1]}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="col-span-1 row-span-1">
                    <img
                      src={resultUrls[2]}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                </div>
              ) : (
                /* 4+ images - 2x2 grid */
                <div className="grid grid-cols-2 grid-rows-2 gap-0.5 h-full">
                  {resultUrls.slice(0, 4).map((url, idx) => (
                    <div key={idx} className="h-full">
                      <img
                        src={url}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              )}
              {/* Show +N indicator if more than 4 images */}
              {resultUrls.length > 4 && (
                <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded-full font-medium">
                  +{resultUrls.length - 4}
                </div>
              )}
            </div>
          ) : (
            /* Single Image */
            <img
              src={thumbnailUrl}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          )}
        </>
      )}
    </div>
  );
}


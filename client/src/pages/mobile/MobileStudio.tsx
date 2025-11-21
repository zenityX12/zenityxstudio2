import { useState } from 'react';
import MobileLayout from '@/components/mobile/MobileLayout';

import MobileFeedCard from '@/components/mobile/MobileFeedCard';
import MobileGenerationCard from '@/components/mobile/MobileGenerationCard';
import MobileGenerationModal from '@/components/mobile/MobileGenerationModal';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { FeedCardSkeleton } from '@/components/mobile/LoadingSkeleton';
import { getLoginUrl } from '@/const';
import { useVerificationGuard } from '@/hooks/useVerificationGuard';

/**
 * Mobile Studio Page
 * Instagram-style feed with generation results
 */
export default function MobileStudio() {
  const { isAuthenticated } = useAuth();
  useVerificationGuard(); // Redirect if not verified

  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch generations
  const { data: generations = [], isLoading } = trpc.generations.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Fetch models for name lookup
  const { data: models = [] } = trpc.models.list.useQuery();

  // Sort by newest first
  const sortedGenerations = [...generations].sort((a, b) => {
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    return dateB - dateA;
  });

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <MobileLayout>
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Sign In Required</h2>
          <p className="text-muted-foreground mb-6">
            Please sign in to access the studio and start creating
          </p>
          <a
            href={getLoginUrl()}
            className="px-6 py-3 bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-shadow"
          >
            Sign In
          </a>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout showBottomNav={!isModalOpen}>
      {/* Generation Card (Facebook-style) */}
      <MobileGenerationCard onClick={() => setIsModalOpen(true)} />

      {/* Generation Modal */}
      <MobileGenerationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {/* Feed Content */}
      <div className="pb-4">
        {isLoading ? (
          // Loading Skeletons
          <div>
            {[1, 2, 3].map((i) => (
              <FeedCardSkeleton key={i} />
            ))}
          </div>
        ) : sortedGenerations.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center py-12 px-8 text-center">
            <div className="text-6xl mb-4">🎨</div>
            <h3 className="text-xl font-semibold mb-2">No Generations Yet</h3>
            <p className="text-muted-foreground mb-6">
              Tap the + button below to create your first AI generation
            </p>
          </div>
        ) : (
          // Feed Cards
          <div>
            {sortedGenerations.map((gen) => {
              // Find model name
              const model = models.find((m) => m.id === gen.modelId) || models.find((m) => m.modelId === gen.modelId);
              const isVideo = model?.type === 'video';

              return (
                <MobileFeedCard
                  key={gen.id}
                  generation={gen as any}
                  modelName={model?.name || 'Unknown Model'}
                  isVideo={isVideo}
                  onDownload={() => {
                    // Download functionality will be added in polish phase
                    console.log('Download:', gen.id);
                  }}
                  onReuse={() => {
                    // Reuse functionality will be added in Phase 4 (generation modal)
                    console.log('Reuse:', gen.id);
                  }}
                  onMore={() => {
                    // More options will be added in polish phase
                    console.log('More:', gen.id);
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}


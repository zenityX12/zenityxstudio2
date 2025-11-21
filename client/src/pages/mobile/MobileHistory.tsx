import { useState } from 'react';
import MobileLayout from '@/components/mobile/MobileLayout';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { Loader2, Clock, CheckCircle2, XCircle, Loader as LoaderIcon } from 'lucide-react';
import { HistoryItemSkeleton } from '@/components/mobile/LoadingSkeleton';
import { getLoginUrl } from '@/const';
import { formatDistanceToNow } from 'date-fns';

/**
 * Mobile History Page
 * View all generations with status
 */
export default function MobileHistory() {
  const { isAuthenticated } = useAuth();


  // Fetch generations
  const { data: generations = [], isLoading } = trpc.generations.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Fetch models
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
            Please sign in to view your history
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
    <MobileLayout>
      {/* History List */}
      <div className="p-4 space-y-3">
        {isLoading ? (
          // Loading Skeletons
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <HistoryItemSkeleton key={i} />
            ))}
          </div>
        ) : sortedGenerations.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-6xl mb-4">📜</div>
            <h3 className="text-xl font-semibold mb-2">No History</h3>
            <p className="text-muted-foreground">
              Your generation history will appear here
            </p>
          </div>
        ) : (
          // History Items
          sortedGenerations.map((gen) => {
            const model = models.find((m) => m.id === gen.modelId) || models.find((m) => m.modelId === gen.modelId);
            const timeAgo = gen.createdAt
              ? formatDistanceToNow(new Date(gen.createdAt), { addSuffix: true })
              : '';

            return (
              <div
                key={gen.id}
                className="bg-card border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {/* Status Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {gen.status === 'completed' && (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    )}
                    {gen.status === 'processing' && (
                      <LoaderIcon className="h-5 w-5 text-blue-500 animate-spin" />
                    )}
                    {gen.status === 'pending' && (
                      <Clock className="h-5 w-5 text-yellow-500" />
                    )}
                    {gen.status === 'failed' && (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Model & Time */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-primary">
                        {model?.name || 'Unknown Model'}
                      </span>
                      <span className="text-xs text-muted-foreground">{timeAgo}</span>
                    </div>

                    {/* Prompt */}
                    <p className="text-sm line-clamp-2 mb-2">{gen.prompt}</p>

                    {/* Status Badge */}
                    <span
                      className={`inline-block text-xs px-2 py-0.5 rounded-full ${
                        gen.status === 'completed'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                          : gen.status === 'failed'
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                          : gen.status === 'processing'
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300'
                      }`}
                    >
                      {gen.status}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </MobileLayout>
  );
}


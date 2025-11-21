// Removed unused imports
import { useAuth } from '@/_core/hooks/useAuth';

interface MobileGenerationCardProps {
  onClick: () => void;
}

/**
 * Mobile Generation Card Component
 * Facebook-style post composer card at top of feed
 */
export default function MobileGenerationCard({ onClick }: MobileGenerationCardProps) {
  const { user } = useAuth();

  return (
    <div className="bg-card border-b border-border p-4">
      {/* Full Width Input Bar */}
      <button
        onClick={onClick}
        className="w-full px-4 py-3 bg-muted hover:bg-muted/80 rounded-full text-left text-muted-foreground transition-colors"
      >
        What do you want to create?
      </button>
    </div>
  );
}


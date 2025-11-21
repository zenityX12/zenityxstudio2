import { Coins } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { getLoginUrl } from '@/const';
import { Button } from '@/components/ui/button';


/**
 * Mobile Header Component
 * Sticky header with blur background, logo, credits, and avatar
 */
export default function MobileHeader() {
  const { user, isAuthenticated } = useAuth();
  
  const { data: credits = 0 } = trpc.credits.get.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 5000, // Refetch every 5 seconds
    refetchOnWindowFocus: true, // Refetch when window gains focus
  });

  // Convert string to number if needed
  const creditsNumber = typeof credits === 'string' ? parseFloat(credits) : credits;


  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="flex items-center justify-between px-4 h-14">
        {/* Left: Logo */}
        <div className="flex items-center">
          <Logo className="h-8" />
        </div>

        {/* Right: Credits + Avatar or Login Button */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            /* Credits Badge */
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 dark:bg-primary/20 rounded-full">
              <Coins className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-primary">
                {creditsNumber.toLocaleString()}
              </span>
            </div>
          ) : (
            /* Login Button */
            <Button asChild size="sm" className="h-8 px-4">
              <a href={getLoginUrl()}>เข้าสู่ระบบ</a>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}


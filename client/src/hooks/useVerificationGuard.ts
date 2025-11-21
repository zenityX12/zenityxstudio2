import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';

/**
 * Verification Guard Hook
 * Redirects unverified users to verification page
 * Use this in mobile pages that require verification
 */
export function useVerificationGuard() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  // Check if user is verified
  const isVerified = user?.isVerified === 1;

  useEffect(() => {
    // Wait for auth to load
    if (loading) return;

    // If not authenticated, let the page handle it
    if (!isAuthenticated) return;

    // If authenticated but not verified, redirect to verification page
    if (isAuthenticated && !isVerified) {
      setLocation('/mobile/verify');
    }
  }, [isAuthenticated, isVerified, loading, setLocation]);

  return {
    isVerified,
    loading,
  };
}


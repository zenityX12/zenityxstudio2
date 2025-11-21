import { useState, useEffect } from 'react';

/**
 * Hook to detect media query changes
 * @param query - Media query string (e.g., '(max-width: 1023px)')
 * @returns boolean - true if media query matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    
    // Set initial value
    setMatches(media.matches);

    // Create event listener
    const listener = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };

    // Add listener
    media.addEventListener('change', listener);

    // Cleanup
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

/**
 * Predefined breakpoint hooks
 * Mobile: < 768px (phones only)
 * Tablet: 768px - 1023px (treated as desktop)
 * Desktop: >= 768px
 */
export function useIsMobile() {
  // Only true for phones (< 768px), tablets are treated as desktop
  return useMediaQuery('(max-width: 767px)');
}

export function useIsTablet() {
  return useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
}

export function useIsDesktop() {
  // Desktop includes tablets (>= 768px)
  return useMediaQuery('(min-width: 768px)');
}


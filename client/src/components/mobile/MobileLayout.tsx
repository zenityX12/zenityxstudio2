import { ReactNode } from 'react';
import MobileHeader from './MobileHeader';
import MobileBottomNav from './MobileBottomNav';

interface MobileLayoutProps {
  children: ReactNode;
  showHeader?: boolean;
  showBottomNav?: boolean;
}

/**
 * Mobile Layout Wrapper
 * Provides consistent layout structure for mobile pages
 */
export default function MobileLayout({ 
  children, 
  showHeader = true, 
  showBottomNav = true 
}: MobileLayoutProps) {
  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      {showHeader && <MobileHeader />}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden" style={{ WebkitOverflowScrolling: 'touch' }}>
        {children}
      </main>

      {/* Bottom Navigation */}
      {showBottomNav && <MobileBottomNav />}
    </div>
  );
}


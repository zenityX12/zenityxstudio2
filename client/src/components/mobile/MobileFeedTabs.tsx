import { Image, Video, Sparkles } from 'lucide-react';

interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const tabs: Tab[] = [
  { id: 'all', label: 'All', icon: <Sparkles className="h-4 w-4" /> },
  { id: 'image', label: 'Images', icon: <Image className="h-4 w-4" /> },
  { id: 'video', label: 'Videos', icon: <Video className="h-4 w-4" /> },
];

interface MobileFeedTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

/**
 * Mobile Feed Tabs Component
 * Horizontal scrolling tabs for filtering feed content
 */
export default function MobileFeedTabs({ activeTab, onTabChange }: MobileFeedTabsProps) {
  return (
    <div className="sticky top-14 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {tab.icon}
            <span className="text-sm font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}


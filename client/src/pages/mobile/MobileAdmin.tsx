import { useState } from 'react';
import MobileLayout from '@/components/mobile/MobileLayout';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { 
  Users, 
  DollarSign, 
  Image, 
  TrendingUp,
  ChevronRight,
  Calendar,
  Activity,
  Video,
  Loader2
} from 'lucide-react';
import { useLocation } from 'wouter';

/**
 * Mobile Admin Dashboard
 * Optimized for mobile viewing (does not affect Desktop)
 */
export default function MobileAdmin() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<string>('');

  // Redirect if not admin
  if (user?.role !== 'admin') {
    setLocation('/mobile/profile');
    return null;
  }

  // Fetch admin stats
  const { data: stats } = trpc.admin.getStats.useQuery();

  // Thumbnail generation mutation
  const generateThumbnails = trpc.thumbnail.batchGenerate.useMutation({
    onSuccess: (result) => {
      setIsGenerating(false);
      setGenerateResult(`✅ Generated ${result.successful} thumbnails (${result.failed} failed)`);
      setTimeout(() => setGenerateResult(''), 5000);
    },
    onError: (error: { message: string }) => {
      setIsGenerating(false);
      setGenerateResult(`❌ Error: ${error.message}`);
      setTimeout(() => setGenerateResult(''), 5000);
    },
  });

  const handleGenerateThumbnails = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setGenerateResult('🎬 Generating thumbnails...');
    generateThumbnails.mutate({ limit: 50 });
  };

  const quickStats = [
    {
      id: 'users',
      label: 'Total Users',
      value: stats?.totalUsers || 0,
      icon: <Users className="w-6 h-6" />,
      color: 'from-blue-500 to-blue-600',
    },
    {
      id: 'revenue',
      label: 'Total Revenue',
      value: `฿${(stats?.totalRevenue || 0).toLocaleString()}`,
      icon: <DollarSign className="w-6 h-6" />,
      color: 'from-green-500 to-green-600',
    },
    {
      id: 'generations',
      label: 'Total Generations',
      value: stats?.totalGenerations || 0,
      icon: <Image className="w-6 h-6" />,
      color: 'from-purple-500 to-purple-600',
    },
    {
      id: 'active',
      label: 'Active Today',
      value: stats?.activeToday || 0,
      icon: <Activity className="w-6 h-6" />,
      color: 'from-orange-500 to-orange-600',
    },
  ];

  const menuSections = [
    {
      title: 'User Management',
      items: [
        { label: 'All Users', path: '/admin/users', icon: <Users className="w-5 h-5" /> },
        { label: 'User Activity', path: '/admin/activity', icon: <Activity className="w-5 h-5" /> },
      ],
    },
    {
      title: 'Financial',
      items: [
        { label: 'Sales Overview', path: '/admin/sales', icon: <DollarSign className="w-5 h-5" /> },
        { label: 'Transactions', path: '/admin/transactions', icon: <TrendingUp className="w-5 h-5" /> },
      ],
    },
    {
      title: 'Content',
      items: [
        { label: 'Generations', path: '/admin/generations', icon: <Image className="w-5 h-5" /> },
        { label: 'Models', path: '/admin/models', icon: <Calendar className="w-5 h-5" /> },
      ],
    },
    {
      title: 'System',
      items: [],
    },
  ];

  return (
    <MobileLayout>
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gradient-to-br from-orange-500 to-red-500 px-4 py-6 text-white">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-sm text-white/80">Manage your platform</p>
      </div>

      {/* Quick Stats Grid */}
      <div className="p-4 grid grid-cols-2 gap-3">
        {quickStats.map((stat) => (
          <div
            key={stat.id}
            className={`bg-gradient-to-br ${stat.color} rounded-lg p-4 text-white`}
          >
            <div className="flex items-center justify-between mb-2">
              {stat.icon}
            </div>
            <div className="text-2xl font-bold mb-1">{stat.value}</div>
            <div className="text-xs text-white/80">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Menu Sections */}
      <div className="p-4 space-y-4">
        {menuSections.map((section) => (
          <div key={section.title}>
            <h2 className="text-sm font-semibold text-muted-foreground mb-2 px-2">
              {section.title}
            </h2>
            <div className="bg-card rounded-lg overflow-hidden border border-border">
              {section.items.map((item, index) => (
                <button
                  key={index}
                  onClick={() => setLocation(item.path)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border last:border-b-0"
                >
                  <div className="text-muted-foreground">{item.icon}</div>
                  <span className="flex-1 text-left font-medium">{item.label}</span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Video Thumbnail Generation */}
      <div className="p-4">
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
              <Video className="w-5 h-5 text-purple-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Video Thumbnails</h3>
              <p className="text-xs text-muted-foreground">Generate thumbnails for videos</p>
            </div>
          </div>
          
          <button
            onClick={handleGenerateThumbnails}
            disabled={isGenerating}
            className="w-full px-4 py-3 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Video className="w-4 h-4" />
                Generate Thumbnails (50)
              </>
            )}
          </button>
          
          {generateResult && (
            <div className="mt-3 p-3 bg-muted rounded-lg text-sm text-center">
              {generateResult}
            </div>
          )}
        </div>
      </div>

      {/* Back to Profile */}
      <div className="p-4">
        <button
          onClick={() => setLocation('/mobile/profile')}
          className="w-full px-4 py-3 bg-muted rounded-lg font-medium hover:bg-muted/80 transition-colors"
        >
          Back to Profile
        </button>
      </div>
    </MobileLayout>
  );
}


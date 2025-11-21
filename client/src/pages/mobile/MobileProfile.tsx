import MobileLayout from '@/components/mobile/MobileLayout';
import { useAuth } from '@/_core/hooks/useAuth';
import { getLoginUrl } from '@/const';
import { useVerificationGuard } from '@/hooks/useVerificationGuard';
import { 
  User, 
  CreditCard, 
  Settings, 
  LogOut, 
  ChevronRight,
  Shield,
  Bell,
  HelpCircle,
  Gift
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useLocation } from 'wouter';

/**
 * Mobile Profile Page - Facebook Style
 * Profile info + Settings menu + Admin link
 */
export default function MobileProfile() {
  const { user, isAuthenticated } = useAuth();
  useVerificationGuard(); // Redirect if not verified
  const [, setLocation] = useLocation();
  const logoutMutation = trpc.auth.logout.useMutation();

  // Fetch credits
  const { data: creditsData } = trpc.credits.getBalance.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 5000,
  });

  // Redirect if not authenticated
  if (!isAuthenticated || !user) {
    window.location.href = getLoginUrl();
    return null;
  }

  const credits = creditsData ? parseFloat(String(creditsData)) : 0;

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    window.location.href = '/';
  };

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <MobileLayout>
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Sign In Required</h2>
          <p className="text-muted-foreground mb-6">
            Please sign in to view your profile
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
      {/* Profile Header */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-600 px-4 pt-6 pb-8">
        <div className="flex items-center gap-4">
          {/* Profile Picture */}
          <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white/30">
            {user.profilePicture ? (
              <img 
                src={user.profilePicture} 
                alt={user.name || 'Profile'} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-white/20 flex items-center justify-center text-white text-2xl font-bold">
                {user.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="flex-1 text-white">
            <h2 className="text-xl font-bold">{user.name || 'User'}</h2>
            <p className="text-sm text-white/80">{user.email}</p>
            <div className="mt-2 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              <span className="text-sm font-medium">{credits.toLocaleString()} Credits</span>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Sections */}
      <div className="p-4 space-y-4">
        {/* Account Section */}
        <div className="bg-card rounded-lg overflow-hidden border border-border">
          <MenuItem
            icon={<User className="w-5 h-5" />}
            label="Edit Profile"
            onClick={() => setLocation('/profile')}
          />
          <MenuItem
            icon={<CreditCard className="w-5 h-5" />}
            label="Credits & Billing"
            onClick={() => setLocation('/profile')}
          />
          <MenuItem
            icon={<Gift className="w-5 h-5 text-purple-500" />}
            label="Redeem Code"
            onClick={() => setLocation('/mobile/redeem')}
          />
        </div>

        {/* Settings Section */}
        <div className="bg-card rounded-lg overflow-hidden border border-border">
          <MenuItem
            icon={<Settings className="w-5 h-5" />}
            label="Settings"
            onClick={() => setLocation('/profile')}
          />
          <MenuItem
            icon={<Bell className="w-5 h-5" />}
            label="Notifications"
            onClick={() => {}}
          />
        </div>

        {/* Admin Section (Only for admins) */}
        {user.role === 'admin' && (
          <div className="bg-card rounded-lg overflow-hidden border border-border">
            <MenuItem
              icon={<Shield className="w-5 h-5 text-orange-500" />}
              label="Admin Dashboard"
              onClick={() => setLocation('/mobile/admin')}
              highlight
            />
          </div>
        )}

        {/* Support Section */}
        <div className="bg-card rounded-lg overflow-hidden border border-border">
          <MenuItem
            icon={<HelpCircle className="w-5 h-5" />}
            label="Help & Support"
            onClick={() => {}}
          />
        </div>

        {/* Logout */}
        <div className="bg-card rounded-lg overflow-hidden border border-border">
          <MenuItem
            icon={<LogOut className="w-5 h-5 text-red-500" />}
            label="Log Out"
            onClick={handleLogout}
            danger
          />
        </div>
      </div>
    </MobileLayout>
  );
}

// Menu Item Component
interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  highlight?: boolean;
  danger?: boolean;
}

function MenuItem({ icon, label, onClick, highlight, danger }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border last:border-b-0 ${
        highlight ? 'bg-orange-50 dark:bg-orange-950/20' : ''
      }`}
    >
      <div className={danger ? 'text-red-500' : highlight ? 'text-orange-500' : 'text-muted-foreground'}>
        {icon}
      </div>
      <span className={`flex-1 text-left font-medium ${danger ? 'text-red-500' : ''}`}>
        {label}
      </span>
      <ChevronRight className="w-5 h-5 text-muted-foreground" />
    </button>
  );
}


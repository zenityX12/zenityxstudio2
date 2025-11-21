import { Home, Image, Clock } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';

/**
 * Mobile Bottom Navigation
 * Fixed bottom navigation with 4 tabs: Feed, Gallery, History, Profile
 * Profile tab shows user's profile picture (Facebook-style)
 */
export default function MobileBottomNav() {
  const [location] = useLocation();
  const { user } = useAuth();

  const navItems = [
    {
      id: 'feed',
      label: 'Feed',
      icon: <Home className="h-6 w-6" />,
      path: '/studio',
    },
    {
      id: 'gallery',
      label: 'Gallery',
      icon: <Image className="h-6 w-6" />,
      path: '/gallery',
    },
    {
      id: 'history',
      label: 'History',
      icon: <Clock className="h-6 w-6" />,
      path: '/history',
    },
  ];

  const profileActive = location === '/profile' || location === '/mobile/profile';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const active = location === item.path || 
                        (item.path === '/studio' && location === '/');

          return (
            <Link
              key={item.id}
              href={item.path}
              className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-colors min-w-[64px] ${
                active
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {item.icon}
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}

        {/* Profile Tab with Profile Picture */}
        <Link
          href="/mobile/profile"
          className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-colors min-w-[64px] ${
            profileActive
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {/* Profile Picture */}
          <div className={`w-7 h-7 rounded-full overflow-hidden border-2 ${
            profileActive ? 'border-primary' : 'border-muted-foreground'
          }`}>
            {user?.profilePicture ? (
              <img 
                src={user.profilePicture} 
                alt={user.name || 'Profile'} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            )}
          </div>
          <span className="text-xs font-medium">Profile</span>
        </Link>
      </div>
    </nav>
  );
}


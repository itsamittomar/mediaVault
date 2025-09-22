import { Link, useLocation } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { FileStackIcon as CircleStackIcon, Home, Upload, Settings, FolderOpen, LayoutDashboard, FileImage, FileVideo, FileAudio, FileText, Star, Sparkles } from 'lucide-react';
import { Button } from './ui/button';

export default function Sidebar() {
  const { pathname } = useLocation();
  const { user } = useAuth();

  const routes = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: Home,
    },
    {
      title: 'Upload',
      href: '/upload',
      icon: Upload,
    },
    {
      title: 'All Files',
      href: '/all-files',
      icon: FolderOpen,
    },
    {
      title: 'Images',
      href: '/dashboard?type=image',
      icon: FileImage,
    },
    {
      title: 'Videos',
      href: '/dashboard?type=video',
      icon: FileVideo,
    },
    {
      title: 'Audio',
      href: '/dashboard?type=audio',
      icon: FileAudio,
    },
    {
      title: 'Documents',
      href: '/dashboard?type=document',
      icon: FileText,
    },
    {
      title: 'Favorites',
      href: '/dashboard?favorite=true',
      icon: Star,
    },
    {
      title: 'Smart Filters',
      href: '/filters',
      icon: Sparkles,
    },
    {
      title: 'Settings',
      href: '/settings',
      icon: Settings,
    },
  ];

  // Admin-only routes
  if (user?.role === 'admin') {
    routes.push({
      title: 'Admin',
      href: '/admin',
      icon: LayoutDashboard,
    });
  }

  return (
    <div className="flex flex-col w-64 border-r bg-gradient-to-b from-card to-muted/20 min-h-screen sidebar-nav">
      <div className="flex h-14 items-center border-b px-4 bg-gradient-to-r from-primary/5 to-accent/5">
        <Link to="/" className="flex items-center gap-2">
          <CircleStackIcon className="h-6 w-6 text-primary animate-pulse-glow" />
          <span className="text-lg sm:text-xl font-bold gradient-text">MediaVault</span>
        </Link>
      </div>
      <ScrollArea className="flex-1 py-4 custom-scrollbar">
        <nav className="px-2 space-y-1">
          {routes.map((route) => (
            <Button
              key={route.href}
              variant={pathname === route.href || 
                (pathname === '/dashboard' && route.href.startsWith('/dashboard?')) ? 
                "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-2 smooth-transition hover:scale-105 hover:translate-x-1",
                {
                  "bg-gradient-to-r from-primary/20 to-accent/20 text-primary border border-primary/30 shadow-lg": 
                    pathname === route.href || 
                    (pathname === '/dashboard' && route.href.startsWith('/dashboard?')),
                }
              )}
              asChild
            >
              <Link to={route.href}>
                <route.icon className="h-4 w-4 smooth-transition group-hover:scale-110" />
                {route.title}
              </Link>
            </Button>
          ))}
        </nav>
      </ScrollArea>
    </div>
  );
}
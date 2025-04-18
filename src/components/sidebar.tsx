import { Link, useLocation } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { FileStackIcon as CircleStackIcon, Home, Upload, Settings, FolderOpen, LayoutDashboard, FileImage, FileVideo, FileAudio, FileText, Star } from 'lucide-react';
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
      href: '/dashboard?type=all',
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
    <div className="hidden lg:flex flex-col w-64 border-r bg-card min-h-screen">
      <div className="flex h-14 items-center border-b px-4">
        <Link to="/" className="flex items-center gap-2">
          <CircleStackIcon className="h-6 w-6 text-primary" />
          <span className="text-xl font-semibold">MediaVault</span>
        </Link>
      </div>
      <ScrollArea className="flex-1 py-4">
        <nav className="px-2 space-y-1">
          {routes.map((route) => (
            <Button
              key={route.href}
              variant={pathname === route.href || 
                (pathname === '/dashboard' && route.href.startsWith('/dashboard?')) ? 
                "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-2",
                {
                  "bg-secondary text-secondary-foreground": 
                    pathname === route.href || 
                    (pathname === '/dashboard' && route.href.startsWith('/dashboard?')),
                }
              )}
              asChild
            >
              <Link to={route.href}>
                <route.icon className="h-4 w-4" />
                {route.title}
              </Link>
            </Button>
          ))}
        </nav>
      </ScrollArea>
    </div>
  );
}
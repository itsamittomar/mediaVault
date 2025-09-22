import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ModeToggle } from '@/components/mode-toggle';
import { Button } from '@/components/ui/button';
import { Search } from '@/components/search';
import { useAuth } from '@/contexts/auth-context';
import { FileStackIcon as CircleStackIcon, Menu, Upload, Camera } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { AvatarSelector } from '@/components/avatar-selector';
import { toast } from 'sonner';
import Sidebar from './sidebar';

type HeaderProps = {
  user: {
    id: string;
    username: string;
    email: string;
    role: string;
    createdAt: string;
    updatedAt: string;
  } | null;
};

export default function Header({ user }: HeaderProps) {
  const { logout, user: authUser, uploadAvatar } = useAuth();
  const currentUser = authUser || user;
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);

  const handleAvatarUpload = async (file: File) => {
    try {
      await uploadAvatar(file);
      setShowAvatarSelector(false);
    } catch (error) {
      console.error('Avatar upload failed:', error);
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b header-glass shadow-cool">
      <div className="container flex h-16 items-center justify-between px-3 sm:px-4">
        <div className="flex items-center gap-2 mr-2 sm:mr-4">
          <CircleStackIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary icon-glow" />
          <span className="text-lg sm:text-xl font-bold hidden sm:block text-gradient-primary">MediaVault</span>
          <span className="text-base font-bold sm:hidden text-gradient-primary">MV</span>
        </div>
        
        <div className="lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="mr-2">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] sm:w-[320px] p-0">
              <Sidebar />
            </SheetContent>
          </Sheet>
        </div>
        
        <div className="flex-1 flex justify-center px-2 sm:px-4">
          <Search />
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4">
          <Button asChild variant="ghost" size="icon" className="hidden sm:flex hover-glow">
            <Link to="/upload">
              <Upload className="h-4 w-4 sm:h-5 sm:w-5 icon-glow" />
              <span className="sr-only">Upload media</span>
            </Link>
          </Button>
          
          <ModeToggle />
          
          {currentUser && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full hover-glow">
                  <Avatar className="h-8 w-8 avatar-cool">
                    <AvatarImage src={currentUser.avatar || ''} alt={currentUser.username} />
                    <AvatarFallback>{currentUser.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{currentUser.username}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {currentUser.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowAvatarSelector(true)}>
                  <Camera className="mr-2 h-4 w-4" />
                  Change Avatar
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout}>
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Avatar Selector Dialog */}
          <AvatarSelector
            open={showAvatarSelector}
            onOpenChange={setShowAvatarSelector}
            onFileSelect={handleAvatarUpload}
          />
        </div>
      </div>
    </header>
  );
}
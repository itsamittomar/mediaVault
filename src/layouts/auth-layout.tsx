import { Outlet, Link } from 'react-router-dom';
import { ModeToggle } from '@/components/mode-toggle';
import { FileStackIcon as CircleStackIcon } from 'lucide-react';

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen bg-muted/40">
      <div className="hidden lg:flex flex-1 bg-muted/40 items-center justify-center relative overflow-hidden">
        <div className="absolute top-4 left-4">
          <ModeToggle />
        </div>
        <div className="max-w-md px-8 py-12 relative z-10">
          <div className="mb-8 flex items-center gap-2">
            <CircleStackIcon className="h-10 w-10 text-primary" />
            <h1 className="text-3xl font-bold">MediaVault</h1>
          </div>
          <h2 className="text-3xl font-bold mb-4">Your media, organized and accessible.</h2>
          <p className="text-muted-foreground text-lg">
            Store, manage, and view all your media files from one secure platform.
          </p>
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-background/10 z-0" />
      </div>
      <div className="w-full lg:w-1/2 xl:w-2/5 flex flex-col items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md space-y-6">
          <div className="lg:hidden flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <CircleStackIcon className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold">MediaVault</h1>
            </div>
            <ModeToggle />
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/sidebar';
import Header from '@/components/header';
import { useAuth } from '@/contexts/auth-context';

export default function RootLayout() {
  const { user } = useAuth();
  
  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <Header user={user} />
        <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 pt-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
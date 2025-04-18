import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/sidebar';
import Header from '@/components/header';
import { useAuth } from '@/contexts/auth-context';

export default function RootLayout() {
  const { user } = useAuth();
  
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header user={user} />
        <main className="flex-1 p-4 md:p-6 lg:p-8 pt-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
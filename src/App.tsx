import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/auth-context';
import RootLayout from '@/layouts/root-layout';
import AuthLayout from '@/layouts/auth-layout';
import LoginPage from '@/pages/login';
import RegisterPage from '@/pages/register';
import DashboardPage from '@/pages/dashboard';
import AllFilesPage from '@/pages/all-files';
import UploadPage from '@/pages/upload';
import ViewerPage from '@/pages/viewer';
import SettingsPage from '@/pages/settings';
import AdminPage from '@/pages/admin';
import ProtectedRoute from '@/components/protected-route';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* Auth routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>
        
        {/* Protected routes */}
        <Route element={<ProtectedRoute><RootLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/all-files" element={<AllFilesPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/view/:id" element={<ViewerPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
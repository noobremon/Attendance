import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

import { AuthPage } from "@/pages/AuthPage";
import { FaceEnrollmentPage } from "@/pages/FaceEnrollmentPage";
import { MarkAttendancePage } from "@/pages/MarkAttendancePage";
import { AttendanceHistoryPage } from "@/pages/AttendanceHistoryPage";
import { AdminDashboardPage } from "@/pages/AdminDashboardPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

// Protected route wrapper
const ProtectedRoute: React.FC<{ 
  children: React.ReactNode; 
  requireAdmin?: boolean;
}> = ({ children, requireAdmin = false }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (requireAdmin && user.role !== 'ADMIN') {
    return <Navigate to="/mark-attendance" replace />;
  }

  return <>{children}</>;
};

// Public route wrapper (redirect if already logged in)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/mark-attendance" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/auth" replace />} />
      
      <Route 
        path="/auth" 
        element={
          <PublicRoute>
            <AuthPage />
          </PublicRoute>
        } 
      />
      
      <Route 
        path="/enroll-face" 
        element={
          <ProtectedRoute>
            <FaceEnrollmentPage />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/mark-attendance" 
        element={
          <ProtectedRoute>
            <MarkAttendancePage />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/history" 
        element={
          <ProtectedRoute>
            <AttendanceHistoryPage />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute requireAdmin>
            <AdminDashboardPage />
          </ProtectedRoute>
        } 
      />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

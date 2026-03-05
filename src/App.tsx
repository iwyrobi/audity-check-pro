import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useTrialStatus } from "@/hooks/useTrialStatus";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import TrialExpired from "./pages/TrialExpired";
import Dashboard from "./pages/Dashboard";
import Checklists from "./pages/Checklists";
import Inspections from "./pages/Inspections";
import InspectionDetail from "./pages/InspectionDetail";
import WorkOrders from "./pages/WorkOrders";
import Reports from "./pages/Reports";
import InspectionReport from "./pages/InspectionReport";
import WorkOrderReport from "./pages/WorkOrderReport";
import Settings from "./pages/Settings";
import RunInspection from "./pages/RunInspection";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { trialStatus, loading: trialLoading } = useTrialStatus();

  if (loading || trialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (trialStatus.trialExpired) {
    return <TrialExpired />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/auth" element={<Navigate to="/login" replace />} />

      {/* Protected routes */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/checklists" element={<ProtectedRoute><Checklists /></ProtectedRoute>} />
      <Route path="/inspections" element={<ProtectedRoute><Inspections /></ProtectedRoute>} />
      <Route path="/work-orders" element={<ProtectedRoute><WorkOrders /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/reports/inspections" element={<ProtectedRoute><InspectionReport /></ProtectedRoute>} />
      <Route path="/reports/work-orders" element={<ProtectedRoute><WorkOrderReport /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/run-inspection" element={<ProtectedRoute><RunInspection /></ProtectedRoute>} />
      <Route path="/inspections/:id" element={<ProtectedRoute><InspectionDetail /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

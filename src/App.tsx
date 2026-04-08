import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { getEffectivePlanStatus } from "@/lib/planStatus";
import Login from "./pages/Login";
import PlanChoice from "./pages/PlanChoice";
import TrialExpired from "./pages/TrialExpired";
import PlanExpired from "./pages/PlanExpired";
import PaymentPending from "./pages/PaymentPending";
import PaymentReview from "./pages/PaymentReview";
import RejectedPage from "./pages/RejectedPage";
import Dashboard from "./pages/Dashboard";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminClients from "./pages/admin/AdminClients";
import AdminFinancial from "./pages/admin/AdminFinancial";
import AdminPix from "./pages/admin/AdminPix";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminModuleRequests from "./pages/admin/AdminModuleRequests";
import AdminModuleCatalog from "./pages/admin/AdminModuleCatalog";
import AdminBasePlan from "./pages/admin/AdminBasePlan";
import ModulesUpgrade from "./pages/ModulesUpgrade";
import Financeiro from "./pages/Financeiro";
import Equipe from "./pages/Equipe";
import Relatorios from "./pages/Relatorios";
import ClientBasePlan from "./pages/ClientBasePlan";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, role, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  // Admin routes
  if (role === "admin") {
    return (
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="agenda" element={<Dashboard />} />
          <Route path="clients" element={<AdminClients />} />
          <Route path="financial" element={<AdminFinancial />} />
          <Route path="pix" element={<AdminPix />} />
          <Route path="modules" element={<AdminModuleRequests />} />
          <Route path="module-catalog" element={<AdminModuleCatalog />} />
          <Route path="base-plan" element={<AdminBasePlan />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    );
  }

  // Status-based routing for clients using centralized helper
  if (role === "client") {
    const effectiveStatus = getEffectivePlanStatus(profile);

    switch (effectiveStatus) {
      case "pending_plan_choice":
        return <Routes><Route path="*" element={<PlanChoice />} /></Routes>;

      case "trial":
      case "active":
        return (
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/modulos" element={<ModulesUpgrade />} />
            <Route path="/financeiro" element={<Financeiro />} />
            <Route path="/equipe" element={<Equipe />} />
            <Route path="/relatorios" element={<Relatorios />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        );

      case "trial_expired":
        return <Routes><Route path="*" element={<TrialExpired />} /></Routes>;

      case "expired":
        return <Routes><Route path="*" element={<PlanExpired />} /></Routes>;

      case "pending_payment":
        return <Routes><Route path="*" element={<PaymentPending />} /></Routes>;

      case "pending_review":
        return <Routes><Route path="*" element={<PaymentReview />} /></Routes>;

      case "rejected":
        return <Routes><Route path="*" element={<RejectedPage />} /></Routes>;

      case "blocked":
      default:
        return <Routes><Route path="*" element={<PaymentPending />} /></Routes>;
    }
  }

  // Fallback
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
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

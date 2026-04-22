import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AdminModeProvider } from "@/hooks/useAdminMode";
import { CompanyProvider } from "@/hooks/useCompany";
import { ThemeProvider } from "@/hooks/useTheme";
import { getEffectivePlanStatus } from "@/lib/planStatus";
import { TrialBanner } from "@/components/TrialBanner";
import { TrialExpiredModal } from "@/components/TrialExpiredModal";
import { UpdateBanner } from "@/components/desktop/UpdateBanner";

// Eager: páginas críticas para o bootstrap (login, dashboard principal e estados de bloqueio leves).
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import PlanChoice from "./pages/PlanChoice";
import TrialExpired from "./pages/TrialExpired";
import PlanExpired from "./pages/PlanExpired";
import PaymentPending from "./pages/PaymentPending";
import PaymentReview from "./pages/PaymentReview";
import RejectedPage from "./pages/RejectedPage";
import NotFound from "./pages/NotFound";

// Lazy: páginas administrativas (só carregam para admins).
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminClients = lazy(() => import("./pages/admin/AdminClients"));
const AdminFinancial = lazy(() => import("./pages/admin/AdminFinancial"));
const AdminPix = lazy(() => import("./pages/admin/AdminPix"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminModuleRequests = lazy(() => import("./pages/admin/AdminModuleRequests"));
const AdminModuleCatalog = lazy(() => import("./pages/admin/AdminModuleCatalog"));
const AdminModulePayments = lazy(() => import("./pages/admin/AdminModulePayments"));
const AdminBasePlan = lazy(() => import("./pages/admin/AdminBasePlan"));

// Lazy: páginas secundárias do cliente (Financeiro/Relatórios usam libs grandes como jspdf/recharts sob demanda).
const Financeiro = lazy(() => import("./pages/Financeiro"));
const Relatorios = lazy(() => import("./pages/Relatorios"));
const ModulesUpgrade = lazy(() => import("./pages/ModulesUpgrade"));
const ClientBasePlan = lazy(() => import("./pages/ClientBasePlan"));
const CompanyUsers = lazy(() => import("./pages/CompanyUsers"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));

const queryClient = new QueryClient();

function PageFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function AppRoutes() {
  const { user, role, profile, loading } = useAuth();

  if (loading) {
    return <PageFallback />;
  }

  // Public route: reset-password (precisa funcionar logado ou não, pois Supabase
  // cria sessão temporária ao clicar no link de recovery)
  if (typeof window !== "undefined" && window.location.pathname === "/reset-password") {
    return (
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/reset-password" element={<ResetPassword />} />
        </Routes>
      </Suspense>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/unsubscribe" element={<Unsubscribe />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="*" element={<Login />} />
        </Routes>
      </Suspense>
    );
  }

  // Admin routes
  if (role === "admin") {
    return (
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="agenda" element={<Dashboard />} />
            <Route path="clients" element={<AdminClients />} />
            <Route path="financial" element={<AdminFinancial />} />
            <Route path="pix" element={<AdminPix />} />
            <Route path="modules" element={<AdminModuleRequests />} />
            <Route path="module-catalog" element={<AdminModuleCatalog />} />
            <Route path="module-payments" element={<AdminModulePayments />} />
            <Route path="base-plan" element={<AdminBasePlan />} />
            <Route path="settings" element={<AdminSettings />} />
            {/* Minha Empresa routes */}
            <Route path="empresa" element={<Dashboard />} />
            <Route path="empresa/financeiro" element={<Financeiro />} />
            <Route path="empresa/relatorios" element={<Relatorios />} />
            <Route path="empresa/usuarios" element={<CompanyUsers />} />
            <Route path="empresa/modulos" element={<ModulesUpgrade />} />
            <Route path="empresa/meu-plano" element={<ClientBasePlan />} />
          </Route>
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </Suspense>
    );
  }

  // Status-based routing for clients using centralized helper
  if (role === "client") {
    const effectiveStatus = getEffectivePlanStatus(profile);

    switch (effectiveStatus) {
      case "pending_plan_choice":
        return (
          <Suspense fallback={<PageFallback />}>
            <Routes><Route path="*" element={<PlanChoice />} /></Routes>
          </Suspense>
        );

      case "trial":
      case "active":
        return (
          <>
            <TrialBanner />
            <TrialExpiredModal />
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/meu-plano" element={<ClientBasePlan />} />
                <Route path="/modulos" element={<ModulesUpgrade />} />
                <Route path="/financeiro" element={<Financeiro />} />
                <Route path="/usuarios" element={<CompanyUsers />} />
                <Route path="/relatorios" element={<Relatorios />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </>
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
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <UpdateBanner />
        <BrowserRouter>
          <AuthProvider>
            <CompanyProvider>
              <AdminModeProvider>
                <AppRoutes />
              </AdminModeProvider>
            </CompanyProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

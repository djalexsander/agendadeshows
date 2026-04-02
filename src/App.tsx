import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Login from "./pages/Login";
import PendingApproval from "./pages/PendingApproval";
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

  const status = profile?.status_plano;

  // Status-based routing for clients
  if (role === "client") {
    if (status === "pendente_aprovacao") {
      return (
        <Routes>
          <Route path="*" element={<PendingApproval />} />
        </Routes>
      );
    }

    if (status === "aguardando_pagamento" || status === "pendente_pagamento") {
      return (
        <Routes>
          <Route path="*" element={<PaymentPending />} />
        </Routes>
      );
    }

    if (status === "pagamento_em_analise") {
      return (
        <Routes>
          <Route path="*" element={<PaymentReview />} />
        </Routes>
      );
    }

    if (status === "rejeitado") {
      return (
        <Routes>
          <Route path="*" element={<RejectedPage />} />
        </Routes>
      );
    }

    if (status === "inativo") {
      return (
        <Routes>
          <Route path="*" element={<PaymentPending />} />
        </Routes>
      );
    }

    // ativo — full access
    return (
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
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
        </Route>
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    );
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

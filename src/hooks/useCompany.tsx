import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type CompanyRole = "admin" | "collaborator" | "viewer";

export interface Company {
  id: string;
  name: string;
  owner_user_id: string;
}

export interface CompanyMember {
  id: string;
  company_id: string;
  user_id: string;
  role: CompanyRole;
  active: boolean;
  invited_by: string | null;
  created_at: string;
  profile?: { nome: string; email: string };
}

export interface CompanyInvitation {
  id: string;
  company_id: string;
  email: string;
  role: CompanyRole;
  status: string;
  expires_at: string;
  created_at: string;
}

interface CompanyContextType {
  company: Company | null;
  companyRole: CompanyRole | null;
  members: CompanyMember[];
  invitations: CompanyInvitation[];
  loading: boolean;
  isCompanyAdmin: boolean;
  canEdit: boolean;
  canView: boolean;
  canManageFinancial: boolean;
  refreshMembers: () => Promise<void>;
  refreshInvitations: () => Promise<void>;
  inviteMember: (email: string, role: CompanyRole) => Promise<{ error: string | null }>;
  updateMemberRole: (memberId: string, role: CompanyRole) => Promise<void>;
  toggleMemberActive: (memberId: string, active: boolean) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
  cancelInvitation: (invitationId: string) => Promise<void>;
  linkExistingUser: (email: string, role: CompanyRole) => Promise<{ error: string | null }>;
}

const CompanyContext = createContext<CompanyContextType>({} as CompanyContextType);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [companyRole, setCompanyRole] = useState<CompanyRole | null>(null);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [invitations, setInvitations] = useState<CompanyInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch company and role for current user
  useEffect(() => {
    if (!user) {
      setCompany(null);
      setCompanyRole(null);
      setMembers([]);
      setInvitations([]);
      setLoading(false);
      return;
    }

    const fetchCompany = async () => {
      setLoading(true);

      // Get user's company membership
      const { data: membership } = await supabase
        .from("company_members")
        .select("company_id, role")
        .eq("user_id", user.id)
        .eq("active", true)
        .limit(1)
        .single();

      if (!membership) {
        setLoading(false);
        return;
      }

      setCompanyRole(membership.role as CompanyRole);

      // Fetch company details
      const { data: companyData } = await supabase
        .from("companies")
        .select("*")
        .eq("id", membership.company_id)
        .single();

      if (companyData) {
        setCompany(companyData as Company);
      }

      setLoading(false);
    };

    fetchCompany();
  }, [user]);

  const refreshMembers = useCallback(async () => {
    if (!company) return;
    const { data } = await supabase
      .from("company_members")
      .select("*")
      .eq("company_id", company.id)
      .order("created_at", { ascending: true });

    if (data) {
      // Enrich with profile data
      const userIds = data.map((m: any) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, nome, email")
        .in("user_id", userIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, { nome: p.nome, email: p.email }]));

      setMembers(
        data.map((m: any) => ({
          ...m,
          profile: profileMap.get(m.user_id) || undefined,
        }))
      );
    }
  }, [company]);

  const refreshInvitations = useCallback(async () => {
    if (!company) return;
    const { data } = await supabase
      .from("company_invitations")
      .select("*")
      .eq("company_id", company.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    setInvitations((data as CompanyInvitation[]) || []);
  }, [company]);

  useEffect(() => {
    if (company) {
      refreshMembers();
      refreshInvitations();
    }
  }, [company, refreshMembers, refreshInvitations]);

  const inviteMember = useCallback(async (email: string, role: CompanyRole) => {
    if (!company || !user) return { error: "Sem empresa" };

    // Try insert first; if duplicate, update existing pending invitation
    const { error: insertErr } = await (supabase.from("company_invitations") as any).insert({
      company_id: company.id,
      email,
      role,
      invited_by: user.id,
    });

    if (insertErr) {
      // Duplicate pending invitation — update it instead
      if (insertErr.code === "23505") {
        const { error: updateErr } = await (supabase.from("company_invitations") as any)
          .update({
            role,
            invited_by: user.id,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            token: crypto.randomUUID(),
            updated_at: new Date().toISOString(),
          })
          .eq("company_id", company.id)
          .eq("email", email)
          .eq("status", "pending");
        if (updateErr) return { error: updateErr.message };
      } else {
        return { error: insertErr.message };
      }
    }

    // Send invitation email
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("nome")
        .eq("user_id", user.id)
        .single();

      await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "agenda-invitation",
          recipientEmail: email,
          idempotencyKey: `invite-${company.id}-${email}-${Date.now()}`,
          templateData: {
            companyName: company.name,
            inviterName: profile?.nome || "Um administrador",
            role,
            acceptUrl: window.location.origin,
          },
        },
      });
    } catch (emailErr) {
      console.warn("Invitation email failed (invite still created):", emailErr);
    }

    await refreshInvitations();
    return { error: null };
  }, [company, user, refreshInvitations]);

  const linkExistingUser = useCallback(async (email: string, role: CompanyRole) => {
    if (!company || !user) return { error: "Sem empresa" };

    // Find user by email in profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("email", email)
      .single();

    if (!profile) return { error: "Usuário não encontrado" };

    const { error } = await (supabase.from("company_members") as any).insert({
      company_id: company.id,
      user_id: profile.user_id,
      role,
      invited_by: user.id,
    });

    if (error) {
      if (error.code === "23505") return { error: "Usuário já é membro" };
      return { error: error.message };
    }
    await refreshMembers();
    return { error: null };
  }, [company, user, refreshMembers]);

  const updateMemberRole = useCallback(async (memberId: string, role: CompanyRole) => {
    await (supabase.from("company_members") as any).update({ role }).eq("id", memberId);
    await refreshMembers();
  }, [refreshMembers]);

  const toggleMemberActive = useCallback(async (memberId: string, active: boolean) => {
    await (supabase.from("company_members") as any).update({ active }).eq("id", memberId);
    await refreshMembers();
  }, [refreshMembers]);

  const removeMember = useCallback(async (memberId: string) => {
    await (supabase.from("company_members") as any).delete().eq("id", memberId);
    await refreshMembers();
  }, [refreshMembers]);

  const cancelInvitation = useCallback(async (invitationId: string) => {
    await (supabase.from("company_invitations") as any).update({ status: "cancelled" }).eq("id", invitationId);
    await refreshInvitations();
  }, [refreshInvitations]);

  const isCompanyAdmin = companyRole === "admin";
  const canEdit = companyRole === "admin" || companyRole === "collaborator";
  const canView = companyRole !== null;
  const canManageFinancial = companyRole === "admin";

  return (
    <CompanyContext.Provider
      value={{
        company,
        companyRole,
        members,
        invitations,
        loading,
        isCompanyAdmin,
        canEdit,
        canView,
        canManageFinancial,
        refreshMembers,
        refreshInvitations,
        inviteMember,
        updateMemberRole,
        toggleMemberActive,
        removeMember,
        cancelInvitation,
        linkExistingUser,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export const useCompany = () => useContext(CompanyContext);

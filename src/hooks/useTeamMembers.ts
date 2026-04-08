import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface TeamMember {
  id: string;
  name: string;
  role: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
}

export function useTeamMembers() {
  const { user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setMembers([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("team_members")
      .select("id, name, role, phone, email, notes, created_at")
      .eq("user_id", user.id)
      .order("name", { ascending: true });
    setMembers((data as TeamMember[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const addMember = useCallback(async (member: { name: string; role?: string; phone?: string; email?: string; notes?: string }) => {
    if (!user) return { error: "Não autenticado" };
    const { error } = await (supabase.from("team_members") as any).insert({
      user_id: user.id,
      ...member,
    });
    if (error) return { error: error.message };
    await fetch();
    return { error: null };
  }, [user, fetch]);

  const deleteMember = useCallback(async (id: string) => {
    await (supabase.from("team_members") as any).delete().eq("id", id);
    await fetch();
  }, [fetch]);

  return { members, loading, addMember, deleteMember, refresh: fetch };
}

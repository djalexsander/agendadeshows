export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admin_notifications: {
        Row: {
          created_at: string
          id: string
          lida: boolean
          mensagem: string
          referencia_user_id: string | null
          tipo: string
          titulo: string
        }
        Insert: {
          created_at?: string
          id?: string
          lida?: boolean
          mensagem?: string
          referencia_user_id?: string | null
          tipo?: string
          titulo?: string
        }
        Update: {
          created_at?: string
          id?: string
          lida?: boolean
          mensagem?: string
          referencia_user_id?: string | null
          tipo?: string
          titulo?: string
        }
        Relationships: []
      }
      base_plan_config: {
        Row: {
          active: boolean
          billing_period: string
          created_at: string
          id: string
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          billing_period?: string
          created_at?: string
          id?: string
          name?: string
          price?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          billing_period?: string
          created_at?: string
          id?: string
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      base_plan_payments: {
        Row: {
          amount: number
          asaas_customer_id: string | null
          asaas_payment_id: string | null
          billing_period: string
          created_at: string
          gateway_provider: string | null
          gateway_status: string | null
          hidden_in_admin: boolean
          id: string
          notes: string | null
          pix_expiration_date: string | null
          pix_payload: string | null
          pix_qr_code_image: string | null
          receipt_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          billing_period?: string
          created_at?: string
          gateway_provider?: string | null
          gateway_status?: string | null
          hidden_in_admin?: boolean
          id?: string
          notes?: string | null
          pix_expiration_date?: string | null
          pix_payload?: string | null
          pix_qr_code_image?: string | null
          receipt_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          billing_period?: string
          created_at?: string
          gateway_provider?: string | null
          gateway_status?: string | null
          hidden_in_admin?: boolean
          id?: string
          notes?: string | null
          pix_expiration_date?: string | null
          pix_payload?: string | null
          pix_qr_code_image?: string | null
          receipt_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          created_at: string
          id: string
          max_users: number
          name: string
          owner_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_users?: number
          name: string
          owner_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          max_users?: number
          name?: string
          owner_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_invitations: {
        Row: {
          company_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["company_role"]
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["company_role"]
          status?: string
          token?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["company_role"]
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_members: {
        Row: {
          active: boolean
          company_id: string
          created_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["company_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          company_id: string
          created_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["company_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          company_id?: string
          created_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["company_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_entries: {
        Row: {
          amount: number
          categoria: string | null
          company_id: string | null
          comprovante_url: string | null
          created_at: string
          data_lancamento: string
          data_pagamento: string | null
          data_vencimento: string | null
          event_date: string | null
          event_name: string | null
          forma_pagamento: string | null
          id: string
          notes: string | null
          parcela_atual: number
          parcelas: number
          pessoa: string | null
          recorrencia: string
          show_id: string | null
          status: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          categoria?: string | null
          company_id?: string | null
          comprovante_url?: string | null
          created_at?: string
          data_lancamento?: string
          data_pagamento?: string | null
          data_vencimento?: string | null
          event_date?: string | null
          event_name?: string | null
          forma_pagamento?: string | null
          id?: string
          notes?: string | null
          parcela_atual?: number
          parcelas?: number
          pessoa?: string | null
          recorrencia?: string
          show_id?: string | null
          status?: string
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          categoria?: string | null
          company_id?: string | null
          comprovante_url?: string | null
          created_at?: string
          data_lancamento?: string
          data_pagamento?: string | null
          data_vencimento?: string | null
          event_date?: string | null
          event_name?: string | null
          forma_pagamento?: string | null
          id?: string
          notes?: string | null
          parcela_atual?: number
          parcelas?: number
          pessoa?: string | null
          recorrencia?: string
          show_id?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      module_catalog: {
        Row: {
          active: boolean
          billing_period: string
          created_at: string
          description: string | null
          display_name: string
          id: string
          max_users_default: number
          module_name: string
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          billing_period?: string
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          max_users_default?: number
          module_name: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          billing_period?: string
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          max_users_default?: number
          module_name?: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      module_payments: {
        Row: {
          amount: number
          asaas_customer_id: string | null
          asaas_payment_id: string | null
          created_at: string
          gateway_provider: string | null
          gateway_status: string | null
          hidden_in_admin: boolean
          id: string
          module_name: string
          notes: string | null
          pix_expiration_date: string | null
          pix_payload: string | null
          pix_qr_code_image: string | null
          receipt_url: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          created_at?: string
          gateway_provider?: string | null
          gateway_status?: string | null
          hidden_in_admin?: boolean
          id?: string
          module_name: string
          notes?: string | null
          pix_expiration_date?: string | null
          pix_payload?: string | null
          pix_qr_code_image?: string | null
          receipt_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          created_at?: string
          gateway_provider?: string | null
          gateway_status?: string | null
          hidden_in_admin?: boolean
          id?: string
          module_name?: string
          notes?: string | null
          pix_expiration_date?: string | null
          pix_payload?: string | null
          pix_qr_code_image?: string | null
          receipt_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      module_requests: {
        Row: {
          created_at: string
          id: string
          module_name: string
          notes: string | null
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          module_name: string
          notes?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          module_name?: string
          notes?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_proofs: {
        Row: {
          client_user_id: string
          created_at: string
          id: string
          image_url: string
          mensagem: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          client_user_id: string
          created_at?: string
          id?: string
          image_url?: string
          mensagem?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          client_user_id?: string
          created_at?: string
          id?: string
          image_url?: string
          mensagem?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          client_user_id: string
          created_at: string
          data_pagamento: string | null
          data_vencimento: string | null
          forma_pagamento: string | null
          id: string
          observacoes: string | null
          status: string | null
          updated_at: string
          valor: number
        }
        Insert: {
          client_user_id: string
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string | null
          forma_pagamento?: string | null
          id?: string
          observacoes?: string | null
          status?: string | null
          updated_at?: string
          valor?: number
        }
        Update: {
          client_user_id?: string
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string | null
          forma_pagamento?: string | null
          id?: string
          observacoes?: string | null
          status?: string | null
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
      pix_config: {
        Row: {
          admin_user_id: string
          chave_pix: string
          cidade_beneficiario: string | null
          copia_cola: string | null
          created_at: string
          id: string
          nome_beneficiario: string | null
          qr_code_base64: string | null
          tipo_chave: string | null
          updated_at: string
        }
        Insert: {
          admin_user_id: string
          chave_pix?: string
          cidade_beneficiario?: string | null
          copia_cola?: string | null
          created_at?: string
          id?: string
          nome_beneficiario?: string | null
          qr_code_base64?: string | null
          tipo_chave?: string | null
          updated_at?: string
        }
        Update: {
          admin_user_id?: string
          chave_pix?: string
          cidade_beneficiario?: string | null
          copia_cola?: string | null
          created_at?: string
          id?: string
          nome_beneficiario?: string | null
          qr_code_base64?: string | null
          tipo_chave?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          cidade: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          data_aprovacao_pagamento: string | null
          data_envio_comprovante: string | null
          email: string
          estado: string | null
          id: string
          is_paid: boolean | null
          nome: string
          nome_artistico: string | null
          observacoes: string | null
          origem_cadastro: string | null
          paid_at: string | null
          plan_type: string | null
          primeiro_acesso: boolean | null
          status_plano: string | null
          telefone: string | null
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string
          user_id: string
          valor_padrao_na_data: number | null
          valor_plano: number | null
          vencimento: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          cidade?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          data_aprovacao_pagamento?: string | null
          data_envio_comprovante?: string | null
          email?: string
          estado?: string | null
          id?: string
          is_paid?: boolean | null
          nome?: string
          nome_artistico?: string | null
          observacoes?: string | null
          origem_cadastro?: string | null
          paid_at?: string | null
          plan_type?: string | null
          primeiro_acesso?: boolean | null
          status_plano?: string | null
          telefone?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          user_id: string
          valor_padrao_na_data?: number | null
          valor_plano?: number | null
          vencimento?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          cidade?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          data_aprovacao_pagamento?: string | null
          data_envio_comprovante?: string | null
          email?: string
          estado?: string | null
          id?: string
          is_paid?: boolean | null
          nome?: string
          nome_artistico?: string | null
          observacoes?: string | null
          origem_cadastro?: string | null
          paid_at?: string | null
          plan_type?: string | null
          primeiro_acesso?: boolean | null
          status_plano?: string | null
          telefone?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          user_id?: string
          valor_padrao_na_data?: number | null
          valor_plano?: number | null
          vencimento?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      shows: {
        Row: {
          cidade: string
          com_quem_evento: string | null
          company_id: string | null
          created_at: string
          date: string
          endereco: string | null
          estado: string
          evento: string | null
          horario: string | null
          id: string
          local: string | null
          observacoes: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cidade: string
          com_quem_evento?: string | null
          company_id?: string | null
          created_at?: string
          date: string
          endereco?: string | null
          estado?: string
          evento?: string | null
          horario?: string | null
          id?: string
          local?: string | null
          observacoes?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cidade?: string
          com_quem_evento?: string | null
          company_id?: string | null
          created_at?: string
          date?: string
          endereco?: string | null
          estado?: string
          evento?: string | null
          horario?: string | null
          id?: string
          local?: string | null
          observacoes?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shows_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      signup_config: {
        Row: {
          cadastro_ativo: boolean
          created_at: string
          id: string
          instrucoes_pagamento: string | null
          trial_days: number
          updated_at: string
          valor_padrao: number
        }
        Insert: {
          cadastro_ativo?: boolean
          created_at?: string
          id?: string
          instrucoes_pagamento?: string | null
          trial_days?: number
          updated_at?: string
          valor_padrao?: number
        }
        Update: {
          cadastro_ativo?: boolean
          created_at?: string
          id?: string
          instrucoes_pagamento?: string | null
          trial_days?: number
          updated_at?: string
          valor_padrao?: number
        }
        Relationships: []
      }
      team_members: {
        Row: {
          company_id: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      trial_module_selections: {
        Row: {
          created_at: string
          id: string
          module_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          module_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          module_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_modules: {
        Row: {
          active: boolean
          created_at: string
          id: string
          module_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          module_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          module_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_company_id: { Args: { _user_id: string }; Returns: string }
      get_user_company_role: {
        Args: { _company_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["company_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_company_admin: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_company_member: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "client"
      company_role: "admin" | "collaborator" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "client"],
      company_role: ["admin", "collaborator", "viewer"],
    },
  },
} as const

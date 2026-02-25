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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      clientes: {
        Row: {
          cnpj: string | null
          cpf: string | null
          created_at: string | null
          data_nascimento: string | null
          id: string
          inscricao_estadual: string | null
          nome_completo: string | null
          nome_fantasia: string | null
          razao_social: string | null
          rg: string | null
          tipo_pessoa: string
          user_id: string | null
        }
        Insert: {
          cnpj?: string | null
          cpf?: string | null
          created_at?: string | null
          data_nascimento?: string | null
          id?: string
          inscricao_estadual?: string | null
          nome_completo?: string | null
          nome_fantasia?: string | null
          razao_social?: string | null
          rg?: string | null
          tipo_pessoa: string
          user_id?: string | null
        }
        Update: {
          cnpj?: string | null
          cpf?: string | null
          created_at?: string | null
          data_nascimento?: string | null
          id?: string
          inscricao_estadual?: string | null
          nome_completo?: string | null
          nome_fantasia?: string | null
          razao_social?: string | null
          rg?: string | null
          tipo_pessoa?: string
          user_id?: string | null
        }
        Relationships: []
      }
      contatos: {
        Row: {
          cargo: string | null
          cliente_id: string | null
          created_at: string | null
          email: string | null
          id: string
          nome: string | null
          principal: boolean | null
          telefone: string | null
        }
        Insert: {
          cargo?: string | null
          cliente_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          nome?: string | null
          principal?: boolean | null
          telefone?: string | null
        }
        Update: {
          cargo?: string | null
          cliente_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          nome?: string | null
          principal?: boolean | null
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contatos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos: {
        Row: {
          cliente_id: string | null
          created_at: string | null
          data_fim: string | null
          data_inicio: string | null
          id: string
          numero: string | null
          status: string | null
          valor: number | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          numero?: string | null
          status?: string | null
          valor?: number | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          numero?: string | null
          status?: string | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      enderecos: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          cliente_id: string | null
          complemento: string | null
          created_at: string | null
          estado: string | null
          id: string
          logradouro: string | null
          numero: string | null
          tema: string | null
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cliente_id?: string | null
          complemento?: string | null
          created_at?: string | null
          estado?: string | null
          id?: string
          logradouro?: string | null
          numero?: string | null
          tema?: string | null
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cliente_id?: string | null
          complemento?: string | null
          created_at?: string | null
          estado?: string | null
          id?: string
          logradouro?: string | null
          numero?: string | null
          tema?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enderecos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos: {
        Row: {
          created_at: string | null
          id: string
          nome: string
          contato_principal: string | null
          promotor_email: string | null
          promotor_endereco: string | null
          promotor_nome: string | null
          promotor_redes_sociais: Json | null
          promotor_telefone: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
          contato_principal?: string | null
          promotor_email?: string | null
          promotor_endereco?: string | null
          promotor_nome?: string | null
          promotor_redes_sociais?: Json | null
          promotor_telefone?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
          contato_principal?: string | null
          promotor_email?: string | null
          promotor_endereco?: string | null
          promotor_nome?: string | null
          promotor_redes_sociais?: Json | null
          promotor_telefone?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      eventos_edicoes: {
        Row: {
          ano: number
          ativo: boolean
          created_at: string | null
          data_fim: string | null
          data_inicio: string | null
          desmontagem_fim: string | null
          desmontagem_inicio: string | null
          evento_id: string | null
          id: string
          local_completo: string | null
          local_resumido: string | null
          montagem_fim: string | null
          montagem_inicio: string | null
          titulo: string
          user_id: string | null
        }
        Insert: {
          ano: number
          ativo?: boolean
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          desmontagem_fim?: string | null
          desmontagem_inicio?: string | null
          evento_id?: string | null
          id?: string
          local_completo?: string | null
          local_resumido?: string | null
          montagem_fim?: string | null
          montagem_inicio?: string | null
          titulo: string
          user_id?: string | null
        }
        Update: {
          ano?: number
          ativo?: boolean
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          desmontagem_fim?: string | null
          desmontagem_inicio?: string | null
          evento_id?: string | null
          id?: string
          local_completo?: string | null
          local_resumido?: string | null
          montagem_fim?: string | null
          montagem_inicio?: string | null
          titulo?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eventos_edicoes_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_opcionais: {
        Row: {
          created_at: string | null
          id: string
          nome: string
          preco_base: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
          preco_base?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
          preco_base?: number
        }
        Relationships: []
      }
      planilha_configuracoes: {
        Row: {
          categorias_config: Json
          created_at: string | null
          edicao_id: string | null
          id: string
          opcionais_ativos: string[] | null
          opcionais_precos: Json | null
          updated_at: string | null
        }
        Insert: {
          categorias_config: Json
          created_at?: string | null
          edicao_id?: string | null
          id?: string
          opcionais_ativos?: string[] | null
          opcionais_precos?: Json | null
          updated_at?: string | null
        }
        Update: {
          categorias_config?: Json
          created_at?: string | null
          edicao_id?: string | null
          id?: string
          opcionais_ativos?: string[] | null
          opcionais_precos?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planilha_configuracoes_edicao_id_fkey"
            columns: ["edicao_id"]
            isOneToOne: false
            referencedRelation: "eventos_edicoes"
            referencedColumns: ["id"]
          },
        ]
      }
      planilha_vendas_estandes: {
        Row: {
          cliente_id: string | null
          cliente_nome_livre: string | null
          config_id: string | null
          created_at: string | null
          desconto: number | null
          id: string
          observacoes: string | null
          opcionais_selecionados: Json | null
          stand_nr: string
          tipo_venda: string
          updated_at: string | null
          valor_pago: number | null
        }
        Insert: {
          cliente_id?: string | null
          cliente_nome_livre?: string | null
          config_id?: string | null
          created_at?: string | null
          desconto?: number | null
          id?: string
          observacoes?: string | null
          opcionais_selecionados?: Json | null
          stand_nr: string
          tipo_venda?: string
          updated_at?: string | null
          valor_pago?: number | null
        }
        Update: {
          cliente_id?: string | null
          cliente_nome_livre?: string | null
          config_id?: string | null
          created_at?: string | null
          desconto?: number | null
          id?: string
          observacoes?: string | null
          opcionais_selecionados?: Json | null
          stand_nr?: string
          tipo_venda?: string
          updated_at?: string | null
          valor_pago?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "planilha_vendas_estandes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planilha_vendas_estandes_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "planilha_configuracoes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

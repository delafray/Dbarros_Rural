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
      atendimentos: {
        Row: {
          cliente_id: string | null
          cliente_nome: string | null
          contato_id: string | null
          contato_nome: string | null
          created_at: string | null
          data_retorno: string | null
          edicao_id: string
          id: string
          probabilidade: number | null
          resolvido: boolean | null
          telefone: string | null
          ultima_obs: string | null
          ultima_obs_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          cliente_id?: string | null
          cliente_nome?: string | null
          contato_id?: string | null
          contato_nome?: string | null
          created_at?: string | null
          data_retorno?: string | null
          edicao_id: string
          id?: string
          probabilidade?: number | null
          resolvido?: boolean | null
          telefone?: string | null
          ultima_obs?: string | null
          ultima_obs_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          cliente_id?: string | null
          cliente_nome?: string | null
          contato_id?: string | null
          contato_nome?: string | null
          created_at?: string | null
          data_retorno?: string | null
          edicao_id?: string
          id?: string
          probabilidade?: number | null
          resolvido?: boolean | null
          telefone?: string | null
          ultima_obs?: string | null
          ultima_obs_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "atendimentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atendimentos_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atendimentos_edicao_id_fkey"
            columns: ["edicao_id"]
            isOneToOne: false
            referencedRelation: "eventos_edicoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atendimentos_user_id_public_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      atendimentos_historico: {
        Row: {
          atendimento_id: string
          created_at: string | null
          data_retorno: string | null
          descricao: string
          id: string
          probabilidade: number | null
          resolvido: boolean | null
          user_id: string | null
        }
        Insert: {
          atendimento_id: string
          created_at?: string | null
          data_retorno?: string | null
          descricao: string
          id?: string
          probabilidade?: number | null
          resolvido?: boolean | null
          user_id?: string | null
        }
        Update: {
          atendimento_id?: string
          created_at?: string | null
          data_retorno?: string | null
          descricao?: string
          id?: string
          probabilidade?: number | null
          resolvido?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "atendimentos_historico_atendimento_id_fkey"
            columns: ["atendimento_id"]
            isOneToOne: false
            referencedRelation: "atendimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atendimentos_historico_user_id_public_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
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
      edicao_imagens_config: {
        Row: {
          avulso_obs: string | null
          avulso_status: string
          criado_em: string
          descricao: string
          dimensoes: string | null
          edicao_id: string
          id: string
          origem_ref: string
          origem_tipo: string
          tipo: string
        }
        Insert: {
          avulso_obs?: string | null
          avulso_status?: string
          criado_em?: string
          descricao: string
          dimensoes?: string | null
          edicao_id: string
          id?: string
          origem_ref: string
          origem_tipo: string
          tipo?: string
        }
        Update: {
          avulso_obs?: string | null
          avulso_status?: string
          criado_em?: string
          descricao?: string
          dimensoes?: string | null
          edicao_id?: string
          id?: string
          origem_ref?: string
          origem_tipo?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "edicao_imagens_config_edicao_id_fkey"
            columns: ["edicao_id"]
            isOneToOne: false
            referencedRelation: "eventos_edicoes"
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
          contato_principal: string | null
          created_at: string | null
          id: string
          master_user_id: string | null
          nome: string
          promotor_email: string | null
          promotor_endereco: string | null
          promotor_nome: string | null
          promotor_redes_sociais: Json | null
          promotor_telefone: string | null
          user_id: string | null
        }
        Insert: {
          contato_principal?: string | null
          created_at?: string | null
          id?: string
          master_user_id?: string | null
          nome: string
          promotor_email?: string | null
          promotor_endereco?: string | null
          promotor_nome?: string | null
          promotor_redes_sociais?: Json | null
          promotor_telefone?: string | null
          user_id?: string | null
        }
        Update: {
          contato_principal?: string | null
          created_at?: string | null
          id?: string
          master_user_id?: string | null
          nome?: string
          promotor_email?: string | null
          promotor_endereco?: string | null
          promotor_nome?: string | null
          promotor_redes_sociais?: Json | null
          promotor_telefone?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eventos_master_user_id_fkey"
            columns: ["master_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
          email_oficial: string | null
          evento_id: string | null
          id: string
          local_completo: string | null
          local_resumido: string | null
          montagem_fim: string | null
          montagem_inicio: string | null
          planta_baixa_path: string | null
          proposta_comercial_path: string | null
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
          email_oficial?: string | null
          evento_id?: string | null
          id?: string
          local_completo?: string | null
          local_resumido?: string | null
          montagem_fim?: string | null
          montagem_inicio?: string | null
          planta_baixa_path?: string | null
          proposta_comercial_path?: string | null
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
          email_oficial?: string | null
          evento_id?: string | null
          id?: string
          local_completo?: string | null
          local_resumido?: string | null
          montagem_fim?: string | null
          montagem_inicio?: string | null
          planta_baixa_path?: string | null
          proposta_comercial_path?: string | null
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
          tipo_padrao: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
          preco_base?: number
          tipo_padrao?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
          preco_base?: number
          tipo_padrao?: string | null
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
          opcionais_nomes: Json | null
          opcionais_precos: Json | null
          updated_at: string | null
        }
        Insert: {
          categorias_config: Json
          created_at?: string | null
          edicao_id?: string | null
          id?: string
          opcionais_ativos?: string[] | null
          opcionais_nomes?: Json | null
          opcionais_precos?: Json | null
          updated_at?: string | null
        }
        Update: {
          categorias_config?: Json
          created_at?: string | null
          edicao_id?: string | null
          id?: string
          opcionais_ativos?: string[] | null
          opcionais_nomes?: Json | null
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
          area_m2: number | null
          cliente_id: string | null
          cliente_nome_livre: string | null
          combo_overrides: Json | null
          config_id: string | null
          created_at: string | null
          desconto: number | null
          id: string
          observacoes: string | null
          opcionais_selecionados: Json | null
          preco_m2_override: number | null
          stand_nr: string
          tipo_venda: string
          total_override: number | null
          updated_at: string | null
          valor_pago: number | null
        }
        Insert: {
          area_m2?: number | null
          cliente_id?: string | null
          cliente_nome_livre?: string | null
          combo_overrides?: Json | null
          config_id?: string | null
          created_at?: string | null
          desconto?: number | null
          id?: string
          observacoes?: string | null
          opcionais_selecionados?: Json | null
          preco_m2_override?: number | null
          stand_nr: string
          tipo_venda?: string
          total_override?: number | null
          updated_at?: string | null
          valor_pago?: number | null
        }
        Update: {
          area_m2?: number | null
          cliente_id?: string | null
          cliente_nome_livre?: string | null
          combo_overrides?: Json | null
          config_id?: string | null
          created_at?: string | null
          desconto?: number | null
          id?: string
          observacoes?: string | null
          opcionais_selecionados?: Json | null
          preco_m2_override?: number | null
          stand_nr?: string
          tipo_venda?: string
          total_override?: number | null
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
      stand_imagem_recebimentos: {
        Row: {
          atualizado_em: string
          estande_id: string
          id: string
          imagem_config_id: string
          recebido: boolean
        }
        Insert: {
          atualizado_em?: string
          estande_id: string
          id?: string
          imagem_config_id: string
          recebido?: boolean
        }
        Update: {
          atualizado_em?: string
          estande_id?: string
          id?: string
          imagem_config_id?: string
          recebido?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "stand_imagem_recebimentos_estande_id_fkey"
            columns: ["estande_id"]
            isOneToOne: false
            referencedRelation: "planilha_vendas_estandes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stand_imagem_recebimentos_imagem_config_id_fkey"
            columns: ["imagem_config_id"]
            isOneToOne: false
            referencedRelation: "edicao_imagens_config"
            referencedColumns: ["id"]
          },
        ]
      }
      stand_imagens_status: {
        Row: {
          atualizado_em: string
          completo_em: string | null
          estande_id: string
          id: string
          observacoes: string | null
          pendente_em: string | null
          solicitado_em: string | null
          status: string
        }
        Insert: {
          atualizado_em?: string
          completo_em?: string | null
          estande_id: string
          id?: string
          observacoes?: string | null
          pendente_em?: string | null
          solicitado_em?: string | null
          status?: string
        }
        Update: {
          atualizado_em?: string
          completo_em?: string | null
          estande_id?: string
          id?: string
          observacoes?: string | null
          pendente_em?: string | null
          solicitado_em?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "stand_imagens_status_estande_id_fkey"
            columns: ["estande_id"]
            isOneToOne: true
            referencedRelation: "planilha_vendas_estandes"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefas: {
        Row: {
          created_at: string | null
          data_prazo: string | null
          descricao: string | null
          edicao_id: string
          id: string
          prioridade: string
          responsavel_id: string | null
          status: string
          titulo: string
          ultima_obs: string | null
          ultima_obs_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          data_prazo?: string | null
          descricao?: string | null
          edicao_id: string
          id?: string
          prioridade?: string
          responsavel_id?: string | null
          status?: string
          titulo: string
          ultima_obs?: string | null
          ultima_obs_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          data_prazo?: string | null
          descricao?: string | null
          edicao_id?: string
          id?: string
          prioridade?: string
          responsavel_id?: string | null
          status?: string
          titulo?: string
          ultima_obs?: string | null
          ultima_obs_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_edicao_id_fkey"
            columns: ["edicao_id"]
            isOneToOne: false
            referencedRelation: "eventos_edicoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefas_historico: {
        Row: {
          created_at: string | null
          descricao: string
          id: string
          status_anterior: string | null
          status_novo: string | null
          tarefa_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          descricao: string
          id?: string
          status_anterior?: string | null
          status_novo?: string | null
          tarefa_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          descricao?: string
          id?: string
          status_anterior?: string | null
          status_novo?: string | null
          tarefa_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_historico_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "tarefas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_historico_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          can_manage_tags: boolean | null
          created_at: string | null
          edicao_id: string | null
          email: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          is_admin: boolean | null
          is_projetista: boolean | null
          is_temp: boolean | null
          is_visitor: boolean | null
          name: string
          password_hash: string | null
          temp_password_plain: string | null
        }
        Insert: {
          can_manage_tags?: boolean | null
          created_at?: string | null
          edicao_id?: string | null
          email: string
          expires_at?: string | null
          id: string
          is_active?: boolean | null
          is_admin?: boolean | null
          is_projetista?: boolean | null
          is_temp?: boolean | null
          is_visitor?: boolean | null
          name: string
          password_hash?: string | null
          temp_password_plain?: string | null
        }
        Update: {
          can_manage_tags?: boolean | null
          created_at?: string | null
          edicao_id?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          is_admin?: boolean | null
          is_projetista?: boolean | null
          is_temp?: boolean | null
          is_visitor?: boolean | null
          name?: string
          password_hash?: string | null
          temp_password_plain?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_edicao_id_fkey"
            columns: ["edicao_id"]
            isOneToOne: false
            referencedRelation: "eventos_edicoes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      backup_introspect: { Args: never; Returns: Json }
      create_user_admin: {
        Args: {
          can_manage_tags_flag?: boolean
          is_admin_flag?: boolean
          is_projetista_flag?: boolean
          is_visitor_flag?: boolean
          user_email: string
          user_name: string
          user_password: string
        }
        Returns: string
      }
      delete_user_admin: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_master: { Args: never; Returns: boolean }
      is_master_config: { Args: { _config_id: string }; Returns: boolean }
      is_master_edition: { Args: { _edicao_id: string }; Returns: boolean }
      is_master_event: { Args: { _evento_id: string }; Returns: boolean }
      is_master_tarefa: { Args: { _tarefa_id: string }; Returns: boolean }
      rename_opcional_item: {
        Args: { new_nome: string; old_nome: string }
        Returns: undefined
      }
      search_clientes: {
        Args: { search_term: string }
        Returns: {
          cnpj: string
          contatos: Json
          cpf: string
          created_at: string
          id: string
          nome_completo: string
          nome_fantasia: string
          razao_social: string
          tipo_pessoa: string
        }[]
      }
      update_user_password_admin: {
        Args: { new_password: string; target_user_id: string }
        Returns: undefined
      }
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

export type Perfil = 'adm' | 'coordenacao' | 'prof_efetivo' | 'prof_cnpj'

export type StatusAluno = 'ativo' | 'inativo' | 'concluido' | 'cancelado'

export type Turno = 'manha' | 'tarde' | 'noite'

export type DiaSemana = 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado'

export interface Database {
  public: {
    Tables: {
      usuarios: {
        Row: {
          id: string
          nome: string
          email: string
          perfil: Perfil
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          email: string
          perfil: Perfil
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nome?: string
          email?: string
          perfil?: Perfil
          updated_at?: string
        }
      }
      cursos: {
        Row: {
          id: string
          nome: string
          descricao: string | null
          carga_horaria: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          descricao?: string | null
          carga_horaria?: number | null
        }
        Update: {
          nome?: string
          descricao?: string | null
          carga_horaria?: number | null
        }
      }
      turmas: {
        Row: {
          id: string
          codigo_sigop: string
          nome: string
          curso_id: string
          professor_id: string | null
          turno: Turno
          dias_semana: DiaSemana[]
          data_inicio: string
          data_termino: string
          local: string | null
          vagas: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          codigo_sigop: string
          nome: string
          curso_id: string
          professor_id?: string | null
          turno: Turno
          dias_semana: DiaSemana[]
          data_inicio: string
          data_termino: string
          local?: string | null
          vagas?: number | null
        }
        Update: {
          codigo_sigop?: string
          nome?: string
          curso_id?: string
          professor_id?: string | null
          turno?: Turno
          dias_semana?: DiaSemana[]
          data_inicio?: string
          data_termino?: string
          local?: string | null
          vagas?: number | null
        }
      }
      alunos: {
        Row: {
          id: string
          matricula: string
          nome: string
          cpf: string | null
          turma_id: string
          empresa: string | null
          cnpj_contratante: string | null
          data_inicio_contrato: string | null
          data_termino_contrato: string | null
          status: StatusAluno
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          matricula: string
          nome: string
          cpf?: string | null
          turma_id: string
          empresa?: string | null
          cnpj_contratante?: string | null
          data_inicio_contrato?: string | null
          data_termino_contrato?: string | null
          status?: StatusAluno
        }
        Update: {
          matricula?: string
          nome?: string
          cpf?: string | null
          turma_id?: string
          empresa?: string | null
          cnpj_contratante?: string | null
          data_inicio_contrato?: string | null
          data_termino_contrato?: string | null
          status?: StatusAluno
        }
      }
      frequencias: {
        Row: {
          id: string
          aluno_id: string
          turma_id: string
          data: string
          presente: boolean
          justificativa: string | null
          registrado_por: string | null
          created_at: string
        }
        Insert: {
          id?: string
          aluno_id: string
          turma_id: string
          data: string
          presente: boolean
          justificativa?: string | null
          registrado_por?: string | null
        }
        Update: {
          presente?: boolean
          justificativa?: string | null
        }
      }
      advertencias: {
        Row: {
          id: string
          aluno_id: string
          turma_id: string
          descricao: string
          data: string
          emitido_por: string | null
          created_at: string
        }
        Insert: {
          id?: string
          aluno_id: string
          turma_id: string
          descricao: string
          data: string
          emitido_por?: string | null
        }
        Update: {
          descricao?: string
          data?: string
        }
      }
      suspensoes: {
        Row: {
          id: string
          aluno_id: string
          turma_id: string
          motivo: string
          data_inicio: string
          data_termino: string
          emitido_por: string | null
          created_at: string
        }
        Insert: {
          id?: string
          aluno_id: string
          turma_id: string
          motivo: string
          data_inicio: string
          data_termino: string
          emitido_por?: string | null
        }
        Update: {
          motivo?: string
          data_inicio?: string
          data_termino?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      perfil: Perfil
      status_aluno: StatusAluno
      turno: Turno
      dia_semana: DiaSemana
    }
  }
}

// Tipos de conveniência
export type Usuario = Database['public']['Tables']['usuarios']['Row']
export type Curso = Database['public']['Tables']['cursos']['Row']
export type Turma = Database['public']['Tables']['turmas']['Row']
export type Aluno = Database['public']['Tables']['alunos']['Row']
export type Frequencia = Database['public']['Tables']['frequencias']['Row']
export type Advertencia = Database['public']['Tables']['advertencias']['Row']
export type Suspensao = Database['public']['Tables']['suspensoes']['Row']

// Turma com joins
export type TurmaComCurso = Turma & {
  curso: Curso
  professor: Usuario | null
}

// Aluno com joins
export type AlunoComTurma = Aluno & {
  turma: TurmaComCurso
}

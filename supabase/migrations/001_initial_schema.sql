-- ============================================================
-- SIGEP - Sistema de Gestão Educacional SEST SENAT
-- Migration 001: Schema inicial
-- ============================================================

-- Enums
CREATE TYPE perfil AS ENUM ('adm', 'coordenacao', 'prof_efetivo', 'prof_cnpj');
CREATE TYPE status_aluno AS ENUM ('ativo', 'inativo', 'concluido', 'cancelado');
CREATE TYPE turno AS ENUM ('manha', 'tarde', 'noite');
CREATE TYPE dia_semana AS ENUM ('segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado');

-- ============================================================
-- Tabela: usuarios
-- ============================================================
CREATE TABLE usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  perfil perfil NOT NULL DEFAULT 'prof_cnpj',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Tabela: cursos
-- ============================================================
CREATE TABLE cursos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  carga_horaria INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Tabela: turmas
-- ============================================================
CREATE TABLE turmas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_sigop TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  curso_id UUID NOT NULL REFERENCES cursos(id) ON DELETE RESTRICT,
  professor_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  turno turno NOT NULL,
  dias_semana dia_semana[] NOT NULL DEFAULT '{}',
  data_inicio DATE NOT NULL,
  data_termino DATE NOT NULL,
  local TEXT,
  vagas INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Tabela: alunos
-- ============================================================
CREATE TABLE alunos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matricula TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  cpf TEXT,
  turma_id UUID NOT NULL REFERENCES turmas(id) ON DELETE RESTRICT,
  empresa TEXT,
  cnpj_contratante TEXT,
  data_inicio_contrato DATE,
  data_termino_contrato DATE,
  status status_aluno NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Tabela: frequencias
-- ============================================================
CREATE TABLE frequencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  turma_id UUID NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  presente BOOLEAN NOT NULL DEFAULT FALSE,
  justificativa TEXT,
  registrado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(aluno_id, data)
);

-- ============================================================
-- Tabela: advertencias
-- ============================================================
CREATE TABLE advertencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  turma_id UUID NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  data DATE NOT NULL,
  emitido_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Tabela: suspensoes
-- ============================================================
CREATE TABLE suspensoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  turma_id UUID NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
  motivo TEXT NOT NULL,
  data_inicio DATE NOT NULL,
  data_termino DATE NOT NULL,
  emitido_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Trigger: atualizar updated_at automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_usuarios_updated_at
  BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cursos_updated_at
  BEFORE UPDATE ON cursos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_turmas_updated_at
  BEFORE UPDATE ON turmas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alunos_updated_at
  BEFORE UPDATE ON alunos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Trigger: criar perfil de usuario ao registrar no Auth
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usuarios (id, nome, email, perfil)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'perfil')::perfil, 'prof_cnpj')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- Índices para performance
-- ============================================================
CREATE INDEX idx_turmas_professor ON turmas(professor_id);
CREATE INDEX idx_turmas_curso ON turmas(curso_id);
CREATE INDEX idx_alunos_turma ON alunos(turma_id);
CREATE INDEX idx_alunos_matricula ON alunos(matricula);
CREATE INDEX idx_frequencias_aluno ON frequencias(aluno_id);
CREATE INDEX idx_frequencias_turma ON frequencias(turma_id);
CREATE INDEX idx_frequencias_data ON frequencias(data);
CREATE INDEX idx_advertencias_aluno ON advertencias(aluno_id);
CREATE INDEX idx_suspensoes_aluno ON suspensoes(aluno_id);

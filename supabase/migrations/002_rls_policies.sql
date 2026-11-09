-- ============================================================
-- SIGEP - Row Level Security Policies
-- Migration 002: RLS por perfil
-- ============================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE cursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE frequencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE advertencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE suspensoes ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Função auxiliar: obter perfil do usuário logado
-- ============================================================
CREATE OR REPLACE FUNCTION get_meu_perfil()
RETURNS perfil AS $$
  SELECT perfil FROM public.usuarios WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- Função auxiliar: verificar se é adm ou coordenação
-- ============================================================
CREATE OR REPLACE FUNCTION is_adm_ou_coord()
RETURNS BOOLEAN AS $$
  SELECT perfil IN ('adm', 'coordenacao') FROM public.usuarios WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- Função auxiliar: verificar se é professor efetivo
-- ============================================================
CREATE OR REPLACE FUNCTION is_prof_efetivo()
RETURNS BOOLEAN AS $$
  SELECT perfil = 'prof_efetivo' FROM public.usuarios WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- USUARIOS: políticas
-- ============================================================
-- Qualquer autenticado pode ver seu próprio perfil
CREATE POLICY "usuario_ver_proprio" ON usuarios
  FOR SELECT USING (id = auth.uid());

-- Adm e coord podem ver todos os usuários
CREATE POLICY "adm_coord_ver_todos_usuarios" ON usuarios
  FOR SELECT USING (is_adm_ou_coord());

-- Apenas adm pode inserir/atualizar/deletar usuários
CREATE POLICY "adm_gerenciar_usuarios" ON usuarios
  FOR ALL USING (get_meu_perfil() = 'adm');

-- ============================================================
-- CURSOS: políticas
-- ============================================================
-- Todos autenticados podem ver cursos
CREATE POLICY "todos_ver_cursos" ON cursos
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Apenas adm e coordenação podem gerenciar cursos
CREATE POLICY "adm_coord_gerenciar_cursos" ON cursos
  FOR ALL USING (is_adm_ou_coord());

-- ============================================================
-- TURMAS: políticas
-- ============================================================
-- Adm e coord veem todas as turmas
CREATE POLICY "adm_coord_ver_todas_turmas" ON turmas
  FOR SELECT USING (is_adm_ou_coord());

-- Prof efetivo vê todas as turmas
CREATE POLICY "prof_efetivo_ver_todas_turmas" ON turmas
  FOR SELECT USING (is_prof_efetivo());

-- Prof CNPJ vê apenas suas próprias turmas
CREATE POLICY "prof_cnpj_ver_proprias_turmas" ON turmas
  FOR SELECT USING (
    get_meu_perfil() = 'prof_cnpj' AND professor_id = auth.uid()
  );

-- Adm e coord podem gerenciar todas as turmas
CREATE POLICY "adm_coord_gerenciar_turmas" ON turmas
  FOR ALL USING (is_adm_ou_coord());

-- ============================================================
-- ALUNOS: políticas
-- ============================================================
-- Adm e coord veem todos os alunos
CREATE POLICY "adm_coord_ver_todos_alunos" ON alunos
  FOR SELECT USING (is_adm_ou_coord());

-- Prof efetivo vê todos os alunos
CREATE POLICY "prof_efetivo_ver_todos_alunos" ON alunos
  FOR SELECT USING (is_prof_efetivo());

-- Prof CNPJ vê apenas alunos de suas turmas
CREATE POLICY "prof_cnpj_ver_alunos_proprias_turmas" ON alunos
  FOR SELECT USING (
    get_meu_perfil() = 'prof_cnpj' AND
    turma_id IN (
      SELECT id FROM turmas WHERE professor_id = auth.uid()
    )
  );

-- Adm e coord gerenciam todos os alunos
CREATE POLICY "adm_coord_gerenciar_alunos" ON alunos
  FOR ALL USING (is_adm_ou_coord());

-- Professores (efetivo e cnpj) podem editar status de alunos de suas turmas
CREATE POLICY "prof_editar_alunos_suas_turmas" ON alunos
  FOR UPDATE USING (
    get_meu_perfil() IN ('prof_efetivo', 'prof_cnpj') AND
    (
      is_prof_efetivo() OR
      turma_id IN (SELECT id FROM turmas WHERE professor_id = auth.uid())
    )
  );

-- ============================================================
-- FREQUENCIAS: políticas
-- ============================================================
-- Adm e coord veem todas as frequências
CREATE POLICY "adm_coord_ver_todas_freq" ON frequencias
  FOR SELECT USING (is_adm_ou_coord());

-- Prof efetivo vê todas as frequências
CREATE POLICY "prof_efetivo_ver_todas_freq" ON frequencias
  FOR SELECT USING (is_prof_efetivo());

-- Prof CNPJ vê freq de suas turmas
CREATE POLICY "prof_cnpj_ver_freq_suas_turmas" ON frequencias
  FOR SELECT USING (
    get_meu_perfil() = 'prof_cnpj' AND
    turma_id IN (SELECT id FROM turmas WHERE professor_id = auth.uid())
  );

-- Professores podem registrar/editar frequências de suas turmas
CREATE POLICY "prof_gerenciar_freq" ON frequencias
  FOR ALL USING (
    get_meu_perfil() IN ('prof_efetivo', 'prof_cnpj') AND
    (
      is_prof_efetivo() OR
      turma_id IN (SELECT id FROM turmas WHERE professor_id = auth.uid())
    )
  );

-- Adm e coord gerenciam todas as frequências
CREATE POLICY "adm_coord_gerenciar_freq" ON frequencias
  FOR ALL USING (is_adm_ou_coord());

-- ============================================================
-- ADVERTENCIAS: políticas
-- ============================================================
-- Adm e coord veem todas
CREATE POLICY "adm_coord_ver_advert" ON advertencias
  FOR SELECT USING (is_adm_ou_coord());

-- Prof efetivo vê todas
CREATE POLICY "prof_efetivo_ver_advert" ON advertencias
  FOR SELECT USING (is_prof_efetivo());

-- Prof CNPJ vê advertências de suas turmas
CREATE POLICY "prof_cnpj_ver_advert_suas_turmas" ON advertencias
  FOR SELECT USING (
    get_meu_perfil() = 'prof_cnpj' AND
    turma_id IN (SELECT id FROM turmas WHERE professor_id = auth.uid())
  );

-- Professores podem emitir advertências
CREATE POLICY "prof_emitir_advert" ON advertencias
  FOR INSERT WITH CHECK (
    get_meu_perfil() IN ('prof_efetivo', 'prof_cnpj') AND
    (
      is_prof_efetivo() OR
      turma_id IN (SELECT id FROM turmas WHERE professor_id = auth.uid())
    )
  );

-- Adm e coord gerenciam todas as advertências
CREATE POLICY "adm_coord_gerenciar_advert" ON advertencias
  FOR ALL USING (is_adm_ou_coord());

-- ============================================================
-- SUSPENSOES: políticas
-- ============================================================
-- Adm e coord veem todas
CREATE POLICY "adm_coord_ver_suspensoes" ON suspensoes
  FOR SELECT USING (is_adm_ou_coord());

-- Prof efetivo vê todas
CREATE POLICY "prof_efetivo_ver_suspensoes" ON suspensoes
  FOR SELECT USING (is_prof_efetivo());

-- Prof CNPJ vê suspensões de suas turmas
CREATE POLICY "prof_cnpj_ver_suspensoes_suas_turmas" ON suspensoes
  FOR SELECT USING (
    get_meu_perfil() = 'prof_cnpj' AND
    turma_id IN (SELECT id FROM turmas WHERE professor_id = auth.uid())
  );

-- Professores podem emitir suspensões
CREATE POLICY "prof_emitir_suspensoes" ON suspensoes
  FOR INSERT WITH CHECK (
    get_meu_perfil() IN ('prof_efetivo', 'prof_cnpj') AND
    (
      is_prof_efetivo() OR
      turma_id IN (SELECT id FROM turmas WHERE professor_id = auth.uid())
    )
  );

-- Adm e coord gerenciam todas as suspensões
CREATE POLICY "adm_coord_gerenciar_suspensoes" ON suspensoes
  FOR ALL USING (is_adm_ou_coord());

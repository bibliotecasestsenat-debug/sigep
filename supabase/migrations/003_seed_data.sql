-- ============================================================
-- SIGEP - Dados iniciais
-- Migration 003: Seed data
-- ATENÇÃO: Execute APÓS criar os usuários no Supabase Auth
-- ============================================================

-- Cursos padrão SEST SENAT
INSERT INTO cursos (nome, descricao, carga_horaria) VALUES
  ('Direção Defensiva', 'Curso de direção defensiva para motoristas profissionais', 8),
  ('Primeiros Socorros', 'Noções básicas de primeiros socorros no trânsito', 16),
  ('NR-20 Inflamáveis', 'Segurança com inflamáveis e combustíveis', 8),
  ('NR-10 Elétrica', 'Segurança em instalações elétricas', 40),
  ('Liderança e Gestão', 'Habilidades de liderança para o setor de transporte', 32),
  ('Atendimento ao Cliente', 'Técnicas de atendimento e relacionamento', 24),
  ('Mecânica Básica', 'Manutenção preventiva de veículos', 20),
  ('Segurança no Trabalho', 'CIPA e segurança ocupacional', 20)
ON CONFLICT DO NOTHING;

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AlunosClient from './AlunosClient'

export default async function AlunosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Buscar dados em paralelo para reduzir latência
  const [usuarioRes, alunosRes, turmasRes, cursosRes] = await Promise.all([
    supabase.from('usuarios').select('*').eq('id', user.id).single(),
    supabase.from('alunos').select(`*, turma:turmas(id, codigo_sigop, nome, turno, dias_semana, curso:cursos(id, nome))`).order('nome'),
    supabase.from('turmas').select('id, codigo_sigop, nome, turno, curso:cursos(nome)').order('codigo_sigop'),
    supabase.from('cursos').select('id, nome').order('nome'),
  ])

  if (!usuarioRes.data) redirect('/login')

  return (
    <AlunosClient
      alunosIniciais={alunosRes.data ?? []}
      turmas={turmasRes.data ?? []}
      cursos={cursosRes.data ?? []}
      usuario={usuarioRes.data}
    />
  )
}

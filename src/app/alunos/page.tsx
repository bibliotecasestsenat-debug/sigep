import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AlunosClient from './AlunosClient'

export default async function AlunosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase.from('usuarios').select('*').eq('id', user.id).single()
  if (!usuario) redirect('/login')

  const { data: alunos } = await supabase
    .from('alunos')
    .select(`
      *,
      turma:turmas(
        id, codigo_sigop, nome, turno, dias_semana,
        curso:cursos(id, nome)
      )
    `)
    .order('nome')

  const { data: turmas } = await supabase
    .from('turmas')
    .select('id, codigo_sigop, nome, turno, curso:cursos(nome)')
    .order('codigo_sigop')

  const { data: cursos } = await supabase
    .from('cursos').select('id, nome').order('nome')

  return (
    <AlunosClient
      alunosIniciais={alunos ?? []}
      turmas={turmas ?? []}
      cursos={cursos ?? []}
      usuario={usuario}
    />
  )
}

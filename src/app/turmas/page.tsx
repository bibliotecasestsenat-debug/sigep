import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TurmasClient from './TurmasClient'

export default async function TurmasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios').select('*').eq('id', user.id).single()
  if (!usuario) redirect('/login')

  const { data: turmas } = await supabase
    .from('turmas')
    .select(`
      *,
      curso:cursos(id, nome),
      professor:usuarios(id, nome, perfil)
    `)
    .order('created_at', { ascending: false })

  const { data: cursos } = await supabase
    .from('cursos').select('id, nome').order('nome')

  const { data: professores } = await supabase
    .from('usuarios')
    .select('id, nome, perfil')
    .in('perfil', ['prof_efetivo', 'prof_cnpj'])
    .order('nome')

  return (
    <TurmasClient
      turmasIniciais={turmas ?? []}
      cursos={cursos ?? []}
      professores={professores ?? []}
      usuario={usuario}
    />
  )
}

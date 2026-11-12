import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TurmasClient from './TurmasClient'

export default async function TurmasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Buscar dados em paralelo para reduzir latência
  const [usuarioRes, turmasRes, cursosRes, professoresRes] = await Promise.all([
    supabase.from('usuarios').select('*').eq('id', user.id).single(),
    supabase.from('turmas').select(`*, curso:cursos(id, nome), professor:usuarios(id, nome, perfil)`).order('created_at', { ascending: false }),
    supabase.from('cursos').select('id, nome').order('nome'),
    supabase.from('usuarios').select('id, nome, perfil').in('perfil', ['prof_efetivo', 'prof_cnpj']).order('nome'),
  ])

  if (!usuarioRes.data) redirect('/login')

  return (
    <TurmasClient
      turmasIniciais={turmasRes.data ?? []}
      cursos={cursosRes.data ?? []}
      professores={professoresRes.data ?? []}
      usuario={usuarioRes.data}
    />
  )
}

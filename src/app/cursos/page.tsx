import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CursosClient from './CursosClient'

export default async function CursosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase.from('usuarios').select('*').eq('id', user.id).single()
  if (!usuario || !['adm', 'coordenacao'].includes(usuario.perfil)) redirect('/dashboard')

  const { data: cursos } = await supabase.from('cursos').select('*').order('nome')

  return <CursosClient cursosIniciais={cursos ?? []} usuario={usuario} />
}

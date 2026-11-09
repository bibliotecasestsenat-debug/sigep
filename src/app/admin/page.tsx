import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminClient from './AdminClient'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase.from('usuarios').select('*').eq('id', user.id).single()
  if (!usuario || usuario.perfil !== 'adm') redirect('/dashboard')

  const { data: usuarios } = await supabase.from('usuarios').select('*').order('nome')

  return <AdminClient usuariosIniciais={usuarios ?? []} />
}

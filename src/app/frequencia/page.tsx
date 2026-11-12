import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FrequenciaClient from './FrequenciaClient'

export default async function FrequenciaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Buscar dados em paralelo para reduzir latência
  const [usuarioRes, turmasRes] = await Promise.all([
    supabase.from('usuarios').select('*').eq('id', user.id).single(),
    supabase.from('turmas').select('id, codigo_sigop, nome, turno, dias_semana, curso:cursos(nome)').order('codigo_sigop'),
  ])

  if (!usuarioRes.data) redirect('/login')

  return <FrequenciaClient turmas={turmasRes.data ?? []} usuario={usuarioRes.data} />
}

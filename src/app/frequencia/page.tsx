import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FrequenciaClient from './FrequenciaClient'

export default async function FrequenciaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase.from('usuarios').select('*').eq('id', user.id).single()
  if (!usuario) redirect('/login')

  const { data: turmas } = await supabase
    .from('turmas')
    .select('id, codigo_sigop, nome, turno, dias_semana, curso:cursos(nome)')
    .order('codigo_sigop')

  return <FrequenciaClient turmas={turmas ?? []} usuario={usuario} />
}

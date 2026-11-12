import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database, Perfil } from '@/types/database'

export async function POST(request: Request) {
  const cookieStore = await cookies()

  // Verificar se quem chama é adm
  const supabaseUser = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )

  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: usuario } = await supabaseUser.from('usuarios').select('perfil').eq('id', user.id).single()
  if (!usuario || usuario.perfil !== 'adm') {
    return NextResponse.json({ error: 'Apenas administradores podem criar usuários' }, { status: 403 })
  }

  const body = await request.json()
  const { nome, email, senha, perfil } = body as { nome: string; email: string; senha: string; perfil: Perfil }

  if (!nome || !email || !senha || !perfil) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  }

  // Usar service_role para criar usuário no Auth
  const { createClient } = await import('@supabase/supabase-js')
  const supabaseAdmin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome, perfil },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // O trigger handle_new_user pode não ter criado o registro ainda.
  // Usamos upsert para garantir que o registro existe com os dados corretos.
  if (data.user) {
    await supabaseAdmin.from('usuarios').upsert({
      id: data.user.id,
      email,
      nome,
      perfil,
    }, { onConflict: 'id' })
  }

  return NextResponse.json({ success: true, userId: data.user?.id })
}

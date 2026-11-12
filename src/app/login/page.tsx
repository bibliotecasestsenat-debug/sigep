'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErro('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    })

    if (error) {
      setErro('E-mail ou senha incorretos. Verifique e tente novamente.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Logo / Header */}
        <div style={styles.header}>
          {/* Logo SEST SENAT oficial */}
          <div style={styles.logoWrap}>
            <div style={styles.logoBox}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 56" width="220" height="42">
                {/* SEST */}
                <text x="8" y="34" fontFamily="Arial,sans-serif" fontWeight="800" fontSize="24" fill="#FFFFFF" letterSpacing="2">SEST</text>
                <text x="8" y="48" fontFamily="Arial,sans-serif" fontWeight="400" fontSize="7" fill="rgba(255,255,255,0.65)" letterSpacing="0.4">SERVIÇO SOCIAL DO TRANSPORTE</text>
                {/* divisor */}
                <line x1="102" y1="6" x2="102" y2="50" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
                {/* SENAT */}
                <text x="112" y="34" fontFamily="Arial,sans-serif" fontWeight="800" fontSize="24" fill="#FFFFFF" letterSpacing="2">SENAT</text>
                <text x="112" y="48" fontFamily="Arial,sans-serif" fontWeight="400" fontSize="7" fill="rgba(255,255,255,0.65)" letterSpacing="0.4">SERV. NAC. DE APRENDIZAGEM DO TRANSPORTE</text>
              </svg>
            </div>
          </div>
          <h1 style={styles.title}>SIGEP</h1>
          <p style={styles.subtitle}>Sistema de Gestão do Programa de Aprendizagem</p>
          <p style={styles.unit}>Unidade Operacional Serra — DN122</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label} htmlFor="email">E-mail institucional</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="usuario@sestsenat.org.br"
              required
              style={styles.input}
              autoComplete="email"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label} htmlFor="senha">Senha</label>
            <input
              id="senha"
              type="password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              placeholder="••••••••"
              required
              style={styles.input}
              autoComplete="current-password"
            />
          </div>

          {erro && (
            <div style={styles.erro}>
              <span>⚠</span> {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.btn,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Entrando…' : 'Entrar no sistema'}
          </button>
        </form>

        <p style={styles.footer}>
          Para redefinir sua senha, entre em contato com a coordenação.
        </p>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #002969 0%, #004488 50%, #002244 100%)',
    padding: '24px',
  },
  card: {
    background: '#fff',
    borderRadius: '16px',
    padding: '48px 40px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '36px',
  },
  logoWrap: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  logoBox: {
    background: '#002969',
    borderRadius: '12px',
    padding: '14px 20px',
    display: 'inline-flex',
    boxShadow: '0 4px 16px rgba(0,41,105,0.3)',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#002969',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    marginTop: '4px',
  },
  unit: {
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '4px',
    fontWeight: '500',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    padding: '12px 14px',
    border: '1.5px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#1e293b',
    outline: 'none',
    transition: 'border-color 0.2s',
    background: '#f8fafc',
  },
  erro: {
    padding: '12px 14px',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    color: '#dc2626',
    fontSize: '13px',
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  btn: {
    padding: '14px',
    background: '#002969',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    letterSpacing: '0.3px',
    transition: 'background 0.2s',
    marginTop: '4px',
  },
  footer: {
    marginTop: '24px',
    textAlign: 'center',
    fontSize: '12px',
    color: '#94a3b8',
  },
}

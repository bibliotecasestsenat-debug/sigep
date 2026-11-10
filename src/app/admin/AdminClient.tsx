'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Usuario, Perfil } from '@/types/database'
import Modal from '@/components/ui/Modal'

type UsuarioComEmail = Usuario

interface Props { usuariosIniciais: UsuarioComEmail[] }

const PERFIL_LABEL: Record<string, string> = {
  adm: 'Administrador', coordenacao: 'Coordenação',
  prof_efetivo: 'Professor Efetivo', prof_cnpj: 'Professor CNPJ',
}
const PERFIL_COLOR: Record<string, string> = {
  adm: '#7c3aed', coordenacao: '#1d4ed8',
  prof_efetivo: '#16a34a', prof_cnpj: '#d97706',
}

export default function AdminClient({ usuariosIniciais }: Props) {
  const [usuarios, setUsuarios] = useState(usuariosIniciais)
  const [modalAberto, setModalAberto] = useState(false)
  const [form, setForm] = useState({ nome: '', email: '', senha: '', perfil: 'prof_cnpj' as Perfil })
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')
  const supabase = createClient()

  async function criarUsuario(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome || !form.email || !form.senha) { setErro('Preencha todos os campos.'); return }
    setLoading(true); setErro('')

    // Criar via API route para usar service_role
    const res = await fetch('/api/admin/criar-usuario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: form.nome, email: form.email, senha: form.senha, perfil: form.perfil }),
    })
    const json = await res.json()
    if (!res.ok) { setErro(json.error ?? 'Erro ao criar usuário'); setLoading(false); return }

    setMsg(`✅ Usuário "${form.nome}" criado com sucesso!`)
    setModalAberto(false); setLoading(false)
    // Recarregar
    const { data } = await supabase.from('usuarios').select('*').order('nome')
    setUsuarios(data ?? [])
  }

  async function alterarPerfil(id: string, perfil: Perfil) {
    const { error } = await supabase.from('usuarios').update({ perfil } as never).eq('id', id)
    if (error) { alert(error.message); return }
    setUsuarios(u => u.map(x => x.id === id ? { ...x, perfil } : x))
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.heading}>Administração</h1>
          <p style={styles.sub}>Gerenciamento de usuários do sistema</p>
        </div>
        <button style={styles.btnPrimary} onClick={() => { setForm({ nome: '', email: '', senha: '', perfil: 'prof_cnpj' }); setErro(''); setModalAberto(true) }}>+ Novo usuário</button>
      </div>

      {msg && <div style={{ marginBottom: '16px', padding: '14px 16px', background: '#f0fdf4', borderRadius: '8px', fontSize: '13px', color: '#16a34a' }}>{msg}</div>}

      <div style={styles.tableWrap}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={styles.thead}>
              <th style={styles.th}>Usuário</th>
              <th style={styles.th}>E-mail</th>
              <th style={styles.th}>Perfil</th>
              <th style={styles.th}>Desde</th>
              <th style={styles.th}>Alterar perfil</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u, i) => (
              <tr key={u.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                <td style={styles.td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ ...styles.avatar, background: PERFIL_COLOR[u.perfil] ?? '#64748b' }}>{u.nome.charAt(0)}</div>
                    <span style={{ fontWeight: 500 }}>{u.nome}</span>
                  </div>
                </td>
                <td style={styles.td}>{u.email}</td>
                <td style={styles.td}>
                  <span style={{ ...styles.badge, color: PERFIL_COLOR[u.perfil], background: PERFIL_COLOR[u.perfil] + '18' }}>
                    {PERFIL_LABEL[u.perfil] ?? u.perfil}
                  </span>
                </td>
                <td style={styles.td}>{new Date(u.created_at).toLocaleDateString('pt-BR')}</td>
                <td style={styles.td}>
                  <select
                    style={styles.perfilSelect}
                    value={u.perfil}
                    onChange={e => alterarPerfil(u.id, e.target.value as Perfil)}
                  >
                    {Object.entries(PERFIL_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal aberto={modalAberto} onFechar={() => setModalAberto(false)} titulo="Novo Usuário" largura="460px">
        <form onSubmit={criarUsuario} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={styles.field}>
            <label style={styles.label}>Nome completo *</label>
            <input style={styles.input} value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome do usuário" required />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>E-mail *</label>
            <input style={styles.input} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="usuario@sestsenat.org.br" required />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Senha provisória *</label>
            <input style={styles.input} type="password" value={form.senha} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))} placeholder="Mínimo 6 caracteres" required minLength={6} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Perfil *</label>
            <select style={styles.input} value={form.perfil} onChange={e => setForm(f => ({ ...f, perfil: e.target.value as Perfil }))}>
              {Object.entries(PERFIL_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          {erro && <div style={styles.erro}>{erro}</div>}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button type="button" style={styles.btnSecondary} onClick={() => setModalAberto(false)}>Cancelar</button>
            <button type="submit" style={styles.btnPrimary} disabled={loading}>{loading ? 'Criando…' : 'Criar usuário'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: '32px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  heading: { fontSize: '22px', fontWeight: '700', color: '#1e293b' },
  sub: { fontSize: '13px', color: '#94a3b8', marginTop: '2px' },
  btnPrimary: { padding: '10px 18px', background: '#002969', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  btnSecondary: { padding: '10px 18px', background: '#f1f5f9', color: '#374151', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  tableWrap: { background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' },
  thead: { background: '#f8fafc' },
  th: { padding: '11px 14px', textAlign: 'left' as const, fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.6px', borderBottom: '1px solid #e2e8f0' },
  td: { padding: '12px 14px', fontSize: '13px', color: '#374151', borderBottom: '1px solid #f1f5f9' },
  avatar: { width: '32px', height: '32px', color: '#fff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', flexShrink: 0 },
  badge: { fontSize: '11px', fontWeight: '600', padding: '3px 8px', borderRadius: '20px', display: 'inline-block' },
  perfilSelect: { padding: '6px 10px', border: '1.5px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', background: '#f8fafc', cursor: 'pointer', outline: 'none' },
  field: { display: 'flex', flexDirection: 'column', gap: '5px' },
  label: { fontSize: '12px', fontWeight: '600', color: '#374151' },
  input: { padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '7px', fontSize: '13px', color: '#1e293b', outline: 'none', background: '#f8fafc' },
  erro: { padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '7px', color: '#dc2626', fontSize: '13px' },
}

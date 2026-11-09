'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Usuario } from '@/types/database'
import Modal from '@/components/ui/Modal'

type Curso = { id: string; nome: string; descricao?: string | null; carga_horaria?: number | null; created_at: string }
interface Props { cursosIniciais: Curso[]; usuario: Usuario }

export default function CursosClient({ cursosIniciais, usuario }: Props) {
  const [cursos, setCursos] = useState(cursosIniciais)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Curso | null>(null)
  const [form, setForm] = useState({ nome: '', descricao: '', carga_horaria: '' })
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const supabase = createClient()
  const podeGerenciar = ['adm', 'coordenacao'].includes(usuario.perfil)

  function abrirNovo() { setEditando(null); setForm({ nome: '', descricao: '', carga_horaria: '' }); setErro(''); setModalAberto(true) }
  function abrirEditar(c: Curso) {
    setEditando(c); setForm({ nome: c.nome, descricao: c.descricao ?? '', carga_horaria: c.carga_horaria?.toString() ?? '' }); setErro(''); setModalAberto(true)
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome.trim()) { setErro('Informe o nome do curso.'); return }
    setLoading(true); setErro('')
    const payload = { nome: form.nome.trim(), descricao: form.descricao || null, carga_horaria: form.carga_horaria ? parseInt(form.carga_horaria) : null }
    if (editando) {
      const { error } = await supabase.from('cursos').update(payload).eq('id', editando.id)
      if (error) { setErro(error.message); setLoading(false); return }
    } else {
      const { error } = await supabase.from('cursos').insert(payload)
      if (error) { setErro(error.message); setLoading(false); return }
    }
    const { data } = await supabase.from('cursos').select('*').order('nome')
    setCursos(data ?? [])
    setModalAberto(false); setLoading(false)
  }

  async function excluir(id: string) {
    if (!confirm('Excluir este curso?')) return
    const { error } = await supabase.from('cursos').delete().eq('id', id)
    if (error) { alert(error.message); return }
    setCursos(c => c.filter(x => x.id !== id))
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.heading}>Cursos</h1>
          <p style={styles.sub}>{cursos.length} curso{cursos.length !== 1 ? 's' : ''} cadastrado{cursos.length !== 1 ? 's' : ''}</p>
        </div>
        {podeGerenciar && <button style={styles.btnPrimary} onClick={abrirNovo}>+ Novo curso</button>}
      </div>

      <div style={styles.grid}>
        {cursos.length === 0 ? (
          <div style={styles.empty}>Nenhum curso cadastrado.</div>
        ) : cursos.map(c => (
          <div key={c.id} style={styles.card}>
            <div style={styles.cardTop}>
              <span style={styles.cardIcon}>📚</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button style={styles.btnEdit} onClick={() => abrirEditar(c)}>✏️</button>
                <button style={styles.btnDel} onClick={() => excluir(c.id)}>🗑️</button>
              </div>
            </div>
            <h3 style={styles.cardTitle}>{c.nome}</h3>
            {c.descricao && <p style={styles.cardDesc}>{c.descricao}</p>}
            {c.carga_horaria && <span style={styles.cargaBadge}>{c.carga_horaria}h</span>}
          </div>
        ))}
      </div>

      <Modal aberto={modalAberto} onFechar={() => setModalAberto(false)} titulo={editando ? 'Editar Curso' : 'Novo Curso'} largura="480px">
        <form onSubmit={salvar} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={styles.field}>
            <label style={styles.label}>Nome do Curso *</label>
            <input style={styles.input} value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Direção Defensiva" required />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Descrição</label>
            <textarea style={{ ...styles.input, minHeight: '80px', resize: 'vertical' }} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descrição do curso…" />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Carga Horária (horas)</label>
            <input style={styles.input} type="number" min="1" value={form.carga_horaria} onChange={e => setForm(f => ({ ...f, carga_horaria: e.target.value }))} placeholder="Ex: 8" />
          </div>
          {erro && <div style={styles.erro}>{erro}</div>}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button type="button" style={styles.btnSecondary} onClick={() => setModalAberto(false)}>Cancelar</button>
            <button type="submit" style={styles.btnPrimary} disabled={loading}>{loading ? 'Salvando…' : editando ? 'Atualizar' : 'Cadastrar'}</button>
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
  btnPrimary: { padding: '10px 18px', background: '#003366', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  btnSecondary: { padding: '10px 18px', background: '#f1f5f9', color: '#374151', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' },
  card: { background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  cardIcon: { fontSize: '28px' },
  cardTitle: { fontSize: '15px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' },
  cardDesc: { fontSize: '13px', color: '#64748b', lineHeight: 1.5, marginBottom: '12px' },
  cargaBadge: { fontSize: '11px', background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: '20px', fontWeight: '700' },
  btnEdit: { background: '#eff6ff', border: 'none', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', fontSize: '13px' },
  btnDel: { background: '#fef2f2', border: 'none', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', fontSize: '13px' },
  empty: { gridColumn: '1 / -1', textAlign: 'center', padding: '48px', color: '#94a3b8', fontSize: '14px' },
  field: { display: 'flex', flexDirection: 'column', gap: '5px' },
  label: { fontSize: '12px', fontWeight: '600', color: '#374151' },
  input: { padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '7px', fontSize: '13px', color: '#1e293b', outline: 'none', background: '#f8fafc' },
  erro: { padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '7px', color: '#dc2626', fontSize: '13px' },
}

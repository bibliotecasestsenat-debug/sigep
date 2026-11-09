'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Usuario } from '@/types/database'
import Modal from '@/components/ui/Modal'

type Curso = { id: string; nome: string }
type Professor = { id: string; nome: string; perfil: string }
type Turma = {
  id: string
  codigo_sigop: string
  nome: string
  turno: string
  dias_semana: string[]
  data_inicio: string
  data_termino: string
  local?: string
  vagas?: number
  curso: Curso | null
  professor: Professor | null
}

interface Props {
  turmasIniciais: Turma[]
  cursos: Curso[]
  professores: Professor[]
  usuario: Usuario
}

const TURNO_LABEL: Record<string, string> = {
  manha: 'Manhã', tarde: 'Tarde', noite: 'Noite'
}
const DIAS: { key: string; label: string }[] = [
  { key: 'segunda', label: 'Seg' },
  { key: 'terca', label: 'Ter' },
  { key: 'quarta', label: 'Qua' },
  { key: 'quinta', label: 'Qui' },
  { key: 'sexta', label: 'Sex' },
  { key: 'sabado', label: 'Sáb' },
]

const PERFIL_LABEL: Record<string, string> = {
  prof_efetivo: 'Efetivo', prof_cnpj: 'CNPJ'
}

function fmt(d: string) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

export default function TurmasClient({ turmasIniciais, cursos, professores, usuario }: Props) {
  const [turmas, setTurmas] = useState(turmasIniciais)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Turma | null>(null)
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const supabase = createClient()

  const podeGerenciar = ['adm', 'coordenacao'].includes(usuario.perfil)

  const [form, setForm] = useState({
    codigo_sigop: '',
    nome: '',
    curso_id: '',
    professor_id: '',
    turno: 'manha',
    dias_semana: [] as string[],
    data_inicio: '',
    data_termino: '',
    local: '',
    vagas: '',
  })

  function abrirNovo() {
    setEditando(null)
    setForm({ codigo_sigop: '', nome: '', curso_id: '', professor_id: '', turno: 'manha', dias_semana: [], data_inicio: '', data_termino: '', local: '', vagas: '' })
    setErro('')
    setModalAberto(true)
  }

  function abrirEditar(t: Turma) {
    setEditando(t)
    setForm({
      codigo_sigop: t.codigo_sigop,
      nome: t.nome,
      curso_id: t.curso?.id ?? '',
      professor_id: t.professor?.id ?? '',
      turno: t.turno,
      dias_semana: t.dias_semana ?? [],
      data_inicio: t.data_inicio,
      data_termino: t.data_termino,
      local: t.local ?? '',
      vagas: t.vagas?.toString() ?? '',
    })
    setErro('')
    setModalAberto(true)
  }

  function toggleDia(dia: string) {
    setForm(f => ({
      ...f,
      dias_semana: f.dias_semana.includes(dia)
        ? f.dias_semana.filter(d => d !== dia)
        : [...f.dias_semana, dia]
    }))
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (!form.codigo_sigop || !form.nome || !form.curso_id) {
      setErro('Preencha todos os campos obrigatórios.')
      return
    }
    setLoading(true)
    setErro('')

    const payload = {
      codigo_sigop: form.codigo_sigop.toUpperCase(),
      nome: form.nome,
      curso_id: form.curso_id,
      professor_id: form.professor_id || null,
      turno: form.turno,
      dias_semana: form.dias_semana,
      data_inicio: form.data_inicio,
      data_termino: form.data_termino,
      local: form.local || null,
      vagas: form.vagas ? parseInt(form.vagas) : null,
    }

    if (editando) {
      const { error } = await supabase.from('turmas').update(payload).eq('id', editando.id)
      if (error) { setErro(error.message); setLoading(false); return }
    } else {
      const { error } = await supabase.from('turmas').insert(payload)
      if (error) { setErro(error.message); setLoading(false); return }
    }

    // Recarregar
    const { data } = await supabase.from('turmas').select(`*, curso:cursos(id, nome), professor:usuarios(id, nome, perfil)`).order('created_at', { ascending: false })
    setTurmas(data as Turma[] ?? [])
    setModalAberto(false)
    setLoading(false)
  }

  async function excluir(id: string) {
    if (!confirm('Excluir esta turma? Esta ação não pode ser desfeita.')) return
    const { error } = await supabase.from('turmas').delete().eq('id', id)
    if (error) { alert(error.message); return }
    setTurmas(t => t.filter(x => x.id !== id))
  }

  const turmasFiltradas = turmas.filter(t =>
    !busca ||
    t.codigo_sigop.toLowerCase().includes(busca.toLowerCase()) ||
    t.nome.toLowerCase().includes(busca.toLowerCase()) ||
    t.curso?.nome.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.heading}>Turmas</h1>
          <p style={styles.sub}>{turmas.length} turma{turmas.length !== 1 ? 's' : ''} cadastrada{turmas.length !== 1 ? 's' : ''}</p>
        </div>
        <div style={styles.headerActions}>
          <input
            style={styles.search}
            placeholder="Buscar turma…"
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
          {podeGerenciar && (
            <button style={styles.btnPrimary} onClick={abrirNovo}>+ Nova turma</button>
          )}
        </div>
      </div>

      <div style={styles.tableWrap}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={styles.thead}>
              <th style={styles.th}>Código</th>
              <th style={styles.th}>Turma</th>
              <th style={styles.th}>Curso</th>
              <th style={styles.th}>Professor</th>
              <th style={styles.th}>Turno</th>
              <th style={styles.th}>Dias</th>
              <th style={styles.th}>Período</th>
              {podeGerenciar && <th style={styles.th}>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {turmasFiltradas.length === 0 ? (
              <tr><td colSpan={8} style={styles.empty}>Nenhuma turma encontrada.</td></tr>
            ) : turmasFiltradas.map((t, i) => (
              <tr key={t.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                <td style={styles.td}><code style={styles.code}>{t.codigo_sigop}</code></td>
                <td style={{ ...styles.td, fontWeight: 500 }}>{t.nome}</td>
                <td style={styles.td}>{t.curso?.nome ?? '—'}</td>
                <td style={styles.td}>
                  {t.professor ? (
                    <span>
                      {t.professor.nome}
                      <span style={styles.badge}>{PERFIL_LABEL[t.professor.perfil] ?? ''}</span>
                    </span>
                  ) : '—'}
                </td>
                <td style={styles.td}>{TURNO_LABEL[t.turno] ?? t.turno}</td>
                <td style={styles.td}>
                  <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                    {(t.dias_semana ?? []).map(d => (
                      <span key={d} style={styles.diaChip}>
                        {DIAS.find(x => x.key === d)?.label ?? d}
                      </span>
                    ))}
                  </div>
                </td>
                <td style={styles.td}>{fmt(t.data_inicio)} – {fmt(t.data_termino)}</td>
                {podeGerenciar && (
                  <td style={styles.td}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button style={styles.btnEdit} onClick={() => abrirEditar(t)}>✏️</button>
                      <button style={styles.btnDel} onClick={() => excluir(t.id)}>🗑️</button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de cadastro */}
      <Modal
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        titulo={editando ? 'Editar Turma' : 'Nova Turma'}
      >
        <form onSubmit={salvar} style={styles.form}>
          <div style={styles.row2}>
            <div style={styles.field}>
              <label style={styles.label}>Código SIGOP *</label>
              <input style={styles.input} value={form.codigo_sigop} onChange={e => setForm(f => ({ ...f, codigo_sigop: e.target.value }))} placeholder="Ex: DN122-001" required />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Nome da Turma *</label>
              <input style={styles.input} value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Turma A - Manhã" required />
            </div>
          </div>

          <div style={styles.row2}>
            <div style={styles.field}>
              <label style={styles.label}>Curso *</label>
              <select style={styles.input} value={form.curso_id} onChange={e => setForm(f => ({ ...f, curso_id: e.target.value }))} required>
                <option value="">Selecione um curso</option>
                {cursos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Professor</label>
              <select style={styles.input} value={form.professor_id} onChange={e => setForm(f => ({ ...f, professor_id: e.target.value }))}>
                <option value="">Sem professor</option>
                {professores.map(p => <option key={p.id} value={p.id}>{p.nome} ({PERFIL_LABEL[p.perfil] ?? p.perfil})</option>)}
              </select>
            </div>
          </div>

          <div style={styles.row2}>
            <div style={styles.field}>
              <label style={styles.label}>Turno *</label>
              <select style={styles.input} value={form.turno} onChange={e => setForm(f => ({ ...f, turno: e.target.value }))}>
                <option value="manha">Manhã</option>
                <option value="tarde">Tarde</option>
                <option value="noite">Noite</option>
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Vagas</label>
              <input style={styles.input} type="number" min="1" value={form.vagas} onChange={e => setForm(f => ({ ...f, vagas: e.target.value }))} placeholder="Ex: 30" />
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Dias da Semana</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {DIAS.map(d => (
                <label key={d.key} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '13px' }}>
                  <input
                    type="checkbox"
                    checked={form.dias_semana.includes(d.key)}
                    onChange={() => toggleDia(d.key)}
                  />
                  {d.label}
                </label>
              ))}
            </div>
          </div>

          <div style={styles.row2}>
            <div style={styles.field}>
              <label style={styles.label}>Início *</label>
              <input style={styles.input} type="date" value={form.data_inicio} onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))} required />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Término *</label>
              <input style={styles.input} type="date" value={form.data_termino} onChange={e => setForm(f => ({ ...f, data_termino: e.target.value }))} required />
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Local</label>
            <input style={styles.input} value={form.local} onChange={e => setForm(f => ({ ...f, local: e.target.value }))} placeholder="Ex: Sala 03" />
          </div>

          {erro && <div style={styles.erro}>{erro}</div>}

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button type="button" style={styles.btnSecondary} onClick={() => setModalAberto(false)}>Cancelar</button>
            <button type="submit" style={styles.btnPrimary} disabled={loading}>
              {loading ? 'Salvando…' : editando ? 'Atualizar' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: '32px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' },
  heading: { fontSize: '22px', fontWeight: '700', color: '#1e293b' },
  sub: { fontSize: '13px', color: '#94a3b8', marginTop: '2px' },
  headerActions: { display: 'flex', gap: '10px', alignItems: 'center' },
  search: { padding: '9px 14px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', outline: 'none', background: '#fff', width: '220px' },
  btnPrimary: { padding: '10px 18px', background: '#003366', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  btnSecondary: { padding: '10px 18px', background: '#f1f5f9', color: '#374151', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  tableWrap: { background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' },
  thead: { background: '#f8fafc' },
  th: { padding: '11px 14px', textAlign: 'left' as const, fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.6px', borderBottom: '1px solid #e2e8f0' },
  td: { padding: '12px 14px', fontSize: '13px', color: '#374151', borderBottom: '1px solid #f1f5f9' },
  empty: { padding: '48px', textAlign: 'center' as const, color: '#94a3b8', fontSize: '14px' },
  code: { fontFamily: 'monospace', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', color: '#003366' },
  badge: { marginLeft: '6px', fontSize: '10px', background: '#eff6ff', color: '#1d4ed8', padding: '1px 6px', borderRadius: '4px', fontWeight: '600' },
  diaChip: { fontSize: '10px', background: '#f0fdf4', color: '#16a34a', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' },
  btnEdit: { background: '#eff6ff', border: 'none', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', fontSize: '13px' },
  btnDel: { background: '#fef2f2', border: 'none', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', fontSize: '13px' },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  field: { display: 'flex', flexDirection: 'column', gap: '5px' },
  label: { fontSize: '12px', fontWeight: '600', color: '#374151' },
  input: { padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '7px', fontSize: '13px', color: '#1e293b', outline: 'none', background: '#f8fafc' },
  erro: { padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '7px', color: '#dc2626', fontSize: '13px' },
}

'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Usuario } from '@/types/database'
import Modal from '@/components/ui/Modal'

type Turma = { id: string; codigo_sigop: string; nome: string; turno: string; dias_semana?: string[]; curso?: { nome: string } | null }
type Aluno = {
  id: string; matricula: string; nome: string; cpf?: string | null
  turma_id: string; turma?: Turma | null
  empresa?: string | null; cnpj_contratante?: string | null
  data_inicio_contrato?: string | null; data_termino_contrato?: string | null
  status: string
}

interface Props {
  alunosIniciais: Aluno[]
  turmas: Turma[]
  cursos: { id: string; nome: string }[]
  usuario: Usuario
}

const STATUS_LABEL: Record<string, string> = { ativo: 'Ativo', inativo: 'Inativo', concluido: 'Concluído', cancelado: 'Cancelado' }
const STATUS_COLOR: Record<string, string> = { ativo: '#16a34a', inativo: '#64748b', concluido: '#0066cc', cancelado: '#dc2626' }
const STATUS_BG: Record<string, string> = { ativo: '#f0fdf4', inativo: '#f8fafc', concluido: '#eff6ff', cancelado: '#fef2f2' }
const DIAS: Record<string, string> = { segunda: 'Seg', terca: 'Ter', quarta: 'Qua', quinta: 'Qui', sexta: 'Sex', sabado: 'Sáb' }
const TURNO: Record<string, string> = { manha: 'Manhã', tarde: 'Tarde', noite: 'Noite' }

function fmt(d?: string | null) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}
function fmtCPF(c?: string | null) {
  if (!c) return '—'
  const n = c.replace(/\D/g, '')
  return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}
function fmtCNPJ(c?: string | null) {
  if (!c) return '—'
  const n = c.replace(/\D/g, '')
  return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

const EMPTY_FORM = {
  turma_id: '', nome: '', matricula: '', cpf: '', empresa: '', cnpj_contratante: '',
  data_inicio_contrato: '', data_termino_contrato: '', status: 'ativo',
}

export default function AlunosClient({ alunosIniciais, turmas, usuario }: Props) {
  const [alunos, setAlunos] = useState(alunosIniciais)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Aluno | null>(null)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const supabase = createClient()

  const podeGerenciar = ['adm', 'coordenacao'].includes(usuario.perfil)

  function abrirNovo() {
    setEditando(null); setForm({ ...EMPTY_FORM }); setErro(''); setModalAberto(true)
  }
  function abrirEditar(a: Aluno) {
    setEditando(a)
    setForm({
      turma_id: a.turma_id, nome: a.nome, matricula: a.matricula, cpf: a.cpf ?? '',
      empresa: a.empresa ?? '', cnpj_contratante: a.cnpj_contratante ?? '',
      data_inicio_contrato: a.data_inicio_contrato ?? '', data_termino_contrato: a.data_termino_contrato ?? '',
      status: a.status,
    })
    setErro(''); setModalAberto(true)
  }

  async function recarregar() {
    const { data } = await supabase.from('alunos').select(`*, turma:turmas(id, codigo_sigop, nome, turno, dias_semana, curso:cursos(nome))`).order('nome')
    setAlunos(data as Aluno[] ?? [])
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (!form.matricula || !form.nome || !form.turma_id) { setErro('Preencha os campos obrigatórios.'); return }
    setLoading(true); setErro('')
    const payload = {
      turma_id: form.turma_id, nome: form.nome, matricula: form.matricula,
      cpf: form.cpf || null, empresa: form.empresa || null,
      cnpj_contratante: form.cnpj_contratante || null,
      data_inicio_contrato: form.data_inicio_contrato || null,
      data_termino_contrato: form.data_termino_contrato || null,
      status: form.status,
    }
    if (editando) {
      const { error } = await supabase.from('alunos').update(payload).eq('id', editando.id)
      if (error) { setErro(error.message); setLoading(false); return }
    } else {
      const { error } = await supabase.from('alunos').insert(payload)
      if (error) { setErro(error.message); setLoading(false); return }
    }
    await recarregar(); setModalAberto(false); setLoading(false)
  }

  async function excluir(id: string) {
    if (!confirm('Excluir este aluno?')) return
    const { error } = await supabase.from('alunos').delete().eq('id', id)
    if (error) { alert(error.message); return }
    setAlunos(a => a.filter(x => x.id !== id))
  }

  function exportarCSV() {
    const linhas = [
      ['Turma SIGOP','Turma','Curso','Turno','Dias da Semana','Início Contrato','Término Contrato','Status','Empresa','CNPJ Contratante','Nome','Matrícula','CPF'],
      ...alunosFiltrados.map(a => [
        a.turma?.codigo_sigop ?? '',
        a.turma?.nome ?? '',
        (a.turma?.curso as { nome: string } | null | undefined)?.nome ?? '',
        TURNO[a.turma?.turno ?? ''] ?? '',
        (a.turma?.dias_semana ?? []).map((d: string) => DIAS[d] ?? d).join(';'),
        a.data_inicio_contrato ?? '',
        a.data_termino_contrato ?? '',
        STATUS_LABEL[a.status] ?? a.status,
        a.empresa ?? '',
        a.cnpj_contratante ?? '',
        a.nome,
        a.matricula,
        a.cpf ?? '',
      ])
    ]
    const csv = linhas.map(l => l.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'alunos_sigep.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const alunosFiltrados = alunos.filter(a =>
    (!busca || a.nome.toLowerCase().includes(busca.toLowerCase()) || a.matricula.toLowerCase().includes(busca.toLowerCase()) || a.turma?.codigo_sigop.toLowerCase().includes(busca.toLowerCase())) &&
    (!filtroStatus || a.status === filtroStatus)
  )

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.heading}>Alunos</h1>
          <p style={styles.sub}>{alunosFiltrados.length} de {alunos.length} aluno{alunos.length !== 1 ? 's' : ''}</p>
        </div>
        <div style={styles.headerActions}>
          <input style={styles.search} placeholder="Buscar…" value={busca} onChange={e => setBusca(e.target.value)} />
          <select style={{ ...styles.search, width: 'auto' }} value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
            <option value="">Todos os status</option>
            {Object.entries(STATUS_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button style={styles.btnOutline} onClick={exportarCSV}>↓ CSV</button>
          {podeGerenciar && <button style={styles.btnPrimary} onClick={abrirNovo}>+ Novo aluno</button>}
        </div>
      </div>

      <div style={styles.tableWrap}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={styles.thead}>
              <th style={styles.th}>Matrícula</th>
              <th style={styles.th}>Nome</th>
              <th style={styles.th}>Turma</th>
              <th style={styles.th}>Turno/Dias</th>
              <th style={styles.th}>Empresa</th>
              <th style={styles.th}>Contrato</th>
              <th style={styles.th}>Status</th>
              {podeGerenciar && <th style={styles.th}>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {alunosFiltrados.length === 0 ? (
              <tr><td colSpan={8} style={styles.empty}>Nenhum aluno encontrado.</td></tr>
            ) : alunosFiltrados.map((a, i) => (
              <tr key={a.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                <td style={styles.td}><code style={styles.code}>{a.matricula}</code></td>
                <td style={{ ...styles.td, fontWeight: 500 }}>{a.nome}{a.cpf && <div style={styles.cpf}>CPF: {fmtCPF(a.cpf)}</div>}</td>
                <td style={styles.td}>
                  <code style={styles.code}>{a.turma?.codigo_sigop}</code>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{a.turma?.nome}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>{(a.turma?.curso as { nome: string } | null | undefined)?.nome}</div>
                </td>
                <td style={styles.td}>
                  <div style={{ fontSize: '12px' }}>{TURNO[a.turma?.turno ?? ''] ?? '—'}</div>
                  <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap', marginTop: '3px' }}>
                    {(a.turma?.dias_semana ?? []).map((d: string) => <span key={d} style={styles.diaChip}>{DIAS[d]}</span>)}
                  </div>
                </td>
                <td style={styles.td}>{a.empresa ?? '—'}{a.cnpj_contratante && <div style={styles.cpf}>{fmtCNPJ(a.cnpj_contratante)}</div>}</td>
                <td style={styles.td}>
                  <div style={{ fontSize: '12px' }}>{fmt(a.data_inicio_contrato)}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>{fmt(a.data_termino_contrato)}</div>
                </td>
                <td style={styles.td}>
                  <span style={{ ...styles.statusBadge, color: STATUS_COLOR[a.status], background: STATUS_BG[a.status] }}>
                    {STATUS_LABEL[a.status] ?? a.status}
                  </span>
                </td>
                {podeGerenciar && (
                  <td style={styles.td}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button style={styles.btnEdit} onClick={() => abrirEditar(a)}>✏️</button>
                      <button style={styles.btnDel} onClick={() => excluir(a.id)}>🗑️</button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal aberto={modalAberto} onFechar={() => setModalAberto(false)} titulo={editando ? 'Editar Aluno' : 'Novo Aluno'} largura="600px">
        <form onSubmit={salvar} style={styles.form}>
          {/* Ordem dos campos conforme especificação */}
          <div style={styles.field}>
            <label style={styles.label}>Turma SIGOP *</label>
            <select style={styles.input} value={form.turma_id} onChange={e => setForm(f => ({ ...f, turma_id: e.target.value }))} required>
              <option value="">Selecione uma turma</option>
              {turmas.map(t => <option key={t.id} value={t.id}>{t.codigo_sigop} — {t.nome}</option>)}
            </select>
          </div>
          <div style={styles.row2}>
            <div style={styles.field}>
              <label style={styles.label}>Início do Contrato</label>
              <input style={styles.input} type="date" value={form.data_inicio_contrato} onChange={e => setForm(f => ({ ...f, data_inicio_contrato: e.target.value }))} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Término do Contrato</label>
              <input style={styles.input} type="date" value={form.data_termino_contrato} onChange={e => setForm(f => ({ ...f, data_termino_contrato: e.target.value }))} />
            </div>
          </div>
          <div style={styles.row2}>
            <div style={styles.field}>
              <label style={styles.label}>Status *</label>
              <select style={styles.input} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Empresa</label>
              <input style={styles.input} value={form.empresa} onChange={e => setForm(f => ({ ...f, empresa: e.target.value }))} placeholder="Nome da empresa" />
            </div>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>CNPJ Contratante</label>
            <input style={styles.input} value={form.cnpj_contratante} onChange={e => setForm(f => ({ ...f, cnpj_contratante: e.target.value }))} placeholder="00.000.000/0000-00" />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Nome do Aluno *</label>
            <input style={styles.input} value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome completo" required />
          </div>
          <div style={styles.row2}>
            <div style={styles.field}>
              <label style={styles.label}>Matrícula *</label>
              <input style={styles.input} value={form.matricula} onChange={e => setForm(f => ({ ...f, matricula: e.target.value }))} placeholder="Ex: 2025001" required />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>CPF</label>
              <input style={styles.input} value={form.cpf} onChange={e => setForm(f => ({ ...f, cpf: e.target.value }))} placeholder="000.000.000-00" />
            </div>
          </div>

          {erro && <div style={styles.erro}>{erro}</div>}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
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
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' },
  heading: { fontSize: '22px', fontWeight: '700', color: '#1e293b' },
  sub: { fontSize: '13px', color: '#94a3b8', marginTop: '2px' },
  headerActions: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' },
  search: { padding: '9px 14px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', outline: 'none', background: '#fff', width: '200px' },
  btnPrimary: { padding: '10px 18px', background: '#003366', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  btnSecondary: { padding: '10px 18px', background: '#f1f5f9', color: '#374151', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  btnOutline: { padding: '10px 14px', background: '#fff', color: '#374151', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  tableWrap: { background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' },
  thead: { background: '#f8fafc' },
  th: { padding: '11px 14px', textAlign: 'left' as const, fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.6px', borderBottom: '1px solid #e2e8f0' },
  td: { padding: '12px 14px', fontSize: '13px', color: '#374151', borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' },
  empty: { padding: '48px', textAlign: 'center' as const, color: '#94a3b8' },
  code: { fontFamily: 'monospace', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', color: '#003366' },
  cpf: { fontSize: '11px', color: '#94a3b8', marginTop: '2px' },
  diaChip: { fontSize: '10px', background: '#f0fdf4', color: '#16a34a', padding: '1px 5px', borderRadius: '3px', fontWeight: '600' },
  statusBadge: { fontSize: '11px', fontWeight: '600', padding: '3px 8px', borderRadius: '20px', display: 'inline-block' },
  btnEdit: { background: '#eff6ff', border: 'none', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', fontSize: '13px' },
  btnDel: { background: '#fef2f2', border: 'none', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', fontSize: '13px' },
  form: { display: 'flex', flexDirection: 'column', gap: '14px' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  field: { display: 'flex', flexDirection: 'column', gap: '5px' },
  label: { fontSize: '12px', fontWeight: '600', color: '#374151' },
  input: { padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '7px', fontSize: '13px', color: '#1e293b', outline: 'none', background: '#f8fafc' },
  erro: { padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '7px', color: '#dc2626', fontSize: '13px' },
}

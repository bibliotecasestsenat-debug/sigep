'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Usuario } from '@/types/database'

type Turma = { id: string; codigo_sigop: string; nome: string; turno: string; dias_semana?: string[]; curso?: { nome: string } | null }
type Aluno = { id: string; nome: string; matricula: string; status: string }
type RegistroFreq = { aluno_id: string; presente: boolean; justificativa?: string }

interface Props { turmas: Turma[]; usuario: Usuario }

const DIAS_LABEL: Record<string, string> = { segunda: 'Segunda', terca: 'Terça', quarta: 'Quarta', quinta: 'Quinta', sexta: 'Sexta', sabado: 'Sábado' }
const TURNO_LABEL: Record<string, string> = { manha: 'Manhã', tarde: 'Tarde', noite: 'Noite' }

export default function FrequenciaClient({ turmas, usuario }: Props) {
  const [codigoDigitado, setCodigoDigitado] = useState('')
  const [filtroDia, setFiltroDia] = useState('')
  const [filtroTurno, setFiltroTurno] = useState('')
  const [filtroCurso, setFiltroCurso] = useState('')
  const [turmasSelecionadas, setTurmasSelecionadas] = useState<Turma[]>([])
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [data, setData] = useState(new Date().toISOString().split('T')[0])
  const [registros, setRegistros] = useState<Record<string, RegistroFreq>>({})
  const [loading, setLoading] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')
  const supabase = createClient()

  const cursos = Array.from(new Set(turmas.map(t => (t.curso as { nome: string } | null)?.nome).filter(Boolean))) as string[]

  const buscarPorCodigo = useCallback(async () => {
    if (!codigoDigitado.trim()) return
    setLoading(true); setMsg('')
    const { data: turma } = await supabase.from('turmas').select('id, codigo_sigop, nome, turno, dias_semana, curso:cursos(nome)').eq('codigo_sigop', codigoDigitado.trim().toUpperCase()).maybeSingle()
    if (!turma) { setMsg('Turma não encontrada.'); setLoading(false); return }
    await carregarAlunos([turma as Turma])
    setLoading(false)
  }, [codigoDigitado, supabase])

  const buscarPorFiltro = useCallback(async () => {
    setLoading(true); setMsg('')
    let query = supabase.from('turmas').select('id, codigo_sigop, nome, turno, dias_semana, curso:cursos(nome)')
    if (filtroTurno) query = query.eq('turno', filtroTurno)
    // Filtro dia: usando contains em array
    if (filtroDia) query = query.contains('dias_semana', [filtroDia])
    const { data: ts } = await query.order('codigo_sigop')
    let resultado = (ts ?? []) as Turma[]
    if (filtroCurso) resultado = resultado.filter(t => (t.curso as { nome: string } | null)?.nome === filtroCurso)
    if (!resultado.length) { setMsg('Nenhuma turma encontrada com esse filtro.'); setLoading(false); return }
    await carregarAlunos(resultado)
    setLoading(false)
  }, [filtroTurno, filtroDia, filtroCurso, supabase])

  async function carregarAlunos(ts: Turma[]) {
    setTurmasSelecionadas(ts)
    const ids = ts.map(t => t.id)
    const { data: als } = await supabase.from('alunos').select('id, nome, matricula, status').in('turma_id', ids).eq('status', 'ativo').order('nome')
    const lista = als ?? []
    setAlunos(lista as Aluno[])
    // Carregar registros existentes
    const { data: freqs } = await supabase.from('frequencias').select('aluno_id, presente, justificativa').in('turma_id', ids).eq('data', data)
    const map: Record<string, RegistroFreq> = {}
    lista.forEach((a: Aluno) => { map[a.id] = { aluno_id: a.id, presente: false } })
    ;(freqs ?? []).forEach((f: { aluno_id: string; presente: boolean; justificativa?: string }) => { map[f.aluno_id] = { aluno_id: f.aluno_id, presente: f.presente, justificativa: f.justificativa } })
    setRegistros(map)
  }

  function togglePresenca(alunoId: string) {
    setRegistros(r => ({ ...r, [alunoId]: { ...r[alunoId], presente: !r[alunoId]?.presente } }))
  }
  function marcarTodos(presente: boolean) {
    setRegistros(r => { const novo = { ...r }; alunos.forEach(a => { novo[a.id] = { ...novo[a.id], presente } }); return novo })
  }

  async function salvar() {
    if (!alunos.length) return
    setSalvando(true); setMsg('')
    const turmaId = turmasSelecionadas[0]?.id // para chamada simples
    const payload = alunos.map(a => ({
      aluno_id: a.id,
      turma_id: turmaId,
      data,
      presente: registros[a.id]?.presente ?? false,
      justificativa: registros[a.id]?.justificativa || null,
      registrado_por: usuario.id,
    }))
    const { error } = await supabase.from('frequencias').upsert(payload, { onConflict: 'aluno_id,data' })
    if (error) { setMsg('Erro ao salvar: ' + error.message); setSalvando(false); return }
    setMsg(`✅ Frequência de ${new Date(data + 'T00:00:00').toLocaleDateString('pt-BR')} salva com sucesso!`)
    setSalvando(false)
  }

  const presentes = alunos.filter(a => registros[a.id]?.presente).length

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.heading}>Chamada / Frequência</h1>
          <p style={styles.sub}>Registre a presença dos alunos</p>
        </div>
      </div>

      {/* Painel de busca */}
      <div style={styles.painelBusca}>
        {/* Por código SIGOP */}
        <div style={styles.buscaBox}>
          <label style={styles.buscaTitle}>Buscar por código SIGOP</label>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <input
              style={styles.input}
              placeholder="Ex: DN122-001"
              value={codigoDigitado}
              onChange={e => setCodigoDigitado(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && buscarPorCodigo()}
            />
            <button style={styles.btnPrimary} onClick={buscarPorCodigo} disabled={loading}>Buscar</button>
          </div>
        </div>

        <div style={styles.ou}>ou</div>

        {/* Por filtro */}
        <div style={styles.buscaBox}>
          <label style={styles.buscaTitle}>Filtrar por dia / turno / curso</label>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
            <select style={styles.select} value={filtroDia} onChange={e => setFiltroDia(e.target.value)}>
              <option value="">Qualquer dia</option>
              {Object.entries(DIAS_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select style={styles.select} value={filtroTurno} onChange={e => setFiltroTurno(e.target.value)}>
              <option value="">Qualquer turno</option>
              {Object.entries(TURNO_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select style={styles.select} value={filtroCurso} onChange={e => setFiltroCurso(e.target.value)}>
              <option value="">Qualquer curso</option>
              {cursos.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button style={styles.btnPrimary} onClick={buscarPorFiltro} disabled={loading}>Filtrar</button>
          </div>
        </div>
      </div>

      {/* Data da chamada */}
      {alunos.length > 0 && (
        <div style={styles.section}>
          <div style={styles.chamadaHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                {turmasSelecionadas.length === 1
                  ? turmasSelecionadas[0].codigo_sigop + ' — ' + turmasSelecionadas[0].nome
                  : `${turmasSelecionadas.length} turmas selecionadas`}
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b' }}>
                {alunos.length} aluno{alunos.length !== 1 ? 's' : ''} · {presentes} presente{presentes !== 1 ? 's' : ''}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Data:</label>
              <input
                type="date"
                style={styles.input}
                value={data}
                onChange={async e => {
                  setData(e.target.value)
                  if (turmasSelecionadas.length) {
                    // Recarregar registros para nova data
                    const { data: freqs } = await supabase.from('frequencias').select('aluno_id, presente, justificativa').in('turma_id', turmasSelecionadas.map(t => t.id)).eq('data', e.target.value)
                    const map: Record<string, RegistroFreq> = {}
                    alunos.forEach(a => { map[a.id] = { aluno_id: a.id, presente: false } })
                    ;(freqs ?? []).forEach((f: { aluno_id: string; presente: boolean; justificativa?: string }) => { map[f.aluno_id] = { aluno_id: f.aluno_id, presente: f.presente, justificativa: f.justificativa } })
                    setRegistros(map)
                  }
                }}
              />
              <button style={styles.btnOutline} onClick={() => marcarTodos(true)}>✓ Todos presentes</button>
              <button style={styles.btnOutline} onClick={() => marcarTodos(false)}>✗ Todos ausentes</button>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px' }}>
            <thead>
              <tr style={styles.thead}>
                <th style={styles.th}>Matrícula</th>
                <th style={styles.th}>Nome</th>
                <th style={{ ...styles.th, textAlign: 'center' as const }}>Presença</th>
                <th style={styles.th}>Justificativa (falta)</th>
              </tr>
            </thead>
            <tbody>
              {alunos.map((a, i) => {
                const reg = registros[a.id]
                const presente = reg?.presente ?? false
                return (
                  <tr key={a.id} style={{ background: presente ? '#f0fdf4' : i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                    <td style={styles.td}><code style={styles.code}>{a.matricula}</code></td>
                    <td style={{ ...styles.td, fontWeight: 500 }}>{a.nome}</td>
                    <td style={{ ...styles.td, textAlign: 'center' as const }}>
                      <button
                        onClick={() => togglePresenca(a.id)}
                        style={{
                          ...styles.btnPresenca,
                          background: presente ? '#16a34a' : '#f1f5f9',
                          color: presente ? '#fff' : '#64748b',
                          borderColor: presente ? '#16a34a' : '#e2e8f0',
                        }}
                      >
                        {presente ? '✓ Presente' : '✗ Ausente'}
                      </button>
                    </td>
                    <td style={styles.td}>
                      {!presente && (
                        <input
                          style={{ ...styles.input, fontSize: '12px', padding: '6px 10px' }}
                          placeholder="Motivo da falta (opcional)"
                          value={reg?.justificativa ?? ''}
                          onChange={e => setRegistros(r => ({ ...r, [a.id]: { ...r[a.id], justificativa: e.target.value } }))}
                        />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {msg && (
            <div style={{ marginTop: '12px', padding: '12px 16px', background: msg.startsWith('✅') ? '#f0fdf4' : '#fef2f2', border: `1px solid ${msg.startsWith('✅') ? '#bbf7d0' : '#fecaca'}`, borderRadius: '8px', fontSize: '13px', color: msg.startsWith('✅') ? '#16a34a' : '#dc2626' }}>
              {msg}
            </div>
          )}

          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
            <button style={{ ...styles.btnPrimary, fontSize: '14px', padding: '12px 28px' }} onClick={salvar} disabled={salvando}>
              {salvando ? 'Salvando…' : '💾 Salvar chamada'}
            </button>
          </div>
        </div>
      )}

      {msg && !alunos.length && (
        <div style={{ padding: '16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '14px', marginTop: '16px' }}>
          {msg}
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: '32px' },
  header: { marginBottom: '24px' },
  heading: { fontSize: '22px', fontWeight: '700', color: '#1e293b' },
  sub: { fontSize: '13px', color: '#94a3b8', marginTop: '2px' },
  painelBusca: { background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'flex-start', gap: '24px', flexWrap: 'wrap', marginBottom: '24px' },
  buscaBox: { flex: 1, minWidth: '260px' },
  buscaTitle: { fontSize: '13px', fontWeight: '600', color: '#374151' },
  ou: { alignSelf: 'center', fontSize: '13px', color: '#94a3b8', fontWeight: '600', padding: '0 4px' },
  section: { background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  chamadaHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' },
  sectionTitle: { fontSize: '16px', fontWeight: '600', color: '#1e293b' },
  input: { padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '7px', fontSize: '13px', color: '#1e293b', outline: 'none', background: '#f8fafc' },
  select: { padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '7px', fontSize: '13px', outline: 'none', background: '#f8fafc' },
  btnPrimary: { padding: '10px 18px', background: '#002969', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  btnOutline: { padding: '8px 12px', background: '#fff', color: '#374151', border: '1.5px solid #e2e8f0', borderRadius: '7px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  thead: { background: '#f8fafc' },
  th: { padding: '11px 14px', textAlign: 'left' as const, fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.6px', borderBottom: '1px solid #e2e8f0' },
  td: { padding: '10px 14px', fontSize: '13px', color: '#374151', borderBottom: '1px solid #f1f5f9' },
  code: { fontFamily: 'monospace', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', color: '#002969' },
  btnPresenca: { padding: '6px 14px', border: '1.5px solid', borderRadius: '20px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s' },
}

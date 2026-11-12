'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Usuario } from '@/types/database'
import Modal from '@/components/ui/Modal'

type Turma = {
  id: string
  codigo_sigop: string
  nome: string
  turno: string
  dias_semana?: string[]
  curso?: { nome: string } | null
}
type Aluno = { id: string; nome: string; matricula: string; cpf?: string | null; empresa?: string | null }
interface Props { turmas: Turma[]; usuario: Usuario }

// Cor oficial SEST SENAT — Manual Técnico RGB 0,41,105 / PANTONE 281 CP
const BRAND = '#002969'

const MOTIVOS_ADV = [
  { key: 'faltas',       label: 'Faltas frequentes sem justificativa.' },
  { key: 'atrasos',      label: 'Atrasos constantes.' },
  { key: 'desrespeito',  label: 'Desrespeito a instrutores, funcionários ou colegas.' },
  { key: 'atividades',   label: 'Não realização das atividades propostas.' },
  { key: 'patrimonio',   label: 'Danos ao patrimônio da instituição.' },
  { key: 'tecnologia',   label: 'Uso inadequado de tecnologia durante as aulas.' },
  { key: 'comportamento', label: 'Comportamento inadequado no ambiente escolar.' },
  { key: 'regras',       label: 'Descumprimento das regras de conduta da instituição.' },
]

const MOTIVOS_SUSP = [
  { key: 'faltas',      label: 'Faltas não justificadas ao Programa' },
  { key: 'disciplinar', label: 'Falta disciplinar grave' },
]

const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']

// Mapeamento de nome do dia → Day of Week (0=Dom, 1=Seg, ..., 6=Sáb)
const DIA_TO_DOW: Record<string, number> = {
  segunda: 1,
  terca:   2,
  quarta:  3,
  quinta:  4,
  sexta:   5,
  sabado:  6,
}

/**
 * Calcula os próximos 3 dias de aula a partir de uma data de início,
 * baseado nos dias da semana em que a turma tem aulas.
 */
function calcularDiasSuspensao(dataInicio: string, diasSemana: string[]): Date[] {
  if (!diasSemana || diasSemana.length === 0) return []
  const diasDow = diasSemana.map(d => DIA_TO_DOW[d]).filter(n => n !== undefined)
  if (diasDow.length === 0) return []

  const [y, m, d] = dataInicio.split('-').map(Number)
  const result: Date[] = []
  const current = new Date(y, m - 1, d)

  while (result.length < 3) {
    const dow = current.getDay()
    if (diasDow.includes(dow)) {
      result.push(new Date(current))
    }
    current.setDate(current.getDate() + 1)
  }
  return result
}

/**
 * Formata lista de datas no estilo "12, 13 e 19 de novembro de 2026"
 */
function formatarDiasSuspensao(datas: Date[]): string {
  if (datas.length === 0) return ''
  if (datas.length === 1) {
    const d = datas[0]
    return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`
  }

  // Verificar se todos são do mesmo mês/ano
  const allSameMonth = datas.every(d =>
    d.getMonth() === datas[0].getMonth() &&
    d.getFullYear() === datas[0].getFullYear()
  )

  if (allSameMonth) {
    const mes  = MESES[datas[0].getMonth()]
    const ano  = datas[0].getFullYear()
    const nums = datas.map(d => d.getDate())
    const ultimo = nums.pop()!
    return `${nums.join(', ')} e ${ultimo} de ${mes} de ${ano}`
  }

  // Meses diferentes — formatar cada data completa
  const labels = datas.map(d => `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`)
  const ultimo = labels.pop()!
  return `${labels.join(', ')} e ${ultimo}`
}

function fmtLonga(d?: string): string {
  if (!d) return '___'
  const [y, m, day] = d.split('-')
  return `${parseInt(day)} de ${MESES[parseInt(m) - 1]} de ${y}`
}

function dateToStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

type FormState = {
  data: string
  data_inicio: string
  data_termino: string
  dias_calculados: Date[]       // calculado automaticamente
  observacoes: string
  descricao: string
}

type PreviewPayload = {
  tipo: 'advertencia' | 'suspensao'
  aluno: Aluno | null
  turma: Turma | null
  form: FormState
  motivos: string[]
  nomeEmissor: string
}

// ─────────────────────────────────────────────
// Logo inline SEST SENAT (SVG)
// ─────────────────────────────────────────────
function LogoSestSenat({ width = 200, variant = 'color' }: { width?: number; variant?: 'color' | 'white' }) {
  const bg   = variant === 'white' ? 'transparent' : BRAND
  const text = variant === 'white' ? '#FFFFFF' : '#FFFFFF'
  const h = Math.round(width * 60 / 320)
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 60" width={width} height={h} style={{ display: 'block' }}>
      <rect x="0" y="0" width="320" height="60" fill={bg} rx="2"/>
      {/* SEST */}
      <text x="12" y="24" fontFamily="Arial,sans-serif" fontWeight="800" fontSize="20" fill={text} letterSpacing="1.5">SEST</text>
      <text x="12" y="39" fontFamily="Arial,sans-serif" fontWeight="400" fontSize="7.5" fill={text} letterSpacing="0.5">SERVIÇO SOCIAL DO TRANSPORTE</text>
      {/* separador */}
      <line x1="130" y1="10" x2="130" y2="50" stroke={text} strokeWidth="1" opacity="0.3"/>
      {/* SENAT */}
      <text x="142" y="24" fontFamily="Arial,sans-serif" fontWeight="800" fontSize="20" fill={text} letterSpacing="1.5">SENAT</text>
      <text x="142" y="39" fontFamily="Arial,sans-serif" fontWeight="400" fontSize="7.5" fill={text} letterSpacing="0.5">SERVIÇO NAC. DE APRENDIZAGEM</text>
      <text x="142" y="50" fontFamily="Arial,sans-serif" fontWeight="400" fontSize="7.5" fill={text} letterSpacing="0.5">DO TRANSPORTE</text>
    </svg>
  )
}

// ─────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────
export default function DocumentosClient({ turmas, usuario }: Props) {
  const [turmaId, setTurmaId]   = useState('')
  const [alunos, setAlunos]     = useState<Aluno[]>([])
  const [alunoId, setAlunoId]   = useState('')
  const [tipoDoc, setTipoDoc]   = useState<'advertencia' | 'suspensao' | ''>('')
  const [motivos, setMotivos]   = useState<string[]>([])
  const [modalAberto, setModalAberto]     = useState(false)
  const [previewAberto, setPreviewAberto] = useState(false)
  const [previewData, setPreviewData]     = useState<PreviewPayload | null>(null)
  const [loading, setLoading]   = useState(false)
  const [msg, setMsg]           = useState('')

  const [form, setForm] = useState<FormState>({
    data: new Date().toISOString().split('T')[0],
    data_inicio: '',
    data_termino: '',
    dias_calculados: [],
    observacoes: '',
    descricao: '',
  })

  const supabase = createClient()

  async function carregarAlunos(tid: string) {
    setTurmaId(tid); setAlunoId(''); setAlunos([])
    if (!tid) return
    const { data } = await supabase
      .from('alunos').select('id, nome, matricula, cpf, empresa')
      .eq('turma_id', tid).eq('status', 'ativo').order('nome')
    setAlunos((data ?? []) as Aluno[])
  }

  function abrirModal(tipo: 'advertencia' | 'suspensao') {
    if (!turmaId || !alunoId) { setMsg('Selecione a turma e o aluno primeiro.'); return }
    setTipoDoc(tipo); setMotivos([])
    const hoje = new Date().toISOString().split('T')[0]
    const turmaAtual = turmas.find(t => t.id === turmaId)
    const dias = tipo === 'suspensao' && turmaAtual?.dias_semana
      ? calcularDiasSuspensao(hoje, turmaAtual.dias_semana)
      : []
    setForm({
      data: hoje,
      data_inicio: dias.length > 0 ? dateToStr(dias[0]) : '',
      data_termino: dias.length > 0 ? dateToStr(dias[dias.length - 1]) : '',
      dias_calculados: dias,
      observacoes: '',
      descricao: '',
    })
    setMsg(''); setModalAberto(true)
  }

  function handleDataInicioChange(newDate: string) {
    const turmaAtual = turmas.find(t => t.id === turmaId)
    const dias = turmaAtual?.dias_semana
      ? calcularDiasSuspensao(newDate, turmaAtual.dias_semana)
      : []
    setForm(f => ({
      ...f,
      data_inicio: newDate,
      data_termino: dias.length > 0 ? dateToStr(dias[dias.length - 1]) : '',
      dias_calculados: dias,
    }))
  }

  function toggleMotivo(key: string) {
    setMotivos(m => m.includes(key) ? m.filter(x => x !== key) : [...m, key])
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (tipoDoc === 'advertencia' && motivos.length === 0 && !form.observacoes.trim()) {
      setMsg('Selecione ao menos um motivo ou informe uma observação.'); return
    }
    setLoading(true); setMsg('')

    const listaMotivos = tipoDoc === 'advertencia'
      ? MOTIVOS_ADV.filter(m => motivos.includes(m.key)).map(m => m.label)
      : MOTIVOS_SUSP.filter(m => motivos.includes(m.key)).map(m => m.label)
    const descCombo = [...listaMotivos, form.descricao, form.observacoes].filter(Boolean).join('\n')

    if (tipoDoc === 'advertencia') {
      const { error } = await supabase.from('advertencias').insert({
        aluno_id: alunoId, turma_id: turmaId,
        descricao: descCombo, data: form.data,
        emitido_por: usuario.id,
      })
      if (error) { setMsg('Erro: ' + error.message); setLoading(false); return }
    } else {
      const dataInicio = form.data_inicio || form.data
      const dataTermino = form.data_termino || form.data_inicio || form.data
      const { error } = await supabase.from('suspensoes').insert({
        aluno_id: alunoId, turma_id: turmaId,
        motivo: descCombo, data_inicio: dataInicio,
        data_termino: dataTermino, emitido_por: usuario.id,
      })
      if (error) { setMsg('Erro: ' + error.message); setLoading(false); return }
    }

    const turma = turmas.find(t => t.id === turmaId) ?? null
    const aluno = alunos.find(a => a.id === alunoId) ?? null
    setPreviewData({
      tipo: tipoDoc as 'advertencia' | 'suspensao',
      aluno, turma, form, motivos,
      nomeEmissor: usuario.nome,
    })
    setModalAberto(false); setLoading(false)
    setMsg(`✅ ${tipoDoc === 'advertencia' ? 'Advertência' : 'Suspensão'} registrada com sucesso!`)
    setPreviewAberto(true)
  }

  const turmaAtual = turmas.find(t => t.id === turmaId)
  const alunoAtual = alunos.find(a => a.id === alunoId)
  const diasTextoPreview = form.dias_calculados.length > 0
    ? formatarDiasSuspensao(form.dias_calculados)
    : fmtLonga(form.data_inicio)

  return (
    <div style={S.page}>
      <div style={S.header}>
        <h1 style={S.heading}>Documentos</h1>
        <p style={S.sub}>Emissão de advertências e suspensões</p>
      </div>

      {/* Seleção turma/aluno */}
      <div style={S.selecaoBox}>
        <div style={S.field}>
          <label style={S.label}>Turma</label>
          <select style={S.select} value={turmaId} onChange={e => carregarAlunos(e.target.value)}>
            <option value="">Selecione uma turma</option>
            {turmas.map(t => <option key={t.id} value={t.id}>{t.codigo_sigop} — {t.nome}</option>)}
          </select>
        </div>
        <div style={S.field}>
          <label style={S.label}>Aluno</label>
          <select style={S.select} value={alunoId} onChange={e => setAlunoId(e.target.value)} disabled={!alunos.length}>
            <option value="">Selecione um aluno</option>
            {alunos.map(a => <option key={a.id} value={a.id}>{a.nome} · {a.matricula}</option>)}
          </select>
        </div>
      </div>

      {/* Card do aluno selecionado */}
      {alunoAtual && (
        <div style={S.alunoCard}>
          <div style={S.alunoAvatar}>{alunoAtual.nome.charAt(0)}</div>
          <div>
            <div style={S.alunoNome}>{alunoAtual.nome}</div>
            <div style={S.alunoInfo}>Mat. {alunoAtual.matricula} · {turmaAtual?.codigo_sigop} — {turmaAtual?.nome}</div>
            {turmaAtual?.dias_semana?.length && (
              <div style={S.alunoInfo}>
                Dias de aula: {turmaAtual.dias_semana.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Botões de ação */}
      <div style={S.acoes}>
        <button
          style={{ ...S.docBtn, background: '#fef3c7', borderColor: '#fbbf24', color: '#92400e' }}
          onClick={() => abrirModal('advertencia')}
          disabled={!alunoId}
        >
          <div style={{ ...S.docBtnIcon, background: '#f59e0b' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px' }}>Advertência</div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>Emitir termo de advertência</div>
          </div>
        </button>
        <button
          style={{ ...S.docBtn, background: '#fef2f2', borderColor: '#fca5a5', color: '#7f1d1d' }}
          onClick={() => abrirModal('suspensao')}
          disabled={!alunoId}
        >
          <div style={{ ...S.docBtnIcon, background: '#dc2626' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px' }}>Suspensão</div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>Emitir termo de suspensão (3 dias)</div>
          </div>
        </button>
      </div>

      {msg && !modalAberto && !previewAberto && (
        <div style={{ marginTop: '16px', padding: '14px 16px', background: msg.startsWith('✅') ? '#f0fdf4' : '#fef2f2', borderRadius: '8px', fontSize: '14px', color: msg.startsWith('✅') ? '#16a34a' : '#dc2626' }}>
          {msg}
        </div>
      )}

      {/* ── Modal de preenchimento ── */}
      <Modal
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        titulo={tipoDoc === 'advertencia' ? 'Emitir Advertência' : 'Emitir Suspensão'}
        largura="580px"
      >
        <div style={S.docInfo}>
          <strong>{alunoAtual?.nome}</strong> · {alunoAtual?.matricula}<br />
          <span style={{ color: '#64748b' }}>{turmaAtual?.codigo_sigop} — {turmaAtual?.nome}</span>
        </div>

        <form onSubmit={salvar} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
          {tipoDoc === 'advertencia' ? (
            <>
              <div style={S.field}>
                <label style={S.label}>Motivos da Advertência *</label>
                <div style={S.checkGroup}>
                  {MOTIVOS_ADV.map(m => (
                    <label key={m.key} style={S.checkLabel}>
                      <input
                        type="checkbox"
                        checked={motivos.includes(m.key)}
                        onChange={() => toggleMotivo(m.key)}
                        style={{ accentColor: BRAND, width: '14px', height: '14px' }}
                      />
                      {m.label}
                    </label>
                  ))}
                </div>
              </div>
              <div style={S.field}>
                <label style={S.label}>Obs. (observações adicionais)</label>
                <textarea
                  style={{ ...S.select, minHeight: '80px', resize: 'vertical' as const }}
                  value={form.observacoes}
                  onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                  placeholder="Descreva detalhes adicionais (opcional)…"
                />
              </div>
              <div style={S.field}>
                <label style={S.label}>Data *</label>
                <input style={S.select} type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} required />
              </div>
            </>
          ) : (
            <>
              <div style={S.field}>
                <label style={S.label}>Data de início da suspensão *</label>
                <input
                  style={S.select}
                  type="date"
                  value={form.data_inicio}
                  onChange={e => handleDataInicioChange(e.target.value)}
                  required
                />
                {form.dias_calculados.length > 0 && (
                  <div style={{ marginTop: '6px', padding: '8px 12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '12px', color: '#1d4ed8' }}>
                    <strong>Dias automáticos:</strong> {diasTextoPreview}
                    <div style={{ marginTop: '2px', color: '#3b82f6' }}>
                      Término: {fmtLonga(form.data_termino)}
                    </div>
                  </div>
                )}
                {!turmaAtual?.dias_semana?.length && (
                  <div style={{ marginTop: '6px', fontSize: '11px', color: '#f59e0b' }}>
                    ⚠ Esta turma não tem dias de aula cadastrados. Cadastre os dias da semana na turma para cálculo automático.
                  </div>
                )}
              </div>
              <div style={S.field}>
                <label style={S.label}>Motivo</label>
                <div style={S.checkGroup}>
                  {MOTIVOS_SUSP.map(m => (
                    <label key={m.key} style={S.checkLabel}>
                      <input
                        type="checkbox"
                        checked={motivos.includes(m.key)}
                        onChange={() => toggleMotivo(m.key)}
                        style={{ accentColor: BRAND, width: '14px', height: '14px' }}
                      />
                      {m.label}
                    </label>
                  ))}
                </div>
              </div>
              <div style={S.field}>
                <label style={S.label}>Outros / Histórico disciplinar</label>
                <textarea
                  style={{ ...S.select, minHeight: '100px', resize: 'vertical' as const }}
                  value={form.descricao}
                  onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  placeholder="Descreva o motivo específico ou o histórico de ocorrências…"
                />
              </div>
            </>
          )}

          {msg && <div style={S.erro}>{msg}</div>}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button type="button" style={S.btnSecondary} onClick={() => setModalAberto(false)}>Cancelar</button>
            <button type="submit" style={S.btnPrimary} disabled={loading}>
              {loading ? 'Salvando…' : 'Registrar e Visualizar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal de prévia / impressão ── */}
      <Modal aberto={previewAberto} onFechar={() => setPreviewAberto(false)} titulo="Prévia do Documento" largura="760px">
        {previewData && (
          <>
            <style>{`
              @media print {
                body > * { display: none !important; }
                #docPrint { display: block !important; position: fixed; top: 0; left: 0; width: 100%; z-index: 9999; background: #fff; }
              }
            `}</style>
            <div
              id="docPrint"
              style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '4px',
                padding: '36px 48px',
                maxHeight: '70vh',
                overflowY: 'auto',
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '12px',
                color: '#000',
                lineHeight: 1.6,
              }}
            >
              {previewData.tipo === 'advertencia'
                ? <AdvertenciaDoc data={previewData} />
                : <SuspensaoDoc data={previewData} />
              }
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button style={S.btnSecondary} onClick={() => setPreviewAberto(false)}>Fechar</button>
              <button style={S.btnPrimary} onClick={() => window.print()}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
                  </svg>
                  Imprimir
                </span>
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}

// ─────────────────────────────────────────────
// Template: Advertência Disciplinar
// (layout fiel ao modelo oficial SEST SENAT)
// ─────────────────────────────────────────────
function AdvertenciaDoc({ data: pd }: { data: PreviewPayload }) {
  const { aluno, turma, form, motivos, nomeEmissor } = pd

  // Formatar data por extenso
  const dataDoc = form.data
  const [dy, dm, dd] = dataDoc.split('-')
  const dataLonga = `${parseInt(dd)} de ${MESES[parseInt(dm) - 1]} de ${dy}`

  return (
    <div style={{ width: '100%' }}>
      {/* ── Aviso de confidencialidade ── */}
      <div style={{
        background: '#f0f0f0',
        border: '1px solid #ccc',
        padding: '5px 12px',
        fontSize: '9.5px',
        textAlign: 'center',
        marginBottom: '20px',
        color: '#555',
        lineHeight: 1.4,
      }}>
        Este documento foi classificado como informação interna e não deve ser compartilhado com pessoas de fora da Organização.
      </div>

      {/* ── Cabeçalho com logo ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: `3px solid ${BRAND}`, paddingBottom: '12px' }}>
        <LogoSestSenat width={180} />
        <div style={{ textAlign: 'right', fontSize: '10px', color: '#555' }}>
          <div style={{ fontWeight: 600, color: BRAND }}>Unidade DN122 — Serra/ES</div>
          <div>Rua Francisco Sousa dos Santos, 1025</div>
          <div>Jardim Limoeiro — CEP 29.164-153</div>
        </div>
      </div>

      {/* ── Título ── */}
      <h2 style={{
        textAlign: 'center',
        fontSize: '15px',
        fontWeight: 'bold',
        color: BRAND,
        letterSpacing: '2px',
        margin: '0 0 6px',
        textTransform: 'uppercase',
      }}>
        ADVERTÊNCIA DISCIPLINAR
      </h2>
      <p style={{ textAlign: 'center', fontSize: '11px', margin: '0 0 20px', color: '#333', lineHeight: 1.5 }}>
        Este documento informa que o aprendiz identificado recebeu uma advertência disciplinar,
        conforme as regras do regulamento interno da instituição.
      </p>

      {/* ── Checkboxes de motivos ── */}
      <p style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '11.5px' }}>Motivos da Advertência:</p>
      <div style={{ marginBottom: '14px' }}>
        {MOTIVOS_ADV.map(m => (
          <div key={m.key} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '5px', lineHeight: 1.4 }}>
            <span style={{ fontSize: '15px', flexShrink: 0, lineHeight: '1.1' }}>
              {motivos.includes(m.key) ? '☒' : '☐'}
            </span>
            <span style={{ fontSize: '11.5px' }}>{m.label}</span>
          </div>
        ))}
      </div>

      {/* ── Observações ── */}
      <div style={{ marginBottom: '16px' }}>
        <span style={{ fontWeight: 'bold', fontSize: '11.5px' }}>Obs.: </span>
        <span style={{ fontSize: '11.5px' }}>
          {form.observacoes || '_____________________________________________________________________________________________________________'}
        </span>
      </div>

      {/* ── Data e cidade ── */}
      <p style={{ marginBottom: '24px', fontSize: '11.5px' }}>
        Serra, Espírito Santo, {dataLonga}.
      </p>

      {/* ── Bloco de assinaturas ── */}
      <div style={{ display: 'flex', gap: '40px', marginBottom: '28px' }}>
        {/* Técnico */}
        <div style={{ flex: 1 }}>
          <div style={{ borderBottom: '1px solid #000', height: '40px', marginBottom: '5px' }} />
          <div style={{ fontSize: '11px', textAlign: 'center', fontWeight: 600 }}>{nomeEmissor || 'Victor Hugo Alves de Souza'}</div>
          <div style={{ fontSize: '10px', textAlign: 'center' }}>Técnico de Formação Profissional Pedagógico</div>
        </div>
        {/* Aluno */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '11px', fontWeight: 600, marginBottom: '8px' }}>Recebido e assinado pelo aluno:</div>
          <div style={{ fontSize: '11px', marginBottom: '12px' }}>
            Assinatura: ________________________________________________
          </div>
          <div style={{ fontSize: '11px' }}>Data: ___ / ___ / ________</div>
        </div>
      </div>

      {/* ── Rodapé: unidade (esq) + dados do aluno (dir) ── */}
      <div style={{
        borderTop: `2px solid ${BRAND}`,
        paddingTop: '12px',
        display: 'flex',
        justifyContent: 'space-between',
        gap: '24px',
        fontSize: '10.5px',
      }}>
        <div>
          <div style={{ fontWeight: 'bold', color: BRAND, fontSize: '11.5px', marginBottom: '3px' }}>SEST SENAT</div>
          <div>Unidade Operacional Floriano Rangel Peixoto – DN122</div>
          <div>Endereço: Rua Francisco Sousa dos Santos, 1025,</div>
          <div>Jardim Limoeiro, Serra/ES</div>
          <div>CEP: 29.164-153 &nbsp;·&nbsp; CNPJ: 73.471.963/0031-62</div>
          <div style={{ marginTop: '4px' }}>Nº declaração CNAP: ____________________________</div>
        </div>
        <div style={{ minWidth: '220px' }}>
          <div style={{ marginBottom: '4px' }}><strong>NOME:</strong> {aluno?.nome?.toUpperCase()}</div>
          <div style={{ marginBottom: '3px' }}><strong>Matrícula:</strong> {aluno?.matricula}</div>
          <div style={{ marginBottom: '3px' }}><strong>Turma:</strong> {turma?.codigo_sigop}</div>
          <div><strong>Curso:</strong> {turma?.nome}</div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Template: Suspensão
// (layout fiel ao modelo oficial SEST SENAT)
// ─────────────────────────────────────────────
function SuspensaoDoc({ data: pd }: { data: PreviewPayload }) {
  const { aluno, form, motivos, nomeEmissor } = pd

  const diasTexto = form.dias_calculados.length > 0
    ? formatarDiasSuspensao(form.dias_calculados)
    : fmtLonga(form.data_inicio)

  const dataDoc = form.data_inicio || new Date().toISOString().split('T')[0]
  const dataLonga = fmtLonga(dataDoc)

  return (
    <div style={{ width: '100%' }}>
      {/* ── Cabeçalho da unidade (linha superior com sublinhado) ── */}
      <div style={{
        textAlign: 'center',
        borderBottom: `2px solid ${BRAND}`,
        paddingBottom: '10px',
        marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
          <LogoSestSenat width={200} />
        </div>
        <div style={{ fontWeight: 'bold', fontSize: '12.5px', color: BRAND, marginBottom: '3px' }}>
          SEST SENAT — UNIDADE DN122
        </div>
        <div style={{ fontSize: '10.5px', color: '#333' }}>
          Rua Francisco Sousa dos Santos, 1025, Jardim Limoeiro, Serra/ES — CEP: 29.164-153 — Tel.: (27) 3205-1050
        </div>
      </div>

      {/* ── Título ── */}
      <h2 style={{
        textAlign: 'center',
        fontSize: '16px',
        fontWeight: 'bold',
        color: BRAND,
        letterSpacing: '3px',
        margin: '0 0 22px',
        textTransform: 'uppercase',
      }}>
        SUSPENSÃO
      </h2>

      {/* ── Parágrafo legal ── */}
      <p style={{ textAlign: 'justify', marginBottom: '20px', lineHeight: 1.75, fontSize: '11.5px' }}>
        A coordenação pedagógica do programa Jovem Aprendiz, com base na Lei nº. 10.097 de 19/12/2000 e Decreto
        nº. 5598 de 01/12/2005, Capítulo V, Seção VIII, Artigo 28, inciso II, vem aplicar uma suspensão de{' '}
        <strong>03 (três) dias — {diasTexto}</strong> — a(o) aluna(o){' '}
        <strong>{aluno?.nome?.toUpperCase() ?? '______________________________'}</strong>{' '}
        do Programa de Aprendizagem, em virtude do seguinte fato:
      </p>

      {/* ── Checkboxes de motivo ── */}
      <div style={{ paddingLeft: '8px', marginBottom: '20px' }}>
        {MOTIVOS_SUSP.map(m => (
          <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{ fontSize: '15px', lineHeight: 1 }}>{motivos.includes(m.key) ? '☒' : '☐'}</span>
            <span style={{ fontSize: '11.5px' }}>{m.label}</span>
          </div>
        ))}
        <div style={{ marginTop: '8px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 600 }}>Outros: </span>
          <span style={{ fontSize: '11.5px' }}>
            {form.descricao || '________________________________________________________________________________'}
          </span>
        </div>
      </div>

      {/* ── Cidade e data ── */}
      <p style={{ marginBottom: '32px', fontSize: '11.5px' }}>
        Serra/ES, {dataLonga}.
      </p>

      {/* ── 5 assinaturas: 2 × 2 + 1 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 48px', marginBottom: '24px' }}>
        {[
          nomeEmissor || 'Victor Hugo Alves de Souza',
          'Instrutor(a)',
          'Responsável pelo Jovem',
          'Nome do aluno e assinatura',
        ].map(label => (
          <div key={label}>
            <div style={{ borderBottom: '1px solid #000', height: '44px', marginBottom: '5px' }} />
            <div style={{ fontSize: '10.5px', textAlign: 'center' }}>{label}</div>
          </div>
        ))}
      </div>
      <div style={{ maxWidth: '48%' }}>
        <div style={{ borderBottom: '1px solid #000', height: '44px', marginBottom: '5px' }} />
        <div style={{ fontSize: '10.5px' }}>Responsável na empresa</div>
      </div>

      {/* ── Rodapé ── */}
      <div style={{ borderTop: `1px solid ${BRAND}`, marginTop: '28px', paddingTop: '8px', fontSize: '9.5px', color: '#555', textAlign: 'center' }}>
        SEST SENAT — Unidade Operacional Floriano Rangel Peixoto – DN122 &nbsp;·&nbsp;
        CNPJ: 73.471.963/0031-62 &nbsp;·&nbsp; CEP: 29.164-153
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Estilos da interface (não do documento)
// ─────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  page:       { padding: '32px' },
  header:     { marginBottom: '24px' },
  heading:    { fontSize: '22px', fontWeight: '700', color: '#1e293b', margin: 0 },
  sub:        { fontSize: '13px', color: '#94a3b8', marginTop: '2px' },
  selecaoBox: { background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' },
  field:      { display: 'flex', flexDirection: 'column', gap: '5px' },
  label:      { fontSize: '12px', fontWeight: '600', color: '#374151' },
  select:     { padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '7px', fontSize: '13px', color: '#1e293b', outline: 'none', background: '#f8fafc' },
  alunoCard:  { display: 'flex', alignItems: 'center', gap: '14px', background: '#fff', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '24px' },
  alunoAvatar:{ width: '44px', height: '44px', background: BRAND, color: '#fff', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '700', flexShrink: 0 },
  alunoNome:  { fontSize: '15px', fontWeight: '600', color: '#1e293b' },
  alunoInfo:  { fontSize: '12px', color: '#64748b', marginTop: '2px' },
  acoes:      { display: 'flex', gap: '16px' },
  docBtn:     { flex: 1, display: 'flex', alignItems: 'center', gap: '16px', padding: '20px 24px', border: '2px solid', borderRadius: '12px', cursor: 'pointer', textAlign: 'left' as const, background: 'transparent' },
  docBtnIcon: { width: '44px', height: '44px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  docInfo:    { background: '#f8fafc', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', color: '#374151', borderLeft: `3px solid ${BRAND}` },
  checkGroup: { background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' },
  checkLabel: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#374151' },
  btnPrimary: { padding: '10px 18px', background: BRAND, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  btnSecondary:{ padding: '10px 18px', background: '#f1f5f9', color: '#374151', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  erro:       { padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '7px', color: '#dc2626', fontSize: '13px' },
}

'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Usuario } from '@/types/database'
import Modal from '@/components/ui/Modal'

type Turma = { id: string; codigo_sigop: string; nome: string; turno: string; curso?: { nome: string } | null }
type Aluno = { id: string; nome: string; matricula: string; cpf?: string | null; empresa?: string | null }
interface Props { turmas: Turma[]; usuario: Usuario }

// Cor oficial SEST SENAT — Manual Técnico RGB 0,41,105
const BRAND = '#002969'

const MOTIVOS_ADV = [
  { key: 'faltas',       label: 'Faltas frequentes sem justificativa.' },
  { key: 'atrasos',      label: 'Atrasos constantes' },
  { key: 'desrespeito',  label: 'Desrespeito a instrutores, funcionários ou colegas.' },
  { key: 'atividades',   label: 'Não realização das atividades propostas' },
  { key: 'patrimonio',   label: 'Danos ao patrimônio da instituição' },
  { key: 'tecnologia',   label: 'Uso inadequado de tecnologia durante as aulas' },
  { key: 'comportamento',label: 'Comportamento inadequado no ambiente escolar' },
  { key: 'regras',       label: 'Descumprimento das regras de conduta da instituição' },
]

const MOTIVOS_SUSP = [
  { key: 'faltas',      label: 'Faltas não justificadas ao Programa' },
  { key: 'disciplinar', label: 'Falta disciplinar grave' },
]

const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']

function fmtLonga(d?: string): string {
  if (!d) return '___'
  const [y, m, day] = d.split('-')
  return `${parseInt(day)} de ${MESES[parseInt(m) - 1]} de ${y}`
}

function fmtCurta(d?: string): string {
  if (!d) return '___'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

type FormState = {
  data: string
  data_inicio: string
  data_termino: string
  num_dias: string
  dias_texto: string   // "10, 16, 17 de novembro de 2026"
  observacoes: string  // obs. para advertência
  descricao: string    // "Outros" para suspensão
}

type PreviewPayload = {
  tipo: 'advertencia' | 'suspensao'
  aluno: Aluno | null
  turma: Turma | null
  form: FormState
  motivos: string[]
}

// ─────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────
export default function DocumentosClient({ turmas, usuario }: Props) {
  const [turmaId, setTurmaId]     = useState('')
  const [alunos, setAlunos]       = useState<Aluno[]>([])
  const [alunoId, setAlunoId]     = useState('')
  const [tipoDoc, setTipoDoc]     = useState<'advertencia' | 'suspensao' | ''>('')
  const [motivos, setMotivos]     = useState<string[]>([])
  const [modalAberto, setModalAberto]   = useState(false)
  const [previewAberto, setPreviewAberto] = useState(false)
  const [previewData, setPreviewData] = useState<PreviewPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const [form, setForm] = useState<FormState>({
    data: new Date().toISOString().split('T')[0],
    data_inicio: '', data_termino: '',
    num_dias: '', dias_texto: '',
    observacoes: '', descricao: '',
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
    setForm({ data: new Date().toISOString().split('T')[0], data_inicio: '', data_termino: '', num_dias: '', dias_texto: '', observacoes: '', descricao: '' })
    setMsg(''); setModalAberto(true)
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
      if (!form.data_inicio || !form.data_termino) { setMsg('Informe o período de suspensão.'); setLoading(false); return }
      const { error } = await supabase.from('suspensoes').insert({
        aluno_id: alunoId, turma_id: turmaId,
        motivo: descCombo, data_inicio: form.data_inicio,
        data_termino: form.data_termino, emitido_por: usuario.id,
      })
      if (error) { setMsg('Erro: ' + error.message); setLoading(false); return }
    }

    const turma = turmas.find(t => t.id === turmaId) ?? null
    const aluno = alunos.find(a => a.id === alunoId) ?? null
    setPreviewData({ tipo: tipoDoc as 'advertencia' | 'suspensao', aluno, turma, form, motivos })
    setModalAberto(false); setLoading(false)
    setMsg(`✅ ${tipoDoc === 'advertencia' ? 'Advertência' : 'Suspensão'} registrada com sucesso!`)
    setPreviewAberto(true)
  }

  const turmaAtual = turmas.find(t => t.id === turmaId)
  const alunoAtual = alunos.find(a => a.id === alunoId)

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
            {alunoAtual.empresa && <div style={S.alunoInfo}>{alunoAtual.empresa}</div>}
          </div>
        </div>
      )}

      {/* Botões de ação */}
      <div style={S.acoes}>
        <button style={{ ...S.docBtn, background: '#fef3c7', borderColor: '#fbbf24', color: '#92400e' }} onClick={() => abrirModal('advertencia')} disabled={!alunoId}>
          <span style={{ fontSize: '24px' }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px' }}>Advertência</div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>Emitir termo de advertência</div>
          </div>
        </button>
        <button style={{ ...S.docBtn, background: '#fef2f2', borderColor: '#fca5a5', color: '#7f1d1d' }} onClick={() => abrirModal('suspensao')} disabled={!alunoId}>
          <span style={{ fontSize: '24px' }}>🚫</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px' }}>Suspensão</div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>Emitir termo de suspensão</div>
          </div>
        </button>
      </div>

      {msg && !modalAberto && !previewAberto && (
        <div style={{ marginTop: '16px', padding: '14px 16px', background: msg.startsWith('✅') ? '#f0fdf4' : '#fef2f2', borderRadius: '8px', fontSize: '14px', color: msg.startsWith('✅') ? '#16a34a' : '#dc2626' }}>
          {msg}
        </div>
      )}

      {/* ── Modal de preenchimento ── */}
      <Modal aberto={modalAberto} onFechar={() => setModalAberto(false)} titulo={tipoDoc === 'advertencia' ? '⚠️ Emitir Advertência' : '🚫 Emitir Suspensão'} largura="560px">
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
                      <input type="checkbox" checked={motivos.includes(m.key)} onChange={() => toggleMotivo(m.key)} style={{ accentColor: BRAND, width: '14px', height: '14px' }} />
                      {m.label}
                    </label>
                  ))}
                </div>
              </div>
              <div style={S.field}>
                <label style={S.label}>Obs. (observações adicionais)</label>
                <textarea style={{ ...S.select, minHeight: '80px', resize: 'vertical' }} value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} placeholder="Descreva detalhes adicionais (opcional)…" />
              </div>
              <div style={S.field}>
                <label style={S.label}>Data *</label>
                <input style={S.select} type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} required />
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', gap: '12px' }}>
                <div style={S.field}>
                  <label style={S.label}>Nº de dias</label>
                  <input style={S.select} type="number" min="1" value={form.num_dias} onChange={e => setForm(f => ({ ...f, num_dias: e.target.value }))} placeholder="3" />
                </div>
                <div style={S.field}>
                  <label style={S.label}>Início *</label>
                  <input style={S.select} type="date" value={form.data_inicio} onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))} required />
                </div>
                <div style={S.field}>
                  <label style={S.label}>Término *</label>
                  <input style={S.select} type="date" value={form.data_termino} onChange={e => setForm(f => ({ ...f, data_termino: e.target.value }))} required />
                </div>
              </div>
              <div style={S.field}>
                <label style={S.label}>
                  Datas no documento <span style={{ fontWeight: 400, color: '#94a3b8' }}>(ex.: 10, 16, 17 de novembro de 2026)</span>
                </label>
                <input style={S.select} value={form.dias_texto} onChange={e => setForm(f => ({ ...f, dias_texto: e.target.value }))} placeholder="Deixe em branco para usar a data de início" />
              </div>
              <div style={S.field}>
                <label style={S.label}>Motivo</label>
                <div style={S.checkGroup}>
                  {MOTIVOS_SUSP.map(m => (
                    <label key={m.key} style={S.checkLabel}>
                      <input type="checkbox" checked={motivos.includes(m.key)} onChange={() => toggleMotivo(m.key)} style={{ accentColor: BRAND, width: '14px', height: '14px' }} />
                      {m.label}
                    </label>
                  ))}
                </div>
              </div>
              <div style={S.field}>
                <label style={S.label}>Outros / Histórico disciplinar</label>
                <textarea style={{ ...S.select, minHeight: '100px', resize: 'vertical' }} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descreva o motivo específico ou o histórico de ocorrências…" />
              </div>
            </>
          )}

          {msg && <div style={S.erro}>{msg}</div>}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button type="button" style={S.btnSecondary} onClick={() => setModalAberto(false)}>Cancelar</button>
            <button type="submit" style={S.btnPrimary} disabled={loading}>{loading ? 'Salvando…' : 'Registrar e Visualizar'}</button>
          </div>
        </form>
      </Modal>

      {/* ── Modal de prévia / impressão ── */}
      <Modal aberto={previewAberto} onFechar={() => setPreviewAberto(false)} titulo="Prévia do Documento" largura="740px">
        {previewData && (
          <>
            {/* Estilos de impressão — só o documento */}
            <style>{`
              @media print {
                body > * { display: none !important; }
                #docPrint { display: block !important; position: fixed; top: 0; left: 0; width: 100%; }
              }
            `}</style>
            <div
              id="docPrint"
              style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '40px 48px', maxHeight: '65vh', overflowY: 'auto', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '12px', color: '#000', lineHeight: 1.65 }}
            >
              {previewData.tipo === 'advertencia'
                ? <AdvertenciaDoc data={previewData} nomeUsuario={usuario.nome} />
                : <SuspensaoDoc data={previewData} nomeUsuario={usuario.nome} />
              }
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button style={S.btnSecondary} onClick={() => setPreviewAberto(false)}>Fechar</button>
              <button style={S.btnPrimary} onClick={() => window.print()}>🖨️ Imprimir</button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}

// ─────────────────────────────────────────────
// Template: Advertência Disciplinar
// ─────────────────────────────────────────────
function AdvertenciaDoc({ data, nomeUsuario }: { data: PreviewPayload; nomeUsuario: string }) {
  const { aluno, turma, form, motivos } = data
  return (
    <div>
      {/* Aviso de confidencialidade */}
      <div style={{ background: '#f0f0f0', border: '1px solid #ccc', padding: '5px 10px', fontSize: '10px', textAlign: 'center', marginBottom: '18px', color: '#555' }}>
        Este documento foi classificado como informação interna e não deve ser compartilhado com pessoas de fora da Organização.
      </div>

      {/* Título */}
      <h2 style={{ textAlign: 'center', fontSize: '14px', fontWeight: 'bold', color: BRAND, letterSpacing: '1px', margin: '0 0 6px', textTransform: 'uppercase' }}>
        ADVERTÊNCIA DISCIPLINAR
      </h2>
      <p style={{ textAlign: 'center', fontSize: '11px', margin: '0 0 20px', color: '#333' }}>
        Este documento informa que o aprendiz identificado recebeu uma advertência disciplinar,<br />
        conforme as regras do regulamento interno da instituição.
      </p>

      {/* Checkboxes de motivos */}
      <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>Motivos da Advertência:</p>
      {MOTIVOS_ADV.map(m => (
        <div key={m.key} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '5px' }}>
          <span style={{ fontSize: '14px', lineHeight: 1, flexShrink: 0 }}>
            {motivos.includes(m.key) ? '☒' : '☐'}
          </span>
          <span>{m.label}</span>
        </div>
      ))}

      {/* Observações */}
      {form.observacoes && (
        <p style={{ margin: '14px 0', textAlign: 'justify' }}>
          <strong>Obs.:</strong> {form.observacoes}
        </p>
      )}

      {/* Data e cidade */}
      <p style={{ margin: '20px 0 24px' }}>
        {fmtCurta(form.data)}<br />
        Serra, Espírito Santo.
      </p>

      {/* Assinaturas */}
      <div style={{ display: 'flex', gap: '48px', marginBottom: '32px' }}>
        {/* Técnico */}
        <div style={{ flex: 1 }}>
          <div style={{ borderBottom: '1px solid #000', height: '36px', marginBottom: '5px' }} />
          <div style={{ fontSize: '11px', textAlign: 'center' }}>{nomeUsuario}</div>
          <div style={{ fontSize: '11px', textAlign: 'center' }}>Técnico de Formação Profissional Pedagógico</div>
        </div>
        {/* Aluno */}
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 'bold', marginBottom: '6px', fontSize: '11px' }}>Recebido e assinado pelo aluno</p>
          <p style={{ fontSize: '11px', marginBottom: '4px' }}>Assinatura: _________________________________</p>
          <p style={{ fontSize: '11px' }}>Data: __ / __ / ______</p>
        </div>
      </div>

      {/* Rodapé com dados da unidade + dados do aluno */}
      <div style={{ borderTop: `2px solid ${BRAND}`, paddingTop: '12px', display: 'flex', justifyContent: 'space-between', gap: '24px', fontSize: '11px' }}>
        <div>
          <div style={{ fontWeight: 'bold', color: BRAND, fontSize: '12px', marginBottom: '3px' }}>SEST SENAT</div>
          <div>Unidade Operacional Floriano Rangel Peixoto – DN122</div>
          <div>Endereço: Rua Francisco Sousa dos Santos, 1025,</div>
          <div>Jardim Limoeiro, Serra/ES</div>
          <div>CEP: 29.164-153</div>
          <div>CNPJ: 73.471.963/0031-62</div>
          <div style={{ marginTop: '4px' }}>Nº da declaração de habilitação no CNAP: ______________</div>
        </div>
        <div>
          <div><strong>NOME:</strong> {aluno?.nome?.toUpperCase()}</div>
          <div style={{ marginTop: '3px' }}><strong>Matrícula:</strong> {aluno?.matricula}</div>
          <div style={{ marginTop: '3px' }}><strong>Turma:</strong> {turma?.codigo_sigop}</div>
          <div style={{ marginTop: '3px' }}><strong>Curso:</strong> {turma?.nome}</div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Template: Suspensão
// ─────────────────────────────────────────────
function SuspensaoDoc({ data, nomeUsuario }: { data: PreviewPayload; nomeUsuario: string }) {
  const { aluno, form, motivos } = data
  const diasTexto = form.dias_texto || fmtLonga(form.data_inicio)
  const numDias   = form.num_dias || '___'

  return (
    <div>
      {/* Cabeçalho da unidade */}
      <div style={{ textAlign: 'center', borderBottom: `2px solid ${BRAND}`, paddingBottom: '10px', marginBottom: '18px' }}>
        <div style={{ fontWeight: 'bold', fontSize: '13px', color: BRAND }}>SEST SENAT - UNIDADE DN122</div>
        <div style={{ fontSize: '11px', color: '#333' }}>
          Rua Francisco Sousa dos Santos, 1025, Jardim Limoeiro, Serra/ES - Cep: 29.164-153 – Tel.: (27) 3205-1050
        </div>
      </div>

      {/* Título */}
      <h2 style={{ textAlign: 'center', fontSize: '15px', fontWeight: 'bold', color: BRAND, letterSpacing: '2px', margin: '0 0 20px', textTransform: 'uppercase' }}>
        SUSPENSÃO
      </h2>

      {/* Parágrafo legal */}
      <p style={{ textAlign: 'justify', marginBottom: '20px', lineHeight: 1.75 }}>
        A coordenação pedagógica do programa Jovem Aprendiz, com base na Lei nº. 10.097 de 19/12/2000 e Decreto nº. 5598 de 01/12/2005, Capítulo V, Seção VIII, Artigo 28, inciso II, vem aplicar uma suspensão de{' '}
        <strong>{numDias} {numDias === '1' ? 'dia' : 'dias'} {diasTexto}</strong> a(o) aluna(o){' '}
        <strong>{aluno?.nome?.toUpperCase()}</strong> do Programa de Aprendizagem, em virtude do seguinte fato:
      </p>

      {/* Motivos */}
      <div style={{ paddingLeft: '8px', marginBottom: '20px' }}>
        {MOTIVOS_SUSP.map(m => (
          <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px' }}>{motivos.includes(m.key) ? '(✓)' : '( )'}</span>
            <span>{m.label}</span>
          </div>
        ))}
        {form.descricao && (
          <div style={{ marginTop: '10px', textAlign: 'justify', lineHeight: 1.7 }}>
            <strong>Outros:</strong> {form.descricao}
          </div>
        )}
      </div>

      {/* Cidade e data */}
      <p style={{ marginBottom: '32px' }}>
        Serra /ES, {fmtLonga(form.data_inicio || new Date().toISOString().split('T')[0])}.
      </p>

      {/* 5 assinaturas em 2 colunas + 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 40px' }}>
        {['Técnico de Formação Profissional', 'Instrutor (a)', 'Responsável pelo Jovem', 'Nome do aluno e assinatura'].map(label => (
          <div key={label}>
            <div style={{ borderBottom: '1px solid #000', height: '40px', marginBottom: '5px' }} />
            <div style={{ fontSize: '11px', textAlign: 'center' }}>{label}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: '24px', maxWidth: '48%' }}>
        <div style={{ borderBottom: '1px solid #000', height: '40px', marginBottom: '5px' }} />
        <div style={{ fontSize: '11px' }}>Responsável na empresa</div>
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
  docInfo:    { background: '#f8fafc', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', color: '#374151', borderLeft: `3px solid ${BRAND}` },
  checkGroup: { background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' },
  checkLabel: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#374151' },
  btnPrimary: { padding: '10px 18px', background: BRAND, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  btnSecondary:{ padding: '10px 18px', background: '#f1f5f9', color: '#374151', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  erro:       { padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '7px', color: '#dc2626', fontSize: '13px' },
}

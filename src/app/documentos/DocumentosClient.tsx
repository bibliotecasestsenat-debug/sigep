'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Usuario } from '@/types/database'
import Modal from '@/components/ui/Modal'

type Turma = { id: string; codigo_sigop: string; nome: string; turno: string; curso?: { nome: string } | null }
type Aluno = { id: string; nome: string; matricula: string; cpf?: string | null; empresa?: string | null }

interface Props { turmas: Turma[]; usuario: Usuario }

export default function DocumentosClient({ turmas, usuario }: Props) {
  const [turmaId, setTurmaId] = useState('')
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [alunoId, setAlunoId] = useState('')
  const [tipoDoc, setTipoDoc] = useState<'advertencia' | 'suspensao' | ''>('')
  const [modalAberto, setModalAberto] = useState(false)
  const [form, setForm] = useState({ descricao: '', data: new Date().toISOString().split('T')[0], data_inicio: '', data_termino: '' })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [previewAberto, setPreviewAberto] = useState(false)
  const [previewData, setPreviewData] = useState<{ tipo: string; aluno: Aluno | null; turma: Turma | null; form: typeof form } | null>(null)
  const supabase = createClient()

  async function carregarAlunos(tid: string) {
    setTurmaId(tid); setAlunoId(''); setAlunos([])
    if (!tid) return
    const { data } = await supabase.from('alunos').select('id, nome, matricula, cpf, empresa').eq('turma_id', tid).eq('status', 'ativo').order('nome')
    setAlunos((data ?? []) as Aluno[])
  }

  function abrirModal(tipo: 'advertencia' | 'suspensao') {
    if (!turmaId || !alunoId) { setMsg('Selecione a turma e o aluno primeiro.'); return }
    setTipoDoc(tipo)
    setForm({ descricao: '', data: new Date().toISOString().split('T')[0], data_inicio: '', data_termino: '' })
    setMsg('')
    setModalAberto(true)
  }

  function abrirPreview() {
    const turma = turmas.find(t => t.id === turmaId) ?? null
    const aluno = alunos.find(a => a.id === alunoId) ?? null
    setPreviewData({ tipo: tipoDoc, aluno, turma, form })
    setPreviewAberto(true)
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (!form.descricao.trim()) { setMsg('Informe a descrição/motivo.'); return }
    setLoading(true); setMsg('')

    if (tipoDoc === 'advertencia') {
      const { error } = await supabase.from('advertencias').insert({
        aluno_id: alunoId, turma_id: turmaId,
        descricao: form.descricao, data: form.data,
        emitido_por: usuario.id,
      })
      if (error) { setMsg('Erro: ' + error.message); setLoading(false); return }
    } else {
      if (!form.data_inicio || !form.data_termino) { setMsg('Informe o período de suspensão.'); setLoading(false); return }
      const { error } = await supabase.from('suspensoes').insert({
        aluno_id: alunoId, turma_id: turmaId,
        motivo: form.descricao, data_inicio: form.data_inicio,
        data_termino: form.data_termino, emitido_por: usuario.id,
      })
      if (error) { setMsg('Erro: ' + error.message); setLoading(false); return }
    }

    setMsg(`✅ ${tipoDoc === 'advertencia' ? 'Advertência' : 'Suspensão'} registrada com sucesso!`)
    setModalAberto(false); setLoading(false)
    // Abrir preview para imprimir
    abrirPreview()
  }

  const turmaAtual = turmas.find(t => t.id === turmaId)
  const alunoAtual = alunos.find(a => a.id === alunoId)

  function fmt(d?: string) { if (!d) return '—'; const [y,m,day] = d.split('-'); return `${day}/${m}/${y}` }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.heading}>Documentos</h1>
          <p style={styles.sub}>Emissão de advertências e suspensões</p>
        </div>
      </div>

      {/* Seleção */}
      <div style={styles.selecaoBox}>
        <div style={styles.field}>
          <label style={styles.label}>Turma</label>
          <select style={styles.select} value={turmaId} onChange={e => carregarAlunos(e.target.value)}>
            <option value="">Selecione uma turma</option>
            {turmas.map(t => <option key={t.id} value={t.id}>{t.codigo_sigop} — {t.nome}</option>)}
          </select>
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Aluno</label>
          <select style={styles.select} value={alunoId} onChange={e => setAlunoId(e.target.value)} disabled={!alunos.length}>
            <option value="">Selecione um aluno</option>
            {alunos.map(a => <option key={a.id} value={a.id}>{a.nome} · {a.matricula}</option>)}
          </select>
        </div>
      </div>

      {/* Aluno selecionado */}
      {alunoAtual && (
        <div style={styles.alunoCard}>
          <div style={styles.alunoAvatar}>{alunoAtual.nome.charAt(0)}</div>
          <div>
            <div style={styles.alunoNome}>{alunoAtual.nome}</div>
            <div style={styles.alunoInfo}>Mat. {alunoAtual.matricula} · {turmaAtual?.codigo_sigop} — {turmaAtual?.nome}</div>
            {alunoAtual.empresa && <div style={styles.alunoInfo}>{alunoAtual.empresa}</div>}
          </div>
        </div>
      )}

      {/* Botões de ação */}
      <div style={styles.acoes}>
        <button
          style={{ ...styles.docBtn, background: '#fef3c7', borderColor: '#fbbf24', color: '#92400e' }}
          onClick={() => abrirModal('advertencia')}
          disabled={!alunoId}
        >
          <span style={{ fontSize: '24px' }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px' }}>Advertência</div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>Emitir termo de advertência</div>
          </div>
        </button>

        <button
          style={{ ...styles.docBtn, background: '#fef2f2', borderColor: '#fca5a5', color: '#7f1d1d' }}
          onClick={() => abrirModal('suspensao')}
          disabled={!alunoId}
        >
          <span style={{ fontSize: '24px' }}>🚫</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px' }}>Suspensão</div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>Emitir termo de suspensão</div>
          </div>
        </button>
      </div>

      {msg && !modalAberto && (
        <div style={{ marginTop: '16px', padding: '14px 16px', background: msg.startsWith('✅') ? '#f0fdf4' : '#fef2f2', borderRadius: '8px', fontSize: '14px', color: msg.startsWith('✅') ? '#16a34a' : '#dc2626' }}>
          {msg}
        </div>
      )}

      {/* Modal de emissão */}
      <Modal aberto={modalAberto} onFechar={() => setModalAberto(false)} titulo={tipoDoc === 'advertencia' ? '⚠️ Emitir Advertência' : '🚫 Emitir Suspensão'} largura="520px">
        <div style={styles.docInfo}>
          <strong>{alunoAtual?.nome}</strong> · {alunoAtual?.matricula}<br />
          <span style={{ color: '#64748b' }}>{turmaAtual?.codigo_sigop} — {turmaAtual?.nome}</span>
        </div>
        <form onSubmit={salvar} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
          {tipoDoc === 'advertencia' ? (
            <>
              <div style={styles.field}>
                <label style={styles.label}>Descrição / Motivo *</label>
                <textarea style={{ ...styles.select, minHeight: '100px', resize: 'vertical' }} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descreva o motivo da advertência…" required />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Data *</label>
                <input style={styles.select} type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} required />
              </div>
            </>
          ) : (
            <>
              <div style={styles.field}>
                <label style={styles.label}>Motivo da Suspensão *</label>
                <textarea style={{ ...styles.select, minHeight: '100px', resize: 'vertical' }} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descreva o motivo da suspensão…" required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={styles.field}>
                  <label style={styles.label}>Data de Início *</label>
                  <input style={styles.select} type="date" value={form.data_inicio} onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))} required />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Data de Término *</label>
                  <input style={styles.select} type="date" value={form.data_termino} onChange={e => setForm(f => ({ ...f, data_termino: e.target.value }))} required />
                </div>
              </div>
            </>
          )}
          {msg && <div style={{ padding: '10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '7px', color: '#dc2626', fontSize: '13px' }}>{msg}</div>}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button type="button" style={styles.btnSecondary} onClick={() => setModalAberto(false)}>Cancelar</button>
            <button type="submit" style={styles.btnPrimary} disabled={loading}>{loading ? 'Salvando…' : 'Registrar e Visualizar'}</button>
          </div>
        </form>
      </Modal>

      {/* Preview para impressão */}
      <Modal aberto={previewAberto} onFechar={() => setPreviewAberto(false)} titulo="Prévia do Documento" largura="700px">
        {previewData && (
          <div>
            <div style={styles.docPreview} id="docPreview">
              <div style={styles.docHeader}>
                <div style={styles.docLogo}>SEST SENAT</div>
                <div>
                  <div style={styles.docTitulo}>
                    {previewData.tipo === 'advertencia' ? 'TERMO DE ADVERTÊNCIA' : 'TERMO DE SUSPENSÃO'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Unidade Serra/ES — DN122</div>
                </div>
              </div>
              <div style={styles.docBody}>
                <p>Pelo presente instrumento, a Unidade SEST SENAT Serra/ES, unidade DN122, por meio de seu representante legal, emite o presente termo ao(à) aluno(a):</p>
                <div style={styles.docCampo}><strong>Nome:</strong> {previewData.aluno?.nome}</div>
                <div style={styles.docCampo}><strong>Matrícula:</strong> {previewData.aluno?.matricula}</div>
                {previewData.aluno?.empresa && <div style={styles.docCampo}><strong>Empresa:</strong> {previewData.aluno.empresa}</div>}
                <div style={styles.docCampo}><strong>Turma:</strong> {previewData.turma?.codigo_sigop} — {previewData.turma?.nome}</div>
                <div style={styles.docDivider} />
                {previewData.tipo === 'advertencia' ? (
                  <>
                    <p><strong>MOTIVO DA ADVERTÊNCIA:</strong></p>
                    <p style={{ marginTop: '8px', textAlign: 'justify' }}>{previewData.form.descricao}</p>
                    <div style={styles.docCampo}><strong>Data:</strong> {fmt(previewData.form.data)}</div>
                  </>
                ) : (
                  <>
                    <p><strong>MOTIVO DA SUSPENSÃO:</strong></p>
                    <p style={{ marginTop: '8px', textAlign: 'justify' }}>{previewData.form.descricao}</p>
                    <div style={styles.docCampo}><strong>Período:</strong> {fmt(previewData.form.data_inicio)} a {fmt(previewData.form.data_termino)}</div>
                  </>
                )}
                <div style={styles.docDivider} />
                <div style={styles.docAssinaturas}>
                  <div style={styles.assinatura}><div style={styles.assinaturaLinha}/><div>Coordenação</div></div>
                  <div style={styles.assinatura}><div style={styles.assinaturaLinha}/><div>Aluno(a)</div></div>
                  <div style={styles.assinatura}><div style={styles.assinaturaLinha}/><div>Testemunha</div></div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button style={styles.btnSecondary} onClick={() => setPreviewAberto(false)}>Fechar</button>
              <button style={styles.btnPrimary} onClick={() => window.print()}>🖨️ Imprimir</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function fmt(d?: string) { if (!d) return '—'; const [y,m,day] = d.split('-'); return `${day}/${m}/${y}` }

const styles: Record<string, React.CSSProperties> = {
  page: { padding: '32px' },
  header: { marginBottom: '24px' },
  heading: { fontSize: '22px', fontWeight: '700', color: '#1e293b' },
  sub: { fontSize: '13px', color: '#94a3b8', marginTop: '2px' },
  selecaoBox: { background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' },
  field: { display: 'flex', flexDirection: 'column', gap: '5px' },
  label: { fontSize: '12px', fontWeight: '600', color: '#374151' },
  select: { padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '7px', fontSize: '13px', color: '#1e293b', outline: 'none', background: '#f8fafc' },
  alunoCard: { display: 'flex', alignItems: 'center', gap: '14px', background: '#fff', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '24px' },
  alunoAvatar: { width: '44px', height: '44px', background: '#003366', color: '#fff', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '700', flexShrink: 0 },
  alunoNome: { fontSize: '15px', fontWeight: '600', color: '#1e293b' },
  alunoInfo: { fontSize: '12px', color: '#64748b', marginTop: '2px' },
  acoes: { display: 'flex', gap: '16px' },
  docBtn: { flex: 1, display: 'flex', alignItems: 'center', gap: '16px', padding: '20px 24px', border: '2px solid', borderRadius: '12px', cursor: 'pointer', textAlign: 'left' as const, transition: 'transform 0.1s' },
  docInfo: { background: '#f8fafc', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', color: '#374151', borderLeft: '3px solid #003366' },
  btnPrimary: { padding: '10px 18px', background: '#003366', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  btnSecondary: { padding: '10px 18px', background: '#f1f5f9', color: '#374151', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  docPreview: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '32px', maxHeight: '500px', overflowY: 'auto' },
  docHeader: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '2px solid #003366' },
  docLogo: { background: '#003366', color: '#e8961e', fontWeight: '800', fontSize: '14px', padding: '8px 12px', borderRadius: '6px' },
  docTitulo: { fontSize: '16px', fontWeight: '700', color: '#003366' },
  docBody: { fontSize: '13px', lineHeight: 1.7, color: '#374151', display: 'flex', flexDirection: 'column', gap: '8px' },
  docCampo: { background: '#f8fafc', padding: '8px 12px', borderRadius: '4px' },
  docDivider: { height: '1px', background: '#e2e8f0', margin: '8px 0' },
  docAssinaturas: { display: 'flex', gap: '24px', marginTop: '32px', justifyContent: 'space-around' },
  assinatura: { textAlign: 'center' as const, fontSize: '12px', color: '#64748b' },
  assinaturaLinha: { width: '140px', height: '1px', background: '#374151', marginBottom: '6px' },
}

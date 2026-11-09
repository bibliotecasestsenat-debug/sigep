import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Buscar contadores em paralelo
  const [
    { count: totalTurmas },
    { count: totalAlunos },
    { count: totalCursos },
  ] = await Promise.all([
    supabase.from('turmas').select('*', { count: 'exact', head: true }),
    supabase.from('alunos').select('*', { count: 'exact', head: true }).eq('status', 'ativo'),
    supabase.from('cursos').select('*', { count: 'exact', head: true }),
  ])

  // Últimas turmas
  const { data: turmasRecentes } = await supabase
    .from('turmas')
    .select('id, codigo_sigop, nome, data_inicio, data_termino, turno, curso:cursos(nome)')
    .order('created_at', { ascending: false })
    .limit(5)

  const hoje = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.heading}>Painel de Controle</h1>
          <p style={styles.date}>{hoje}</p>
        </div>
      </div>

      {/* Cards de resumo */}
      <div style={styles.cards}>
        <StatCard label="Turmas ativas" value={totalTurmas ?? 0} icon="🏫" color="#003366" />
        <StatCard label="Alunos matriculados" value={totalAlunos ?? 0} icon="👥" color="#16a34a" />
        <StatCard label="Cursos cadastrados" value={totalCursos ?? 0} icon="📚" color="#e8961e" />
      </div>

      {/* Turmas recentes */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Turmas recentes</h2>
        {!turmasRecentes?.length ? (
          <div style={styles.empty}>Nenhuma turma cadastrada ainda.</div>
        ) : (
          <div style={styles.table}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={styles.thead}>
                  <th style={styles.th}>Código SIGOP</th>
                  <th style={styles.th}>Nome da Turma</th>
                  <th style={styles.th}>Curso</th>
                  <th style={styles.th}>Turno</th>
                  <th style={styles.th}>Período</th>
                </tr>
              </thead>
              <tbody>
                {turmasRecentes.map((t, i) => (
                  <tr key={t.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                    <td style={styles.td}><code style={styles.code}>{t.codigo_sigop}</code></td>
                    <td style={{ ...styles.td, fontWeight: 500 }}>{t.nome}</td>
                    <td style={styles.td}>{(t.curso as { nome: string } | null)?.nome ?? '—'}</td>
                    <td style={styles.td}>{TURNO_LABEL[t.turno as string] ?? t.turno}</td>
                    <td style={styles.td}>
                      {fmt(t.data_inicio)} → {fmt(t.data_termino)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

const TURNO_LABEL: Record<string, string> = {
  manha: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite',
}

function fmt(d: string) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  return (
    <div style={{ ...styles.card, borderTop: `4px solid ${color}` }}>
      <div style={styles.cardTop}>
        <span style={styles.cardIcon}>{icon}</span>
        <span style={{ ...styles.cardValue, color }}>{value}</span>
      </div>
      <div style={styles.cardLabel}>{label}</div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: '32px',
    maxWidth: '1100px',
  },
  header: {
    marginBottom: '28px',
  },
  heading: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e293b',
  },
  date: {
    fontSize: '13px',
    color: '#94a3b8',
    marginTop: '4px',
    textTransform: 'capitalize',
  },
  cards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '32px',
  },
  card: {
    background: '#fff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },
  cardIcon: { fontSize: '28px' },
  cardValue: {
    fontSize: '36px',
    fontWeight: '700',
    lineHeight: 1,
  },
  cardLabel: {
    fontSize: '13px',
    color: '#64748b',
    fontWeight: '500',
  },
  section: {
    background: '#fff',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '16px',
  },
  empty: {
    padding: '32px',
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: '14px',
  },
  table: {
    overflowX: 'auto',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  thead: {
    background: '#f8fafc',
  },
  th: {
    padding: '10px 14px',
    textAlign: 'left' as const,
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    borderBottom: '1px solid #e2e8f0',
  },
  td: {
    padding: '12px 14px',
    fontSize: '13px',
    color: '#374151',
    borderBottom: '1px solid #f1f5f9',
  },
  code: {
    fontFamily: 'monospace',
    background: '#f1f5f9',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '12px',
    color: '#003366',
  },
}

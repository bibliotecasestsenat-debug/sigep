'use client'

import { useEffect } from 'react'

interface ModalProps {
  aberto: boolean
  onFechar: () => void
  titulo: string
  children: React.ReactNode
  largura?: string
}

export default function Modal({ aberto, onFechar, titulo, children, largura = '560px' }: ModalProps) {
  useEffect(() => {
    if (aberto) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [aberto])

  if (!aberto) return null

  return (
    <div style={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onFechar() }}>
      <div style={{ ...styles.modal, maxWidth: largura }}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.titulo}>{titulo}</h2>
          <button style={styles.fechar} onClick={onFechar} aria-label="Fechar">✕</button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {children}
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(3px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    background: '#fff',
    borderRadius: '14px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
    width: '100%',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #e2e8f0',
    flexShrink: 0,
  },
  titulo: {
    fontSize: '17px',
    fontWeight: '700',
    color: '#1e293b',
  },
  fechar: {
    background: '#f1f5f9',
    border: 'none',
    borderRadius: '6px',
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#64748b',
    fontSize: '13px',
    fontWeight: '600',
  },
  content: {
    padding: '24px',
    overflowY: 'auto',
    flex: 1,
  },
}

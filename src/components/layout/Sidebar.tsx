'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Usuario } from '@/types/database'

interface SidebarProps {
  usuario: Usuario
}

type NavItem = {
  href: string
  label: string
  icon: string
  perfis?: string[]
}

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Início', icon: '⊞' },
  { href: '/turmas', label: 'Turmas', icon: '🏫' },
  { href: '/alunos', label: 'Alunos', icon: '👥' },
  { href: '/frequencia', label: 'Frequência', icon: '📋' },
  { href: '/documentos', label: 'Documentos', icon: '📄' },
  { href: '/cursos', label: 'Cursos', icon: '📚', perfis: ['adm', 'coordenacao'] },
  { href: '/admin', label: 'Administração', icon: '⚙️', perfis: ['adm'] },
]

const PERFIL_LABEL: Record<string, string> = {
  adm: 'Administrador',
  coordenacao: 'Coordenação',
  prof_efetivo: 'Professor Efetivo',
  prof_cnpj: 'Professor CNPJ',
}

export default function Sidebar({ usuario }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const navItems = NAV.filter(item =>
    !item.perfis || item.perfis.includes(usuario.perfil)
  )

  return (
    <aside style={styles.sidebar}>
      {/* Logo */}
      <div style={styles.logo}>
        <div style={styles.logoIcon}>
          <span style={{ fontSize: '22px', fontWeight: 800, color: '#e8961e' }}>S</span>
        </div>
        <div>
          <div style={styles.logoTitle}>SIGEP</div>
          <div style={styles.logoSub}>SEST SENAT · DN122</div>
        </div>
      </div>

      {/* Perfil do usuário */}
      <div style={styles.userCard}>
        <div style={styles.avatar}>
          {usuario.nome.charAt(0).toUpperCase()}
        </div>
        <div style={styles.userInfo}>
          <div style={styles.userName}>{usuario.nome}</div>
          <div style={styles.userPerfil}>{PERFIL_LABEL[usuario.perfil] ?? usuario.perfil}</div>
        </div>
      </div>

      {/* Navegação */}
      <nav style={styles.nav}>
        <div style={styles.navLabel}>MENU</div>
        {navItems.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                ...styles.navItem,
                ...(active ? styles.navItemActive : {}),
              }}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
              {active && <span style={styles.activeIndicator} />}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div style={styles.footer}>
        <div style={styles.divider} />
        <button onClick={handleLogout} style={styles.logoutBtn}>
          <span>🚪</span>
          <span>Sair do sistema</span>
        </button>
        <div style={styles.version}>v2.0.0 · 2025</div>
      </div>
    </aside>
  )
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: '260px',
    minWidth: '260px',
    height: '100vh',
    background: '#003366',
    display: 'flex',
    flexDirection: 'column',
    position: 'sticky',
    top: 0,
    overflow: 'hidden',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '24px 20px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  logoIcon: {
    width: '40px',
    height: '40px',
    background: '#004488',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  logoTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#fff',
    letterSpacing: '-0.3px',
  },
  logoSub: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
    marginTop: '1px',
  },
  userCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '16px 20px',
    margin: '12px',
    background: 'rgba(255,255,255,0.06)',
    borderRadius: '10px',
  },
  avatar: {
    width: '36px',
    height: '36px',
    background: '#e8961e',
    color: '#fff',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '15px',
    fontWeight: '700',
    flexShrink: 0,
  },
  userInfo: {
    minWidth: 0,
  },
  userName: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#fff',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  userPerfil: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.5)',
    marginTop: '1px',
  },
  nav: {
    flex: 1,
    padding: '8px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    overflowY: 'auto',
  },
  navLabel: {
    fontSize: '10px',
    fontWeight: '700',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: '1px',
    padding: '8px 8px 4px',
    marginTop: '4px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    borderRadius: '8px',
    color: 'rgba(255,255,255,0.65)',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.15s',
    position: 'relative',
    textDecoration: 'none',
  },
  navItemActive: {
    background: 'rgba(255,255,255,0.12)',
    color: '#fff',
  },
  navIcon: {
    fontSize: '16px',
    width: '20px',
    textAlign: 'center',
  },
  activeIndicator: {
    position: 'absolute',
    right: '12px',
    width: '6px',
    height: '6px',
    background: '#e8961e',
    borderRadius: '50%',
  },
  footer: {
    padding: '12px',
  },
  divider: {
    height: '1px',
    background: 'rgba(255,255,255,0.08)',
    marginBottom: '12px',
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '10px 12px',
    background: 'transparent',
    border: 'none',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '14px',
    cursor: 'pointer',
    borderRadius: '8px',
    fontWeight: '500',
  },
  version: {
    textAlign: 'center',
    fontSize: '10px',
    color: 'rgba(255,255,255,0.2)',
    marginTop: '8px',
    padding: '4px',
  },
}

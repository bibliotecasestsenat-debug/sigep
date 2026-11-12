'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Usuario } from '@/types/database'

interface SidebarProps {
  usuario: Usuario
}

// ── Lucide-style SVG icons (inline, sem dependência extra) ──────────────────
function IconHome()      { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> }
function IconUsers()     { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg> }
function IconClipboard() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg> }
function IconFile()      { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> }
function IconBook()      { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg> }
function IconGrid()      { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> }
function IconSettings()  { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg> }
function IconLogOut()    { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> }

type NavItem = {
  href: string
  label: string
  Icon: React.FC
  perfis?: string[]
}

const NAV: NavItem[] = [
  { href: '/dashboard',  label: 'Início',        Icon: IconHome      },
  { href: '/turmas',     label: 'Turmas',         Icon: IconGrid      },
  { href: '/alunos',     label: 'Alunos',         Icon: IconUsers     },
  { href: '/frequencia', label: 'Frequência',     Icon: IconClipboard },
  { href: '/documentos', label: 'Documentos',     Icon: IconFile      },
  { href: '/cursos',     label: 'Cursos',         Icon: IconBook,     perfis: ['adm', 'coordenacao'] },
  { href: '/admin',      label: 'Administração',  Icon: IconSettings, perfis: ['adm'] },
]

const PERFIL_LABEL: Record<string, string> = {
  adm:          'Administrador',
  coordenacao:  'Coordenação',
  prof_efetivo: 'Professor',
  prof_cnpj:    'Professor CNPJ',
}

// Logo SEST SENAT inline SVG ─────────────────────────────────────────────────
function LogoSidebar() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 52" width="220" height="44" style={{ display: 'block' }}>
      {/* SEST */}
      <text x="0" y="30" fontFamily="Arial,sans-serif" fontWeight="800" fontSize="22" fill="#FFFFFF" letterSpacing="2">SEST</text>
      {/* separador */}
      <line x1="82" y1="6" x2="82" y2="44" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
      {/* SENAT */}
      <text x="92" y="30" fontFamily="Arial,sans-serif" fontWeight="800" fontSize="22" fill="#FFFFFF" letterSpacing="2">SENAT</text>
    </svg>
  )
}

export default function Sidebar({ usuario }: SidebarProps) {
  const pathname = usePathname()
  const router   = useRouter()
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
    <aside style={S.sidebar}>
      {/* Cabeçalho com logo SEST SENAT */}
      <div style={S.logoArea}>
        <LogoSidebar />
        <div style={S.logoSub}>Sistema de Gestão · DN122</div>
      </div>

      {/* Card do usuário */}
      <div style={S.userCard}>
        <div style={S.avatar}>
          {usuario.nome.charAt(0).toUpperCase()}
        </div>
        <div style={S.userInfo}>
          <div style={S.userName}>{usuario.nome}</div>
          <div style={S.userRole}>{PERFIL_LABEL[usuario.perfil] ?? usuario.perfil}</div>
        </div>
      </div>

      {/* Navegação */}
      <nav style={S.nav}>
        <div style={S.navSectionLabel}>MENU PRINCIPAL</div>
        {navItems.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{ ...S.navItem, ...(active ? S.navItemActive : {}) }}
            >
              <span style={{ ...S.navIcon, ...(active ? S.navIconActive : {}) }}>
                <item.Icon />
              </span>
              <span style={S.navLabel}>{item.label}</span>
              {active && <span style={S.activeDot} />}
            </Link>
          )
        })}
      </nav>

      {/* Rodapé */}
      <div style={S.footer}>
        <div style={S.divider} />
        <button onClick={handleLogout} style={S.logoutBtn}>
          <span style={S.navIcon}><IconLogOut /></span>
          <span>Sair do sistema</span>
        </button>
        <div style={S.version}>SIGEP v2.0 · SEST SENAT Serra/ES</div>
      </div>
    </aside>
  )
}

const BRAND = '#002969'

const S: Record<string, React.CSSProperties> = {
  sidebar: {
    width: '240px',
    minWidth: '240px',
    height: '100vh',
    background: BRAND,
    display: 'flex',
    flexDirection: 'column',
    position: 'sticky',
    top: 0,
    overflow: 'hidden',
    boxShadow: '4px 0 16px rgba(0,0,0,0.15)',
  },
  logoArea: {
    padding: '22px 20px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  logoSub: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.4)',
    marginTop: '5px',
    letterSpacing: '0.3px',
  },
  userCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 16px',
    margin: '12px 12px 4px',
    background: 'rgba(255,255,255,0.08)',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.06)',
  },
  avatar: {
    width: '34px',
    height: '34px',
    background: 'rgba(255,255,255,0.2)',
    border: '2px solid rgba(255,255,255,0.3)',
    color: '#fff',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '700',
    flexShrink: 0,
  },
  userInfo: { minWidth: 0 },
  userName: {
    fontSize: '12.5px',
    fontWeight: '600',
    color: '#fff',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  userRole: {
    fontSize: '10.5px',
    color: 'rgba(255,255,255,0.45)',
    marginTop: '1px',
  },
  nav: {
    flex: 1,
    padding: '8px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    overflowY: 'auto',
  },
  navSectionLabel: {
    fontSize: '9.5px',
    fontWeight: '700',
    color: 'rgba(255,255,255,0.28)',
    letterSpacing: '1.2px',
    padding: '8px 10px 5px',
    marginTop: '4px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '9px 10px',
    borderRadius: '8px',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '13.5px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.12s',
    position: 'relative',
    textDecoration: 'none',
  },
  navItemActive: {
    background: 'rgba(255,255,255,0.14)',
    color: '#fff',
  },
  navIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '22px',
    flexShrink: 0,
    color: 'rgba(255,255,255,0.5)',
  },
  navIconActive: {
    color: '#fff',
  },
  navLabel: { flex: 1 },
  activeDot: {
    width: '5px',
    height: '5px',
    background: 'rgba(255,255,255,0.7)',
    borderRadius: '50%',
    flexShrink: 0,
  },
  footer: {
    padding: '0 12px 14px',
  },
  divider: {
    height: '1px',
    background: 'rgba(255,255,255,0.08)',
    marginBottom: '10px',
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '9px 10px',
    background: 'transparent',
    border: 'none',
    color: 'rgba(255,255,255,0.45)',
    fontSize: '13.5px',
    cursor: 'pointer',
    borderRadius: '8px',
    fontWeight: '500',
  },
  version: {
    textAlign: 'center',
    fontSize: '9.5px',
    color: 'rgba(255,255,255,0.18)',
    marginTop: '8px',
    padding: '2px',
  },
}

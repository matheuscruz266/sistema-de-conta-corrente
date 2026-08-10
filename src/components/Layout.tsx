import { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import {
  LayoutDashboard,
  FileSpreadsheet,
  ArrowLeftRight,
  PieChart,
  Settings,
  LogOut,
  Menu,
  Bell,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { formatDate } from '@/lib/formatters'
import { ProjectSwitcher } from '@/components/ProjectSwitcher'

export default function Layout() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Extratos', path: '/extratos', icon: FileSpreadsheet },
    { label: 'Movimentações', path: '/movimentacoes', icon: ArrowLeftRight },
    { label: 'Gráficos', path: '/graficos', icon: PieChart },
    { label: 'Configurações', path: '/configuracoes', icon: Settings },
  ]

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/dashboard':
      case '/':
        return 'Visão Geral da Conta Corrente'
      case '/extratos':
        return 'Importação de Extratos Bancários'
      case '/movimentacoes':
        return 'Gestão de Movimentações'
      case '/graficos':
        return 'Análise Gráfica & Relatórios'
      case '/configuracoes':
        return 'Configurações do Sistema'
      default:
        return 'Conta Corrente Diretoria'
    }
  }

  const handleSignOut = () => {
    signOut()
    navigate('/login')
  }

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n: string) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'DIR'

  const NavContent = () => (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100">
      <div className="p-6 flex items-center gap-3 border-b border-slate-800">
        <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
          <Wallet className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-bold text-base tracking-tight leading-tight">Conta Corrente</h1>
          <p className="text-xs text-indigo-400 font-medium">Diretoria Executiva</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive =
            location.pathname === item.path ||
            (item.path === '/dashboard' && location.pathname === '/')
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className="w-full justify-start gap-3 text-slate-400 hover:text-red-400 hover:bg-slate-800/60"
        >
          <LogOut className="h-4 w-4" />
          <span>Sair da Conta</span>
        </Button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col shrink-0 border-r border-slate-200 dark:border-slate-800">
        <NavContent />
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 px-6 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="outline" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 border-r-0">
                <NavContent />
              </SheetContent>
            </Sheet>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-none">
                {getPageTitle()}
              </h2>
              <p className="text-xs text-slate-500 mt-1 capitalize">
                {formatDate(new Date().toISOString())}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ProjectSwitcher />
            <button className="relative p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-indigo-600" />
            </button>

            <div className="flex items-center gap-3 pl-3 border-l border-slate-200 dark:border-slate-800">
              <Avatar className="h-9 w-9 border border-indigo-200">
                <AvatarFallback className="bg-indigo-100 text-indigo-700 font-bold text-xs">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {user?.name || 'Diretor'}
                </p>
                <p className="text-[10px] text-slate-500">Membro da Diretoria</p>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Route Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

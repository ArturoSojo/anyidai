"use client"
import * as React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { SidebarProvider, SidebarTrigger, SidebarInset } from '../components/ui/sidebar'
import { Button } from '../components/ui/button'
import { Moon, Sun } from 'lucide-react'
import { MainSidebar } from '../components/MainSidebar'

const SIDEBAR_ROUTES = new Set([
  '/', '/clientes', '/agenda', '/inventario', '/servicios',
  '/pos', '/reportes', '/fidelizacion'
])

function useDarkMode() {
  const [dark, setDark] = React.useState(() =>
    typeof window !== 'undefined' &&
    document.documentElement.classList.contains('dark')
  )
  const toggle = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
  }
  return { dark, toggle }
}

function useHeaderTitle(pathname: string) {
  const k = pathname === '/' ? 'dashboard' : pathname.split('/')[1]
  switch (k) {
    case 'clientes': return 'Gestión de Clientes'
    case 'agenda': return 'Agenda de Citas'
    case 'inventario': return 'Inventario'
    case 'servicios': return 'Servicios y Combos'
    case 'pos': return 'Punto de Venta'
    case 'reportes': return 'Reportes'
    case 'fidelizacion': return 'Fidelización'
    default: return 'Dashboard'
  }
}

export default function AppShell() {
  const { pathname } = useLocation()
  const base = pathname === '/' ? '/' : `/${pathname.split('/')[1]}`
  const showSidebar = SIDEBAR_ROUTES.has(base)
  const { dark, toggle } = useDarkMode()
  const title = useHeaderTitle(pathname)

  return (
    <SidebarProvider>
      <div className={`flex min-h-screen bg-background transition-colors ${dark ? 'dark' : ''}`}>
        {showSidebar && <MainSidebar />}

        {/* El contenido ahora usa flex-1 y ocupa todo el ancho */}
        {showSidebar ? (
          <SidebarInset className="flex-1 w-full">
            <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
              <div className="flex h-16 items-center justify-between px-6">
                <div className="flex items-center gap-4">
                  <SidebarTrigger className="lg:hidden" />
                  <h1 className="text-xl font-semibold">{title}</h1>
                </div>
                <Button variant="ghost" size="sm" onClick={toggle}>
                  {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              </div>
            </header>

            <div className="p-6 w-full">
              <Outlet />
            </div>
          </SidebarInset>
        ) : (
          <main className="flex-1 w-full min-h-screen">
            <div className="p-6 w-full">
              <Outlet />
            </div>
          </main>
        )}
      </div>
    </SidebarProvider>
  )
}

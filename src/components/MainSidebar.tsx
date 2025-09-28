import * as React from 'react'
import { NavLink, useMatch, useNavigate } from 'react-router-dom'
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem
} from './ui/sidebar'
import {
  LayoutDashboard, Users, Calendar, Package, Wrench,
  ShoppingCart, BarChart3, Heart, Store
} from 'lucide-react'
import { Button } from './ui/button'
import { signOut } from 'firebase/auth'
import { auth } from '../lib/firebase'

type Item = { id: string; title: string; icon: React.ComponentType<any>; path: string }

const navigation = [
  { title: 'Dashboard', items: [{ id: 'dashboard', title: 'Inicio', icon: LayoutDashboard, path: '/' }] },
  {
    title: 'Clientes & Citas',
    items: [
      { id: 'clientes', title: 'Clientes', icon: Users, path: '/clientes' },
      { id: 'agenda', title: 'Agenda', icon: Calendar, path: '/agenda' },
      { id: 'fidelizacion', title: 'Fidelización', icon: Heart, path: '/fidelizacion' },
    ],
  },
  {
    title: 'Servicios & Inventario',
    items: [
      { id: 'servicios', title: 'Servicios', icon: Wrench, path: '/servicios' },
      { id: 'inventario', title: 'Inventario', icon: Package, path: '/inventario' },
    ],
  },
  {
    title: 'Ventas & Reportes',
    items: [
      { id: 'pos', title: 'Punto de Venta', icon: ShoppingCart, path: '/pos' },
      { id: 'reportes', title: 'Reportes', icon: BarChart3, path: '/reportes' },
    ],
  },
]

function NavItem({ item }: { item: Item }) {
  // Marca activo con el matcher del router (incluye '/' como end)
  const match = useMatch({ path: item.path, end: item.path === '/' })
  const isActive = Boolean(match)
  const Icon = item.icon


  return (
    <SidebarMenuItem>
      {/* Pasamos isActive a SidebarMenuButton para activar los estilos data-[active=true] */}
      <SidebarMenuButton asChild isActive={isActive} className="w-full justify-start" tooltip={item.title}>
        <NavLink to={item.path}>
          <Icon className="mr-2 h-4 w-4" />
          <span>{item.title}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

export function MainSidebar() {


  const navigate = useNavigate()

  const doLogout = async () => {
    await signOut(auth)
    navigate('/login')
  }

  return (
    <Sidebar className="border-r">
      <SidebarContent>
        {/* Branding */}
        <div className="p-6 border-b bg-gradient-to-r from-purple-600 via-purple-700 to-pink-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Store className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-white tracking-wide">Anyidai</span>
              <p className="text-xs text-white/80">Beauty & Style</p>
            </div>
          </div>
        </div>

        {/* Menú */}
        {navigation.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((it) => (
                  <NavItem key={it.id} item={it} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
        <Button variant="ghost" onClick={doLogout} size="sm" className="m-4 w-full" asChild>
          <a target="_blank" >
            <span>Cerrar Sesión</span>
          </a>
        </Button>
      </SidebarContent>
      <Button variant="ghost" size="sm" className="m-4 w-full" asChild>
        <a href="https://anyidai.com" target="_blank" rel="noopener noreferrer">
          Versión 1.0.0
        </a>
      </Button>
    </Sidebar>
  )
}


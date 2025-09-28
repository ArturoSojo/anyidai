import * as React from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem
} from './ui/sidebar'
import {
  LayoutDashboard, Users, Calendar, Package, Wrench,
  ShoppingCart, BarChart3, Heart, Store, Shield
} from 'lucide-react'
import { Button } from './ui/button'
import { signOut } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { useBusiness } from '../app/providers/BusinessProvider'
import { PRIVILEGED_ROLES } from '../app/roles'

type Item = { id: string; title: string; icon: React.ComponentType<any>; segment: string }

const baseNavigation: Array<{ title: string; items: Item[] }> = [
  { title: 'Dashboard', items: [{ id: 'dashboard', title: 'Inicio', icon: LayoutDashboard, segment: '' }] },
  {
    title: 'Clientes & Citas',
    items: [
      { id: 'clientes', title: 'Clientes', icon: Users, segment: 'clientes' },
      { id: 'agenda', title: 'Agenda', icon: Calendar, segment: 'agenda' },
      { id: 'fidelizacion', title: 'Fidelización', icon: Heart, segment: 'fidelizacion' },
    ],
  },
  {
    title: 'Servicios & Inventario',
    items: [
      { id: 'servicios', title: 'Servicios', icon: Wrench, segment: 'servicios' },
      { id: 'inventario', title: 'Inventario', icon: Package, segment: 'inventario' },
    ],
  },
  {
    title: 'Ventas & Reportes',
    items: [
      { id: 'pos', title: 'Punto de Venta', icon: ShoppingCart, segment: 'pos' },
      { id: 'reportes', title: 'Reportes', icon: BarChart3, segment: 'reportes' },
    ],
  },
]

function NavItem({ item, basePath }: { item: Item; basePath: string }) {
  const { pathname } = useLocation()
  const fullPath = item.segment ? `${basePath}/${item.segment}` : basePath
  const isActive = pathname === fullPath || pathname.startsWith(`${fullPath}/`)
  const Icon = item.icon


  return (
    <SidebarMenuItem>
      {/* Pasamos isActive a SidebarMenuButton para activar los estilos data-[active=true] */}
      <SidebarMenuButton asChild isActive={isActive} className="w-full justify-start" tooltip={item.title}>
        <NavLink to={fullPath}>
          <Icon className="mr-2 h-4 w-4" />
          <span>{item.title}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

export function MainSidebar() {
  const navigate = useNavigate()
  const { business, role } = useBusiness()
  const basePath = `/business/${business.id}`

  const navigation = React.useMemo(() => {
    const groups = [...baseNavigation]
    if (PRIVILEGED_ROLES.includes(role)) {
      groups.push({
        title: 'Administración',
        items: [{ id: 'usuarios', title: 'Usuarios', icon: Shield, segment: 'usuarios' }, { id: 'configuracion', title: 'Configuración', icon: Store, segment: 'configuracion' }],
      })
    }
    return groups
  }, [role])

  const doLogout = async () => {
    await signOut(auth)
    navigate('/login')
  }

  return (
    <Sidebar className="border-r">
      <SidebarContent>
        {/* Branding */}
        <div className="p-2 border-b bg-gradient-to-r from-purple-600 via-purple-700 to-pink-500">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-lg backdrop-blur-sm">
              <Store className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-white tracking-wide">{business.name}</span>
              <p className="text-xs text-white/80">ID: {business.id}</p>
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
                  <NavItem key={it.id} item={it} basePath={basePath} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
        
     
      </SidebarContent>
         <Button variant="ghost" onClick={doLogout} size="sm" className="m-4 w-full">
          Cerrar sesión
        </Button>
    </Sidebar>
  )
}
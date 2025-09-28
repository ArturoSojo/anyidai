import { createBrowserRouter, Navigate, useParams } from 'react-router-dom'
import Login from '../pages/Login'
import ProtectedRoute from '../components/ProtectedRoute'
import AppShell from './AppShell'
import ConsolePage from '../pages/ConsolePage'
import { BusinessProvider } from './providers/BusinessProvider'

// Páginas/ módulos (los tuyos)
import {Dashboard} from '../pages/Dashboard'
import CustomersPage from '../features/customers/CustomersPage'
import {ProductsPage} from '../features/products/ProductsPage'
import ServicesPage from '../features/services/ServicesPage'
import {POSPage} from '../features/pos/POSPage'
import AgendaPage from '../features/agenda/AgendaPage'
import FidelizacionPage from '../features/fidelizacion/FidelizacionPage'
import { ReportPage } from '../features/reportes/ReportPage'
import UserManagementPage from '../features/users/UserManagementPage'

function BusinessRouteLayout() {
  const { businessId } = useParams<{ businessId: string }>()
  if (!businessId) return <Navigate to="/" replace />
  return (
    <BusinessProvider businessId={businessId}>
      <AppShell />
    </BusinessProvider>
  )
}


export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <ConsolePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/business/:businessId',
    element: (
      <ProtectedRoute>
        <BusinessRouteLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'clientes', element: <CustomersPage /> },
      { path: 'agenda', element: <AgendaPage /> },
      { path: 'fidelizacion', element: <FidelizacionPage /> },
      { path: 'inventario', element: <ProductsPage /> },
      { path: 'servicios', element: <ServicesPage /> },
      { path: 'pos', element: <POSPage /> },
      { path: 'reportes', element: <ReportPage /> },
      { path: 'usuarios', element: <UserManagementPage /> },
    ],
  },
])

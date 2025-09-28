import { createBrowserRouter } from 'react-router-dom'
import Login from '../pages/Login'
import ProtectedRoute from '../components/ProtectedRoute'
import AppShell from './AppShell'

// Páginas/ módulos (los tuyos)
import {Dashboard} from '../pages/Dashboard'
import CustomersPage from '../features/customers/CustomersPage'
import ProductsPage from '../features/products/ProductsPage'
import ServicesPage from '../features/services/ServicesPage'
import POSPage from '../features/pos/POSPage'
import AgendaPage from '../features/agenda/AgendaPage'


export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'clientes', element: <CustomersPage /> },
      { path: 'agenda', element: <AgendaPage /> },
      { path: 'inventario', element: <ProductsPage /> },
      { path: 'servicios', element: <ServicesPage /> },
      { path: 'pos', element: <POSPage /> },

    ],
  },
])

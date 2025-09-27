import { createBrowserRouter } from 'react-router-dom'
import App from '../App'
import Login from '../pages/Login'
import Dashboard from '../pages/Dashboard'
import CustomersPage from '../features/customers/CustomersPage'
import ProductsPage from '../features/products/ProductsPage'
import ServicesPage from '../features/services/ServicesPage'
import POSPage from '../features/pos/POSPage'
import AgendaPage from '../features/agenda/AgendaPage'
import ProtectedRoute from '../components/ProtectedRoute'

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <App />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'clientes', element: <CustomersPage /> },
      { path: 'productos', element: <ProductsPage /> },
      { path: 'servicios', element: <ServicesPage /> },
      { path: 'pos', element: <POSPage /> },
      { path: 'agenda', element: <AgendaPage /> },
    ],
  },
])

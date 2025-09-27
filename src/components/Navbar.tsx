import { NavLink, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../lib/firebase'

export default function Navbar() {
  const navigate = useNavigate()

  const doLogout = async () => {
    await signOut(auth)
    navigate('/login')
  }

  const linkStyle = ({ isActive }: { isActive: boolean }) => ({
    fontWeight: isActive ? '700' : '400',
    marginRight: 12,
  })

  return (
    <header
      style={{
        display: 'flex',
        gap: 16,
        padding: 12,
        borderBottom: '1px solid #eee',
        alignItems: 'center',
      }}
    >
      <strong>💈 Barber Manager</strong>
      <NavLink to="/" style={linkStyle}>
        Dashboard
      </NavLink>
      <NavLink to="/agenda" style={linkStyle}>
        Agenda
      </NavLink>
      <NavLink to="/clientes" style={linkStyle}>
        Clientes
      </NavLink>
      <NavLink to="/servicios" style={linkStyle}>
        Servicios
      </NavLink>
      <NavLink to="/productos" style={linkStyle}>
        Productos
      </NavLink>
      <NavLink to="/pos" style={linkStyle}>
        POS
      </NavLink>
      <div style={{ flex: 1 }} />
      <button onClick={doLogout}>Salir</button>
    </header>
  )
}

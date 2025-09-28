import { Outlet } from 'react-router-dom'

export default function App() {
  return (
    <div className="app">
      <main style={{ padding: 16 }}>
        <Outlet />
      </main>
    </div>
  )
}

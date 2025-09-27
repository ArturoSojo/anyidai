import { useEffect } from 'react'
import { signInWithPopup, onAuthStateChanged } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { auth, googleProvider } from '../lib/firebase'

export default function Login() {
  const navigate = useNavigate()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) navigate('/')
    })
    return () => unsub()
  }, [navigate])

  const login = async () => {
    await signInWithPopup(auth, googleProvider)
  }

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
      <div style={{ padding: 24, border: '1px solid #eee', borderRadius: 12 }}>
        <h1>Entrar</h1>
        <p>Autenticación con Google</p>
        <button onClick={login}>Continuar con Google</button>
      </div>
    </div>
  )
}

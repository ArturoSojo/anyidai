import { useEffect } from 'react'
import { signInWithPopup, onAuthStateChanged } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { auth, googleProvider } from '../lib/firebase'

export default function Login() {
  const navigate = useNavigate()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => { if (user) navigate('/') })
    return () => unsub()
  }, [navigate])

  const login = async () => { await signInWithPopup(auth, googleProvider) }

  return (
    <div style={styles.wrap}>
      <div style={styles.backGlow} />
      <header style={styles.brand}>
        <span style={styles.logoMark}>💈</span>
        <span style={styles.logoText}>Anyidai</span>
      </header>

      <div style={styles.card}>
        <h1 style={styles.title}>Bienvenido</h1>
        <p style={styles.subtitle}>Accede con tu cuenta de Google</p>

        <button onClick={login} style={styles.googleBtn}>
          <GoogleIcon />
          <span>Continuar con Google</span>
        </button>

        <div style={styles.note}>
          Al continuar aceptas las políticas de uso y privacidad.
        </div>
      </div>

      <footer style={styles.footer}>
        © {new Date().getFullYear()} Barber Manager
      </footer>
    </div>
  )
}

/** --- Styles (CSS-in-JS) --- */
const palette = {
  pink100: '#FCD1E3',
  pink500: '#FF5AB8',
  violet600: '#6F1AB6',
  purple700: '#5B2C98',
  blue600: '#0F69A8',
  cyan400: '#19D1F2'
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: '100vh',
    position: 'relative',
    display: 'grid',
    placeItems: 'center',
    background:
      `linear-gradient(145deg,
        ${palette.pink500} 0%,
        ${palette.violet600} 30%,
        ${palette.purple700} 45%,
        ${palette.blue600} 70%,
        ${palette.cyan400} 100%)`,
    overflow: 'hidden',
    color: '#0b1020'
  },
  backGlow: {
    position: 'absolute',
    width: 900,
    height: 900,
    borderRadius: '50%',
    background:
      `radial-gradient(closest-side, ${palette.pink100}, transparent 70%)`,
    filter: 'blur(40px)',
    opacity: 0.35,
    top: '-20%',
    right: '-10%',
    animation: 'float 12s ease-in-out infinite'
  },
  brand: {
    position: 'absolute',
    top: 20,
    left: 24,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    color: 'white'
  },
  logoMark: { fontSize: 22, filter: 'drop-shadow(0 2px 6px rgba(0,0,0,.25))' },
  logoText: { fontWeight: 700, letterSpacing: .4, textShadow: '0 2px 10px rgba(0,0,0,.25)' },
  card: {
    width: 'min(92vw, 440px)',
    padding: 28,
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,.25)',
    background: 'rgba(255,255,255,.14)',
    boxShadow: '0 12px 40px rgba(0,0,0,.25)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    color: 'white'
  },
  title: {
    margin: '4px 0 6px',
    fontSize: 28,
    fontWeight: 800
  },
  subtitle: {
    margin: '0 0 20px',
    opacity: .9,
    lineHeight: 1.4
  },
  googleBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: '12px 16px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,.35)',
    background:
      `linear-gradient(135deg, rgba(255,255,255,.95), rgba(255,255,255,.85))`,
    color: '#1a1f36',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'transform .12s ease, box-shadow .12s ease, background .2s ease',
    boxShadow: '0 6px 18px rgba(0,0,0,.18)'
  },
  note: {
    marginTop: 14,
    fontSize: 12,
    opacity: .85,
    textAlign: 'center'
  },
  footer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: 'rgba(255,255,255,.8)',
    fontSize: 12
  }
}

/** Iconito de Google en SVG (sin dependencias) */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5h-1.9V20H24v8h11.3C33.8 31.7 29.4 35 24 35c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 6 .9 8.3 3l5.7-5.7C34 5.2 29.3 3.5 24 3.5 12 3.5 2.5 13 2.5 25S12 46.5 24 46.5 45.5 37 45.5 25c0-1.5-.1-3-.4-4.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.4 16 18.8 13 24 13c3.1 0 6 .9 8.3 3l5.7-5.7C34 5.2 29.3 3.5 24 3.5 16.1 3.5 9.2 7.8 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 46.5c5.3 0 10-1.7 13.8-4.7l-6.4-5.3C29.1 38.8 26.7 39.5 24 39.5c-5.3 0-9.7-3.3-11.3-7.9l-6.5 5C9.1 42.2 16 46.5 24 46.5z"/>
      <path fill="#1976D2" d="M43.6 20.5H24v8h11.3C34.8 31.7 30.4 35 24 35c-4.8 0-9-3-10.6-7.2l-6.6 5c3 6.9 9.9 11.2 17.2 11.2 8.8 0 16.3-5.9 18.8-14  .6-2.1 .9-4.4 .9-6.5 0-1.5-.1-3-.4-4.5z"/>
    </svg>
  )
}


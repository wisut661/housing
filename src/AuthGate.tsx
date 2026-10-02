import { useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { ArrowRight } from 'lucide-react'
import App from './App'
import { auth, firebaseConfigured, googleProvider } from './firebase'
import './AuthGate.css'

function authErrorMessage(error: unknown) {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : ''
  if (code === 'auth/popup-closed-by-user') return 'ปิดหน้าต่าง Google ก่อนลงชื่อเข้าใช้เสร็จ'
  if (code === 'auth/unauthorized-domain') return 'โดเมนนี้ยังไม่ได้เพิ่มใน Authorized domains ของ Firebase'
  if (code === 'auth/popup-blocked') return 'เบราว์เซอร์บล็อกหน้าต่างเข้าสู่ระบบ กรุณาอนุญาต popup แล้วลองอีกครั้ง'
  return 'ลงชื่อเข้าใช้ไม่สำเร็จ กรุณาตรวจสอบการตั้งค่า Firebase แล้วลองอีกครั้ง'
}

export default function AuthGate() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(firebaseConfigured)
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!firebaseConfigured) return
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setLoading(false)
    }, () => {
      setError('ตรวจสอบสถานะผู้ใช้ไม่ได้ กรุณาตรวจสอบการตั้งค่า Firebase Authentication')
      setLoading(false)
    })
  }, [])

  const handleSignIn = async () => {
    setSigningIn(true)
    setError('')
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (signInError) {
      setError(authErrorMessage(signInError))
    } finally {
      setSigningIn(false)
    }
  }

  const handleSignOut = async () => {
    setError('')
    try {
      await signOut(auth)
    } catch {
      setError('ออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง')
    }
  }

  if (loading) {
    return <main className="auth-loading" aria-label="กำลังตรวจสอบสถานะ"><span className="auth-spinner" /></main>
  }

  if (user) {
    return <App user={user} onSignOut={handleSignOut} />
  }

  return <div className="auth-login-shell">
    <aside className="auth-login-sidebar">
      <div className="auth-brand"><span className="auth-brand-mark">บ</span><span>บ้านใจ<small>COMMUNITY OFFICE</small></span></div>
      <div className="auth-login-sidebar-bottom">
        {!firebaseConfigured && <p className="auth-message" role="status">ยังไม่ได้ตั้งค่า Firebase กรุณากรอกค่า VITE_FIREBASE_* ในไฟล์ .env แล้วเริ่ม Vite ใหม่</p>}
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button className="auth-sidebar-login" type="button" onClick={handleSignIn} disabled={!firebaseConfigured || signingIn}>
          <span className="google-mark" aria-hidden="true">G</span>
          {signingIn ? 'กำลังเชื่อมต่อ...' : 'เข้าสู่ระบบด้วย Google'}
          {!signingIn && <ArrowRight size={16} />}
        </button>
        <p className="auth-footnote">การยืนยันตัวตนโดย Firebase Authentication</p>
      </div>
    </aside>
    <main className="auth-login-content">
      <section className="auth-login-copy">
      <p className="auth-eyebrow">SECURE ACCESS</p>
      <h1>เข้าสู่ระบบ</h1>
      <p className="auth-description">ลงชื่อเข้าใช้ด้วยบัญชี Google เพื่อจัดการข้อมูลโครงการ</p>
    </section>
    </main>
  </div>
}
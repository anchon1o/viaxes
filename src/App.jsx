import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState, createContext, useContext } from 'react'
import { supabase } from './lib/supabase'
import { useSettings } from './hooks/useSettings.js'
import Login        from './pages/Login.jsx'
import Trips        from './pages/Trips.jsx'
import TripDashboard from './pages/TripDashboard.jsx'

export const SessionContext  = createContext(null)
export const SettingsContext = createContext(null)
export const useSession  = () => useContext(SessionContext)
export const useAppSettings = () => useContext(SettingsContext)

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: l } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => l.subscription.unsubscribe()
  }, [])

  const settingsHook = useSettings(session?.user?.id)

  if (session === undefined) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
      <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
    </div>
  )

  return (
    <SessionContext.Provider value={session}>
      <SettingsContext.Provider value={settingsHook}>
        <Routes>
          <Route path="/login"       element={session ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/"            element={session ? <Trips />  : <Navigate to="/login" replace />} />
          <Route path="/viaxe/:id"   element={session ? <TripDashboard /> : <Navigate to="/login" replace />} />
          <Route path="*"            element={<Navigate to="/" replace />} />
        </Routes>
      </SettingsContext.Provider>
    </SessionContext.Provider>
  )
}

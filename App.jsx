import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState, createContext, useContext } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login.jsx'
import Trips from './pages/Trips.jsx'
import TripDashboard from './pages/TripDashboard.jsx'

export const SessionContext = createContext(null)
export const useSession = () => useContext(SessionContext)

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => listener.subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-mid text-sm">Cargando...</span>
      </div>
    )
  }

  return (
    <SessionContext.Provider value={session}>
      <Routes>
        <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/" element={session ? <Trips /> : <Navigate to="/login" replace />} />
        <Route path="/viaxe/:tripId" element={session ? <TripDashboard /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SessionContext.Provider>
  )
}

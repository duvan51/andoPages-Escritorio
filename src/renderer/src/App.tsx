import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { Login } from './components/Login'
import { Sidebar } from './components/Sidebar'
import { Products } from './components/Products'
import { POS } from './components/POS'
import { Accounting } from './components/Accounting'
import { Settings } from './components/Settings'
import { Catalogs } from './components/Catalogs'
import { Titlebar } from './components/Titlebar'
import { Pautas } from './components/Pautas'
import { Lockers } from './components/Lockers'
import { Loader2, LayoutDashboard, TrendingUp, Users, ShoppingBag } from 'lucide-react'

function App() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [company, setCompany] = useState<{ id: string, name: string } | null>(null)

  const fetchCompany = async (email: string) => {
    console.log("[APP DEBUG] fetchCompany() convocado para:", email);
    try {
      const dbQueryPromise = supabase
        .from('companies')
        .select('id, name')
        .eq('admin_email', email)
        .maybeSingle();

      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("Supabase query timeout (4s)")), 4000)
      );

      const response = await Promise.race([dbQueryPromise, timeoutPromise]);
      const { data, error } = response as any;

      if (error) {
        console.error("[APP DEBUG] Error en fetchCompany():", error);
      } else {
        console.log("[APP DEBUG] Resultado en fetchCompany():", data);
      }

      if (!error && data) {
        setCompany(data)
        return data
      }
    } catch (err) {
      console.error("[APP DEBUG] Excepción en fetchCompany():", err);
    }
    return null
  }

  const checkSession = async () => {
    console.log("[APP DEBUG] Iniciando checkSession()...");
    
    try {
      // 1. Verificar sesión personalizada primero (de localStorage)
      const localSessionStr = localStorage.getItem('andopages_session')
      console.log("[APP DEBUG] 'andopages_session' crudo de localStorage:", localSessionStr);
      
      if (localSessionStr) {
        try {
          const localSession = JSON.parse(localSessionStr)
          console.log("[APP DEBUG] Sesión local parseada con éxito:", localSession);
          
          setSession(localSession)
          
          if (localSession.companyId) {
            console.log("[APP DEBUG] Estableciendo empresa desde sesión local:", {
              id: localSession.companyId,
              name: localSession.companyName
            });
            setCompany({ id: localSession.companyId, name: localSession.companyName || 'Tu Tienda' })
          } else if (localSession.user?.email) {
            console.log("[APP DEBUG] No hay companyId en la sesión local. Buscando empresa para el correo:", localSession.user.email);
            try {
              await fetchCompany(localSession.user.email)
            } catch (e) {
              console.error("[APP DEBUG] Error al obtener empresa para sesión local:", e)
            }
          }
          
          setLoading(false)
          return
        } catch (e) {
          console.error('[APP DEBUG] Error al analizar la sesión local:', e)
        }
      }

      // 2. Verificar sesión nativa de Supabase (Google Login)
      console.log("[APP DEBUG] No hay sesión local en localStorage. Consultando sesión nativa de Supabase...");
      const { data: { session: supabaseSession } } = await supabase.auth.getSession()
      console.log("[APP DEBUG] Sesión nativa de Supabase obtenida:", supabaseSession);
      
      if (supabaseSession) {
        setSession(supabaseSession)
        if (supabaseSession.user?.email) {
          console.log("[APP DEBUG] Buscando empresa para correo de sesión nativa:", supabaseSession.user.email);
          try {
            await fetchCompany(supabaseSession.user.email)
          } catch (e) {
            console.error("[APP DEBUG] Error al obtener empresa para sesión nativa:", e)
          }
        }
      } else {
        console.log("[APP DEBUG] No se detectó ninguna sesión activa. Se requiere inicio de sesión.");
        setSession(null)
        setCompany(null)
      }
    } catch (globalErr) {
      console.error("[APP DEBUG] Error general en checkSession:", globalErr)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkSession()

    // Escuchar cambios en la autenticación nativa (ej. Google Login)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, supabaseSession) => {
      try {
        if (supabaseSession) {
          setSession(supabaseSession)
          if (supabaseSession.user?.email) {
            await fetchCompany(supabaseSession.user.email)
          }
        } else {
          // Solo limpiar si no hay una sesión personalizada activa
          if (!localStorage.getItem('andopages_session')) {
            setSession(null)
            setCompany(null)
          }
        }
      } catch (authErr) {
        console.error("[APP DEBUG] Error en handler de onAuthStateChange:", authErr)
      } finally {
        setLoading(false)
      }
    })

    // Escuchar eventos personalizados de inicio y cierre de sesión
    const handleSessionChange = () => {
      checkSession()
    }

    window.addEventListener('storage', handleSessionChange)
    window.addEventListener('andopages_login_success', handleSessionChange)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault()
        window.desktopAPI.toggleFullscreen()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('storage', handleSessionChange)
      window.removeEventListener('andopages_login_success', handleSessionChange)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  if (loading) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-500" size={48} />
      </div>
    )
  }

  if (!session) {
    return <Login />
  }

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
      <Titlebar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          companyName={company?.name} 
        />
        
        <main className="flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
          {activeTab === 'dashboard' && (
            <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <header>
                <h1 className="text-3xl font-bold text-white tracking-tight">Bienvenido, {session.user.email?.split('@')[0]}</h1>
                <p className="text-slate-400 mt-1">Aquí tienes un resumen de lo que está pasando en {company?.name || 'tu tienda'}.</p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Ventas del Mes', value: '$2.4M', icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                  { label: 'Nuevos Clientes', value: '48', icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                  { label: 'Pedidos Pendientes', value: '12', icon: ShoppingBag, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                  { label: 'Total Productos', value: '24', icon: LayoutDashboard, color: 'text-purple-400', bg: 'bg-purple-500/10' },
                ].map((stat, i) => (
                  <div key={i} className="bg-slate-900 border border-slate-800 p-6 rounded-3xl hover:border-slate-700 transition-colors group">
                    <div className="flex justify-between items-start">
                      <div className={`${stat.bg} ${stat.color} p-3 rounded-2xl`}>
                        <stat.icon size={24} />
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{stat.label}</p>
                      <h3 className="text-2xl font-bold text-white mt-1 group-hover:scale-105 transition-transform origin-left">
                        {stat.value}
                      </h3>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-80 bg-slate-900 border border-slate-800 rounded-3xl flex items-center justify-center text-slate-600 font-medium italic">
                  Gráfico de Ventas Semanales
                </div>
                <div className="h-80 bg-slate-900 border border-slate-800 rounded-3xl flex items-center justify-center text-slate-600 font-medium italic">
                  Últimos Movimientos
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pos' && company && (
            <POS companyId={company.id} />
          )}

          {activeTab === 'accounting' && company && (
            <Accounting companyId={company.id} />
          )}

          {activeTab === 'products' && company && (
            <Products companyId={company.id} />
          )}

          {activeTab === 'lockers' && company && (
            <Lockers companyId={company.id} session={session} />
          )}

          {activeTab === 'pautas' && company && (
            <Pautas companyId={company.id} />
          )}

          {activeTab === 'catalogs' && company && (
            <Catalogs companyId={company.id} />
          )}

          {activeTab === 'bookings' && (
            <div className="flex items-center justify-center h-full text-slate-500 font-medium italic">
              Módulo de Reservas en desarrollo...
            </div>
          )}

          {activeTab === 'settings' && company && (
            <Settings companyId={company.id} />
          )}
        </main>
      </div>
    </div>
  )
}

export default App

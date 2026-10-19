import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Mail, Lock } from 'lucide-react';
import { Titlebar } from './Titlebar';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = window.desktopAPI.onOAuthCallback(async (url) => {
      try {
        console.log("Recibido callback OAuth en Renderer:", url);
        
        const urlObj = new URL(url);
        // Intentamos buscar en los parámetros de búsqueda (?)
        let params = new URLSearchParams(urlObj.search);
        
        // Si no hay nada ahí, buscamos en el fragmento (#) que es común en Implicit Flow
        if (!params.has('code') && !params.has('access_token') && urlObj.hash) {
          console.log("Buscando tokens en el hash fragment...");
          params = new URLSearchParams(urlObj.hash.substring(1));
        }
        
        const code = params.get('code');
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        
        console.log("Parámetros detectados:", { 
          hasCode: !!code, 
          hasAccessToken: !!accessToken, 
          hasRefreshToken: !!refreshToken 
        });

        if (code) {
          setGoogleLoading(true);
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (accessToken && refreshToken) {
          setGoogleLoading(true);
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          if (error) throw error;
        } else {
          throw new Error("La URL de respuesta no contenía los datos de sesión esperados.");
        }
      } catch (err: any) {
        console.error("Error detallado en autenticación:", err);
        setError(err.message || "Error al procesar la sesión de Google");
        setGoogleLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const trimmedEmail = email.trim();
    const cleanEmail = trimmedEmail.toLowerCase();
    const trimmedPassword = password.trim();

    console.log("[LOGIN DEBUG] Iniciando intento de inicio de sesión...");
    console.log("[LOGIN DEBUG] Correo ingresado:", trimmedEmail);
    console.log("[LOGIN DEBUG] Correo procesado (lowercase):", cleanEmail);
    console.log("[LOGIN DEBUG] Longitud de contraseña:", trimmedPassword.length);

    // 1. Master Login for Super Admin (igual que la web)
    if (cleanEmail === 'aponteramirezduvan@gmail.com' && trimmedPassword === '000000') {
      console.log("[LOGIN DEBUG] Credenciales de Super Admin maestro detectadas.");
      const customSession = {
        user: { email: cleanEmail },
        role: 'superadmin'
      };
      localStorage.setItem('andopages_session', JSON.stringify(customSession));
      console.log("[LOGIN DEBUG] Sesión de Super Admin guardada en localStorage.");
      
      window.dispatchEvent(new CustomEvent('andopages_login_success'));
      console.log("[LOGIN DEBUG] Evento 'andopages_login_success' disparado.");
      
      setLoading(false);
      return;
    }

    // 2. Tenant Login (igual que la web)
    try {
      console.log("[LOGIN DEBUG] Buscando administrador en la tabla 'companies'...");
      const { data, error: dbError } = await supabase
        .from('companies')
        .select('id, name, admin_email, admin_password')
        .eq('admin_email', cleanEmail)
        .eq('admin_password', trimmedPassword)
        .maybeSingle();

      if (dbError) {
        console.error("[LOGIN DEBUG] Error de base de datos en Supabase:", dbError);
        throw dbError;
      }

      console.log("[LOGIN DEBUG] Resultado de la consulta de empresa:", data);

      if (data) {
        console.log("[LOGIN DEBUG] Credenciales de Tenant válidas. Empresa encontrada:", data.name);
        const customSession = {
          user: { email: cleanEmail },
          role: 'tenant',
          companyId: data.id,
          companyName: data.name
        };
        localStorage.setItem('andopages_session', JSON.stringify(customSession));
        console.log("[LOGIN DEBUG] Sesión de Tenant guardada en localStorage.");
        
        window.dispatchEvent(new CustomEvent('andopages_login_success'));
        console.log("[LOGIN DEBUG] Evento 'andopages_login_success' disparado.");
      } else {
        console.warn("[LOGIN DEBUG] No se encontró ninguna empresa con este correo y contraseña.");
        setError('Credenciales incorrectas.');
      }
    } catch (err: any) {
      console.error("[LOGIN DEBUG] Excepción capturada en handleLogin:", err);
      setError(err.message || 'Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          skipBrowserRedirect: true,
          redirectTo: 'https://desarrollandoando.fun/admin',
          queryParams: {
            prompt: 'select_account'
          }
        }
      });
      
      if (error) throw error;
      
      if (data?.url) {
        window.desktopAPI.openAuthWindow(data.url);
      }
    } catch (err: any) {
      setError(err.message || "Error al iniciar sesión con Google");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-neutral-900 text-white font-sans overflow-hidden">
      <Titlebar />
      
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl p-8 transform transition-all overflow-y-auto max-h-[calc(100vh-40px)]">
          <div className="text-center mb-8 mt-4">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-neutral-900 border border-neutral-800 rounded-xl mb-4 shadow-[0_0_15px_rgba(249,115,22,0.1)]">
              <div className="w-4 h-4 bg-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.5)]"></div>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Bienvenido al Dashboard</h1>
            <p className="text-sm text-neutral-400 mt-2">Ingresa tus credenciales para administrar tus tiendas</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg mb-6 text-center">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading || loading}
              className="w-full bg-white hover:bg-neutral-100 text-neutral-900 font-medium py-3 rounded-lg transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {googleLoading ? (
                <Loader2 size={18} className="animate-spin text-neutral-500" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              Continuar con Google
            </button>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-neutral-800"></div>
              <span className="flex-shrink-0 mx-4 text-neutral-500 text-xs uppercase">o usa tu correo</span>
              <div className="flex-grow border-t border-neutral-800"></div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Correo Electrónico</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 text-white text-sm rounded-lg pl-10 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-colors"
                    placeholder="admin@ejemplo.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Contraseña</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                    <Lock size={16} />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 text-white text-sm rounded-lg pl-10 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-colors"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full bg-orange-600 hover:bg-orange-500 text-white font-medium py-3 rounded-lg mt-6 transition-all shadow-[0_0_15px_rgba(249,115,22,0.3)] hover:shadow-[0_0_20px_rgba(249,115,22,0.5)] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : 'Iniciar Sesión'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

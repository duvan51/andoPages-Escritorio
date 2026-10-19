import { 
  LayoutDashboard, 
  Package, 
  Calendar, 
  Settings, 
  LogOut, 
  ChevronRight,
  Store,
  BarChart3,
  BookOpen,
  Megaphone,
  FolderOpen
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  companyName?: string;
}

export function Sidebar({ activeTab, setActiveTab, companyName }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pos', label: 'Punto de Venta (POS)', icon: Store },
    { id: 'products', label: 'Mis Productos', icon: Package },
    { id: 'lockers', label: 'Casilleros', icon: FolderOpen },
    { id: 'pautas', label: 'Productos en Pauta', icon: Megaphone },
    { id: 'catalogs', label: 'Catálogos PDF', icon: BookOpen },
    { id: 'accounting', label: 'Contabilidad', icon: BarChart3 },
    { id: 'bookings', label: 'Reservas/Pedidos', icon: Calendar },
    { id: 'settings', label: 'Configuración', icon: Settings },
  ];

  const handleLogout = async () => {
    localStorage.removeItem('andopages_session');
    window.dispatchEvent(new Event('storage'));
    await supabase.auth.signOut();
  };

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full text-slate-300">
      {/* Brand */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-bold">
          <Store size={20} />
        </div>
        <div>
          <h2 className="font-bold text-white text-sm leading-tight truncate w-32">
            {companyName || 'AndoPages'}
          </h2>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
            Admin Panel
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`
                w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 group cursor-pointer
                ${isActive 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                  : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'}
              `}
            >
              <div className="flex items-center gap-3">
                <Icon size={20} className={isActive ? 'text-emerald-400' : 'group-hover:scale-110 transition-transform'} />
                <span className="font-medium text-sm">{item.label}</span>
              </div>
              {isActive && <ChevronRight size={14} />}
            </button>
          );
        })}
      </nav>

      {/* User / Footer */}
      <div className="p-4 border-t border-slate-800">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors group cursor-pointer"
        >
          <LogOut size={20} className="group-hover:translate-x-1 transition-transform" />
          <span className="font-medium text-sm">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}

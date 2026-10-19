import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Save, Loader2, Image as ImageIcon, Building2, MapPin, Phone, MessageSquare, Palette } from 'lucide-react';

interface CompanySettings {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  logo_url?: string;
  receipt_footer?: string;
  primary_color?: string;
  admin_email: string;
}

export function Settings({ companyId }: { companyId: string }) {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, [companyId]);

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();

    if (!error && data) {
      setSettings(data);
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setSaving(true);
    setMessage(null);

    const { error } = await supabase
      .from('companies')
      .update({
        name: settings.name,
        address: settings.address,
        phone: settings.phone,
        logo_url: settings.logo_url,
        receipt_footer: settings.receipt_footer,
        primary_color: settings.primary_color
      })
      .eq('id', companyId);

    if (error) {
      setMessage({ type: 'error', text: 'Error al guardar los ajustes: ' + error.message });
    } else {
      setMessage({ type: 'success', text: 'Ajustes guardados correctamente' });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-500" size={40} />
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-slate-950">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Personalización</h1>
          <p className="text-slate-500 font-medium">Ajusta la apariencia de tu marca y tus recibos digitales.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {message && (
              <div className={`p-4 rounded-2xl border ${
                message.type === 'success' 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              } animate-in fade-in slide-in-from-top-2`}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Info */}
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-[32px] space-y-6">
              <h2 className="text-lg font-black text-white uppercase flex items-center gap-2">
                <Building2 size={20} className="text-emerald-500" />
                Info del Negocio
              </h2>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Nombre Comercial</label>
                  <input 
                    type="text"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:ring-1 focus:ring-emerald-500 outline-none"
                    value={settings?.name || ''}
                    onChange={(e) => setSettings(s => s ? {...s, name: e.target.value} : null)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Email del Administrador (Principal)</label>
                  <input 
                    type="text"
                    readOnly
                    className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-3 px-4 text-slate-500 cursor-not-allowed outline-none"
                    value={settings?.admin_email || ''}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 text-emerald-400">Dirección Física</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input 
                      type="text"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus:ring-1 focus:ring-emerald-500 outline-none"
                      value={settings?.address || ''}
                      placeholder="Calle 123 #45-67"
                      onChange={(e) => setSettings(s => s ? {...s, address: e.target.value} : null)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Teléfono de Contacto</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input 
                      type="text"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus:ring-1 focus:ring-emerald-500 outline-none"
                      value={settings?.phone || ''}
                      onChange={(e) => setSettings(s => s ? {...s, phone: e.target.value} : null)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Branding */}
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-[32px] space-y-6">
              <h2 className="text-lg font-black text-white uppercase flex items-center gap-2">
                <Palette size={20} className="text-emerald-500" />
                Imagen de Marca
              </h2>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">URL del Logo (Imagen)</label>
                  <div className="relative">
                    <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input 
                      type="text"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus:ring-1 focus:ring-emerald-500 outline-none"
                      value={settings?.logo_url || ''}
                      placeholder="https://tudominio.com/logo.png"
                      onChange={(e) => setSettings(s => s ? {...s, logo_url: e.target.value} : null)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Color Principal (Hex)</label>
                  <div className="flex gap-3">
                    <input 
                      type="color"
                      className="h-11 w-11 bg-transparent border-none outline-none cursor-pointer"
                      value={settings?.primary_color || '#10b981'}
                      onChange={(e) => setSettings(s => s ? {...s, primary_color: e.target.value} : null)}
                    />
                    <input 
                      type="text"
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:ring-1 focus:ring-emerald-500 outline-none"
                      value={settings?.primary_color || '#10b981'}
                      onChange={(e) => setSettings(s => s ? {...s, primary_color: e.target.value} : null)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Receipt Customization */}
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-[32px] space-y-6">
            <h2 className="text-lg font-black text-white uppercase flex items-center gap-2">
              <MessageSquare size={20} className="text-emerald-500" />
              Pie del Recibo Digital
            </h2>
            
            <div className="space-y-2">
              <p className="text-xs text-slate-400 mb-4">Este mensaje aparecerá al final de todos tus PDFs y recibos digitales.</p>
              <textarea 
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white focus:ring-1 focus:ring-emerald-500 outline-none min-h-[100px] resize-none"
                placeholder="Ej: Gracias por confiar en nosotros. ¡Vuelve pronto!"
                value={settings?.receipt_footer || ''}
                onChange={(e) => setSettings(s => s ? {...s, receipt_footer: e.target.value} : null)}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button 
              disabled={saving}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/20 flex items-center gap-2 active:scale-95"
            >
              {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>

      {/* Receipt Preview Sidebar */}
      <div className="space-y-4">
        <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest ml-4">Vista Previa del Recibo</h2>
        <div className="bg-white rounded-3xl p-8 shadow-2xl scale-[0.9] origin-top transform transition-all duration-500 hover:scale-100 min-h-[600px] flex flex-col">
          {/* Logo & Header */}
          <div className="flex justify-between items-start mb-8">
            <div className="space-y-2 flex-1">
              {settings?.logo_url ? (
                <img src={settings.logo_url} alt="Logo" className="h-16 object-contain mb-2" />
              ) : (
                <h3 className="text-2xl font-black italic" style={{ color: settings?.primary_color || '#10b981' }}>
                  {settings?.name || 'Mi Negocio'}
                </h3>
              )}
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-tight leading-tight">
                {settings?.address || 'Dirección no configurada'} <br />
                {settings?.phone || 'WhatsApp no configurado'}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded-full uppercase">Recibo Digital</span>
              <p className="text-[10px] font-bold text-slate-400 mt-2">#VNT-EXAMPLE</p>
            </div>
          </div>

          <div className="h-px bg-slate-100 mb-6" />

          {/* Table Simulation */}
          <div className="flex-1 space-y-4">
            <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-widest px-2">
              <span>Producto</span>
              <div className="flex gap-8">
                <span>Cant</span>
                <span className="w-16 text-right">Total</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center px-2 py-1">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-800">Producto de Ejemplo</span>
                  <span className="text-[9px] text-slate-400">Variante: M / Negro</span>
                </div>
                <div className="flex gap-8 items-center">
                  <span className="text-xs font-medium text-slate-600">1</span>
                  <span className="text-xs font-bold text-slate-800 w-16 text-right">$ 50.000</span>
                </div>
              </div>
              <div className="flex justify-between items-center px-2 py-1 border-y border-slate-50/50">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-800">Servicio Especial</span>
                </div>
                <div className="flex gap-8 items-center">
                  <span className="text-xs font-medium text-slate-600">2</span>
                  <span className="text-xs font-bold text-slate-800 w-16 text-right">$ 120.000</span>
                </div>
              </div>
            </div>
          </div>

          {/* Total Section */}
          <div className="mt-8 pt-6 border-t-2 border-dashed border-slate-100 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400 uppercase">Subtotal</span>
              <span className="text-xs font-bold text-slate-600">$ 170.000</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-sm font-black text-slate-800 uppercase tracking-tighter">Total a Pagar</span>
              <span className="text-2xl font-black" style={{ color: settings?.primary_color || '#10b981' }}>$ 170.000</span>
            </div>
          </div>

          {/* Footer Message */}
          <div className="mt-10 text-center">
            <p className="text-[10px] text-slate-400 italic leading-relaxed">
              {settings?.receipt_footer || 'Gracias por su compra. ¡Vuelva pronto!'}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
);
}

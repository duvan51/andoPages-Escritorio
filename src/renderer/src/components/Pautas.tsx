import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Search, 
  Megaphone, 
  Trash2, 
  Loader2, 
  Plus, 
  Save, 
  TrendingDown, 
  Package, 
  X,
  AlertCircle
} from 'lucide-react';

const formatPrice = (amount: number | string) => {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.-]+/g, "")) : amount;
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(numericAmount || 0);
};

interface Product {
  id: string;
  title: string;
  description: string;
  category: string;
  price: string;
  imageUrl: string;
  active: boolean;
  company_id: string;
  product_type?: 'product' | 'service';
  sku?: string;
  cost_price?: number;
  pauta_price?: number;
  is_pauta?: boolean;
  stock?: number;
}

export function Pautas({ companyId }: { companyId: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTermActive, setSearchTermActive] = useState('');
  const [searchTermAvailable, setSearchTermAvailable] = useState('');
  
  // States for inline editing
  const [pautaPrices, setPautaPrices] = useState<Record<string, string>>({});
  const [updatingProductId, setUpdatingProductId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // States for adding new pautas
  const [addingProductId, setAddingProductId] = useState<string | null>(null);
  const [newPautaPrice, setNewPautaPrice] = useState<string>('');

  useEffect(() => {
    if (companyId) {
      fetchProducts();
    }
  }, [companyId]);

  const fetchProducts = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase
        .from('treatments')
        .select('*')
        .eq('company_id', companyId)
        .order('title', { ascending: true });

      if (error) throw error;

      if (data) {
        setProducts(data);
        // Pre-fill local input states with database values
        const prices: Record<string, string> = {};
        data.forEach(p => {
          if (p.is_pauta) {
            prices[p.id] = p.pauta_price ? String(p.pauta_price) : '';
          }
        });
        setPautaPrices(prices);
      }
    } catch (err: any) {
      console.error("[PAUTAS DEBUG] Error fetching products:", err);
      setErrorMsg("Error al obtener los productos de la base de datos.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePrice = async (productId: string) => {
    const rawPrice = pautaPrices[productId];
    const priceNum = parseFloat(rawPrice);
    
    if (isNaN(priceNum) || priceNum <= 0) {
      alert("Por favor ingresa un precio de pauta válido y mayor a 0.");
      return;
    }

    setUpdatingProductId(productId);
    try {
      const { error } = await supabase
        .from('treatments')
        .update({ pauta_price: priceNum })
        .eq('id', productId);

      if (error) throw error;

      // Update local state
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, pauta_price: priceNum } : p));
      
      // Visual feedback: simple console log
      console.log(`[PAUTAS DEBUG] Precio de pauta actualizado para ${productId} a ${priceNum}`);
    } catch (err: any) {
      console.error("[PAUTAS DEBUG] Error updating pauta price:", err);
      alert("No se pudo actualizar el precio de pauta.");
    } finally {
      setUpdatingProductId(null);
    }
  };

  const handleRemoveFromPauta = async (productId: string) => {
    if (!confirm("¿Estás seguro de que deseas quitar este producto de la pauta?")) {
      return;
    }

    setUpdatingProductId(productId);
    try {
      const { error } = await supabase
        .from('treatments')
        .update({ is_pauta: false })
        .eq('id', productId);

      if (error) throw error;

      // Update local state
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, is_pauta: false } : p));
      
      // Clean local price input state
      setPautaPrices(prev => {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      });
      console.log(`[PAUTAS DEBUG] Producto ${productId} removido de pauta.`);
    } catch (err: any) {
      console.error("[PAUTAS DEBUG] Error removing product from pauta:", err);
      alert("No se pudo remover el producto de la pauta.");
    } finally {
      setUpdatingProductId(null);
    }
  };

  const handleAddToPauta = async (productId: string) => {
    const priceNum = parseFloat(newPautaPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      alert("Por favor ingresa un precio de pauta válido y mayor a 0.");
      return;
    }

    setUpdatingProductId(productId);
    try {
      const { error } = await supabase
        .from('treatments')
        .update({ is_pauta: true, pauta_price: priceNum })
        .eq('id', productId);

      if (error) throw error;

      // Update local state
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, is_pauta: true, pauta_price: priceNum } : p));
      
      // Update local price input states
      setPautaPrices(prev => ({
        ...prev,
        [productId]: String(priceNum)
      }));

      // Reset add form states
      setAddingProductId(null);
      setNewPautaPrice('');
      console.log(`[PAUTAS DEBUG] Producto ${productId} agregado a pauta con precio ${priceNum}`);
    } catch (err: any) {
      console.error("[PAUTAS DEBUG] Error adding product to pauta:", err);
      alert("No se pudo agregar el producto a la pauta.");
    } finally {
      setUpdatingProductId(null);
    }
  };

  const activePautaProducts = products.filter(p => p.is_pauta && p.title.toLowerCase().includes(searchTermActive.toLowerCase()));
  const availableProducts = products.filter(p => !p.is_pauta && p.title.toLowerCase().includes(searchTermAvailable.toLowerCase()));

  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
              <Megaphone size={24} />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Productos en Pauta</h1>
          </div>
          <p className="text-slate-400 mt-2 text-sm max-w-xl">
            Gestiona los artículos de tu catálogo que se encuentran en campaña promocional y edita sus precios exclusivos de pauta.
          </p>
        </div>
      </header>

      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-4 rounded-2xl flex items-center gap-3">
          <AlertCircle size={20} />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="animate-spin text-blue-500" size={48} />
          <p className="text-slate-400 text-sm animate-pulse">Cargando catálogo...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Active Pautas Left Section (65% width) */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-slate-900/60 border border-slate-800/60 rounded-3xl p-6 shadow-2xl backdrop-blur-md">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <TrendingDown size={18} className="text-blue-400" />
                    Campaña Activa ({activePautaProducts.length})
                  </h2>
                  <p className="text-slate-500 text-xs">Productos con precio especial activo</p>
                </div>
                
                {/* Search Active */}
                <div className="relative max-w-xs w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <input
                    type="text"
                    placeholder="Buscar pautas activas..."
                    value={searchTermActive}
                    onChange={(e) => setSearchTermActive(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-2 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {activePautaProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 bg-slate-950/20 border border-dashed border-slate-800/80 rounded-2xl text-slate-500 gap-3">
                  <Package size={40} className="opacity-20 text-slate-400" />
                  <p className="text-sm font-medium">No hay productos en pauta activos</p>
                  <p className="text-xs text-slate-600 max-w-xs text-center">Agrega artículos desde el panel de la derecha indicando un precio promocional.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800/50 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
                  {activePautaProducts.map((product) => {
                    const localPrice = pautaPrices[product.id] || '';
                    const isSaving = updatingProductId === product.id;
                    const hasPriceChanged = parseFloat(localPrice) !== product.pauta_price;

                    return (
                      <div key={product.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group transition-colors">
                        {/* Product Info */}
                        <div className="flex items-center gap-3.5 flex-1 min-w-0">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-850 flex-shrink-0 border border-slate-800/60 relative">
                            {product.imageUrl ? (
                              <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-600 bg-slate-900">
                                <Package size={20} />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors truncate">
                              {product.title}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold bg-slate-800/60 px-1.5 py-0.5 rounded">
                                {product.category || 'General'}
                              </span>
                              <span className="text-xs text-slate-400 font-medium">
                                Base: {formatPrice(product.price)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions / Price Edit */}
                        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-blue-400 font-bold sm:hidden">Pauta:</span>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                              <input
                                type="number"
                                placeholder="Precio"
                                value={localPrice}
                                onChange={(e) => setPautaPrices({ ...pautaPrices, [product.id]: e.target.value })}
                                className="w-28 sm:w-32 bg-slate-950 border border-slate-800 rounded-xl pl-6 pr-3 py-1.5 text-sm text-slate-200 font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder-slate-700"
                              />
                            </div>
                            
                            <button
                              onClick={() => handleUpdatePrice(product.id)}
                              disabled={isSaving || !hasPriceChanged || localPrice === ''}
                              className={`p-2 rounded-xl transition-all flex items-center justify-center border
                                ${hasPriceChanged && localPrice !== ''
                                  ? 'bg-blue-600/20 text-blue-400 border-blue-500/30 hover:bg-blue-600/30' 
                                  : 'bg-slate-950/40 text-slate-600 border-slate-800/40 cursor-not-allowed'
                                }`}
                              title="Guardar Precio"
                            >
                              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            </button>
                          </div>

                          <button
                            onClick={() => handleRemoveFromPauta(product.id)}
                            disabled={isSaving}
                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/10"
                            title="Quitar de Pauta"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Available Products Right Section (35% width) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900/60 border border-slate-800/60 rounded-3xl p-6 shadow-2xl backdrop-blur-md">
              <div className="space-y-1 mb-6">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Plus size={18} className="text-blue-400" />
                  Agregar a la Pauta
                </h2>
                <p className="text-slate-500 text-xs">Asigna un precio promocional para iniciar pauta</p>
              </div>

              {/* Search Available */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  type="text"
                  placeholder="Buscar productos..."
                  value={searchTermAvailable}
                  onChange={(e) => setSearchTermAvailable(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-2 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors"
                />
              </div>

              {availableProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-center gap-2">
                  <Package size={32} className="opacity-10 text-slate-400" />
                  <p className="text-xs font-medium">No hay productos disponibles</p>
                  <p className="text-[10px] text-slate-600">Todos los productos ya están en pauta o no coinciden con la búsqueda.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800/40 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
                  {availableProducts.map((product) => {
                    const isExpanding = addingProductId === product.id;
                    const isSaving = updatingProductId === product.id;

                    return (
                      <div key={product.id} className="py-3 first:pt-0 last:pb-0 flex flex-col gap-2 transition-all">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-850 flex-shrink-0 border border-slate-800/50">
                              {product.imageUrl ? (
                                <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-600 bg-slate-900">
                                  <Package size={14} />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-white truncate w-32 sm:w-44">
                                {product.title}
                              </h4>
                              <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                                Original: {formatPrice(product.price)}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              if (isExpanding) {
                                setAddingProductId(null);
                                setNewPautaPrice('');
                              } else {
                                setAddingProductId(product.id);
                                setNewPautaPrice(product.pauta_price ? String(product.pauta_price) : '');
                              }
                            }}
                            className={`p-1.5 rounded-lg border transition-all ${
                              isExpanding 
                                ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20' 
                                : 'bg-blue-600/10 text-blue-400 border-blue-500/10 hover:bg-blue-600/20'
                            }`}
                            title={isExpanding ? "Cancelar" : "Agregar a Pauta"}
                          >
                            {isExpanding ? <X size={14} /> : <Plus size={14} />}
                          </button>
                        </div>

                        {/* Expanded pricing input to save */}
                        {isExpanding && (
                          <div className="flex items-center gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/50 animate-in slide-in-from-top-2 duration-200">
                            <div className="relative flex-1">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
                              <input
                                type="number"
                                placeholder="Precio de pauta"
                                value={newPautaPrice}
                                onChange={(e) => setNewPautaPrice(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-5 pr-2 py-1 text-xs text-slate-200 font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                autoFocus
                              />
                            </div>
                            <button
                              onClick={() => handleAddToPauta(product.id)}
                              disabled={isSaving || newPautaPrice === '' || parseFloat(newPautaPrice) <= 0}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-[0_0_10px_rgba(37,99,235,0.2)]"
                            >
                              {isSaving ? <Loader2 size={12} className="animate-spin" /> : 'Confirmar'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          
        </div>
      )}
    </div>
  );
}

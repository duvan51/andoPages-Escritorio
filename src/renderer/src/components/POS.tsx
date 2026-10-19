import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { jsPDF } from 'jspdf';
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  CheckCircle,
  Loader2,
  Package,
  CreditCard,
  Banknote,
  X,
  XCircle,
  Eye,
  Smartphone,
  Mail,
  User,
  Phone
} from 'lucide-react';

interface Product {
  id: string;
  title: string;
  price: string;
  imageUrl: string;
  stock: number;
  category: string;
  product_type?: string;
  sku?: string;
  cost_price?: number;
  pauta_price?: number;
  is_pauta?: boolean;
  variants?: { size: string; color: string; stock: number; sku?: string; image_url?: string }[];
}

interface CartItem extends Product {
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
}

export function POS({ companyId }: { companyId: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerData, setCustomerData] = useState({ name: '', email: '', phone: '' });
  const [lastSaleId, setLastSaleId] = useState<string | null>(null);
  const [lastSaleTotal, setLastSaleTotal] = useState(0);
  const [lastSaleItems, setLastSaleItems] = useState<CartItem[]>([]);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [companyInfo, setCompanyInfo] = useState<any>(null);

  useEffect(() => {
    fetchProducts();
    fetchCompanyInfo();
  }, [companyId]);

  const fetchCompanyInfo = async () => {
    const { data } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();
    if (data) setCompanyInfo(data);
  };

  const fetchProducts = async () => {
    setLoading(true);
    console.log("Cargando productos para empresa:", companyId);
    
    // Quitamos temporalmente el filtro de 'active' para que veas todo lo que hay
    const { data, error } = await supabase
      .from('treatments')
      .select('id, title, price, imageUrl, stock, category, active, product_type, sku, cost_price, pauta_price, is_pauta, variants')
      .eq('company_id', companyId)
      .order('title', { ascending: true });

    if (error) {
      console.error("Error cargando productos POS:", error);
    }
    
    if (data) {
      console.log("Productos cargados:", data.length);
      setProducts(data);
    }
    setLoading(false);
  };

  const parsePrice = (priceStr: string) => {
    if (!priceStr) return 0;
    return parseInt(priceStr.replace(/[^0-9]/g, '')) || 0;
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const [variationModal, setVariationModal] = useState<Product | null>(null);

  const addToCart = (product: Product, size?: string, color?: string) => {
    if (product.product_type === 'product' && (!product.variants || product.variants.length === 0)) {
      // Si es producto pero no tiene variantes, usar stock global (compatibilidad)
      if (product.stock <= 0) return;
    }

    // Si tiene variantes y no se ha seleccionado una
    if (!size && !color && product.variants && product.variants.length > 0) {
      setVariationModal(product);
      return;
    }
    
    setCart(prev => {
      const existingItem = prev.find(item => item.id === product.id && 
        (item.selectedSize || '') === (size || '') && 
        (item.selectedColor || '') === (color || ''));
      
      let availableStock = product.stock;
      if (size || color) {
        const variant = product.variants?.find(v => v.size === size && v.color === color);
        availableStock = variant ? variant.stock : 0;
      }

      if (existingItem) {
        if (existingItem.quantity >= availableStock) {
          alert('No hay más stock disponible para esta opción');
          return prev;
        }
        return prev.map(item =>
          item.id === product.id && 
          (item.selectedSize || '') === (size || '') && 
          (item.selectedColor || '') === (color || '')
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1, selectedSize: size, selectedColor: color }];
    });
    setVariationModal(null);
  };

  const updateQuantity = (id: string, delta: number, size?: string, color?: string) => {
    setCart(prev => prev.map(item => {
      if (item.id === id && (item.selectedSize || '') === (size || '') && (item.selectedColor || '') === (color || '')) {
        const newQty = item.quantity + delta;
        
        if (delta > 0) {
          let availableStock = item.stock;
          if (item.selectedSize || item.selectedColor) {
            const variant = item.variants?.find(v => v.size === item.selectedSize && v.color === item.selectedColor);
            availableStock = variant ? variant.stock : 0;
          }
          if (newQty > availableStock) {
            alert('Límite de stock alcanzado');
            return item;
          }
        }

        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (parsePrice(item.price) * item.quantity), 0);

  const generatePDF = async () => {
    const doc = new jsPDF();
    const margin = 20;
    let y = 20;

    const brandColor = companyInfo?.primary_color || '#10b981';
    // Convert hex to RGB for jsPDF
    const r = parseInt(brandColor.slice(1, 3), 16);
    const g = parseInt(brandColor.slice(3, 5), 16);
    const b = parseInt(brandColor.slice(5, 7), 16);

    // Try to load logo if exists
    if (companyInfo?.logo_url) {
      try {
        const response = await fetch(companyInfo.logo_url);
        const blob = await response.blob();
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        doc.addImage(base64, 'PNG', margin, y, 30, 30);
        y += 35;
      } catch (e) {
        console.error("Error loading logo for PDF:", e);
        y += 10;
      }
    }

    // Header
    doc.setFontSize(22);
    doc.setTextColor(r, g, b);
    doc.text(companyInfo?.name || "Mi Negocio", margin, y);
    
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    if (companyInfo?.address) {
      y += 6;
      doc.text(companyInfo.address, margin, y);
    }
    if (companyInfo?.phone) {
      y += 5;
      doc.text(`Tel: ${companyInfo.phone}`, margin, y);
    }
    
    y += 15;
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text("RECIBO DE VENTA DIGITAL", margin, y);
    
    y += 15;

    // Order Info
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`Orden: #${lastSaleId}`, margin, y);
    doc.text(`Fecha: ${new Date().toLocaleString()}`, 130, y);
    
    y += 8;
    doc.text(`Cliente: ${customerData.name || 'Venta Rápida'}`, margin, y);
    if (customerData.phone) doc.text(`WhatsApp: ${customerData.phone}`, margin, y + 6);
    
    y += 18;
    
    // Table Header
    doc.setFillColor(r, g, b); // Use brand color for header
    doc.setTextColor(255, 255, 255);
    doc.rect(margin, y, 170, 8, 'F');
    doc.setFontSize(9);
    doc.text("PRODUCTO", margin + 2, y + 5.5);
    doc.text("CANT.", margin + 100, y + 5.5);
    doc.text("PRECIO", margin + 125, y + 5.5);
    doc.text("TOTAL", margin + 150, y + 5.5);
    
    y += 13;
    doc.setTextColor(0, 0, 0);

    // Items
    lastSaleItems.forEach(item => {
      const price = parsePrice(item.price);
      const total = price * item.quantity;
      doc.text(`${item.title} ${item.selectedSize ? `(${item.selectedSize})` : ''}`, margin + 2, y);
      doc.text(`${item.quantity}`, margin + 100, y);
      doc.text(`${formatPrice(price)}`, margin + 125, y);
      doc.text(`${formatPrice(total)}`, margin + 150, y);
      y += 8;
    });

    y += 10;
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + 170, y);
    y += 10;

    // Total
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL A PAGAR:", 110, y);
    doc.setTextColor(r, g, b);
    doc.text(formatPrice(lastSaleTotal), 150, y);

    y += 25;
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    const footerMsg = companyInfo?.receipt_footer || "Gracias por su compra. ¡Vuelva pronto!";
    doc.text(footerMsg, margin, y, { maxWidth: 170 });

    doc.save(`Recibo_${companyInfo?.name || 'Venta'}_${lastSaleId}.pdf`);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);

    try {
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert({
          company_id: companyId,
          items: cart.map(item => ({
            id: item.id,
            title: item.title,
            price: item.price,
            quantity: item.quantity,
            product_type: item.product_type,
            sku: item.sku,
            cost_price: item.cost_price || 0,
            selectedSize: item.selectedSize,
            selectedColor: item.selectedColor
          })),
          total: cartTotal
        })
        .select()
        .single();

      if (saleError) throw saleError;
      const generatedSaleId = saleData?.id || `VNT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      setLastSaleId(generatedSaleId);
      setLastSaleTotal(cartTotal);
      setLastSaleItems([...cart]);

      // --- SAVE AS LEAD FOR REMARKETING ---
      try {
        // Find or create "Ventas POS" form
        let { data: form } = await supabase
          .from('forms')
          .select('id')
          .eq('name', 'Ventas POS')
          .eq('company_id', companyId)
          .maybeSingle();

        if (!form) {
          const { data: newForm } = await supabase
            .from('forms')
            .insert({ name: 'Ventas POS', company_id: companyId })
            .select()
            .single();
          form = newForm;
        }

        if (form) {
          await supabase.from('leads').insert({
            form_id: form.id,
            company_id: companyId,
            full_name: customerData.name,
            email: customerData.email,
            phone: customerData.phone,
            data: { 
              source: 'POS Desktop',
              sale_id: generatedSaleId,
              total: cartTotal,
              items_count: cart.length
            }
          });
        }
      } catch (leadErr) {
        console.error("Error saving lead:", leadErr);
      }
      // ------------------------------------

      for (const item of cart) {
        if (item.product_type === 'product') {
          const { data: currentProduct } = await supabase
            .from('treatments')
            .select('variants, stock')
            .eq('id', item.id)
            .single();

          if (currentProduct?.variants && (item.selectedSize || item.selectedColor)) {
            const updatedVariants = currentProduct.variants.map((v: any) => {
              if (v.size === item.selectedSize && v.color === item.selectedColor) {
                return { ...v, stock: Math.max(0, v.stock - item.quantity) };
              }
              return v;
            });

            await supabase
              .from('treatments')
              .update({ 
                variants: updatedVariants,
                stock: Math.max(0, (currentProduct.stock || 0) - item.quantity)
              })
              .eq('id', item.id);
          } else {
            const { error: stockError } = await supabase
              .from('treatments')
              .update({ stock: Math.max(0, (currentProduct?.stock || 0) - item.quantity) })
              .eq('id', item.id);
            
            if (stockError) console.error(`Error actualizando stock de ${item.title}`, stockError);
          }
        }
      }

      setShowSuccess(true);
      setCart([]);
      fetchProducts();
    } catch (error: any) {
      alert(`Error al procesar la venta: ${error.message || 'Error desconocido'}`);
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-2rem)] gap-6 p-6 animate-in fade-in duration-500">
      <div className="flex-1 flex flex-col gap-6 overflow-hidden">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Package className="text-emerald-500" />
            Punto de Venta (POS)
          </h1>
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text"
              placeholder="Buscar producto..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-slate-200 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="animate-spin text-emerald-500" size={40} />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto grid grid-cols-[repeat(auto-fill,220px)] gap-6 justify-center pr-2 custom-scrollbar content-start">
            {products.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase())).map(product => {
              const totalStock = product.variants && product.variants.length > 0 
                ? product.variants.reduce((acc, v) => acc + v.stock, 0)
                : product.stock;
              return (
                <div 
                  key={product.id} 
                  onClick={() => totalStock > 0 && addToCart(product)}
                  className={`flex flex-col w-[220px] h-[280px] bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden transition-all hover:border-emerald-500 hover:shadow-2xl hover:shadow-emerald-500/20 active:scale-95 ${totalStock <= 0 ? 'opacity-40 grayscale cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {/* Image Container with Fixed Height */}
                  <div className="h-32 sm:h-40 relative overflow-hidden bg-slate-800 shrink-0">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-800">
                        <Package size={32} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent" />
                    
                    {/* Action Buttons on Image */}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingProduct(product);
                      }}
                      className="absolute top-3 left-3 p-2.5 bg-slate-950/40 hover:bg-emerald-500 backdrop-blur-md text-white rounded-xl transition-all duration-300 hover:scale-110 border border-white/10 shadow-lg z-20"
                      title="Ver detalles"
                    >
                      <Eye size={18} />
                    </button>

                    {totalStock <= 0 && (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40 backdrop-blur-[1px]">
                        <span className="bg-red-500 text-white text-[8px] font-black px-2 py-1 rounded-md uppercase tracking-widest rotate-12 shadow-xl border border-white/20">AGOTADO</span>
                      </div>
                    )}
                  </div>

                  {/* Content below image */}
                  <div className="p-3 flex flex-col flex-1 justify-between gap-2">
                    <h3 className="text-[11px] font-black text-white leading-tight uppercase truncate">
                      {product.title}
                    </h3>
                    <div className="flex justify-between items-end gap-2">
                      <div className="flex flex-col min-w-0">
                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider truncate">
                          {product.sku || 'SIN SKU'}
                        </p>
                        <p className={`text-[8px] font-black uppercase ${totalStock > 0 ? 'text-emerald-500/80' : 'text-red-500/80'}`}>
                          Stock: {totalStock}
                        </p>
                      </div>
                      <p className="text-sm font-black text-emerald-500 leading-none shrink-0">
                        {formatPrice(parsePrice(product.price))}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="w-96 bg-slate-900 border border-slate-800 rounded-3xl flex flex-col shadow-2xl overflow-hidden relative">
        {showSuccess && (
          <div className="absolute inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-300">
            <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6 animate-bounce">
              <CheckCircle size={64} className="text-emerald-500" />
            </div>
            <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">¡Venta Exitosa!</h2>
            <p className="text-slate-400 mb-8 max-w-[200px]">Los datos del cliente se han guardado como Lead para remarketing.</p>
            
            <div className="w-full space-y-3">
              <button 
                onClick={generatePDF}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
              >
                <Package size={20} />
                Descargar Recibo PDF
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => {
                    const message = `¡Hola! Gracias por tu compra en AndoPages. Tu pedido #${lastSaleId?.slice(0,8)} por ${formatPrice(lastSaleTotal)} ha sido procesado exitosamente.`;
                    window.open(`https://wa.me/${customerData.phone}?text=${encodeURIComponent(message)}`, '_blank');
                  }}
                  className="py-3 bg-[#25D366] hover:bg-[#22c35e] text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <Smartphone size={18} />
                  WhatsApp
                </button>
                
                <button 
                  onClick={() => {
                    window.location.href = `mailto:${customerData.email}?subject=Tu recibo de compra&body=Gracias por tu compra. Total: ${formatPrice(lastSaleTotal)}`;
                  }}
                  className="py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <Mail size={18} />
                  Email
                </button>
              </div>

              <button 
                onClick={() => {
                  setShowSuccess(false);
                  setCustomerData({ name: '', email: '', phone: '' });
                }}
                className="w-full py-3 text-slate-500 hover:text-white font-bold transition-all"
              >
                Nueva Venta
              </button>
            </div>
          </div>
        )}

        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="text-emerald-400" size={20} />
            <h2 className="font-bold text-white uppercase tracking-wider text-sm">Cuenta Actual</h2>
          </div>
          <button onClick={() => setCart([])} className="text-slate-500 hover:text-red-400 transition-colors">
            <Trash2 size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-4">
              <ShoppingCart size={48} className="opacity-10" />
              <p className="text-sm font-medium italic">El carrito está vacío</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-800 shrink-0">
                  <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-white text-xs font-bold truncate">{item.title}</h4>
                  <div className="flex gap-2 mt-0.5">
                    {item.selectedSize && <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded uppercase font-black">{item.selectedSize}</span>}
                    {item.selectedColor && <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded uppercase font-black">{item.selectedColor}</span>}
                  </div>
                  <p className="text-emerald-500 text-xs font-black mt-1">{formatPrice(parsePrice(item.price))}</p>
                </div>
                <div className="flex items-center bg-slate-900 rounded-xl border border-slate-800">
                  <button onClick={() => updateQuantity(item.id, -1)} className="p-1.5 text-slate-500 hover:text-white transition-colors">
                    <Minus size={14} />
                  </button>
                  <span className="w-6 text-center text-xs font-bold text-white">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, 1)} className="p-1.5 text-slate-500 hover:text-white transition-colors">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 bg-slate-950/50 border-t border-slate-800 space-y-4">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-sm font-medium">Subtotal</span>
            <span className="text-sm">{formatPrice(cartTotal)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold text-white">Total</span>
            <span className="text-2xl font-black text-emerald-400">{formatPrice(cartTotal)}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl font-bold text-xs transition-all">
              <Banknote size={16} />
              Efectivo
            </button>
            <button className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl font-bold text-xs transition-all">
              <CreditCard size={16} />
              Tarjeta
            </button>
          </div>

          <button 
            disabled={cart.length === 0 || isProcessing}
            onClick={() => setShowCustomerModal(true)}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            {isProcessing ? <Loader2 className="animate-spin" /> : 'COMPLETAR VENTA'}
          </button>
        </div>
      </div>

      {viewingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setViewingProduct(null)} />
          <div className="relative bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col md:flex-row">
            
            <div className="w-full md:w-1/2 aspect-square bg-slate-800 relative">
              {viewingProduct.imageUrl ? (
                <img src={viewingProduct.imageUrl} alt={viewingProduct.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-700">
                  <Package size={120} />
                </div>
              )}
              <button 
                onClick={() => setViewingProduct(null)}
                className="absolute top-6 left-6 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 p-10 flex flex-col">
              <div className="space-y-4 flex-1">
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-black uppercase tracking-widest rounded-full border border-emerald-500/20">
                  {viewingProduct.category || 'Producto'}
                </span>
                <div className="flex justify-between items-start">
                  <h2 className="text-4xl font-black text-white leading-none uppercase tracking-tighter">
                    {viewingProduct.title}
                  </h2>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2">
                    SKU: {viewingProduct.sku || 'N/A'}
                  </p>
                </div>
                <p className="text-3xl font-black text-emerald-500 tracking-tighter">
                  {formatPrice(parsePrice(viewingProduct.price))}
                </p>
                <div className="h-px bg-slate-800 my-6" />
                <p className="text-slate-400 leading-relaxed">
                  {(viewingProduct as any).description || 'Esta prenda está diseñada con los más altos estándares de calidad para ofrecerte comodidad y estilo en cada uso.'}
                </p>
                <div className="flex flex-col gap-4 pt-4">
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Disponibilidad Total</p>
                    <p className="text-xl font-black text-white">
                      {viewingProduct.variants && viewingProduct.variants.length > 0 
                        ? viewingProduct.variants.reduce((acc, v) => acc + v.stock, 0)
                        : viewingProduct.stock} Unidades
                    </p>
                  </div>

                  {viewingProduct.variants && viewingProduct.variants.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] text-slate-500 font-bold uppercase px-1">Desglose de Variantes</p>
                      <div className="grid grid-cols-2 gap-2">
                        {viewingProduct.variants.map((variant, idx) => (
                          <div key={idx} className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 flex flex-col">
                            <p className="text-xs font-black text-white uppercase truncate">
                              {variant.size} {variant.color && `· ${variant.color}`}
                            </p>
                            <p className={`text-[9px] font-bold uppercase mt-0.5 ${variant.stock > 0 ? 'text-emerald-500/80' : 'text-red-500/80'}`}>
                              {variant.stock > 0 ? `${variant.stock} Disponibles` : 'Agotado'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-10 flex gap-4">
                <button 
                  onClick={() => {
                    addToCart(viewingProduct);
                    setViewingProduct(null);
                  }}
                  disabled={viewingProduct.stock <= 0}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white py-5 rounded-3xl font-black text-lg shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                  <Plus size={24} />
                  AÑADIR A LA CUENTA
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Variation Selection Modal */}
      {variationModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setVariationModal(null)} />
          <div className="relative bg-slate-900 border border-slate-800 w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-white uppercase tracking-tighter">Opciones de Prenda</h3>
              <button onClick={() => setVariationModal(null)} className="p-2 text-slate-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                {variationModal.variants && variationModal.variants.map((variant, idx) => (
                  <button
                    key={idx}
                    disabled={variant.stock <= 0}
                    onClick={() => {
                      addToCart(variationModal, variant.size, variant.color);
                      setVariationModal(null);
                    }}
                    className={`flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group
                      ${variant.stock > 0 
                        ? 'bg-slate-800 border-slate-700 hover:border-emerald-500/50 hover:bg-slate-800/80 active:scale-95' 
                        : 'bg-slate-900 border-slate-800 opacity-40 cursor-not-allowed grayscale'}
                    `}
                  >
                    <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shrink-0">
                      {variant.image_url ? (
                        <img src={variant.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-700">
                          <Package size={20} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-black uppercase text-sm tracking-tight truncate">
                        {variant.size} {variant.color && `· ${variant.color}`}
                      </p>
                      <div className="flex justify-between items-center">
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${variant.stock > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {variant.stock > 0 ? `${variant.stock} Disponibles` : 'Agotado'}
                        </p>
                        {variant.sku && (
                          <p className="text-[9px] font-bold text-slate-500 uppercase pr-2">SKU: {variant.sku}</p>
                        )}
                      </div>
                    </div>
                    {variant.stock > 0 && (
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Plus size={16} />
                      </div>
                    )}
                  </button>
                ))}
                
                {(!variationModal.variants || variationModal.variants.filter(v => v.stock > 0).length === 0) && (
                  <div className="text-center py-8">
                    <XCircle size={40} className="mx-auto text-slate-700 mb-3" />
                    <p className="text-slate-500 font-bold">No hay stock disponible para ninguna variante.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Customer Data Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowCustomerModal(false)} />
          <div className="relative bg-slate-900 border border-slate-800 w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-white uppercase">Datos del Cliente</h3>
                <button onClick={() => setShowCustomerModal(false)} className="text-slate-500 hover:text-white"><X size={20} /></button>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Nombre Completo</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input 
                      type="text"
                      placeholder="Ej. Juan Pérez"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus:ring-1 focus:ring-emerald-500 outline-none"
                      value={customerData.name}
                      onChange={(e) => setCustomerData({...customerData, name: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">WhatsApp / Teléfono</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input 
                      type="tel"
                      placeholder="3001234567"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus:ring-1 focus:ring-emerald-500 outline-none"
                      value={customerData.phone}
                      onChange={(e) => setCustomerData({...customerData, phone: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Correo Electrónico</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input 
                      type="email"
                      placeholder="cliente@ejemplo.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus:ring-1 focus:ring-emerald-500 outline-none"
                      value={customerData.email}
                      onChange={(e) => setCustomerData({...customerData, email: e.target.value})}
                    />
                  </div>
                </div>

                <div className="pt-4 flex flex-col gap-3">
                  <button 
                    onClick={() => {
                      setShowCustomerModal(false);
                      handleCheckout();
                    }}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest transition-all"
                  >
                    Confirmar y Cobrar
                  </button>
                  <button 
                    onClick={() => {
                      setShowCustomerModal(false);
                      handleCheckout();
                    }}
                    className="w-full py-2 text-slate-500 hover:text-slate-400 text-xs font-bold uppercase"
                  >
                    Omitir datos (Venta rápida)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

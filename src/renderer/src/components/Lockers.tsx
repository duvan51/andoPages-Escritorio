import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  FolderOpen, 
  Plus, 
  Search, 
  Phone, 
  DollarSign, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Package, 
  X, 
  Loader2
} from 'lucide-react';

const formatPrice = (amount: number | string) => {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.-]+/g, '')) : amount;
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(numericAmount || 0);
};

interface Variant {
  size: string;
  color: string;
  stock: number;
  sku?: string;
  image_url?: string;
}

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
  stock?: number;
  variants?: Variant[];
}

interface LockerItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
  product_type?: 'product' | 'service';
  selectedSize?: string;
  selectedColor?: string;
  added_at: string;
  sku?: string;
  cost_price?: number;
}

interface Deposit {
  date: string;
  amount: number;
  method: string;
  seller_name: string;
}

interface Locker {
  id: string;
  company_id: string;
  client_name: string;
  client_phone: string;
  client_email: string;
  status: 'active' | 'expired' | 'delivered' | 'cancelled';
  initial_deposit: number;
  total_amount: number;
  pending_balance: number;
  expiration_date: string;
  notes: string;
  items: LockerItem[];
  deposits: Deposit[];
  created_at: string;
  created_by: string;
}

interface LockersProps {
  companyId: string;
  session?: any;
}

export function Lockers({ companyId, session }: LockersProps) {
  const [lockers, setLockers] = useState<Locker[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Modals
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [selectedLocker, setSelectedLocker] = useState<Locker | null>(null);
  const [addProductModalVisible, setAddProductModalVisible] = useState(false);
  const [addDepositModalVisible, setAddDepositModalVisible] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);

  // Form: Create Locker
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [lockerNotes, setLockerNotes] = useState('');
  const [expirationDays, setExpirationDays] = useState('30');
  const [initialDeposit, setInitialDeposit] = useState('');
  const [depositMethod, setDepositMethod] = useState('Efectivo');
  const [saving, setSaving] = useState(false);

  // Form: Add Deposit
  const [depositAmount, setDepositAmount] = useState('');
  const [postDepositMethod, setPostDepositMethod] = useState('Efectivo');

  // Form: Add Product
  const [productList, setProductList] = useState<Product[]>([]);
  const [searchProductTerm, setSearchProductTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productQty, setProductQty] = useState('1');
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');

  // Form: Custom Product
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customQty, setCustomQty] = useState('1');
  const [customSku, setCustomSku] = useState('');
  const [customCost, setCustomCost] = useState('');

  useEffect(() => {
    if (companyId) {
      fetchLockers();
    }
  }, [companyId]);

  const fetchLockers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lockers')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Auto update status to expired if active and past expiration_date
      const updatedLockers = (data || []).map((locker: Locker) => {
        if (locker.status === 'active' && new Date(locker.expiration_date).getTime() < Date.now()) {
          updateLockerStatusLazy(locker.id, 'expired');
          return { ...locker, status: 'expired' as const };
        }
        return locker;
      });

      setLockers(updatedLockers);
    } catch (err: any) {
      console.error('Error fetching lockers:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateLockerStatusLazy = async (id: string, status: string) => {
    try {
      await supabase.from('lockers').update({ status }).eq('id', id);
    } catch (e) {
      console.error('Error auto-updating locker status:', e);
    }
  };

  const loadProductsForLocker = async () => {
    try {
      const { data, error } = await supabase
        .from('treatments')
        .select('*')
        .eq('company_id', companyId)
        .eq('active', true)
        .order('title', { ascending: true });
      if (error) throw error;
      setProductList(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const resetCreateForm = () => {
    setClientName('');
    setClientPhone('');
    setClientEmail('');
    setLockerNotes('');
    setExpirationDays('30');
    setInitialDeposit('');
    setDepositMethod('Efectivo');
  };

  const handleCreateLocker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      alert('El nombre del cliente es obligatorio');
      return;
    }

    setSaving(true);
    try {
      const sellerName = session?.user?.email?.split('@')[0] || 'Vendedor';
      const now = new Date();
      const expDate = new Date();
      expDate.setDate(now.getDate() + parseInt(expirationDays));

      const depositVal = parseFloat(initialDeposit) || 0;
      const initialDepositsList: Deposit[] = [];

      if (depositVal > 0) {
        initialDepositsList.push({
          date: now.toISOString(),
          amount: depositVal,
          method: depositMethod,
          seller_name: sellerName
        });
      }

      const { data: newLocker, error: lockerErr } = await supabase
        .from('lockers')
        .insert({
          company_id: companyId,
          client_name: clientName.trim(),
          client_phone: clientPhone.trim(),
          client_email: clientEmail.trim(),
          status: 'active',
          initial_deposit: depositVal,
          total_amount: 0,
          pending_balance: -depositVal,
          expiration_date: expDate.toISOString(),
          notes: lockerNotes.trim(),
          items: [],
          deposits: initialDepositsList,
          created_by: sellerName
        })
        .select()
        .single();

      if (lockerErr) throw lockerErr;

      if (depositVal > 0 && newLocker) {
        await supabase
          .from('sales')
          .insert({
            company_id: companyId,
            items: [{
              id: `locker_deposit_${newLocker.id}`,
              title: `Abono Inicial Casillero: ${clientName.trim()}`,
              price: depositVal,
              quantity: 1,
              product_type: 'service'
            }],
            total: depositVal,
            payment_method: depositMethod,
            seller_name: sellerName
          });
      }

      setCreateModalVisible(false);
      resetCreateForm();
      fetchLockers();
    } catch (error: any) {
      console.error(error);
      alert('Error al crear el casillero: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocker) return;
    const amountVal = parseFloat(depositAmount) || 0;
    if (amountVal <= 0) {
      alert('El abono debe ser mayor a cero.');
      return;
    }

    setSaving(true);
    try {
      const sellerName = session?.user?.email?.split('@')[0] || 'Vendedor';
      const now = new Date();

      const newDeposit: Deposit = {
        date: now.toISOString(),
        amount: amountVal,
        method: postDepositMethod,
        seller_name: sellerName
      };

      const updatedDeposits = [...(selectedLocker.deposits || []), newDeposit];
      const newTotalPaid = updatedDeposits.reduce((sum, d) => sum + d.amount, 0);
      const newPendingBalance = selectedLocker.total_amount - newTotalPaid;

      const { data: updatedLocker, error: updateErr } = await supabase
        .from('lockers')
        .update({
          deposits: updatedDeposits,
          pending_balance: newPendingBalance
        })
        .eq('id', selectedLocker.id)
        .select()
        .single();

      if (updateErr) throw updateErr;

      await supabase
        .from('sales')
        .insert({
          company_id: companyId,
          items: [{
            id: `locker_deposit_${selectedLocker.id}_${Date.now()}`,
            title: `Abono Casillero: ${selectedLocker.client_name}`,
            price: amountVal,
            quantity: 1,
            product_type: 'service'
          }],
          total: amountVal,
          payment_method: postDepositMethod,
          seller_name: sellerName
        });

      setAddDepositModalVisible(false);
      setDepositAmount('');
      if (updatedLocker) setSelectedLocker(updatedLocker);
      fetchLockers();
    } catch (e: any) {
      console.error(e);
      alert('Error al guardar el abono: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddProductToLocker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocker || !selectedProduct) return;
    const qty = parseInt(productQty) || 0;
    if (qty <= 0) {
      alert('La cantidad debe ser mínimo 1.');
      return;
    }

    setSaving(true);
    try {
      const productPrice = typeof selectedProduct.price === 'string' 
        ? parseFloat(selectedProduct.price.replace(/[^0-9.]/g, '')) || 0
        : selectedProduct.price;

      const { data: currentProduct, error: fetchProdErr } = await supabase
        .from('treatments')
        .select('stock, variants')
        .eq('id', selectedProduct.id)
        .single();

      if (fetchProdErr) throw fetchProdErr;

      if (selectedProduct.product_type === 'product') {
        if (currentProduct.variants && currentProduct.variants.length > 0) {
          if (!selectedSize && !selectedColor) {
            alert('Por favor selecciona Talla y Color de la variante.');
            setSaving(false);
            return;
          }

          const variant = currentProduct.variants.find((v: any) => v.size === selectedSize && v.color === selectedColor);
          if (!variant || variant.stock < qty) {
            alert('No hay suficiente stock en esta variante.');
            setSaving(false);
            return;
          }

          const updatedVariants = currentProduct.variants.map((v: any) => {
            if (v.size === selectedSize && v.color === selectedColor) {
              return { ...v, stock: Math.max(0, v.stock - qty) };
            }
            return v;
          });

          await supabase
            .from('treatments')
            .update({
              variants: updatedVariants,
              stock: Math.max(0, (currentProduct.stock || 0) - qty)
            })
            .eq('id', selectedProduct.id);
        } else {
          if ((currentProduct.stock || 0) < qty) {
            alert('No hay suficiente stock en el inventario.');
            setSaving(false);
            return;
          }

          await supabase
            .from('treatments')
            .update({ stock: Math.max(0, (currentProduct.stock || 0) - qty) })
            .eq('id', selectedProduct.id);
        }
      }

      const newItem: LockerItem = {
        id: selectedProduct.id,
        title: selectedProduct.title,
        price: productPrice,
        quantity: qty,
        product_type: selectedProduct.product_type,
        selectedSize: selectedSize || undefined,
        selectedColor: selectedColor || undefined,
        added_at: new Date().toISOString(),
        sku: selectedProduct.sku
      };

      const updatedItems = [...(selectedLocker.items || []), newItem];
      const newTotalAmount = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const totalPaid = (selectedLocker.deposits || []).reduce((sum, d) => sum + d.amount, 0);
      const newPendingBalance = newTotalAmount - totalPaid;

      const { data: updatedLocker, error: updateErr } = await supabase
        .from('lockers')
        .update({
          items: updatedItems,
          total_amount: newTotalAmount,
          pending_balance: newPendingBalance
        })
        .eq('id', selectedLocker.id)
        .select()
        .single();

      if (updateErr) throw updateErr;

      setAddProductModalVisible(false);
      setSelectedProduct(null);
      if (updatedLocker) setSelectedLocker(updatedLocker);
      fetchLockers();
    } catch (e: any) {
      console.error(e);
      alert('Error al añadir producto: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddCustomProductToLocker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocker) return;
    if (!customName.trim()) {
      alert('El nombre del producto es obligatorio');
      return;
    }
    const priceVal = parseFloat(customPrice) || 0;
    const qtyVal = parseInt(customQty) || 1;
    const costVal = parseFloat(customCost) || 0;

    setSaving(true);
    try {
      const newItem: LockerItem = {
        id: `custom_${Date.now()}`,
        title: customName.trim(),
        price: priceVal,
        quantity: qtyVal,
        product_type: 'product',
        added_at: new Date().toISOString(),
        sku: customSku.trim() || undefined,
        cost_price: costVal
      };

      const updatedItems = [...(selectedLocker.items || []), newItem];
      const newTotalAmount = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const totalPaid = (selectedLocker.deposits || []).reduce((sum, d) => sum + d.amount, 0);
      const newPendingBalance = newTotalAmount - totalPaid;

      const { data: updatedLocker, error: updateErr } = await supabase
        .from('lockers')
        .update({
          items: updatedItems,
          total_amount: newTotalAmount,
          pending_balance: newPendingBalance
        })
        .eq('id', selectedLocker.id)
        .select()
        .single();

      if (updateErr) throw updateErr;

      setAddProductModalVisible(false);
      setShowCustomForm(false);
      if (updatedLocker) setSelectedLocker(updatedLocker);
      fetchLockers();
    } catch (e: any) {
      console.error(e);
      alert('Error al añadir producto personalizado: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const processFinalDelivery = async (finalPayment: number) => {
    if (!selectedLocker) return;
    setSaving(true);
    try {
      const sellerName = session?.user?.email?.split('@')[0] || 'Vendedor';
      const now = new Date();
      let updatedDeposits = [...(selectedLocker.deposits || [])];

      if (finalPayment > 0) {
        updatedDeposits.push({
          date: now.toISOString(),
          amount: finalPayment,
          method: 'Efectivo',
          seller_name: sellerName
        });

        await supabase
          .from('sales')
          .insert({
            company_id: companyId,
            items: [{
              id: `locker_final_${selectedLocker.id}`,
              title: `Liquidación Casillero: ${selectedLocker.client_name}`,
              price: finalPayment,
              quantity: 1,
              product_type: 'service'
            }],
            total: finalPayment,
            payment_method: 'Efectivo',
            seller_name: sellerName
          });
      }

      const { error: updateErr } = await supabase
        .from('lockers')
        .update({
          status: 'delivered',
          deposits: updatedDeposits,
          pending_balance: 0
        })
        .eq('id', selectedLocker.id);

      if (updateErr) throw updateErr;

      setSelectedLocker(null);
      fetchLockers();
    } catch (e: any) {
      console.error(e);
      alert('Error al entregar casillero: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const cancelLockerWithStockOption = async (restoreStock: boolean) => {
    if (!selectedLocker) return;
    setSaving(true);
    try {
      if (restoreStock && selectedLocker.items && selectedLocker.items.length > 0) {
        for (const item of selectedLocker.items) {
          if (item.product_type === 'product' && !item.id.startsWith('custom_')) {
            const { data: currentProduct } = await supabase
              .from('treatments')
              .select('stock, variants')
              .eq('id', item.id)
              .single();

            if (currentProduct) {
              if (currentProduct.variants && (item.selectedSize || item.selectedColor)) {
                const updatedVariants = currentProduct.variants.map((v: any) => {
                  if (v.size === item.selectedSize && v.color === item.selectedColor) {
                    return { ...v, stock: v.stock + item.quantity };
                  }
                  return v;
                });

                await supabase
                  .from('treatments')
                  .update({
                    variants: updatedVariants,
                    stock: (currentProduct.stock || 0) + item.quantity
                  })
                  .eq('id', item.id);
              } else {
                await supabase
                  .from('treatments')
                  .update({ stock: (currentProduct.stock || 0) + item.quantity })
                  .eq('id', item.id);
              }
            }
          }
        }
      }

      const { error: updateErr } = await supabase
        .from('lockers')
        .update({ status: 'cancelled' })
        .eq('id', selectedLocker.id);

      if (updateErr) throw updateErr;

      setCancelModalVisible(false);
      setSelectedLocker(null);
      fetchLockers();
    } catch (e: any) {
      console.error(e);
      alert('Error al cancelar casillero: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const getRemainingDaysBadge = (expDateStr: string, status: string) => {
    if (status === 'delivered') return <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">✅ ENTREGADO</span>;
    if (status === 'cancelled') return <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-bold">❌ CANCELADO</span>;

    const expDate = new Date(expDateStr);
    const diffTime = expDate.getTime() - Date.now();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2.5 py-0.5 rounded-full font-bold">⏰ VENCIDO</span>;
    } else if (diffDays === 0) {
      return <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-bold">⚠️ VENCE HOY</span>;
    } else if (diffDays === 1) {
      return <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2.5 py-0.5 rounded-full font-bold">Vence Mañana</span>;
    } else {
      return <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded-full font-semibold">Vence en {diffDays} días</span>;
    }
  };

  const filteredLockers = lockers.filter(l => {
    const matchesSearch = l.client_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (l.client_phone && l.client_phone.includes(searchTerm)) ||
                         (l.notes && l.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (filterStatus === 'all') return matchesSearch;
    return matchesSearch && l.status === filterStatus;
  });

  const filteredProductsToSelect = productList.filter(p =>
    p.title.toLowerCase().includes(searchProductTerm.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(searchProductTerm.toLowerCase()))
  );

  return (
    <div className="p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <FolderOpen className="text-emerald-400" size={32} />
            Casilleros / Apartados
          </h1>
          <p className="text-slate-400 mt-1">Gestiona apartados de prendas, abonos y entregas de tus clientes.</p>
        </div>
        
        <button 
          onClick={() => {
            resetCreateForm();
            setCreateModalVisible(true);
          }}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/20 cursor-pointer text-sm"
        >
          <Plus size={18} />
          Nuevo Casillero
        </button>
      </div>

      {/* Filters & Status Tabs */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text"
            placeholder="Buscar por cliente, teléfono o # casillero..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-12 pr-4 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filter buttons */}
        <div className="flex gap-1.5 flex-wrap">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'active', label: '🟢 Activos' },
            { id: 'expired', label: '⏰ Vencidos' },
            { id: 'delivered', label: '✅ Entregados' },
            { id: 'cancelled', label: '❌ Cancelados' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`
                px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer
                ${filterStatus === tab.id 
                  ? 'bg-emerald-500 text-white shadow-md' 
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Lockers */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-4">
          <Loader2 className="animate-spin text-emerald-500" size={40} />
          <p className="font-medium animate-pulse">Cargando casilleros...</p>
        </div>
      ) : filteredLockers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-900/30 border-2 border-dashed border-slate-800 rounded-3xl text-slate-500 gap-4">
          <FolderOpen size={48} className="opacity-20" />
          <p className="text-lg font-medium">No se encontraron casilleros</p>
          <button 
            onClick={() => {
              resetCreateForm();
              setCreateModalVisible(true);
            }}
            className="text-emerald-400 hover:text-emerald-300 font-medium underline cursor-pointer"
          >
            Crear el primer casillero ahora
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredLockers.map((locker) => {
            const totalPaid = (locker.deposits || []).reduce((sum, d) => sum + d.amount, 0);

            return (
              <div 
                key={locker.id}
                onClick={() => setSelectedLocker(locker)}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-5 hover:border-slate-700 hover:shadow-2xl transition-all duration-300 flex flex-col justify-between space-y-4 group cursor-pointer"
              >
                <div className="space-y-3">
                  {/* Top line: Status Badge & Remaining days */}
                  <div className="flex justify-between items-center gap-2">
                    {getRemainingDaysBadge(locker.expiration_date, locker.status)}
                    {locker.notes && (
                      <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 truncate max-w-[120px]">
                        {locker.notes}
                      </span>
                    )}
                  </div>

                  {/* Client Info */}
                  <div>
                    <h3 className="font-bold text-lg text-white group-hover:text-emerald-400 transition-colors truncate">
                      {locker.client_name}
                    </h3>
                    {locker.client_phone && (
                      <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5 font-mono">
                        <Phone size={12} className="text-slate-500" />
                        {locker.client_phone}
                      </p>
                    )}
                  </div>

                  {/* Reserved Items Count */}
                  <div className="text-xs bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Package size={14} className="text-emerald-400" />
                      Prendas guardadas:
                    </span>
                    <span className="font-bold text-white">
                      {(locker.items || []).reduce((acc, item) => acc + item.quantity, 0)} u.
                    </span>
                  </div>

                  {/* Financial Balance Summary */}
                  <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                    <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-800/80">
                      <p className="text-[9px] uppercase font-bold text-slate-500">Valor Total</p>
                      <p className="text-xs font-bold text-white truncate">{formatPrice(locker.total_amount)}</p>
                    </div>
                    <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-800/80">
                      <p className="text-[9px] uppercase font-bold text-slate-500">Abonado</p>
                      <p className="text-xs font-bold text-emerald-400 truncate">{formatPrice(totalPaid)}</p>
                    </div>
                    <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-800/80">
                      <p className="text-[9px] uppercase font-bold text-slate-500">Saldo Pend.</p>
                      <p className={`text-xs font-bold truncate ${locker.pending_balance > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                        {formatPrice(locker.pending_balance)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-3 border-t border-slate-800/60 flex justify-between items-center text-xs">
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(locker.created_at).toLocaleDateString()}
                  </span>
                  <span className="text-emerald-400 font-bold group-hover:underline flex items-center gap-1">
                    Ver Detalles &rarr;
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: CREAR CASILLERO */}
      {createModalVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="relative bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FolderOpen className="text-emerald-400" size={22} />
                Crear Nuevo Casillero
              </h2>
              <button onClick={() => setCreateModalVisible(false)} className="text-slate-500 hover:text-white cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateLocker} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nombre del Cliente *</label>
                <input 
                  required
                  type="text"
                  placeholder="Ej: María Gómez"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-emerald-500"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Teléfono / Celular</label>
                  <input 
                    type="text"
                    placeholder="3001234567"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                    value={clientPhone}
                    onChange={e => setClientPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Notas / # Casillero</label>
                  <input 
                    type="text"
                    placeholder="Ej: Casillero 05"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-emerald-500"
                    value={lockerNotes}
                    onChange={e => setLockerNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tiempo de Apartado / Vencimiento</label>
                <select 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-emerald-500"
                  value={expirationDays}
                  onChange={e => setExpirationDays(e.target.value)}
                >
                  <option value="7">7 Días</option>
                  <option value="15">15 Días</option>
                  <option value="30">30 Días (1 Mes)</option>
                  <option value="60">60 Días (2 Meses)</option>
                </select>
              </div>

              {/* Initial Deposit Block */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-3">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Abono Inicial (Opcional)</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Monto Abono ($)</p>
                    <input 
                      type="number"
                      placeholder="0"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-sm text-white outline-none focus:border-emerald-500 font-bold"
                      value={initialDeposit}
                      onChange={e => setInitialDeposit(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Método de Pago</p>
                    <select 
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-emerald-500"
                      value={depositMethod}
                      onChange={e => setDepositMethod(e.target.value)}
                    >
                      <option value="Efectivo">💵 Efectivo</option>
                      <option value="Transferencia">📲 Nequi / Daviplata / Transf.</option>
                      <option value="Tarjeta">💳 Tarjeta Crédito / Débito</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setCreateModalVisible(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-800 text-slate-400 font-semibold hover:bg-slate-800 transition-all text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 text-xs cursor-pointer"
                >
                  {saving ? <Loader2 className="animate-spin mx-auto" size={18} /> : 'Crear Casillero'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: DETALLES DEL CASILLERO */}
      {selectedLocker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="relative bg-slate-900 border border-slate-800 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
              <div className="flex items-center gap-3">
                <FolderOpen className="text-emerald-400" size={24} />
                <div>
                  <h2 className="text-xl font-bold text-white truncate max-w-md">
                    Casillero de {selectedLocker.client_name}
                  </h2>
                  {selectedLocker.notes && (
                    <p className="text-xs text-amber-400 font-semibold">
                      Nota: {selectedLocker.notes}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {getRemainingDaysBadge(selectedLocker.expiration_date, selectedLocker.status)}
                <button 
                  onClick={() => setSelectedLocker(null)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            {/* Content Body Grid */}
            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-6">
              
              {/* Financial Balance Summary Card */}
              <div className="grid grid-cols-3 gap-4 bg-slate-950/60 p-5 rounded-2xl border border-slate-800">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Valor Total en Prendas</p>
                  <h3 className="text-2xl font-black text-white mt-1">{formatPrice(selectedLocker.total_amount)}</h3>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Abonado</p>
                  <h3 className="text-2xl font-black text-emerald-400 mt-1">
                    {formatPrice((selectedLocker.deposits || []).reduce((sum, d) => sum + d.amount, 0))}
                  </h3>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Saldo Pendiente</p>
                  <h3 className={`text-2xl font-black mt-1 ${selectedLocker.pending_balance > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                    {formatPrice(selectedLocker.pending_balance)}
                  </h3>
                </div>
              </div>

              {/* Action Buttons Bar */}
              {selectedLocker.status === 'active' || selectedLocker.status === 'expired' ? (
                <div className="flex gap-3 flex-wrap">
                  <button 
                    onClick={() => {
                      loadProductsForLocker();
                      setAddProductModalVisible(true);
                    }}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-500/20"
                  >
                    <Plus size={16} />
                    Añadir Producto
                  </button>

                  <button 
                    onClick={() => setAddDepositModalVisible(true)}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-blue-500/20"
                  >
                    <DollarSign size={16} />
                    Registrar Abono
                  </button>

                  <button 
                    onClick={() => processFinalDelivery(selectedLocker.pending_balance > 0 ? selectedLocker.pending_balance : 0)}
                    className="bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all border border-emerald-500/30 cursor-pointer"
                  >
                    <CheckCircle2 size={16} />
                    Entregar y Liquidar
                  </button>

                  <button 
                    onClick={() => setCancelModalVisible(true)}
                    className="bg-slate-800 hover:bg-slate-700 text-red-400 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all border border-red-500/30 cursor-pointer ml-auto"
                  >
                    <XCircle size={16} />
                    Cancelar Casillero
                  </button>
                </div>
              ) : null}

              {/* Reserved Items Section */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Package size={18} className="text-emerald-400" />
                  Prendas Guardadas en este Casillero ({(selectedLocker.items || []).length})
                </h4>

                <div className="bg-slate-950/40 rounded-2xl border border-slate-800 divide-y divide-slate-800/60 overflow-hidden">
                  {(selectedLocker.items || []).length === 0 ? (
                    <p className="p-6 text-center text-slate-500 text-xs italic">
                      No hay prendas agregadas a este casillero aún. Usa "+ Añadir Producto".
                    </p>
                  ) : (
                    selectedLocker.items.map((item, i) => (
                      <div key={i} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-900/40 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center font-bold text-emerald-400">
                            {item.quantity}x
                          </div>
                          <div>
                            <h5 className="font-bold text-white text-sm">{item.title}</h5>
                            <p className="text-xs text-slate-400">
                              {item.selectedSize && `Talla: ${item.selectedSize}`} {item.selectedColor && `| Color: ${item.selectedColor}`}{' '}
                              {item.sku && `(SKU: ${item.sku})`}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="font-bold text-white text-sm">{formatPrice(item.price * item.quantity)}</p>
                          <p className="text-[10px] text-slate-500">{formatPrice(item.price)} c/u</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Deposits History */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <DollarSign size={18} className="text-emerald-400" />
                  Historial de Abonos ({(selectedLocker.deposits || []).length})
                </h4>

                <div className="bg-slate-950/40 rounded-2xl border border-slate-800 divide-y divide-slate-800/60 overflow-hidden">
                  {(selectedLocker.deposits || []).length === 0 ? (
                    <p className="p-4 text-center text-slate-500 text-xs italic">No hay abonos registrados.</p>
                  ) : (
                    selectedLocker.deposits.map((dep, i) => (
                      <div key={i} className="p-3 px-4 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-emerald-400">{formatPrice(dep.amount)}</span>
                          <span className="text-slate-400 ml-2">({dep.method})</span>
                        </div>
                        <div className="text-slate-500 font-mono">
                          {new Date(dep.date).toLocaleString()} {dep.seller_name ? `• ${dep.seller_name}` : ''}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex justify-end">
              <button 
                onClick={() => setSelectedLocker(null)}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: REGISTRAR ABONO */}
      {addDepositModalVisible && selectedLocker && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <DollarSign size={20} className="text-emerald-400" />
                Registrar Abono
              </h3>
              <button onClick={() => setAddDepositModalVisible(false)} className="text-slate-500 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddDeposit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Monto a Abonar ($)</label>
                <input 
                  required
                  type="number"
                  placeholder="Ej: 50000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-base font-bold text-white outline-none focus:ring-1 focus:ring-emerald-500"
                  value={depositAmount}
                  onChange={e => setDepositAmount(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Método de Pago</label>
                <select 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-sm text-white outline-none focus:ring-1 focus:ring-emerald-500"
                  value={postDepositMethod}
                  onChange={e => setPostDepositMethod(e.target.value)}
                >
                  <option value="Efectivo">💵 Efectivo</option>
                  <option value="Transferencia">📲 Nequi / Daviplata / Transf.</option>
                  <option value="Tarjeta">💳 Tarjeta Crédito / Débito</option>
                </select>
              </div>

              <div className="pt-2 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setAddDepositModalVisible(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-800 text-slate-400 font-semibold hover:bg-slate-800 transition-all text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 text-xs cursor-pointer disabled:opacity-50"
                >
                  {saving ? <Loader2 className="animate-spin mx-auto" size={16} /> : 'Guardar Abono'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: AÑADIR PRODUCTO AL CASILLERO */}
      {addProductModalVisible && selectedLocker && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl max-h-[85vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Package size={20} className="text-emerald-400" />
                Añadir Producto a Casillero
              </h3>
              <button onClick={() => setAddProductModalVisible(false)} className="text-slate-500 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-4">
              
              {!showCustomForm ? (
                <>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      placeholder="Buscar producto del catálogo por nombre o SKU..."
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl py-2 px-4 text-xs text-white outline-none focus:ring-1 focus:ring-emerald-500"
                      value={searchProductTerm}
                      onChange={e => setSearchProductTerm(e.target.value)}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowCustomForm(true)}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
                    >
                      + Personalizado
                    </button>
                  </div>

                  {/* Products Picker List */}
                  <div className="max-h-[220px] overflow-y-auto custom-scrollbar border border-slate-800 rounded-2xl divide-y divide-slate-800/60 bg-slate-950/50">
                    {filteredProductsToSelect.map(prod => (
                      <div 
                        key={prod.id} 
                        onClick={() => {
                          setSelectedProduct(prod);
                          setSelectedSize('');
                          setSelectedColor('');
                        }}
                        className={`
                          p-3 flex items-center justify-between gap-3 cursor-pointer transition-all
                          ${selectedProduct?.id === prod.id ? 'bg-emerald-500/10 border-l-4 border-l-emerald-500' : 'hover:bg-slate-900/60'}
                        `}
                      >
                        <div className="flex items-center gap-3">
                          {prod.imageUrl ? (
                            <img src={prod.imageUrl} alt="" className="w-9 h-9 rounded-lg object-cover bg-slate-800" />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-slate-600 text-xs">P</div>
                          )}
                          <div>
                            <h5 className="font-bold text-white text-xs">{prod.title}</h5>
                            <p className="text-[10px] text-slate-400">
                              Cat: {prod.category || 'General'} {prod.sku && `| SKU: ${prod.sku}`}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-bold text-emerald-400 text-xs">{formatPrice(prod.price)}</span>
                          <p className="text-[9px] text-slate-500">Stock: {prod.stock || 0}u</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Selected Product Variants Form */}
                  {selectedProduct && (
                    <form onSubmit={handleAddProductToLocker} className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800 animate-in fade-in duration-200">
                      <h4 className="font-bold text-white text-xs flex items-center justify-between">
                        <span>Seleccionado: {selectedProduct.title}</span>
                        <span className="text-emerald-400">{formatPrice(selectedProduct.price)}</span>
                      </h4>

                      {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Talla</label>
                            <select 
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-1.5 px-3 text-xs text-white outline-none"
                              value={selectedSize}
                              onChange={e => setSelectedSize(e.target.value)}
                            >
                              <option value="">Seleccionar Talla</option>
                              {Array.from(new Set(selectedProduct.variants.map(v => v.size))).map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Color</label>
                            <select 
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-1.5 px-3 text-xs text-white outline-none"
                              value={selectedColor}
                              onChange={e => setSelectedColor(e.target.value)}
                            >
                              <option value="">Seleccionar Color</option>
                              {Array.from(new Set(selectedProduct.variants.map(v => v.color))).map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-3 items-end pt-2">
                        <div className="w-24 space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Cantidad</label>
                          <input 
                            type="number"
                            min="1"
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-1.5 px-3 text-xs text-white font-bold text-center outline-none"
                            value={productQty}
                            onChange={e => setProductQty(e.target.value)}
                          />
                        </div>

                        <button 
                          type="submit"
                          disabled={saving}
                          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                        >
                          {saving ? <Loader2 className="animate-spin mx-auto" size={16} /> : 'Añadir al Casillero'}
                        </button>
                      </div>
                    </form>
                  )}
                </>
              ) : (
                /* Custom Product Form */
                <form onSubmit={handleAddCustomProductToLocker} className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-white text-xs">Producto Personalizado</h4>
                    <button type="button" onClick={() => setShowCustomForm(false)} className="text-slate-500 text-xs hover:underline">
                      Volver a catálogo
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Nombre *</label>
                    <input 
                      required
                      type="text"
                      placeholder="Ej: Camisa Especial"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl py-1.5 px-3 text-xs text-white outline-none"
                      value={customName}
                      onChange={e => setCustomName(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Precio ($)</label>
                      <input 
                        type="number"
                        placeholder="0"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl py-1.5 px-3 text-xs text-white outline-none"
                        value={customPrice}
                        onChange={e => setCustomPrice(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Cantidad</label>
                      <input 
                        type="number"
                        min="1"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl py-1.5 px-3 text-xs text-white text-center font-bold outline-none"
                        value={customQty}
                        onChange={e => setCustomQty(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">SKU (Opcional)</label>
                      <input 
                        type="text"
                        placeholder="SKU..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl py-1.5 px-3 text-xs text-white outline-none"
                        value={customSku}
                        onChange={e => setCustomSku(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Costo ($)</label>
                      <input 
                        type="number"
                        placeholder="0"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl py-1.5 px-3 text-xs text-white outline-none"
                        value={customCost}
                        onChange={e => setCustomCost(e.target.value)}
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={saving}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 mt-2"
                  >
                    {saving ? <Loader2 className="animate-spin mx-auto" size={16} /> : 'Añadir Personalizado'}
                  </button>
                </form>
              )}

            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: CANCELAR CASILLERO */}
      {cancelModalVisible && selectedLocker && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-bold text-white">Cancelar Casillero</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                ¿Deseas devolver los productos de este casillero al stock disponible en el inventario?
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => cancelLockerWithStockOption(true)}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                Sí, Reintegrar prendas al inventario
              </button>
              <button
                type="button"
                onClick={() => cancelLockerWithStockOption(false)}
                className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                No reintegrar stock (Solo Cancelar)
              </button>
              <button
                type="button"
                onClick={() => setCancelModalVisible(false)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer mt-1"
              >
                Volver
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

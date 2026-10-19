import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Wallet, 
  Calendar,
  Loader2,
  Filter
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AccountingProps {
  companyId: string;
}

export function Accounting({ companyId }: AccountingProps) {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30days'); // today, yesterday, 7days, 30days, thisMonth, lastMonth
  const [paymentMethod, setPaymentMethod] = useState('all');
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalCost: 0,
    netProfit: 0,
    profitMargin: 0
  });

  useEffect(() => {
    fetchSales();
  }, [companyId, dateRange, paymentMethod]);

  const fetchSales = async () => {
    setLoading(true);
    let query = supabase
      .from('sales')
      .select('*')
      .eq('company_id', companyId);

    // Apply Date Filter
    const now = new Date();
    let startDate = new Date();

    if (dateRange === 'today') {
      startDate.setHours(0, 0, 0, 0);
      query = query.gte('created_at', startDate.toISOString());
    } else if (dateRange === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const endOfYesterday = new Date();
      endOfYesterday.setHours(0, 0, 0, 0);
      query = query.gte('created_at', yesterday.toISOString()).lt('created_at', endOfYesterday.toISOString());
    } else if (dateRange === '7days') {
      startDate.setDate(startDate.getDate() - 7);
      query = query.gte('created_at', startDate.toISOString());
    } else if (dateRange === '30days') {
      startDate.setDate(startDate.getDate() - 30);
      query = query.gte('created_at', startDate.toISOString());
    } else if (dateRange === 'thisMonth') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      query = query.gte('created_at', startDate.toISOString());
    } else if (dateRange === 'lastMonth') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      query = query.gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString());
    }

    // Apply Payment Method Filter
    if (paymentMethod !== 'all') {
      query = query.eq('payment_method', paymentMethod);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (!error && data) {
      setSales(data);
      calculateStats(data);
    }
    setLoading(false);
  };

  const calculateStats = (salesData: any[]) => {
    let income = 0;
    let cost = 0;

    salesData.forEach(sale => {
      income += parseFloat(sale.total) || 0;
      
      if (Array.isArray(sale.items)) {
        sale.items.forEach((item: any) => {
          const qty = item.quantity || 1;
          const unitCost = item.cost_price || 0;
          cost += unitCost * qty;
        });
      }
    });

    const profit = income - cost;
    const margin = income > 0 ? (profit / income) * 100 : 0;

    setStats({
      totalIncome: income,
      totalCost: cost,
      netProfit: profit,
      profitMargin: margin
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value);
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
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Contabilidad</h1>
            <p className="text-slate-500 font-medium">Análisis de ingresos, costos y rentabilidad en tiempo real.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {/* Date Range Selector */}
            <div className="relative group">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
              <select 
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-slate-300 pl-10 pr-4 py-2.5 rounded-xl font-bold text-xs outline-none focus:border-emerald-500 transition-all appearance-none cursor-pointer hover:bg-slate-800"
              >
                <option value="today">Hoy</option>
                <option value="yesterday">Ayer</option>
                <option value="7days">Últimos 7 días</option>
                <option value="30days">Últimos 30 días</option>
                <option value="thisMonth">Este mes</option>
                <option value="lastMonth">Mes anterior</option>
              </select>
            </div>

            {/* Payment Method Selector */}
            <div className="relative group">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
              <select 
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-slate-300 pl-10 pr-4 py-2.5 rounded-xl font-bold text-xs outline-none focus:border-emerald-500 transition-all appearance-none cursor-pointer hover:bg-slate-800"
              >
                <option value="all">Todos los pagos</option>
                <option value="Efectivo">Efectivo</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Nequi">Nequi</option>
                <option value="Daviplata">Daviplata</option>
                <option value="Tarjeta">Tarjeta</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Total Income */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-[32px] space-y-4 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
              <TrendingUp size={80} className="text-blue-500" />
            </div>
            <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-slate-500 text-xs font-black uppercase tracking-widest">Ingresos Totales</p>
              <h3 className="text-2xl font-black text-white mt-1">{formatCurrency(stats.totalIncome)}</h3>
            </div>
            <div className="text-slate-500 text-[10px] font-bold">
              Basado en {sales.length} ventas
            </div>
          </div>

          {/* Total Cost */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-[32px] space-y-4 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
              <TrendingDown size={80} className="text-red-500" />
            </div>
            <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center">
              <Wallet size={24} />
            </div>
            <div>
              <p className="text-slate-500 text-xs font-black uppercase tracking-widest">Costo de Ventas</p>
              <h3 className="text-2xl font-black text-white mt-1">{formatCurrency(stats.totalCost)}</h3>
            </div>
            <div className="text-slate-500 text-[10px] font-bold">
              Inversión en mercancía
            </div>
          </div>

          {/* Net Profit */}
          <div className="bg-emerald-500 p-6 rounded-[32px] space-y-4 relative overflow-hidden group shadow-xl shadow-emerald-500/20">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
              <BarChart3 size={80} className="text-white" />
            </div>
            <div className="w-12 h-12 bg-white/20 text-white rounded-2xl flex items-center justify-center">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-white/70 text-xs font-black uppercase tracking-widest">Utilidad Neta</p>
              <h3 className="text-2xl font-black text-white mt-1">{formatCurrency(stats.netProfit)}</h3>
            </div>
            <div className="text-white/90 text-xs font-bold">
              Ganancia real libre
            </div>
          </div>

          {/* Margin */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-[32px] space-y-4 relative overflow-hidden group">
            <div className="w-12 h-12 bg-purple-500/10 text-purple-500 rounded-2xl flex items-center justify-center">
              <BarChart3 size={24} />
            </div>
            <div>
              <p className="text-slate-500 text-xs font-black uppercase tracking-widest">Margen de Ganancia</p>
              <h3 className="text-2xl font-black text-white mt-1">{stats.profitMargin.toFixed(1)}%</h3>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-purple-500 h-full rounded-full" 
                style={{ width: `${Math.min(stats.profitMargin, 100)}%` }}
              />
            </div>
          </div>

        </div>

        {/* Recent Transactions Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-[40px] overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
            <h2 className="text-xl font-black text-white uppercase tracking-tighter">Historial de Ventas</h2>
            <button className="text-emerald-400 font-bold text-xs uppercase hover:underline">Ver todo</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-950/50 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                  <th className="px-8 py-5">Fecha y Hora</th>
                  <th className="px-8 py-5">Items</th>
                  <th className="px-8 py-5">Metodo</th>
                  <th className="px-8 py-5">Total</th>
                  <th className="px-8 py-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-8 py-6">
                      <p className="text-white font-bold text-sm">
                        {new Date(sale.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                      <p className="text-slate-500 text-[10px] font-medium">
                        {new Date(sale.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-0.5">
                        {sale.items?.slice(0, 2).map((item: any, idx: number) => (
                          <span key={idx} className="text-slate-300 text-xs truncate max-w-[200px]">
                            {item.quantity}x {item.title}
                          </span>
                        ))}
                        {sale.items?.length > 2 && (
                          <span className="text-slate-500 text-[10px] font-bold">+{sale.items.length - 2} más...</span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="px-3 py-1 bg-slate-800 text-slate-400 rounded-full text-[10px] font-black uppercase tracking-tighter">
                        {sale.payment_method || 'Efectivo'}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-emerald-400 font-black text-lg">
                        {formatCurrency(sale.total)}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button className="p-2 bg-slate-800 text-slate-400 rounded-xl hover:text-white transition-all">
                        Ver Ticket
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

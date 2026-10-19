import { useState } from 'react';
import { X, Printer, CheckSquare, Square, RefreshCw } from 'lucide-react';
import { BarcodeGenerator } from './BarcodeGenerator';

export interface PrintableItem {
  id: string; // product.id or product.id + variant index
  productId: string;
  productTitle: string;
  variantInfo?: string;
  size?: string;
  color?: string;
  sku: string;
  price: string | number;
  stock: number;
  selected: boolean;
  printCopies: number;
  imageUrl?: string;
}

interface LabelPrinterModalProps {
  products: any[];
  onClose: () => void;
}

const formatPrice = (amount: number | string) => {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.-]+/g, '')) : amount;
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(numericAmount || 0);
};

export function LabelPrinterModal({ products, onClose }: LabelPrinterModalProps) {
  // Extract all items (products or individual variants) that have SKUs
  const [items, setItems] = useState<PrintableItem[]>(() => {
    const list: PrintableItem[] = [];

    products.forEach((product) => {
      // If product has variants, extract each variant with SKU
      if (product.product_type === 'product' && product.variants && product.variants.length > 0) {
        product.variants.forEach((v: any, index: number) => {
          const sku = v.sku || product.sku || '';
          if (sku) {
            const variantText = [v.size ? `Talla: ${v.size}` : '', v.color ? `Color: ${v.color}` : '']
              .filter(Boolean)
              .join(' | ');
            
            list.push({
              id: `${product.id}-var-${index}`,
              productId: product.id,
              productTitle: product.title,
              variantInfo: variantText,
              size: v.size,
              color: v.color,
              sku: sku,
              price: product.price,
              stock: v.stock || 0,
              selected: true,
              printCopies: Math.max(1, v.stock || 1),
              imageUrl: v.image_url || product.imageUrl
            });
          }
        });
      } else {
        // Simple product
        const sku = product.sku || '';
        if (sku) {
          list.push({
            id: product.id,
            productId: product.id,
            productTitle: product.title,
            sku: sku,
            price: product.price,
            stock: product.stock || 0,
            selected: true,
            printCopies: Math.max(1, product.stock || 1),
            imageUrl: product.imageUrl
          });
        }
      }
    });

    return list;
  });

  const [searchTerm, setSearchTerm] = useState('');

  const toggleSelectAll = (select: boolean) => {
    setItems((prev) => prev.map((item) => ({ ...item, selected: select })));
  };

  const toggleItemSelect = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  const updateCopies = (id: string, copies: number) => {
    const count = Math.max(1, copies);
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, printCopies: count } : item))
    );
  };

  const resetCopiesToStock = () => {
    setItems((prev) =>
      prev.map((item) => ({ ...item, printCopies: Math.max(1, item.stock) }))
    );
  };

  const filteredItems = items.filter(
    (item) =>
      item.productTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.variantInfo && item.variantInfo.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Flatten selected items multiplied by printCopies for exact print grid layout
  const selectedPrintLabels: PrintableItem[] = [];
  items.forEach((item) => {
    if (item.selected && item.sku) {
      for (let i = 0; i < item.printCopies; i++) {
        selectedPrintLabels.push(item);
      }
    }
  });

  const handlePrint = () => {
    if (selectedPrintLabels.length === 0) {
      alert('Por favor selecciona al menos una etiqueta para imprimir.');
      return;
    }
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      {/* Modal Container */}
      <div className="relative bg-slate-900 border border-slate-800 w-full max-w-6xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="no-print p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <Printer className="text-emerald-400" size={24} />
              Impresión de Etiquetas con Código de Barras (SKU)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Formato: Papel 10 cm de ancho | 3 columnas de 3cm x 2cm | Espacio: 5 mm
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              disabled={selectedPrintLabels.length === 0}
              className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
            >
              <Printer size={18} />
              Imprimir ({selectedPrintLabels.length} etiquetas)
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-white rounded-xl hover:bg-slate-800 transition-all"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Panel: Item Selection & Quantity Controls */}
          <div className="no-print w-1/2 border-r border-slate-800 p-6 flex flex-col gap-4 overflow-hidden bg-slate-950/40">
            <div className="flex justify-between items-center gap-2">
              <input
                type="text"
                placeholder="Buscar por prenda, SKU o variante..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl py-2 px-4 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button
                onClick={resetCopiesToStock}
                title="Sincronizar cantidades con el stock en sistema"
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3 py-2 rounded-xl flex items-center gap-1 font-semibold transition-all"
              >
                <RefreshCw size={14} />
                Stock del sistema
              </button>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleSelectAll(true)}
                  className="flex items-center gap-1 text-emerald-400 hover:underline font-semibold"
                >
                  <CheckSquare size={16} /> Seleccionar todo
                </button>
                <button
                  onClick={() => toggleSelectAll(false)}
                  className="flex items-center gap-1 text-slate-400 hover:underline font-semibold"
                >
                  <Square size={16} /> Deseleccionar todo
                </button>
              </div>
              <span className="font-mono text-slate-300">
                {items.filter((i) => i.selected).length} de {items.length} ítems activos
              </span>
            </div>

            {/* List of items */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {filteredItems.length === 0 ? (
                <p className="text-center py-10 text-slate-500 text-sm italic">
                  No se encontraron productos o variantes con SKU definido.
                </p>
              ) : (
                filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className={`
                      p-3 rounded-2xl border transition-all flex items-center justify-between gap-3
                      ${
                        item.selected
                          ? 'bg-slate-900 border-slate-700 shadow-md'
                          : 'bg-slate-950/40 border-slate-800/60 opacity-60'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => toggleItemSelect(item.id)}
                        className="w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                      />

                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt=""
                          className="w-10 h-10 object-cover rounded-lg bg-slate-800 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500 flex-shrink-0">
                          SKU
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-white truncate">
                          {item.productTitle}
                        </h4>
                        {item.variantInfo && (
                          <p className="text-[10px] text-emerald-400 font-medium">
                            {item.variantInfo}
                          </p>
                        )}
                        <p className="text-[10px] text-slate-400 font-mono">
                          SKU: <span className="text-white font-bold">{item.sku}</span> | Stock:{' '}
                          <span className="text-amber-400 font-bold">{item.stock} u.</span>
                        </p>
                      </div>
                    </div>

                    {/* Copy counter input */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-[10px] uppercase font-bold text-slate-500">Copia:</span>
                      <input
                        type="number"
                        min="1"
                        max="999"
                        value={item.printCopies}
                        onChange={(e) => updateCopies(item.id, parseInt(e.target.value) || 1)}
                        className="w-14 bg-slate-950 border border-slate-800 rounded-lg py-1 px-2 text-center text-xs font-bold text-white outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Panel: Label Roll Visual Preview */}
          <div className="flex-1 p-6 flex flex-col overflow-hidden bg-slate-950/80">
            <div className="no-print flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                Vista Previa del Rollo de Etiquetas (Hoja de 10 cm)
              </h3>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                Total a Imprimir: {selectedPrintLabels.length} etiqueta(s)
              </span>
            </div>

            {/* Print Grid Container */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-900 border border-slate-800 rounded-2xl custom-scrollbar flex justify-center">
              
              {/* Paper Roll Mockup / Printable Container */}
              <div className="print-area w-[100mm] bg-white text-black min-h-[200px] p-2 shadow-2xl rounded-sm">
                
                {/* 3 Columns Grid: 30mm width each + 5mm gap */}
                <div 
                  className="label-grid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 30mm)',
                    columnGap: '5mm',
                    rowGap: '4mm',
                    justifyContent: 'start',
                    alignContent: 'start'
                  }}
                >
                  {selectedPrintLabels.map((labelItem, idx) => (
                    <div
                      key={idx}
                      className="label-item border border-dashed border-slate-300 bg-white flex flex-col justify-between items-center p-1 text-center select-none"
                      style={{
                        width: '30mm',
                        height: '20mm',
                        boxSizing: 'border-box',
                        overflow: 'hidden',
                        pageBreakInside: 'avoid',
                        breakInside: 'avoid'
                      }}
                    >
                      {/* Top Header: Title */}
                      <div className="w-full flex justify-between items-center text-[7px] font-bold tracking-tight text-slate-900 leading-tight">
                        <span className="truncate max-w-[20mm]">{labelItem.productTitle}</span>
                        {labelItem.price ? (
                          <span className="text-[6.5px] font-black">{formatPrice(labelItem.price)}</span>
                        ) : null}
                      </div>

                      {/* Variant line if present */}
                      {labelItem.variantInfo && (
                        <div className="text-[6.5px] font-semibold text-slate-700 leading-none truncate w-full -mt-0.5">
                          {labelItem.variantInfo}
                        </div>
                      )}

                      {/* Barcode SVG */}
                      <div className="w-full flex items-center justify-center my-0.5">
                        <BarcodeGenerator
                          value={labelItem.sku}
                          height={16}
                          width={0.9}
                          displayValue={false}
                        />
                      </div>

                      {/* Bottom Text: SKU */}
                      <div className="text-[7.5px] font-mono font-black tracking-wider text-slate-900 leading-none">
                        {labelItem.sku}
                      </div>
                    </div>
                  ))}
                </div>

                {selectedPrintLabels.length === 0 && (
                  <div className="h-40 flex items-center justify-center text-slate-400 text-xs italic">
                    Selecciona al menos una etiqueta en la lista izquierda.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded CSS for Print Mode */}
      <style>{`
        @media print {
          @page {
            size: 100mm auto;
            margin: 0mm;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-area {
            width: 100mm !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            background: #ffffff !important;
          }
          .label-grid {
            display: grid !important;
            grid-template-columns: repeat(3, 30mm) !important;
            column-gap: 5mm !important;
            row-gap: 4mm !important;
            width: 100mm !important;
            margin: 0 !important;
            padding: 2mm 0 !important;
          }
          .label-item {
            width: 30mm !important;
            height: 20mm !important;
            border: none !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}

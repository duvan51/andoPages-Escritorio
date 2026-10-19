import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Loader2,
  Package,
  CheckCircle2,
  XCircle,
  X,
  Tag,
  Upload,
  Image as ImageIcon,
  Printer,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Star,
  Eye
} from 'lucide-react';
import { uploadImage } from '../utils/cloudinary';
import { LabelPrinterModal } from './LabelPrinterModal';
import { BarcodeGenerator } from './BarcodeGenerator';

const formatPrice = (amount: number | string) => {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.-]+/g, "")) : amount;
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
  images?: string[];
  active: boolean;
  company_id: string;
  product_type?: 'product' | 'service';
  sku?: string;
  cost_price?: number;
  pauta_price?: number;
  is_pauta?: boolean;
  stock?: number;
  variants?: Variant[];
}

const INITIAL_PRODUCT: Partial<Product> = {
  title: '',
  description: '',
  category: '',
  price: '',
  imageUrl: '',
  images: [],
  active: true,
  product_type: 'product',
  sku: '',
  cost_price: 0,
  pauta_price: 0,
  is_pauta: false,
  stock: 0,
  variants: []
};

export function Products({ companyId }: { companyId: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [confirmDeleteProduct, setConfirmDeleteProduct] = useState<Product | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [showLabelPrinter, setShowLabelPrinter] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeImageIndexes, setActiveImageIndexes] = useState<{ [productId: string]: number }>({});
  
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (companyId) {
      fetchProducts();
      fetchCategories();
    }
  }, [companyId]);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name')
      .eq('company_id', companyId)
      .order('name');
    
    if (!error && data) {
      setCategories(data);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('treatments')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setProducts(data);
    }
    setLoading(false);
  };

  // Helper to detect SKU duplication across all products and variants
  const findDuplicateSku = (skuToTest: string, currentProductId?: string) => {
    if (!skuToTest || !skuToTest.trim()) return null;
    const clean = skuToTest.trim().toLowerCase();

    for (const p of products) {
      if (p.id === currentProductId) continue;
      
      if (p.sku && p.sku.trim().toLowerCase() === clean) {
        return { product: p, type: 'Producto Principal' };
      }

      if (p.variants) {
        for (const v of p.variants) {
          if (v.sku && v.sku.trim().toLowerCase() === clean) {
            const detail = [v.size ? `Talla ${v.size}` : '', v.color ? `Color ${v.color}` : ''].filter(Boolean).join(' / ');
            return { product: p, type: `Variante (${detail || 'Sin detalle'})` };
          }
        }
      }
    }
    return null;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.title) return;
    
    setSaving(true);
    const isNew = !editingProduct.id;
    
    // Calcular stock total si hay variantes
    let totalStock = editingProduct.stock || 0;
    if (editingProduct.variants && editingProduct.variants.length > 0) {
      totalStock = editingProduct.variants.reduce((acc, v) => acc + (v.stock || 0), 0);
    }
    
    const mainImg = editingProduct.imageUrl || (editingProduct.images && editingProduct.images[0]) || '';
    
    const productData = {
      ...editingProduct,
      imageUrl: mainImg,
      images: editingProduct.images || (mainImg ? [mainImg] : []),
      stock: totalStock,
      company_id: companyId,
      id: isNew ? Math.random().toString(36).substr(2, 9) : editingProduct.id
    };

    const { error } = await supabase
      .from('treatments')
      .upsert(productData);

    if (!error) {
      fetchProducts();
      setEditingProduct(null);
    } else {
      alert('Error al guardar el producto: ' + error.message);
    }
    setSaving(false);
  };

  const addImageUrlToGallery = () => {
    if (!newImageUrl.trim()) return;
    setEditingProduct(prev => {
      if (!prev) return null;
      const currentImages = prev.images || [];
      const updatedImages = [...currentImages, newImageUrl.trim()];
      const mainImage = prev.imageUrl || updatedImages[0] || '';
      return { ...prev, images: updatedImages, imageUrl: mainImage };
    });
    setNewImageUrl('');
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploading(true);
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const url = await uploadImage(files[i]);
        uploadedUrls.push(url);
      }
      setEditingProduct(prev => {
        if (!prev) return null;
        const currentImages = prev.images && prev.images.length > 0
          ? prev.images
          : (prev.imageUrl ? [prev.imageUrl] : []);
        const updatedImages = [...currentImages, ...uploadedUrls];
        const mainImage = prev.imageUrl || updatedImages[0] || '';
        return { ...prev, images: updatedImages, imageUrl: mainImage };
      });
    } catch (error) {
      console.error('Gallery upload failed:', error);
      alert('Error al subir imágenes a la galería');
    } finally {
      setUploading(false);
    }
  };

  const setPrimaryImage = (url: string) => {
    setEditingProduct(prev => prev ? { ...prev, imageUrl: url } : null);
  };

  const removeGalleryImage = (urlToRemove: string) => {
    setEditingProduct(prev => {
      if (!prev) return null;
      const currentImages = prev.images && prev.images.length > 0 
        ? prev.images 
        : (prev.imageUrl ? [prev.imageUrl] : []);
      const filtered = currentImages.filter(img => img !== urlToRemove);
      const newMain = prev.imageUrl === urlToRemove ? (filtered[0] || '') : prev.imageUrl;
      return { ...prev, images: filtered, imageUrl: newMain };
    });
  };

  const handleVariantImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const url = await uploadImage(file);
      const newVariants = [...(editingProduct?.variants || [])];
      newVariants[index].image_url = url;
      setEditingProduct(prev => prev ? { ...prev, variants: newVariants } : null);
    } catch (error) {
      console.error('Variant upload failed:', error);
      alert('Error al subir la imagen de la variante');
    } finally {
      setUploading(false);
    }
  };

  const toggleStatus = async (product: Product) => {
    const { error } = await supabase
      .from('treatments')
      .update({ active: !product.active })
      .eq('id', product.id);

    if (!error) {
      setProducts(products.map(p => p.id === product.id ? { ...p, active: !p.active } : p));
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;

    const { error } = await supabase
      .from('categories')
      .insert({ name: newCategoryName, company_id: companyId });

    if (!error) {
      fetchCategories();
      setNewCategoryName('');
      setIsAddingCategory(false);
    } else {
      alert('Error al crear la categoría');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta categoría?')) return;
    
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (!error) {
      fetchCategories();
    } else {
      alert('No se pudo eliminar la categoría (podría estar en uso)');
    }
  };

  const deleteProduct = async (id: string) => {
    const { error } = await supabase
      .from('treatments')
      .delete()
      .eq('id', id);

    if (!error) {
      setProducts(products.filter(p => p.id !== id));
      if (editingProduct?.id === id) setEditingProduct(null);
      if (viewingProduct?.id === id) setViewingProduct(null);
    } else {
      alert('Error al eliminar producto: ' + error.message);
    }
  };

  const filteredProducts = products.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Check duplicate SKU for editingProduct main SKU
  const mainSkuDuplicate = editingProduct?.sku ? findDuplicateSku(editingProduct.sku, editingProduct.id) : null;

  return (
    <div className="p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Mis Productos</h1>
          <p className="text-slate-400 mt-1">Gestiona tus prendas, servicios y catálogo con etiquetas de código de barras.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button 
            onClick={() => setShowLabelPrinter(true)}
            className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all border border-slate-700 hover:border-emerald-500/50 cursor-pointer"
          >
            <Printer size={18} className="text-emerald-400" />
            Etiquetas SKU
          </button>
          <button 
            onClick={() => setIsAddingCategory(true)}
            className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all cursor-pointer"
          >
            <Tag size={18} />
            Categoría
          </button>
          <button 
            onClick={() => setEditingProduct(INITIAL_PRODUCT)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            <Plus size={18} />
            Nuevo Producto
          </button>
        </div>
      </div>

      {/* Label Printer Modal */}
      {showLabelPrinter && (
        <LabelPrinterModal 
          products={products} 
          onClose={() => setShowLabelPrinter(false)} 
        />
      )}

      {/* Category Modal */}
      {isAddingCategory && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">Gestionar Categorías</h3>
              <button onClick={() => setIsAddingCategory(false)} className="text-slate-500 hover:text-white cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <input 
                  autoFocus
                  type="text"
                  placeholder="Nueva categoría..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl py-2 px-4 text-slate-200 outline-none focus:ring-1 focus:ring-emerald-500"
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                />
                <button 
                  onClick={handleAddCategory}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 rounded-xl font-bold text-sm cursor-pointer"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-2 pr-2">
              {categories.length === 0 ? (
                <p className="text-center text-slate-500 py-4 text-sm italic">No hay categorías creadas.</p>
              ) : (
                categories.map(cat => (
                  <div key={cat.id} className="flex justify-between items-center p-3 bg-slate-950/50 border border-slate-800 rounded-xl group hover:border-slate-700 transition-all">
                    <span className="text-slate-300 font-medium">{cat.name}</span>
                    <button 
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="text-slate-600 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <button 
              onClick={() => setIsAddingCategory(false)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold text-sm uppercase tracking-widest cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 items-center bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text"
            placeholder="Buscar por nombre, categoría o SKU..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-12 pr-4 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
           <span className="text-xs text-slate-500 font-medium px-3 py-1 bg-slate-800 rounded-full border border-slate-700">
             {filteredProducts.length} productos
           </span>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-4">
          <Loader2 className="animate-spin text-emerald-500" size={40} />
          <p className="font-medium animate-pulse">Cargando catálogo...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-900/30 border-2 border-dashed border-slate-800 rounded-3xl text-slate-500 gap-4">
          <Package size={48} className="opacity-20" />
          <p className="text-lg font-medium">No se encontraron productos</p>
          <button 
            onClick={() => setEditingProduct({ active: true, category: 'General' })}
            className="text-emerald-400 hover:text-emerald-300 font-medium underline cursor-pointer"
          >
            Crea tu primer producto ahora
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => {
            const productImages = product.images && product.images.length > 0 
              ? product.images 
              : product.imageUrl ? [product.imageUrl] : [];
            const activeIdx = activeImageIndexes[product.id] || 0;
            const currentDisplayImage = productImages[activeIdx] || product.imageUrl;

            return (
              <div 
                key={product.id}
                className={`
                  group relative bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden transition-all duration-300 hover:border-slate-700 hover:shadow-2xl hover:shadow-black/50
                  ${!product.active ? 'opacity-75 grayscale-[0.5]' : ''}
                `}
              >
                {/* Image Gallery Carousel */}
                <div className="aspect-[4/3] relative overflow-hidden bg-slate-800 group/img">
                  {currentDisplayImage ? (
                    <img 
                      src={currentDisplayImage} 
                      alt={product.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600">
                      <Package size={40} />
                    </div>
                  )}

                  {/* Multi-image navigation controls */}
                  {productImages.length > 1 && (
                    <>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveImageIndexes(prev => ({
                            ...prev,
                            [product.id]: (activeIdx - 1 + productImages.length) % productImages.length
                          }));
                        }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 text-white p-1 rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity cursor-pointer"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveImageIndexes(prev => ({
                            ...prev,
                            [product.id]: (activeIdx + 1) % productImages.length
                          }));
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 text-white p-1 rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity cursor-pointer"
                      >
                        <ChevronRight size={16} />
                      </button>
                      {/* Indicator dots */}
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                        {productImages.map((_, i) => (
                          <div 
                            key={i} 
                            className={`w-1.5 h-1.5 rounded-full transition-all ${i === activeIdx ? 'bg-emerald-400 w-3' : 'bg-white/50'}`}
                          />
                        ))}
                      </div>
                    </>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60 pointer-events-none" />
                  
                  {/* Status Badge */}
                  <div className="absolute top-4 right-4">
                    <button 
                      type="button"
                      onClick={() => toggleStatus(product)}
                      className={`
                        p-2 rounded-full backdrop-blur-md transition-all cursor-pointer
                        ${product.active ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}
                      `}
                    >
                      {product.active ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                      {product.title}
                    </h3>
                    <div className="flex flex-col items-end">
                      <span className="text-emerald-500 font-bold whitespace-nowrap">{product.price ? formatPrice(product.price) : 'Gratis'}</span>
                      {product.pauta_price ? (
                        <span className="text-blue-400 text-[10px] font-semibold whitespace-nowrap">Pauta: {formatPrice(product.pauta_price)}</span>
                      ) : null}
                    </div>
                  </div>
                  
                  <p className="text-slate-400 text-xs line-clamp-2 min-h-[32px]">
                    {product.description || 'Sin descripción'}
                  </p>

                  {/* Variants Summary Badge */}
                  {product.variants && product.variants.length > 0 && (
                    <div className="text-[11px] bg-slate-950/60 p-2 rounded-xl border border-slate-800 text-slate-300 space-y-1">
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <span>Variantes ({product.variants.length})</span>
                        <span className="text-amber-400">Stock: {product.stock || 0}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {product.variants.slice(0, 4).map((v, i) => (
                          <span key={i} className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                            {v.size && `Talla ${v.size}`} {v.color && `/ ${v.color}`} ({v.stock}u)
                          </span>
                        ))}
                        {product.variants.length > 4 && (
                          <span className="text-[9px] text-slate-500 italic">+{product.variants.length - 4} más</span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/50">
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 bg-slate-800 px-2 py-1 rounded">
                        {product.category || 'General'}
                      </span>
                      {product.sku && (
                        <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-500/70 bg-emerald-500/5 px-2 py-1 rounded border border-emerald-500/10">
                          SKU: {product.sku}
                        </span>
                      )}
                      {product.is_pauta && (
                        <span className="text-[10px] uppercase tracking-wider font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">
                          📢 Pauta
                        </span>
                      )}
                    </div>
                    
                    {/* Action buttons: VER and EDITAR */}
                    <div className="flex gap-1">
                      <button 
                        type="button"
                        onClick={() => setViewingProduct(product)}
                        className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all cursor-pointer"
                        title="Ver producto"
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          const existingImages = (product.images && product.images.length > 0)
                            ? product.images 
                            : (product.imageUrl ? [product.imageUrl] : []);
                          setEditingProduct({ 
                            ...product, 
                            variants: product.variants || [],
                            images: existingImages,
                            imageUrl: product.imageUrl || existingImages[0] || ''
                          });
                        }}
                        className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all cursor-pointer"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Ver Producto (Ojito) */}
      {viewingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="relative bg-slate-900 border border-slate-800 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
              <div className="flex items-center gap-3">
                <span className="text-xs uppercase tracking-wider font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  {viewingProduct.category || 'General'}
                </span>
                <h2 className="text-xl font-bold text-white truncate max-w-md">
                  {viewingProduct.title}
                </h2>
              </div>
              <button 
                onClick={() => setViewingProduct(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X size={22} />
              </button>
            </div>

            {/* Modal Content Grid */}
            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Left Column: Photo Gallery */}
              <div className="space-y-4">
                <div className="aspect-square bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden relative group">
                  {viewingProduct.imageUrl ? (
                    <img 
                      src={viewingProduct.imageUrl} 
                      alt={viewingProduct.title} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600">
                      <Package size={64} />
                    </div>
                  )}
                </div>

                {/* Thumbnail Strip */}
                {viewingProduct.images && viewingProduct.images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                    {viewingProduct.images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setViewingProduct({ ...viewingProduct, imageUrl: img })}
                        className={`w-16 h-16 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all cursor-pointer ${
                          viewingProduct.imageUrl === img ? 'border-emerald-500 scale-105' : 'border-slate-800 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Information & Variants */}
              <div className="space-y-5">
                {/* Price & SKU Header */}
                <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-500">Precio de Venta</p>
                    <h3 className="text-2xl font-black text-emerald-400">
                      {viewingProduct.price ? formatPrice(viewingProduct.price) : 'Gratis'}
                    </h3>
                    {viewingProduct.pauta_price ? (
                      <p className="text-xs text-blue-400 font-semibold">Pauta: {formatPrice(viewingProduct.pauta_price)}</p>
                    ) : null}
                  </div>

                  {viewingProduct.sku && (
                    <div className="bg-white p-2 rounded-xl text-center shadow-lg">
                      <BarcodeGenerator value={viewingProduct.sku} height={22} width={1.0} displayValue={false} />
                      <p className="text-[9px] font-mono font-bold text-slate-900 mt-1">{viewingProduct.sku}</p>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <h4 className="text-xs uppercase font-bold text-slate-400">Descripción</h4>
                  <p className="text-xs text-slate-300 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80 leading-relaxed min-h-[60px]">
                    {viewingProduct.description || 'Sin descripción disponible.'}
                  </p>
                </div>

                {/* Details Metadata Badges */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-500 font-semibold block text-[10px] uppercase">Tipo de Item</span>
                    <span className="text-white font-bold">
                      {viewingProduct.product_type === 'service' ? '🛠️ Servicio / Digital' : '📦 Producto Tangible'}
                    </span>
                  </div>
                  <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-500 font-semibold block text-[10px] uppercase">Stock Total</span>
                    <span className="text-amber-400 font-bold">{viewingProduct.stock || 0} unidades</span>
                  </div>
                </div>

                {/* Breakdown of Variants */}
                {viewingProduct.variants && viewingProduct.variants.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs uppercase font-bold text-slate-400">Variantes ({viewingProduct.variants.length})</h4>
                    <div className="max-h-[180px] overflow-y-auto custom-scrollbar space-y-2 pr-1">
                      {viewingProduct.variants.map((v, i) => (
                        <div key={i} className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            {v.image_url && (
                              <img src={v.image_url} alt="" className="w-8 h-8 rounded-lg object-cover bg-slate-800" />
                            )}
                            <div>
                              <p className="font-bold text-white">
                                {v.size && `Talla: ${v.size}`} {v.color && `| Color: ${v.color}`}
                              </p>
                              {v.sku && <p className="text-[10px] text-slate-400 font-mono">SKU: {v.sku}</p>}
                            </div>
                          </div>
                          <span className="font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg">
                            {v.stock} u.
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex justify-between items-center">
              <button 
                onClick={() => {
                  const prod = viewingProduct;
                  setViewingProduct(null);
                  const existingImages = (prod.images && prod.images.length > 0)
                    ? prod.images 
                    : (prod.imageUrl ? [prod.imageUrl] : []);
                  setEditingProduct({ 
                    ...prod, 
                    variants: prod.variants || [],
                    images: existingImages,
                    imageUrl: prod.imageUrl || existingImages[0] || ''
                  });
                }}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer"
              >
                <Edit2 size={16} />
                Editar este Producto
              </button>
              
              <button
                onClick={() => setViewingProduct(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteProduct && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-bold text-white">¿De verdad quieres eliminar?</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Esta acción no se puede deshacer. Se eliminará permanentemente el producto <strong className="text-white">"{confirmDeleteProduct.title}"</strong> y todas sus variantes.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteProduct(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteProduct(confirmDeleteProduct.id);
                  setConfirmDeleteProduct(null);
                  setEditingProduct(null);
                }}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-red-500/20 cursor-pointer"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal / Form Edit */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setEditingProduct(null)} />
          <div className="relative bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">
                {editingProduct.id ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
              <button type="button" onClick={() => setEditingProduct(null)} className="text-slate-500 hover:text-white cursor-pointer">
                <XCircle size={24} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
              
              {/* SKU Collision Warning Alert */}
              {mainSkuDuplicate && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-4 animate-in fade-in duration-300">
                  <AlertTriangle size={24} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs space-y-1">
                    <h4 className="font-bold text-amber-300 text-sm">⚠️ SKU Ya Registrado en el Sistema</h4>
                    <p className="text-slate-300">
                      El SKU <span className="font-mono font-bold text-white bg-amber-500/20 px-1.5 py-0.5 rounded">{editingProduct.sku}</span> ya está asignado a:
                    </p>
                    <div className="flex items-center gap-3 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 mt-2">
                      {mainSkuDuplicate.product.imageUrl ? (
                        <img 
                          src={mainSkuDuplicate.product.imageUrl} 
                          alt="" 
                          className="w-12 h-12 object-cover rounded-lg bg-slate-800 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 font-bold flex-shrink-0">
                          SKU
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-white">{mainSkuDuplicate.product.title}</p>
                        <p className="text-[10px] text-amber-400 font-medium">Ubicación: {mainSkuDuplicate.type}</p>
                        <p className="text-[10px] text-slate-400">Precio: {formatPrice(mainSkuDuplicate.product.price)} | Cat: {mainSkuDuplicate.product.category || 'General'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Título del Producto</label>
                <input 
                  required
                  type="text"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-4 text-slate-200 focus:ring-1 focus:ring-emerald-500 outline-none"
                  value={editingProduct.title || ''}
                  onChange={e => setEditingProduct({...editingProduct, title: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo de Item</label>
                  <select 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-4 text-slate-200 focus:ring-1 focus:ring-emerald-500 outline-none"
                    value={editingProduct.product_type || 'product'}
                    onChange={e => setEditingProduct({...editingProduct, product_type: e.target.value as any})}
                  >
                    <option value="product">📦 Producto Tangible</option>
                    <option value="service">🛠️ Servicio / Digital</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Categoría</label>
                  <select 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-4 text-slate-200 focus:ring-1 focus:ring-emerald-500 outline-none"
                    value={editingProduct.category || ''}
                    onChange={e => setEditingProduct({...editingProduct, category: e.target.value})}
                  >
                    <option value="">Seleccionar Categoría</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Precio de Venta</label>
                  <input 
                    type="text"
                    placeholder="Ej: $150.000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-4 text-slate-200 focus:ring-1 focus:ring-emerald-500 outline-none"
                    value={editingProduct.price || ''}
                    onChange={e => setEditingProduct({...editingProduct, price: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Precio Venta Pauta</label>
                  <input 
                    type="number"
                    placeholder="Ej: 120000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-4 text-slate-200 focus:ring-1 focus:ring-emerald-500 outline-none"
                    value={editingProduct.pauta_price || 0}
                    onChange={e => setEditingProduct({...editingProduct, pauta_price: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>

              {/* Opción Pauta Toggle */}
              <div className="flex items-center justify-between p-4 border border-slate-800 rounded-xl bg-slate-950/30">
                <div>
                  <h4 className="text-sm font-bold text-white">Usar en Pauta</h4>
                  <p className="text-xs text-slate-500">Habilita este producto en campañas de publicidad</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingProduct({...editingProduct, is_pauta: !editingProduct.is_pauta})}
                  className={`
                    w-12 h-6 rounded-full transition-all relative cursor-pointer
                    ${editingProduct.is_pauta ? 'bg-blue-500' : 'bg-slate-800'}
                  `}
                >
                  <div className={`
                    absolute top-1 w-4 h-4 bg-white rounded-full transition-all
                    ${editingProduct.is_pauta ? 'right-1' : 'left-1'}
                  `} />
                </button>
              </div>

              {editingProduct.product_type === 'product' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Precio de Costo (Contabilidad)</label>
                    <input 
                      type="number"
                      placeholder="Ej: 80000"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-4 text-slate-200 focus:ring-1 focus:ring-emerald-500 outline-none"
                      value={editingProduct.cost_price || 0}
                      onChange={e => setEditingProduct({...editingProduct, cost_price: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">SKU / Código Principal</label>
                    <input 
                      type="text"
                      placeholder="ABC-123"
                      className={`w-full bg-slate-950 border rounded-xl py-2 px-4 text-slate-200 focus:ring-1 outline-none ${
                        mainSkuDuplicate ? 'border-amber-500 focus:ring-amber-500' : 'border-slate-800 focus:ring-emerald-500'
                      }`}
                      value={editingProduct.sku || ''}
                      onChange={e => setEditingProduct({...editingProduct, sku: e.target.value})}
                    />
                  </div>
                </div>
              )}

              {/* Variants Section */}
              {editingProduct.product_type === 'product' && (
                <div className="space-y-4 border border-slate-800 p-6 rounded-[32px] bg-slate-950/50">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Variantes (Talla / Color / Stock / SKU)</label>
                    <button 
                      type="button"
                      onClick={() => {
                        const newVariants = [...(editingProduct.variants || []), { size: '', color: '', stock: 0 }];
                        setEditingProduct({...editingProduct, variants: newVariants});
                      }}
                      className="text-emerald-500 font-bold text-[10px] uppercase hover:underline cursor-pointer"
                    >
                      + Añadir Variante
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {(editingProduct.variants || []).map((variant, index) => {
                      const variantSkuDuplicate = variant.sku ? findDuplicateSku(variant.sku, editingProduct.id) : null;

                      return (
                        <div key={index} className="space-y-2 bg-slate-900/50 p-3 rounded-2xl border border-slate-800">
                          {variantSkuDuplicate && (
                            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[10px] text-amber-300 flex items-center gap-2">
                              <AlertTriangle size={14} className="flex-shrink-0" />
                              <span>SKU "{variant.sku}" ya usado en: <strong className="text-white">{variantSkuDuplicate.product.title}</strong></span>
                            </div>
                          )}

                          <div className="grid grid-cols-6 gap-3 items-end">
                            <div className="space-y-1">
                              <p className="text-[8px] font-black text-slate-500 uppercase">Talla</p>
                              <input 
                                placeholder="S, M, L..."
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2 text-xs text-white outline-none focus:border-emerald-500"
                                value={variant.size}
                                onChange={e => {
                                  const newVariants = [...(editingProduct.variants || [])];
                                  newVariants[index].size = e.target.value;
                                  setEditingProduct({...editingProduct, variants: newVariants});
                                }}
                              />
                            </div>
                            <div className="space-y-1">
                              <p className="text-[8px] font-black text-slate-500 uppercase">Color</p>
                              <input 
                                placeholder="Negro..."
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2 text-xs text-white outline-none focus:border-emerald-500"
                                value={variant.color}
                                onChange={e => {
                                  const newVariants = [...(editingProduct.variants || [])];
                                  newVariants[index].color = e.target.value;
                                  setEditingProduct({...editingProduct, variants: newVariants});
                                }}
                              />
                            </div>
                            <div className="space-y-1">
                              <p className="text-[8px] font-black text-slate-500 uppercase">SKU Var.</p>
                              <input 
                                placeholder="SKU..."
                                className={`w-full bg-slate-950 border rounded-lg py-1.5 px-2 text-xs text-white outline-none ${
                                  variantSkuDuplicate ? 'border-amber-500' : 'border-slate-800 focus:border-emerald-500'
                                }`}
                                value={variant.sku || ''}
                                onChange={e => {
                                  const newVariants = [...(editingProduct.variants || [])];
                                  newVariants[index].sku = e.target.value;
                                  setEditingProduct({...editingProduct, variants: newVariants});
                                }}
                              />
                            </div>
                            <div className="space-y-1">
                              <p className="text-[8px] font-black text-slate-500 uppercase">Stock</p>
                              <input 
                                type="number"
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2 text-xs text-white outline-none focus:border-emerald-500"
                                value={variant.stock}
                                onChange={e => {
                                  const newVariants = [...(editingProduct.variants || [])];
                                  newVariants[index].stock = parseInt(e.target.value) || 0;
                                  setEditingProduct({...editingProduct, variants: newVariants});
                                }}
                              />
                            </div>
                            <div className="space-y-1 text-center">
                              <p className="text-[8px] font-black text-slate-500 uppercase">Foto</p>
                              <label className="flex items-center justify-center h-8 bg-slate-950 border border-slate-800 rounded-lg cursor-pointer hover:border-emerald-500 transition-all overflow-hidden relative group mx-auto w-full">
                                {variant.image_url ? (
                                  <>
                                    <img src={variant.image_url} alt="" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                      <Upload size={12} className="text-white" />
                                    </div>
                                  </>
                                ) : (
                                  <ImageIcon size={14} className="text-slate-600" />
                                )}
                                <input 
                                  type="file"
                                  className="hidden"
                                  accept="image/*"
                                  onChange={e => handleVariantImageUpload(e, index)}
                                />
                              </label>
                            </div>
                            <div className="flex justify-end">
                              <button 
                                type="button"
                                onClick={() => {
                                  const newVariants = (editingProduct.variants || []).filter((_, i) => i !== index);
                                  setEditingProduct({...editingProduct, variants: newVariants});
                                }}
                                className="p-2 text-slate-600 hover:text-red-500 transition-colors cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    {(!editingProduct.variants || editingProduct.variants.length === 0) && (
                      <p className="text-center py-4 text-slate-600 text-xs italic">No hay variantes definidas. Añade una para controlar stock por talla/color.</p>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Descripción del Producto</label>
                <textarea 
                  rows={3}
                  placeholder="Describe las características, materiales, etc..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-slate-200 focus:ring-1 focus:ring-emerald-500 outline-none resize-none transition-all"
                  value={editingProduct.description || ''}
                  onChange={e => setEditingProduct({...editingProduct, description: e.target.value})}
                />
              </div>

              {/* Photo Gallery Section */}
              <div className="space-y-4 border border-slate-800 p-6 rounded-[32px] bg-slate-950/50">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Galería de Fotos del Producto</label>
                    <p className="text-[10px] text-slate-500">Puedes subir múltiples imágenes para mostrar diferentes ángulos de la prenda.</p>
                  </div>
                  
                  <button 
                    type="button"
                    disabled={uploading}
                    onClick={() => galleryInputRef.current?.click()}
                    className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {uploading ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
                    Subir Fotos
                  </button>

                  <input 
                    type="file"
                    ref={galleryInputRef}
                    className="hidden"
                    multiple
                    accept="image/*"
                    onChange={handleGalleryUpload}
                  />
                </div>

                {/* URL Input Bar */}
                <div className="flex gap-2">
                  <input 
                    type="url"
                    placeholder="O pega una URL de imagen (https://...)"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:ring-1 focus:ring-emerald-500 outline-none"
                    value={newImageUrl}
                    onChange={e => setNewImageUrl(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addImageUrlToGallery();
                      }
                    }}
                  />
                  <button 
                    type="button"
                    onClick={addImageUrlToGallery}
                    className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    + Agregar URL
                  </button>
                </div>

                {/* Display Gallery Grid */}
                {(() => {
                  const galleryImages = (editingProduct.images && editingProduct.images.length > 0)
                    ? editingProduct.images
                    : (editingProduct.imageUrl ? [editingProduct.imageUrl] : []);

                  if (galleryImages.length === 0) {
                    return (
                      <div className="py-8 border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-600 gap-2">
                        <ImageIcon size={32} />
                        <p className="text-xs">No hay fotos en la galería aún. Haz clic en "Subir Fotos" o agrega una URL.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-4 gap-3 pt-2">
                      {galleryImages.map((imgUrl, idx) => {
                        const isMain = editingProduct.imageUrl === imgUrl || (!editingProduct.imageUrl && idx === 0);

                        return (
                          <div 
                            key={idx} 
                            className={`
                              relative group aspect-square rounded-2xl overflow-hidden border bg-slate-900 transition-all
                              ${isMain ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-800'}
                            `}
                          >
                            <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                            
                            {/* Overlay Controls */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col justify-between p-2 transition-opacity">
                              <div className="flex justify-between items-center">
                                <button
                                  type="button"
                                  onClick={() => setPrimaryImage(imgUrl)}
                                  title="Establecer como foto principal"
                                  className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    isMain ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-300 hover:text-white'
                                  }`}
                                >
                                  <Star size={14} fill={isMain ? 'white' : 'none'} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeGalleryImage(imgUrl)}
                                  className="bg-red-500 text-white p-1.5 rounded-lg hover:bg-red-600 transition-all cursor-pointer"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                              
                              {isMain && (
                                <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded text-center">
                                  Principal
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

            </form>

            {/* Modal Footer with Delete Option */}
            <div className="p-6 bg-slate-950/50 border-t border-slate-800 flex justify-between items-center gap-3">
              {editingProduct.id ? (
                <button 
                  type="button"
                  onClick={() => setConfirmDeleteProduct(editingProduct as Product)}
                  className="px-4 py-2.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 font-semibold hover:bg-red-500/20 transition-all flex items-center gap-2 cursor-pointer text-xs"
                >
                  <Trash2 size={16} />
                  Eliminar Producto
                </button>
              ) : <div />}

              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-400 font-semibold hover:bg-slate-800 transition-all cursor-pointer text-xs"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 cursor-pointer text-xs"
                >
                  {saving ? <Loader2 className="animate-spin mx-auto" size={18} /> : 'Guardar Cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

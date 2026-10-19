import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { jsPDF } from 'jspdf';
import { 
  BookOpen, 
  Loader2, 
  Download, 
  CheckSquare, 
  Square, 
  Phone, 
  Palette, 
  Layout, 
  List, 
  Grid, 
  FileText, 
  Sparkles, 
  Check,
  Package,
  Layers
} from 'lucide-react';

interface Product {
  id: string;
  title: string;
  description: string;
  category: string;
  price: string;
  imageUrl: string;
  active: boolean;
  company_id: string;
  sku?: string;
  variants?: { size: string; color: string; stock: number }[];
}

interface CompanyInfo {
  id: string;
  name: string;
  phone?: string;
  logo_url?: string;
  primary_color?: string;
}

export function Catalogs({ companyId }: { companyId: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // Catalog configuration options
  const [catalogTitle, setCatalogTitle] = useState('Catálogo de Productos');
  const [catalogSubtitle, setCatalogSubtitle] = useState('Haz clic en cualquier producto para pedirlo por WhatsApp');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [buttonText, setButtonText] = useState('Pedir por WhatsApp');
  const [whatsappMessage, setWhatsappMessage] = useState('¡Hola! Me interesa este producto de tu catálogo: *{PRODUCT}* en tu tienda.');
  
  const [template, setTemplate] = useState<'grid' | 'list' | 'minimalist'>('grid');
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('dark');
  const [showVariants, setShowVariants] = useState(true);
  const [customColor, setCustomColor] = useState('#10b981');
  
  // Filtering selections
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  useEffect(() => {
    if (companyId) {
      fetchData();
    }
  }, [companyId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Company Settings
      const { data: companyData } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();
      
      if (companyData) {
        setCompanyInfo(companyData);
        setWhatsappPhone(companyData.phone || '');
        setCustomColor(companyData.primary_color || '#10b981');
      }

      // 2. Fetch Products
      const { data: productsData } = await supabase
        .from('treatments')
        .select('*')
        .eq('company_id', companyId)
        .eq('active', true)
        .order('title', { ascending: true });

      if (productsData) {
        setProducts(productsData);
        
        // Extract unique categories
        const cats = Array.from(new Set(productsData.map((p: Product) => p.category || 'General')));
        setCategories(cats);
        setSelectedCategories(cats);
        setSelectedProductIds(productsData.map((p: Product) => p.id));
      }
    } catch (err) {
      console.error("Error loading catalog data:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => {
      const next = prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat];
      
      // Update selected products to match selected categories
      const filteredProductIds = products
        .filter(p => next.includes(p.category || 'General'))
        .map(p => p.id);
      setSelectedProductIds(filteredProductIds);
      
      return next;
    });
  };

  const toggleProductSelection = (id: string) => {
    setSelectedProductIds(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const selectAllProducts = () => {
    setSelectedProductIds(products.map(p => p.id));
    setSelectedCategories(categories);
  };

  const selectNoneProducts = () => {
    setSelectedProductIds([]);
    setSelectedCategories([]);
  };

  const formatPrice = (amount: number | string) => {
    const numericAmount = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.-]+/g, "")) : amount;
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numericAmount || 0);
  };

  // Helper to convert Image URL to Base64 safely (CORS-friendly in Electron)
  const getBase64ImageFromUrl = (url: string): Promise<string | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.setAttribute('crossOrigin', 'anonymous');
      img.src = url;
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const dataURL = canvas.toDataURL('image/jpeg', 0.8);
            resolve(dataURL);
          } else {
            resolve(null);
          }
        } catch (e) {
          console.error("Canvas toDataURL failed:", e);
          resolve(null);
        }
      };
      img.onerror = () => {
        resolve(null);
      };
    });
  };

  const generatePDFCatalog = async () => {
    const selectedProducts = products.filter(p => selectedProductIds.includes(p.id));
    if (selectedProducts.length === 0) {
      alert("Selecciona al menos un producto para generar el catálogo.");
      return;
    }

    setGenerating(true);
    setProgress({ current: 0, total: selectedProducts.length });

    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const docW = 210;
      const docH = 297;
      const margin = 15;
      
      const r = parseInt(customColor.slice(1, 3), 16);
      const g = parseInt(customColor.slice(3, 5), 16);
      const b = parseInt(customColor.slice(5, 7), 16);

      const isDark = themeMode === 'dark';
      
      // Theme colors
      const bgR = isDark ? 24 : 255;
      const bgG = isDark ? 32 : 255;
      const bgB = isDark ? 47 : 255;

      const cardBgR = isDark ? 15 : 248;
      const cardBgG = isDark ? 23 : 249;
      const cardBgB = isDark ? 42 : 250;

      const textR = isDark ? 255 : 30;
      const textG = isDark ? 255 : 41;
      const textB = isDark ? 255 : 59;

      const descR = isDark ? 163 : 100;
      const descG = isDark ? 163 : 100;
      const descB = isDark ? 163 : 100;

      // Draw background and header helper
      const drawPageBackground = (_pageNum: number) => {
        doc.setFillColor(bgR, bgG, bgB);
        doc.rect(0, 0, docW, docH, 'F');
        
        // Custom decorative shapes for a premium look
        doc.setFillColor(r, g, b);
        doc.rect(0, 0, docW, 4, 'F'); // Top colored accent bar
      };

      const drawHeader = async (yStart: number) => {
        let currentY = yStart;
        
        // Brand logo
        if (companyInfo?.logo_url) {
          try {
            const logoBase64 = await getBase64ImageFromUrl(companyInfo.logo_url);
            if (logoBase64) {
              doc.addImage(logoBase64, 'JPEG', margin, currentY, 20, 20);
              doc.setFont("helvetica", "bold");
              doc.setFontSize(16);
              doc.setTextColor(textR, textG, textB);
              doc.text(companyInfo.name, margin + 25, currentY + 12);
              currentY += 25;
            } else {
              doc.setFont("helvetica", "bold");
              doc.setFontSize(22);
              doc.setTextColor(r, g, b);
              doc.text(companyInfo.name, margin, currentY + 10);
              currentY += 18;
            }
          } catch {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(22);
            doc.setTextColor(r, g, b);
            doc.text(companyInfo.name, margin, currentY + 10);
            currentY += 18;
          }
        } else {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(22);
          doc.setTextColor(r, g, b);
          doc.text(companyInfo?.name || "Mi Tienda", margin, currentY + 10);
          currentY += 18;
        }

        // Title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(20);
        doc.setTextColor(textR, textG, textB);
        doc.text(catalogTitle, margin, currentY);
        
        // Subtitle
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(descR, descG, descB);
        doc.text(catalogSubtitle, margin, currentY + 6, { maxWidth: 180 });
        
        return currentY + 15;
      };

      // Draw footer helper
      const drawFooter = (pageNum: number, _totalPages: number) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(descR, descG, descB);
        doc.text(`Página ${pageNum}`, docW - margin - 15, docH - 10);
        
        if (companyInfo?.name) {
          doc.text(`${companyInfo.name} - Catálogo Digital`, margin, docH - 10);
        }
      };

      // Process product image to Base64
      const imageCache: { [id: string]: string | null } = {};
      for (let i = 0; i < selectedProducts.length; i++) {
        const prod = selectedProducts[i];
        if (prod.imageUrl) {
          setProgress(prev => ({ ...prev, current: i + 1 }));
          const base64 = await getBase64ImageFromUrl(prod.imageUrl);
          imageCache[prod.id] = base64;
        } else {
          imageCache[prod.id] = null;
        }
      }

      // Draw catalog cards
      let itemIndex = 0;
      let pageNumber = 1;

      if (template === 'grid') {
        // Grid (2 columns, 2 rows on first page due to header; 2 columns, 2 rows on subsequent pages too)
        while (itemIndex < selectedProducts.length) {
          if (pageNumber > 1) {
            doc.addPage();
          }
          drawPageBackground(pageNumber);
          
          let yOffset = 18;
          if (pageNumber === 1) {
            yOffset = await drawHeader(18);
          } else {
            // Draw mini header on page 2+
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(textR, textG, textB);
            doc.text(`${catalogTitle} - ${companyInfo?.name}`, margin, 12);
            doc.setDrawColor(r, g, b);
            doc.setLineWidth(0.3);
            doc.line(margin, 14, docW - margin, 14);
            yOffset = 22;
          }

          // Calculate space: A4 is 297mm high.
          // Page 1 header ends around yOffset (approx 60-70mm).
          // Card height = 92mm, width = 86mm. Gap = 8mm.
          // Row 1: yOffset
          // Row 2: yOffset + 92 + 8 = yOffset + 100.
          // We can check how many rows fit.
          const maxRows = pageNumber === 1 ? 2 : 2; 
          const cardH = 96;
          const cardW = 86;
          const gapX = 8;
          const gapY = 8;

          for (let row = 0; row < maxRows; row++) {
            const cardY = yOffset + row * (cardH + gapY);
            
            // Check if card fits on page
            if (cardY + cardH > docH - 15) break;

            for (let col = 0; col < 2; col++) {
              if (itemIndex >= selectedProducts.length) break;
              
              const prod = selectedProducts[itemIndex];
              const cardX = margin + col * (cardW + gapX);

              // 1. Draw Card Background
              doc.setFillColor(cardBgR, cardBgG, cardBgB);
              doc.roundedRect(cardX, cardY, cardW, cardH, 3, 3, 'F');

              // 2. Draw Product Image
              const base64Img = imageCache[prod.id];
              const imgH = 46;
              const imgW = cardW - 6;
              if (base64Img) {
                doc.addImage(base64Img, 'JPEG', cardX + 3, cardY + 3, imgW, imgH);
              } else {
                // Placeholder
                doc.setFillColor(isDark ? 30 : 220, isDark ? 41 : 220, isDark ? 59 : 220);
                doc.rect(cardX + 3, cardY + 3, imgW, imgH, 'F');
                doc.setFont("helvetica", "italic");
                doc.setFontSize(8);
                doc.setTextColor(descR, descG, descB);
                doc.text("Sin imagen", cardX + (cardW/2), cardY + (imgH/2) + 2, { align: 'center' });
              }

              // 3. Draw Title
              doc.setFont("helvetica", "bold");
              doc.setFontSize(9.5);
              doc.setTextColor(textR, textG, textB);
              const cleanTitle = prod.title.toUpperCase();
              const truncatedTitle = cleanTitle.length > 28 ? cleanTitle.slice(0, 26) + "..." : cleanTitle;
              doc.text(truncatedTitle, cardX + 4, cardY + 54);

              // 4. Draw Price
              doc.setFont("helvetica", "bold");
              doc.setFontSize(11);
              doc.setTextColor(r, g, b);
              doc.text(formatPrice(prod.price), cardX + 4, cardY + 60);

              // 5. Draw Description / Category
              doc.setFont("helvetica", "normal");
              doc.setFontSize(7.5);
              doc.setTextColor(descR, descG, descB);
              
              let detailsText = prod.description || 'Prenda exclusiva de alta calidad.';
              if (detailsText.length > 95) {
                detailsText = detailsText.substring(0, 92) + '...';
              }
              
              if (showVariants && prod.variants && prod.variants.length > 0) {
                const sizes = Array.from(new Set(prod.variants.map(v => v.size))).filter(Boolean);
                if (sizes.length > 0) {
                  detailsText = `${detailsText.substring(0, 50)}...\nTallas: ${sizes.join(', ')}`;
                }
              }

              doc.text(detailsText, cardX + 4, cardY + 66, { maxWidth: cardW - 8 });

              // 6. Draw Action Button with WhatsApp Link
              const btnY = cardY + cardH - 11;
              const btnW = cardW - 8;
              const btnH = 7.5;
              doc.setFillColor(r, g, b);
              doc.roundedRect(cardX + 4, btnY, btnW, btnH, 1.5, 1.5, 'F');
              
              doc.setTextColor(255, 255, 255);
              doc.setFont("helvetica", "bold");
              doc.setFontSize(8);
              doc.text(buttonText, cardX + (cardW / 2), btnY + 5, { align: 'center' });

              // WhatsApp Link Annotation
              const pMessage = whatsappMessage.replace('{PRODUCT}', prod.title);
              const waUrl = `https://wa.me/${whatsappPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(pMessage)}`;
              doc.link(cardX + 4, btnY, btnW, btnH, { url: waUrl });

              itemIndex++;
            }
          }
          
          drawFooter(pageNumber, 100);
          pageNumber++;
        }
      } else if (template === 'list') {
        // List Layout (1 Column, 2 products on first page, 3 on subsequent pages)
        while (itemIndex < selectedProducts.length) {
          if (pageNumber > 1) {
            doc.addPage();
          }
          drawPageBackground(pageNumber);
          
          let yOffset = 18;
          if (pageNumber === 1) {
            yOffset = await drawHeader(18);
          } else {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(textR, textG, textB);
            doc.text(`${catalogTitle} - ${companyInfo?.name}`, margin, 12);
            doc.setDrawColor(r, g, b);
            doc.setLineWidth(0.3);
            doc.line(margin, 14, docW - margin, 14);
            yOffset = 20;
          }

          const cardH = 70;
          const cardW = docW - 30; // 180mm
          const gapY = 8;
          const maxListItems = pageNumber === 1 ? 2 : 3;

          for (let row = 0; row < maxListItems; row++) {
            const cardY = yOffset + row * (cardH + gapY);
            if (cardY + cardH > docH - 15) break;
            if (itemIndex >= selectedProducts.length) break;

            const prod = selectedProducts[itemIndex];
            const cardX = margin;

            // 1. Draw Card Background
            doc.setFillColor(cardBgR, cardBgG, cardBgB);
            doc.roundedRect(cardX, cardY, cardW, cardH, 3, 3, 'F');

            // 2. Draw Image on Left
            const base64Img = imageCache[prod.id];
            const imgW = 64;
            const imgH = cardH - 6;
            if (base64Img) {
              doc.addImage(base64Img, 'JPEG', cardX + 3, cardY + 3, imgW, imgH);
            } else {
              doc.setFillColor(isDark ? 30 : 220, isDark ? 41 : 220, isDark ? 59 : 220);
              doc.rect(cardX + 3, cardY + 3, imgW, imgH, 'F');
              doc.setFont("helvetica", "italic");
              doc.setFontSize(8);
              doc.setTextColor(descR, descG, descB);
              doc.text("Sin imagen", cardX + (imgW/2), cardY + (imgH/2) + 2, { align: 'center' });
            }

            // 3. Draw Content on Right
            const contentX = cardX + imgW + 8;
            
            // Title
            doc.setFont("helvetica", "bold");
            doc.setFontSize(13);
            doc.setTextColor(textR, textG, textB);
            doc.text(prod.title.toUpperCase(), contentX, cardY + 10);

            // Category tag
            doc.setFont("helvetica", "bold");
            doc.setFontSize(7.5);
            doc.setTextColor(r, g, b);
            doc.text((prod.category || 'General').toUpperCase(), contentX, cardY + 15);

            // Price
            doc.setFont("helvetica", "bold");
            doc.setFontSize(14);
            doc.setTextColor(r, g, b);
            doc.text(formatPrice(prod.price), contentX, cardY + 23);

            // Description
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8.5);
            doc.setTextColor(descR, descG, descB);
            let detailsText = prod.description || 'Prenda de alta costura confeccionada bajo altos estándares.';
            if (detailsText.length > 200) {
              detailsText = detailsText.substring(0, 195) + '...';
            }

            if (showVariants && prod.variants && prod.variants.length > 0) {
              const sizes = Array.from(new Set(prod.variants.map(v => v.size))).filter(Boolean);
              const colors = Array.from(new Set(prod.variants.map(v => v.color))).filter(Boolean);
              let variantStr = "";
              if (sizes.length > 0) variantStr += `Tallas: ${sizes.join(', ')}`;
              if (colors.length > 0) variantStr += `  |  Colores: ${colors.join(', ')}`;
              
              if (variantStr) {
                detailsText += `\n\n${variantStr}`;
              }
            }

            doc.text(detailsText, contentX, cardY + 30, { maxWidth: cardW - imgW - 14 });

            // Button
            const btnW = 80;
            const btnH = 9;
            const btnX = cardX + cardW - btnW - 6;
            const btnY = cardY + cardH - btnH - 5;
            
            doc.setFillColor(r, g, b);
            doc.roundedRect(btnX, btnY, btnW, btnH, 2, 2, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.text(buttonText, btnX + (btnW / 2), btnY + 6, { align: 'center' });

            // WhatsApp Link
            const pMessage = whatsappMessage.replace('{PRODUCT}', prod.title);
            const waUrl = `https://wa.me/${whatsappPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(pMessage)}`;
            doc.link(btnX, btnY, btnW, btnH, { url: waUrl });

            itemIndex++;
          }

          drawFooter(pageNumber, 100);
          pageNumber++;
        }
      } else {
        // Minimalist Layout (3 columns, 2 rows on first page; 3 rows on page 2+)
        while (itemIndex < selectedProducts.length) {
          if (pageNumber > 1) {
            doc.addPage();
          }
          drawPageBackground(pageNumber);
          
          let yOffset = 18;
          if (pageNumber === 1) {
            yOffset = await drawHeader(18);
          } else {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(textR, textG, textB);
            doc.text(`${catalogTitle} - ${companyInfo?.name}`, margin, 12);
            doc.setDrawColor(r, g, b);
            doc.setLineWidth(0.3);
            doc.line(margin, 14, docW - margin, 14);
            yOffset = 20;
          }

          const cardH = 68;
          const cardW = 55;
          const gapX = 7;
          const gapY = 7;
          const maxRows = pageNumber === 1 ? 2 : 3;

          for (let row = 0; row < maxRows; row++) {
            const cardY = yOffset + row * (cardH + gapY);
            if (cardY + cardH > docH - 15) break;

            for (let col = 0; col < 3; col++) {
              if (itemIndex >= selectedProducts.length) break;
              
              const prod = selectedProducts[itemIndex];
              const cardX = margin + col * (cardW + gapX);

              // 1. Draw Card Background
              doc.setFillColor(cardBgR, cardBgG, cardBgB);
              doc.roundedRect(cardX, cardY, cardW, cardH, 2, 2, 'F');

              // 2. Draw Image
              const base64Img = imageCache[prod.id];
              const imgH = 30;
              const imgW = cardW - 4;
              if (base64Img) {
                doc.addImage(base64Img, 'JPEG', cardX + 2, cardY + 2, imgW, imgH);
              } else {
                doc.setFillColor(isDark ? 30 : 220, isDark ? 41 : 220, isDark ? 59 : 220);
                doc.rect(cardX + 2, cardY + 2, imgW, imgH, 'F');
                doc.setFont("helvetica", "italic");
                doc.setFontSize(7);
                doc.setTextColor(descR, descG, descB);
                doc.text("Sin foto", cardX + (cardW/2), cardY + (imgH/2) + 2, { align: 'center' });
              }

              // 3. Draw Title
              doc.setFont("helvetica", "bold");
              doc.setFontSize(8.5);
              doc.setTextColor(textR, textG, textB);
              const truncatedTitle = prod.title.length > 20 ? prod.title.substring(0, 18) + '...' : prod.title;
              doc.text(truncatedTitle.toUpperCase(), cardX + 3, cardY + 36);

              // 4. Draw Price
              doc.setFont("helvetica", "bold");
              doc.setFontSize(9.5);
              doc.setTextColor(r, g, b);
              doc.text(formatPrice(prod.price), cardX + 3, cardY + 41);

              // 5. Draw short description
              doc.setFont("helvetica", "normal");
              doc.setFontSize(6.5);
              doc.setTextColor(descR, descG, descB);
              let detailsText = prod.description || 'Prenda exclusiva.';
              if (detailsText.length > 50) {
                detailsText = detailsText.substring(0, 48) + '...';
              }
              doc.text(detailsText, cardX + 3, cardY + 46, { maxWidth: cardW - 6 });

              // 6. Draw tiny button
              const btnY = cardY + cardH - 8;
              const btnW = cardW - 6;
              const btnH = 6;
              doc.setFillColor(r, g, b);
              doc.roundedRect(cardX + 3, btnY, btnW, btnH, 1, 1, 'F');
              
              doc.setTextColor(255, 255, 255);
              doc.setFont("helvetica", "bold");
              doc.setFontSize(7);
              doc.text(buttonText, cardX + (cardW / 2), btnY + 4, { align: 'center' });

              // WhatsApp Link Annotation
              const pMessage = whatsappMessage.replace('{PRODUCT}', prod.title);
              const waUrl = `https://wa.me/${whatsappPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(pMessage)}`;
              doc.link(cardX + 3, btnY, btnW, btnH, { url: waUrl });

              itemIndex++;
            }
          }

          drawFooter(pageNumber, 100);
          pageNumber++;
        }
      }

      const filename = `${catalogTitle.toLowerCase().replace(/\s+/g, '_')}_${companyInfo?.name?.toLowerCase().replace(/\s+/g, '_') || 'tienda'}.pdf`;
      doc.save(filename);

    } catch (err) {
      console.error("Error creating PDF Catalog:", err);
      alert("Error al generar el PDF del catálogo. Verifica la conexión.");
    } finally {
      setGenerating(false);
      setProgress({ current: 0, total: 0 });
    }
  };


  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] gap-6 p-6 overflow-hidden">
      
      {/* Header */}
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BookOpen className="text-emerald-500" />
            Generador de Catálogos PDF
          </h1>
          <p className="text-slate-400 text-xs mt-0.5">Diseña catálogos digitales interactivos en PDF listos para enviar a tus clientes.</p>
        </div>
        
        <button
          onClick={generatePDFCatalog}
          disabled={generating || selectedProductIds.length === 0}
          className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/20 flex items-center gap-2"
        >
          {generating ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              <span>Generando ({progress.current}/{progress.total})...</span>
            </>
          ) : (
            <>
              <Download size={20} />
              <span>Descargar Catálogo PDF</span>
            </>
          )}
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-4">
          <Loader2 className="animate-spin text-emerald-500" size={40} />
          <p className="font-medium animate-pulse">Cargando tus productos...</p>
        </div>
      ) : (
        <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
          
          {/* Left Panel: Settings Form */}
          <div className="w-[380px] bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar shrink-0">
            
            {/* Template options */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layout size={16} className="text-emerald-500" />
                1. Diseño y Plantilla
              </h3>
              
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'grid', label: 'Cuadrícula', icon: Grid },
                  { id: 'list', label: 'Lista', icon: List },
                  { id: 'minimalist', label: 'Compacto', icon: FileText }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setTemplate(item.id as any)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all gap-1.5 ${
                      template === item.id 
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold' 
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <item.icon size={18} />
                    <span className="text-[10px]">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Aesthetics customization */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Palette size={16} className="text-emerald-500" />
                2. Apariencia y Colores
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Tema del PDF</label>
                  <select
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:ring-1 focus:ring-emerald-500 outline-none"
                    value={themeMode}
                    onChange={e => setThemeMode(e.target.value as any)}
                  >
                    <option value="light">☀️ Fondo Claro</option>
                    <option value="dark">🌙 Fondo Oscuro</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Color de Acento</label>
                  <div className="flex gap-2">
                    <input 
                      type="color" 
                      className="h-8 w-8 bg-transparent border-none outline-none cursor-pointer mt-0.5 shrink-0" 
                      value={customColor} 
                      onChange={e => setCustomColor(e.target.value)} 
                    />
                    <input 
                      type="text" 
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-1 text-xs text-white focus:ring-1 focus:ring-emerald-500 outline-none font-mono"
                      value={customColor}
                      onChange={e => setCustomColor(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="showVariants"
                  className="rounded border-slate-800 text-emerald-500 focus:ring-0 focus:ring-offset-0 bg-slate-950 h-4 w-4"
                  checked={showVariants}
                  onChange={e => setShowVariants(e.target.checked)}
                />
                <label htmlFor="showVariants" className="text-xs font-bold text-slate-300 cursor-pointer">
                  Listar tallas/colores de prendas
                </label>
              </div>
            </div>

            {/* Content settings */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={16} className="text-emerald-500" />
                3. Textos del PDF
              </h3>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Título del Catálogo</label>
                  <input
                    type="text"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:ring-1 focus:ring-emerald-500 outline-none"
                    value={catalogTitle}
                    onChange={e => setCatalogTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Subtítulo explicativo</label>
                  <input
                    type="text"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:ring-1 focus:ring-emerald-500 outline-none"
                    value={catalogSubtitle}
                    onChange={e => setCatalogSubtitle(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Interactive WhatsApp settings */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Phone size={16} className="text-emerald-500" />
                4. Enlace de WhatsApp
              </h3>
              
              <div className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Número de Recepción</label>
                  <input
                    type="text"
                    placeholder="Ej: +573001234567"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:ring-1 focus:ring-emerald-500 outline-none"
                    value={whatsappPhone}
                    onChange={e => setWhatsappPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Texto del Botón en PDF</label>
                  <input
                    type="text"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:ring-1 focus:ring-emerald-500 outline-none"
                    value={buttonText}
                    onChange={e => setButtonText(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Plantilla de Mensaje</label>
                  <textarea
                    rows={3}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white focus:ring-1 focus:ring-emerald-500 outline-none resize-none"
                    value={whatsappMessage}
                    onChange={e => setWhatsappMessage(e.target.value)}
                  />
                  <p className="text-[8px] text-slate-500 italic mt-0.5">Usa {"{PRODUCT}"} para incluir automáticamente el nombre del producto en el mensaje.</p>
                </div>
              </div>
            </div>

            {/* Filter categories */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={16} className="text-emerald-500" />
                  5. Categorías
                </h3>
                <div className="flex gap-2">
                  <button onClick={selectAllProducts} className="text-[9px] font-bold text-emerald-500 uppercase hover:underline">Todas</button>
                  <button onClick={selectNoneProducts} className="text-[9px] font-bold text-slate-500 uppercase hover:underline">Ninguna</button>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto custom-scrollbar bg-slate-950 p-3 rounded-2xl border border-slate-800">
                {categories.length === 0 ? (
                  <p className="text-[10px] text-slate-600 italic">No hay categorías disponibles.</p>
                ) : (
                  categories.map(cat => {
                    const isChecked = selectedCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        onClick={() => toggleCategory(cat)}
                        className={`text-[10px] font-bold px-3 py-1.5 rounded-full border transition-all flex items-center gap-1 ${
                          isChecked 
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300'
                        }`}
                      >
                        {isChecked ? <Check size={10} /> : null}
                        <span>{cat}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

          </div>

          {/* Right Panel: Scrollable Live Preview / Grid Selector */}
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            <div className="flex justify-between items-center px-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-tight">
                Listado de Artículos ({selectedProductIds.length} seleccionados)
              </h3>
              <p className="text-xs text-slate-500">Haz clic en cada prenda para incluirla o excluirla del catálogo final.</p>
            </div>

            {/* Interactive Grid Selector */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar grid grid-cols-[repeat(auto-fill,180px)] gap-4 justify-start content-start">
              {products
                .filter(p => selectedCategories.includes(p.category || 'General'))
                .map(product => {
                  const isSelected = selectedProductIds.includes(product.id);
                  return (
                    <div
                      key={product.id}
                      onClick={() => toggleProductSelection(product.id)}
                      className={`relative flex flex-col w-[180px] h-[220px] bg-slate-900 border rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-2xl active:scale-95 group ${
                        isSelected 
                          ? 'border-emerald-500 shadow-lg shadow-emerald-500/5' 
                          : 'border-slate-800 opacity-60 hover:opacity-90'
                      }`}
                    >
                      <div className="h-28 relative overflow-hidden bg-slate-800 shrink-0">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600">
                            <Package size={28} />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 to-transparent" />
                        
                        {/* Selected Checkbox Icon */}
                        <div className="absolute top-2.5 right-2.5">
                          <div className={`p-1.5 rounded-full transition-all border ${
                            isSelected 
                              ? 'bg-emerald-500 border-emerald-400 text-white' 
                              : 'bg-slate-950/60 border-slate-700 text-slate-400'
                          }`}>
                            {isSelected ? <CheckSquare size={12} /> : <Square size={12} />}
                          </div>
                        </div>
                      </div>

                      <div className="p-3 flex flex-col flex-1 justify-between gap-1">
                        <h4 className="text-[10px] font-black text-white leading-tight uppercase truncate">
                          {product.title}
                        </h4>
                        <div className="flex justify-between items-end">
                          <span className="text-[8px] uppercase tracking-wider font-bold text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 truncate max-w-[80px]">
                            {product.category || 'General'}
                          </span>
                          <span className="text-xs font-black text-emerald-500 leading-none">
                            {formatPrice(product.price)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              
              {products.filter(p => selectedCategories.includes(p.category || 'General')).length === 0 && (
                <div className="col-span-full py-20 text-center text-slate-600 font-medium italic">
                  No hay productos que coincidan con las categorías seleccionadas.
                </div>
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}

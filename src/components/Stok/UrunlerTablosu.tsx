import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { appTheme } from '../../lib/agGridTheme';
import { AG_GRID_LOCALE_TR } from '../../lib/agGridLocaleTR';
import {
  ColDef,
  ICellRendererParams,
  GridReadyEvent,
  GridApi,
  RowSelectionOptions,
} from 'ag-grid-community';
import {
  Plus,
  Search,
  Tag,
  Barcode,
  Layers,
  Edit2,
  Trash2,
  X,
  Check,
  Download,
  Package,
  Truck,
  TrendingUp,
  Percent,
  Coins,
  Warehouse as WarehouseIcon,
  Copy,
  CheckCircle2,
  Ruler,
  Scale,
  ArrowRight,
  ArrowLeft,
  Info,
  Building2,
  FolderTree,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { downloadCsv } from '../../lib/exportUtils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Product, Warehouse } from '../../types/fx';
import { api } from '../../services/api';
import { AgGridColumnSidebar, AgGridSidebarToggleBtn } from '../common/AgGridColumnSidebar';

const STORAGE_GRID_KEY = 'fx_products_grid_state_v1';
const STORAGE_UNITS_KEY = 'fx_stock_units_v1';
const STORAGE_CATEGORIES_KEY = 'fx_stock_categories_v1';
const STORAGE_BRANDS_KEY = 'fx_stock_brands_v1';
const STORAGE_SUPPLIERS_KEY = 'fx_stock_suppliers_v1';

// Güvenli LocalStorage ayrıştırma ve kaydetme yardımcıları (bozuk JSON veya array olmayan veri çökmelerini engeller)
const safeParseArray = (key: string, fallback: string[]): string[] => {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return fallback;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const safeSetItem = (key: string, value: any): void => {
  try {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  } catch (e) {
    console.warn(`LocalStorage write error for ${key}:`, e);
  }
};

// EAN-13 Standart Modulo-10 Kontrol Hanesi Doğrulama ve Matematiksel Barkod Üretme Algoritması
export const isValidEan13 = (barcode: string): boolean => {
  if (!/^\d{13}$/.test(barcode)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(barcode[i], 10) * (i % 2 === 0 ? 1 : 3);
  }
  const checksum = (10 - (sum % 10)) % 10;
  return checksum === parseInt(barcode[12], 10);
};

export const generateValidEan13 = (): string => {
  // 869 Türkiye prefiksi + 9 rastgele hane = 12 hane
  const random9 = Math.floor(100000000 + Math.random() * 900000000).toString();
  const prefix12 = `869${random9}`;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(prefix12[i], 10) * (i % 2 === 0 ? 1 : 3);
  }
  const checksum = (10 - (sum % 10)) % 10;
  return `${prefix12}${checksum}`;
};

export interface ShippingCostResult {
  companyName: string;
  rateTitle: string;
  desi: number;
  basePrice: number;
  extraPrice: number;
  totalPrice: number;
  currency: string;
  matched: boolean;
}

const DEFAULT_UNIT_TYPES = ['Adet', 'KG', 'Metre', 'Litre', 'Paket', 'Koli', 'Rulo', 'Gram', 'Ton', 'Kutu', 'Set', 'Palet'];
const SYSTEM_UNIT_TYPES = new Set(['Adet', 'KG', 'Metre', 'Litre', 'Paket', 'Koli']);

const DEFAULT_CATEGORY_GROUPS = [
  'Hava Filtrasyonu',
  'Hidrolik & Yağlama',
  'Su Arıtma & Membran',
  'Gaz Filtrasyonu',
  'Sıvı Filtrasyon Ekipmanı',
  'Elektronik & Donanım',
  'Yedek Parça',
  'Kimyasal & Sarf',
  'Genel'
];
const SYSTEM_CATEGORY_GROUPS = new Set([
  'Hava Filtrasyonu',
  'Hidrolik & Yağlama',
  'Su Arıtma & Membran',
  'Gaz Filtrasyonu',
  'Sıvı Filtrasyon Ekipmanı'
]);

const DEFAULT_BRAND_NAMES = [
  'FX AirPro',
  'FX HydroClean',
  'FX AquaPure',
  'FX CarbonGuard',
  'FX SteelLine',
  'Filtrex',
  'Cisco',
  'Schneider Electric',
  'Bosch Rexroth',
  'Donaldson',
  'Mann-Filter',
  'Parker Hannifin',
  'Siemens'
];
const SYSTEM_BRAND_NAMES = new Set(['FX AirPro', 'FX HydroClean', 'FX AquaPure', 'FX CarbonGuard', 'FX SteelLine', 'Filtrex']);

const DEFAULT_SUPPLIER_TITLES = [
  'Filtrex Filtre Teknolojileri San. Tic. A.Ş.',
  'Hidrolik Sistemler Tedarik Ltd. Şti.',
  'Membran Kimya Teknolojileri A.Ş.',
  'Karbon Filtrasyon Ürünleri Ltd.',
  'Metal Sanayi ve Boru Profil A.Ş.',
  'Penta Teknoloji A.Ş.',
  'Endüstriyel Parça İthalat Ltd.'
];
const SYSTEM_SUPPLIER_TITLES = new Set([
  'Filtrex Filtre Teknolojileri San. Tic. A.Ş.',
  'Hidrolik Sistemler Tedarik Ltd. Şti.',
  'Membran Kimya Teknolojileri A.Ş.'
]);

interface LookupManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon: React.ReactNode;
  listLabel: string;
  addLabel: string;
  items: string[];
  selectedItem: string;
  onSelect: (item: string) => void;
  onAdd: (item: string) => void;
  onDelete: (item: string) => void;
  systemItems: Set<string>;
  placeholder: string;
  inputValue: string;
  onInputChange: (val: string) => void;
}

const LookupManagerModal: React.FC<LookupManagerModalProps> = ({
  isOpen,
  onClose,
  title,
  icon,
  listLabel,
  addLabel,
  items,
  selectedItem,
  onSelect,
  onAdd,
  onDelete,
  systemItems,
  placeholder,
  inputValue,
  onInputChange,
}) => {
  if (!isOpen) return null;

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (trimmed) {
      onAdd(trimmed);
      onInputChange('');
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-stone-200 rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-stone-900">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <h4 className="font-bold text-sm text-stone-900 flex items-center gap-2">
            {icon}
            <span>{title}</span>
          </h4>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-700">
            <span>{listLabel}</span>
            <span className="text-stone-400 text-[11px] font-normal">{items.length} kayıt</span>
          </div>
          <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 border border-stone-100 rounded-lg p-1.5 bg-stone-50/50">
            {items.length === 0 ? (
              <p className="text-xs text-stone-400 text-center py-4">Henüz kayıt bulunmuyor.</p>
            ) : (
              items.map((item) => {
                const isSelected = selectedItem === item;
                const isSystem = systemItems.has(item);
                return (
                  <div
                    key={item}
                    className={`flex items-center justify-between p-2 rounded-lg border text-xs transition-colors ${
                      isSelected
                        ? 'bg-indigo-50/80 border-indigo-300 text-indigo-900 font-semibold'
                        : 'bg-white border-stone-200 text-stone-700 hover:border-stone-300'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate pr-2">
                      {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                      <span className="truncate">{item}</span>
                      {isSystem && (
                        <span className="text-[10px] text-stone-500 bg-stone-100 border border-stone-200 px-1.5 py-0.5 rounded font-normal shrink-0">
                          Sistem
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          onSelect(item);
                          onClose();
                        }}
                        className={`text-[11px] px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                        }`}
                      >
                        {isSelected ? 'Seçili' : 'Seç'}
                      </button>
                      {!isSystem && (
                        <button
                          type="button"
                          onClick={() => onDelete(item)}
                          className="text-stone-400 hover:text-rose-600 p-1 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          title="Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="pt-2 border-t border-stone-200 space-y-2">
          <label className="text-xs font-semibold text-stone-700">{addLabel}</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder={placeholder}
              className="flex-1 bg-white border border-stone-300 rounded-lg px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAdd();
                }
              }}
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={!inputValue.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ekle</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const getCurrencySymbol = (curr?: string): string => {
  switch (curr) {
    case 'USD':
      return '$';
    case 'EUR':
      return '€';
    case 'GBP':
      return '£';
    case 'TRY':
    default:
      return '₺';
  }
};

interface UrunlerTablosuProps {
  onRefreshStats?: () => void;
}

export const UrunlerTablosu: React.FC<UrunlerTablosuProps> = ({ onRefreshStats }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [quickFilterText, setQuickFilterText] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [gridApi, setGridApi] = useState<GridApi<Product> | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalActiveTab, setModalActiveTab] = useState<'general' | 'logistics'>('general');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [copiedSku, setCopiedSku] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Silme Onay Modalı
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Kargo Hesaplayıcı Mini Modal
  const [shippingCalcProduct, setShippingCalcProduct] = useState<Product | null>(null);
  const [shippingCalcCompany, setShippingCalcCompany] = useState<string>('Yurtiçi Kargo');
  const [shippingCostResult, setShippingCostResult] = useState<ShippingCostResult | null>(null);

  // Yan Panel Sütun Özelleştirici State
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const sidebarButtonRef = useRef<HTMLButtonElement>(null);

  // Form State
  const [formData, setFormData] = useState({
    skuCode: '',
    barcodeEan13: '',
    unitType: 'Adet',
    name: '',
    categoryGroup: '',
    brandName: '',
    supplierTitle: '',
    purchasePrice: 0,
    purchaseDiscountPercent: 0,
    netPurchaseCost: 0,
    profitMarginPercent: 0,
    salePriceExclVat: 0,
    vatRatePercent: 20,
    salePriceInclVat: 0,
    currency: 'TRY',
    // Lojistik & Desi Alanları
    weightGross: 0, // Brüt Ağırlık (KG)
    widthCm: 0, // En (cm)
    lengthCm: 0, // Boy (cm)
    heightCm: 0, // Yükseklik (cm)
    volumeM3: 0, // Hacim (m³)
    calculatedDesi: 0, // Hesaplanan veya Manuel Girilen Desi
    openingStockQuantity: 0,
    defaultWarehouseId: '',
    descriptionNotes: '',
  });

  // Yönetilebilir Dinamik Liste State'leri (+ Ekle / Yönet) - Güvenli LocalStorage ayrıştırma
  const [unitTypes, setUnitTypes] = useState<string[]>(() => safeParseArray(STORAGE_UNITS_KEY, DEFAULT_UNIT_TYPES));
  const [isUnitModalOpen, setIsUnitModalOpen] = useState<boolean>(false);
  const [newUnitInput, setNewUnitInput] = useState<string>('');

  const [categoryGroups, setCategoryGroups] = useState<string[]>(() => safeParseArray(STORAGE_CATEGORIES_KEY, DEFAULT_CATEGORY_GROUPS));
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);
  const [newCategoryInput, setNewCategoryInput] = useState<string>('');

  const [brandNames, setBrandNames] = useState<string[]>(() => safeParseArray(STORAGE_BRANDS_KEY, DEFAULT_BRAND_NAMES));
  const [isBrandModalOpen, setIsBrandModalOpen] = useState<boolean>(false);
  const [newBrandInput, setNewBrandInput] = useState<string>('');

  const [supplierTitles, setSupplierTitles] = useState<string[]>(() => safeParseArray(STORAGE_SUPPLIERS_KEY, DEFAULT_SUPPLIER_TITLES));
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState<boolean>(false);
  const [newSupplierInput, setNewSupplierInput] = useState<string>('');

  // Liste Güncelleme ve Depolama Fonksiyonları
  const handleAddUnit = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    if (!unitTypes.some(u => u.toLowerCase() === trimmed.toLowerCase())) {
      const next = [...unitTypes, trimmed];
      setUnitTypes(next);
      safeSetItem(STORAGE_UNITS_KEY, next);
    }
    setFormData(prev => ({ ...prev, unitType: trimmed }));
  };

  const handleDeleteUnit = (val: string) => {
    const next = unitTypes.filter(u => u !== val);
    setUnitTypes(next);
    safeSetItem(STORAGE_UNITS_KEY, next);
    if (formData.unitType === val) {
      setFormData(prev => ({ ...prev, unitType: next[0] || 'Adet' }));
    }
  };

  const handleAddCategory = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    if (!categoryGroups.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      const next = [...categoryGroups, trimmed];
      setCategoryGroups(next);
      safeSetItem(STORAGE_CATEGORIES_KEY, next);
    }
    setFormData(prev => ({ ...prev, categoryGroup: trimmed }));
  };

  const handleDeleteCategory = (val: string) => {
    const next = categoryGroups.filter(c => c !== val);
    setCategoryGroups(next);
    safeSetItem(STORAGE_CATEGORIES_KEY, next);
    if (formData.categoryGroup === val) {
      setFormData(prev => ({ ...prev, categoryGroup: '' }));
    }
  };

  const handleAddBrand = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    if (!brandNames.some(b => b.toLowerCase() === trimmed.toLowerCase())) {
      const next = [...brandNames, trimmed];
      setBrandNames(next);
      safeSetItem(STORAGE_BRANDS_KEY, next);
    }
    setFormData(prev => ({ ...prev, brandName: trimmed }));
  };

  const handleDeleteBrand = (val: string) => {
    const next = brandNames.filter(b => b !== val);
    setBrandNames(next);
    safeSetItem(STORAGE_BRANDS_KEY, next);
    if (formData.brandName === val) {
      setFormData(prev => ({ ...prev, brandName: '' }));
    }
  };

  const handleAddSupplier = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    if (!supplierTitles.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      const next = [...supplierTitles, trimmed];
      setSupplierTitles(next);
      safeSetItem(STORAGE_SUPPLIERS_KEY, next);
    }
    setFormData(prev => ({ ...prev, supplierTitle: trimmed }));
  };

  const handleDeleteSupplier = (val: string) => {
    const next = supplierTitles.filter(s => s !== val);
    setSupplierTitles(next);
    safeSetItem(STORAGE_SUPPLIERS_KEY, next);
    if (formData.supplierTitle === val) {
      setFormData(prev => ({ ...prev, supplierTitle: '' }));
    }
  };

  // Form seçenekleri için birleştirilmiş dinamik listeler
  const allUnits = useMemo(() => {
    if (formData.unitType && !unitTypes.includes(formData.unitType)) {
      return [formData.unitType, ...unitTypes];
    }
    return unitTypes;
  }, [unitTypes, formData.unitType]);

  const allCategories = useMemo(() => {
    if (formData.categoryGroup && !categoryGroups.includes(formData.categoryGroup)) {
      return [formData.categoryGroup, ...categoryGroups];
    }
    return categoryGroups;
  }, [categoryGroups, formData.categoryGroup]);

  const allBrands = useMemo(() => {
    if (formData.brandName && !brandNames.includes(formData.brandName)) {
      return [formData.brandName, ...brandNames];
    }
    return brandNames;
  }, [brandNames, formData.brandName]);

  const allSuppliers = useMemo(() => {
    if (formData.supplierTitle && !supplierTitles.includes(formData.supplierTitle)) {
      return [formData.supplierTitle, ...supplierTitles];
    }
    return supplierTitles;
  }, [supplierTitles, formData.supplierTitle]);

  const loadData = async () => {
    setLoading(true);
    try {
      const prodRes = await api.getProducts();
      const whRes = await api.getWarehouses();
      if (prodRes.success && prodRes.data) {
        setProducts(prodRes.data);
      } else if (!prodRes.success) {
        setFeedback({ type: 'error', message: prodRes.message || 'Ürün listesi yüklenemedi.' });
      }
      if (whRes.success && whRes.data) {
        setWarehouses(whRes.data);
      }
      if (onRefreshStats) onRefreshStats();
    } catch (err: any) {
      console.error('Ürünler yüklenirken hata oluştu:', err);
      setFeedback({ type: 'error', message: err?.message || 'Veriler yüklenirken bağlantı hatası oluştu.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Form Fiyatlandırma Otomasyonu (Alış İskontosu, Net Maliyet, Kâr Marjı, KDV Dahil Satış)
  const handlePriceCalculation = (field: string, val: any) => {
    let numVal = val === '' ? 0 : Number(val);
    if (isNaN(numVal)) numVal = 0;

    // Sınır korumaları (negatif fiyat veya %100 üstü iskonto engelleme)
    if (field === 'purchaseDiscountPercent') {
      numVal = Math.min(100, Math.max(0, numVal));
    } else if (field === 'purchasePrice' || field === 'salePriceExclVat' || field === 'vatRatePercent') {
      numVal = Math.max(0, numVal);
    }

    const next = { ...formData, [field]: numVal };
    const pPrice = field === 'purchasePrice' ? numVal : Number(next.purchasePrice) || 0;
    const pDisc = field === 'purchaseDiscountPercent' ? numVal : Number(next.purchaseDiscountPercent) || 0;
    
    // 1. Net Alış Maliyeti
    const netCost = pPrice * (1 - pDisc / 100);
    next.netPurchaseCost = Math.round(netCost * 10000) / 10000;

    // 2. Satış Fiyatı ve Kâr Marjı (Markup) Etkileşimi
    let profit = field === 'profitMarginPercent' ? numVal : Number(next.profitMarginPercent) || 0;
    let sPriceExcl = field === 'salePriceExclVat' ? numVal : Number(next.salePriceExclVat) || 0;

    if (field === 'profitMarginPercent' || field === 'purchasePrice' || field === 'purchaseDiscountPercent') {
      sPriceExcl = next.netPurchaseCost * (1 + profit / 100);
      next.salePriceExclVat = Math.round(sPriceExcl * 10000) / 10000;
    } else if (field === 'salePriceExclVat') {
      if (next.netPurchaseCost > 0) {
        profit = ((sPriceExcl - next.netPurchaseCost) / next.netPurchaseCost) * 100;
        next.profitMarginPercent = Math.round(profit * 100) / 100;
      }
    }

    // 3. KDV Dahil Satış Fiyatı
    const vat = field === 'vatRatePercent' ? numVal : Number(next.vatRatePercent) || 20;
    const sPriceIncl = next.salePriceExclVat * (1 + vat / 100);
    next.salePriceInclVat = Math.round(sPriceIncl * 10000) / 10000;

    setFormData(next);
  };

  // Form Lojistik & Desi Otomasyonu (En x Boy x Yükseklik / 3000 veya Direkt Desi Girişi)
  const handleLogisticsCalculation = (
    field: 'widthCm' | 'lengthCm' | 'heightCm' | 'volumeM3' | 'calculatedDesi' | 'weightGross',
    val: any
  ) => {
    let num = val === '' ? 0 : Number(val);
    if (isNaN(num)) num = 0;
    num = Math.max(0, num);

    const next = { ...formData, [field]: num };

    if (field === 'widthCm' || field === 'lengthCm' || field === 'heightCm') {
      const w = field === 'widthCm' ? num : Number(next.widthCm) || 0;
      const l = field === 'lengthCm' ? num : Number(next.lengthCm) || 0;
      const h = field === 'heightCm' ? num : Number(next.heightCm) || 0;

      if (w > 0 && l > 0 && h > 0) {
        // Standart Kargo Desi Formülü: (En x Boy x Yükseklik) / 3000
        const desi = (w * l * h) / 3000;
        next.calculatedDesi = Math.round(desi * 100) / 100;

        // Metreküp Hacim Formülü: (En x Boy x Yükseklik) / 1,000,000 m3
        const vol = (w * l * h) / 1000000;
        next.volumeM3 = Math.round(vol * 100000) / 100000;
      }
    } else if (field === 'volumeM3') {
      if (num > 0) {
        next.calculatedDesi = Math.round(num * 333.33 * 100) / 100;
      }
    } else if (field === 'calculatedDesi') {
      // DİREKT DESİ GİRİLEBİLSİN (Kullanıcı manuel değiştirebilir)
      next.calculatedDesi = num;
      if (num > 0 && (!next.widthCm || !next.lengthCm || !next.heightCm)) {
        next.volumeM3 = Math.round((num / 333.33) * 100000) / 100000;
      }
    } else if (field === 'weightGross') {
      next.weightGross = num;
    }

    setFormData(next);
  };

  const applyPackagePreset = (w: number, l: number, h: number) => {
    const desi = Math.round(((w * l * h) / 3000) * 100) / 100;
    const vol = Math.round(((w * l * h) / 1000000) * 100000) / 100000;
    setFormData((prev) => ({
      ...prev,
      widthCm: w,
      lengthCm: l,
      heightCm: h,
      calculatedDesi: desi,
      volumeM3: vol,
    }));
  };

  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setModalActiveTab('general');
    const newBarcode = generateValidEan13();
    const defaultWhId = warehouses[0]?.id || '';
    setFormData({
      skuCode: `STK-${Date.now().toString().slice(-5)}`,
      barcodeEan13: newBarcode,
      unitType: unitTypes[0] || 'Adet',
      name: '',
      categoryGroup: '',
      brandName: '',
      supplierTitle: '',
      purchasePrice: 0,
      purchaseDiscountPercent: 0,
      netPurchaseCost: 0,
      profitMarginPercent: 0,
      salePriceExclVat: 0,
      vatRatePercent: 20,
      salePriceInclVat: 0,
      currency: 'TRY',
      weightGross: 0,
      widthCm: 0,
      lengthCm: 0,
      heightCm: 0,
      volumeM3: 0,
      calculatedDesi: 0,
      openingStockQuantity: 0,
      defaultWarehouseId: defaultWhId,
      descriptionNotes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    setModalActiveTab('general');
    setFormData({
      skuCode: p.skuCode,
      barcodeEan13: p.barcodeEan13 || '',
      unitType: p.unitType,
      name: p.name,
      categoryGroup: p.categoryGroup || '',
      brandName: p.brandName || '',
      supplierTitle: p.supplierTitle || '',
      purchasePrice: p.purchasePrice,
      purchaseDiscountPercent: p.purchaseDiscountPercent || 0,
      netPurchaseCost: p.netPurchaseCost,
      profitMarginPercent: p.profitMarginPercent || 0,
      salePriceExclVat: p.salePriceExclVat,
      vatRatePercent: p.vatRatePercent,
      salePriceInclVat: p.salePriceInclVat,
      currency: p.currency,
      weightGross: p.weightGross || 0,
      widthCm: p.widthCm || 0,
      lengthCm: p.lengthCm || 0,
      heightCm: p.heightCm || 0,
      volumeM3: p.volumeM3 || 0,
      calculatedDesi: p.calculatedDesi || 0,
      openingStockQuantity: p.openingStockQuantity || 0,
      defaultWarehouseId: warehouses[0]?.id || '',
      descriptionNotes: p.descriptionNotes || '',
    });
    setIsModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    try {
      const res = await api.deleteProduct(productToDelete.id);
      if (res.success) {
        setFeedback({ type: 'success', message: res.message || 'Ürün başarıyla silindi.' });
        loadData();
      } else {
        setFeedback({ type: 'error', message: res.message || 'Ürün silinemedi.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Ürün silinemedi.' });
    } finally {
      setProductToDelete(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedSku = formData.skuCode.trim();
    const trimmedName = formData.name.trim();
    const trimmedUnit = formData.unitType.trim();

    // 1. Temel Zorunlu Alan Kontrolleri (Sekme bağımsız yakalama)
    if (!trimmedSku) {
      setFeedback({ type: 'error', message: 'Lütfen Ürün Kodu alanını doldurunuz.' });
      setModalActiveTab('general');
      return;
    }
    if (!trimmedName) {
      setFeedback({ type: 'error', message: 'Lütfen Ürün Adı alanını doldurunuz.' });
      setModalActiveTab('general');
      return;
    }
    if (!trimmedUnit) {
      setFeedback({ type: 'error', message: 'Lütfen Ölçü Birimi seçiniz.' });
      setModalActiveTab('general');
      return;
    }

    // 2. Fiyat & İskonto Sınır Kontrolleri
    if (formData.purchaseDiscountPercent < 0 || formData.purchaseDiscountPercent > 100) {
      setFeedback({ type: 'error', message: 'Alış iskontosu %0 ile %100 arasında olmalıdır.' });
      setModalActiveTab('general');
      return;
    }
    if (formData.purchasePrice < 0 || formData.salePriceExclVat < 0) {
      setFeedback({ type: 'error', message: 'Alış ve satış fiyatları negatif olamaz.' });
      setModalActiveTab('general');
      return;
    }

    // 3. Ürün Kodu Benzersizlik Kontrolü
    const isDuplicateSku = products.some(
      p => p.skuCode.toLowerCase() === trimmedSku.toLowerCase() && p.id !== editingProduct?.id
    );
    if (isDuplicateSku) {
      setFeedback({ type: 'error', message: `"${trimmedSku}" ürün kodu zaten başka bir üründe tanımlıdır.` });
      setModalActiveTab('general');
      return;
    }

    // 4. EAN-13 Barkod Kontrol Hanesi ve Benzersizlik Kontrolü
    const barcode = formData.barcodeEan13 ? formData.barcodeEan13.trim() : '';
    if (barcode) {
      if (barcode.length === 13 && !isValidEan13(barcode)) {
        setFeedback({ type: 'error', message: 'Girilen EAN-13 barkodunun kontrol hanesi (checksum) geçersizdir.' });
        setModalActiveTab('general');
        return;
      }
      const isDuplicateBarcode = products.some(
        p => p.barcodeEan13 && p.barcodeEan13.trim() === barcode && p.id !== editingProduct?.id
      );
      if (isDuplicateBarcode) {
        setFeedback({ type: 'error', message: `"${barcode}" barkodu başka bir üründe zaten kayıtlıdır.` });
        setModalActiveTab('general');
        return;
      }
    }

    try {
      if (editingProduct) {
        // Düzenleme modunda depo kaydını ayıkla (geçmiş açılış stoku etkilenmez)
        const { defaultWarehouseId: _unused, ...updatePayload } = formData;
        const res = await api.updateProduct(editingProduct.id, {
          ...updatePayload,
          skuCode: trimmedSku,
          name: trimmedName,
          unitType: trimmedUnit,
          barcodeEan13: barcode,
        });

        if (!res.success) {
          setFeedback({ type: 'error', message: res.message || 'Ürün güncellenemedi.' });
          return; // Modal açık kalsın
        }

        setFeedback({ type: 'success', message: res.message || 'Ürün güncellendi.' });
      } else {
        const res = await api.createProduct({
          ...formData,
          tenantId: 'tenant-1',
          skuCode: trimmedSku,
          name: trimmedName,
          unitType: trimmedUnit,
          barcodeEan13: barcode,
        });

        if (!res.success) {
          setFeedback({ type: 'error', message: res.message || 'Yeni ürün kaydedilemedi.' });
          return; // Modal açık kalsın
        }

        setFeedback({ type: 'success', message: res.message || 'Yeni ürün başarıyla eklendi.' });
      }

      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Kayıt sırasında bir hata oluştu.' });
    }
  };

  const handleDeleteProduct = async (productId: string, productName: string) => {
    try {
      const res = await api.deleteProduct(productId);
      if (res.success) {
        setFeedback({ type: 'success', message: `"${productName}" ürünü başarıyla silindi.` });
        await loadData();
      } else {
        setFeedback({ type: 'error', message: res.message || 'Ürün silinemedi.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Ürün silinirken bir hata oluştu.' });
    }
  };

  const handleCopySku = (sku: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(sku).then(() => {
        setCopiedSku(sku);
        setTimeout(() => setCopiedSku(null), 2000);
      }).catch(() => {
        setCopiedSku(sku);
        setTimeout(() => setCopiedSku(null), 2000);
      });
    } else {
      setCopiedSku(sku);
      setTimeout(() => setCopiedSku(null), 2000);
    }
  };

  const calculateForProduct = (product: Product, carrier: string) => {
    const desi = product.calculatedDesi && product.calculatedDesi > 0 ? product.calculatedDesi : 2;
    const result = api.calculateShippingCost(carrier, desi);
    setShippingCostResult(result);
  };

  const openShippingCalculator = (product: Product) => {
    setShippingCalcProduct(product);
    setShippingCalcCompany('Yurtiçi Kargo');
    calculateForProduct(product, 'Yurtiçi Kargo');
  };

  // AG Grid Sütun Tanımları (Formdaki tüm 22 alan ile %100 senkronize)
  const columnDefs = useMemo<ColDef<Product>[]>(() => [
    {
      colId: 'skuCode',
      field: 'skuCode',
      headerName: 'Ürün Kodu',
      minWidth: 150,
      width: 160,
      pinned: 'left',
      cellRenderer: (params: ICellRendererParams<Product>) => {
        const sku = params.value || '-';
        const isCopied = copiedSku === sku;
        return (
          <div className="flex items-center gap-1.5 h-full">
            <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded">
              {sku}
            </span>
            {sku !== '-' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopySku(sku);
                }}
                title={isCopied ? 'Kopyalandı!' : 'Kodu Kopyala'}
                className="p-1 text-stone-400 hover:text-indigo-600 hover:bg-stone-100 rounded transition-colors cursor-pointer"
              >
                {isCopied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
        );
      },
    },
    {
      colId: 'barcodeEan13',
      field: 'barcodeEan13',
      headerName: 'Barkod (Ean-13)',
      minWidth: 140,
      width: 150,
      cellRenderer: (params: ICellRendererParams<Product>) => {
        const barcode = params.value;
        if (!barcode) return <span className="text-stone-300 text-xs italic">-</span>;
        return (
          <div className="flex items-center gap-1 font-mono text-xs text-stone-700 h-full">
            <Barcode className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span className="tracking-wider">{barcode}</span>
          </div>
        );
      },
    },
    {
      colId: 'name',
      field: 'name',
      headerName: 'Ürün Adı',
      minWidth: 220,
      flex: 2,
      cellRenderer: (params: ICellRendererParams<Product>) => {
        const d = params.data;
        if (!d) return null;
        return (
          <div className="flex flex-col justify-center h-full py-1">
            <span className="text-xs font-bold text-stone-900 truncate" title={d.name}>
              {d.name}
            </span>
            {d.descriptionNotes && (
              <span className="text-[10px] text-stone-400 truncate max-w-xs" title={d.descriptionNotes}>
                {d.descriptionNotes}
              </span>
            )}
          </div>
        );
      },
    },
    {
      colId: 'brandName',
      field: 'brandName',
      headerName: 'Marka',
      minWidth: 120,
      width: 135,
      cellRenderer: (params: ICellRendererParams<Product>) => {
        const val = params.value;
        if (!val) return <span className="text-stone-300 text-xs italic">-</span>;
        return (
          <div className="flex items-center gap-1 h-full">
            <Tag className="w-3 h-3 text-indigo-500 shrink-0" />
            <span className="text-xs font-semibold text-stone-800 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded truncate">
              {val}
            </span>
          </div>
        );
      },
    },
    {
      colId: 'categoryGroup',
      field: 'categoryGroup',
      headerName: 'Kategori / Grup',
      minWidth: 150,
      width: 170,
      cellRenderer: (params: ICellRendererParams<Product>) => {
        const val = params.value;
        if (!val) return <span className="text-stone-300 text-xs italic">-</span>;
        return (
          <span className="inline-flex items-center text-xs font-medium text-indigo-700 bg-indigo-50/80 border border-indigo-100 px-2 py-0.5 rounded truncate">
            {val}
          </span>
        );
      },
    },
    {
      colId: 'supplierTitle',
      field: 'supplierTitle',
      headerName: 'Tedarikçi / Firma',
      minWidth: 170,
      width: 190,
      cellRenderer: (params: ICellRendererParams<Product>) => {
        const val = params.value;
        if (!val) return <span className="text-stone-300 text-xs italic">-</span>;
        return (
          <div className="flex items-center gap-1.5 text-xs text-stone-700 h-full truncate" title={val}>
            <Building2 className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span className="font-medium truncate">{val}</span>
          </div>
        );
      },
    },
    {
      colId: 'unitType',
      field: 'unitType',
      headerName: 'Birim',
      width: 95,
      cellRenderer: (params: ICellRendererParams<Product>) => (
        <span className="inline-flex items-center text-xs font-semibold text-stone-700 bg-stone-100 px-2 py-0.5 rounded">
          {params.value || 'Adet'}
        </span>
      ),
    },
    {
      colId: 'currency',
      field: 'currency',
      headerName: 'Para Birimi',
      width: 100,
      cellRenderer: (params: ICellRendererParams<Product>) => {
        const curr = params.value || 'TRY';
        return (
          <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-stone-800 bg-stone-100 px-2 py-0.5 rounded border border-stone-200/70">
            <span>{getCurrencySymbol(curr)}</span>
            <span className="text-[10px] text-stone-500">{curr}</span>
          </span>
        );
      },
    },
    {
      colId: 'purchasePrice',
      field: 'purchasePrice',
      headerName: 'Liste Alış Fiyatı',
      width: 135,
      cellRenderer: (params: ICellRendererParams<Product>) => {
        const d = params.data;
        if (!d) return null;
        const sym = getCurrencySymbol(d.currency);
        return (
          <div className="flex items-center justify-end font-mono text-xs text-stone-600 h-full pr-1">
            {sym}{Number(d.purchasePrice || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        );
      },
    },
    {
      colId: 'purchaseDiscountPercent',
      field: 'purchaseDiscountPercent',
      headerName: 'İskonto %',
      width: 100,
      cellRenderer: (params: ICellRendererParams<Product>) => {
        const val = Number(params.value || 0);
        return (
          <div className="flex items-center justify-center h-full">
            <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded ${
              val > 0 ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'text-stone-400'
            }`}>
              %{val}
            </span>
          </div>
        );
      },
    },
    {
      colId: 'netPurchaseCost',
      field: 'netPurchaseCost',
      headerName: 'Net Alış Maliyeti',
      width: 145,
      cellRenderer: (params: ICellRendererParams<Product>) => {
        const d = params.data;
        if (!d) return null;
        const sym = getCurrencySymbol(d.currency);
        return (
          <div className="flex flex-col justify-center h-full text-right pr-1">
            <span className="text-xs font-mono font-bold text-stone-900">
              {sym}{Number(d.netPurchaseCost || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        );
      },
    },
    {
      colId: 'profitMarginPercent',
      field: 'profitMarginPercent',
      headerName: 'Kâr Marjı %',
      width: 110,
      cellRenderer: (params: ICellRendererParams<Product>) => {
        const val = params.value || 0;
        return (
          <div className="flex items-center justify-center h-full">
            <span className="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
              <TrendingUp className="w-3 h-3 text-emerald-600" />
              %{Number(val).toFixed(1)}
            </span>
          </div>
        );
      },
    },
    {
      colId: 'salePriceExclVat',
      field: 'salePriceExclVat',
      headerName: 'Satış (Kdv Hariç)',
      width: 150,
      cellRenderer: (params: ICellRendererParams<Product>) => {
        const d = params.data;
        if (!d) return null;
        const sym = getCurrencySymbol(d.currency);
        return (
          <div className="flex items-center justify-end font-mono text-xs font-bold text-indigo-950 h-full pr-1">
            {sym}{Number(d.salePriceExclVat || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        );
      },
    },
    {
      colId: 'vatRatePercent',
      field: 'vatRatePercent',
      headerName: 'Kdv %',
      width: 90,
      cellRenderer: (params: ICellRendererParams<Product>) => (
        <div className="flex items-center justify-center h-full">
          <span className="text-xs font-mono font-semibold text-stone-700 bg-stone-100 px-2 py-0.5 rounded">
            %{params.value ?? 20}
          </span>
        </div>
      ),
    },
    {
      colId: 'salePriceInclVat',
      field: 'salePriceInclVat',
      headerName: 'Satış (Kdv Dahil)',
      width: 155,
      cellRenderer: (params: ICellRendererParams<Product>) => {
        const d = params.data;
        if (!d) return null;
        const sym = getCurrencySymbol(d.currency);
        return (
          <div className="flex items-center justify-end font-mono text-xs font-extrabold text-emerald-700 h-full pr-1">
            {sym}{Number(d.salePriceInclVat || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        );
      },
    },
    {
      colId: 'netProfit',
      headerName: 'Birim Net Kâr',
      width: 140,
      valueGetter: (params) => {
        const d = params.data;
        if (!d) return 0;
        return (d.salePriceExclVat || 0) - (d.netPurchaseCost || 0);
      },
      cellRenderer: (params: ICellRendererParams<Product>) => {
        const d = params.data;
        if (!d) return null;
        const sym = getCurrencySymbol(d.currency);
        const profit = (d.salePriceExclVat || 0) - (d.netPurchaseCost || 0);
        const isLoss = profit < 0;
        return (
          <div className={`flex items-center justify-end font-mono text-xs font-bold h-full pr-1 ${isLoss ? 'text-rose-700' : 'text-emerald-800'}`}>
            {isLoss ? '-' : '+'}{sym}{Math.abs(profit).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        );
      },
    },
    {
      colId: 'weightGross',
      field: 'weightGross',
      headerName: 'Brüt Ağırlık',
      width: 115,
      cellRenderer: (params: ICellRendererParams<Product>) => {
        const val = Number(params.value || 0);
        return (
          <div className="flex items-center gap-1 font-mono text-xs text-stone-700 h-full">
            <Scale className="w-3.5 h-3.5 text-stone-400" />
            <span>{val.toFixed(2)} KG</span>
          </div>
        );
      },
    },
    {
      colId: 'dimensions',
      headerName: 'Ebatlar (E×b×y)',
      width: 145,
      valueGetter: (params) => {
        const d = params.data;
        if (!d || (!d.widthCm && !d.lengthCm && !d.heightCm)) return '-';
        return `${d.widthCm || 0}×${d.lengthCm || 0}×${d.heightCm || 0} cm`;
      },
      cellRenderer: (params: ICellRendererParams<Product>) => {
        const d = params.data;
        if (!d || (!d.widthCm && !d.lengthCm && !d.heightCm)) return <span className="text-stone-300 text-xs italic">-</span>;
        return (
          <div className="flex items-center gap-1 font-mono text-xs text-stone-700 h-full">
            <Ruler className="w-3.5 h-3.5 text-stone-400" />
            <span>{d.widthCm}×{d.lengthCm}×{d.heightCm} cm</span>
          </div>
        );
      },
    },
    {
      colId: 'volumeM3',
      field: 'volumeM3',
      headerName: 'Hacim (M³)',
      width: 115,
      cellRenderer: (params: ICellRendererParams<Product>) => {
        const val = Number(params.value || 0);
        if (!val) return <span className="text-stone-300 text-xs italic">-</span>;
        return (
          <span className="font-mono text-xs text-stone-700">
            {val.toFixed(4)} m³
          </span>
        );
      },
    },
    {
      colId: 'calculatedDesi',
      field: 'calculatedDesi',
      headerName: 'Desi (Kargo)',
      width: 155,
      cellRenderer: (params: ICellRendererParams<Product>) => {
        const d = params.data;
        if (!d) return null;
        const desi = d.calculatedDesi || 0;
        return (
          <div className="flex items-center justify-between gap-1.5 h-full">
            <span className="text-xs font-mono font-bold text-amber-900 bg-amber-50 border border-amber-200/90 px-2 py-0.5 rounded">
              {desi} Desi
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                openShippingCalculator(d);
              }}
              title="Kargo Maliyetini Simüle Et"
              className="p-1 text-stone-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors shrink-0"
            >
              <Truck className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      },
    },
    {
      colId: 'openingStockQuantity',
      field: 'openingStockQuantity',
      headerName: 'Açılış Stoku',
      width: 125,
      cellRenderer: (params: ICellRendererParams<Product>) => {
        const qty = params.value || 0;
        return (
          <span className="text-xs font-mono font-semibold text-stone-800 bg-stone-100 px-2 py-0.5 rounded">
            {Number(qty).toLocaleString('tr-TR')} {params.data?.unitType || 'Adet'}
          </span>
        );
      },
    },
    {
      colId: 'descriptionNotes',
      field: 'descriptionNotes',
      headerName: 'Açıklama & Notlar',
      minWidth: 160,
      width: 200,
      cellRenderer: (params: ICellRendererParams<Product>) => {
        const val = params.value;
        if (!val) return <span className="text-stone-300 text-xs italic">-</span>;
        return (
          <span className="text-xs text-stone-600 truncate block h-full flex items-center" title={val}>
            {val}
          </span>
        );
      },
    },
    {
      colId: 'actions',
      headerName: 'İşlemler',
      width: 100,
      pinned: 'right',
      cellRenderer: (params: ICellRendererParams<Product>) => {
        const p = params.data;
        if (!p) return null;
        return (
          <div className="flex items-center gap-1 h-full">
            <button
              onClick={() => handleOpenEditModal(p)}
              className="p-1.5 text-stone-500 hover:text-indigo-600 hover:bg-stone-100 rounded transition-colors cursor-pointer"
              title="Düzenle"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setProductToDelete(p)}
              className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
              title="Sil"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      },
    },
  ], [copiedSku]);

  // Kategori Filtresi
  const categories = useMemo(() => {
    const set = new Set(products.map(p => p.categoryGroup).filter(Boolean));
    return Array.from(set) as string[];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCategory = selectedCategory === 'ALL' || p.categoryGroup === selectedCategory;
      const search = quickFilterText.trim().toLowerCase();
      const matchQuick = !search || 
        (p.name && p.name.toLowerCase().includes(search)) ||
        (p.skuCode && p.skuCode.toLowerCase().includes(search)) ||
        (p.barcodeEan13 && p.barcodeEan13.toLowerCase().includes(search)) ||
        (p.brandName && p.brandName.toLowerCase().includes(search)) ||
        (p.supplierTitle && p.supplierTitle.toLowerCase().includes(search)) ||
        (p.categoryGroup && p.categoryGroup.toLowerCase().includes(search)) ||
        (p.descriptionNotes && p.descriptionNotes.toLowerCase().includes(search));
      return matchCategory && matchQuick;
    });
  }, [products, selectedCategory, quickFilterText]);

  // Excel ve PDF dışa aktarma için AG Grid filtre ve sıralamasını dikkate alan veri toplayıcı
  const getExportRows = (): Product[] => {
    if (gridApi) {
      const rows: Product[] = [];
      gridApi.forEachNodeAfterFilterAndSort((node) => {
        if (node.data) rows.push(node.data);
      });
      if (rows.length > 0) return rows;
    }
    return filteredProducts;
  };

  // Excel Dışa Aktarma (Tüm 22 Form Alanını ve Doğru Kâr/Zarar Değerini İçerir)
  const exportToExcel = () => {
    const rows = getExportRows();
    const data = rows.map(p => {
      const netProfit = (p.salePriceExclVat || 0) - (p.netPurchaseCost || 0);
      return {
        'Ürün Kodu': p.skuCode,
        'Barkod': p.barcodeEan13 || '',
        'Ürün Adı': p.name,
        'Marka': p.brandName || '',
        'Kategori / Grup': p.categoryGroup || '',
        'Tedarikçi Firma': p.supplierTitle || '',
        'Ölçü Birimi': p.unitType,
        'Para Birimi': p.currency || 'TRY',
        'Liste Alış Fiyatı': p.purchasePrice,
        'Alış İskonto (%)': p.purchaseDiscountPercent || 0,
        'Net Alış Maliyeti': p.netPurchaseCost,
        'Kâr Marjı (%)': p.profitMarginPercent || 0,
        'Satış Fiyatı (KDV Hariç)': p.salePriceExclVat,
        'KDV Oranı (%)': p.vatRatePercent,
        'Satış Fiyatı (KDV Dahil)': p.salePriceInclVat,
        'Birim Net Kâr': netProfit,
        'Brüt Ağırlık (KG)': p.weightGross || 0,
        'En (cm)': p.widthCm || 0,
        'Boy (cm)': p.lengthCm || 0,
        'Yükseklik (cm)': p.heightCm || 0,
        'Hacim (m³)': p.volumeM3 || 0,
        'Desi (Kargo)': p.calculatedDesi || 0,
        'Açılış Stok Miktarı': p.openingStockQuantity || 0,
        'Açıklama & Notlar': p.descriptionNotes || '',
      };
    });
    downloadCsv(`Urun_Katalogu_Detayli_${new Date().toISOString().slice(0, 10)}.csv`, data);
  };

  // PDF Dışa Aktarma
  const exportToPdf = () => {
    const rows = getExportRows();
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('FX Enterprise ERP - Ürün Kataloğu & Fiyat Listesi', 14, 15);
    doc.setFontSize(9);
    doc.text(`Tarih: ${new Date().toLocaleString('tr-TR')} | Toplam Ürün: ${rows.length}`, 14, 22);

    const body = rows.map(p => {
      const sym = getCurrencySymbol(p.currency);
      const code = p.currency || 'TRY';
      return [
        p.skuCode,
        p.barcodeEan13 || '-',
        p.name,
        p.brandName || '-',
        p.categoryGroup || '-',
        p.supplierTitle || '-',
        p.unitType,
        `${sym}${p.netPurchaseCost.toFixed(2)} (${code})`,
        `%${p.profitMarginPercent || 0}`,
        `${sym}${p.salePriceInclVat.toFixed(2)}`,
        `${p.calculatedDesi || 0} Desi`,
        `${p.openingStockQuantity || 0}`,
      ];
    });

    autoTable(doc, {
      head: [['Ürün Kodu', 'Barkod', 'Ürün Adı', 'Marka', 'Kategori', 'Tedarikçi', 'Birim', 'Net Maliyet', 'Kâr %', 'KDV Dahil Satış', 'Desi', 'Açılış Stoku']],
      body,
      startY: 26,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [49, 46, 129] },
    });

    doc.save(`Urun_Katalogu_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const onGridReady = (params: GridReadyEvent<Product>) => {
    setGridApi(params.api);
    try {
      const savedState = localStorage.getItem(STORAGE_GRID_KEY);
      if (savedState) {
        params.api.applyColumnState({
          state: JSON.parse(savedState),
          applyOrder: true,
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
    }),
    []
  );

  // AG Grid rowSelection ayarları
  const rowSelection = useMemo<RowSelectionOptions<Product>>(
    () => ({
      mode: 'singleRow',
      checkboxes: false,
      enableClickSelection: true,
    }),
    []
  );

  const [gridColumnsRevision, setGridColumnsRevision] = useState<number>(0);

  const saveGridState = () => {
    if (!gridApi) return;
    try {
      const state = gridApi.getColumnState();
      localStorage.setItem(STORAGE_GRID_KEY, JSON.stringify(state));
      setGridColumnsRevision(prev => prev + 1);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-3">
      {/* Geri bildirim */}
      {feedback && (
        <div
          className={`p-3 rounded-lg text-xs font-medium flex items-center justify-between transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <X className="w-4 h-4 text-rose-600" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-stone-400 hover:text-stone-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Kontrol ve Filtre Çubuğu */}
      <div className="bg-white border border-stone-200/90 rounded-lg p-3 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Arama ve Kategori Filtresi */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="relative min-w-[220px] max-w-xs">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={quickFilterText}
                onChange={(e) => setQuickFilterText(e.target.value)}
                placeholder="Ürün adı, SKU kodu, barkod veya marka ara..."
                className="w-full pl-9 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-stone-400 text-stone-800"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-md text-xs text-stone-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
            >
              <option value="ALL">Tüm Kategoriler ({products.length})</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Dışa Aktarma, Sütun Özelleştirme ve Yeni Ürün Butonu */}
          <div className="flex items-center gap-2 shrink-0">
            <AgGridSidebarToggleBtn
              isOpen={isSidebarOpen}
              onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
              gridApi={gridApi}
              buttonRef={sidebarButtonRef}
            />

            <button
              onClick={exportToExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-md transition-colors cursor-pointer"
              title="CSV indir"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>CSV</span>
            </button>

            <button
              onClick={exportToPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-md transition-colors cursor-pointer"
              title="PDF İndir"
            >
              <Download className="w-3.5 h-3.5 text-rose-600" />
              <span>PDF</span>
            </button>

            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Ürün Tanımla</span>
            </button>
          </div>
        </div>
      </div>

      {/* AG Grid Tablosu & Kolon Özelleştirici Sidebar */}
      <div className="flex gap-4 items-start relative h-[560px]">
        <div
          className={`bg-white border border-stone-200/90 rounded-lg shadow-xs overflow-hidden transition-all duration-300 ${
            isSidebarOpen ? 'flex-1' : 'w-full'
          }`}
        >
          <div style={{ height: '560px', width: '100%' }}>
            <AgGridReact<Product> theme={appTheme}
              localeText={AG_GRID_LOCALE_TR}
              loading={loading}
              rowData={filteredProducts}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              rowSelection={rowSelection}
              pagination={false}
              onGridReady={onGridReady}
              onColumnMoved={saveGridState}
              onColumnVisible={saveGridState}
              onColumnResized={saveGridState}
              onSortChanged={saveGridState}
              rowHeight={56}
              headerHeight={42}
              animateRows={true}
              enableCellTextSelection={true}
            />
          </div>
        </div>

        {/* ÖZEL SIDEBAR (Gelişmiş Görünüm ve Kolon Özelleştirme Paneli) */}
        {isSidebarOpen && (
          <AgGridColumnSidebar
            gridApi={gridApi}
            onSaveGridState={saveGridState}
            onClose={() => setIsSidebarOpen(false)}
            primaryColIds={['skuCode', 'barcodeEan13', 'name', 'brandName', 'categoryGroup', 'unitType', 'salePriceInclVat', 'calculatedDesi', 'openingStockQuantity', 'actions']}
            sidebarRef={sidebarRef}
            columnsRevision={gridColumnsRevision}
          />
        )}
      </div>

      {/* ========================================================================= */}
      {/* 1. ÜRÜN TANIMLAMA & DÜZENLEME FORMU MODALI (Tam Otomasyon)                */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/45 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white border border-stone-200 rounded-xl max-w-4xl w-full p-5 shadow-2xl my-6 flex flex-col max-h-[92vh]">
            {/* Modal Başlığı */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-stone-900 text-base">
                      {editingProduct ? 'Ürün Kartını Düzenle' : 'Yeni Ürün Kartı Tanımla'}
                    </h3>
                    {formData.skuCode && (
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-stone-100 text-stone-700 rounded border border-stone-200">
                        {formData.skuCode}
                      </span>
                    )}
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-700 rounded border border-indigo-200">
                      {formData.currency || 'TRY'}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Katalog kodu, maliyet, kâr marjı, kur duyarlı fiyatlandırma ve kargo desi lojistik otomasyonu
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 2 SEKME NAVİGASYONU */}
            <div className="flex items-center gap-2 p-1 bg-stone-100/90 rounded-lg border border-stone-200/80 mt-3.5 mb-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => setModalActiveTab('general')}
                className={`flex-1 py-2 px-3 text-xs font-bold rounded-md flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  modalActiveTab === 'general'
                    ? 'bg-white text-indigo-700 shadow-xs border border-stone-200/90'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
                }`}
              >
                <Package className="w-4 h-4 text-indigo-600" />
                <span>1. Genel Bilgiler & Fiyatlandırma</span>
                {formData.name && (
                  <span className="hidden sm:inline text-[10px] font-normal text-stone-400 truncate max-w-[120px]">
                    ({formData.name})
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setModalActiveTab('logistics')}
                className={`flex-1 py-2 px-3 text-xs font-bold rounded-md flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  modalActiveTab === 'logistics'
                    ? 'bg-white text-indigo-700 shadow-xs border border-stone-200/90'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
                }`}
              >
                <Truck className="w-4 h-4 text-amber-600" />
                <span>2. Lojistik & Desi</span>
                {formData.calculatedDesi > 0 ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold">
                    {formData.calculatedDesi} Desi
                  </span>
                ) : (
                  <span className="text-[10px] text-stone-400 font-normal">
                    (En × Boy × Yükseklik)
                  </span>
                )}
              </button>
            </div>

            {/* Modal Formu */}
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto pr-1 space-y-4">
                {/* SEKME 1 İÇERİĞİ */}
                {modalActiveTab === 'general' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    {/* BÖLÜM 1: TEMEL KİMLİK VE ÜRÜN BİLGİLERİ */}
                    <div className="p-3.5 bg-stone-50/90 rounded-xl border border-stone-200/90 space-y-3.5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-indigo-600" />
                          <span>1. Genel Ürün Tanımları & Bilgileri</span>
                        </h4>
                        <span className="text-[11px] font-medium text-stone-500 bg-white px-2 py-0.5 rounded border border-stone-200 shadow-2xs">
                          Temel Bilgiler
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                        {/* 1. Ürün Kodu */}
                        <div className="md:col-span-4">
                          <label className="block text-xs font-semibold text-stone-700 mb-1">
                            Ürün Kodu <span className="text-rose-600">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.skuCode}
                            onChange={(e) => setFormData({ ...formData, skuCode: e.target.value })}
                            placeholder="Örn: STK-00123"
                            className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono font-bold uppercase transition-colors"
                          />
                        </div>

                        {/* 2. EAN-13 Barkod */}
                        <div className="md:col-span-4">
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-semibold text-stone-700">
                              EAN-13 Barkod
                            </label>
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, barcodeEan13: generateValidEan13() }))}
                              className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer transition-colors"
                              title="Yeni Modulo-10 Kontrollü EAN-13 Üret"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>Barkod Üret</span>
                            </button>
                          </div>
                          <div className="relative">
                            <input
                              type="text"
                              maxLength={13}
                              value={formData.barcodeEan13}
                              onChange={(e) => setFormData({ ...formData, barcodeEan13: e.target.value.replace(/\D/g, '').slice(0, 13) })}
                              placeholder="Örn: 8690001234567"
                              className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono transition-colors"
                            />
                            {formData.barcodeEan13 && (
                              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center">
                                {formData.barcodeEan13.length === 13 ? (
                                  isValidEan13(formData.barcodeEan13) ? (
                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-300">
                                      ✓ Geçerli
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-300">
                                      Geçersiz Hane
                                    </span>
                                  )
                                ) : (
                                  <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-300">
                                    {formData.barcodeEan13.length}/13
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 3. Tedarikçi / Firma */}
                        <div className="md:col-span-4">
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-semibold text-stone-700">
                              Tedarikçi / Firma
                            </label>
                            <button
                              type="button"
                              onClick={() => setIsSupplierModalOpen(true)}
                              className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 cursor-pointer transition-colors"
                            >
                              + Ekle / Yönet
                            </button>
                          </div>
                          <select
                            value={formData.supplierTitle}
                            onChange={(e) => setFormData({ ...formData, supplierTitle: e.target.value })}
                            className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium cursor-pointer transition-colors text-stone-800"
                          >
                            <option value="">(Seçiniz / Tanımsız)</option>
                            {allSuppliers.map((sup) => (
                              <option key={sup} value={sup}>
                                {sup}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* 4. Ürün Adı */}
                        <div className="md:col-span-12">
                          <label className="block text-xs font-semibold text-stone-700 mb-1">
                            Ürün Adı <span className="text-rose-600">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Örn: Endüstriyel Switch 24 Port Gigabit"
                            className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium transition-colors text-stone-900"
                          />
                        </div>

                        {/* 5. Marka */}
                        <div className="md:col-span-4">
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-semibold text-stone-700">
                              Marka
                            </label>
                            <button
                              type="button"
                              onClick={() => setIsBrandModalOpen(true)}
                              className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 cursor-pointer transition-colors"
                            >
                              + Ekle / Yönet
                            </button>
                          </div>
                          <select
                            value={formData.brandName}
                            onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                            className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium cursor-pointer transition-colors text-stone-800"
                          >
                            <option value="">(Seçiniz / Tanımsız)</option>
                            {allBrands.map((brand) => (
                              <option key={brand} value={brand}>
                                {brand}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* 6. Kategori / Grup */}
                        <div className="md:col-span-4">
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-semibold text-stone-700">
                              Kategori / Grup
                            </label>
                            <button
                              type="button"
                              onClick={() => setIsCategoryModalOpen(true)}
                              className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 cursor-pointer transition-colors"
                            >
                              + Ekle / Yönet
                            </button>
                          </div>
                          <select
                            value={formData.categoryGroup}
                            onChange={(e) => setFormData({ ...formData, categoryGroup: e.target.value })}
                            className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium cursor-pointer transition-colors text-stone-800"
                          >
                            <option value="">(Seçiniz / Tanımsız)</option>
                            {allCategories.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* 7. Birim */}
                        <div className="md:col-span-4">
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-semibold text-stone-700">
                              Birim <span className="text-rose-600">*</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => setIsUnitModalOpen(true)}
                              className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 cursor-pointer transition-colors"
                            >
                              + Ekle / Yönet
                            </button>
                          </div>
                          <select
                            value={formData.unitType}
                            onChange={(e) => setFormData({ ...formData, unitType: e.target.value })}
                            className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium cursor-pointer transition-colors text-stone-800"
                          >
                            {allUnits.map((unit) => (
                              <option key={unit} value={unit}>
                                {unit}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

              {/* BÖLÜM 2: FİYATLANDIRMA, KÂR ORANI & VERGİLER (OTOMASYON) */}
              <div className="p-3.5 bg-indigo-50/40 rounded-lg border border-indigo-200/80 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-indigo-700" />
                    2. Fiyatlandırma, Kâr Oranı & Vergiler
                  </h4>
                  <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200/60 self-start sm:self-auto">
                    Otomatik Hesaplama & Kur Duyarlı
                  </span>
                </div>

                {/* PARA BİRİMİ SEÇİMİ - ÜSTTE / ÖNCELİKLİ (Alttaki tüm alanların para birimi etiket ve simgelerini dinamik belirler) */}
                <div className="p-2.5 bg-white rounded-lg border border-indigo-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5 whitespace-nowrap">
                      <span>Para Birimi</span>
                      <span className="text-rose-600 font-bold">*</span>
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="px-3 py-1.5 text-xs bg-indigo-50/70 border border-indigo-300 rounded-md font-bold text-indigo-950 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-colors"
                    >
                      <option value="TRY">TRY (₺ - Türk Lirası)</option>
                      <option value="USD">USD ($ - Amerikan Doları)</option>
                      <option value="EUR">EUR (€ - Euro)</option>
                      <option value="GBP">GBP (£ - İngiliz Sterlini)</option>
                    </select>
                  </div>

                  <div className="text-[11px] text-stone-600 flex items-center gap-2">
                    <span className="font-medium">Seçili Fiyatlandırma Birimi:</span>
                    <span className="font-mono font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      {formData.currency || 'TRY'} ({getCurrencySymbol(formData.currency)})
                    </span>
                  </div>
                </div>

                {/* 1. SATIR: ALIŞ FİYATI, İSKONTO, NET MALİYET, KÂR MARJI */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Alış Fiyatı ({formData.currency || 'TRY'})
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        value={formData.purchasePrice}
                        onChange={(e) => handlePriceCalculation('purchasePrice', e.target.value)}
                        className="w-full pl-7 pr-3 py-1.5 text-xs bg-white border border-stone-300 rounded-md font-mono font-bold text-stone-900 focus:ring-2 focus:ring-indigo-500/20"
                      />
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">
                        {getCurrencySymbol(formData.currency)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Alış İskonto (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        value={formData.purchaseDiscountPercent}
                        onChange={(e) => handlePriceCalculation('purchaseDiscountPercent', e.target.value)}
                        className="w-full pl-3 pr-7 py-1.5 text-xs bg-white border border-stone-300 rounded-md font-mono"
                      />
                      <Percent className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-indigo-950 mb-1 flex items-center gap-1">
                      Net Alış Maliyeti ({formData.currency || 'TRY'})
                      <span className="text-[10px] text-indigo-600 font-normal">(İskonto Sonrası)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        readOnly
                        value={formData.netPurchaseCost}
                        className="w-full pl-7 pr-3 py-1.5 text-xs bg-indigo-100/70 border border-indigo-300 rounded-md font-mono font-bold text-indigo-900 cursor-not-allowed"
                      />
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-indigo-700">
                        {getCurrencySymbol(formData.currency)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-emerald-900 mb-1">
                      Kâr Marjı (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.5"
                        value={formData.profitMarginPercent}
                        onChange={(e) => handlePriceCalculation('profitMarginPercent', e.target.value)}
                        className="w-full pl-3 pr-7 py-1.5 text-xs bg-emerald-50 border border-emerald-300 rounded-md font-mono font-bold text-emerald-900"
                      />
                      <Percent className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-600" />
                    </div>
                  </div>
                </div>

                {/* 2. SATIR: SATIŞ FİYATI, KDV ORANI, KDV DAHİL SATIŞ, NET KÂR TUTARI */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Satış Fiyatı ({formData.currency || 'TRY'}) <span className="text-rose-600">*</span>
                      <span className="text-[10px] text-stone-400 block font-normal">KDV Hariç</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formData.salePriceExclVat}
                        onChange={(e) => handlePriceCalculation('salePriceExclVat', e.target.value)}
                        className="w-full pl-7 pr-3 py-1.5 text-xs bg-white border border-stone-300 rounded-md font-mono font-bold text-stone-900 focus:ring-2 focus:ring-indigo-500/20"
                      />
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">
                        {getCurrencySymbol(formData.currency)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      KDV Oranı (%)
                    </label>
                    <select
                      value={formData.vatRatePercent}
                      onChange={(e) => handlePriceCalculation('vatRatePercent', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-md font-medium"
                    >
                      <option value={20}>%20 Standart</option>
                      <option value={10}>%10 Temel Gıda vb.</option>
                      <option value={1}>%1 Teşvikli</option>
                      <option value={0}>%0 Muaf</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-emerald-950 mb-1">
                      Satış (KDV Dahil - {formData.currency || 'TRY'})
                      <span className="text-[10px] text-emerald-600 font-normal block">Nihai Tutar</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        readOnly
                        value={formData.salePriceInclVat}
                        className="w-full pl-7 pr-3 py-1.5 text-xs bg-emerald-100/70 border border-emerald-300 rounded-md font-mono font-bold text-emerald-950 cursor-not-allowed"
                      />
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-800">
                        {getCurrencySymbol(formData.currency)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Birim Net Kâr/Zarar ({formData.currency || 'TRY'})
                      <span className="text-[10px] text-stone-400 block font-normal">KDV Hariç</span>
                    </label>
                    {(() => {
                      const profit = (formData.salePriceExclVat || 0) - (formData.netPurchaseCost || 0);
                      const isLoss = profit < 0;
                      return (
                        <div className={`px-3 py-1.5 text-xs rounded-md font-mono font-bold flex items-center justify-between h-[30px] ${
                          isLoss ? 'bg-rose-50 border border-rose-300 text-rose-700' : 'bg-emerald-50 border border-emerald-300 text-emerald-800'
                        }`}>
                          <span>{isLoss ? '-' : '+'}{getCurrencySymbol(formData.currency)}{Math.abs(profit).toFixed(2)} {isLoss ? '(Zarar)' : ''}</span>
                          <span className="text-[10px] font-semibold text-stone-500">{formData.currency || 'TRY'}</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

                    {/* BÖLÜM 3: AÇILIŞ STOKU & BAŞLANGIÇ DEPOSU */}
                    <div className="p-3 bg-stone-50/80 rounded-lg border border-stone-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                          <WarehouseIcon className="w-3.5 h-3.5 text-indigo-600" />
                          3. Envanter Açılış Bilgileri & Başlangıç Deposu
                        </h4>
                        <span className="text-[11px] text-stone-500 font-medium">
                          {editingProduct ? 'Kayıtlı ürünlerde kilitlidir' : 'Otomatik stok kartı ve giriş fişi üretir'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Açılış Stok Miktarı */}
                        <div>
                          <label className="block text-xs font-semibold text-stone-700 mb-1">
                            Açılış Stok Miktarı ({formData.unitType || 'Adet'})
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              disabled={!!editingProduct}
                              value={formData.openingStockQuantity ?? 0}
                              onChange={(e) => setFormData({ ...formData, openingStockQuantity: Math.max(0, Number(e.target.value) || 0) })}
                              placeholder="0"
                              className={`w-full pl-3 pr-14 py-1.5 text-xs border rounded-md font-mono font-bold text-stone-900 focus:ring-2 focus:ring-indigo-500/20 ${
                                editingProduct ? 'bg-stone-100 border-stone-200 text-stone-500 cursor-not-allowed' : 'bg-white border-stone-300'
                              }`}
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-stone-500">
                              {formData.unitType || 'Birim'}
                            </span>
                          </div>
                          <span className="text-[10px] text-stone-400 mt-0.5 block">
                            {editingProduct
                              ? 'Açılış stoku ilk devir işlemidir. Güncel stok hareketleri için Stok İşlemleri menüsünü kullanınız.'
                              : 'Sisteme ilk devir/sayım açılış stoku olarak işlenir.'}
                          </span>
                        </div>

                        {/* Giriş Yapılacak Depo */}
                        <div>
                          <label className="block text-xs font-semibold text-stone-700 mb-1">
                            Giriş Yapılacak Depo Lokasyonu
                          </label>
                          <select
                            disabled={!!editingProduct}
                            value={formData.defaultWarehouseId}
                            onChange={(e) => setFormData({ ...formData, defaultWarehouseId: e.target.value })}
                            className={`w-full px-3 py-1.5 text-xs border rounded-md font-medium focus:ring-2 focus:ring-indigo-500/20 ${
                              editingProduct ? 'bg-stone-100 border-stone-200 text-stone-500 cursor-not-allowed' : 'bg-white border-stone-300 text-stone-800 cursor-pointer'
                            }`}
                          >
                            {warehouses.map((wh) => (
                              <option key={wh.id} value={wh.id}>
                                {wh.name} ({wh.warehouseCode}) - {wh.warehouseType}
                              </option>
                            ))}
                          </select>
                          <span className="text-[10px] text-stone-400 mt-0.5 block">
                            {editingProduct
                              ? 'Başlangıç deposu ürün oluşturulurken atanmıştır.'
                              : 'Açılış stoku doğrudan bu depoya kaydedilir.'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* BÖLÜM 4: ÜRÜN AÇIKLAMASI */}
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        4. Ürün Açıklaması & Notlar
                      </label>
                      <textarea
                        rows={2}
                        value={formData.descriptionNotes}
                        onChange={(e) => setFormData({ ...formData, descriptionNotes: e.target.value })}
                        placeholder="Ürünün teknik özellikleri, saklama koşulları veya sipariş notları..."
                        className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-md focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>
                )}

                {/* =================================================================== */}
                {/* SEKME 2: LOJİSTİK & DESİ                                          */}
                {/* =================================================================== */}
                {modalActiveTab === 'logistics' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    {/* Lojistik Bilgi ve Otomasyon Başlığı */}
                    <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent rounded-lg border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-900 flex-shrink-0">
                          <Truck className="w-5 h-5 text-amber-700" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                              Lojistik, Ebatlar & Desi Otomasyonu
                            </h4>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-200/70 text-amber-900 font-mono font-bold">
                              Formül: (En × Boy × Yükseklik) / 3000
                            </span>
                          </div>
                          <p className="text-xs text-amber-900/80 mt-0.5">
                            En, boy veya yükseklik girildiğinde desi otomatik hesaplanır. Dilerseniz Desi alanına doğrudan elle de değer yazabilirsiniz.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {formData.widthCm && formData.lengthCm && formData.heightCm ? (
                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Boyutlardan Hesaplanıyor
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-amber-800 bg-amber-100/70 px-2.5 py-1 rounded-md border border-amber-300 flex items-center gap-1.5">
                            <Info className="w-3.5 h-3.5 text-amber-700" />
                            Boyut giriniz veya doğrudan Desi yazınız
                          </span>
                        )}
                      </div>
                    </div>

                    {/* KART 1: FİZİKSEL EBATLAR (EN, BOY, YÜKSEKLİK) */}
                    <div className="p-4 bg-stone-50/80 rounded-lg border border-stone-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Ruler className="w-3.5 h-3.5 text-indigo-600" />
                          1. Fiziksel Koli / Ürün Boyutları (Santimetre - cm)
                        </h4>
                        <span className="text-[11px] text-stone-400">
                          Değer girildikçe Desi ve Hacim (m³) anında hesaplanır
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                        {/* En (cm) */}
                        <div>
                          <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center justify-between">
                            <span>En (Genişlik)</span>
                            <span className="text-[10px] text-stone-400 font-normal">Santimetre</span>
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={formData.widthCm || ''}
                              onChange={(e) => handleLogisticsCalculation('widthCm', e.target.value)}
                              placeholder="Örn: 20"
                              className="w-full pl-3 pr-10 py-2 text-xs bg-white border border-stone-300 rounded-md font-mono font-bold text-stone-900 focus:ring-2 focus:ring-indigo-500/20"
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">
                              cm
                            </span>
                          </div>
                        </div>

                        {/* Boy (cm) */}
                        <div>
                          <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center justify-between">
                            <span>Boy (Uzunluk)</span>
                            <span className="text-[10px] text-stone-400 font-normal">Santimetre</span>
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={formData.lengthCm || ''}
                              onChange={(e) => handleLogisticsCalculation('lengthCm', e.target.value)}
                              placeholder="Örn: 30"
                              className="w-full pl-3 pr-10 py-2 text-xs bg-white border border-stone-300 rounded-md font-mono font-bold text-stone-900 focus:ring-2 focus:ring-indigo-500/20"
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">
                              cm
                            </span>
                          </div>
                        </div>

                        {/* Yükseklik (cm) */}
                        <div>
                          <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center justify-between">
                            <span>Yükseklik (Derinlik)</span>
                            <span className="text-[10px] text-stone-400 font-normal">Santimetre</span>
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={formData.heightCm || ''}
                              onChange={(e) => handleLogisticsCalculation('heightCm', e.target.value)}
                              placeholder="Örn: 10"
                              className="w-full pl-3 pr-10 py-2 text-xs bg-white border border-stone-300 rounded-md font-mono font-bold text-stone-900 focus:ring-2 focus:ring-indigo-500/20"
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">
                              cm
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Hızlı Standart Koli Şablonları */}
                      <div className="pt-2 border-t border-stone-200/70">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-600 mb-1.5">
                          <Package className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Hızlı Standart Kargo Koli Şablonları (Tek Tıkla Ebatla):</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => applyPackagePreset(35, 25, 2)}
                            className="px-2.5 py-1 text-[11px] font-medium bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-md transition-colors cursor-pointer"
                          >
                            Zarf / Dosya (35×25×2 cm - 0.58 Desi)
                          </button>
                          <button
                            type="button"
                            onClick={() => applyPackagePreset(20, 20, 10)}
                            className="px-2.5 py-1 text-[11px] font-medium bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-md transition-colors cursor-pointer"
                          >
                            Küçük Koli (20×20×10 cm - 1.33 Desi)
                          </button>
                          <button
                            type="button"
                            onClick={() => applyPackagePreset(30, 20, 10)}
                            className="px-2.5 py-1 text-[11px] font-medium bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-md transition-colors cursor-pointer"
                          >
                            Standart Koli (30×20×10 cm - 2.00 Desi)
                          </button>
                          <button
                            type="button"
                            onClick={() => applyPackagePreset(40, 30, 20)}
                            className="px-2.5 py-1 text-[11px] font-medium bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-md transition-colors cursor-pointer"
                          >
                            Orta Koli (40×30×20 cm - 8.00 Desi)
                          </button>
                          <button
                            type="button"
                            onClick={() => applyPackagePreset(60, 40, 40)}
                            className="px-2.5 py-1 text-[11px] font-medium bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-md transition-colors cursor-pointer"
                          >
                            Büyük Koli (60×40×40 cm - 32.00 Desi)
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* KART 2: AĞIRLIK, HACİM VE HESAPLANAN / DİREKT DESİ */}
                    <div className="p-4 bg-amber-50/50 rounded-lg border border-amber-200/90 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                          <Scale className="w-3.5 h-3.5 text-amber-700" />
                          2. Ağırlık, Hacim ve Hesaplanan Desi Parametreleri
                        </h4>
                        <span className="text-[11px] text-amber-800 font-medium">
                          Desi değerini doğrudan elle değiştirebilirsiniz
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                        {/* Brüt Ağırlık (KG) */}
                        <div>
                          <label className="block text-xs font-semibold text-stone-800 mb-1 flex items-center justify-between">
                            <span>Brüt Ağırlık (KG)</span>
                            <span className="text-[10px] text-stone-500 font-normal">Fiziksel Terazi</span>
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.001"
                              min="0"
                              value={formData.weightGross || ''}
                              onChange={(e) => handleLogisticsCalculation('weightGross', e.target.value)}
                              placeholder="Örn: 1.5"
                              className="w-full pl-3 pr-10 py-2 text-xs bg-white border border-stone-300 rounded-md font-mono font-bold text-stone-900 focus:ring-2 focus:ring-amber-500/20"
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-500">
                              KG
                            </span>
                          </div>
                          <span className="text-[10px] text-stone-500 mt-1 block">
                            Paket ve ürünün toplam terazi tartımı.
                          </span>
                        </div>

                        {/* Hacim (m³) */}
                        <div>
                          <label className="block text-xs font-semibold text-stone-800 mb-1 flex items-center justify-between">
                            <span>Hacim (m³)</span>
                            <span className="text-[10px] text-stone-500 font-normal">Metreküp</span>
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.00001"
                              min="0"
                              value={formData.volumeM3 || ''}
                              onChange={(e) => handleLogisticsCalculation('volumeM3', e.target.value)}
                              placeholder="Örn: 0.006"
                              className="w-full pl-3 pr-10 py-2 text-xs bg-white border border-stone-300 rounded-md font-mono font-bold text-stone-900 focus:ring-2 focus:ring-amber-500/20"
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-500">
                              m³
                            </span>
                          </div>
                          <span className="text-[10px] text-stone-500 mt-1 block">
                            (En × Boy × Yükseklik) / 1.000.000
                          </span>
                        </div>

                        {/* Hesaplanan Desi (DOĞRUDAN GİRİLEBİLİR VE OTOMATİK HESAPLANIR) */}
                        <div className="bg-amber-100/70 p-2.5 rounded-lg border border-amber-300 shadow-2xs">
                          <label className="block text-xs font-bold text-amber-950 mb-1 flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              Hesaplanan Desi <span className="text-rose-600">*</span>
                            </span>
                            <span className="text-[10px] font-semibold text-amber-800 bg-white/80 px-1.5 py-0.2 rounded border border-amber-300">
                              Direkt Düzenlenebilir
                            </span>
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={formData.calculatedDesi || ''}
                              onChange={(e) => handleLogisticsCalculation('calculatedDesi', e.target.value)}
                              placeholder="0.00"
                              className="w-full pl-3 pr-12 py-2 text-sm bg-white border-2 border-amber-400 rounded-md font-mono font-extrabold text-amber-950 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 shadow-xs"
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-extrabold text-amber-800">
                              DESİ
                            </span>
                          </div>
                          <span className="text-[10px] text-amber-900/90 font-medium mt-1 block">
                            {formData.widthCm && formData.lengthCm && formData.heightCm
                              ? '✓ Ebatlardan (E×B×Y/3000) anlık hesaplandı.'
                              : 'Doğrudan veya ebatlardan belirlenebilir.'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* KART 3: KARGO BAREM & FATURALANDIRMA ANALİZİ */}
                    <div className="p-4 bg-white rounded-lg border border-stone-200 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-indigo-600" />
                          3. Akıllı Kargo Barem & Faturalandırma Analizi
                        </h4>
                        <span className="text-[11px] text-stone-500 font-medium">
                          Yurtiçi, Aras, MNG, Trendyol, PTT Taşıma Kuralı
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 flex flex-col justify-between">
                          <div className="text-[11px] text-stone-500 font-medium">Fiziksel Brüt Ağırlık</div>
                          <div className="text-base font-mono font-bold text-stone-900 mt-1">
                            {formData.weightGross ? Number(formData.weightGross).toFixed(2) : '0.00'} <span className="text-xs font-normal text-stone-500">KG</span>
                          </div>
                        </div>

                        <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 flex flex-col justify-between">
                          <div className="text-[11px] text-stone-500 font-medium">Hacimsel Ağırlık (Desi)</div>
                          <div className="text-base font-mono font-bold text-stone-900 mt-1">
                            {formData.calculatedDesi ? Number(formData.calculatedDesi).toFixed(2) : '0.00'} <span className="text-xs font-normal text-stone-500">Desi</span>
                          </div>
                        </div>

                        <div className="p-3 bg-indigo-50/70 rounded-lg border border-indigo-200 flex flex-col justify-between">
                          <div className="text-[11px] text-indigo-900 font-bold flex items-center justify-between">
                            <span>Kargo Faturalandırma Baremi</span>
                            <span className="text-[10px] font-mono font-bold bg-indigo-200/80 text-indigo-900 px-1.5 py-0.2 rounded">
                              Maksimum
                            </span>
                          </div>
                          <div className="text-base font-mono font-extrabold text-indigo-950 mt-1">
                            {Math.max(Number(formData.weightGross) || 0, Number(formData.calculatedDesi) || 0).toFixed(2)}{' '}
                            <span className="text-xs font-bold text-indigo-700">
                              {(Number(formData.calculatedDesi) || 0) >= (Number(formData.weightGross) || 0) ? 'Desi' : 'KG'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Bilgilendirme Notu */}
                      <div className="p-2.5 bg-stone-50 rounded-md border border-stone-200/80 text-xs text-stone-600 flex items-start gap-2">
                        <Info className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                        <div>
                          {(Number(formData.calculatedDesi) || 0) > (Number(formData.weightGross) || 0) ? (
                            <span>
                              <strong>Hacimsel Desi Baskın:</strong> Ürünün ebatları ağırlığına göre daha yüksek yer kapladığı için kargo firması faturayı <strong>{formData.calculatedDesi} Desi</strong> üzerinden kesecektir.
                            </span>
                          ) : (Number(formData.weightGross) || 0) > 0 ? (
                            <span>
                              <strong>Fiziksel Ağırlık Baskın:</strong> Ürünün ağırlığı hacmine göre daha yüksek olduğu için kargo firması faturayı <strong>{formData.weightGross} KG</strong> tartımı üzerinden kesecektir.
                            </span>
                          ) : (
                            <span>
                              Kargo firmaları ücretlendirmeyi <strong>Maksimum(Brüt KG, Desi)</strong> formülü ile hesaplar.
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Önceki Sekmeye Dönüş Düğmesi */}
                    <div className="flex justify-between items-center pt-1">
                      <button
                        type="button"
                        onClick={() => setModalActiveTab('general')}
                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-lg transition-colors cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>← 1. Genel Bilgiler & Fiyatlandırmaya Dön</span>
                      </button>

                      <div className="text-xs text-stone-500 font-mono">
                        {formData.widthCm && formData.lengthCm && formData.heightCm ? (
                          <span>{formData.widthCm}×{formData.lengthCm}×{formData.heightCm} cm = {formData.calculatedDesi} Desi</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* MODAL FOOTER BUTONLARI (HER İKİ SEKMEDEN DE KAYDEDEBİLİR) */}
              <div className="pt-3.5 mt-3 border-t border-stone-200 flex items-center justify-end gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
                >
                  Vazgeç
                </button>

                {modalActiveTab === 'general' ? (
                  <button
                    type="button"
                    onClick={() => setModalActiveTab('logistics')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-all cursor-pointer"
                  >
                    <span>Lojistik / Desi</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setModalActiveTab('general')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-lg transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Genel Bilgiler</span>
                  </button>
                )}

                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all shadow-xs cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingProduct ? 'Değişiklikleri Kaydet' : 'Ürünü Kaydet & Envantere İşle'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* KARGO ÜCRETİ SİMÜLATÖRÜ MİNİ MODAL                                       */}
      {/* ========================================================================= */}
      {shippingCalcProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-stone-200 rounded-xl max-w-md w-full p-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-indigo-600" />
                <h4 className="font-bold text-stone-900 text-sm">Lojistik Kargo Maliyet Simülasyonu</h4>
              </div>
              <button
                onClick={() => setShippingCalcProduct(null)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3 space-y-2.5 text-xs">
              <div className="p-2.5 bg-stone-50 rounded-lg border border-stone-200">
                <p className="font-semibold text-stone-900">{shippingCalcProduct.name}</p>
                <p className="text-stone-500 font-mono text-[11px] mt-0.5">
                  SKU: {shippingCalcProduct.skuCode} &bull; Desi: {shippingCalcProduct.calculatedDesi || 1} Desi
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Kargo Taşıyıcı Firma Seçimi
                </label>
                <select
                  value={shippingCalcCompany}
                  onChange={(e) => {
                    const c = e.target.value;
                    setShippingCalcCompany(c);
                    calculateForProduct(shippingCalcProduct, c);
                  }}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-md font-medium text-stone-800 focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                >
                  <option value="Yurtiçi Kargo">Yurtiçi Kargo</option>
                  <option value="Aras Kargo">Aras Kargo</option>
                  <option value="MNG Kargo">MNG Kargo</option>
                  <option value="PTT Kargo">PTT Kargo</option>
                  <option value="Sürat Kargo">Sürat Kargo</option>
                </select>
              </div>

              {shippingCostResult && (
                <div className="p-3 bg-indigo-50/60 rounded-lg border border-indigo-200 space-y-1.5">
                  <div className="flex justify-between items-center text-indigo-950 font-bold">
                    <span>{shippingCostResult.companyName}</span>
                    <span className="text-sm font-mono text-indigo-700">
                      ₺{shippingCostResult.totalPrice.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-600 flex justify-between">
                    <span>Tarife:</span>
                    <span className="font-medium">{shippingCostResult.rateTitle}</span>
                  </div>
                  {shippingCostResult.extraPrice > 0 && (
                    <div className="text-[11px] text-amber-700 flex justify-between">
                      <span>Ek Desi Farkı:</span>
                      <span className="font-mono">+₺{shippingCostResult.extraPrice.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="text-[10px] text-stone-400 pt-1 border-t border-indigo-200/50">
                    Sistem baremleri ve anlaşmalı kargo fiyat tablolarından otomatik hesaplanmıştır.
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShippingCalcProduct(null)}
                className="px-3 py-1.5 text-xs font-semibold bg-stone-800 hover:bg-stone-900 text-white rounded-md cursor-pointer"
              >
                Tamam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ÜRÜN SİLME ONAY MODALI                                                 */}
      {/* ========================================================================= */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/45 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-stone-200 rounded-xl max-w-md w-full p-5 shadow-2xl">
            <div className="flex items-center gap-3 pb-3 border-b border-stone-100">
              <div className="w-9 h-9 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-stone-900 text-sm">Ürünü Silmek İstiyor Musunuz?</h4>
                <p className="text-xs text-stone-500">Bu işlem ürünü katalogdan kalıcı olarak kaldıracaktır.</p>
              </div>
            </div>

            <div className="py-3.5 space-y-2">
              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 text-xs">
                <div className="font-semibold text-stone-800">{productToDelete.name}</div>
                <div className="text-stone-500 font-mono text-[11px] mt-1">
                  SKU: <span className="text-indigo-700 font-bold">{productToDelete.skuCode}</span>
                  {productToDelete.barcodeEan13 ? ` • Barkod: ${productToDelete.barcodeEan13}` : ''}
                </div>
              </div>
              <p className="text-[11px] text-rose-600">
                ⚠️ Dikkat: Ürüne ait geçmiş stok kayıtları ve fiş bağlantıları etkilenebilir.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-md transition-colors cursor-pointer"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={async () => {
                  const target = productToDelete;
                  setProductToDelete(null);
                  await handleDeleteProduct(target.id, target.name);
                }}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-md transition-colors cursor-pointer shadow-xs"
              >
                Evet, Kalıcı Olarak Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. BİRİM YÖNETİM MODALI */}
      <LookupManagerModal
        isOpen={isUnitModalOpen}
        onClose={() => setIsUnitModalOpen(false)}
        title="Ölçü Birimlerini Yönet & Ekle"
        icon={<Layers className="w-4 h-4 text-indigo-600" />}
        listLabel="Mevcut Ölçü Birimleri"
        addLabel="Yeni Ölçü Birimi Ekle"
        items={unitTypes}
        selectedItem={formData.unitType}
        onSelect={(item) => setFormData((prev) => ({ ...prev, unitType: item }))}
        onAdd={handleAddUnit}
        onDelete={handleDeleteUnit}
        systemItems={SYSTEM_UNIT_TYPES}
        placeholder="Örn: Kutu, Palet, Çuval, Ton..."
        inputValue={newUnitInput}
        onInputChange={setNewUnitInput}
      />

      {/* 2. KATEGORİ / GRUP YÖNETİM MODALI */}
      <LookupManagerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Kategorileri / Grupları Yönet & Ekle"
        icon={<FolderTree className="w-4 h-4 text-indigo-600" />}
        listLabel="Mevcut Kategori ve Gruplar"
        addLabel="Yeni Kategori / Grup Ekle"
        items={categoryGroups}
        selectedItem={formData.categoryGroup}
        onSelect={(item) => setFormData((prev) => ({ ...prev, categoryGroup: item }))}
        onAdd={handleAddCategory}
        onDelete={handleDeleteCategory}
        systemItems={SYSTEM_CATEGORY_GROUPS}
        placeholder="Örn: Elektrik Malzemeleri, Sarf Malzemeler..."
        inputValue={newCategoryInput}
        onInputChange={setNewCategoryInput}
      />

      {/* 3. MARKA YÖNETİM MODALI */}
      <LookupManagerModal
        isOpen={isBrandModalOpen}
        onClose={() => setIsBrandModalOpen(false)}
        title="Markaları Yönet & Ekle"
        icon={<Tag className="w-4 h-4 text-indigo-600" />}
        listLabel="Mevcut Markalar"
        addLabel="Yeni Marka Ekle"
        items={brandNames}
        selectedItem={formData.brandName}
        onSelect={(item) => setFormData((prev) => ({ ...prev, brandName: item }))}
        onAdd={handleAddBrand}
        onDelete={handleDeleteBrand}
        systemItems={SYSTEM_BRAND_NAMES}
        placeholder="Örn: Siemens, ABB, Schneider, FX..."
        inputValue={newBrandInput}
        onInputChange={setNewBrandInput}
      />

      {/* 4. TEDARİKÇİ / FİRMA YÖNETİM MODALI */}
      <LookupManagerModal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        title="Tedarikçileri / Firmaları Yönet & Ekle"
        icon={<Building2 className="w-4 h-4 text-indigo-600" />}
        listLabel="Mevcut Tedarikçi ve Firmalar"
        addLabel="Yeni Tedarikçi / Firma Ekle"
        items={supplierTitles}
        selectedItem={formData.supplierTitle}
        onSelect={(item) => setFormData((prev) => ({ ...prev, supplierTitle: item }))}
        onAdd={handleAddSupplier}
        onDelete={handleDeleteSupplier}
        systemItems={SYSTEM_SUPPLIER_TITLES}
        placeholder="Örn: Anadolu Sanayi ve Ticaret A.Ş...."
        inputValue={newSupplierInput}
        onInputChange={setNewSupplierInput}
      />
    </div>
  );
};

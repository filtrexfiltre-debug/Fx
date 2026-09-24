import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Calendar,
  Package,
  Warehouse as WarehouseIcon,
  FileText,
  Building,
  CheckCircle2,
  X,
  Check,
  Download,
  Filter,
} from 'lucide-react';
import { downloadCsv } from '../../lib/exportUtils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { StockMovement, Product, Warehouse } from '../../types/fx';
import { api, branchContext } from '../../services/api';
import { DataTable } from '../common/DataTable';


const STORAGE_GRID_KEY = 'fx_stock_movements_grid_state_v1';

interface StokHareketleriTablosuProps {
  onRefreshStats?: () => void;
}

export const StokHareketleriTablosu: React.FC<StokHareketleriTablosuProps> = ({ onRefreshStats }) => {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [quickFilterText, setQuickFilterText] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('ALL');

  // Yan Panel
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const sidebarButtonRef = useRef<HTMLButtonElement>(null);

  // Modallar
  const [isNewMovementModalOpen, setIsNewMovementModalOpen] = useState<boolean>(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Normal Giriş / Çıkış Hareketi Form State
  const [movementForm, setMovementForm] = useState({
    movementDate: new Date().toISOString().slice(0, 16),
    productId: '',
    warehouseId: '',
    movementType: 'IN' as 'IN' | 'OUT',
    quantity: 10,
    unitPrice: 0,
    totalAmount: 0,
    documentNumber: `IRS-${Date.now().toString().slice(-6)}`,
    contactTitle: '',
    notes: '',
  });

  // Depolar Arası Virman / Transfer Form State
  const [transferForm, setTransferForm] = useState({
    sourceWarehouseId: '',
    targetWarehouseId: '',
    productId: '',
    quantity: 5,
    documentNumber: `TRF-${Date.now().toString().slice(-6)}`,
    contactTitle: 'Şubeler / Depolar Arası Transfer',
    notes: 'Merkezden şube deposuna ikmal sevkıyatı',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const mRes = await api.getStockMovements();
      const pRes = await api.getProducts();
      const wRes = await api.getWarehouses();
      if (mRes.success) setMovements(mRes.data);
      if (pRes.success) setProducts(pRes.data);
      if (wRes.success) setWarehouses(wRes.data);
      if (onRefreshStats) onRefreshStats();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    return branchContext.subscribe(loadData);
  }, []);

  // Normal Hareket Ekleme Modalını Aç
  const handleOpenMovementModal = () => {
    const firstProd = products[0];
    const firstWh = warehouses[0];
    const initialPrice = firstProd ? firstProd.netPurchaseCost : 100;
    const initialQty = 10;

    setMovementForm({
      movementDate: new Date().toISOString().slice(0, 16),
      productId: firstProd?.id || '',
      warehouseId: firstWh?.id || '',
      movementType: 'IN',
      quantity: initialQty,
      unitPrice: initialPrice,
      totalAmount: initialQty * initialPrice,
      documentNumber: `IRS-${Math.floor(100000 + Math.random() * 900000)}`,
      contactTitle: firstProd?.supplierTitle || 'Tedarikçi Firma',
      notes: 'İrsaliye ile depo mal kabulü',
    });
    setIsNewMovementModalOpen(true);
  };

  // Ürün değiştiğinde otomatik birim fiyat doldur
  const handleProductChange = (prodId: string) => {
    const sel = products.find(p => p.id === prodId);
    const p = sel ? (movementForm.movementType === 'IN' ? sel.netPurchaseCost : sel.salePriceExclVat) : 0;
    setMovementForm(prev => ({
      ...prev,
      productId: prodId,
      unitPrice: p,
      totalAmount: prev.quantity * p,
      contactTitle: sel?.supplierTitle || prev.contactTitle,
    }));
  };

  const handleQtyPriceChange = (qty: number, price: number) => {
    setMovementForm(prev => ({
      ...prev,
      quantity: qty,
      unitPrice: price,
      totalAmount: Math.round(qty * price * 100) / 100,
    }));
  };

  // Normal Hareketi Kaydet
  const handleSaveMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movementForm.productId || !movementForm.warehouseId || movementForm.quantity <= 0) {
      alert('Lütfen ürün, depo ve geçerli bir miktar seçiniz.');
      return;
    }

    try {
      const prod = products.find(p => p.id === movementForm.productId);
      const wh = warehouses.find(w => w.id === movementForm.warehouseId);

      const res = await api.createStockMovement({
        movementDate: new Date(movementForm.movementDate).toISOString(),
        productId: movementForm.productId,
        productSku: prod?.skuCode || '',
        productName: prod?.name || '',
        warehouseId: movementForm.warehouseId,
        warehouseName: wh?.name || '',
        movementType: movementForm.movementType,
        quantity: Number(movementForm.quantity),
        unitPrice: Number(movementForm.unitPrice),
        totalAmount: Number(movementForm.totalAmount),
        documentNumber: movementForm.documentNumber,
        contactTitle: movementForm.contactTitle,
        notes: movementForm.notes,
      });

      if (res.success) {
        setFeedback({ type: 'success', message: res.message || 'Stok hareketi işlendi.' });
        setIsNewMovementModalOpen(false);
        loadData();
      }
    } catch (err: any) {
      alert(err.message || 'Hata oluştu.');
    }
  };

  // Transfer Modalını Aç
  const handleOpenTransferModal = () => {
    if (warehouses.length < 2) {
      alert('Depolar arası transfer yapabilmek için en az 2 adet kayıtlı depo gereklidir.');
      return;
    }
    setTransferForm({
      sourceWarehouseId: warehouses[0]?.id || '',
      targetWarehouseId: warehouses[1]?.id || '',
      productId: products[0]?.id || '',
      quantity: 5,
      documentNumber: `TRF-${Math.floor(100000 + Math.random() * 900000)}`,
      contactTitle: `${warehouses[0]?.name} -> ${warehouses[1]?.name}`,
      notes: 'Depolar arası otomatik stok transfer sevkıyatı',
    });
    setIsTransferModalOpen(true);
  };

  // Transferi Kaydet (Tam Otomasyon: Kaynaktan Çıkış + Hedefe Giriş)
  const handleSaveTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (transferForm.sourceWarehouseId === transferForm.targetWarehouseId) {
      alert('Kaynak depo ve hedef depo aynı olamaz.');
      return;
    }
    if (!transferForm.productId || transferForm.quantity <= 0) {
      alert('Geçerli bir ürün ve miktar seçiniz.');
      return;
    }

    try {
      const prod = products.find(p => p.id === transferForm.productId);
      const res = await api.transferBetweenWarehouses(
        transferForm.sourceWarehouseId,
        transferForm.targetWarehouseId,
        transferForm.productId,
        Number(transferForm.quantity),
        prod ? prod.netPurchaseCost : 0,
        transferForm.documentNumber,
        transferForm.contactTitle,
        transferForm.notes
      );

      if (res.success) {
        setFeedback({ type: 'success', message: res.message || 'Depo transferi başarıyla tamamlandı.' });
        setIsTransferModalOpen(false);
        loadData();
      }
    } catch (err: any) {
      alert(err.message || 'Transfer başarısız.');
    }
  };

  // Kolon Tanımları (Kullanıcı Talebi: Tarih, Stok Kodu & Ürün, Depo Lokasyon, İşlem Türü, Miktar, Birim Fiyat, Toplam Tutar, Belge No & Cari Ünvan)
  const columns = useMemo(() => [
    {
      field: 'movementDate' as keyof StockMovement,
      headerName: 'Tarih',
      width: 140,
      cellRenderer: (params: { data: StockMovement; value: any }) => {
        const val = params.value;
        if (!val) return '-';
        const d = new Date(val);
        return (
          <div className="flex flex-col justify-center h-full py-1">
            <span className="text-xs font-semibold text-stone-800">
              {d.toLocaleDateString('tr-TR')}
            </span>
            <span className="text-[10px] text-stone-400 font-mono">
              {d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        );
      },
    },
    {
      field: 'productSku' as keyof StockMovement,
      headerName: 'Stok Kodu & Ürün',
      width: 260,
      cellRenderer: (params: { data: StockMovement; value: any }) => {
        const d = params.data;
        return (
          <div className="flex flex-col justify-center h-full py-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-indigo-700">
                {d.productSku}
              </span>
              <span className="text-xs font-semibold text-stone-900 truncate">
                {d.productName}
              </span>
            </div>
            {d.notes && (
              <span className="text-[10px] text-stone-400 truncate mt-0.5">
                {d.notes}
              </span>
            )}
          </div>
        );
      },
    },
    {
      field: 'warehouseName' as keyof StockMovement,
      headerName: 'Depo Lokasyon',
      width: 180,
      cellRenderer: (params: { data: StockMovement; value: any }) => (
        <div className="flex items-center gap-1.5 text-xs font-medium text-stone-700">
          <WarehouseIcon className="w-3.5 h-3.5 text-stone-400 shrink-0" />
          <span className="truncate">{params.value || 'Depo'}</span>
        </div>
      ),
    },
    {
      field: 'movementType' as keyof StockMovement,
      headerName: 'İşlem Türü',
      width: 140,
      cellRenderer: (params: { data: StockMovement; value: any }) => {
        const t = params.value;
        if (t === 'IN') {
          return (
            <div className="flex items-center gap-1.5 h-full text-xs font-bold text-emerald-700">
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Giriş</span>
            </div>
          );
        }
        if (t === 'OUT') {
          return (
            <div className="flex items-center gap-1.5 h-full text-xs font-bold text-rose-700">
              <ArrowUpRight className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>Çıkış</span>
            </div>
          );
        }
        if (t === 'TRANSFER_IN') {
          return (
            <div className="flex items-center gap-1.5 h-full text-xs font-bold text-cyan-800">
              <ArrowRightLeft className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
              <span className="truncate">Transfer Giriş</span>
            </div>
          );
        }
        return (
          <div className="flex items-center gap-1.5 h-full text-xs font-bold text-amber-800">
            <ArrowRightLeft className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="truncate">Transfer Çıkış</span>
          </div>
        );
      },
    },
    {
      field: 'quantity' as keyof StockMovement,
      headerName: 'Miktar',
      width: 110,
      cellRenderer: (params: { data: StockMovement; value: any }) => {
        const isPositive = params.data?.movementType === 'IN' || params.data?.movementType === 'TRANSFER_IN';
        return (
          <div className="flex items-center justify-end h-full pr-2">
            <span
              className={`text-xs font-mono font-bold ${
                isPositive ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {isPositive ? '+' : '-'}{Number(params.value).toLocaleString('tr-TR')}
            </span>
          </div>
        );
      },
    },
    {
      field: 'unitPrice' as keyof StockMovement,
      headerName: 'Birim Fiyat',
      width: 130,
      cellRenderer: (params: { data: StockMovement; value: any }) => (
        <div className="text-right text-xs font-mono font-semibold text-stone-700 pr-2">
          ₺{Number(params.value || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      ),
    },
    {
      field: 'totalAmount' as keyof StockMovement,
      headerName: 'Toplam Tutar',
      width: 140,
      cellRenderer: (params: { data: StockMovement; value: any }) => (
        <div className="text-right text-xs font-mono font-bold text-stone-900 pr-2">
          ₺{Number(params.value || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      ),
    },
    {
      field: 'documentNumber' as keyof StockMovement,
      headerName: 'Belge No & Cari Ünvan',
      width: 220,
      cellRenderer: (params: { data: StockMovement; value: any }) => {
        const d = params.data;
        return (
          <div className="flex flex-col justify-center h-full py-1">
            <div className="flex items-center gap-1 text-xs font-semibold text-stone-800">
              <FileText className="w-3.5 h-3.5 text-stone-400" />
              <span className="font-mono">{d.documentNumber || '-'}</span>
            </div>
            <span className="text-[11px] text-stone-500 truncate">
              {d.contactTitle || 'Firma Tanımsız'}
            </span>
          </div>
        );
      },
    },
  ], []);

  const filteredMovements = useMemo(() => {
    return movements.filter(m => {
      const matchType = typeFilter === 'ALL' || m.movementType === typeFilter ||
        (typeFilter === 'TRANSFERS' && (m.movementType === 'TRANSFER_IN' || m.movementType === 'TRANSFER_OUT'));
      const matchWh = warehouseFilter === 'ALL' || m.warehouseId === warehouseFilter;
      const matchQuick = !quickFilterText ||
        (m.productSku || '').toLowerCase().includes(quickFilterText.toLowerCase()) ||
        (m.productName || '').toLowerCase().includes(quickFilterText.toLowerCase()) ||
        (m.documentNumber && m.documentNumber.toLowerCase().includes(quickFilterText.toLowerCase())) ||
        (m.contactTitle && m.contactTitle.toLowerCase().includes(quickFilterText.toLowerCase()));
      return matchType && matchWh && matchQuick;
    });
  }, [movements, typeFilter, warehouseFilter, quickFilterText]);

  const exportToExcel = () => {
    const data = filteredMovements.map(m => ({
      'Tarih': new Date(m.movementDate).toLocaleString('tr-TR'),
      'Stok Kodu': m.productSku,
      'Ürün Adı': m.productName,
      'Depo': m.warehouseName,
      'İşlem Türü': m.movementType,
      'Miktar': m.quantity,
      'Birim Fiyat (TRY)': m.unitPrice,
      'Toplam Tutar (TRY)': m.totalAmount,
      'Belge No': m.documentNumber || '',
      'Cari Ünvan': m.contactTitle || '',
      'Notlar': m.notes || '',
    }));
    downloadCsv(`Stok_Hareketleri_${new Date().toISOString().slice(0, 10)}.csv`, data);
  };

  const exportToPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('FX Enterprise ERP - Stok Hareketleri & Giriş / Çıkış Günlüğü', 14, 15);
    doc.setFontSize(9);
    doc.text(`Tarih: ${new Date().toLocaleString('tr-TR')} | Toplam Hareket: ${filteredMovements.length}`, 14, 22);

    const body = filteredMovements.map(m => [
      new Date(m.movementDate).toLocaleDateString('tr-TR'),
      m.productSku || '',
      m.productName || '',
      m.warehouseName || '',
      m.movementType,
      m.quantity.toString(),
      `₺${m.unitPrice.toFixed(2)}`,
      `₺${m.totalAmount.toFixed(2)}`,
      m.documentNumber || '-',
      m.contactTitle || '-',
    ]);

    autoTable(doc, {
      head: [['Tarih', 'Stok Kodu', 'Ürün Adı', 'Depo', 'Tür', 'Miktar', 'Birim Fiyat', 'Tutar', 'Belge No', 'Cari Ünvan']],
      body,
      startY: 26,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [49, 46, 129] },
    });

    doc.save(`Stok_Hareketleri_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="space-y-3">
      {/* Feedback */}
      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
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
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="relative min-w-[220px] max-w-xs">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={quickFilterText}
                onChange={(e) => setQuickFilterText(e.target.value)}
                placeholder="Ürün, stok kodu, belge no veya cari ara..."
                className="w-full pl-9 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-stone-800"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-md text-xs text-stone-700 cursor-pointer"
            >
              <option value="ALL">Tüm İşlem Türleri</option>
              <option value="IN">Yalnızca Mal Girişleri</option>
              <option value="OUT">Yalnızca Mal Çıkışları</option>
              <option value="TRANSFERS">Depolar Arası Transferler</option>
            </select>

            <select
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-md text-xs text-stone-700 cursor-pointer"
            >
              <option value="ALL">Tüm Depolar</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={exportToExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-md transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>CSV</span>
            </button>

            <button
              onClick={exportToPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-md transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-rose-600" />
              <span>PDF</span>
            </button>

            {/* İki Depo Arası Hızlı Transfer Butonu */}
            <button
              onClick={handleOpenTransferModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-md transition-all shadow-xs cursor-pointer"
              title="İki depo arasında çift taraflı virman/stok sevkiyatı yapın"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Depolar Arası Transfer</span>
            </button>

            {/* Yeni Giriş / Çıkış Hareketi */}
            <button
              onClick={handleOpenMovementModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Stok Hareketi İşle</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-stone-200/90 rounded-lg shadow-xs overflow-hidden w-full p-4">
        <DataTable
          columns={columns}
          rowData={filteredMovements}
          pagination={true}
          paginationPageSize={10}
        />
      </div>

      {/* ========================================================================= */}
      {/* 3. YENİ STOK HAREKETİ İŞLEME MODALI                                       */}
      {/* ========================================================================= */}
      {isNewMovementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-stone-200 rounded-xl max-w-xl w-full p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">Yeni Stok Hareketi İşle</h3>
                  <p className="text-xs text-stone-400">
                    Depoya mal kabulü (Giriş) veya irsaliyeli satış (Çıkış) kaydı
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsNewMovementModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMovement} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    İşlem Türü <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={movementForm.movementType}
                    onChange={(e) => {
                      const t = e.target.value as 'IN' | 'OUT';
                      setMovementForm(prev => ({ ...prev, movementType: t }));
                      handleProductChange(movementForm.productId);
                    }}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-md font-bold"
                  >
                    <option value="IN">Giriş (Mal Kabulü / İade Alma)</option>
                    <option value="OUT">Çıkış (Satış / Sarf / Fire)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Tarih & Saat <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={movementForm.movementDate}
                    onChange={(e) => setMovementForm({ ...movementForm, movementDate: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-md font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Ürün / Stok Kodu <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={movementForm.productId}
                    onChange={(e) => handleProductChange(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-md font-medium"
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.skuCode} - {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Depo Lokasyon <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={movementForm.warehouseId}
                    onChange={(e) => setMovementForm({ ...movementForm, warehouseId: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-md font-medium"
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.warehouseCode})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 p-3 bg-stone-50 rounded-lg border border-stone-200">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Miktar <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    value={movementForm.quantity}
                    onChange={(e) => handleQtyPriceChange(Number(e.target.value) || 0, movementForm.unitPrice)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-md font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Birim Fiyat (TRY)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={movementForm.unitPrice}
                    onChange={(e) => handleQtyPriceChange(movementForm.quantity, Number(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-md font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-indigo-950 mb-1">
                    Toplam Tutar
                  </label>
                  <input
                    type="number"
                    readOnly
                    value={movementForm.totalAmount}
                    className="w-full px-3 py-1.5 text-xs bg-indigo-50 border border-indigo-200 rounded-md font-mono font-bold text-indigo-900 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Belge No <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={movementForm.documentNumber}
                    onChange={(e) => setMovementForm({ ...movementForm, documentNumber: e.target.value })}
                    placeholder="Örn: IRS-2026-001"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-md font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Cari Ünvan / Açıklama
                  </label>
                  <input
                    type="text"
                    value={movementForm.contactTitle}
                    onChange={(e) => setMovementForm({ ...movementForm, contactTitle: e.target.value })}
                    placeholder="Örn: ABC Tedarik Ltd."
                    className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Hareket Notları
                </label>
                <input
                  type="text"
                  value={movementForm.notes}
                  onChange={(e) => setMovementForm({ ...movementForm, notes: e.target.value })}
                  placeholder="İşleme ait not veya sevk açıklaması"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-md"
                />
              </div>

              <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsNewMovementModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all shadow-xs cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Hareketi Kaydet & Stoğu Güncelle</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. DEPOLAR ARASI ÇİFT TARAFLI VİRMAN / TRANSFER MODALI                     */}
      {/* ========================================================================= */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-stone-200 rounded-xl max-w-xl w-full p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">Depolar Arası Stok Transferi</h3>
                  <p className="text-xs text-stone-400">
                    Kaynak depodan otomatik çıkış, hedef depoya otomatik giriş yapılır.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTransfer} className="mt-4 space-y-3">
              <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-200/80 grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-bold text-rose-800 mb-1">
                    Kaynak Depo (Çıkış Yapılacak) <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={transferForm.sourceWarehouseId}
                    onChange={(e) => setTransferForm({ ...transferForm, sourceWarehouseId: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-rose-300 rounded-md font-semibold text-rose-950"
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-800 mb-1">
                    Hedef Depo (Giriş Yapılacak) <span className="text-emerald-600">*</span>
                  </label>
                  <select
                    value={transferForm.targetWarehouseId}
                    onChange={(e) => setTransferForm({ ...transferForm, targetWarehouseId: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-emerald-300 rounded-md font-semibold text-emerald-950"
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Transfer Edilecek Ürün <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={transferForm.productId}
                    onChange={(e) => setTransferForm({ ...transferForm, productId: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-md font-medium"
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.skuCode} - {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Sevk Miktarı <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    value={transferForm.quantity}
                    onChange={(e) => setTransferForm({ ...transferForm, quantity: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-md font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Transfer Sevk Belge No
                  </label>
                  <input
                    type="text"
                    value={transferForm.documentNumber}
                    onChange={(e) => setTransferForm({ ...transferForm, documentNumber: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-md font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Transfer Başlığı / Cari Ünvan
                  </label>
                  <input
                    type="text"
                    value={transferForm.contactTitle}
                    onChange={(e) => setTransferForm({ ...transferForm, contactTitle: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Sevkıyat Notları
                </label>
                <input
                  type="text"
                  value={transferForm.notes}
                  onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
                  placeholder="Araç plakası, taşıyıcı veya sevk nedeni"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-md"
                />
              </div>

              <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-all shadow-xs cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Transferi Onayla & Çift Yönlü İşle</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

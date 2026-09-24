import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { appTheme } from '../../lib/agGridTheme';
import { AG_GRID_LOCALE_TR } from '../../lib/agGridLocaleTR';
import {
  ColDef,
  ICellRendererParams,
  
  
  
  
  GridReadyEvent,
  GridApi,
} from 'ag-grid-community';
import {
  Search,
  Warehouse as WarehouseIcon,
  AlertTriangle,
  CheckCircle2,
  Download,
  Edit3,
  X,
  Check,
  Package,
  TrendingUp,
  Layers,
  Coins,
} from 'lucide-react';
import { downloadCsv } from '../../lib/exportUtils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { WarehouseStock, Warehouse } from '../../types/fx';
import { api, branchContext } from '../../services/api';
import { AgGridColumnSidebar, AgGridSidebarToggleBtn } from '../common/AgGridColumnSidebar';


const STORAGE_GRID_KEY = 'fx_warehouse_stocks_grid_state_v1';

interface DepoStokDagitimiTablosuProps {
  onRefreshStats?: () => void;
}

export const DepoStokDagitimiTablosu: React.FC<DepoStokDagitimiTablosuProps> = ({ onRefreshStats }) => {
  const [stocks, setStocks] = useState<WarehouseStock[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [quickFilterText, setQuickFilterText] = useState<string>('');
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState<string>('ALL');
  const [onlyCriticalFilter, setOnlyCriticalFilter] = useState<boolean>(false);
  const [gridApi, setGridApi] = useState<GridApi<WarehouseStock> | null>(null);

  // Yan Panel Kolon Özelleştirme State (Cari Hesaplar Standardı)
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const sidebarButtonRef = useRef<HTMLButtonElement>(null);

  // Kritik Stok Seviyesi Düzenleme Modalı
  const [editingStock, setEditingStock] = useState<WarehouseStock | null>(null);
  const [newCriticalLevel, setNewCriticalLevel] = useState<number>(0);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const sRes = await api.getWarehouseStocks();
      const wRes = await api.getWarehouses();
      if (sRes.success) setStocks(sRes.data);
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

  const handleOpenEditCritical = (stock: WarehouseStock) => {
    setEditingStock(stock);
    setNewCriticalLevel(stock.criticalStockLevel);
  };

  const handleSaveCriticalLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStock) return;
    try {
      const res = await api.updateWarehouseStockCriticalLevel(editingStock.id, newCriticalLevel);
      if (res.success) {
        setFeedback({ type: 'success', message: res.message || 'Kritik stok seviyesi güncellendi.' });
        setEditingStock(null);
        loadData();
      }
    } catch (err: any) {
      alert(err.message || 'Hata oluştu.');
    }
  };

  // AG Grid Kolon Tanımları (Kullanıcı Talebi: Depo, Kritik Stok, Toplam Miktar, Maliyet Değeri, Güncel Değer)
  const columnDefs = useMemo<ColDef<WarehouseStock>[]>(() => [
    {
      field: 'warehouseName',
      headerName: 'Depo',
      width: 200,
      cellRenderer: (params: ICellRendererParams<WarehouseStock>) => (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-800">
          <WarehouseIcon className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span className="truncate">{params.value || 'Depo'}</span>
        </div>
      ),
    },
    {
      field: 'productSku',
      headerName: 'Ürün (Stok Kodu & Adı)',
      minWidth: 260,
      flex: 2,
      cellRenderer: (params: ICellRendererParams<WarehouseStock>) => {
        const d = params.data;
        if (!d) return null;
        return (
          <div className="flex flex-col justify-center h-full py-1">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-1.5 py-0.2 rounded">
                {d.productSku}
              </span>
              <span className="text-xs font-semibold text-stone-900 truncate">
                {d.productName}
              </span>
            </div>
            <span className="text-[10px] text-stone-400">
              Birim: {d.unitType || 'Adet'}
            </span>
          </div>
        );
      },
    },
    {
      field: 'criticalStockLevel',
      headerName: 'Kritik Stok',
      width: 140,
      cellRenderer: (params: ICellRendererParams<WarehouseStock>) => {
        const d = params.data;
        if (!d) return null;
        return (
          <div className="flex items-center gap-1.5 h-full">
            <span className="text-xs font-mono font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded">
              {Number(d.criticalStockLevel).toLocaleString('tr-TR')} {d.unitType || 'Adet'}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleOpenEditCritical(d);
              }}
              title="Kritik Eşiği Düzenle"
              className="text-stone-400 hover:text-indigo-600 p-0.5 rounded"
            >
              <Edit3 className="w-3 h-3" />
            </button>
          </div>
        );
      },
    },
    {
      field: 'totalQuantity',
      headerName: 'Toplam Miktar',
      width: 160,
      cellRenderer: (params: ICellRendererParams<WarehouseStock>) => {
        const d = params.data;
        if (!d) return null;
        const isCritical = d.totalQuantity <= d.criticalStockLevel;
        return (
          <div className="flex items-center gap-1.5 h-full">
            <span
              className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                isCritical
                  ? 'text-rose-700 bg-rose-50 border border-rose-200'
                  : 'text-emerald-800 bg-emerald-50 border border-emerald-200'
              }`}
            >
              {Number(d.totalQuantity).toLocaleString('tr-TR')} {d.unitType || 'Adet'}
            </span>
            {isCritical && (
              <span
                title="Kritik Stok Uyarısı! Mevcut miktar kritik eşiğin altına indi."
                className="text-rose-600 flex items-center"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
              </span>
            )}
          </div>
        );
      },
    },
    {
      field: 'totalCostValue',
      headerName: 'Maliyet Değeri',
      width: 170,
      cellRenderer: (params: ICellRendererParams<WarehouseStock>) => (
        <div className="text-right pr-2 text-xs font-mono font-bold text-stone-900">
          ₺{Number(params.value || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      ),
    },
    {
      field: 'totalCurrentValue',
      headerName: 'Güncel Değer',
      width: 170,
      cellRenderer: (params: ICellRendererParams<WarehouseStock>) => (
        <div className="text-right pr-2 text-xs font-mono font-bold text-indigo-700">
          ₺{Number(params.value || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      ),
    },
  ], []);

  const filteredStocks = useMemo(() => {
    return stocks.filter(s => {
      const matchWh = selectedWarehouseFilter === 'ALL' || s.warehouseId === selectedWarehouseFilter;
      const matchCritical = !onlyCriticalFilter || s.totalQuantity <= s.criticalStockLevel;
      const matchQuick = !quickFilterText ||
        (s.warehouseName || '').toLowerCase().includes(quickFilterText.toLowerCase()) ||
        (s.productSku || '').toLowerCase().includes(quickFilterText.toLowerCase()) ||
        (s.productName || '').toLowerCase().includes(quickFilterText.toLowerCase());
      return matchWh && matchCritical && matchQuick;
    });
  }, [stocks, selectedWarehouseFilter, onlyCriticalFilter, quickFilterText]);

  // Özet İstatistikler
  const summary = useMemo(() => {
    const totalQty = filteredStocks.reduce((sum, s) => sum + s.totalQuantity, 0);
    const totalCost = filteredStocks.reduce((sum, s) => sum + s.totalCostValue, 0);
    const totalCurrent = filteredStocks.reduce((sum, s) => sum + s.totalCurrentValue, 0);
    const criticalCount = filteredStocks.filter(s => s.totalQuantity <= s.criticalStockLevel).length;
    return { totalQty, totalCost, totalCurrent, criticalCount };
  }, [filteredStocks]);

  const exportToExcel = () => {
    const data = filteredStocks.map(s => ({
      'Depo': s.warehouseName,
      'Stok Kodu': s.productSku,
      'Ürün Adı': s.productName,
      'Birim': s.unitType || 'Adet',
      'Kritik Stok Eşiği': s.criticalStockLevel,
      'Toplam Miktar': s.totalQuantity,
      'Maliyet Değeri (TRY)': s.totalCostValue,
      'Güncel Satış Değeri (TRY)': s.totalCurrentValue,
      'Kritik Durum': s.totalQuantity <= s.criticalStockLevel ? 'KRİTİK' : 'NORMAL',
    }));
    downloadCsv(`Depo_Stok_Dagitimi_${new Date().toISOString().slice(0, 10)}.csv`, data);
  };

  const exportToPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('FX Enterprise ERP - Depo Bazında Stok Dağılımı Listesi', 14, 15);
    doc.setFontSize(9);
    doc.text(
      `Tarih: ${new Date().toLocaleString('tr-TR')} | Toplam Envanter Değeri: ₺${summary.totalCost.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`,
      14,
      22
    );

    const body = filteredStocks.map(s => [
      s.warehouseName || '',
      s.productSku || '',
      s.productName || '',
      `${s.criticalStockLevel} ${s.unitType || ''}`,
      `${s.totalQuantity} ${s.unitType || ''}`,
      `₺${s.totalCostValue.toFixed(2)}`,
      `₺${s.totalCurrentValue.toFixed(2)}`,
      s.totalQuantity <= s.criticalStockLevel ? 'KRİTİK UYARI' : 'Yeterli',
    ]);

    autoTable(doc, {
      head: [['Depo', 'Stok Kodu', 'Ürün Adı', 'Kritik Stok', 'Toplam Miktar', 'Maliyet Değeri', 'Güncel Değer', 'Durum']],
      body,
      startY: 26,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [49, 46, 129] },
    });

    doc.save(`Depo_Stok_Dagitimi_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const onGridReady = (params: GridReadyEvent<WarehouseStock>) => {
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

  const saveGridState = () => {
    if (!gridApi) return;
    try {
      const state = gridApi.getColumnState();
      localStorage.setItem(STORAGE_GRID_KEY, JSON.stringify(state));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-3">
      {/* İstatistik Özet Kartları */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-stone-200/90 rounded-lg p-3 shadow-xs">
          <div className="flex items-center justify-between text-xs text-stone-500 font-medium">
            <span>Toplam Envanter Adedi</span>
            <Package className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="mt-1 text-xl font-bold text-stone-900 font-mono tracking-tight">
            {summary.totalQty.toLocaleString('tr-TR')}
          </p>
          <span className="text-[11px] text-stone-400">Tüm depolar toplamı</span>
        </div>

        <div className="bg-white border border-stone-200/90 rounded-lg p-3 shadow-xs">
          <div className="flex items-center justify-between text-xs text-stone-500 font-medium">
            <span>Toplam Maliyet Değeri</span>
            <Coins className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="mt-1 text-xl font-bold text-stone-900 font-mono tracking-tight">
            ₺{summary.totalCost.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-emerald-600 font-medium">Net alış maliyetleri ile</span>
        </div>

        <div className="bg-white border border-stone-200/90 rounded-lg p-3 shadow-xs">
          <div className="flex items-center justify-between text-xs text-stone-500 font-medium">
            <span>Güncel Satış Değeri</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="mt-1 text-xl font-bold text-indigo-950 font-mono tracking-tight">
            ₺{summary.totalCurrent.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-indigo-600 font-medium">Satış fiyatı üzerinden potansiyel</span>
        </div>

        <div className="bg-white border border-stone-200/90 rounded-lg p-3 shadow-xs">
          <div className="flex items-center justify-between text-xs text-stone-500 font-medium">
            <span>Kritik Stok Uyarısı</span>
            <AlertTriangle className={`w-4 h-4 ${summary.criticalCount > 0 ? 'text-rose-600' : 'text-stone-400'}`} />
          </div>
          <p className={`mt-1 text-xl font-bold font-mono tracking-tight ${summary.criticalCount > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
            {summary.criticalCount} Kalem
          </p>
          <span className="text-[11px] text-stone-400">Sipariş verilmesi gerekenler</span>
        </div>
      </div>

      {/* Feedback Bildirimi */}
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
                placeholder="Depo adı, ürün veya stok kodu ara..."
                className="w-full pl-9 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-stone-800"
              />
            </div>

            <select
              value={selectedWarehouseFilter}
              onChange={(e) => setSelectedWarehouseFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-md text-xs text-stone-700 cursor-pointer"
            >
              <option value="ALL">Tüm Depolar ({warehouses.length})</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => setOnlyCriticalFilter(!onlyCriticalFilter)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                onlyCriticalFilter
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Sadece Kritik Stoktakiler</span>
            </button>
          </div>

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
          </div>
        </div>
      </div>

      {/* AG Grid Tablosu & Kolon Özelleştirici Sidebar */}
      <div className="flex gap-4 items-start relative h-[520px]">
        <div
          className={`bg-white border border-stone-200/90 rounded-lg shadow-xs overflow-hidden transition-all duration-300 ${
            isSidebarOpen ? 'flex-1' : 'w-full'
          }`}
        >
          <div style={{ height: '520px', width: '100%' }}>
            <AgGridReact<WarehouseStock> theme={appTheme}
              localeText={AG_GRID_LOCALE_TR}
              rowData={filteredStocks}
              columnDefs={columnDefs}
              pagination={true}
              paginationPageSize={10}
              paginationPageSizeSelector={[10, 25, 50]}
              onGridReady={onGridReady}
              onColumnMoved={saveGridState}
              onColumnVisible={saveGridState}
              onColumnResized={saveGridState}
              onSortChanged={saveGridState}
              rowHeight={52}
              headerHeight={42}
              animateRows={true}
              enableCellTextSelection={true}
              rowSelection={{
                mode: 'singleRow',
                checkboxes: false,
              }}
            />
          </div>
        </div>

        {/* ÖZEL SIDEBAR (Gelişmiş Görünüm ve Kolon Özelleştirme Paneli) */}
        {isSidebarOpen && (
          <AgGridColumnSidebar
            gridApi={gridApi}
            onSaveGridState={saveGridState}
            onClose={() => setIsSidebarOpen(false)}
            primaryColIds={['warehouseName', 'productSku', 'productName', 'criticalStockLevel', 'totalQuantity', 'totalCostValue', 'totalCurrentValue']}
            sidebarRef={sidebarRef}
          />
        )}
      </div>

      {/* ========================================================================= */}
      {/* KRİTİK SEVİYE GÜNCELLEME MODALI                                           */}
      {/* ========================================================================= */}
      {editingStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-stone-200 rounded-xl max-w-sm w-full p-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h4 className="font-bold text-stone-900 text-sm">Kritik Stok Seviyesi Belirle</h4>
              </div>
              <button
                onClick={() => setEditingStock(null)}
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCriticalLevel} className="mt-3 space-y-3 text-xs">
              <div className="p-2.5 bg-stone-50 rounded-lg border border-stone-200">
                <div className="font-semibold text-stone-900">{editingStock.productName}</div>
                <div className="text-[11px] text-stone-500 mt-0.5">
                  Depo: {editingStock.warehouseName} &bull; SKU: {editingStock.productSku}
                </div>
                <div className="text-[11px] font-mono font-bold text-indigo-700 mt-1">
                  Mevcut Stok: {editingStock.totalQuantity} {editingStock.unitType}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Yeni Kritik Eşik Seviyesi ({editingStock.unitType})
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  required
                  value={newCriticalLevel}
                  onChange={(e) => setNewCriticalLevel(Number(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-md font-mono font-bold"
                />
                <span className="text-[10px] text-stone-400 mt-0.5 block">
                  Mevcut miktar bu değerin altına indiğinde sistem otomatik uyarı verir.
                </span>
              </div>

              <div className="pt-2 border-t border-stone-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingStock(null)}
                  className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md shadow-xs"
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

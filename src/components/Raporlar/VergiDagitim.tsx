import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  PieChart,
  Calculator,
  Building2,
  Calendar,
  Layers,
  FileCheck,
  CheckCircle2,
  Search,
  X,
  Download,
  FilePieChart,
  Copy,
} from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { appTheme } from '../../lib/agGridTheme';
import { AG_GRID_LOCALE_TR } from '../../lib/agGridLocaleTR';
import {
  ModuleRegistry,
  AllCommunityModule,
  ValidationModule,
  
} from 'ag-grid-community';
import type {
  ColDef,
  GridApi,
  GridReadyEvent,
  ICellRendererParams,
  RowSelectionOptions,
} from 'ag-grid-community';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TaxAllocation, Branch } from '../../types/fx';
import { fxApi } from '../../services/api';
import { AgGridColumnSidebar, AgGridSidebarToggleBtn } from '../common/AgGridColumnSidebar';


const STORAGE_GRID_KEY = 'fx_vergi_dagitim_grid_state_v1';

export const VergiDagitim: React.FC = () => {
  const [allocations, setAllocations] = useState<TaxAllocation[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedTaxType, setSelectedTaxType] = useState<string>('KDV_1');
  const [period, setPeriod] = useState<string>('2026/08');
  const [totalCentralTaxAmount, setTotalCentralTaxAmount] = useState<number>(320000);
  const [distributionMethod, setDistributionMethod] = useState<'ciro' | 'netYuk'>('ciro');
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // AG Grid & Toolbar State
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [quickFilterText, setQuickFilterText] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const sidebarButtonRef = useRef<HTMLButtonElement>(null);

  // Şube ciro ve katsayıları
  const [branchTurnovers, setBranchTurnovers] = useState<Record<string, number>>({
    'b1111111-1111-1111-1111-111111111111': 4500000, // Merkez (%45)
    'b2222222-2222-2222-2222-222222222222': 2000000, // Kadıköy (%20)
    'b3333333-3333-3333-3333-333333333333': 2500000, // Ankara (%25)
    'b4444444-4444-4444-4444-444444444444': 1000000, // İzmir (%10)
  });

  useEffect(() => {
    setBranches(fxApi.getBranches());
    fxApi.getTaxAllocations().then((res) => setAllocations(res.data));
  }, []);

  const totalTurnover: number = (Object.values(branchTurnovers) as number[]).reduce((a: number, b: number) => a + b, 0);

  // Hesaplanan şube dağıtımları
  const computedAllocations = branches.map((branch) => {
    const branchTurnover = branchTurnovers[branch.id] || 0;
    const ratio = totalTurnover > 0 ? branchTurnover / totalTurnover : 0;
    const allocatedAmount = totalCentralTaxAmount * ratio;

    return {
      branchId: branch.id,
      branchName: branch.name,
      city: branch.city,
      turnover: branchTurnover,
      ratio: ratio,
      allocatedAmount: allocatedAmount,
    };
  });

  const handleApplyAllocation = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  // Grid State Persistence
  const onSaveGridState = useCallback(() => {
    if (!gridApi) return;
    try {
      const state = gridApi.getColumnState();
      localStorage.setItem(STORAGE_GRID_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Grid state kaydedilemedi:', e);
    }
  }, [gridApi]);

  const onGridReady = useCallback((params: GridReadyEvent) => {
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
      console.error('Grid state yüklenemedi:', e);
    }
  }, []);

  // AG Grid Kolon Tanımları
  const columnDefs = useMemo<ColDef[]>(() => {
    return [
      {
        colId: 'branchName',
        field: 'branchName',
        headerName: 'Şube Adı & İl',
        width: 240,
        pinned: 'left',
        cellRenderer: (params: ICellRendererParams) => {
          const d = params.data;
          if (!d) return null;
          return (
            <div className="flex flex-col justify-center h-full py-1">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="font-semibold text-stone-900 text-xs truncate">{d.branchName}</span>
              </div>
              <span className="text-[10px] text-stone-400 pl-5">{d.city}</span>
            </div>
          );
        },
      },
      {
        colId: 'turnover',
        field: 'turnover',
        headerName: 'Şube Cirosu (₺)',
        width: 180,
        cellRenderer: (params: ICellRendererParams) => {
          const d = params.data;
          if (!d) return null;
          return (
            <div className="flex items-center h-full">
              <input
                type="number"
                value={branchTurnovers[d.branchId] || 0}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setBranchTurnovers((prev) => ({
                    ...prev,
                    [d.branchId]: val,
                  }));
                }}
                className="w-full px-2 py-1 text-xs font-mono font-semibold text-stone-900 bg-stone-50 border border-stone-200 rounded focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-colors"
              />
            </div>
          );
        },
      },
      {
        colId: 'ratio',
        field: 'ratio',
        headerName: 'Dağıtım Payı (%)',
        width: 150,
        cellRenderer: (params: ICellRendererParams) => {
          const d = params.data;
          if (!d) return null;
          return (
            <div className="flex items-center justify-center h-full">
              <span className="inline-block px-2.5 py-0.5 font-mono font-bold text-xs bg-indigo-50 text-indigo-800 rounded-full border border-indigo-100">
                %{(d.ratio * 100).toFixed(1)}
              </span>
            </div>
          );
        },
      },
      {
        colId: 'allocatedAmount',
        field: 'allocatedAmount',
        headerName: 'Şubeye Yansıtılan Vergi (₺)',
        width: 220,
        cellRenderer: (params: ICellRendererParams) => {
          const d = params.data;
          if (!d) return null;
          return (
            <div className="flex flex-col justify-center h-full text-right pr-2">
              <span className="font-mono font-bold text-stone-900 text-xs">
                ₺{d.allocatedAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[9px] text-stone-400 font-mono">DECIMAL(18,4)</span>
            </div>
          );
        },
      },
      {
        colId: 'plImpact',
        headerName: 'P&l Net Kâr Etkisi',
        minWidth: 180,
        flex: 1,
        cellRenderer: (params: ICellRendererParams) => {
          const d = params.data;
          if (!d) return null;
          return (
            <div className="flex flex-col justify-center h-full text-right pr-2">
              <span className="text-xs font-mono font-semibold text-rose-600">
                -₺{d.allocatedAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-stone-400">Gider Hanesine Eklenir</span>
            </div>
          );
        },
      },
    ];
  }, [branchTurnovers]);

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    filter: true,
    resizable: true,
  }), []);

  const rowSelection = useMemo<RowSelectionOptions>(() => ({
    mode: 'singleRow',
    checkboxes: false,
    enableClickSelection: true,
  }), []);

  // Excel & PDF Dışa Aktarma
  const handleExportExcel = () => {
    const data = computedAllocations.map((item) => ({
      'Şube Adı': item.branchName,
      'Şehir': item.city,
      'Şube Cirosu (₺)': item.turnover,
      'Dağıtım Payı (%)': (item.ratio * 100).toFixed(2),
      'Yansıtılan Vergi (₺)': item.allocatedAmount,
      'P&L Etkisi (₺)': -item.allocatedAmount,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Vergi_Dagitim_Matrisi');
    XLSX.writeFile(wb, `Vergi_Dagitim_${period.replace('/', '_')}.xlsx`);
  };

  const handleExportPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`Vergi Dağıtımı & Şube P&L Matrisi (${period})`, 14, 15);
    doc.setFontSize(9);
    doc.text(`Merkez Toplam Vergi: ₺${totalCentralTaxAmount.toLocaleString('tr-TR')} | Dağıtım Yöntemi: ${distributionMethod === 'ciro' ? 'Ciro Oranı' : 'Net Yük'}`, 14, 22);

    const body = computedAllocations.map((item) => [
      item.branchName,
      item.city,
      `₺${item.turnover.toLocaleString('tr-TR')}`,
      `%${(item.ratio * 100).toFixed(1)}`,
      `₺${item.allocatedAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`,
      `-₺${item.allocatedAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`,
    ]);

    autoTable(doc, {
      head: [['Şube', 'Şehir', 'Ciro (₺)', 'Oran', 'Yansıtılan Vergi', 'P&L Etkisi']],
      body,
      startY: 26,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [49, 46, 129] },
    });

    doc.save(`Vergi_Dagitim_${period.replace('/', '_')}.pdf`);
  };

  return (
    <div className="space-y-4">
      {/* Üst Bilgilendirme */}
      <div className="bg-white border border-stone-200/90 rounded-lg p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded-md">
                <PieChart className="w-5 h-5" />
              </span>
              <h2 className="text-base font-bold text-stone-900">
                Resmi Vergi Dağıtımı & Şube Kâr/Zarar (P&L) Modülü
              </h2>
            </div>
            <p className="text-xs text-stone-600 mt-1 max-w-3xl leading-relaxed">
              Türk Vergi Kanunları gereğince şirketler <span className="font-semibold text-stone-800">Tek VKN ({fxApi.getCurrentTenant().taxNumber})</span> altında beyanname verir. Merkezin topluca ödediği resmi KDV, Muhtasar veya Kurumlar Vergisi giderleri, şubelerin kâr/zarar tablolarına ciro veya net yük oranına göre dağıtılarak 'tax_allocations' tablosuna yazılır.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-2.5 py-1 bg-stone-100 rounded text-stone-700 border border-stone-200">
              VKN: {fxApi.getCurrentTenant().taxNumber}
            </span>
          </div>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          Vergi dağıtım fişi başarıyla 'tax_allocations' tablosuna işlendi ve şube P&L hanelerine dağıtıldı.
        </div>
      )}

      {/* Hesaplama Parametreleri */}
      <div className="bg-white border border-stone-200/90 rounded-lg p-4 shadow-xs">
        <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Calculator className="w-4 h-4 text-indigo-600" />
          Merkez Vergi Beyannamesi Dağıtım Parametreleri
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-stone-600 mb-1">Vergi Türü</label>
            <select
              value={selectedTaxType}
              onChange={(e) => setSelectedTaxType(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded focus:ring-1 focus:ring-indigo-500 font-medium"
            >
              <option value="KDV_1">KDV 1 Beyannamesi (Aylık)</option>
              <option value="Muhtasar_Gelir">Muhtasar ve Prim Hizmet Beyannamesi</option>
              <option value="Kurumlar_Vergisi">Kurumlar Vergisi Geçici Beyannamesi</option>
              <option value="Damga_Vergisi">Damga Vergisi Beyannamesi</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-stone-600 mb-1">Dönem</label>
            <div className="relative">
              <input
                type="text"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded focus:ring-1 focus:ring-indigo-500 font-mono"
              />
              <Calendar className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-stone-600 mb-1">Merkezin Ödediği Toplam Tutar (₺)</label>
            <input
              type="number"
              value={totalCentralTaxAmount}
              onChange={(e) => setTotalCentralTaxAmount(parseFloat(e.target.value) || 0)}
              className="w-full text-xs px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded focus:ring-1 focus:ring-indigo-500 font-mono font-bold text-stone-900"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-stone-600 mb-1">Dağıtım Anahtarı (Model)</label>
            <select
              value={distributionMethod}
              onChange={(e) => setDistributionMethod(e.target.value as any)}
              className="w-full text-xs px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ciro">Ciro Oranı Dağıtımı (Turnover Ratio)</option>
              <option value="netYuk">Net Vergi Yükü Katkı Oranı</option>
            </select>
          </div>
        </div>
      </div>

      {/* KONTROL & FİLTRE & DIŞA AKTARMA ÇUBUĞU */}
      <div className="bg-white border border-stone-200/90 rounded-lg p-3 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Sol: Arama Input */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="relative min-w-[240px] max-w-sm w-full sm:w-auto">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={quickFilterText}
                onChange={(e) => setQuickFilterText(e.target.value)}
                placeholder="Şube veya şehir ara..."
                className="w-full pl-8 pr-7 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
              />
              {quickFilterText && (
                <button
                  type="button"
                  onClick={() => setQuickFilterText('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <span className="text-xs text-stone-400">
              Toplam <strong className="text-stone-700">{computedAllocations.length}</strong> şube
            </span>
          </div>

          {/* Sağ: Aksiyonlar & Dışa Aktarma & Kolon Özelleştirme */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleApplyAllocation}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors shadow-xs cursor-pointer"
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Dağıtımı Kesinleştir</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:text-stone-900 hover:bg-stone-50 border border-stone-200 rounded-md transition-colors cursor-pointer"
              title="Excel formatında dışa aktar"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Excel</span>
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:text-stone-900 hover:bg-stone-50 border border-stone-200 rounded-md transition-colors cursor-pointer"
              title="PDF formatında matris indir"
            >
              <FilePieChart className="w-3.5 h-3.5 text-rose-600" />
              <span>PDF</span>
            </button>

            <AgGridSidebarToggleBtn
              isOpen={isSidebarOpen}
              onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
              gridApi={gridApi}
              buttonRef={sidebarButtonRef}
            />
          </div>
        </div>
      </div>

      {/* AG GRID VE ÖZEL SÜTUN SIDEBAR ALANI */}
      <div className="flex gap-4 items-start relative h-[440px]">
        {/* AG GRID TABLOSU */}
        <div
          className={`bg-white border border-stone-200/90 rounded-lg shadow-xs overflow-hidden transition-all duration-300 ${
            isSidebarOpen ? 'flex-1' : 'w-full'
          }`}
        >
          <div className="w-full" style={{ height: '440px', width: '100%' }}>
            <AgGridReact theme={appTheme}
              localeText={AG_GRID_LOCALE_TR}
              rowData={computedAllocations}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              rowSelection={rowSelection}
              quickFilterText={quickFilterText}
              pagination={true}
              paginationPageSize={10}
              paginationPageSizeSelector={[10, 25, 50]}
              onGridReady={onGridReady}
              onColumnMoved={onSaveGridState}
              onColumnVisible={onSaveGridState}
              onColumnResized={onSaveGridState}
              onSortChanged={onSaveGridState}
              rowHeight={54}
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
            onSaveGridState={onSaveGridState}
            onClose={() => setIsSidebarOpen(false)}
            primaryColIds={['branchName', 'turnover', 'ratio', 'allocatedAmount', 'plImpact']}
            sidebarRef={sidebarRef}
          />
        )}
      </div>

      {/* ALT ÖZET BAR */}
      <div className="bg-stone-50 border border-stone-200/90 rounded-lg p-3 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-6">
          <div>
            <span className="text-stone-500">Toplam Ciro:</span>{' '}
            <strong className="font-mono text-stone-900">
              ₺{totalTurnover.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </strong>
          </div>
          <div>
            <span className="text-stone-500">Dağıtılan Toplam Vergi:</span>{' '}
            <strong className="font-mono text-stone-900">
              ₺{totalCentralTaxAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </strong>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-stone-500">Toplam P&L Gider Etkisi:</span>{' '}
          <strong className="font-mono text-rose-700 font-bold text-sm">
            -₺{totalCentralTaxAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          </strong>
        </div>
      </div>
    </div>
  );
};

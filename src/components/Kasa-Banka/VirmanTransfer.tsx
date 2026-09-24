import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ArrowRightLeft,
  Clock,
  CheckCircle2,
  AlertOctagon,
  ShieldAlert,
  Send,
  Building2,
  Wallet,
  Building,
  RotateCcw,
  Search,
  X,
  Download,
  FilePieChart,
  Copy,
  Check,
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
import { downloadCsv } from '../../lib/exportUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { InterBranchTransfer, CashBank, Branch } from '../../types/fx';
import { fxApi, branchContext } from '../../services/api';
import { AgGridColumnSidebar, AgGridSidebarToggleBtn } from '../common/AgGridColumnSidebar';


const STORAGE_GRID_KEY = 'fx_virman_transfer_grid_state_v1';

export const VirmanTransfer: React.FC = () => {
  const [transfers, setTransfers] = useState<InterBranchTransfer[]>([]);
  const [cashBanks, setCashBanks] = useState<CashBank[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // AG Grid & Toolbar State
  const [gridApi, setGridApi] = useState<GridApi<InterBranchTransfer> | null>(null);
  const [quickFilterText, setQuickFilterText] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const sidebarButtonRef = useRef<HTMLButtonElement>(null);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    data: InterBranchTransfer | null;
  }>({
    visible: false,
    x: 0,
    y: 0,
    data: null,
  });

  // Form State
  const [sourceBranchId, setSourceBranchId] = useState<string>('');
  const [targetBranchId, setTargetBranchId] = useState<string>('');
  const [sourceAccountId, setSourceAccountId] = useState<string>('');
  const [targetAccountId, setTargetAccountId] = useState<string>('');
  const [amount, setAmount] = useState<string>('50000');
  const [description, setDescription] = useState<string>('Şubeler arası operasyonel likidite dengeleme virmanı');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const allBranches = fxApi.getBranches();
      setBranches(allBranches);

      const [trRes, cbRes] = await Promise.all([
        fxApi.getTransfers(),
        fxApi.getCashesAndBanks('all'),
      ]);

      setTransfers(trRes.data);
      setCashBanks(cbRes.data);

      // İlk seçimleri varsayılan yap
      if (allBranches.length >= 2) {
        if (!sourceBranchId) setSourceBranchId(allBranches[0].id);
        if (!targetBranchId) setTargetBranchId(allBranches[1].id);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [sourceBranchId, targetBranchId]);

  useEffect(() => {
    loadData();
    const unsub = branchContext.subscribe(() => {
      loadData();
    });
    return () => unsub();
  }, [loadData]);

  // Kaynak şubeye ait hesaplar
  const sourceAccounts = useMemo(() => {
    return cashBanks.filter((cb) => cb.branchId === sourceBranchId);
  }, [cashBanks, sourceBranchId]);

  // Hedef şubeye ait hesaplar
  const targetAccounts = useMemo(() => {
    return cashBanks.filter((cb) => cb.branchId === targetBranchId);
  }, [cashBanks, targetBranchId]);

  // Otomatik hesap seçimi
  useEffect(() => {
    if (sourceAccounts.length > 0 && (!sourceAccountId || !sourceAccounts.find((a) => a.id === sourceAccountId))) {
      setSourceAccountId(sourceAccounts[0].id);
    }
  }, [sourceAccounts, sourceAccountId]);

  useEffect(() => {
    if (targetAccounts.length > 0 && (!targetAccountId || !targetAccounts.find((a) => a.id === targetAccountId))) {
      setTargetAccountId(targetAccounts[0].id);
    }
  }, [targetAccounts, targetAccountId]);

  const selectedSourceAccount = useMemo(() => {
    return cashBanks.find((cb) => cb.id === sourceAccountId);
  }, [cashBanks, sourceAccountId]);

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const parsedAmount = parseFloat(amount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFeedback({ type: 'error', message: 'Geçerli bir transfer tutarı giriniz.' });
      return;
    }

    try {
      const res = await fxApi.initiateTransfer({
        sourceBranchId,
        targetBranchId,
        sourceCashBankId: sourceAccountId,
        targetCashBankId: targetAccountId,
        amount: parsedAmount,
        description,
      });

      setFeedback({
        type: 'success',
        message: res.message || 'Virman başlatıldı (WaitingApproval).',
      });
      loadData();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Transfer başarısız. IDbContextTransaction Rollback işletildi.',
      });
    }
  };

  const handleApprove = async (transferId: string) => {
    setFeedback(null);
    try {
      const res = await fxApi.approveTransfer(transferId);
      setFeedback({
        type: 'success',
        message: res.message || 'Transfer onaylandı ve hedef hesaba işlendi.',
      });
      loadData();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Onaylama başarısız oldu.',
      });
    }
  };

  const testRollbackScenario = async () => {
    setFeedback(null);
    // Kaynak hesap bakiyesini aşan tutar girerek Rollback tetikle
    const overAmount = (selectedSourceAccount?.balance || 10000) + 5000000;
    try {
      await fxApi.initiateTransfer({
        sourceBranchId,
        targetBranchId,
        sourceCashBankId: sourceAccountId,
        targetCashBankId: targetAccountId,
        amount: overAmount,
        description: 'Test amaçlı aşırı bakiye çekimi (Atomic Rollback Testi)',
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message,
      });
    }
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

  const onGridReady = useCallback((params: GridReadyEvent<InterBranchTransfer>) => {
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
  const columnDefs = useMemo<ColDef<InterBranchTransfer>[]>(() => {
    return [
      {
        colId: 'transferNumber',
        field: 'transferNumber',
        headerName: 'Fiş No & Tarih',
        width: 170,
        pinned: 'left',
        cellRenderer: (params: ICellRendererParams<InterBranchTransfer>) => {
          const d = params.data;
          if (!d) return null;
          return (
            <div className="flex flex-col justify-center h-full py-1">
              <span className="font-mono font-bold text-stone-900 text-xs">{d.transferNumber}</span>
              <span className="text-[10px] text-stone-400">
                {new Date(d.createdAt).toLocaleDateString('tr-TR')} {new Date(d.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        },
      },
      {
        colId: 'sourceBranchName',
        field: 'sourceBranchName',
        headerName: 'Kaynak Şube & Hesap',
        width: 220,
        cellRenderer: (params: ICellRendererParams<InterBranchTransfer>) => {
          const d = params.data;
          if (!d) return null;
          return (
            <div className="flex flex-col justify-center h-full py-1">
              <span className="font-semibold text-stone-800 text-xs">{d.sourceBranchName}</span>
              <span className="text-[11px] text-stone-500 truncate" title={d.sourceCashBankName}>
                {d.sourceCashBankName}
              </span>
            </div>
          );
        },
      },
      {
        colId: 'targetBranchName',
        field: 'targetBranchName',
        headerName: 'Hedef Şube & Hesap',
        width: 220,
        cellRenderer: (params: ICellRendererParams<InterBranchTransfer>) => {
          const d = params.data;
          if (!d) return null;
          return (
            <div className="flex flex-col justify-center h-full py-1">
              <span className="font-semibold text-stone-800 text-xs">{d.targetBranchName}</span>
              <span className="text-[11px] text-stone-500 truncate" title={d.targetCashBankName}>
                {d.targetCashBankName}
              </span>
            </div>
          );
        },
      },
      {
        colId: 'amount',
        field: 'amount',
        headerName: 'Tutar (₺)',
        width: 160,
        cellRenderer: (params: ICellRendererParams<InterBranchTransfer>) => {
          const d = params.data;
          if (!d) return null;
          return (
            <div className="flex flex-col justify-center h-full text-right pr-2">
              <span className="font-mono font-extrabold text-stone-900 text-xs">
                ₺{d.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[9px] text-stone-400 font-mono">DECIMAL(18,4)</span>
            </div>
          );
        },
      },
      {
        colId: 'description',
        field: 'description',
        headerName: 'Açıklama / Referans',
        minWidth: 200,
        flex: 1,
        cellRenderer: (params: ICellRendererParams<InterBranchTransfer>) => {
          const d = params.data;
          if (!d) return null;
          return (
            <div className="flex items-center h-full text-xs text-stone-600 truncate" title={d.description}>
              {d.description || '-'}
            </div>
          );
        },
      },
      {
        colId: 'status',
        field: 'status',
        headerName: 'Durum',
        width: 170,
        cellRenderer: (params: ICellRendererParams<InterBranchTransfer>) => {
          const d = params.data;
          if (!d) return null;
          if (d.status === 'WaitingApproval') {
            return (
              <div className="flex items-center h-full">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-full font-medium text-[10px]">
                  <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                  WaitingApproval (Askıda)
                </span>
              </div>
            );
          }
          if (d.status === 'Completed') {
            return (
              <div className="flex items-center h-full">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full font-medium text-[10px]">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Tamamlandı (Onaylandı)
                </span>
              </div>
            );
          }
          return (
            <div className="flex items-center h-full">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-full font-medium text-[10px]">
                <AlertOctagon className="w-3 h-3 text-rose-600" />
                Geri Alındı (Rolled Back)
              </span>
            </div>
          );
        },
      },
      {
        colId: 'actions',
        headerName: 'İşlemler',
        width: 150,
        pinned: 'right',
        cellRenderer: (params: ICellRendererParams<InterBranchTransfer>) => {
          const d = params.data;
          if (!d) return null;
          if (d.status === 'WaitingApproval') {
            return (
              <div className="flex items-center justify-end h-full">
                <button
                  type="button"
                  onClick={() => handleApprove(d.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors shadow-xs cursor-pointer"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Teslim Al & Onayla
                </button>
              </div>
            );
          }
          return (
            <div className="flex items-center justify-end h-full">
              <span className="text-[11px] text-stone-400 italic">İşlem Kapandı</span>
            </div>
          );
        },
      },
    ];
  }, []);

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

  // Dışa Aktarma Fonksiyonları (Excel & PDF)
  const handleExportExcel = () => {
    const data = transfers.map((tr) => ({
      'Fiş Numarası': tr.transferNumber,
      'Oluşturulma Tarihi': new Date(tr.createdAt).toLocaleString('tr-TR'),
      'Kaynak Şube': tr.sourceBranchName,
      'Kaynak Hesap': tr.sourceCashBankName,
      'Hedef Şube': tr.targetBranchName,
      'Hedef Hesap': tr.targetCashBankName,
      'Virman Tutarı (₺)': tr.amount,
      'Açıklama': tr.description,
      'Durum': tr.status === 'WaitingApproval' ? 'Askıda (Onay Bekliyor)' : tr.status === 'Completed' ? 'Tamamlandı' : 'Geri Alındı',
    }));

    downloadCsv(`Virman_Transferleri_${new Date().toISOString().slice(0, 10)}.csv`, data);
  };

  const handleExportPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('Şubeler Arası Virman Transferleri Listesi', 14, 15);
    doc.setFontSize(9);
    doc.text(`Rapor Tarihi: ${new Date().toLocaleString('tr-TR')} | Toplam Kayıt: ${transfers.length}`, 14, 22);

    const body = transfers.map((tr) => [
      tr.transferNumber,
      new Date(tr.createdAt).toLocaleDateString('tr-TR'),
      `${tr.sourceBranchName} - ${tr.sourceCashBankName}`,
      `${tr.targetBranchName} - ${tr.targetCashBankName}`,
      `₺${tr.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`,
      tr.description || '-',
      tr.status,
    ]);

    autoTable(doc, {
      head: [['Fiş No', 'Tarih', 'Kaynak Şube / Kasa', 'Hedef Şube / Kasa', 'Tutar (₺)', 'Açıklama', 'Durum']],
      body,
      startY: 26,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [49, 46, 129] },
    });

    doc.save(`Virman_Transferleri_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handleCellContextMenu = (params: any) => {
    if (params.event) {
      params.event.preventDefault();
      setContextMenu({
        visible: true,
        x: params.event.clientX,
        y: params.event.clientY,
        data: params.data,
      });
    }
  };

  useEffect(() => {
    const closeContext = () => {
      if (contextMenu.visible) {
        setContextMenu({ visible: false, x: 0, y: 0, data: null });
      }
    };
    window.addEventListener('click', closeContext);
    return () => window.removeEventListener('click', closeContext);
  }, [contextMenu]);

  return (
    <div className="space-y-5">
      {/* Başlık ve Mimari Açıklama */}
      <div className="bg-white border border-stone-200/90 rounded-lg p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded-md">
                <ArrowRightLeft className="w-5 h-5" />
              </span>
              <h2 className="text-base font-bold text-stone-900">
                2 Aşamalı Şubeler Arası Virman Akışı (Inter-Branch Transfer Engine)
              </h2>
            </div>
            <p className="text-xs text-stone-600 mt-1 max-w-3xl leading-relaxed">
              Clean Architecture CQRS / MediatR standardında; kaynak şube transfer emri verdiğinde para kaynak
              kasadan düşer ve durum <code className="px-1.5 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded font-mono text-[11px]">WaitingApproval (Askıda/Yolda)</code> olur. Hedef şube onayladığında bakiye hedef hesaba yansıtılır. Tüm süreç <code className="px-1.5 py-0.5 bg-stone-100 text-stone-800 rounded font-mono text-[11px]">IDbContextTransaction</code> içinde atomik yürütülür.
            </p>
          </div>

          <button
            onClick={testRollbackScenario}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-md transition-colors"
            title="Bakiye aşımı simülasyonu yaparak Rollback tetikler"
          >
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            Atomic Rollback Testi Yap
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-lg border text-xs font-medium flex items-start gap-2.5 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-950 font-mono'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <span className="font-semibold block mb-0.5">
              {feedback.type === 'success' ? 'İşlem Başarılı' : 'Veritabanı Hata ve Rollback Yakalandı:'}
            </span>
            <span>{feedback.message}</span>
          </div>
        </div>
      )}

      {/* İki Kolonlu Panel: Sol Yeni Virman Emri, Sağ Kasa Durumları */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* SOL: Yeni Virman Emri Oluştur (CQRS CreateTransferCommand) */}
        <div className="lg:col-span-2 bg-white border border-stone-200/90 rounded-lg p-4 shadow-xs">
          <h3 className="text-sm font-semibold text-stone-900 mb-3 flex items-center gap-2">
            <Send className="w-4 h-4 text-indigo-600" />
            Yeni Şubeler Arası Virman Emri (CreateTransferCommand)
          </h3>

          <form onSubmit={handleCreateTransfer} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Kaynak Şube & Kasa */}
              <div className="bg-stone-50/80 p-3 rounded-lg border border-stone-200/80 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
                  <Building2 className="w-3.5 h-3.5 text-rose-600" />
                  1. ÇIKIŞ YAPILACAK KAYNAK ŞUBE
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-stone-600 mb-1">Kaynak Şube</label>
                  <select
                    value={sourceBranchId}
                    onChange={(e) => setSourceBranchId(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 bg-white border border-stone-200 rounded focus:ring-1 focus:ring-indigo-500 font-medium"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.city})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-stone-600 mb-1">Kaynak Kasa / Banka Hesabı</label>
                  <select
                    value={sourceAccountId}
                    onChange={(e) => setSourceAccountId(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 bg-white border border-stone-200 rounded focus:ring-1 focus:ring-indigo-500"
                  >
                    {sourceAccounts.map((sa) => (
                      <option key={sa.id} value={sa.id}>
                        {sa.name} - (Bakiye: ₺{sa.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })})
                      </option>
                    ))}
                  </select>
                  {selectedSourceAccount && (
                    <p className="text-[11px] text-stone-500 mt-1">
                      Mevcut Bakiye:{' '}
                      <span className="font-bold text-stone-900 font-mono">
                        ₺{selectedSourceAccount.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {/* Hedef Şube & Kasa */}
              <div className="bg-stone-50/80 p-3 rounded-lg border border-stone-200/80 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
                  <Building className="w-3.5 h-3.5 text-emerald-600" />
                  2. GİRİŞ YAPILACAK HEDEF ŞUBE
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-stone-600 mb-1">Hedef Şube</label>
                  <select
                    value={targetBranchId}
                    onChange={(e) => setTargetBranchId(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 bg-white border border-stone-200 rounded focus:ring-1 focus:ring-indigo-500 font-medium"
                  >
                    {branches
                      .filter((b) => b.id !== sourceBranchId)
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.city})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-stone-600 mb-1">Hedef Kasa / Banka Hesabı</label>
                  <select
                    value={targetAccountId}
                    onChange={(e) => setTargetAccountId(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 bg-white border border-stone-200 rounded focus:ring-1 focus:ring-indigo-500"
                  >
                    {targetAccounts.map((ta) => (
                      <option key={ta.id} value={ta.id}>
                        {ta.name} - (Bakiye: ₺{ta.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-amber-700 mt-1">
                    Hedef hesap bakiyesi transfer onaylandığında artırılacaktır.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-medium text-stone-700 mb-1">Virman Tutarı (₺ - Decimal 18,4) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-bold text-stone-900 border border-stone-200 rounded focus:ring-1 focus:ring-indigo-500"
                  placeholder="0.00"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[11px] font-medium text-stone-700 mb-1">Virman Açıklaması / Referans</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs text-stone-900 border border-stone-200 rounded focus:ring-1 focus:ring-indigo-500"
                  placeholder="Açıklama giriniz..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors shadow-xs"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                Virman Emrini Başlat (Kaynak Kasadan Düşür)
              </button>
            </div>
          </form>
        </div>

        {/* SAĞ: Şube Kasaları Canlı Bakiye Özeti */}
        <div className="bg-white border border-stone-200/90 rounded-lg p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <h3 className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-stone-600" />
                Şube Kasaları ve Bankaları
              </h3>
              <button onClick={loadData} className="text-stone-400 hover:text-stone-700">
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-3 space-y-2.5 max-h-[290px] overflow-y-auto pr-1">
              {cashBanks.map((cb) => {
                const branch = branches.find((b) => b.id === cb.branchId);
                return (
                  <div
                    key={cb.id}
                    className="p-2.5 rounded border border-stone-100 bg-stone-50/60 hover:bg-stone-50 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-stone-900 truncate max-w-[170px]" title={cb.name}>
                        {cb.name}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 bg-stone-200/80 rounded text-stone-700">
                        {cb.type === 'Bank' ? 'BANKA' : 'NAKİT KASA'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[11px]">
                      <span className="text-stone-500 truncate">{branch?.name.split('(')[0]}</span>
                      <span className="font-mono font-bold text-stone-900">
                        ₺{cb.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-stone-100 text-[11px] text-stone-500">
            Toplam Konsolide Likidite:{' '}
            <span className="font-mono font-bold text-indigo-900">
              ₺{cashBanks.reduce((a, c) => a + c.balance, 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </span>
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
                placeholder="Virman fiş no, şube, kasa veya açıklama ara..."
                className="w-full pl-8 pr-7 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
              />
              {quickFilterText && (
                <button
                  type="button"
                  onClick={() => setQuickFilterText('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <span className="text-xs text-stone-400">
              Toplam <strong className="text-stone-700">{transfers.length}</strong> transfer kaydı
            </span>
          </div>

          {/* Sağ: Dışa Aktarma & Kolon Özelleştirme */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:text-stone-900 hover:bg-stone-50 border border-stone-200 rounded-md transition-colors cursor-pointer"
              title="CSV formatında dışa aktar"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>CSV</span>
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:text-stone-900 hover:bg-stone-50 border border-stone-200 rounded-md transition-colors cursor-pointer"
              title="PDF formatında mizan indir"
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
      <div className="flex gap-4 items-start relative h-[560px]">
        {/* AG GRID TABLOSU */}
        <div
          className={`bg-white border border-stone-200/90 rounded-lg shadow-xs overflow-hidden transition-all duration-300 ${
            isSidebarOpen ? 'flex-1' : 'w-full'
          }`}
        >
          <div className="w-full" style={{ height: '560px', width: '100%' }}>
            <AgGridReact<InterBranchTransfer> theme={appTheme}
              localeText={AG_GRID_LOCALE_TR}
              rowData={transfers}
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
              onCellContextMenu={handleCellContextMenu}
              rowHeight={58}
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
            primaryColIds={['transferNumber', 'sourceBranchName', 'targetBranchName', 'amount', 'status', 'actions']}
            sidebarRef={sidebarRef}
          />
        )}
      </div>

      {/* SAĞ TIK CONTEXT MENU */}
      {contextMenu.visible && contextMenu.data && (
        <div
          className="fixed z-50 bg-white border border-stone-200 rounded-lg shadow-xl p-1 w-52 text-xs text-stone-700 animate-in fade-in duration-100"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 font-bold text-stone-900 border-b border-stone-100 flex items-center justify-between">
            <span className="font-mono text-[11px] truncate">{contextMenu.data.transferNumber}</span>
            <span className="text-[10px] text-stone-400 font-normal">Virman</span>
          </div>

          <button
            onClick={() => {
              navigator.clipboard.writeText(contextMenu.data?.transferNumber || '');
              setContextMenu({ visible: false, x: 0, y: 0, data: null });
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-stone-50 rounded flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Copy className="w-3.5 h-3.5 text-stone-500" />
            <span>Fiş Numarasını Kopyala</span>
          </button>

          {contextMenu.data.status === 'WaitingApproval' && (
            <button
              onClick={() => {
                if (contextMenu.data) handleApprove(contextMenu.data.id);
                setContextMenu({ visible: false, x: 0, y: 0, data: null });
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 text-emerald-700 rounded flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Transferi Teslim Al & Onayla</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

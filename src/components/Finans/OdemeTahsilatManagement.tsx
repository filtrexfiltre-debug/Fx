import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { appTheme } from '../../lib/agGridTheme';
import { AG_GRID_LOCALE_TR } from '../../lib/agGridLocaleTR';
import {
  ColDef,
  ICellRendererParams,
  ModuleRegistry,
  AllCommunityModule,
  ValidationModule,
  
  GridReadyEvent,
  GridApi,
} from 'ag-grid-community';
import {
  Search,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  Building,
  Wallet,
  CreditCard,
  FileText,
  Calendar,
  Filter,
  Download,
  Printer,
  Eye,
  Trash2,
  RefreshCw,
  SlidersHorizontal,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Coins,
  X,
  FileSpreadsheet,
  Check,
  Building2,
  Share2,
  Banknote,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  PaymentMovement,
  PaymentMovementType,
  PaymentMethodType,
  Branch,
  CashBank,
  Tenant,
} from '../../types/fx';
import { fxApi, branchContext } from '../../services/api';
import { CURRENT_TENANT } from '../../data/mockData';
import { NewHareketModal } from './NewHareketModal';
import { AgGridColumnSidebar, AgGridSidebarToggleBtn } from '../common/AgGridColumnSidebar';
import { BorcAlacakManagement } from './BorcAlacakManagement';

// AG Grid modüllerini kaydet

const STORAGE_COLUMNS_KEY = 'fx_odeme_tahsilat_columns_v1';

export const OdemeTahsilatManagement: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'borc-alacak' | 'hareketler'>('borc-alacak');
  const [movements, setMovements] = useState<PaymentMovement[]>([]);
  const [cashBanks, setCashBanks] = useState<CashBank[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(branchContext.getSelectedBranchId());
  const [isGlobalUser, setIsGlobalUser] = useState<boolean>(branchContext.getIsGlobalUser());
  const [quickFilterText, setQuickFilterText] = useState<string>('');

  // Filtreler
  const [typeFilter, setTypeFilter] = useState<'ALL' | PaymentMovementType>('ALL');
  const [methodFilter, setMethodFilter] = useState<'ALL' | PaymentMethodType>('ALL');
  const [dateRangeFilter, setDateRangeFilter] = useState<'ALL' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH'>('ALL');

  // Modallar
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [modalInitialType, setModalInitialType] = useState<PaymentMovementType>('TAHSILAT');
  const [selectedMovementForReceipt, setSelectedMovementForReceipt] = useState<PaymentMovement | null>(null);
  const [selectedMovementForDetail, setSelectedMovementForDetail] = useState<PaymentMovement | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // AG Grid & Sidebar States (Cari Hesaplar Standartı)
  const gridRef = useRef<AgGridReact<PaymentMovement>>(null);
  const [gridApi, setGridApi] = useState<GridApi<PaymentMovement> | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const sidebarButtonRef = useRef<HTMLButtonElement>(null);

  const onSaveGridState = useCallback(() => {
    if (!gridApi) return;
    try {
      const colState = gridApi.getColumnState();
      localStorage.setItem(STORAGE_COLUMNS_KEY, JSON.stringify(colState));
    } catch (e) {
      console.warn('Grid state save failed:', e);
    }
  }, [gridApi]);

  // Aktif Şube İsmi
  const currentBranchName = useMemo(() => {
    if (isGlobalUser || selectedBranchId === 'all') return 'Tüm Şubeler (Konsolide Rapor)';
    const found = branches.find(b => b.id === selectedBranchId);
    return found ? found.name : 'Seçili Şube';
  }, [branches, selectedBranchId, isGlobalUser]);

  // Context dinleyici
  useEffect(() => {
    const unsubscribe = branchContext.subscribe(() => {
      setSelectedBranchId(branchContext.getSelectedBranchId());
      setIsGlobalUser(branchContext.getIsGlobalUser());
    });
    return unsubscribe;
  }, []);

  // Verileri Yükle
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [movRes, cbRes, brRes] = await Promise.all([
        fxApi.getPaymentMovements(selectedBranchId, isGlobalUser),
        fxApi.getCashBanks(selectedBranchId),
        fxApi.getBranches(),
      ]);

      setMovements(movRes.data || []);
      setCashBanks(cbRes.data || []);
      setBranches(Array.isArray(brRes) ? brRes : (brRes as any)?.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId, isGlobalUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtrelenmiş Veri (AG Grid, Excel ve PDF için)
  const filteredMovements = useMemo(() => {
    let result = [...movements];

    // Arama Metni Filtresi
    if (quickFilterText.trim()) {
      const q = quickFilterText.trim().toLowerCase();
      result = result.filter(
        m =>
          m.documentNumber?.toLowerCase().includes(q) ||
          m.receiptNumber?.toLowerCase().includes(q) ||
          m.contactTitle?.toLowerCase().includes(q) ||
          m.contactCode?.toLowerCase().includes(q) ||
          m.description?.toLowerCase().includes(q) ||
          m.cashBankName?.toLowerCase().includes(q) ||
          m.category?.toLowerCase().includes(q) ||
          m.amount?.toString().includes(q)
      );
    }

    if (typeFilter !== 'ALL') {
      result = result.filter(m => m.movementType === typeFilter);
    }

    if (methodFilter !== 'ALL') {
      result = result.filter(m => m.paymentMethod === methodFilter);
    }

    if (dateRangeFilter !== 'ALL') {
      const now = new Date();
      if (dateRangeFilter === 'TODAY') {
        const todayStr = now.toISOString().slice(0, 10);
        result = result.filter(m => m.movementDate.startsWith(todayStr));
      } else if (dateRangeFilter === 'THIS_WEEK') {
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        result = result.filter(m => new Date(m.movementDate) >= oneWeekAgo);
      } else if (dateRangeFilter === 'THIS_MONTH') {
        const thisMonthStr = now.toISOString().slice(0, 7); // YYYY-MM
        result = result.filter(m => m.movementDate.startsWith(thisMonthStr));
      }
    }

    return result;
  }, [movements, typeFilter, methodFilter, dateRangeFilter, quickFilterText]);

  // KPI / İstatistik Hesaplamaları (Filtrelere ve arama kriterlerine göre dinamik)
  const kpis = useMemo(() => {
    // 1. Tarih ve Arama filtrelerini uygulayan temel bağlam listesi
    let contextual = [...movements];

    if (quickFilterText.trim()) {
      const q = quickFilterText.trim().toLowerCase();
      contextual = contextual.filter(
        m =>
          m.documentNumber?.toLowerCase().includes(q) ||
          m.receiptNumber?.toLowerCase().includes(q) ||
          m.contactTitle?.toLowerCase().includes(q) ||
          m.contactCode?.toLowerCase().includes(q) ||
          m.description?.toLowerCase().includes(q) ||
          m.cashBankName?.toLowerCase().includes(q) ||
          m.category?.toLowerCase().includes(q) ||
          m.amount?.toString().includes(q)
      );
    }

    if (dateRangeFilter !== 'ALL') {
      const now = new Date();
      if (dateRangeFilter === 'TODAY') {
        const todayStr = now.toISOString().slice(0, 10);
        contextual = contextual.filter(m => m.movementDate.startsWith(todayStr));
      } else if (dateRangeFilter === 'THIS_WEEK') {
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        contextual = contextual.filter(m => new Date(m.movementDate) >= oneWeekAgo);
      } else if (dateRangeFilter === 'THIS_MONTH') {
        const thisMonthStr = now.toISOString().slice(0, 7); // YYYY-MM
        contextual = contextual.filter(m => m.movementDate.startsWith(thisMonthStr));
      }
    }

    // Kanal filtresi seçilmişse (ve Çek filtresi değilse) kanala göre de kısıtla
    let forTypeCalc = contextual;
    if (methodFilter !== 'ALL' && methodFilter !== 'CEK_SENET') {
      forTypeCalc = contextual.filter(m => m.paymentMethod === methodFilter);
    }

    let totalTahsilat = 0;
    let countTahsilat = 0;
    let totalOdeme = 0;
    let countOdeme = 0;
    let totalMasraf = 0;
    let countMasraf = 0;
    let totalPendingCheques = 0;
    let countPendingCheques = 0;

    forTypeCalc.forEach(m => {
      if (m.movementType === 'TAHSILAT') {
        totalTahsilat += m.amount;
        countTahsilat++;
      } else if (m.movementType === 'ODEME') {
        totalOdeme += m.amount;
        countOdeme++;
      } else if (m.movementType === 'MASRAF') {
        totalMasraf += m.amount;
        countMasraf++;
      }
    });

    // Portföydeki bekleyen çekler (bağlam içi)
    contextual.forEach(m => {
      if (m.paymentMethod === 'CEK_SENET' && m.status === 'PENDING') {
        totalPendingCheques += m.amount;
        countPendingCheques++;
      }
    });

    const netCashFlow = totalTahsilat - (totalOdeme + totalMasraf);
    const totalCashBankBalance = cashBanks.reduce((sum, cb) => sum + (cb.balance || 0), 0);

    return {
      totalTahsilat,
      countTahsilat,
      totalOdeme,
      countOdeme,
      totalMasraf,
      countMasraf,
      netCashFlow,
      totalPendingCheques,
      countPendingCheques,
      totalCashBankBalance,
      isFilteredContext: dateRangeFilter !== 'ALL' || quickFilterText.trim() !== '' || methodFilter !== 'ALL',
    };
  }, [movements, cashBanks, quickFilterText, dateRangeFilter, methodFilter]);

  // Filtreleri Sıfırlama
  const handleResetFilters = () => {
    setTypeFilter('ALL');
    setMethodFilter('ALL');
    setDateRangeFilter('ALL');
    setQuickFilterText('');
  };

  // Hareketi Silme / Geri Alma
  const handleDeleteMovement = async (id: string, docNo: string) => {
    if (!window.confirm(`${docNo} numaralı finansal hareketi silmek ve ilgili kasa/cari bakiyelerini eski haline getirmek istiyor musunuz?`)) {
      return;
    }

    try {
      const res = await fxApi.deletePaymentMovement(id);
      if (res.success) {
        setFeedbackMessage(`${docNo} numaralı işlem silindi ve bakiyeler dengelendi.`);
        setTimeout(() => setFeedbackMessage(null), 3500);
        loadData();
      }
    } catch (e: any) {
      alert(e?.message || 'Silme işlemi sırasında hata oluştu.');
    }
  };

  // Yeni Hareket Açılışı
  const handleOpenNewModal = (type: PaymentMovementType) => {
    setModalInitialType(type);
    setIsNewModalOpen(true);
  };

  // Excel İhracı
  const handleExportExcel = () => {
    try {
      const exportData = filteredMovements.map(m => ({
        'Belge / Fiş No': m.documentNumber,
        'Tarih': new Date(m.movementDate).toLocaleString('tr-TR'),
        'İşlem Türü':
          m.movementType === 'TAHSILAT'
            ? 'Tahsilat (Giriş)'
            : m.movementType === 'ODEME'
            ? 'Ödeme (Çıkış)'
            : 'Masraf & Gider',
        'Ödeme Kanalı':
          m.paymentMethod === 'BANKA'
            ? 'Banka EFT/Havale'
            : m.paymentMethod === 'NAKIT'
            ? 'Nakit Kasa'
            : m.paymentMethod === 'KREDI_KARTI'
            ? 'Kredi Kartı POS'
            : 'Çek / Senet',
        'Cari / Muhatap': m.contactTitle,
        'Cari Kodu': m.contactCode || '-',
        'Kasa / Banka Hesabı': m.cashBankName,
        'Tutar': m.amount,
        'Para Birimi': m.currency,
        'Vade Tarihi': m.dueDate || '-',
        'Masraf Kategorisi': m.category || '-',
        'Açıklama': m.description,
        'Durum': m.status === 'COMPLETED' ? 'Tamamlandı' : 'Bekliyor',
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Odeme_Tahsilat');
      XLSX.writeFile(wb, `FX_Odeme_Tahsilat_Listesi_${new Date().toISOString().slice(0, 10)}.xlsx`);

      setFeedbackMessage('Excel dosyası başarıyla indirildi.');
      setTimeout(() => setFeedbackMessage(null), 3500);
    } catch (e) {
      console.error(e);
      alert('Excel aktarımı başarısız oldu.');
    }
  };

  // PDF İhracı
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({ orientation: 'landscape' });
      doc.setFontSize(14);
      doc.text(`FX Enterprise - Ödeme & Tahsilat Hareketleri (${currentBranchName})`, 14, 15);
      doc.setFontSize(9);
      doc.text(`Rapor Tarihi: ${new Date().toLocaleString('tr-TR')} | Toplam Kayıt: ${filteredMovements.length}`, 14, 22);

      const tableData = filteredMovements.map(m => [
        new Date(m.movementDate).toLocaleDateString('tr-TR'),
        m.documentNumber,
        m.movementType === 'TAHSILAT' ? 'Tahsilat' : m.movementType === 'ODEME' ? 'Ödeme' : 'Masraf',
        m.contactTitle.length > 25 ? m.contactTitle.slice(0, 23) + '...' : m.contactTitle,
        m.paymentMethod === 'BANKA' ? 'Banka' : m.paymentMethod === 'NAKIT' ? 'Nakit' : m.paymentMethod === 'KREDI_KARTI' ? 'Kart' : 'Çek',
        m.cashBankName.length > 20 ? m.cashBankName.slice(0, 18) + '...' : m.cashBankName,
        `₺${m.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`,
        m.description.length > 28 ? m.description.slice(0, 26) + '...' : m.description,
        m.status === 'COMPLETED' ? 'Tamamlandı' : 'Bekliyor',
      ]);

      autoTable(doc, {
        startY: 26,
        head: [['Tarih', 'Fiş No', 'Tür', 'Cari / Muhatap', 'Kanal', 'Hesap', 'Tutar', 'Açıklama', 'Durum']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42], fontSize: 8 },
        styles: { fontSize: 7, cellPadding: 2 },
      });

      doc.save(`FX_Odeme_Tahsilat_${new Date().toISOString().slice(0, 10)}.pdf`);
      setFeedbackMessage('PDF raporu başarıyla indirildi.');
      setTimeout(() => setFeedbackMessage(null), 3500);
    } catch (e) {
      console.error(e);
      alert('PDF oluşturulamadı.');
    }
  };

  // AG Grid Kolon Tanımları
  const columnDefs = useMemo<ColDef<PaymentMovement>[]>(() => {
    return [
      {
        headerName: 'Tarih & Saat',
        field: 'movementDate',
        width: 150,
        pinned: 'left',
        cellRenderer: (params: ICellRendererParams<PaymentMovement>) => {
          if (!params.value) return '-';
          const d = new Date(params.value);
          return (
            <div className="flex flex-col justify-center leading-tight py-1 font-mono text-[11px]">
              <span className="font-semibold text-stone-800">{d.toLocaleDateString('tr-TR')}</span>
              <span className="text-[10px] text-stone-400">
                {d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        },
      },
      {
        headerName: 'Fiş / Belge No',
        field: 'documentNumber',
        width: 145,
        cellRenderer: (params: ICellRendererParams<PaymentMovement>) => {
          const val = params.value || '-';
          const m = params.data;
          return (
            <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-stone-900">
              <span>{val}</span>
              {m?.receiptNumber && (
                <span className="text-[9px] px-1 py-0.2 bg-stone-100 text-stone-500 rounded border border-stone-200" title={`Makbuz No: ${m.receiptNumber}`}>
                  {m.receiptNumber}
                </span>
              )}
            </div>
          );
        },
      },
      {
        headerName: 'İşlem Türü',
        field: 'movementType',
        width: 135,
        cellRenderer: (params: ICellRendererParams<PaymentMovement>) => {
          const type = params.value as PaymentMovementType;
          if (type === 'TAHSILAT') {
            return (
              <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                <span>Tahsilat (Giriş)</span>
              </div>
            );
          } else if (type === 'ODEME') {
            return (
              <div className="flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                <span>Ödeme (Çıkış)</span>
              </div>
            );
          } else {
            return (
              <div className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                <Receipt className="w-3.5 h-3.5 text-amber-600" />
                <span>Masraf & Gider</span>
              </div>
            );
          }
        },
      },
      {
        headerName: 'Cari / Muhatap Bilgisi',
        field: 'contactTitle',
        minWidth: 220,
        flex: 1,
        cellRenderer: (params: ICellRendererParams<PaymentMovement>) => {
          const data = params.data;
          if (!data) return '-';
          return (
            <div className="flex flex-col justify-center leading-tight py-1">
              <span className="font-semibold text-stone-900 text-xs truncate" title={data.contactTitle}>
                {data.contactTitle}
              </span>
              <div className="flex items-center gap-2 text-[10px] text-stone-400 font-mono mt-0.5">
                {data.contactCode && <span>Kod: {data.contactCode}</span>}
                {data.category && (
                  <span className="px-1.5 py-0.2 bg-amber-50 text-amber-700 rounded border border-amber-200/60 font-sans">
                    {data.category}
                  </span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        headerName: 'Ödeme Kanalı',
        field: 'paymentMethod',
        width: 140,
        cellRenderer: (params: ICellRendererParams<PaymentMovement>) => {
          const method = params.value as PaymentMethodType;
          if (method === 'BANKA') {
            return (
              <span className="inline-flex items-center gap-1 text-xs text-blue-700 font-medium">
                <Building className="w-3.5 h-3.5 text-blue-500" />
                <span>Banka Havale</span>
              </span>
            );
          } else if (method === 'NAKIT') {
            return (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium">
                <Wallet className="w-3.5 h-3.5 text-emerald-500" />
                <span>Nakit Kasa</span>
              </span>
            );
          } else if (method === 'KREDI_KARTI') {
            return (
              <span className="inline-flex items-center gap-1 text-xs text-purple-700 font-medium">
                <CreditCard className="w-3.5 h-3.5 text-purple-500" />
                <span>Kredi Kartı POS</span>
              </span>
            );
          } else {
            return (
              <span className="inline-flex items-center gap-1 text-xs text-amber-700 font-medium">
                <FileText className="w-3.5 h-3.5 text-amber-500" />
                <span>Çek / Senet</span>
              </span>
            );
          }
        },
      },
      {
        headerName: 'Kasa / Banka Hesabı',
        field: 'cashBankName',
        width: 180,
        cellRenderer: (params: ICellRendererParams<PaymentMovement>) => {
          return (
            <span className="text-xs text-stone-700 truncate block" title={params.value}>
              {params.value || '-'}
            </span>
          );
        },
      },
      {
        headerName: 'Tutar',
        field: 'amount',
        width: 140,
        cellRenderer: (params: ICellRendererParams<PaymentMovement>) => {
          const m = params.data;
          if (!m) return '-';
          const isIncome = m.movementType === 'TAHSILAT';
          return (
            <div
              className={`font-mono text-xs font-bold ${
                isIncome ? 'text-emerald-600' : 'text-stone-900'
              }`}
            >
              {isIncome ? '+' : '-'}₺
              {m.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </div>
          );
        },
      },
      {
        headerName: 'Vade / Çek Detayı',
        field: 'dueDate',
        width: 130,
        cellRenderer: (params: ICellRendererParams<PaymentMovement>) => {
          const m = params.data;
          if (!m) return '-';
          if (m.paymentMethod === 'CEK_SENET' && m.dueDate) {
            return (
              <div className="flex flex-col text-[11px] font-mono leading-tight py-1">
                <span className="text-amber-800 font-semibold">{m.dueDate}</span>
                {m.chequeInfo?.serialNumber && (
                  <span className="text-[10px] text-stone-400">Seri: {m.chequeInfo.serialNumber}</span>
                )}
              </div>
            );
          }
          return <span className="text-stone-300">-</span>;
        },
      },
      {
        headerName: 'Açıklama',
        field: 'description',
        width: 180,
        flex: 1,
        cellRenderer: (params: ICellRendererParams<PaymentMovement>) => {
          return (
            <span className="text-xs text-stone-500 truncate block" title={params.value}>
              {params.value || '-'}
            </span>
          );
        },
      },
      {
        headerName: 'Durum',
        field: 'status',
        width: 110,
        cellRenderer: (params: ICellRendererParams<PaymentMovement>) => {
          const status = params.value;
          if (status === 'COMPLETED') {
            return (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Tamamlandı</span>
              </span>
            );
          } else {
            return (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                <Clock className="w-3 h-3 text-amber-600" />
                <span>Bekliyor</span>
              </span>
            );
          }
        },
      },
      {
        headerName: 'İşlemler',
        width: 140,
        pinned: 'right',
        cellRenderer: (params: ICellRendererParams<PaymentMovement>) => {
          const data = params.data;
          if (!data) return null;
          return (
            <div className="flex items-center gap-1 py-1">
              <button
                onClick={() => setSelectedMovementForReceipt(data)}
                title="Resmi Makbuz / Fiş Görüntüle ve Yazdır"
                className="p-1.5 text-stone-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSelectedMovementForDetail(data)}
                title="İşlem Detayını Görüntüle"
                className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDeleteMovement(data.id, data.documentNumber)}
                title="Hareketi Sil ve Bakiyeyi Geri Al"
                className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        },
      },
    ];
  }, []);

  const defaultColDef = useMemo<ColDef>(() => {
    return {
      sortable: true,
      filter: true,
      resizable: true,
    };
  }, []);

  const onGridReady = (params: GridReadyEvent<PaymentMovement>) => {
    setGridApi(params.api);
    try {
      const saved = localStorage.getItem(STORAGE_COLUMNS_KEY);
      if (saved) {
        params.api.applyColumnState({ state: JSON.parse(saved), applyOrder: true });
      } else {
        params.api.sizeColumnsToFit();
      }
    } catch (e) {
      params.api.sizeColumnsToFit();
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* GERİ BİLDİRİM TOASTI */}
      {feedbackMessage && (
        <div className="fixed top-5 right-5 z-50 p-3 bg-stone-900 text-white text-xs rounded-xl shadow-xl border border-stone-800 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* ÜST SUB-NAVBAR: AÇIK İŞLEMLER vs KASA/BANKA HAREKETLERİ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-stone-200">
        <div>
          <h1 className="text-xl font-black text-stone-900 tracking-tight flex items-center gap-2">
            <Banknote className="w-6 h-6 text-stone-700" />
            <span>Ödemeler & Tahsilatlar</span>
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Bekleyen açık faturalar (müşteri alacakları & tedarikçi borçları) ve gerçekleşen kasa/banka hareketleri
          </p>
        </div>

        <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200 text-xs shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveSubTab('borc-alacak')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeSubTab === 'borc-alacak'
                ? 'bg-white text-stone-900 shadow-xs ring-1 ring-stone-900/5'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>Açık İşlemler (Borç & Alacak)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('hareketler')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeSubTab === 'hareketler'
                ? 'bg-white text-stone-900 shadow-xs ring-1 ring-stone-900/5'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <Receipt className="w-4 h-4 text-indigo-600" />
            <span>Kasa & Banka Hareket Günlüğü</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'borc-alacak' ? (
        <BorcAlacakManagement currentBranchId={selectedBranchId} isGlobalUser={isGlobalUser} />
      ) : (
        <>
          {/* KPI KARTLARI (ÖZET PANELİ - DİNAMİK & TIKLANABİLİR FİLTRELEME) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* 1. TOPLAM TAHSİLAT */}
        <button
          type="button"
          onClick={() => setTypeFilter(typeFilter === 'TAHSILAT' ? 'ALL' : 'TAHSILAT')}
          title={typeFilter === 'TAHSILAT' ? 'Tahsilat filtresini kaldır' : 'Listeyi sadece tahsilatlara göre filtrele'}
          className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all duration-150 cursor-pointer group select-none ${
            typeFilter === 'TAHSILAT'
              ? 'ring-2 ring-emerald-500 border-emerald-400 bg-emerald-50/50 shadow-sm'
              : 'bg-white border-stone-200/90 shadow-xs hover:border-emerald-300 hover:bg-emerald-50/15'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-stone-500 w-full">
            <span className="font-semibold text-stone-700">Toplam Tahsilat</span>
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                typeFilter === 'TAHSILAT' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 font-mono text-lg font-black text-emerald-600">
            ₺{kpis.totalTahsilat.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center justify-between text-[10px] mt-0.5 w-full">
            <span className="text-stone-400">{kpis.countTahsilat} adet tahsilat</span>
            {typeFilter === 'TAHSILAT' ? (
              <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-600 text-white rounded-full">✓ Aktif</span>
            ) : (
              <span className="text-[9px] text-stone-400 group-hover:text-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity">
                Filtrele
              </span>
            )}
          </div>
        </button>

        {/* 2. TOPLAM ÖDEME */}
        <button
          type="button"
          onClick={() => setTypeFilter(typeFilter === 'ODEME' ? 'ALL' : 'ODEME')}
          title={typeFilter === 'ODEME' ? 'Ödeme filtresini kaldır' : 'Listeyi sadece ödemelere göre filtrele'}
          className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all duration-150 cursor-pointer group select-none ${
            typeFilter === 'ODEME'
              ? 'ring-2 ring-rose-500 border-rose-400 bg-rose-50/50 shadow-sm'
              : 'bg-white border-stone-200/90 shadow-xs hover:border-rose-300 hover:bg-rose-50/15'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-stone-500 w-full">
            <span className="font-semibold text-stone-700">Toplam Ödeme</span>
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                typeFilter === 'ODEME' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-600 group-hover:bg-rose-100'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 font-mono text-lg font-black text-rose-600">
            ₺{kpis.totalOdeme.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center justify-between text-[10px] mt-0.5 w-full">
            <span className="text-stone-400">{kpis.countOdeme} adet tediye</span>
            {typeFilter === 'ODEME' ? (
              <span className="text-[9px] font-bold px-1.5 py-0.2 bg-rose-600 text-white rounded-full">✓ Aktif</span>
            ) : (
              <span className="text-[9px] text-stone-400 group-hover:text-rose-700 opacity-0 group-hover:opacity-100 transition-opacity">
                Filtrele
              </span>
            )}
          </div>
        </button>

        {/* 3. MASRAF & GİDER */}
        <button
          type="button"
          onClick={() => setTypeFilter(typeFilter === 'MASRAF' ? 'ALL' : 'MASRAF')}
          title={typeFilter === 'MASRAF' ? 'Masraf filtresini kaldır' : 'Listeyi sadece masraf/giderlere göre filtrele'}
          className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all duration-150 cursor-pointer group select-none ${
            typeFilter === 'MASRAF'
              ? 'ring-2 ring-amber-500 border-amber-400 bg-amber-50/50 shadow-sm'
              : 'bg-white border-stone-200/90 shadow-xs hover:border-amber-300 hover:bg-amber-50/15'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-stone-500 w-full">
            <span className="font-semibold text-stone-700">Masraf & Gider</span>
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                typeFilter === 'MASRAF' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-600 group-hover:bg-amber-100'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 font-mono text-lg font-black text-amber-600">
            ₺{kpis.totalMasraf.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center justify-between text-[10px] mt-0.5 w-full">
            <span className="text-stone-400">{kpis.countMasraf} masraf kaydı</span>
            {typeFilter === 'MASRAF' ? (
              <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-600 text-white rounded-full">✓ Aktif</span>
            ) : (
              <span className="text-[9px] text-stone-400 group-hover:text-amber-700 opacity-0 group-hover:opacity-100 transition-opacity">
                Filtrele
              </span>
            )}
          </div>
        </button>

        {/* 4. NET NAKİT AKIŞI */}
        <button
          type="button"
          onClick={() => {
            setTypeFilter('ALL');
            if (methodFilter === 'CEK_SENET') setMethodFilter('ALL');
          }}
          title="Tüm işlem türlerini göster (Tür filtresini sıfırla)"
          className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all duration-150 cursor-pointer group select-none ${
            typeFilter === 'ALL' && methodFilter === 'ALL'
              ? 'ring-2 ring-indigo-500/70 border-indigo-300 bg-indigo-50/30 shadow-sm'
              : 'bg-white border-stone-200/90 shadow-xs hover:border-indigo-300 hover:bg-indigo-50/15'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-stone-500 w-full">
            <span className="font-semibold text-stone-700">Net Nakit Akışı</span>
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                kpis.netCashFlow >= 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
            </div>
          </div>
          <div
            className={`mt-2 font-mono text-lg font-black ${
              kpis.netCashFlow >= 0 ? 'text-indigo-900' : 'text-rose-600'
            }`}
          >
            {kpis.netCashFlow >= 0 ? '+' : ''}₺
            {kpis.netCashFlow.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center justify-between text-[10px] mt-0.5 w-full">
            <span className="text-stone-400">Tahsilat - (Ödeme + Gider)</span>
            {typeFilter === 'ALL' && methodFilter === 'ALL' && (
              <span className="text-[9px] font-bold px-1.5 py-0.2 bg-indigo-100 text-indigo-800 rounded-full">Tümü</span>
            )}
          </div>
        </button>

        {/* 5. BEKLEYEN ÇEK / SENET */}
        <button
          type="button"
          onClick={() => setMethodFilter(methodFilter === 'CEK_SENET' ? 'ALL' : 'CEK_SENET')}
          title={methodFilter === 'CEK_SENET' ? 'Çek filtresini kaldır' : 'Listeyi çek ve senet hareketlerine göre filtrele'}
          className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all duration-150 cursor-pointer group select-none col-span-2 sm:col-span-1 ${
            methodFilter === 'CEK_SENET'
              ? 'ring-2 ring-stone-800 border-stone-700 bg-stone-100/80 shadow-sm'
              : 'bg-white border-stone-200/90 shadow-xs hover:border-stone-400 hover:bg-stone-50'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-stone-500 w-full">
            <span className="font-semibold text-stone-700">Portföydeki Çekler</span>
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                methodFilter === 'CEK_SENET' ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600 group-hover:bg-stone-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 font-mono text-lg font-black text-stone-800">
            ₺{kpis.totalPendingCheques.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center justify-between text-[10px] mt-0.5 w-full">
            <span className="text-stone-400">{kpis.countPendingCheques} bekleyen çek</span>
            {methodFilter === 'CEK_SENET' ? (
              <span className="text-[9px] font-bold px-1.5 py-0.2 bg-stone-800 text-white rounded-full">✓ Aktif</span>
            ) : (
              <span className="text-[9px] text-stone-400 group-hover:text-stone-800 opacity-0 group-hover:opacity-100 transition-opacity">
                Filtrele
              </span>
            )}
          </div>
        </button>
      </div>

      {/* ARAÇ VE FİLTRE ÇUBUĞU */}
      <div className="bg-white p-3.5 rounded-xl border border-stone-200/90 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* SOL: Arama & Hızlı Filtreler */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Arama Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari, Fiş No veya Açıklama ara..."
              value={quickFilterText}
              onChange={e => setQuickFilterText(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
            />
            {quickFilterText && (
              <button
                type="button"
                onClick={() => setQuickFilterText('')}
                className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Tür Filtresi */}
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as any)}
            className={`px-2.5 py-1.5 text-xs border rounded-lg font-medium focus:ring-2 focus:ring-indigo-500/20 cursor-pointer ${
              typeFilter !== 'ALL'
                ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-semibold'
                : 'bg-stone-50 border-stone-200 text-stone-700'
            }`}
          >
            <option value="ALL">Tüm İşlem Türleri</option>
            <option value="TAHSILAT">Sadece Tahsilatlar</option>
            <option value="ODEME">Sadece Ödemeler</option>
            <option value="MASRAF">Sadece Masraflar</option>
          </select>

          {/* Kanal Filtresi */}
          <select
            value={methodFilter}
            onChange={e => setMethodFilter(e.target.value as any)}
            className={`px-2.5 py-1.5 text-xs border rounded-lg font-medium focus:ring-2 focus:ring-indigo-500/20 cursor-pointer ${
              methodFilter !== 'ALL'
                ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-semibold'
                : 'bg-stone-50 border-stone-200 text-stone-700'
            }`}
          >
            <option value="ALL">Tüm Ödeme Kanalları</option>
            <option value="BANKA">Banka EFT / Havale</option>
            <option value="NAKIT">Nakit Kasa</option>
            <option value="KREDI_KARTI">Kredi Kartı POS</option>
            <option value="CEK_SENET">Çek / Senet</option>
          </select>

          {/* Tarih Filtresi */}
          <select
            value={dateRangeFilter}
            onChange={e => setDateRangeFilter(e.target.value as any)}
            className={`px-2.5 py-1.5 text-xs border rounded-lg font-medium focus:ring-2 focus:ring-indigo-500/20 cursor-pointer ${
              dateRangeFilter !== 'ALL'
                ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-semibold'
                : 'bg-stone-50 border-stone-200 text-stone-700'
            }`}
          >
            <option value="ALL">Tüm Tarihler</option>
            <option value="TODAY">Bugün</option>
            <option value="THIS_WEEK">Son 7 Gün</option>
            <option value="THIS_MONTH">Bu Ay</option>
          </select>

          {/* Filtreleri Sıfırla Butonu */}
          {(typeFilter !== 'ALL' || methodFilter !== 'ALL' || dateRangeFilter !== 'ALL' || quickFilterText.trim() !== '') && (
            <button
              type="button"
              onClick={handleResetFilters}
              title="Tüm filtreleri temizle"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Filtreleri Temizle ({filteredMovements.length}/{movements.length})</span>
            </button>
          )}
        </div>

        {/* SAĞ: Aksiyonlar & Yeni Ekle Butonları */}
        <div className="flex items-center gap-2">
          {/* Yenile */}
          <button
            type="button"
            onClick={loadData}
            title="Verileri Yenile"
            className="p-1.5 text-stone-600 hover:text-stone-900 bg-stone-50 hover:bg-stone-100 rounded-lg border border-stone-200 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Excel & PDF */}
          <button
            type="button"
            onClick={handleExportExcel}
            title="Excel Olarak İndir"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-stone-700 bg-stone-50 hover:bg-stone-100 rounded-lg border border-stone-200 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Excel</span>
          </button>

          <button
            type="button"
            onClick={handleExportPDF}
            title="PDF Raporu İndir"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-stone-700 bg-stone-50 hover:bg-stone-100 rounded-lg border border-stone-200 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-rose-600" />
            <span className="hidden sm:inline">PDF</span>
          </button>

          <AgGridSidebarToggleBtn
            isOpen={isSidebarOpen}
            onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
            gridApi={gridApi}
            buttonRef={sidebarButtonRef}
          />

          {/* YENİ HAREKET BUTONLARI */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleOpenNewModal('TAHSILAT')}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all shadow-xs cursor-pointer"
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>+ Tahsilat</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenNewModal('ODEME')}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-all shadow-xs cursor-pointer"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+ Ödeme</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenNewModal('MASRAF')}
              className="hidden md:inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-white rounded-lg transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Masraf</span>
            </button>
          </div>
        </div>
      </div>

      {/* AG GRID TABLOSU & ÖZEL SÜTUN SIDEBAR */}
      <div className="flex gap-4 items-start relative h-[580px]">
        <div
          className={`bg-white rounded-xl border border-stone-200/90 shadow-xs overflow-hidden transition-all duration-300 ${
            isSidebarOpen ? 'flex-1' : 'w-full'
          }`}
        >
          <div style={{ height: '580px', width: '100%' }}>
            <AgGridReact<PaymentMovement> theme={appTheme}
              ref={gridRef}
              localeText={AG_GRID_LOCALE_TR}
              rowData={filteredMovements}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              quickFilterText={quickFilterText}
              onGridReady={onGridReady}
              onColumnMoved={onSaveGridState}
              onColumnVisible={onSaveGridState}
              onColumnResized={onSaveGridState}
              onSortChanged={onSaveGridState}
              pagination={true}
              paginationPageSize={15}
              paginationPageSizeSelector={[15, 30, 50, 100]}
              rowHeight={48}
              headerHeight={42}
              animateRows={true}
              enableCellTextSelection={true}
              rowSelection={{
                mode: 'singleRow',
                checkboxes: false,
              }}
              noRowsOverlayComponent={() => (
                <div className="flex flex-col items-center justify-center p-8 text-stone-400">
                  <Wallet className="w-8 h-8 mb-2 stroke-1" />
                  <span className="text-xs font-semibold">Gösterilecek finansal hareket bulunamadı.</span>
                  <span className="text-[11px] text-stone-400 mt-0.5">
                    Yukarıdaki "+ Tahsilat" veya "+ Ödeme" butonlarını kullanarak yeni fiş oluşturabilirsiniz.
                  </span>
                </div>
              )}
            />
          </div>
        </div>

        {/* ÖZEL SIDEBAR (Gelişmiş Görünüm ve Kolon Özelleştirme Paneli) */}
        {isSidebarOpen && (
          <AgGridColumnSidebar
            gridApi={gridApi}
            onSaveGridState={onSaveGridState}
            onClose={() => setIsSidebarOpen(false)}
            primaryColIds={['documentNumber', 'movementDate', 'contactTitle', 'cashBankName', 'amount', 'status']}
            sidebarRef={sidebarRef}
          />
        )}
      </div>

      {/* YENİ HAREKET MODALI */}
      <NewHareketModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        initialType={modalInitialType}
        selectedBranchId={selectedBranchId}
        onSuccess={mov => {
          setFeedbackMessage(`${mov.documentNumber} başarıyla oluşturuldu.`);
          setTimeout(() => setFeedbackMessage(null), 3500);
          loadData();
        }}
      />

      {/* RESMİ MAKBUZ / DEKONT YAZDIRMA VE ÖNİZLEME MODALI */}
      {selectedMovementForReceipt && (
        <ReceiptPrintModal
          movement={selectedMovementForReceipt}
          tenant={CURRENT_TENANT}
          branchName={currentBranchName}
          onClose={() => setSelectedMovementForReceipt(null)}
        />
      )}

      {/* İŞLEM DETAY MODALI */}
      {selectedMovementForDetail && (
        <MovementDetailModal
          movement={selectedMovementForDetail}
          onClose={() => setSelectedMovementForDetail(null)}
        />
      )}
        </>
      )}
    </div>
  );
};

// =========================================================================
// RESMİ MAKBUZ / DEKONT YAZDIRMA MODAL BİLEŞENİ (PRINT & PDF)
// =========================================================================
interface ReceiptPrintModalProps {
  movement: PaymentMovement;
  tenant: Tenant;
  branchName: string;
  onClose: () => void;
}

const ReceiptPrintModal: React.FC<ReceiptPrintModalProps> = ({
  movement,
  tenant,
  branchName,
  onClose,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const isTahsilat = movement.movementType === 'TAHSILAT';
  const isOdeme = movement.movementType === 'ODEME';
  const receiptTitle = isTahsilat
    ? 'RESMİ TAHSİLAT MAKBUZU'
    : isOdeme
    ? 'RESMİ TEDİYE (ÖDEME) MAKBUZU'
    : 'MASRAF / GİDER MAKBUZU';

  // Sayıyı Yazıyla Türk Lirası formatına çevirme
  const numberToTurkishWords = (amount: number): string => {
    // Basit ve şık Türkçe tutar metni
    return `${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} Türk Lirası`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-2xl my-6 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* ÜST BUTONLAR */}
        <div className="px-6 py-3.5 bg-stone-900 text-white flex items-center justify-between border-b border-stone-800 print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold">{receiptTitle} Önizleme & Yazdır</h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Yazdır (A4/A5)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MAKBUZ GÖVDESİ (YAZDIRILABİLİR ALAN) */}
        <div ref={printRef} className="p-8 bg-white text-stone-900 space-y-6">
          {/* MAKBUZ BAŞLIĞI & ŞİRKET ANTETİ */}
          <div className="border-b-2 border-stone-900 pb-4 flex justify-between items-start">
            <div>
              <h1 className="text-base font-black tracking-tight uppercase text-stone-950">
                {tenant.name}
              </h1>
              <div className="text-[11px] text-stone-600 mt-1 space-y-0.5">
                <div>{tenant.taxOffice} &bull; VKN: <strong>{tenant.taxNumber}</strong></div>
                <div>Ticaret Sicil No: {tenant.tradeRegisterNumber} &bull; MERSİS: {tenant.mersisNumber}</div>
                <div>Şube / Lokasyon: <strong>{branchName}</strong></div>
              </div>
            </div>

            <div className="text-right">
              <div
                className={`text-xs font-black uppercase px-3 py-1 rounded border ${
                  isTahsilat
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-rose-50 text-rose-800 border-rose-300'
                }`}
              >
                {receiptTitle}
              </div>
              <div className="text-xs font-mono font-bold mt-2 text-stone-800">
                No: {movement.documentNumber}
              </div>
              <div className="text-[10px] text-stone-500 font-mono">
                Tarih: {new Date(movement.movementDate).toLocaleString('tr-TR')}
              </div>
            </div>
          </div>

          {/* MUHATAP VE TUTAR DETAYLARI */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
              <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                {isTahsilat ? 'ÖDEYEN (CARİ / MÜŞTERİ)' : 'ALICI (TEDARİKÇİ / MUHATAP)'}
              </div>
              <div className="font-bold text-stone-900 text-sm mt-1">{movement.contactTitle}</div>
              {movement.contactCode && (
                <div className="text-[10px] text-stone-500 font-mono mt-0.5">
                  Cari Kodu: {movement.contactCode}
                </div>
              )}
            </div>

            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
              <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                ÖDEME ARACI & HESAP
              </div>
              <div className="font-bold text-stone-900 mt-1">
                {movement.paymentMethod === 'BANKA'
                  ? 'Banka Havalesi / EFT'
                  : movement.paymentMethod === 'NAKIT'
                  ? 'Nakit Kasa'
                  : movement.paymentMethod === 'KREDI_KARTI'
                  ? 'Kredi Kartı (POS)'
                  : 'Çek / Senet Evrağı'}
              </div>
              <div className="text-[10px] text-stone-500 truncate mt-0.5">
                {movement.cashBankName}
              </div>
            </div>
          </div>

          {/* TUTAR VURGUSU */}
          <div className="p-4 bg-stone-900 text-white rounded-xl flex items-center justify-between">
            <div>
              <div className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">
                İŞLEM TUTARI
              </div>
              <div className="text-xs text-stone-300 italic mt-0.5">
                Yalnız: {numberToTurkishWords(movement.amount)}
              </div>
            </div>
            <div className="text-xl font-mono font-black text-emerald-400">
              ₺{movement.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* ÇEK BİLGİSİ (VARSA) */}
          {movement.paymentMethod === 'CEK_SENET' && movement.chequeInfo && (
            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-xs text-stone-800">
              <div className="font-bold text-amber-900 mb-1">Çek Evrak Detayları:</div>
              <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
                <div>Seri No: <strong>{movement.chequeInfo.serialNumber}</strong></div>
                <div>Banka: <strong>{movement.chequeInfo.bankName}</strong></div>
                <div>Vade: <strong>{movement.chequeInfo.dueDate}</strong></div>
              </div>
            </div>
          )}

          {/* AÇIKLAMA */}
          <div className="text-xs text-stone-700 bg-stone-50 p-3 rounded-xl border border-stone-200">
            <span className="font-bold text-stone-900">Açıklama:</span> {movement.description || 'Ödeme/Tahsilat işlemi'}
          </div>

          {/* İMZA VE KAŞE ALANLARI */}
          <div className="pt-6 border-t border-stone-200 grid grid-cols-2 gap-8 text-center text-xs">
            <div>
              <div className="font-bold text-stone-800 mb-10">TESLİM EDEN (İmza / Kaşe)</div>
              <div className="border-t border-dashed border-stone-400 pt-1 text-[10px] text-stone-500">
                İsim / Soyisim / Tarih
              </div>
            </div>

            <div>
              <div className="font-bold text-stone-800 mb-10">TESLİM ALAN (İmza / Kaşe)</div>
              <div className="border-t border-dashed border-stone-400 pt-1 text-[10px] text-stone-500">
                {tenant.name}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// HAREKET DETAY MODALI
// =========================================================================
const MovementDetailModal: React.FC<{ movement: PaymentMovement; onClose: () => void }> = ({
  movement,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-stone-900 text-sm">Finansal Hareket Detayı</h3>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 text-sm font-bold"
          >
            ✕
          </button>
        </div>

        <div className="space-y-2.5 text-xs text-stone-700">
          <div className="flex justify-between py-1 border-b border-stone-100">
            <span className="text-stone-500">Fiş / Belge No:</span>
            <span className="font-mono font-bold text-stone-900">{movement.documentNumber}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-stone-100">
            <span className="text-stone-500">İşlem Türü:</span>
            <span className="font-bold">
              {movement.movementType === 'TAHSILAT'
                ? 'Tahsilat (Giriş)'
                : movement.movementType === 'ODEME'
                ? 'Ödeme (Çıkış)'
                : 'Masraf & Gider'}
            </span>
          </div>

          <div className="flex justify-between py-1 border-b border-stone-100">
            <span className="text-stone-500">Tutar:</span>
            <span className="font-mono font-bold text-emerald-600 text-sm">
              ₺{movement.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex justify-between py-1 border-b border-stone-100">
            <span className="text-stone-500">Cari / Muhatap:</span>
            <span className="font-semibold text-stone-900">{movement.contactTitle}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-stone-100">
            <span className="text-stone-500">Kasa / Banka Hesabı:</span>
            <span>{movement.cashBankName}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-stone-100">
            <span className="text-stone-500">Ödeme Kanalı:</span>
            <span>{movement.paymentMethod}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-stone-100">
            <span className="text-stone-500">İşlem Tarihi:</span>
            <span className="font-mono">{new Date(movement.movementDate).toLocaleString('tr-TR')}</span>
          </div>

          {movement.description && (
            <div className="pt-2">
              <div className="text-stone-500 mb-1">Açıklama:</div>
              <div className="p-2.5 bg-stone-50 rounded-lg text-stone-800 text-[11px]">
                {movement.description}
              </div>
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-stone-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold bg-stone-900 text-white rounded-lg hover:bg-stone-800 cursor-pointer"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};

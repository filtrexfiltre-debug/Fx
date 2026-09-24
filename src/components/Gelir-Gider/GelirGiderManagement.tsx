import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  ColDef,
  ICellRendererParams,
  ModuleRegistry,
  AllCommunityModule,
  ValidationModule,
  themeQuartz,
  GridReadyEvent,
  GridApi,
  RowSelectionOptions,
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
  PieChart,
  Percent,
  ShieldAlert,
  HelpCircle,
  ChevronRight,
  Layers,
  Briefcase,
  Tag,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  RevenueExpenseItem,
  RevenueExpenseType,
  RevenueExpenseCategory,
  RevenueExpenseCategoryItem,
  RevenueExpenseDocumentType,
  RevenueExpensePaymentStatus,
  Branch,
  CashBank,
} from '../../types/fx';
import { fxApi, branchContext } from '../../services/api';
import { CURRENT_TENANT } from '../../data/mockData';
import { NewGelirGiderModal } from './NewGelirGiderModal';
import { GelirGiderMakbuzModal } from './GelirGiderMakbuzModal';
import { KarZararSubeBazli } from '../Raporlar/KarZararSubeBazli';
import { GelirGiderKategoriler } from './GelirGiderKategoriler';
import { AgGridColumnSidebar, AgGridSidebarToggleBtn } from '../common/AgGridColumnSidebar';

// AG Grid modüllerini kaydet
ModuleRegistry.registerModules([AllCommunityModule, ValidationModule]);

const STORAGE_COLUMNS_KEY = 'fx_gelir_gider_columns_v1';

export const GelirGiderManagement: React.FC = () => {
  // 3 Ana Sekme: 'GELIR_GIDER' | 'KAR_ZARAR' | 'KATEGORILER'
  const [activeMainTab, setActiveMainTab] = useState<'GELIR_GIDER' | 'KAR_ZARAR' | 'KATEGORILER'>('GELIR_GIDER');
  const [categories, setCategories] = useState<RevenueExpenseCategoryItem[]>([]);

  const [items, setItems] = useState<RevenueExpenseItem[]>([]);
  const [cashBanks, setCashBanks] = useState<CashBank[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(branchContext.getSelectedBranchId());
  const [isGlobalUser, setIsGlobalUser] = useState<boolean>(branchContext.getIsGlobalUser());
  const [quickFilterText, setQuickFilterText] = useState<string>('');

  // Filtreler
  const [typeFilter, setTypeFilter] = useState<'ALL' | RevenueExpenseType>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [documentTypeFilter, setDocumentTypeFilter] = useState<'ALL' | RevenueExpenseDocumentType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | RevenueExpensePaymentStatus>('ALL');
  const [dateRangeFilter, setDateRangeFilter] = useState<'ALL' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'THIS_YEAR'>('ALL');
  const [showAnalysisPanel, setShowAnalysisPanel] = useState<boolean>(false);

  // Modallar ve Çekmeceler
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [modalInitialType, setModalInitialType] = useState<RevenueExpenseType>('GELIR');
  const [selectedItemForReceipt, setSelectedItemForReceipt] = useState<RevenueExpenseItem | null>(null);
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<RevenueExpenseItem | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // AG Grid & Sidebar States (Cari Hesaplar Standartı)
  const gridRef = useRef<AgGridReact<RevenueExpenseItem>>(null);
  const [gridApi, setGridApi] = useState<GridApi<RevenueExpenseItem> | null>(null);
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

  // Kategorileri Yeniden Yükle
  const loadCategories = useCallback(async () => {
    try {
      const catRes = await fxApi.getRevenueExpenseCategories();
      if (catRes.success) {
        setCategories(catRes.data || []);
      }
    } catch (e) {
      console.error('Kategoriler yüklenirken hata:', e);
    }
  }, []);

  // Verileri Yükle
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [reRes, cbRes, brRes, catRes] = await Promise.all([
        fxApi.getRevenueExpenses(selectedBranchId, isGlobalUser),
        fxApi.getCashBanks(selectedBranchId),
        fxApi.getBranches(),
        fxApi.getRevenueExpenseCategories(),
      ]);

      setItems(reRes.data || []);
      setCashBanks(cbRes.data || []);
      setBranches(Array.isArray(brRes) ? brRes : (brRes as any)?.data || []);
      if (catRes.success) setCategories(catRes.data || []);
    } catch (e) {
      console.error('Gelir ve Gider verileri yüklenirken hata:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId, isGlobalUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtrelenmiş Liste
  const filteredItems = useMemo(() => {
    let result = [...items];

    // Hızlı arama filtresi
    if (quickFilterText.trim()) {
      const q = quickFilterText.trim().toLowerCase();
      result = result.filter(
        i =>
          i.itemCode?.toLowerCase().includes(q) ||
          i.documentNumber?.toLowerCase().includes(q) ||
          i.title?.toLowerCase().includes(q) ||
          i.contactTitle?.toLowerCase().includes(q) ||
          i.contactCode?.toLowerCase().includes(q) ||
          i.category?.toLowerCase().includes(q) ||
          i.accountingCode?.toLowerCase().includes(q) ||
          i.cashBankName?.toLowerCase().includes(q) ||
          i.description?.toLowerCase().includes(q) ||
          i.grandTotal?.toString().includes(q)
      );
    }

    // Tür filtresi
    if (typeFilter !== 'ALL') {
      result = result.filter(i => i.type === typeFilter);
    }

    // Kategori filtresi
    if (categoryFilter !== 'ALL') {
      result = result.filter(i => i.category === categoryFilter);
    }

    // Belge Türü filtresi
    if (documentTypeFilter !== 'ALL') {
      result = result.filter(i => i.documentType === documentTypeFilter);
    }

    // Durum filtresi
    if (statusFilter !== 'ALL') {
      result = result.filter(i => i.paymentStatus === statusFilter);
    }

    // Tarih Aralığı filtresi
    if (dateRangeFilter !== 'ALL') {
      const now = new Date();
      if (dateRangeFilter === 'TODAY') {
        const todayStr = now.toISOString().slice(0, 10);
        result = result.filter(i => i.transactionDate.startsWith(todayStr));
      } else if (dateRangeFilter === 'THIS_WEEK') {
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        result = result.filter(i => new Date(i.transactionDate) >= oneWeekAgo);
      } else if (dateRangeFilter === 'THIS_MONTH') {
        const thisMonthStr = now.toISOString().slice(0, 7); // YYYY-MM
        result = result.filter(i => i.transactionDate.startsWith(thisMonthStr));
      } else if (dateRangeFilter === 'THIS_YEAR') {
        const thisYearStr = now.toISOString().slice(0, 4); // YYYY
        result = result.filter(i => i.transactionDate.startsWith(thisYearStr));
      }
    }

    return result;
  }, [items, typeFilter, categoryFilter, documentTypeFilter, statusFilter, dateRangeFilter, quickFilterText]);

  // KPI ve İstatistik Hesaplamaları
  const kpis = useMemo(() => {
    let contextual = [...items];

    if (quickFilterText.trim()) {
      const q = quickFilterText.trim().toLowerCase();
      contextual = contextual.filter(
        i =>
          i.itemCode?.toLowerCase().includes(q) ||
          i.documentNumber?.toLowerCase().includes(q) ||
          i.title?.toLowerCase().includes(q) ||
          i.contactTitle?.toLowerCase().includes(q) ||
          i.category?.toLowerCase().includes(q) ||
          i.description?.toLowerCase().includes(q)
      );
    }

    if (dateRangeFilter !== 'ALL') {
      const now = new Date();
      if (dateRangeFilter === 'TODAY') {
        const todayStr = now.toISOString().slice(0, 10);
        contextual = contextual.filter(i => i.transactionDate.startsWith(todayStr));
      } else if (dateRangeFilter === 'THIS_WEEK') {
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        contextual = contextual.filter(i => new Date(i.transactionDate) >= oneWeekAgo);
      } else if (dateRangeFilter === 'THIS_MONTH') {
        const thisMonthStr = now.toISOString().slice(0, 7);
        contextual = contextual.filter(i => i.transactionDate.startsWith(thisMonthStr));
      } else if (dateRangeFilter === 'THIS_YEAR') {
        const thisYearStr = now.toISOString().slice(0, 4);
        contextual = contextual.filter(i => i.transactionDate.startsWith(thisYearStr));
      }
    }

    let totalGelir = 0;
    let countGelir = 0;
    let totalGider = 0;
    let countGider = 0;
    let totalHesaplananKdv = 0; // Gelir KDV
    let totalIndirilecekKdv = 0; // Gider KDV
    let totalKkeg = 0;
    let countKkeg = 0;
    let totalStopaj = 0;

    contextual.forEach(item => {
      if (item.type === 'GELIR') {
        totalGelir += item.grandTotal;
        totalHesaplananKdv += item.vatAmount || 0;
        countGelir++;
      } else {
        totalGider += item.grandTotal;
        totalIndirilecekKdv += item.vatAmount || 0;
        countGider++;
        if (item.isKKEG) {
          totalKkeg += item.kkegAmount || item.grandTotal;
          countKkeg++;
        }
        if (item.stoppageAmount) {
          totalStopaj += item.stoppageAmount;
        }
      }
    });

    const netBilanço = totalGelir - totalGider;
    const profitMargin = totalGelir > 0 ? (netBilanço / totalGelir) * 100 : 0;
    const netKdvFarkı = totalHesaplananKdv - totalIndirilecekKdv; // Pozitif ise devlete ödenecek KDV, negatif ise sonraki döneme devreden KDV

    return {
      totalGelir,
      countGelir,
      totalGider,
      countGider,
      netBilanço,
      profitMargin,
      totalHesaplananKdv,
      totalIndirilecekKdv,
      netKdvFarkı,
      totalKkeg,
      countKkeg,
      totalStopaj,
    };
  }, [items, quickFilterText, dateRangeFilter]);

  // Kategori Dağılım İstatistikleri
  const categoryStats = useMemo(() => {
    const expenseGroups: Record<string, number> = {};
    const incomeGroups: Record<string, number> = {};

    filteredItems.forEach(i => {
      if (i.type === 'GIDER') {
        expenseGroups[i.category] = (expenseGroups[i.category] || 0) + i.grandTotal;
      } else {
        incomeGroups[i.category] = (incomeGroups[i.category] || 0) + i.grandTotal;
      }
    });

    const topExpenses = Object.entries(expenseGroups)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const topIncomes = Object.entries(incomeGroups)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return { topExpenses, topIncomes };
  }, [filteredItems]);

  // Filtreleri Sıfırlama
  const handleResetFilters = () => {
    setTypeFilter('ALL');
    setCategoryFilter('ALL');
    setDocumentTypeFilter('ALL');
    setStatusFilter('ALL');
    setDateRangeFilter('ALL');
    setQuickFilterText('');
  };

  // Silme İşlemi
  const handleDeleteItem = async (id: string, code: string) => {
    if (!window.confirm(`${code} numaralı gelir/gider hareketini silmek ve ilgili kasa/cari bakiyelerini geri almak istiyor musunuz?`)) {
      return;
    }

    try {
      const res = await fxApi.deleteRevenueExpense(id);
      if (res.success) {
        setFeedbackMessage(`${code} numaralı işlem silindi ve bakiyeler dengelendi.`);
        setTimeout(() => setFeedbackMessage(null), 3500);
        loadData();
      }
    } catch (e: any) {
      alert(e?.message || 'Silme işlemi sırasında hata oluştu.');
    }
  };

  // Yeni Gelir / Gider Açılışı
  const handleOpenNewModal = (type: RevenueExpenseType) => {
    setModalInitialType(type);
    setIsNewModalOpen(true);
  };

  // Excel İhracı (XLSX)
  const handleExportExcel = () => {
    try {
      const exportData = filteredItems.map(i => ({
        'İşlem Kodu': i.itemCode,
        'Belge No': i.documentNumber,
        'Tarih': i.transactionDate,
        'Şube': i.branchName || 'Merkez Şube',
        'Tür': i.type === 'GELIR' ? 'GELİR' : 'GİDER',
        'Kategori': i.category,
        'İşlem Başlığı': i.title,
        'Cari Ünvanı': i.contactTitle || '-',
        'Kasa / Banka': i.cashBankName || '-',
        'Matrah (KDV Hariç)': i.baseAmount,
        'KDV Oranı (%)': i.vatRate,
        'KDV Tutarı': i.vatAmount,
        'Stopaj Tutarı': i.stoppageAmount || 0,
        'Tevkifat Tutarı': i.withholdingAmount || 0,
        'Genel Toplam (TL)': i.grandTotal,
        'KKEG mi?': i.isKKEG ? 'EVET (KKEG)' : 'HAYIR',
        'TDHP Kodu': i.accountingCode || '-',
        'Durum': i.paymentStatus === 'PAID' ? 'ÖDENDİ / TAHSİL EDİLDİ' : 'BEKLEMEDE',
        'Açıklama': i.description || '-',
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Gelir_Gider_Listesi');

      // Kolon genişliklerini otomatik ayarla
      ws['!cols'] = [
        { wch: 15 }, { wch: 18 }, { wch: 12 }, { wch: 22 }, { wch: 10 },
        { wch: 28 }, { wch: 32 }, { wch: 28 }, { wch: 24 }, { wch: 16 },
        { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 },
        { wch: 12 }, { wch: 16 }, { wch: 18 }, { wch: 40 },
      ];

      XLSX.writeFile(wb, `FX_Gelir_Gider_Raporu_${new Date().toISOString().slice(0, 10)}.xlsx`);
      setFeedbackMessage('Excel dosyası başarıyla indirildi.');
      setTimeout(() => setFeedbackMessage(null), 3500);
    } catch (e) {
      console.error(e);
      alert('Excel dosyası oluşturulurken hata meydana geldi.');
    }
  };

  // PDF Rapor İhracı
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF('landscape');

      // Başlık ve Şirket Bilgisi
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text(`${CURRENT_TENANT.name} - Gelir & Gider Mizan Raporu`, 14, 15);

      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Kapsam: ${currentBranchName} | Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR')} | Kayıt Sayısı: ${filteredItems.length}`,
        14,
        22
      );

      // Özet Kartı
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, 26, 268, 16, 2, 2, 'F');
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      doc.text(
        `Toplam Gelir: ₺${kpis.totalGelir.toLocaleString('tr-TR')}  |  Toplam Gider: ₺${kpis.totalGider.toLocaleString('tr-TR')}  |  Net Bilanço: ₺${kpis.netBilanço.toLocaleString('tr-TR')}  |  KDV Dengesi: ₺${kpis.netKdvFarkı.toLocaleString('tr-TR')}  |  KKEG Yükü: ₺${kpis.totalKkeg.toLocaleString('tr-TR')}`,
        20,
        36
      );

      const tableRows = filteredItems.map(i => [
        i.itemCode,
        i.transactionDate,
        i.type === 'GELIR' ? 'GELİR' : 'GİDER',
        i.category,
        i.title.length > 25 ? i.title.slice(0, 25) + '...' : i.title,
        i.contactTitle ? (i.contactTitle.length > 20 ? i.contactTitle.slice(0, 20) + '...' : i.contactTitle) : '-',
        `₺${i.baseAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`,
        `%${i.vatRate}`,
        `₺${i.vatAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`,
        `₺${i.grandTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`,
        i.paymentStatus === 'PAID' ? 'Ödendi' : 'Bekliyor',
      ]);

      autoTable(doc, {
        head: [['Kod', 'Tarih', 'Tür', 'Kategori', 'Başlık', 'Cari Firma', 'Matrah', 'KDV', 'KDV Tutarı', 'Genel Toplam', 'Durum']],
        body: tableRows,
        startY: 46,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [49, 46, 129], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      });

      doc.save(`FX_Gelir_Gider_Ozeti_${new Date().toISOString().slice(0, 10)}.pdf`);
      setFeedbackMessage('PDF raporu başarıyla oluşturuldu.');
      setTimeout(() => setFeedbackMessage(null), 3500);
    } catch (e) {
      console.error(e);
      alert('PDF raporu oluşturulurken hata meydana geldi.');
    }
  };

  // AG Grid Kolon Tanımları
  const columnDefs = useMemo<ColDef<RevenueExpenseItem>[]>(() => {
    return [
      {
        headerName: 'İşlem Kodu',
        field: 'itemCode',
        minWidth: 140,
        width: 145,
        pinned: 'left',
        cellRenderer: (params: ICellRendererParams<RevenueExpenseItem>) => {
          const item = params.data;
          if (!item) return '-';
          const isIncome = item.type === 'GELIR';
          return (
            <button
              onClick={() => setSelectedItemForDetail(item)}
              className="text-left font-mono text-xs font-bold text-indigo-700 hover:text-indigo-900 hover:underline cursor-pointer flex items-center gap-1.5"
            >
              <span>{item.itemCode}</span>
            </button>
          );
        },
      },
      {
        headerName: 'Tarih',
        field: 'transactionDate',
        minWidth: 115,
        width: 120,
        cellRenderer: (params: ICellRendererParams<RevenueExpenseItem>) => {
          if (!params.value) return '-';
          return <span className="font-mono text-xs text-stone-600 font-medium">{params.value}</span>;
        },
      },
      {
        headerName: 'Şube',
        field: 'branchName',
        minWidth: 130,
        width: 140,
        cellRenderer: (params: ICellRendererParams<RevenueExpenseItem>) => {
          const name = params.value || 'Merkez';
          return (
            <span className="text-xs text-stone-700 truncate block font-medium" title={name}>
              {name.split(' ')[0]}
            </span>
          );
        },
      },
      {
        headerName: 'İşlem Türü',
        field: 'type',
        minWidth: 120,
        width: 125,
        cellRenderer: (params: ICellRendererParams<RevenueExpenseItem>) => {
          const type = params.value;
          if (type === 'GELIR') {
            return (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                <span>GELİR</span>
              </span>
            );
          } else {
            return (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                <span>GİDER</span>
              </span>
            );
          }
        },
      },
      {
        headerName: 'Belge No & Türü',
        field: 'documentNumber',
        minWidth: 160,
        width: 175,
        cellRenderer: (params: ICellRendererParams<RevenueExpenseItem>) => {
          const item = params.data;
          if (!item) return '-';
          return (
            <div className="flex flex-col text-xs leading-tight py-1">
              <span className="font-mono font-semibold text-stone-800">{item.documentNumber}</span>
              <span className="text-[10px] text-stone-500 font-medium">
                {item.documentType === 'E_FATURA'
                  ? 'E-Fatura'
                  : item.documentType === 'E_ARSIV'
                  ? 'E-Arşiv'
                  : item.documentType === 'SMM'
                  ? 'SMM'
                  : item.documentType === 'PERAKENDE_FIS'
                  ? 'Perakende Fiş'
                  : item.documentType === 'BANKA_DEKONTU'
                  ? 'Dekont'
                  : 'Gider Pusulası'}
              </span>
            </div>
          );
        },
      },
      {
        headerName: 'Kategori / TDHP',
        field: 'category',
        minWidth: 180,
        width: 200,
        cellRenderer: (params: ICellRendererParams<RevenueExpenseItem>) => {
          const item = params.data;
          if (!item) return '-';
          return (
            <div className="flex flex-col text-xs leading-tight py-1">
              <span className="font-semibold text-stone-800 truncate" title={item.category}>
                {item.category}
              </span>
              {item.accountingCode && (
                <span className="text-[10px] font-mono text-indigo-600 font-medium truncate">{item.accountingCode}</span>
              )}
            </div>
          );
        },
      },
      {
        headerName: 'İşlem Başlığı & Cari',
        field: 'title',
        minWidth: 220,
        width: 260,
        flex: 1,
        cellRenderer: (params: ICellRendererParams<RevenueExpenseItem>) => {
          const item = params.data;
          if (!item) return '-';
          return (
            <div className="flex flex-col text-xs leading-tight py-1">
              <span className="font-medium text-stone-900 truncate" title={item.title}>
                {item.title}
              </span>
              {item.contactTitle ? (
                <span className="text-[10px] text-stone-500 truncate" title={item.contactTitle}>
                  {item.contactTitle}
                </span>
              ) : (
                <span className="text-[10px] text-stone-400 italic">Cari Bağlantısız</span>
              )}
            </div>
          );
        },
      },
      {
        headerName: 'Kasa / Banka',
        field: 'cashBankName',
        minWidth: 150,
        width: 165,
        cellRenderer: (params: ICellRendererParams<RevenueExpenseItem>) => {
          return (
            <span className="text-xs text-stone-700 truncate block font-medium" title={params.value}>
              {params.value || '-'}
            </span>
          );
        },
      },
      {
        headerName: 'Matrah',
        field: 'baseAmount',
        minWidth: 130,
        width: 140,
        cellRenderer: (params: ICellRendererParams<RevenueExpenseItem>) => {
          const val = params.value;
          if (val === undefined) return '-';
          return (
            <span className="font-mono text-xs font-semibold text-stone-700">
              ₺{val.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </span>
          );
        },
      },
      {
        headerName: 'KDV (% / Tutar)',
        field: 'vatAmount',
        minWidth: 130,
        width: 140,
        cellRenderer: (params: ICellRendererParams<RevenueExpenseItem>) => {
          const item = params.data;
          if (!item) return '-';
          return (
            <div className="flex flex-col text-xs font-mono leading-tight py-1">
              <span className="font-semibold text-stone-800">
                ₺{item.vatAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-stone-500 font-medium">(%{item.vatRate})</span>
            </div>
          );
        },
      },
      {
        headerName: 'Genel Toplam',
        field: 'grandTotal',
        minWidth: 145,
        width: 155,
        cellRenderer: (params: ICellRendererParams<RevenueExpenseItem>) => {
          const item = params.data;
          if (!item) return '-';
          const isIncome = item.type === 'GELIR';
          return (
            <div
              className={`font-mono text-xs font-black ${
                isIncome ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {isIncome ? '+' : '-'}₺{item.grandTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </div>
          );
        },
      },
      {
        headerName: 'KKEG',
        field: 'isKKEG',
        minWidth: 95,
        width: 100,
        cellRenderer: (params: ICellRendererParams<RevenueExpenseItem>) => {
          const isKkeg = params.value;
          if (isKkeg) {
            return (
              <span
                className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300"
                title="Kanunen Kabul Edilmeyen Gider (KKEG)"
              >
                <ShieldAlert className="w-3 h-3 text-amber-600" />
                <span>KKEG</span>
              </span>
            );
          }
          return <span className="text-stone-300 text-xs">-</span>;
        },
      },
      {
        headerName: 'Durum',
        field: 'paymentStatus',
        minWidth: 120,
        width: 125,
        cellRenderer: (params: ICellRendererParams<RevenueExpenseItem>) => {
          const status = params.value;
          if (status === 'PAID') {
            return (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Ödendi</span>
              </span>
            );
          } else if (status === 'PENDING') {
            return (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Bekliyor</span>
              </span>
            );
          } else {
            return (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-500 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded">
                <span>İptal</span>
              </span>
            );
          }
        },
      },
      {
        headerName: 'İşlemler',
        minWidth: 125,
        width: 130,
        pinned: 'right',
        cellRenderer: (params: ICellRendererParams<RevenueExpenseItem>) => {
          const data = params.data;
          if (!data) return null;
          return (
            <div className="flex items-center gap-1 py-1">
              <button
                onClick={() => setSelectedItemForReceipt(data)}
                title="Resmi Fiş / Makbuz Yazdır"
                className="p-1.5 text-stone-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSelectedItemForDetail(data)}
                title="İşlem Detayını İncele"
                className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDeleteItem(data.id, data.itemCode)}
                title="Kaydı Sil ve Bakiyeleri Geri Al"
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
      minWidth: 110,
    };
  }, []);

  const rowSelection = useMemo<RowSelectionOptions<RevenueExpenseItem>>(
    () => ({
      mode: 'singleRow',
      enableClickSelection: true,
    }),
    []
  );

  const onGridReady = (params: GridReadyEvent<RevenueExpenseItem>) => {
    setGridApi(params.api);
    try {
      const saved = localStorage.getItem(STORAGE_COLUMNS_KEY);
      if (saved) {
        params.api.applyColumnState({ state: JSON.parse(saved), applyOrder: true });
      }
    } catch (e) {
      console.warn('Could not restore column state:', e);
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

      {/* 3 ANA SEKME BAŞLIĞI: 1. Gelirler & Giderler ({filteredItems.length}) Şube Bazlı, 2. Kâr & Zarar Şube Bazlı, 3. Kategoriler ({categories.length}) */}
      <div className="bg-white border border-stone-200/90 rounded-xl p-1.5 shadow-xs flex items-center gap-1.5 select-none overflow-x-auto">
        {/* Sekme 1: Gelirler & Giderler ({filteredItems.length}) Şube Bazlı */}
        <button
          type="button"
          onClick={() => setActiveMainTab('GELIR_GIDER')}
          className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 py-2 px-3.5 rounded-lg font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap ${
            activeMainTab === 'GELIR_GIDER'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Gelirler & Giderler ({filteredItems.length}) Şube Bazlı</span>
        </button>

        {/* Sekme 2: Kâr & Zarar Şube Bazlı */}
        <button
          type="button"
          onClick={() => setActiveMainTab('KAR_ZARAR')}
          className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 py-2 px-3.5 rounded-lg font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap ${
            activeMainTab === 'KAR_ZARAR'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Kâr & Zarar Şube Bazlı</span>
        </button>

        {/* Sekme 3: Kategoriler ({categories.length}) */}
        <button
          type="button"
          onClick={() => setActiveMainTab('KATEGORILER')}
          className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 py-2 px-3.5 rounded-lg font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap ${
            activeMainTab === 'KATEGORILER'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Kategoriler ({categories.length})</span>
        </button>
      </div>

      {/* SEKME 1: GELİRLER & GİDERLER ŞUBE BAZLI */}
      {activeMainTab === 'GELIR_GIDER' && (
        <div className="space-y-4">
          {/* KPI KARTLARI (ÖZET PANELİ - TIKLANABİLİR FİLTRELEME) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* 1. TOPLAM GELİR */}
        <button
          type="button"
          onClick={() => setTypeFilter(typeFilter === 'GELIR' ? 'ALL' : 'GELIR')}
          title={typeFilter === 'GELIR' ? 'Gelir filtresini kaldır' : 'Listeyi sadece gelirlere filtrele'}
          className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all duration-150 cursor-pointer group select-none ${
            typeFilter === 'GELIR'
              ? 'ring-2 ring-emerald-500 border-emerald-400 bg-emerald-50/50 shadow-sm'
              : 'bg-white border-stone-200/90 shadow-xs hover:border-emerald-300 hover:bg-emerald-50/15'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-stone-500 w-full">
            <span className="font-semibold text-stone-700">Toplam Gelir</span>
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                typeFilter === 'GELIR' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 font-mono text-lg font-black text-emerald-600">
            ₺{kpis.totalGelir.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center justify-between text-[10px] mt-0.5 w-full">
            <span className="text-stone-400">{kpis.countGelir} adet gelir kaydı</span>
            {typeFilter === 'GELIR' ? (
              <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-600 text-white rounded-full">✓ Aktif</span>
            ) : (
              <span className="text-[9px] text-stone-400 group-hover:text-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity">
                Filtrele
              </span>
            )}
          </div>
        </button>

        {/* 2. TOPLAM GİDER */}
        <button
          type="button"
          onClick={() => setTypeFilter(typeFilter === 'GIDER' ? 'ALL' : 'GIDER')}
          title={typeFilter === 'GIDER' ? 'Gider filtresini kaldır' : 'Listeyi sadece giderlere filtrele'}
          className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all duration-150 cursor-pointer group select-none ${
            typeFilter === 'GIDER'
              ? 'ring-2 ring-rose-500 border-rose-400 bg-rose-50/50 shadow-sm'
              : 'bg-white border-stone-200/90 shadow-xs hover:border-rose-300 hover:bg-rose-50/15'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-stone-500 w-full">
            <span className="font-semibold text-stone-700">Toplam Gider</span>
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                typeFilter === 'GIDER' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-600 group-hover:bg-rose-100'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 font-mono text-lg font-black text-rose-600">
            ₺{kpis.totalGider.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center justify-between text-[10px] mt-0.5 w-full">
            <span className="text-stone-400">{kpis.countGider} adet masraf/gider</span>
            {typeFilter === 'GIDER' ? (
              <span className="text-[9px] font-bold px-1.5 py-0.2 bg-rose-600 text-white rounded-full">✓ Aktif</span>
            ) : (
              <span className="text-[9px] text-stone-400 group-hover:text-rose-700 opacity-0 group-hover:opacity-100 transition-opacity">
                Filtrele
              </span>
            )}
          </div>
        </button>

        {/* 3. NET BİLANÇO & KÂR-ZARAR */}
        <button
          type="button"
          onClick={() => setTypeFilter('ALL')}
          title="Tüm işlem türlerini göster (Tür filtresini sıfırla)"
          className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all duration-150 cursor-pointer group select-none ${
            typeFilter === 'ALL'
              ? 'ring-2 ring-indigo-500/70 border-indigo-300 bg-indigo-50/30 shadow-sm'
              : 'bg-white border-stone-200/90 shadow-xs hover:border-indigo-300 hover:bg-indigo-50/15'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-stone-500 w-full">
            <span className="font-semibold text-stone-700">Net Faaliyet Kârı</span>
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                kpis.netBilanço >= 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
            </div>
          </div>
          <div
            className={`mt-2 font-mono text-lg font-black ${
              kpis.netBilanço >= 0 ? 'text-indigo-900' : 'text-rose-600'
            }`}
          >
            {kpis.netBilanço >= 0 ? '+' : ''}₺
            {kpis.netBilanço.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center justify-between text-[10px] mt-0.5 w-full">
            <span className="text-stone-400">Marj: %{kpis.profitMargin.toFixed(1)}</span>
            <span className="text-stone-400">Gelir - Gider</span>
          </div>
        </button>

        {/* 4. KDV DENGESİ */}
        <div className="p-3.5 rounded-xl border bg-white border-stone-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-stone-500 w-full">
            <span className="font-semibold text-stone-700">Net KDV Dengesi</span>
            <div className="w-6 h-6 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Percent className="w-3.5 h-3.5" />
            </div>
          </div>
          <div
            className={`mt-2 font-mono text-lg font-black ${
              kpis.netKdvFarkı >= 0 ? 'text-stone-800' : 'text-emerald-700'
            }`}
          >
            {kpis.netKdvFarkı >= 0 ? '₺' : '-₺'}
            {Math.abs(kpis.netKdvFarkı).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center justify-between text-[10px] mt-0.5 w-full text-stone-400">
            <span>{kpis.netKdvFarkı >= 0 ? 'Ödenecek KDV' : 'Devreden KDV'}</span>
            <span>Hesaplanan - İndirilecek</span>
          </div>
        </div>

        {/* 5. KKEG & STOPAJ YÜKÜ */}
        <div className="p-3.5 rounded-xl border bg-white border-stone-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-stone-500 w-full">
            <span className="font-semibold text-stone-700">KKEG & Stopaj Yükü</span>
            <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 font-mono text-lg font-black text-amber-700">
            ₺{(kpis.totalKkeg + kpis.totalStopaj).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center justify-between text-[10px] mt-0.5 w-full text-stone-400">
            <span>{kpis.countKkeg} KKEG kaydı</span>
            <span>Vergi İlavesi</span>
          </div>
        </div>
      </div>

      {/* ÜST BUTONLAR VE İŞLEM PANELİ */}
      <div className="bg-white border border-stone-200/80 rounded-xl p-3 sm:p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* Sol Taraf: Başlık & Analiz Toggle */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-100/80 text-indigo-700 flex items-center justify-center">
              <Receipt className="w-4 h-4 text-indigo-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-stone-900 tracking-tight">Gelirler & Giderler Muhasebesi</h2>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAnalysisPanel(!showAnalysisPanel)}
              className={`ml-2 px-2.5 py-1 text-xs rounded-lg border transition-colors cursor-pointer flex items-center gap-1 ${
                showAnalysisPanel
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold'
                  : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              <PieChart className="w-3.5 h-3.5 text-indigo-600" />
              <span>{showAnalysisPanel ? 'Analizi Gizle' : 'Kategori Analizi'}</span>
            </button>
          </div>

          {/* Sağ Taraf: Ekleme & Raporlama Butonları */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenNewModal('GELIR')}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Gelir Ekle</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenNewModal('GIDER')}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Gider Ekle</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
              title="Excel (XLSX) formatında dışa aktar"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Excel</span>
            </button>

            <button
              type="button"
              onClick={handleExportPDF}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
              title="PDF formatında mizan raporu oluştur"
            >
              <Printer className="w-3.5 h-3.5 text-stone-600" />
              <span className="hidden sm:inline">PDF</span>
            </button>

            <AgGridSidebarToggleBtn
              isOpen={isSidebarOpen}
              onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
              gridApi={gridApi}
              buttonRef={sidebarButtonRef}
            />

            <button
              type="button"
              onClick={loadData}
              className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer border border-stone-200"
              title="Verileri Yenile"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* KATEGORİ DAĞILIMI MİNİ-ANALİZ PANELİ (TOGGLEABLE) */}
        {showAnalysisPanel && (
          <div className="pt-3 border-t border-stone-200/90 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-150">
            {/* Gider Dağılımı */}
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-stone-800">
                <span className="flex items-center gap-1 text-rose-700">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>En Yüksek 5 Gider Kalemi</span>
                </span>
                <span className="font-mono text-stone-500">
                  ₺{kpis.totalGider.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="space-y-1.5">
                {categoryStats.topExpenses.map((exp, idx) => {
                  const pct = kpis.totalGider > 0 ? (exp.amount / kpis.totalGider) * 100 : 0;
                  return (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-stone-700 truncate">{exp.name}</span>
                        <span className="font-mono font-semibold text-stone-900">
                          ₺{exp.amount.toLocaleString('tr-TR')} (%{pct.toFixed(0)})
                        </span>
                      </div>
                      <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-rose-500 h-full rounded-full" style={{ width: `${Math.min(100, pct)}%` }} />
                      </div>
                    </div>
                  );
                })}
                {categoryStats.topExpenses.length === 0 && (
                  <div className="text-xs text-stone-400 py-2">Henüz kayıtlı gider bulunmuyor.</div>
                )}
              </div>
            </div>

            {/* Gelir Dağılımı */}
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-stone-800">
                <span className="flex items-center gap-1 text-emerald-700">
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  <span>En Yüksek 5 Gelir Kalemi</span>
                </span>
                <span className="font-mono text-stone-500">
                  ₺{kpis.totalGelir.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="space-y-1.5">
                {categoryStats.topIncomes.map((inc, idx) => {
                  const pct = kpis.totalGelir > 0 ? (inc.amount / kpis.totalGelir) * 100 : 0;
                  return (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-stone-700 truncate">{inc.name}</span>
                        <span className="font-mono font-semibold text-stone-900">
                          ₺{inc.amount.toLocaleString('tr-TR')} (%{pct.toFixed(0)})
                        </span>
                      </div>
                      <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, pct)}%` }} />
                      </div>
                    </div>
                  );
                })}
                {categoryStats.topIncomes.length === 0 && (
                  <div className="text-xs text-stone-400 py-2">Henüz kayıtlı gelir bulunmuyor.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* FİLTRELEME VE ARAMA ÇUBUĞU */}
        <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center gap-2 text-xs">
          {/* Hızlı Arama */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={quickFilterText}
              onChange={e => setQuickFilterText(e.target.value)}
              placeholder="Fiş No, Belge No, Cari, Başlık veya Tutar ile ara..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-stone-50 hover:bg-stone-100/80 focus:bg-white border border-stone-200 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:outline-hidden transition-all"
            />
            {quickFilterText && (
              <button
                type="button"
                onClick={() => setQuickFilterText('')}
                className="absolute right-2 top-2 text-stone-400 hover:text-stone-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Tür Filtresi */}
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as any)}
            className="px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-semibold text-stone-700"
          >
            <option value="ALL">Tüm Türler</option>
            <option value="GELIR">Sadece Gelirler</option>
            <option value="GIDER">Sadece Giderler</option>
          </select>

          {/* Kategori Filtresi */}
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-700 max-w-[170px] truncate"
          >
            <option value="ALL">Tüm Kategoriler</option>
            {categories.map(c => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Belge Türü */}
          <select
            value={documentTypeFilter}
            onChange={e => setDocumentTypeFilter(e.target.value as any)}
            className="px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-700"
          >
            <option value="ALL">Tüm Belge Türleri</option>
            <option value="E_FATURA">E-Fatura</option>
            <option value="E_ARSIV">E-Arşiv</option>
            <option value="SMM">Serbest Meslek Makbuzu</option>
            <option value="PERAKENDE_FIS">Perakende Satış Fişi</option>
            <option value="BANKA_DEKONTU">Banka Dekontu</option>
            <option value="GIDER_PUSULASI">Gider Pusulası</option>
          </select>

          {/* Durum */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-700"
          >
            <option value="ALL">Tüm Durumlar</option>
            <option value="PAID">Ödendi / Tahsil Edildi</option>
            <option value="PENDING">Beklemede</option>
          </select>

          {/* Tarih Aralığı */}
          <select
            value={dateRangeFilter}
            onChange={e => setDateRangeFilter(e.target.value as any)}
            className="px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-700"
          >
            <option value="ALL">Tüm Zamanlar</option>
            <option value="TODAY">Bugün</option>
            <option value="THIS_WEEK">Bu Hafta</option>
            <option value="THIS_MONTH">Bu Ay</option>
            <option value="THIS_YEAR">Bu Yıl</option>
          </select>

          {(typeFilter !== 'ALL' || documentTypeFilter !== 'ALL' || statusFilter !== 'ALL' || dateRangeFilter !== 'ALL' || quickFilterText) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-2.5 py-1.5 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer border border-rose-200"
            >
              Filtreleri Temizle
            </button>
          )}
        </div>
      </div>

      {/* AG GRID TABLOSU & ÖZEL SÜTUN SIDEBAR */}
      <div className="flex gap-4 items-start relative h-[560px]">
        <div
          className={`bg-white border border-stone-200 rounded-xl overflow-hidden shadow-xs transition-all duration-300 ${
            isSidebarOpen ? 'flex-1' : 'w-full'
          }`}
        >
          <div style={{ height: '560px', width: '100%' }}>
            <AgGridReact<RevenueExpenseItem>
              ref={gridRef}
              theme={themeQuartz}
              rowData={filteredItems}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              onGridReady={onGridReady}
              onColumnMoved={onSaveGridState}
              onColumnVisible={onSaveGridState}
              onColumnResized={onSaveGridState}
              onSortChanged={onSaveGridState}
              pagination={true}
              paginationPageSize={20}
              paginationPageSizeSelector={[10, 20, 50, 100]}
              rowSelection={rowSelection}
              animateRows={true}
              enableCellTextSelection={true}
              localeText={{
                noRowsToShow: 'Aramaya veya filtrelere uygun gelir/gider kaydı bulunamadı.',
                page: 'Sayfa',
                to: '-',
                of: '/',
                more: 'Daha Fazla',
                next: 'Sonraki',
                last: 'Son',
                first: 'İlk',
                previous: 'Önceki',
              }}
            />
          </div>
        </div>

        {/* ÖZEL SIDEBAR (Gelişmiş Görünüm ve Kolon Özelleştirme Paneli) */}
        {isSidebarOpen && (
          <AgGridColumnSidebar
            gridApi={gridApi}
            onSaveGridState={onSaveGridState}
            onClose={() => setIsSidebarOpen(false)}
            primaryColIds={['itemCode', 'issueDate', 'type', 'category', 'title', 'totalAmount', 'paymentStatus']}
            sidebarRef={sidebarRef}
          />
        )}
      </div>
    </div>
  )}

  {/* SEKME 2: KÂR & ZARAR ŞUBE BAZLI */}
  {activeMainTab === 'KAR_ZARAR' && (
    <KarZararSubeBazli
      items={items}
      branches={branches}
      selectedBranchId={selectedBranchId}
      isGlobalUser={isGlobalUser}
      onGoToTransactions={(bId, t) => {
        if (bId) setSelectedBranchId(bId);
        if (t) setTypeFilter(t);
        setActiveMainTab('GELIR_GIDER');
      }}
    />
  )}

  {/* SEKME 3: KATEGORİLER (15) - GELİR & GİDER KATEGORİLERİ */}
  {activeMainTab === 'KATEGORILER' && (
    <GelirGiderKategoriler
      categories={categories}
      items={items}
      onCategoriesChange={loadCategories}
    />
  )}

      {/* DETAY YAN ÇEKMECESİ (DETAIL SIDE DRAWER) */}
      {selectedItemForDetail && (
        <div className="fixed inset-0 z-50 flex justify-end bg-stone-950/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200 border-l border-stone-200">
            {/* Çekmece Başlığı */}
            <div className="px-5 py-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    selectedItemForDetail.type === 'GELIR'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {selectedItemForDetail.type === 'GELIR' ? 'GELİR FİŞİ' : 'GİDER / MASRAF FİŞİ'}
                </span>
                <span className="font-mono text-xs font-bold text-stone-800">
                  {selectedItemForDetail.itemCode}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setSelectedItemForDetail(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Çekmece İçeriği */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs text-stone-700">
              
              {/* Tutar Kartı */}
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-1">
                <span className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider block">
                  İşlem Genel Tutarı
                </span>
                <div
                  className={`text-2xl font-black font-mono ${
                    selectedItemForDetail.type === 'GELIR' ? 'text-emerald-700' : 'text-stone-900'
                  }`}
                >
                  {selectedItemForDetail.type === 'GELIR' ? '+' : '-'}₺
                  {selectedItemForDetail.grandTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-stone-500 pt-1">
                  <span>Matrah: ₺{selectedItemForDetail.baseAmount.toLocaleString('tr-TR')}</span>
                  <span>&bull;</span>
                  <span>KDV (%{selectedItemForDetail.vatRate}): ₺{selectedItemForDetail.vatAmount.toLocaleString('tr-TR')}</span>
                </div>
              </div>

              {/* Temel Bilgiler */}
              <div className="border border-stone-200 rounded-xl divide-y divide-stone-100">
                <div className="p-3 flex justify-between">
                  <span className="text-stone-500">Başlık:</span>
                  <span className="font-bold text-stone-900 text-right">{selectedItemForDetail.title}</span>
                </div>
                <div className="p-3 flex justify-between">
                  <span className="text-stone-500">Belge / Fatura No:</span>
                  <span className="font-mono font-semibold text-stone-900">{selectedItemForDetail.documentNumber}</span>
                </div>
                <div className="p-3 flex justify-between">
                  <span className="text-stone-500">Belge Türü:</span>
                  <span className="font-medium text-stone-800">{selectedItemForDetail.documentType}</span>
                </div>
                <div className="p-3 flex justify-between">
                  <span className="text-stone-500">Tarih:</span>
                  <span className="font-mono text-stone-800">{selectedItemForDetail.transactionDate}</span>
                </div>
                {selectedItemForDetail.dueDate && (
                  <div className="p-3 flex justify-between">
                    <span className="text-stone-500">Vade Tarihi:</span>
                    <span className="font-mono text-amber-700 font-semibold">{selectedItemForDetail.dueDate}</span>
                  </div>
                )}
                <div className="p-3 flex justify-between">
                  <span className="text-stone-500">Şube:</span>
                  <span className="text-stone-800 font-medium">{selectedItemForDetail.branchName || 'Merkez Şube'}</span>
                </div>
                <div className="p-3 flex justify-between">
                  <span className="text-stone-500">Kategori:</span>
                  <span className="text-stone-800 font-medium">{selectedItemForDetail.category}</span>
                </div>
                {selectedItemForDetail.accountingCode && (
                  <div className="p-3 flex justify-between">
                    <span className="text-stone-500">TDHP Hesap Kodu:</span>
                    <span className="font-mono font-bold text-indigo-700">{selectedItemForDetail.accountingCode}</span>
                  </div>
                )}
                {selectedItemForDetail.contactTitle && (
                  <div className="p-3 flex justify-between">
                    <span className="text-stone-500">İlişkili Cari:</span>
                    <span className="font-medium text-stone-800 text-right">{selectedItemForDetail.contactTitle}</span>
                  </div>
                )}
                <div className="p-3 flex justify-between">
                  <span className="text-stone-500">Kasa / Banka:</span>
                  <span className="text-stone-800">{selectedItemForDetail.cashBankName || '-'}</span>
                </div>
                <div className="p-3 flex justify-between">
                  <span className="text-stone-500">Ödeme Durumu:</span>
                  <span className="font-bold text-emerald-700">
                    {selectedItemForDetail.paymentStatus === 'PAID' ? 'Ödendi / Tahsil Edildi' : 'Beklemede'}
                  </span>
                </div>
              </div>

              {/* Vergi ve Stopaj Ayrıntısı */}
              {(selectedItemForDetail.stoppageAmount || selectedItemForDetail.withholdingAmount || selectedItemForDetail.isKKEG) && (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5 text-amber-900">
                  <span className="font-bold block text-[11px] uppercase tracking-wider">Vergi & Mevzuat İstisnaları</span>
                  {selectedItemForDetail.stoppageAmount && selectedItemForDetail.stoppageAmount > 0 && (
                    <div className="flex justify-between">
                      <span>Stopaj Kesintisi (%{selectedItemForDetail.stoppageRate}):</span>
                      <span className="font-mono font-bold">₺{selectedItemForDetail.stoppageAmount.toLocaleString('tr-TR')}</span>
                    </div>
                  )}
                  {selectedItemForDetail.withholdingAmount && selectedItemForDetail.withholdingAmount > 0 && (
                    <div className="flex justify-between">
                      <span>KDV Tevkifatı:</span>
                      <span className="font-mono font-bold">₺{selectedItemForDetail.withholdingAmount.toLocaleString('tr-TR')}</span>
                    </div>
                  )}
                  {selectedItemForDetail.isKKEG && (
                    <div className="flex justify-between font-bold text-rose-800">
                      <span>Kanunen Kabul Edilmeyen Gider:</span>
                      <span>EVET</span>
                    </div>
                  )}
                </div>
              )}

              {/* Açıklama */}
              {selectedItemForDetail.description && (
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                  <span className="text-[10px] text-stone-400 font-semibold block mb-0.5">Fiş Açıklaması:</span>
                  <p className="text-stone-700 italic">{selectedItemForDetail.description}</p>
                </div>
              )}

              <div className="text-[10px] text-stone-400 pt-2 font-mono">
                Kayıt Tarihi: {selectedItemForDetail.createdAt} &bull; Yetkili: {selectedItemForDetail.createdByUser || 'Sistem'}
              </div>
            </div>

            {/* Çekmece Alt Aksiyonlar */}
            <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setSelectedItemForReceipt(selectedItemForDetail);
                  setSelectedItemForDetail(null);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Resmi Makbuz Görüntüle</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedItemForDetail(null)}
                className="px-3 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 bg-stone-200 rounded-lg transition-colors cursor-pointer"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* YENİ GELİR / GİDER EKLEME MODALI */}
      <NewGelirGiderModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        initialType={modalInitialType}
        selectedBranchId={selectedBranchId}
        categories={categories}
        onSuccess={newItem => {
          setFeedbackMessage(`${newItem.itemCode} nolu işlem başarıyla kaydedildi.`);
          setTimeout(() => setFeedbackMessage(null), 3500);
          loadData();
        }}
      />

      {/* RESMİ FİŞ / MAKBUZ YAZDIRMA MODALI */}
      <GelirGiderMakbuzModal
        item={selectedItemForReceipt}
        onClose={() => setSelectedItemForReceipt(null)}
      />
    </div>
  );
};

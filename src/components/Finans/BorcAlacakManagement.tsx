import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  HelpCircle,
  ChevronRight,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  DebtCreditItem,
  DebtCreditType,
  DebtCreditStatus,
  Contact,
  CashBank,
  Branch,
} from '../../types/fx';
import { fxApi, branchContext } from '../../services/api';
import { AgGridColumnSidebar, AgGridSidebarToggleBtn } from '../common/AgGridColumnSidebar';
import { NewDebtCreditModal } from './NewDebtCreditModal';
import { DebtCreditPaymentModal } from './DebtCreditPaymentModal';
import { DebtCreditDetailModal } from './DebtCreditDetailModal';


interface BorcAlacakManagementProps {
  currentBranchId?: string;
  isGlobalUser?: boolean;
}

export const BorcAlacakManagement: React.FC<BorcAlacakManagementProps> = ({
  currentBranchId: propBranchId,
  isGlobalUser = true,
}) => {
  const [items, setItems] = useState<DebtCreditItem[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [cashBanks, setCashBanks] = useState<CashBank[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentBranchId, setCurrentBranchId] = useState<string>(
    propBranchId || branchContext.getSelectedBranchId()
  );

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Filtreler
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedType, setSelectedType] = useState<'ALL' | 'ALACAK' | 'BORC'>('ALL');
  const [selectedDueDateFilter, setSelectedDueDateFilter] = useState<
    'ALL' | 'OVERDUE' | 'THIS_WEEK' | 'THIS_MONTH'
  >('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | DebtCreditStatus>('ALL');

  // Modallar
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [newModalInitialType, setNewModalInitialType] = useState<DebtCreditType>('ALACAK');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<DebtCreditItem | null>(null);

  // AG-Grid referansları
  const gridRef = useRef<AgGridReact>(null);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Şube değişikliğini dinle
  useEffect(() => {
    const unsubscribe = branchContext.subscribe(() => {
      setCurrentBranchId(branchContext.getSelectedBranchId());
    });
    return unsubscribe;
  }, []);

  // Verileri yükle
  const loadData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [itemsRes, contactsRes, cbRes] = await Promise.all([
        fxApi.getDebtCredits(currentBranchId),
        fxApi.getContacts(),
        fxApi.getCashBanks(currentBranchId),
      ]);

      if (itemsRes.success) setItems(itemsRes.data);
      if (contactsRes.success) setContacts(contactsRes.data);
      if (cbRes.success) setCashBanks(cbRes.data);
      const branchesList = fxApi.getBranches();
      setBranches(branchesList);
    } catch (err) {
      console.error('Borç/Alacak verileri yüklenirken hata:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentBranchId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Silme işlemi
  const handleDelete = async (id: string) => {
    try {
      await fxApi.deleteDebtCredit(id);
      loadData();
    } catch (err: any) {
      alert(err?.message || 'Silme işlemi başarısız.');
    }
  };

  // Tarih filtre yardımcıları
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Filtrelenmiş liste
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Tür filtresi
      if (selectedType !== 'ALL' && item.type !== selectedType) return false;

      // Durum filtresi
      if (selectedStatus !== 'ALL' && item.status !== selectedStatus) return false;

      // Vade Filtresi
      if (selectedDueDateFilter === 'OVERDUE') {
        if (!item.dueDate || item.dueDate >= todayStr || item.remainingAmount <= 0) return false;
      } else if (selectedDueDateFilter === 'THIS_WEEK') {
        if (!item.dueDate || item.remainingAmount <= 0) return false;
        const d = new Date(item.dueDate);
        const t = new Date(todayStr);
        const diffDays = (d.getTime() - t.getTime()) / (1000 * 3600 * 24);
        if (diffDays < 0 || diffDays > 7) return false;
      } else if (selectedDueDateFilter === 'THIS_MONTH') {
        if (!item.dueDate || item.remainingAmount <= 0) return false;
        const d = new Date(item.dueDate);
        const t = new Date(todayStr);
        const diffDays = (d.getTime() - t.getTime()) / (1000 * 3600 * 24);
        if (diffDays < 0 || diffDays > 30) return false;
      }

      // Arama Metni Filtresi
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesTitle = item.contactTitle.toLowerCase().includes(query);
        const matchesDoc = item.documentNumber.toLowerCase().includes(query);
        const matchesCode = item.itemCode.toLowerCase().includes(query);
        const matchesDesc = item.description?.toLowerCase().includes(query) || false;
        const matchesCat = item.category?.toLowerCase().includes(query) || false;
        const matchesTax = item.contactTaxNumber?.includes(query) || false;
        if (!matchesTitle && !matchesDoc && !matchesCode && !matchesDesc && !matchesCat && !matchesTax) {
          return false;
        }
      }

      return true;
    });
  }, [items, selectedType, selectedStatus, selectedDueDateFilter, searchTerm, todayStr]);

  // KPI Hesaplamaları
  const kpis = useMemo(() => {
    let totalAlacak = 0;
    let alacakRemaining = 0;
    let alacakPaid = 0;

    let totalBorc = 0;
    let borcRemaining = 0;
    let borcPaid = 0;

    let overdueAlacak = 0;
    let overdueBorc = 0;
    let overdueAlacakCount = 0;
    let overdueBorcCount = 0;

    items.forEach(item => {
      const isOverdue = item.dueDate && item.dueDate < todayStr && item.remainingAmount > 0;

      if (item.type === 'ALACAK') {
        totalAlacak += item.totalAmount;
        alacakRemaining += item.remainingAmount;
        alacakPaid += item.paidAmount;
        if (isOverdue) {
          overdueAlacak += item.remainingAmount;
          overdueAlacakCount++;
        }
      } else {
        totalBorc += item.totalAmount;
        borcRemaining += item.remainingAmount;
        borcPaid += item.paidAmount;
        if (isOverdue) {
          overdueBorc += item.remainingAmount;
          overdueBorcCount++;
        }
      }
    });

    const netBalance = alacakRemaining - borcRemaining;

    return {
      totalAlacak,
      alacakRemaining,
      alacakPaid,
      alacakPercent: totalAlacak > 0 ? Math.round((alacakPaid / totalAlacak) * 100) : 0,

      totalBorc,
      borcRemaining,
      borcPaid,
      borcPercent: totalBorc > 0 ? Math.round((borcPaid / totalBorc) * 100) : 0,

      overdueAlacak,
      overdueAlacakCount,
      overdueBorc,
      overdueBorcCount,
      totalOverdue: overdueAlacak + overdueBorc,

      netBalance,
    };
  }, [items, todayStr]);

  // Excel İndirme
  const exportToExcel = () => {
    const exportData = filteredItems.map(item => ({
      'Kayıt Kodu': item.itemCode,
      Tür: item.type === 'ALACAK' ? 'Alacak (Müşteri)' : 'Borç (Tedarikçi)',
      'Cari Ünvan': item.contactTitle,
      'Vergi / TC No': item.contactTaxNumber || '-',
      'Belge No': item.documentNumber,
      'Belge Türü': item.documentType,
      'Düzenleme Tarihi': item.issueDate,
      'Vade Tarihi': item.dueDate,
      'Toplam Tutar (TL)': item.totalAmount,
      'Ödenen / Tahsil (TL)': item.paidAmount,
      'Kalan Tutar (TL)': item.remainingAmount,
      Durum:
        item.status === 'PAID'
          ? 'Ödendi'
          : item.status === 'PARTIAL'
          ? 'Kısmi Ödendi'
          : item.status === 'OVERDUE'
          ? 'Vadesi Geçti'
          : 'Bekliyor',
      Kategori: item.category || '-',
      Şube: item.branchName,
      Açıklama: item.description,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Borclar_Alacaklar');
    XLSX.writeFile(wb, `Borclar_Alacaklar_Raporu_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // PDF İndirme
  const exportToPDF = () => {
    const doc = new jsPDF('landscape');
    doc.setFontSize(14);
    doc.text('Borçlar & Alacaklar Portföy Raporu', 14, 15);
    doc.setFontSize(9);
    doc.text(`Oluşturulma: ${new Date().toLocaleString('tr-TR')} • Şube: ${currentBranchId === 'all' ? 'Tüm Şubeler' : currentBranchId}`, 14, 22);

    const tableData = filteredItems.map(i => [
      i.itemCode,
      i.type === 'ALACAK' ? 'Alacak' : 'Borç',
      i.contactTitle,
      i.documentNumber,
      i.issueDate,
      i.dueDate,
      `₺${i.totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`,
      `₺${i.paidAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`,
      `₺${i.remainingAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`,
      i.status === 'PAID' ? 'Ödendi' : i.status === 'PARTIAL' ? 'Kısmi' : i.status === 'OVERDUE' ? 'Gecikti' : 'Bekliyor',
    ]);

    autoTable(doc, {
      head: [['Kod', 'Tür', 'Cari Ünvan', 'Belge No', 'Tarih', 'Vade', 'Toplam', 'Ödenen', 'Kalan', 'Durum']],
      body: tableData,
      startY: 28,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 41, 59] },
    });

    doc.save(`Borclar_Alacaklar_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // AG-Grid Sütun Tanımları
  const columnDefs = useMemo<ColDef<DebtCreditItem>[]>(() => {
    return [
      {
        field: 'itemCode',
        headerName: 'Kayıt Kodu',
        width: 140,
        pinned: 'left',
        cellRenderer: (params: ICellRendererParams) => {
          if (!params.data) return null;
          const isAlc = params.data.type === 'ALACAK';
          return (
            <div className="flex items-center gap-2 font-mono font-bold text-xs">
              <span
                className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                  isAlc ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}
              >
                {isAlc ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
              </span>
              <span className="text-stone-900">{params.value}</span>
            </div>
          );
        },
      },
      {
        field: 'contactTitle',
        headerName: 'Cari Firma / Şahıs',
        minWidth: 230,
        flex: 1.5,
        cellRenderer: (params: ICellRendererParams) => {
          if (!params.data) return null;
          return (
            <div className="flex flex-col justify-center py-1">
              <span className="font-semibold text-stone-900 text-xs truncate" title={params.value}>
                {params.value}
              </span>
              <div className="flex items-center gap-2 text-[10px] text-stone-500 font-mono">
                {params.data.contactCode && <span>[{params.data.contactCode}]</span>}
                {params.data.contactTaxNumber && <span>VKN/TC: {params.data.contactTaxNumber}</span>}
              </div>
            </div>
          );
        },
      },
      {
        field: 'type',
        headerName: 'İşlem Türü',
        width: 120,
        valueFormatter: (params) => params.value === 'ALACAK' ? 'ALACAK (+)' : 'BORÇ (-)',
        cellRenderer: (params: ICellRendererParams) => {
          if (!params.value) return null;
          const isAlc = params.value === 'ALACAK';
          return (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                isAlc ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'
              }`}
            >
              {isAlc ? 'ALACAK (+)' : 'BORÇ (-)'}
            </span>
          );
        },
      },
      {
        field: 'documentNumber',
        headerName: 'Belge No / Türü',
        width: 150,
        valueFormatter: (params) => {
          const type = params.data?.documentType as any;
          if (type === 'E_FATURA') return 'E-Fatura';
          if (type === 'E_ARSIV') return 'E-Arşiv';
          if (type === 'SMM') return 'SMM';
          if (type === 'PERAKENDE_FIS') return 'Perakende Fiş';
          if (type === 'BANKA_DEKONTU') return 'Dekont';
          return type || 'Diğer';
        },
        cellRenderer: (params: ICellRendererParams) => {
          if (!params.data) return null;
          const type = params.data.documentType as any;
          const typeLabel = type === 'E_FATURA' ? 'E-Fatura' : type === 'E_ARSIV' ? 'E-Arşiv' : type === 'SMM' ? 'SMM' : type === 'PERAKENDE_FIS' ? 'Perakende Fiş' : type === 'BANKA_DEKONTU' ? 'Dekont' : type;
          return (
            <div className="flex flex-col justify-center py-1">
              <span className="font-mono text-xs font-semibold text-stone-800">{params.value}</span>
              <span className="text-[10px] text-stone-500">{typeLabel}</span>
            </div>
          );
        },
      },
      {
        field: 'issueDate',
        headerName: 'İşlem Tarihi',
        width: 110,
        cellRenderer: (params: ICellRendererParams) => (
          <span className="font-mono text-xs text-stone-700">{params.value}</span>
        ),
      },
      {
        field: 'dueDate',
        headerName: 'Vade Tarihi',
        width: 150,
        cellRenderer: (params: ICellRendererParams) => {
          if (!params.value) return '-';
          const d1 = new Date(todayStr);
          const d2 = new Date(params.value);
          const diffDays = Math.round((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24));
          const isRemaining = params.data?.remainingAmount > 0;

          return (
            <div className="flex flex-col justify-center py-1">
              <span className="font-mono text-xs font-semibold text-stone-900">{params.value}</span>
              {isRemaining && (
                <div>
                  {diffDays < 0 ? (
                    <span className="inline-block px-1.5 py-0.2 rounded-xs text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                      {Math.abs(diffDays)} gün gecikti!
                    </span>
                  ) : diffDays === 0 ? (
                    <span className="inline-block px-1.5 py-0.2 rounded-xs text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      Bugün son gün!
                    </span>
                  ) : diffDays <= 7 ? (
                    <span className="inline-block px-1.5 py-0.2 rounded-xs text-[10px] font-medium bg-amber-50 text-amber-700">
                      {diffDays} gün kaldı
                    </span>
                  ) : (
                    <span className="text-[10px] text-stone-400 font-mono">{diffDays} gün var</span>
                  )}
                </div>
              )}
            </div>
          );
        },
      },
      {
        field: 'totalAmount',
        headerName: 'Fatura Tutarı',
        width: 130,
        type: 'rightAligned',
        cellRenderer: (params: ICellRendererParams) => (
          <span className="font-mono text-xs font-semibold text-stone-800">
            ₺{params.value?.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        ),
      },
      {
        field: 'paidAmount',
        headerName: 'Tahsil / Ödenen',
        width: 130,
        type: 'rightAligned',
        cellRenderer: (params: ICellRendererParams) => (
          <span className="font-mono text-xs font-medium text-emerald-700">
            ₺{params.value?.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        ),
      },
      {
        field: 'remainingAmount',
        headerName: 'Kalan Bakiye',
        width: 140,
        pinned: 'right',
        type: 'rightAligned',
        cellRenderer: (params: ICellRendererParams) => {
          if (params.value === undefined) return null;
          const isZero = params.value <= 0.01;
          const isAlc = params.data?.type === 'ALACAK';
          return (
            <span
              className={`font-mono text-xs font-extrabold px-2 py-1 rounded-md ${
                isZero
                  ? 'bg-stone-100 text-stone-400'
                  : isAlc
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              ₺{params.value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          );
        },
      },
      {
        field: 'status',
        headerName: 'Ödeme / Tahsilat Durumu',
        width: 175,
        valueFormatter: (params) => {
          const val = params.value;
          const isAlacak = params.data?.type === 'ALACAK';
          if (val === 'PAID') return isAlacak ? 'Tahsil Edildi' : 'Ödeme Yapıldı';
          if (val === 'PARTIAL') return isAlacak ? 'Kısmi Tahsil Edildi' : 'Kısmi Ödendi';
          if (val === 'OVERDUE') return isAlacak ? 'Gecikti (Alınmadı)' : 'Gecikti (Ödenmedi)';
          return isAlacak ? 'Tahsil Edilmedi (Bekliyor)' : 'Ödeme Yapılmadı (Bekliyor)';
        },
        cellRenderer: (params: ICellRendererParams) => {
          const val = params.value as DebtCreditStatus;
          const item = params.data as DebtCreditItem;
          const isAlacak = item?.type === 'ALACAK';

          if (val === 'PAID') {
            return (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                <Check className="w-3 h-3 text-emerald-600" /> {isAlacak ? 'Tahsil Edildi' : 'Ödeme Yapıldı'}
              </span>
            );
          }
          if (val === 'PARTIAL') {
            return (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-blue-100 text-blue-800">
                <Clock className="w-3 h-3 text-blue-600" /> {isAlacak ? 'Kısmi Tahsil Edildi' : 'Kısmi Ödendi'}
              </span>
            );
          }
          if (val === 'OVERDUE') {
            return (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-800">
                <AlertCircle className="w-3 h-3 text-rose-600" /> {isAlacak ? 'Gecikti (Alınmadı)' : 'Gecikti (Ödenmedi)'}
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 border border-amber-200 text-amber-900">
              <Clock className="w-3 h-3 text-amber-600" /> {isAlacak ? 'Tahsil Edilmedi (Bekliyor)' : 'Ödeme Yapılmadı (Bekliyor)'}
            </span>
          );
        },
      },
      {
        field: 'branchName',
        headerName: 'Şube',
        width: 140,
        cellRenderer: (params: ICellRendererParams) => (
          <span className="text-xs text-stone-600 truncate">{params.value}</span>
        ),
      },
      {
        headerName: 'İşlemler',
        width: 170,
        pinned: 'right',
        cellRenderer: (params: ICellRendererParams) => {
          if (!params.data) return null;
          const item = params.data as DebtCreditItem;
          const isRemaining = item.remainingAmount > 0;
          const isAlc = item.type === 'ALACAK';

          return (
            <div className="flex items-center gap-1.5 h-full">
              {isRemaining && (
                <button
                  onClick={() => {
                    setSelectedItem(item);
                    setIsPaymentModalOpen(true);
                  }}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold text-white shadow-2xs transition-colors ${
                    isAlc ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                  title={isAlc ? 'Tahsilat Al' : 'Ödeme Yap'}
                >
                  <Coins className="w-3 h-3" />
                  <span>{isAlc ? 'Tahsil Et' : 'Ödeme Yap'}</span>
                </button>
              )}

              <button
                onClick={() => {
                  setSelectedItem(item);
                  setIsDetailModalOpen(true);
                }}
                className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-md transition-colors"
                title="Detay & Hareketler"
              >
                <Eye className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  if (window.confirm(`${item.itemCode} numaralı kaydı silmek istediğinize emin misiniz?`)) {
                    handleDelete(item.id);
                  }
                }}
                className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                title="Kaydı Sil"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        },
      },
    ];
  }, [todayStr]);

  const rowSelection = useMemo<RowSelectionOptions<DebtCreditItem>>(() => ({
    mode: 'singleRow',
    checkboxes: false,
    enableClickSelection: true,
  }), []);

  const onGridReady = (params: GridReadyEvent) => {
    setGridApi(params.api);
  };

  const currentBranchObj = branches.find(b => b.id === currentBranchId);
  const currentBranchDisplayName = currentBranchId === 'all' ? 'Tüm Şubeler (Konsolide)' : currentBranchObj?.name || 'Merkez Şube';

  return (
    <div className="space-y-6">
      {/* 4'lü Finansal KPI Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Müşteri Alacakları */}
        <div className="p-4 bg-white rounded-xl border border-stone-200 shadow-xs hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-600 uppercase tracking-wider">
              Toplam Müşteri Alacakları
            </span>
            <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
              <ArrowDownLeft className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-extrabold font-mono text-emerald-700">
            ₺{kpis.alacakRemaining.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-2 text-xs text-stone-500 flex justify-between items-center">
            <span>Fatura: ₺{kpis.totalAlacak.toLocaleString('tr-TR')}</span>
            <span className="font-semibold text-emerald-700 font-mono">%{kpis.alacakPercent} Tahsil</span>
          </div>
          <div className="w-full h-1.5 bg-stone-100 rounded-full mt-1.5 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${kpis.alacakPercent}%` }} />
          </div>
        </div>

        {/* 2. Tedarikçi Borçları */}
        <div className="p-4 bg-white rounded-xl border border-stone-200 shadow-xs hover:border-rose-300 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-600 uppercase tracking-wider">
              Toplam Tedarikçi Borçları
            </span>
            <span className="p-1.5 bg-rose-50 text-rose-700 rounded-lg">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-extrabold font-mono text-rose-700">
            ₺{kpis.borcRemaining.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-2 text-xs text-stone-500 flex justify-between items-center">
            <span>Fatura: ₺{kpis.totalBorc.toLocaleString('tr-TR')}</span>
            <span className="font-semibold text-rose-700 font-mono">%{kpis.borcPercent} Ödendi</span>
          </div>
          <div className="w-full h-1.5 bg-stone-100 rounded-full mt-1.5 overflow-hidden">
            <div className="h-full bg-rose-500 rounded-full" style={{ width: `${kpis.borcPercent}%` }} />
          </div>
        </div>

        {/* 3. Vadesi Geçen Riskli Bakiye */}
        <div className="p-4 bg-white rounded-xl border border-stone-200 shadow-xs hover:border-amber-300 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-600 uppercase tracking-wider">
              Vadesi Geçenler (Risk)
            </span>
            <span className="p-1.5 bg-amber-50 text-amber-700 rounded-lg">
              <AlertCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-extrabold font-mono text-amber-700">
            ₺{kpis.totalOverdue.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-2 text-xs text-stone-500 flex justify-between items-center">
            <span>Geciken Alacak: ₺{kpis.overdueAlacak.toLocaleString('tr-TR')}</span>
            <span className="font-semibold text-amber-800 font-mono">
              {kpis.overdueAlacakCount + kpis.overdueBorcCount} Kalem
            </span>
          </div>
          <div className="text-[11px] text-stone-400 mt-1">
            Geciken Borç: ₺{kpis.overdueBorc.toLocaleString('tr-TR')}
          </div>
        </div>

        {/* 4. Net Nakit Pozisyonu */}
        <div className="p-4 bg-white rounded-xl border border-stone-200 shadow-xs hover:border-blue-300 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-600 uppercase tracking-wider">
              Net Pozisyon (Alacak - Borç)
            </span>
            <span className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div
            className={`text-2xl font-extrabold font-mono ${
              kpis.netBalance >= 0 ? 'text-blue-700' : 'text-rose-700'
            }`}
          >
            {kpis.netBalance >= 0 ? '+' : ''}₺
            {kpis.netBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-2 text-xs text-stone-500 flex justify-between items-center">
            <span>{kpis.netBalance >= 0 ? 'Pozitif Net Alacak' : 'Negatif Net Borç'}</span>
            <span className="font-semibold text-stone-800">
              {kpis.borcRemaining > 0
                ? `${(kpis.alacakRemaining / kpis.borcRemaining).toFixed(2)}x Karşılama`
                : '1.00x'}
            </span>
          </div>
          <div className="text-[11px] text-stone-400 mt-1 truncate">
            {currentBranchDisplayName}
          </div>
        </div>
      </div>

      {/* Aksiyon Barı & Filtreler */}
      <div className="p-4 bg-white rounded-xl border border-stone-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Arama Inputu */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Cari Ünvan, Belge No, Kod veya Vergi No ile Ara..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-9 pr-4 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-stone-800 focus:bg-white transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sağ Butonlar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setNewModalInitialType(selectedType === 'BORC' ? 'BORC' : 'ALACAK');
                setIsNewModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni İşlem Ekle</span>
            </button>

            <div className="h-6 w-px bg-stone-200 mx-1 hidden sm:block" />

            <button
              onClick={exportToExcel}
              className="flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-lg border border-stone-200 transition-colors"
              title="Excel İndir"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span className="hidden sm:inline">Excel</span>
            </button>

            <button
              onClick={exportToPDF}
              className="flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-lg border border-stone-200 transition-colors"
              title="PDF Raporu"
            >
              <Download className="w-4 h-4 text-rose-700" />
              <span className="hidden sm:inline">PDF</span>
            </button>

            <button
              onClick={loadData}
              disabled={refreshing}
              className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg border border-stone-200 transition-colors"
              title="Yenile"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            <AgGridSidebarToggleBtn
              isOpen={isSidebarOpen}
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            />
          </div>
        </div>

        {/* Hızlı Filtre Tabları / Pill'leri */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100 text-xs">
          {/* Tür Filtresi */}
          <div className="flex items-center bg-stone-100 p-1 rounded-lg border border-stone-200">
            {[
              { id: 'ALL', label: 'Tüm Kayıtlar' },
              { id: 'ALACAK', label: 'Alacaklar (Müşteriler)' },
              { id: 'BORC', label: 'Borçlar (Tedarikçiler)' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedType(t.id as any)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  selectedType === t.id
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Vade Filtresi */}
          <div className="flex items-center bg-stone-100 p-1 rounded-lg border border-stone-200">
            {[
              { id: 'ALL', label: 'Tüm Vadeler' },
              { id: 'OVERDUE', label: '🚨 Vadesi Geçenler' },
              { id: 'THIS_WEEK', label: '⏳ Bu Hafta Dolacaklar' },
              { id: 'THIS_MONTH', label: '📅 Bu Ay Dolacaklar' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setSelectedDueDateFilter(f.id as any)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  selectedDueDateFilter === f.id
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Durum Filtresi */}
          <div className="flex items-center bg-stone-100 p-1 rounded-lg border border-stone-200">
            {[
              { id: 'ALL', label: 'Tüm Durumlar' },
              { id: 'PENDING', label: 'Bekleyenler (Ödenmedi/Alınmadı)' },
              { id: 'PARTIAL', label: 'Kısmi Ödenenler' },
              { id: 'PAID', label: 'Kapananlar (Ödendi/Tahsil Edildi)' },
            ].map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedStatus(s.id as any)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  selectedStatus === s.id
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="ml-auto text-xs text-stone-500 font-mono">
            {filteredItems.length} kayıt listelendi
          </div>
        </div>
      </div>

      {/* AG-GRID TABLOSU & SIDEBAR BİLEŞENİ */}
      <div className="relative flex bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="flex-1 overflow-hidden" style={{ height: '600px' }}>
          <AgGridReact
            ref={gridRef}
            localeText={AG_GRID_LOCALE_TR}
            rowData={filteredItems}
            columnDefs={columnDefs}
            theme={appTheme.withParams({
              fontFamily: 'inherit',
              headerFontWeight: '600',
              headerFontSize: 13,
              fontSize: 12,
              rowHeight: 48,
              headerHeight: 42,
            })}
            onGridReady={onGridReady}
            pagination={true}
            paginationPageSize={20}
            paginationPageSizeSelector={[10, 20, 50, 100]}
            animateRows={true}
            rowSelection={rowSelection}
            onRowDoubleClicked={event => {
              if (event.data) {
                setSelectedItem(event.data);
                setIsDetailModalOpen(true);
              }
            }}
          />
        </div>

        {/* Sütun Ayarları Sidebar'ı */}
        {isSidebarOpen && (
          <AgGridColumnSidebar
            gridApi={gridApi}
            onClose={() => setIsSidebarOpen(false)}
            sidebarRef={sidebarRef}
          />
        )}
      </div>

      {/* MODALLAR */}
      {/* 1. Yeni Borç / Alacak Kaydı Modalı */}
      <NewDebtCreditModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSuccess={() => loadData()}
        initialType={newModalInitialType}
        contacts={contacts}
        cashBanks={cashBanks}
        currentBranchId={currentBranchId}
        currentBranchName={currentBranchDisplayName}
      />

      {/* 2. Tahsilat / Ödeme Modalı */}
      <DebtCreditPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedItem(null);
        }}
        onSuccess={() => loadData()}
        item={selectedItem}
        cashBanks={cashBanks}
      />

      {/* 3. Detay & Makbuz Modalı */}
      <DebtCreditDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedItem(null);
        }}
        item={selectedItem}
        onOpenPaymentModal={item => {
          setSelectedItem(item);
          setIsPaymentModalOpen(true);
        }}
        onDelete={id => handleDelete(id)}
      />
    </div>
  );
};

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
  TrendingUp,
  TrendingDown,
  FileCheck2,
  FileSpreadsheet,
  Plus,
  Search,
  Filter,
  Calendar,
  DollarSign,
  Building,
  Eye,
  ArrowRight,
  Clock,
  Printer,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  Send,
  Download,
  Share2,
  MapPin,
  X,
  ShieldCheck,
} from 'lucide-react';
import {
  TradeOffer,
  TradeInvoice,
  OfferType,
  TradeDirection,
  GibInvoice,
} from '../../types/trade';
import { Branch } from '../../types/fx';
import { tradeService } from '../../services/tradeService';
import { fxApi, branchContext } from '../../services/api';
import { NewOfferModal } from './NewOfferModal';
import { NewInvoiceModal } from './NewInvoiceModal';
import { OfferDetailModal } from './OfferDetailModal';
import { GibInvoiceViewerModal } from '../E-fatura/GibInvoiceViewerModal';
import { AgGridColumnSidebar, AgGridSidebarToggleBtn } from '../common/AgGridColumnSidebar';


export type AlisSatisTab = 'satislar' | 'alislar' | 'verilen-teklifler' | 'alinan-teklifler';

interface AlisSatisManagementProps {
  currentBranchId: string;
  branches: Branch[];
}

export const AlisSatisManagement: React.FC<AlisSatisManagementProps> = ({
  currentBranchId,
  branches,
}) => {
  const [activeTab, setActiveTab] = useState<AlisSatisTab>('satislar');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>(
    currentBranchId || branchContext.getSelectedBranchId() || 'all'
  );

  // Veriler
  const [offers, setOffers] = useState<TradeOffer[]>([]);
  const [invoices, setInvoices] = useState<TradeInvoice[]>([]);

  // Modallar
  const [isNewOfferModalOpen, setIsNewOfferModalOpen] = useState(false);
  const [newOfferInitialType, setNewOfferInitialType] = useState<OfferType>('VERILEN');

  const [isNewInvoiceModalOpen, setIsNewInvoiceModalOpen] = useState(false);
  const [newInvoiceInitialDirection, setNewInvoiceInitialDirection] = useState<TradeDirection>('SATIS');

  const [selectedOfferForDetail, setSelectedOfferForDetail] = useState<TradeOffer | null>(null);
  const [selectedInvoiceForViewer, setSelectedInvoiceForViewer] = useState<GibInvoice | null>(null);

  const loadData = () => {
    const o = tradeService.getOffers(selectedBranchFilter);
    const i = tradeService.getInvoices(selectedBranchFilter);
    setOffers(o);
    setInvoices(i);
  };

  useEffect(() => {
    loadData();
  }, [selectedBranchFilter]);

  // Şube değişimlerini hem currentBranchId prop'u hem de branchContext üzerinden dinamik olarak senkronize et
  useEffect(() => {
    const syncBranch = () => {
      const activeBranch = currentBranchId || branchContext.getSelectedBranchId() || 'all';
      setSelectedBranchFilter(activeBranch);
    };

    syncBranch();

    const unsubscribe = branchContext.subscribe(() => {
      const activeBranch = branchContext.getSelectedBranchId() || 'all';
      setSelectedBranchFilter(activeBranch);
    });

    return () => unsubscribe();
  }, [currentBranchId]);

  const currentBranchName = useMemo(() => {
    if (selectedBranchFilter === 'all') return 'Tüm Şubeler Konsolide';
    const found = branches.find((b) => b.id === selectedBranchFilter);
    return found ? found.name : 'Merkez Şube';
  }, [selectedBranchFilter, branches]);

  // Filtrelenmiş Veriler
  const salesInvoices = useMemo(() => {
    return invoices
      .filter((i) => i.direction === 'SATIS')
      .filter((i) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          i.invoiceNumber.toLowerCase().includes(q) ||
          i.contactTitle.toLowerCase().includes(q) ||
          (i.contactTaxNumber && i.contactTaxNumber.includes(q))
        );
      });
  }, [invoices, searchQuery]);

  const purchaseInvoices = useMemo(() => {
    return invoices
      .filter((i) => i.direction === 'ALIS')
      .filter((i) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          i.invoiceNumber.toLowerCase().includes(q) ||
          i.contactTitle.toLowerCase().includes(q) ||
          (i.contactTaxNumber && i.contactTaxNumber.includes(q))
        );
      });
  }, [invoices, searchQuery]);

  const givenOffers = useMemo(() => {
    return offers
      .filter((o) => o.offerType === 'VERILEN')
      .filter((o) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          o.offerNumber.toLowerCase().includes(q) ||
          o.contactTitle.toLowerCase().includes(q)
        );
      });
  }, [offers, searchQuery]);

  const receivedOffers = useMemo(() => {
    return offers
      .filter((o) => o.offerType === 'ALINAN')
      .filter((o) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          o.offerNumber.toLowerCase().includes(q) ||
          o.contactTitle.toLowerCase().includes(q)
        );
      });
  }, [offers, searchQuery]);

  // Toplamlar
  const totalSalesTRY = useMemo(() => salesInvoices.reduce((acc, i) => acc + (i.grandTotal || (i as any).totalAmount || 0), 0), [salesInvoices]);
  const totalPurchasesTRY = useMemo(() => purchaseInvoices.reduce((acc, i) => acc + (i.grandTotal || (i as any).totalAmount || 0), 0), [purchaseInvoices]);
  const totalGivenOffersTRY = useMemo(() => givenOffers.reduce((acc, i) => acc + (i.grandTotal || (i as any).totalAmount || 0), 0), [givenOffers]);
  const totalReceivedOffersTRY = useMemo(() => receivedOffers.reduce((acc, i) => acc + (i.grandTotal || (i as any).totalAmount || 0), 0), [receivedOffers]);

  // AG Grid Refs
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Fatura Kolon Tanımları (Satış & Alış)
  const invoiceColumnDefs = useMemo<ColDef<TradeInvoice>[]>(() => [
    {
      field: 'invoiceNumber',
      headerName: 'Belge No / Senaryo',
      width: 180,
      cellRenderer: (params: ICellRendererParams<TradeInvoice>) => {
        const scenario = params.data?.scenario;
        let scenarioLabel = 'E-ARŞİV';
        let scenarioStyle = 'bg-stone-100 text-stone-600';
        
        if (scenario === 'TICARI') {
          scenarioLabel = 'TİCARİ';
          scenarioStyle = 'bg-indigo-50 text-indigo-700 border-indigo-100';
        } else if (scenario === 'TEMEL') {
          scenarioLabel = 'TEMEL';
          scenarioStyle = 'bg-blue-50 text-blue-700 border-blue-100';
        }

        return (
          <div className="flex flex-col justify-center h-full py-1">
            <div className="flex items-center gap-1.5">
              <FileCheck2 className="w-3.5 h-3.5 text-stone-400" />
              <span className="font-mono font-black text-stone-900 tracking-tighter">{params.value}</span>
            </div>
            <div className="mt-0.5">
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-black border ${scenarioStyle}`}>
                {scenarioLabel}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      field: 'contactTitle',
      headerName: 'Cari Firma / Ünvan Bilgisi',
      minWidth: 280,
      flex: 1.5,
      cellRenderer: (params: ICellRendererParams<TradeInvoice>) => (
        <div className="flex items-center gap-3 h-full py-1">
          <div className="w-8 h-8 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-500 shrink-0">
            <Building className="w-4 h-4" />
          </div>
          <div className="flex flex-col justify-center overflow-hidden">
            <span className="font-bold text-stone-900 truncate leading-tight" title={params.value}>
              {params.value}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              {params.data?.contactTaxNumber && (
                <span className="text-[10px] text-stone-500 font-mono bg-stone-50 px-1 rounded border border-stone-100">
                  VKN: {params.data.contactTaxNumber}
                </span>
              )}
              {params.data?.contactTcNumber && (
                <span className="text-[10px] text-stone-500 font-mono bg-stone-50 px-1 rounded border border-stone-100">
                  TCKN: {params.data.contactTcNumber}
                </span>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      field: 'issueDate',
      headerName: 'Düzenleme',
      width: 120,
      cellRenderer: (params: ICellRendererParams<TradeInvoice>) => (
        <div className="flex flex-col justify-center h-full py-1 text-[11px]">
          <span className="text-stone-400 font-semibold uppercase tracking-tighter">Tarih</span>
          <span className="text-stone-900 font-bold font-mono">{params.value}</span>
        </div>
      ),
    },
    {
      field: 'dueDate',
      headerName: 'Vade Durumu',
      width: 140,
      cellRenderer: (params: ICellRendererParams<TradeInvoice>) => {
        const isExp = params.value && new Date(params.value) < new Date() && params.data?.paymentStatus !== 'PAID';
        return (
          <div className="flex flex-col justify-center h-full py-1">
             <div className="flex items-center gap-1">
                <Clock className={`w-3 h-3 ${isExp ? 'text-rose-500' : 'text-stone-400'}`} />
                <span className={`font-mono text-xs font-bold ${isExp ? 'text-rose-600' : 'text-stone-800'}`}>
                  {params.value}
                </span>
             </div>
            {isExp && <span className="text-[9px] text-rose-500 font-black uppercase tracking-tighter animate-pulse">Vadesi Geçti</span>}
          </div>
        );
      },
    },
    {
      field: 'grandTotal',
      headerName: 'Tutar / Döviz',
      width: 160,
      type: 'rightAligned',
      cellRenderer: (params: ICellRendererParams<TradeInvoice>) => (
        <div className="flex flex-col justify-center items-end h-full py-1">
          <div className="flex items-center gap-1">
            <span className="text-xs font-black text-stone-900 font-mono">
              {params.value?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] font-black px-1 rounded bg-stone-100 text-stone-600 border border-stone-200">
              {params.data?.currency}
            </span>
          </div>
          {params.data?.currency !== 'TRY' && (
             <span className="text-[9px] text-stone-400 font-mono italic">
               (₺{params.data?.grandTotalTRY?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })})
             </span>
          )}
        </div>
      ),
    },
    {
      field: 'paymentStatus',
      headerName: 'Finansal Durum',
      width: 160,
      cellRenderer: (params: ICellRendererParams<TradeInvoice>) => {
        const status = params.value;
        const isSales = params.data?.direction === 'SATIS';
        let label = '';
        let style = '';
        let Icon = AlertCircle;
        
        if (status === 'PAID') {
          label = isSales ? 'TAHSİL EDİLDİ' : 'ÖDEME YAPILDI';
          style = 'bg-emerald-50 text-emerald-700 border-emerald-200';
          Icon = CheckCircle2;
        } else if (status === 'PARTIAL') {
          label = isSales ? 'KISMİ TAHSİLAT' : 'KISMİ ÖDEME';
          style = 'bg-amber-50 text-amber-700 border-amber-200';
          Icon = Clock;
        } else {
          label = isSales ? 'ÖDEME BEKLİYOR' : 'ÖDENMEDİ';
          style = 'bg-rose-50 text-rose-700 border-rose-200';
          Icon = AlertCircle;
        }
        
        return (
          <div className="flex items-center h-full">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black border ${style}`}>
              <Icon className="w-3 h-3 shrink-0" />
              <span>{label}</span>
            </div>
          </div>
        );
      },
    },
    {
      field: 'gibStatus',
      headerName: 'E-Fatura / GİB',
      width: 150,
      cellRenderer: (params: ICellRendererParams<TradeInvoice>) => {
        if (params.value === 'NOT_SENT') {
          return (
            <div className="flex items-center gap-2 h-full py-1">
              <button
                onClick={(e) => { e.stopPropagation(); handleSendToGib(params.data!.id); }}
                className="flex items-center gap-1 px-2 py-1 bg-stone-900 hover:bg-black text-white text-[9px] font-black rounded border border-stone-800 shadow-sm transition-all cursor-pointer group"
              >
                <Send className="w-2.5 h-2.5 group-hover:translate-x-0.5 transition-transform" />
                <span>GÖNDER</span>
              </button>
              <span className="text-[9px] font-bold text-stone-400">TASLAK</span>
            </div>
          );
        }
        return (
          <div className="flex items-center h-full">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded text-[9px] font-black">
              <ShieldCheck className="w-3 h-3" />
              <span>GİB ONAYLI</span>
            </div>
          </div>
        );
      },
    },
    {
      headerName: '',
      width: 60,
      pinned: 'right',
      cellRenderer: (params: ICellRendererParams<TradeInvoice>) => (
        <div className="flex items-center justify-center h-full">
          <button
            onClick={() => handleViewInvoiceAsGib(params.data!)}
            className="w-8 h-8 flex items-center justify-center text-stone-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
            title="Detaylı Görünüm"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ], []);

  // Teklif Kolon Tanımları
  const offerColumnDefs = useMemo<ColDef<TradeOffer>[]>(() => [
    {
      field: 'offerNumber',
      headerName: 'Belge No',
      width: 160,
      cellRenderer: (params: ICellRendererParams<TradeOffer>) => (
        <div className="flex items-center gap-2 h-full">
           <div className="w-7 h-7 rounded bg-stone-100 flex items-center justify-center text-stone-500">
             <FileSpreadsheet className="w-3.5 h-3.5" />
           </div>
           <span className="font-mono font-black text-stone-900 tracking-tighter">{params.value}</span>
        </div>
      ),
    },
    {
      field: 'contactTitle',
      headerName: 'Cari Ünvan / Firma',
      minWidth: 260,
      flex: 1.5,
      cellRenderer: (params: ICellRendererParams<TradeOffer>) => (
        <div className="flex flex-col justify-center h-full py-1">
          <span className="font-bold text-stone-900 truncate leading-tight" title={params.value}>
            {params.value}
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            {params.data?.contactTaxNumber && (
              <span className="text-[9px] text-stone-500 font-mono bg-stone-50 px-1 rounded border border-stone-100">
                {params.data.contactTaxNumber}
              </span>
            )}
            {params.data?.paymentTerms && (
               <span className="text-[9px] text-indigo-500 font-semibold truncate max-w-[140px]">
                 • {params.data.paymentTerms}
               </span>
            )}
          </div>
        </div>
      ),
    },
    {
      field: 'issueDate',
      headerName: 'Teklif Tarihi',
      width: 120,
      cellRenderer: (params) => <span className="font-mono text-xs font-bold text-stone-600">{params.value}</span>
    },
    {
      field: 'validUntilDate',
      headerName: 'Geçerlilik',
      width: 140,
      cellRenderer: (params: ICellRendererParams<TradeOffer>) => {
        const isExp = params.value && new Date(params.value) < new Date();
        return (
          <div className="flex flex-col justify-center h-full py-1">
             <div className="flex items-center gap-1">
                <Calendar className={`w-3 h-3 ${isExp ? 'text-rose-500' : 'text-stone-400'}`} />
                <span className={`font-mono text-xs font-bold ${isExp ? 'text-rose-600' : 'text-stone-800'}`}>
                  {params.value}
                </span>
             </div>
            {isExp && params.data?.status !== 'CONVERTED' && (
              <span className="text-[9px] text-rose-500 font-black uppercase tracking-tighter">Süresi Doldu</span>
            )}
          </div>
        );
      },
    },
    {
      field: 'grandTotal',
      headerName: 'Teklif Tutarı',
      width: 160,
      type: 'rightAligned',
      cellRenderer: (params: ICellRendererParams<TradeOffer>) => (
        <div className="flex flex-col justify-center items-end h-full py-1">
          <div className="flex items-center gap-1">
            <span className="text-xs font-black text-stone-900 font-mono">
              {params.value?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] font-black px-1 rounded bg-stone-100 text-stone-600 border border-stone-200">
              {params.data?.currency}
            </span>
          </div>
        </div>
      ),
    },
    {
      field: 'status',
      headerName: 'Süreç Durumu',
      width: 160,
      cellRenderer: (params: ICellRendererParams<TradeOffer>) => {
        const status = params.value;
        let style = '';
        let label = '';
        let Icon = Clock;
        
        switch (status) {
          case 'CONVERTED':
            label = 'FATURALANDI';
            style = 'bg-emerald-50 text-emerald-700 border-emerald-200';
            Icon = CheckCircle2;
            break;
          case 'ACCEPTED':
            label = 'ONAYLANDI';
            style = 'bg-blue-50 text-blue-700 border-blue-200';
            Icon = CheckCircle2;
            break;
          case 'REJECTED':
            label = 'REDDEDİLDİ';
            style = 'bg-rose-50 text-rose-700 border-rose-200';
            Icon = X;
            break;
          default:
            label = 'BEKLEMEDE';
            style = 'bg-amber-50 text-amber-700 border-amber-200';
            Icon = Clock;
        }
        
        return (
          <div className="flex items-center h-full">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black border ${style}`}>
              <Icon className="w-3 h-3 shrink-0" />
              <span>{label}</span>
            </div>
          </div>
        );
      },
    },
    {
      headerName: '',
      width: 130,
      pinned: 'right',
      cellRenderer: (params: ICellRendererParams<TradeOffer>) => {
        const off = params.data;
        if (!off) return null;
        return (
          <div className="flex items-center justify-center gap-2 h-full">
            <button
              onClick={() => setSelectedOfferForDetail(off)}
              className="w-8 h-8 flex items-center justify-center text-stone-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
              title="Detay / Yazdır"
            >
              <Printer className="w-4 h-4" />
            </button>
            {off.status !== 'CONVERTED' && (
              <button
                onClick={() => handleConvertToInvoice(off.id)}
                className="flex items-center gap-1 px-2 py-1 bg-stone-900 hover:bg-black text-white text-[9px] font-black rounded shadow-sm transition-all cursor-pointer"
              >
                <span>FATURA</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        );
      },
    },
  ], []);

  const rowSelection = useMemo<RowSelectionOptions>(
    () => ({
      mode: 'multiRow',
      checkboxes: true,
      headerCheckbox: true,
      enableClickSelection: true,
      selectAll: 'all',
      selectionColumnDef: {
        pinned: 'left',
        width: 48,
        minWidth: 48,
        maxWidth: 48,
        resizable: false,
        sortable: false,
        suppressColumnsToolPanel: true,
      },
    }),
    []
  );

  const onGridReady = (params: GridReadyEvent) => {
    setGridApi(params.api);
  };

  const activeOffersCount = offers.filter((o) => o.status === 'SENT').length;
  const pendingCollectionTRY = invoices
    .filter((i) => i.direction === 'SATIS' && i.paymentStatus !== 'PAID')
    .reduce((sum, i) => sum + i.remainingAmount, 0);

  // Teklif Dönüştürme
  const handleConvertToInvoice = (offerId: string) => {
    try {
      const created = tradeService.convertOfferToInvoice(offerId);
      if (created) {
        loadData();
        alert(`${created.invoiceNumber} numaralı fatura başarıyla oluşturuldu ve Ödemeler & Tahsilatlar modülüne yansıtıldı!`);
      }
    } catch (err: any) {
      alert(err.message || 'Teklif faturaya dönüştürülürken bir hata oluştu.');
    }
  };

  const handleSendToGib = (invId: string) => {
    const updated = tradeService.sendInvoiceToGib(invId);
    if (updated) {
      loadData();
      alert(`${updated.invoiceNumber} numaralı fatura başarıyla GİB'e gönderildi ve onaylandı!`);
    }
  };

  // Fatura GİB Görüntüleme
  const handleViewInvoiceAsGib = (inv: TradeInvoice) => {
    const gibView: GibInvoice = {
      id: inv.id,
      ettn: inv.ettn || '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
      invoiceNumber: inv.invoiceNumber,
      direction: inv.direction === 'SATIS' ? 'OUTGOING' : 'INCOMING',
      scenario: inv.scenario,
      invoiceType: inv.invoiceType,
      senderTitle: inv.direction === 'SATIS' ? 'FX Finansal Teknolojiler ve Filtre Sistemleri A.Ş.' : inv.contactTitle,
      senderVkn: inv.direction === 'SATIS' ? '3880491204' : (inv.contactTaxNumber || inv.contactTcNumber || '1111111111'),
      senderTaxOffice: inv.direction === 'SATIS' ? 'Büyük Mükellefler V.D.' : (inv.contactTaxOffice || 'Kadıköy V.D.'),
      senderAddress: inv.direction === 'SATIS' ? 'Büyükdere Cad. No:199 Levent / İstanbul' : inv.contactAddress,
      receiverTitle: inv.direction === 'SATIS' ? inv.contactTitle : 'FX Finansal Teknolojiler ve Filtre Sistemleri A.Ş.',
      receiverVkn: inv.direction === 'SATIS' ? (inv.contactTaxNumber || inv.contactTcNumber || '1111111111') : '3880491204',
      receiverTaxOffice: inv.direction === 'SATIS' ? inv.contactTaxOffice : 'Büyük Mükellefler V.D.',
      receiverAddress: inv.direction === 'SATIS' ? inv.contactAddress : 'Büyükdere Cad. No:199 Levent / İstanbul',
      issueDate: inv.issueDate,
      envelopeDate: inv.createdAt,
      currency: inv.currency,
      taxExclusiveAmount: inv.subtotal - inv.discountTotal,
      taxTotal: inv.vatTotal,
      totalPayable: inv.grandTotal,
      commercialResponse: 'ACCEPTED',
      commercialDeadline: inv.dueDate,
      gibStatusCode: 1200,
      gibStatusDescription: 'GİB Zarfı Onaylandı (1200)',
      envelopeUuid: 'env-9901-aa33-5566-bb88ee22',
      isImportedToErp: true,
      items: inv.items,
      notes: inv.notes,
    };
    setSelectedInvoiceForViewer(gibView);
  };

  // Dinamik Buton Eylemi
  const handlePrimaryActionClick = () => {
    if (activeTab === 'satislar') {
      setNewInvoiceInitialDirection('SATIS');
      setIsNewInvoiceModalOpen(true);
    } else if (activeTab === 'alislar') {
      setNewInvoiceInitialDirection('ALIS');
      setIsNewInvoiceModalOpen(true);
    } else if (activeTab === 'verilen-teklifler') {
      setNewOfferInitialType('VERILEN');
      setIsNewOfferModalOpen(true);
    } else if (activeTab === 'alinan-teklifler') {
      setNewOfferInitialType('ALINAN');
      setIsNewOfferModalOpen(true);
    }
  };

  const primaryActionLabel = useMemo(() => {
    switch (activeTab) {
      case 'satislar':
        return 'Yeni Satış Faturası Kes';
      case 'alislar':
        return 'Yeni Alış Faturası Girişi';
      case 'verilen-teklifler':
        return 'Yeni Satış Teklifi Ver';
      case 'alinan-teklifler':
        return 'Yeni Alış Teklifi Ekle';
    }
  }, [activeTab]);

  return (
    <div className="space-y-4">
      {/* Üst İstatistik Şeridi (Personel Yönetimi İle Aynı Yapı) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Satış Hacmi */}
        <div
          onClick={() => setActiveTab('satislar')}
          className={`bg-white border rounded-lg p-3.5 shadow-xs cursor-pointer transition-all ${
            activeTab === 'satislar' ? 'border-indigo-500 ring-1 ring-indigo-500/20 bg-indigo-50/10' : 'border-stone-200/90 hover:border-stone-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Toplam Satış Hacmi</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="mt-1 text-xl font-bold text-stone-900 tracking-tight font-mono">
            ₺{totalSalesTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-indigo-600 font-medium flex items-center gap-1 mt-0.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Faturalandırılmış Satışlar
          </span>
        </div>

        {/* Alış & Satınalma */}
        <div
          onClick={() => setActiveTab('alislar')}
          className={`bg-white border rounded-lg p-3.5 shadow-xs cursor-pointer transition-all ${
            activeTab === 'alislar' ? 'border-emerald-500 ring-1 ring-emerald-500/20 bg-emerald-50/10' : 'border-stone-200/90 hover:border-stone-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-700">Toplam Alış & Satınalma</span>
            <TrendingDown className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="mt-1 text-xl font-bold text-emerald-950 tracking-tight font-mono">
            ₺{totalPurchasesTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-stone-400 font-medium">Mal & Hizmet Alımları</span>
        </div>

        {/* Açık Teklifler */}
        <div
          onClick={() => setActiveTab('verilen-teklifler')}
          className={`bg-white border rounded-lg p-3.5 shadow-xs cursor-pointer transition-all ${
            activeTab === 'verilen-teklifler' ? 'border-amber-500 ring-1 ring-amber-500/20 bg-amber-50/10' : 'border-stone-200/90 hover:border-stone-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-700">Açık / Onay Bekleyen</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="mt-1 text-xl font-bold text-amber-950 tracking-tight font-mono">
            {activeOffersCount} Adet
          </p>
          <span className="text-[11px] text-amber-600 font-medium">Faturaya Dönüşebilir</span>
        </div>

        {/* Açık Bakiye */}
        <div className="bg-white border border-stone-200/90 rounded-lg p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-purple-700">Açık Satış Tahsilatı</span>
            <DollarSign className="w-4 h-4 text-purple-600" />
          </div>
          <p className="mt-1 text-xl font-bold text-purple-950 tracking-tight font-mono">
            ₺{pendingCollectionTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-stone-400">Vadesi Takip Edilen Bakiye</span>
        </div>
      </div>

      {/* Kontrol Çubuğu (Arama, Sekmeler ve İşlem Butonları - Personel Form Yapısı ile Aynı) */}
      <div className="bg-white border border-stone-200/90 rounded-lg p-3 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Sol: Hızlı Arama ve Sekme Seçimi */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="relative min-w-[220px] max-w-xs">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Fatura, teklif no veya cari ara..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-50/70 border border-stone-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white text-stone-800 placeholder-stone-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Mod / Sekme Seçimi */}
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as AlisSatisTab)}
              className="py-1.5 px-2.5 bg-stone-50 border border-stone-200 rounded-md text-xs font-semibold text-stone-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="satislar">📈 Satışlar ({salesInvoices.length})</option>
              <option value="alislar">🛍️ Alışlar ({purchaseInvoices.length})</option>
              <option value="verilen-teklifler">📤 Verilen Teklifler ({givenOffers.length})</option>
              <option value="alinan-teklifler">📥 Alınan Teklifler ({receivedOffers.length})</option>
            </select>

            <div className="text-xs text-stone-500 font-medium px-2 hidden sm:block">
              Şube: <strong className="text-stone-800">{currentBranchName}</strong>
            </div>
          </div>

          {/* Sağ: Aksiyon Butonları */}
          <div className="flex items-center gap-2">
            <AgGridSidebarToggleBtn
              isOpen={isSidebarOpen}
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            />

            <button
              type="button"
              onClick={handlePrimaryActionClick}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{primaryActionLabel}</span>
            </button>
          </div>
        </div>
      </div>

      {/* AG Grid Alanı & Yan Özelleştirme Paneli */}
      <div className="flex gap-4 items-start relative h-[580px]">
        <div
          className={`bg-white border border-stone-200/90 rounded-lg shadow-xs overflow-hidden transition-all duration-300 ${
            isSidebarOpen ? 'flex-1' : 'w-full'
          }`}
        >
          <div style={{ height: '580px', width: '100%' }}>
            <AgGridReact theme={appTheme}
              localeText={AG_GRID_LOCALE_TR}
              rowData={
                activeTab === 'satislar'
                  ? salesInvoices
                  : activeTab === 'alislar'
                  ? purchaseInvoices
                  : activeTab === 'verilen-teklifler'
                  ? givenOffers
                  : receivedOffers
              }
              columnDefs={
                activeTab === 'satislar' || activeTab === 'alislar'
                  ? invoiceColumnDefs
                  : offerColumnDefs
              }
              onGridReady={onGridReady}
              pagination={true}
              paginationPageSize={10}
              paginationPageSizeSelector={[10, 25, 50]}
              animateRows={true}
              rowHeight={56}
              headerHeight={42}
              rowSelection={rowSelection}
            />
          </div>
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
      <NewOfferModal
        key={`new-offer-modal-${selectedBranchFilter}`}
        isOpen={isNewOfferModalOpen}
        onClose={() => setIsNewOfferModalOpen(false)}
        initialType={newOfferInitialType}
        currentBranchId={selectedBranchFilter}
        currentBranchName={currentBranchName}
        onSuccess={() => {
          loadData();
          alert('Teklif başarıyla kaydedildi!');
        }}
      />

      <NewInvoiceModal
        key={`new-invoice-modal-${selectedBranchFilter}`}
        isOpen={isNewInvoiceModalOpen}
        onClose={() => setIsNewInvoiceModalOpen(false)}
        initialDirection={newInvoiceInitialDirection}
        currentBranchId={selectedBranchFilter}
        currentBranchName={currentBranchName}
        onSuccess={() => {
          loadData();
          alert('Fatura başarıyla kaydedildi ve Ödemeler & Tahsilatlar modülüne yansıtıldı!');
        }}
      />

      <OfferDetailModal
        isOpen={!!selectedOfferForDetail}
        onClose={() => setSelectedOfferForDetail(null)}
        offer={selectedOfferForDetail}
        onConvertToInvoice={handleConvertToInvoice}
      />

      <GibInvoiceViewerModal
        isOpen={!!selectedInvoiceForViewer}
        onClose={() => setSelectedInvoiceForViewer(null)}
        invoice={selectedInvoiceForViewer}
      />
    </div>
  );
};

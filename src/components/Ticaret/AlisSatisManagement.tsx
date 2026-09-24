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
import { fxApi } from '../../services/api';
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
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>(currentBranchId || 'all');

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
      headerName: 'Fatura No',
      width: 140,
      pinned: 'left',
      valueFormatter: (params) => params.data?.scenario === 'TICARI' ? 'TİCARİ' : params.data?.scenario === 'TEMEL' ? 'TEMEL' : params.data?.scenario || '',
      cellRenderer: (params: ICellRendererParams<TradeInvoice>) => (
        <div className="flex flex-col justify-center h-full py-1">
          <span className="font-mono font-bold text-stone-900">{params.value}</span>
          <span className="text-[10px] text-stone-400 font-sans">
            {params.data?.scenario === 'TICARI' ? 'TİCARİ' : params.data?.scenario === 'TEMEL' ? 'TEMEL' : params.data?.scenario}
          </span>
        </div>
      ),
    },
    {
      field: 'contactTitle',
      headerName: 'Cari Firma / Şahıs',
      minWidth: 230,
      flex: 1.5,
      cellRenderer: (params: ICellRendererParams<TradeInvoice>) => (
        <div className="flex flex-col justify-center h-full py-1">
          <span className="font-semibold text-stone-900 truncate" title={params.value}>
            {params.value}
          </span>
          <div className="text-[10px] text-stone-400 font-mono">
            {params.data?.contactTaxNumber && <span>VKN: {params.data.contactTaxNumber}</span>}
            {params.data?.contactTcNumber && <span>TCKN: {params.data.contactTcNumber}</span>}
          </div>
        </div>
      ),
    },
    {
      field: 'issueDate',
      headerName: 'Düzenleme Tarihi',
      width: 130,
      cellRenderer: (params: ICellRendererParams<TradeInvoice>) => (
        <span className="text-stone-600 font-medium">{params.value}</span>
      ),
    },
    {
      field: 'dueDate',
      headerName: 'Vade Tarihi',
      width: 130,
      cellRenderer: (params: ICellRendererParams<TradeInvoice>) => {
        const isExp = params.value && new Date(params.value) < new Date() && params.data?.paymentStatus !== 'PAID';
        return (
          <div className="flex flex-col justify-center h-full py-1">
            <span className={`font-medium ${isExp ? 'text-rose-600 font-bold' : 'text-stone-800'}`}>
              {params.value}
            </span>
            {isExp && <span className="text-[10px] text-rose-500 font-bold">Vadesi Geçti</span>}
          </div>
        );
      },
    },
    {
      field: 'grandTotal',
      headerName: 'Toplam Tutar',
      width: 140,
      type: 'rightAligned',
      cellRenderer: (params: ICellRendererParams<TradeInvoice>) => (
        <span className="font-mono font-bold text-stone-900">
          {params.value?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {params.data?.currency}
        </span>
      ),
    },
    {
      field: 'paymentStatus',
      headerName: 'Ödeme Durumu',
      width: 150,
      valueFormatter: (params) => {
        const status = params.value;
        const isSales = params.data?.direction === 'SATIS';
        if (status === 'PAID') return isSales ? 'Tahsil Edildi' : 'Ödeme Yapıldı';
        if (status === 'PARTIAL') return isSales ? 'Kısmi Tahsilat' : 'Kısmi Ödendi';
        return isSales ? 'Tahsilat Bekliyor' : 'Ödeme Yapılmadı';
      },
      cellRenderer: (params: ICellRendererParams<TradeInvoice>) => {
        const status = params.value;
        const isSales = params.data?.direction === 'SATIS';
        let label = '';
        let style = '';
        
        if (status === 'PAID') {
          label = isSales ? 'Tahsil Edildi' : 'Ödeme Yapıldı';
          style = 'bg-emerald-100 text-emerald-800';
        } else if (status === 'PARTIAL') {
          label = isSales ? 'Kısmi Tahsilat' : 'Kısmi Ödendi';
          style = 'bg-amber-100 text-amber-800';
        } else {
          label = isSales ? 'Tahsilat Bekliyor' : 'Ödeme Yapılmadı';
          style = 'bg-stone-100 text-stone-700';
        }
        
        return (
          <div className="flex items-center h-full">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${style}`}>
              {label}
            </span>
          </div>
        );
      },
    },
    {
      field: 'gibStatus',
      headerName: 'GİB Durumu',
      width: 150,
      cellRenderer: (params: ICellRendererParams<TradeInvoice>) => {
        if (params.value === 'PENDING') {
          return (
            <div className="flex flex-col items-center justify-center gap-1 py-1">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                <Clock className="w-3 h-3" /> Taslak
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); handleSendToGib(params.data!.id); }}
                className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-bold rounded-md shadow-2xs transition-colors cursor-pointer"
              >
                GİB'e Gönder
              </button>
            </div>
          );
        }
        return (
          <div className="flex items-center justify-center h-full">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
              <CheckCircle2 className="w-3 h-3" /> GİB Onaylı
            </span>
          </div>
        );
      },
    },
    {
      headerName: 'İşlemler',
      width: 80,
      pinned: 'right',
      cellRenderer: (params: ICellRendererParams<TradeInvoice>) => (
        <div className="flex items-center justify-center h-full">
          <button
            onClick={() => handleViewInvoiceAsGib(params.data!)}
            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Resmi E-Fatura Görüntüle"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ], []);

  // Teklif Kolon Tanımları
  const offerColumnDefs = useMemo<ColDef<TradeOffer>[]>(() => [
    {
      field: 'offerNumber',
      headerName: 'Teklif No',
      width: 140,
      pinned: 'left',
      cellRenderer: (params: ICellRendererParams<TradeOffer>) => (
        <span className="font-mono font-bold text-stone-900">{params.value}</span>
      ),
    },
    {
      field: 'contactTitle',
      headerName: 'Cari Ünvan',
      minWidth: 230,
      flex: 1.5,
      cellRenderer: (params: ICellRendererParams<TradeOffer>) => (
        <div className="flex flex-col justify-center h-full py-1">
          <span className="font-semibold text-stone-900 truncate" title={params.value}>
            {params.value}
          </span>
          <div className="text-[10px] text-stone-400 font-mono">
            {params.data?.contactTaxNumber && <span>VKN: {params.data.contactTaxNumber}</span>}
            {params.data?.paymentTerms && <span>• {params.data.paymentTerms}</span>}
          </div>
        </div>
      ),
    },
    {
      field: 'issueDate',
      headerName: 'Teklif Tarihi',
      width: 120,
    },
    {
      field: 'validUntilDate',
      headerName: 'Geçerlilik',
      width: 130,
      cellRenderer: (params: ICellRendererParams<TradeOffer>) => {
        const isExp = params.value && new Date(params.value) < new Date();
        return (
          <div className="flex flex-col justify-center h-full py-1">
            <span className={`font-medium ${isExp ? 'text-rose-600 font-bold' : 'text-stone-800'}`}>
              {params.value}
            </span>
            {isExp && params.data?.status !== 'CONVERTED' && (
              <span className="text-[10px] text-rose-500 font-semibold">Süresi Doldu</span>
            )}
          </div>
        );
      },
    },
    {
      field: 'grandTotal',
      headerName: 'Toplam Tutar',
      width: 140,
      type: 'rightAligned',
      cellRenderer: (params: ICellRendererParams<TradeOffer>) => (
        <span className="font-mono font-bold text-stone-900">
          {params.value?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {params.data?.currency}
        </span>
      ),
    },
    {
      field: 'status',
      headerName: 'Durum',
      width: 160,
      cellRenderer: (params: ICellRendererParams<TradeOffer>) => {
        const status = params.value;
        let style = '';
        let label = '';
        
        switch (status) {
          case 'CONVERTED':
            label = 'Faturaya Dönüştü';
            style = 'bg-emerald-100 text-emerald-800';
            break;
          case 'ACCEPTED':
            label = 'Onaylandı';
            style = 'bg-blue-100 text-blue-800';
            break;
          case 'REJECTED':
            label = 'Reddedildi';
            style = 'bg-rose-100 text-rose-800';
            break;
          default:
            label = 'Yanıt Bekliyor';
            style = 'bg-amber-100 text-amber-800';
        }
        
        return (
          <div className="flex items-center h-full">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${style}`}>
              {label}
            </span>
          </div>
        );
      },
    },
    {
      headerName: 'Aksiyon',
      width: 160,
      pinned: 'right',
      cellRenderer: (params: ICellRendererParams<TradeOffer>) => {
        const off = params.data;
        if (!off) return null;
        return (
          <div className="flex items-center justify-center gap-2 h-full">
            <button
              onClick={() => setSelectedOfferForDetail(off)}
              className="p-1.5 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
              title="İncele / Yazdır"
            >
              <Eye className="w-4 h-4" />
            </button>
            {off.status !== 'CONVERTED' && (
              <button
                onClick={() => handleConvertToInvoice(off.id)}
                className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-lg border border-indigo-200 transition-colors"
              >
                <span>Faturaya Aktar</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      },
    },
  ], []);

  const onGridReady = (params: GridReadyEvent) => {
    setGridApi(params.api);
  };

  const activeOffersCount = offers.filter((o) => o.status === 'SENT').length;
  const pendingCollectionTRY = invoices
    .filter((i) => i.direction === 'SATIS' && i.paymentStatus !== 'PAID')
    .reduce((sum, i) => sum + i.remainingAmount, 0);

  // Teklif Dönüştürme
  const handleConvertToInvoice = (offerId: string) => {
    const created = tradeService.convertOfferToInvoice(offerId);
    if (created) {
      loadData();
      alert(`${created.invoiceNumber} numaralı fatura başarıyla oluşturuldu ve Ödemeler & Tahsilatlar modülüne yansıtıldı!`);
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
    <div className="space-y-6">
      {/* ÜST BAŞLIK VE ŞUBE FİLTRESİ */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold shadow-2xs">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-stone-900 tracking-tight">
                Alışlar & Satışlar
              </h1>

            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Dinamik Ekleme Butonu */}
          <button
            onClick={handlePrimaryActionClick}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{primaryActionLabel}</span>
          </button>
        </div>
      </div>

      {/* KPI METRİK KARTLARI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Satış Cirosu */}
        <div
          onClick={() => setActiveTab('satislar')}
          className={`bg-white p-4 rounded-xl border transition-all cursor-pointer shadow-2xs hover:shadow-md flex items-center justify-between ${
            activeTab === 'satislar' ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20' : 'border-stone-200 hover:border-stone-300'
          }`}
        >
          <div>
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
              Toplam Satış Hacmi
            </span>
            <div className="text-lg font-black text-stone-900 font-mono mt-0.5">
              ₺ {totalSalesTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" /> Faturalandırılmış Satışlar (Tıkla)
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Alış & Satınalma */}
        <div
          onClick={() => setActiveTab('alislar')}
          className={`bg-white p-4 rounded-xl border transition-all cursor-pointer shadow-2xs hover:shadow-md flex items-center justify-between ${
            activeTab === 'alislar' ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20' : 'border-stone-200 hover:border-stone-300'
          }`}
        >
          <div>
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
              Toplam Alış & Satınalma
            </span>
            <div className="text-lg font-black text-stone-900 font-mono mt-0.5">
              ₺ {totalPurchasesTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-stone-500 font-semibold flex items-center gap-1 mt-1">
              <TrendingDown className="w-3 h-3 text-rose-500" /> Mal & Hizmet Alımları (Tıkla)
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        {/* Bekleyen Teklifler */}
        <div
          onClick={() => setActiveTab('verilen-teklifler')}
          className={`bg-white p-4 rounded-xl border transition-all cursor-pointer shadow-2xs hover:shadow-md flex items-center justify-between ${
            activeTab === 'verilen-teklifler' ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20' : 'border-stone-200 hover:border-stone-300'
          }`}
        >
          <div>
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
              Açık / Onay Bekleyen Teklif
            </span>
            <div className="text-lg font-black text-amber-600 font-mono mt-0.5">
              {activeOffersCount} Adet
            </div>
            <span className="text-[10px] text-stone-500 font-semibold flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3" /> Faturaya Dönüşebilir (Tıkla)
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Bekleyen Tahsilat */}
        <div
          onClick={() => setActiveTab('satislar')}
          className="bg-white p-4 rounded-xl border border-stone-200 hover:border-stone-300 transition-all cursor-pointer shadow-2xs hover:shadow-md flex items-center justify-between"
        >
          <div>
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
              Açık Satış Tahsilatı (Bakiye)
            </span>
            <div className="text-lg font-black text-indigo-700 font-mono mt-0.5">
              ₺ {pendingCollectionTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-indigo-500 font-semibold flex items-center gap-1 mt-1">
              <DollarSign className="w-3 h-3" /> Vadesi Takip Edilen
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 4 SEKME VE ARAMA KONTROLÜ */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        {/* TAB MENÜSÜ */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-stone-200 px-4 pt-3 bg-stone-50/70 gap-3">
          <div className="flex gap-1 overflow-x-auto no-scrollbar">
            {/* Sekme 1: Satışlar */}
            <button
              onClick={() => setActiveTab('satislar')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl border-b-2 transition-all shrink-0 ${
                activeTab === 'satislar'
                  ? 'bg-white text-indigo-700 border-indigo-600 shadow-2xs'
                  : 'text-stone-600 border-transparent hover:text-stone-900 hover:bg-stone-100/50'
              }`}
            >
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <span>Satışlar</span>
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-indigo-50 text-indigo-700 font-mono">
                {salesInvoices.length}
              </span>
            </button>

            {/* Sekme 2: Alışlar */}
            <button
              onClick={() => setActiveTab('alislar')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl border-b-2 transition-all shrink-0 ${
                activeTab === 'alislar'
                  ? 'bg-white text-emerald-700 border-emerald-600 shadow-2xs'
                  : 'text-stone-600 border-transparent hover:text-stone-900 hover:bg-stone-100/50'
              }`}
            >
              <ShoppingBag className="w-4 h-4 text-emerald-600" />
              <span>Alışlar</span>
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-50 text-emerald-700 font-mono">
                {purchaseInvoices.length}
              </span>
            </button>

            {/* Sekme 3: Verilen Teklifler */}
            <button
              onClick={() => setActiveTab('verilen-teklifler')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl border-b-2 transition-all shrink-0 ${
                activeTab === 'verilen-teklifler'
                  ? 'bg-white text-blue-700 border-blue-600 shadow-2xs'
                  : 'text-stone-600 border-transparent hover:text-stone-900 hover:bg-stone-100/50'
              }`}
            >
              <Send className="w-4 h-4 text-blue-600" />
              <span>Verilen Teklifler</span>
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-blue-50 text-blue-700 font-mono">
                {givenOffers.length}
              </span>
            </button>

            {/* Sekme 4: Alınan Teklifler */}
            <button
              onClick={() => setActiveTab('alinan-teklifler')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl border-b-2 transition-all shrink-0 ${
                activeTab === 'alinan-teklifler'
                  ? 'bg-white text-amber-700 border-amber-600 shadow-2xs'
                  : 'text-stone-600 border-transparent hover:text-stone-900 hover:bg-stone-100/50'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-amber-600" />
              <span>Alınan Teklifler</span>
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-amber-50 text-amber-700 font-mono">
                {receivedOffers.length}
              </span>
            </button>
          </div>

          {/* Hızlı Arama & Sidebar Toggle */}
          <div className="flex items-center gap-3 pb-2 sm:pb-0">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Fatura, teklif no veya cari ara..."
                className="w-full h-8 pl-8 pr-3 bg-white border border-stone-300 rounded-lg text-xs placeholder:text-stone-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            
            <AgGridSidebarToggleBtn
              isOpen={isSidebarOpen}
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            />
          </div>
        </div>

        {/* AG GRID TABLOSU */}
        <div className="relative flex bg-white overflow-hidden" style={{ height: '560px' }}>
          <div className="flex-1 overflow-hidden h-full">
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
              paginationPageSize={20}
              paginationPageSizeSelector={[10, 20, 50, 100]}
              animateRows={true}
              rowHeight={54}
              headerHeight={42}
              rowSelection={{
                mode: 'singleRow',
                checkboxes: false,
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
      </div>

      {/* MODALLAR */}
      <NewOfferModal
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

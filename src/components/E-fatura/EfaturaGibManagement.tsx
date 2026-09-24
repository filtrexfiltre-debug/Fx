import React, { useState, useEffect, useMemo } from 'react';
import {
  FileCheck2,
  FileText,
  Truck,
  Send,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  ArrowDownToLine,
  Search,
  Plus,
  Building,
  ShieldCheck,
  RefreshCw,
  QrCode,
  AlertTriangle,
  Server,
  FileSpreadsheet,
} from 'lucide-react';
import { GibInvoice, GibDispatch, GibCommercialResponse } from '../../types/trade';
import { tradeService } from '../../services/tradeService';
import { GibInvoiceViewerModal } from './GibInvoiceViewerModal';
import { NewGibDispatchModal } from './NewGibDispatchModal';

export type GibTab = 'gelen-faturalar' | 'giden-faturalar' | 'gelen-irsaliyeler' | 'giden-irsaliyeler';

export const EfaturaGibManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<GibTab>('gelen-faturalar');
  const [searchQuery, setSearchQuery] = useState('');

  const [gibInvoices, setGibInvoices] = useState<GibInvoice[]>([]);
  const [gibDispatches, setGibDispatches] = useState<GibDispatch[]>([]);

  // Modallar
  const [selectedInvoiceForViewer, setSelectedInvoiceForViewer] = useState<GibInvoice | null>(null);
  const [isNewDispatchModalOpen, setIsNewDispatchModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = () => {
    const invs = tradeService.getGibInvoices();
    const disps = tradeService.getGibDispatches();
    setGibInvoices(invs);
    setGibDispatches(disps);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      loadData();
      setIsRefreshing(false);
    }, 600);
  };

  // Filtreler
  const incomingInvoices = useMemo(() => {
    return gibInvoices
      .filter((i) => i.direction === 'INCOMING')
      .filter((i) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          i.invoiceNumber.toLowerCase().includes(q) ||
          i.senderTitle.toLowerCase().includes(q) ||
          i.ettn.toLowerCase().includes(q)
        );
      });
  }, [gibInvoices, searchQuery]);

  const outgoingInvoices = useMemo(() => {
    return gibInvoices
      .filter((i) => i.direction === 'OUTGOING')
      .filter((i) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          i.invoiceNumber.toLowerCase().includes(q) ||
          i.receiverTitle.toLowerCase().includes(q) ||
          i.ettn.toLowerCase().includes(q)
        );
      });
  }, [gibInvoices, searchQuery]);

  const incomingDispatches = useMemo(() => {
    return gibDispatches
      .filter((d) => d.direction === 'INCOMING')
      .filter((d) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          d.dispatchNumber.toLowerCase().includes(q) ||
          d.senderTitle.toLowerCase().includes(q) ||
          d.carrierPlateNumber.toLowerCase().includes(q)
        );
      });
  }, [gibDispatches, searchQuery]);

  const outgoingDispatches = useMemo(() => {
    return gibDispatches
      .filter((d) => d.direction === 'OUTGOING')
      .filter((d) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          d.dispatchNumber.toLowerCase().includes(q) ||
          d.receiverTitle.toLowerCase().includes(q) ||
          d.carrierPlateNumber.toLowerCase().includes(q)
        );
      });
  }, [gibDispatches, searchQuery]);

  // Ticari Fatura Kabul / Red İşlemi
  const handleCommercialResponse = (id: string, response: GibCommercialResponse) => {
    tradeService.respondToGibCommercial(id, response);
    loadData();
    if (selectedInvoiceForViewer && selectedInvoiceForViewer.id === id) {
      const updated = tradeService.getGibInvoices().find((i) => i.id === id);
      setSelectedInvoiceForViewer(updated || null);
    }
  };

  // Sisteme Alış Faturası ve Stok Olarak Aktar
  const handleImportToErp = async (id: string) => {
    const imported = await tradeService.importGibInvoiceToErp(id);
    if (imported) {
      loadData();
      if (selectedInvoiceForViewer && selectedInvoiceForViewer.id === id) {
        const updated = tradeService.getGibInvoices().find((i) => i.id === id);
        setSelectedInvoiceForViewer(updated || null);
      }
      alert(
        `Fatura (${imported.invoiceNumber}) başarıyla Alış Faturası olarak kaydedildi, hammadde stoğu güncellendi ve Ödemeler & Tahsilatlar modülüne borç kaydı işlendi!`
      );
    }
  };

  // Bekleyen 7 Günlük Yanıt Sayısı
  const pendingCommercialCount = incomingInvoices.filter(
    (i) => i.scenario === 'TICARI' && i.commercialResponse === 'PENDING'
  ).length;

  return (
    <div className="space-y-6">
      {/* GİB CANLI ENTEGRATÖR STATÜ BARI */}
      <div className="bg-stone-900 text-white p-5 rounded-2xl border border-stone-800 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight">E-Fatura & GİB Merkezi</h1>
                <span className="flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  GİB Portalı Çevrimiçi (200 OK)
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              className={`flex items-center gap-1.5 px-3 py-2 bg-stone-800 hover:bg-stone-700 text-xs font-semibold text-stone-200 rounded-xl border border-stone-700 transition-colors ${
                isRefreshing ? 'animate-spin' : ''
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              <span>GİB Gelen Kutusunu Senkronize Et</span>
            </button>

            {activeTab === 'giden-irsaliyeler' && (
              <button
                onClick={() => setIsNewDispatchModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white rounded-xl shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Yeni e-İrsaliye Kes</span>
              </button>
            )}
          </div>
        </div>

        {/* ALARM BANDI (EĞER 7 GÜNLÜK BEKLEYEN TİCARİ FATURA VARSA) */}
        {pendingCommercialCount > 0 && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-amber-300 text-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Yasal İtiraz Uyarısı:</strong> Gelen kutunuzda yanıt bekleyen{' '}
                <strong>{pendingCommercialCount} adet Ticari Fatura</strong> bulunmaktadır. 7 gün içerisinde
                itiraz edilmeyen faturalar TTK gereği otomatik kabul edilir!
              </span>
            </div>
            <button
              onClick={() => setActiveTab('gelen-faturalar')}
              className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 rounded-lg text-[11px] font-bold transition-colors"
            >
              Faturaları İncele
            </button>
          </div>
        )}
      </div>

      {/* 4 SEKME VE TABLO PANELİ */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        {/* SEKME BAŞLIKLARI */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-stone-200 px-4 pt-3 bg-stone-50/70 gap-3">
          <div className="flex gap-1 overflow-x-auto no-scrollbar">
            {/* Sekme 1: Gelen E-Faturalar */}
            <button
              onClick={() => setActiveTab('gelen-faturalar')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl border-b-2 transition-all shrink-0 ${
                activeTab === 'gelen-faturalar'
                  ? 'bg-white text-indigo-700 border-indigo-600 shadow-2xs'
                  : 'text-stone-600 border-transparent hover:text-stone-900 hover:bg-stone-100/50'
              }`}
            >
              <ArrowDownToLine className="w-4 h-4 text-indigo-600" />
              <span>Gelen E-Faturalar</span>
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-indigo-50 text-indigo-700 font-mono">
                {incomingInvoices.length}
              </span>
            </button>

            {/* Sekme 2: Giden E-Faturalar */}
            <button
              onClick={() => setActiveTab('giden-faturalar')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl border-b-2 transition-all shrink-0 ${
                activeTab === 'giden-faturalar'
                  ? 'bg-white text-emerald-700 border-emerald-600 shadow-2xs'
                  : 'text-stone-600 border-transparent hover:text-stone-900 hover:bg-stone-100/50'
              }`}
            >
              <Send className="w-4 h-4 text-emerald-600" />
              <span>Giden E-Faturalar</span>
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-50 text-emerald-700 font-mono">
                {outgoingInvoices.length}
              </span>
            </button>

            {/* Sekme 3: Gelen E-İrsaliyeler */}
            <button
              onClick={() => setActiveTab('gelen-irsaliyeler')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl border-b-2 transition-all shrink-0 ${
                activeTab === 'gelen-irsaliyeler'
                  ? 'bg-white text-blue-700 border-blue-600 shadow-2xs'
                  : 'text-stone-600 border-transparent hover:text-stone-900 hover:bg-stone-100/50'
              }`}
            >
              <Truck className="w-4 h-4 text-blue-600" />
              <span>Gelen E-İrsaliyeler</span>
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-blue-50 text-blue-700 font-mono">
                {incomingDispatches.length}
              </span>
            </button>

            {/* Sekme 4: Giden E-İrsaliyeler */}
            <button
              onClick={() => setActiveTab('giden-irsaliyeler')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl border-b-2 transition-all shrink-0 ${
                activeTab === 'giden-irsaliyeler'
                  ? 'bg-white text-amber-700 border-amber-600 shadow-2xs'
                  : 'text-stone-600 border-transparent hover:text-stone-900 hover:bg-stone-100/50'
              }`}
            >
              <Truck className="w-4 h-4 text-amber-600" />
              <span>Giden E-İrsaliyeler</span>
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-amber-50 text-amber-700 font-mono">
                {outgoingDispatches.length}
              </span>
            </button>
          </div>

          {/* Arama Kutusu */}
          <div className="relative pb-2 sm:pb-0 w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Fatura No, VKN veya ETTN ara..."
              className="w-full h-8 pl-8 pr-3 bg-white border border-stone-300 rounded-lg text-xs placeholder:text-stone-400 focus:outline-hidden"
            />
          </div>
        </div>

        {/* TAB 1: GELEN E-FATURALAR TABLOSU */}
        {activeTab === 'gelen-faturalar' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-stone-100 text-stone-700 border-b border-stone-200 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3.5">Fatura No & ETTN</th>
                  <th className="p-3.5">Gönderen (Tedarikçi Firma)</th>
                  <th className="p-3.5">Fatura Tarihi</th>
                  <th className="p-3.5 text-right">Ödenecek Tutar</th>
                  <th className="p-3.5 text-center">Senaryo / İtiraz Süresi</th>
                  <th className="p-3.5 text-center">ERP Aktarım</th>
                  <th className="p-3.5 text-center">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 bg-white">
                {incomingInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="p-3.5">
                      <div className="font-mono font-bold text-stone-900">{inv.invoiceNumber}</div>
                      <div className="text-[10px] text-stone-400 font-mono break-all max-w-[200px]">
                        {inv.ettn}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-stone-900">{inv.senderTitle}</div>
                      <div className="text-[10px] text-stone-500 font-mono">VKN: {inv.senderVkn}</div>
                    </td>
                    <td className="p-3.5 font-medium text-stone-600">{inv.issueDate}</td>
                    <td className="p-3.5 text-right font-mono font-bold text-stone-900 text-xs">
                      {inv.totalPayable.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}{' '}
                      {inv.currency}
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="inline-block text-left">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 block text-center mb-0.5">
                          {inv.scenario}
                        </span>
                        {inv.scenario === 'TICARI' && (
                          <div className="text-[10px] text-stone-500 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Son: {inv.commercialDeadline.slice(0, 10)}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5 text-center">
                      {inv.isImportedToErp ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <CheckCircle className="w-3 h-3" /> Stoğa & Alışa Aktarıldı
                        </span>
                      ) : (
                        <button
                          onClick={() => handleImportToErp(inv.id)}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md border border-indigo-200 transition-colors"
                        >
                          <ArrowDownToLine className="w-3 h-3" />
                          <span>Stoğa Aktar</span>
                        </button>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedInvoiceForViewer(inv)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors title='Resmi XSLT Fatura Görüntüle'"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {inv.scenario === 'TICARI' && inv.commercialResponse === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleCommercialResponse(inv.id, 'ACCEPTED')}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md title='Kabul Et'"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleCommercialResponse(inv.id, 'REJECTED')}
                              className="p-1 text-rose-600 hover:bg-rose-50 rounded-md title='Reddet'"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: GİDEN E-FATURALAR TABLOSU */}
        {activeTab === 'giden-faturalar' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-stone-100 text-stone-700 border-b border-stone-200 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3.5">Fatura No & ETTN</th>
                  <th className="p-3.5">Alıcı Müşteri</th>
                  <th className="p-3.5">Düzenleme Tarihi</th>
                  <th className="p-3.5 text-right">Ödenecek Tutar</th>
                  <th className="p-3.5 text-center">Senaryo / Zarf Durumu</th>
                  <th className="p-3.5 text-center">GİB Onay Kodu</th>
                  <th className="p-3.5 text-center">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 bg-white">
                {outgoingInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="p-3.5">
                      <div className="font-mono font-bold text-stone-900">{inv.invoiceNumber}</div>
                      <div className="text-[10px] text-stone-400 font-mono break-all max-w-[200px]">
                        {inv.ettn}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-stone-900">{inv.receiverTitle}</div>
                      <div className="text-[10px] text-stone-500 font-mono">VKN: {inv.receiverVkn}</div>
                    </td>
                    <td className="p-3.5 font-medium text-stone-600">{inv.issueDate}</td>
                    <td className="p-3.5 text-right font-mono font-bold text-stone-900 text-xs">
                      {inv.totalPayable.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}{' '}
                      {inv.currency}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700">
                        {inv.scenario}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <CheckCircle className="w-3 h-3" /> 1200 Başarılı
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => setSelectedInvoiceForViewer(inv)}
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: GELEN E-İRSALİYELER TABLOSU */}
        {activeTab === 'gelen-irsaliyeler' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-stone-100 text-stone-700 border-b border-stone-200 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3.5">İrsaliye No</th>
                  <th className="p-3.5">Gönderen Firma</th>
                  <th className="p-3.5">Fiili Sevk Tarihi & Saati</th>
                  <th className="p-3.5">Taşıyıcı & Araç Plakası</th>
                  <th className="p-3.5">Sürücü (Şoför) Bilgisi</th>
                  <th className="p-3.5 text-center">Sevk Kalemi</th>
                  <th className="p-3.5 text-center">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 bg-white">
                {incomingDispatches.map((disp) => (
                  <tr key={disp.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-stone-900">{disp.dispatchNumber}</td>
                    <td className="p-3.5">
                      <div className="font-semibold text-stone-900">{disp.senderTitle}</div>
                      <div className="text-[10px] text-stone-500 font-mono">VKN: {disp.senderVkn}</div>
                    </td>
                    <td className="p-3.5 font-medium text-stone-700">
                      {disp.despatchDate} <span className="font-mono text-stone-500">({disp.despatchTime})</span>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-stone-900 font-mono">{disp.carrierPlateNumber}</div>
                      <div className="text-[10px] text-stone-500">{disp.carrierTitle || 'Taşıyıcı'}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-medium text-stone-900">{disp.driverName}</div>
                      <div className="text-[10px] text-stone-400 font-mono">TCKN: {disp.driverIdNumber}</div>
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                        {disp.items.length} Kalem Malzeme
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        <CheckCircle className="w-3 h-3" /> Teslim Alındı
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 4: GİDEN E-İRSALİYELER TABLOSU */}
        {activeTab === 'giden-irsaliyeler' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-stone-100 text-stone-700 border-b border-stone-200 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3.5">İrsaliye No</th>
                  <th className="p-3.5">Alıcı Müşteri & Teslim Yeri</th>
                  <th className="p-3.5">Fiili Sevk Zamanı</th>
                  <th className="p-3.5">Çekici / Araç Plakası</th>
                  <th className="p-3.5">Sürücü TCKN & İsim</th>
                  <th className="p-3.5 text-center">GİB Durumu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 bg-white">
                {outgoingDispatches.map((disp) => (
                  <tr key={disp.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-stone-900">{disp.dispatchNumber}</td>
                    <td className="p-3.5">
                      <div className="font-semibold text-stone-900">{disp.receiverTitle}</div>
                      <div className="text-[10px] text-stone-500 truncate max-w-[220px]">
                        {disp.deliveryAddress}
                      </div>
                    </td>
                    <td className="p-3.5 font-medium text-stone-700">
                      {disp.despatchDate} <span className="font-mono text-stone-500 font-bold">({disp.despatchTime})</span>
                    </td>
                    <td className="p-3.5 font-mono font-bold text-stone-900">
                      {disp.carrierPlateNumber}
                    </td>
                    <td className="p-3.5">
                      <div className="font-medium text-stone-900">{disp.driverName}</div>
                      <div className="text-[10px] text-stone-400 font-mono">TCKN: {disp.driverIdNumber}</div>
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                        <CheckCircle className="w-3 h-3" /> GİB İletildi (1200)
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODALLAR */}
      <GibInvoiceViewerModal
        isOpen={!!selectedInvoiceForViewer}
        onClose={() => setSelectedInvoiceForViewer(null)}
        invoice={selectedInvoiceForViewer}
        onAccept={(id) => handleCommercialResponse(id, 'ACCEPTED')}
        onReject={(id) => handleCommercialResponse(id, 'REJECTED')}
        onImportToErp={handleImportToErp}
      />

      <NewGibDispatchModal
        isOpen={isNewDispatchModalOpen}
        onClose={() => setIsNewDispatchModalOpen(false)}
        onSuccess={() => {
          loadData();
          alert('Yeni resmi e-İrsaliye başarıyla GİB sistemine iletildi!');
        }}
      />
    </div>
  );
};

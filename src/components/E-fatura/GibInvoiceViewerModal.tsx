import React from 'react';
import {
  X,
  Printer,
  ShieldCheck,
  QrCode,
  Building,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  FileDown,
  ArrowDownToLine,
  AlertTriangle,
} from 'lucide-react';
import { GibInvoice } from '../../types/trade';

interface GibInvoiceViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: GibInvoice | null;
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  onImportToErp?: (id: string) => void;
}

export const GibInvoiceViewerModal: React.FC<GibInvoiceViewerModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onAccept,
  onReject,
  onImportToErp,
}) => {
  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-stone-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-stone-300 overflow-hidden my-auto max-h-[96vh] flex flex-col">
        {/* ENTEGRATÖR KONTROL BARI */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-stone-200 bg-stone-900 text-white">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold tracking-wide">GİB E-FATURA RESMİ GÖRÜNTÜLEYİCİ (UBL-TR 1.2)</span>
            <span className="text-stone-400">|</span>
            <span className="font-mono text-stone-300 text-[11px]">{invoice.ettn}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium rounded-lg transition-colors border border-stone-700"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Yazdır / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* RESMİ E-FATURA KAĞIDI (A4 STANDARDINDA) */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-stone-100/60 font-sans">
          <div className="bg-white border-2 border-stone-800 rounded-xl p-6 sm:p-8 shadow-sm space-y-6 max-w-3xl mx-auto">
            {/* 1. BAŞLIK VE LOGO BÖLÜMÜ */}
            <div className="grid grid-cols-3 items-center border-b-2 border-stone-800 pb-5">
              {/* Sol: Karekod & ETTN */}
              <div className="space-y-1">
                <div className="w-20 h-20 bg-stone-50 border border-stone-300 rounded-lg flex flex-col items-center justify-center text-stone-700 p-1">
                  <QrCode className="w-14 h-14" />
                  <span className="text-[8px] font-mono">KAREKOD</span>
                </div>
                <div className="text-[9px] text-stone-500 font-mono break-all max-w-[160px]">
                  ETTN: {invoice.ettn}
                </div>
              </div>

              {/* Orta: GİB E-FATURA LOGO / BAŞLIK */}
              <div className="text-center">
                <div className="inline-block border border-red-600 px-3 py-1 rounded bg-red-50 text-red-700 text-[11px] font-black tracking-widest uppercase mb-1">
                  e-Fatura
                </div>
                <h1 className="text-sm font-extrabold text-stone-900 tracking-tight">
                  T.C. GELİR İDARESİ BAŞKANLIĞI
                </h1>
                <p className="text-[10px] text-stone-600 font-serif italic">
                  Elektronik Fatura Tebliği Uyarınca Düzenlenmiştir
                </p>
              </div>

              {/* Sağ: Fatura No ve Tarih */}
              <div className="text-right space-y-1 text-xs">
                <div>
                  <span className="text-stone-500 block text-[10px]">Fatura No:</span>
                  <span className="font-mono font-black text-stone-900 text-sm">
                    {invoice.invoiceNumber}
                  </span>
                </div>
                <div>
                  <span className="text-stone-500 block text-[10px]">Düzenleme Tarihi:</span>
                  <span className="font-mono font-bold text-stone-800">{invoice.issueDate}</span>
                </div>
                <div>
                  <span className="text-stone-500 block text-[10px]">Senaryo & Tip:</span>
                  <span className="font-bold text-stone-900">
                    {invoice.scenario} / {invoice.invoiceType}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. SATICI VE ALICI KUTULARI */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Satıcı (Gönderen) */}
              <div className="border border-stone-300 rounded-lg p-3 bg-stone-50/50 space-y-1">
                <div className="text-[10px] font-black text-stone-500 uppercase tracking-wider">
                  SATICI / GÖNDEREN
                </div>
                <div className="font-bold text-stone-900 leading-snug">{invoice.senderTitle}</div>
                <div className="text-stone-700">
                  VKN/TCKN: <span className="font-mono font-bold">{invoice.senderVkn}</span>
                </div>
                {invoice.senderTaxOffice && (
                  <div className="text-stone-600">Vergi Dairesi: {invoice.senderTaxOffice}</div>
                )}
                <div className="text-stone-600 text-[11px] leading-tight">
                  {invoice.senderAddress || 'Adres bilgisi mevcuttur.'}
                </div>
              </div>

              {/* Alıcı (Müşteri) */}
              <div className="border border-stone-300 rounded-lg p-3 bg-stone-50/50 space-y-1">
                <div className="text-[10px] font-black text-stone-500 uppercase tracking-wider">
                  ALICI / MÜŞTERİ
                </div>
                <div className="font-bold text-stone-900 leading-snug">{invoice.receiverTitle}</div>
                <div className="text-stone-700">
                  VKN/TCKN: <span className="font-mono font-bold">{invoice.receiverVkn}</span>
                </div>
                {invoice.receiverTaxOffice && (
                  <div className="text-stone-600">Vergi Dairesi: {invoice.receiverTaxOffice}</div>
                )}
                <div className="text-stone-600 text-[11px] leading-tight">
                  {invoice.receiverAddress || 'Büyükdere Cad. No:199 Levent / İstanbul'}
                </div>
              </div>
            </div>

            {/* 3. MAL VE HİZMET KALEMLERİ TABLOSU */}
            <div className="border border-stone-800 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-stone-200 text-stone-800 border-b border-stone-800 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-2 w-8 text-center border-r border-stone-400">#</th>
                    <th className="p-2 border-r border-stone-400">Mal / Hizmet Açıklaması</th>
                    <th className="p-2 w-20 text-center border-r border-stone-400">Miktar</th>
                    <th className="p-2 w-24 text-right border-r border-stone-400">Birim Fiyat</th>
                    <th className="p-2 w-16 text-center border-r border-stone-400">KDV Oranı</th>
                    <th className="p-2 w-24 text-right border-r border-stone-400">KDV Tutarı</th>
                    <th className="p-2 w-28 text-right">Mal Hizmet Tutarı</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-300">
                  {invoice.items.map((item, idx) => (
                    <tr key={item.id} className="text-[11px]">
                      <td className="p-2 text-center font-mono border-r border-stone-300">{idx + 1}</td>
                      <td className="p-2 border-r border-stone-300">
                        <span className="font-medium text-stone-900">{item.productName}</span>
                        {item.skuCode && (
                          <span className="block text-[10px] text-stone-500 font-mono">
                            Kod: {item.skuCode}
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-center font-mono border-r border-stone-300">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="p-2 text-right font-mono border-r border-stone-300">
                        {item.unitPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2 text-center font-mono border-r border-stone-300">
                        %{item.vatRate}
                      </td>
                      <td className="p-2 text-right font-mono border-r border-stone-300">
                        {item.taxAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2 text-right font-mono font-bold text-stone-900">
                        {item.taxExclusiveAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 4. VERGİ DAĞILIMI VE GENEL TOPLAM */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
              {/* Sol: Yasal Açıklama ve Notlar */}
              <div className="space-y-2">
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg text-[10px] text-stone-600 leading-relaxed">
                  <span className="font-bold text-stone-800 block mb-0.5">Yasal Bilgilendirme:</span>
                  Bu fatura muhteviyatına 6102 sayılı Türk Ticaret Kanunu'nun 18. maddesi uyarınca 8 gün
                  içerisinde itiraz edilmediği takdirde kabul edilmiş sayılır.
                </div>
                {invoice.notes && (
                  <div className="text-[11px] text-stone-700 italic">Not: {invoice.notes}</div>
                )}
              </div>

              {/* Sağ: Rakamlar */}
              <div className="border border-stone-300 rounded-lg p-3 bg-stone-50/70 space-y-2">
                <div className="flex justify-between text-stone-600">
                  <span>Mal / Hizmet Toplam Tutarı:</span>
                  <span className="font-mono font-bold">
                    {invoice.taxExclusiveAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}{' '}
                    {invoice.currency}
                  </span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Hesaplanan KDV (%20):</span>
                  <span className="font-mono font-bold">
                    {invoice.taxTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}{' '}
                    {invoice.currency}
                  </span>
                </div>
                <div className="h-px bg-stone-400 my-1" />
                <div className="flex justify-between text-sm font-black text-stone-900">
                  <span>Ödenecek Tutar:</span>
                  <span className="font-mono text-stone-900">
                    {invoice.totalPayable.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}{' '}
                    {invoice.currency}
                  </span>
                </div>
              </div>
            </div>

            {/* 5. MALİ MÜHÜR VE ELEKTRONİK İMZA ALANI */}
            <div className="border-t border-dashed border-stone-400 pt-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-stone-500 gap-2">
              <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                <ShieldCheck className="w-4 h-4" />
                <span>Mali Mühür / Nitelikli Elektronik Sertifika (NES) ile İmzalanmıştır.</span>
              </div>
              <div className="font-mono text-[10px]">GİB Durum Kodu: {invoice.gibStatusCode}</div>
            </div>
          </div>
        </div>

        {/* EĞER GELEN TİCARİ FATURA İSE: RESMİ 7 GÜNLÜK İTİRAZ VE AKTARIM PANELİ */}
        {invoice.direction === 'INCOMING' && (
          <div className="p-4 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-stone-900">
                  Ticari Fatura 7 Günlük Yasal Yanıt Süresi
                </div>
                <div className="text-[11px] text-stone-500">
                  Son İtiraz Tarihi: <span className="font-mono font-semibold text-stone-800">{invoice.commercialDeadline}</span>
                  {' '}— Mevcut Durum:{' '}
                  <span
                    className={`font-bold ${
                      invoice.commercialResponse === 'ACCEPTED'
                        ? 'text-emerald-700'
                        : invoice.commercialResponse === 'REJECTED'
                        ? 'text-rose-700'
                        : 'text-amber-700'
                    }`}
                  >
                    {invoice.commercialResponse === 'ACCEPTED'
                      ? 'Kabul Edildi'
                      : invoice.commercialResponse === 'REJECTED'
                      ? 'Reddedildi'
                      : 'Yanıt Bekliyor'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {invoice.commercialResponse === 'PENDING' && onAccept && onReject && (
                <>
                  <button
                    onClick={() => onReject(invoice.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-lg transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Ticari Red</span>
                  </button>
                  <button
                    onClick={() => onAccept(invoice.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Ticari Kabul</span>
                  </button>
                </>
              )}

              {!invoice.isImportedToErp && onImportToErp && (
                <button
                  onClick={() => onImportToErp(invoice.id)}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                >
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                  <span>Alış Faturası & Stoğa Aktar</span>
                </button>
              )}

              {invoice.isImportedToErp && (
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Sisteme Aktarıldı</span>
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

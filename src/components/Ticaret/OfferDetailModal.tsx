import React from 'react';
import {
  X,
  Printer,
  FileCheck,
  Send,
  Calendar,
  Building2,
  Phone,
  Mail,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  MapPin,
} from 'lucide-react';
import { TradeOffer } from '../../types/trade';

interface OfferDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  offer: TradeOffer | null;
  onConvertToInvoice: (offerId: string) => void;
}

export const OfferDetailModal: React.FC<OfferDetailModalProps> = ({
  isOpen,
  onClose,
  offer,
  onConvertToInvoice,
}) => {
  if (!isOpen || !offer) return null;

  const handlePrint = () => {
    window.print();
  };

  const isExpired = new Date(offer.validUntilDate) < new Date();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-auto max-h-[95vh] flex flex-col">
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-stone-900">{offer.offerNumber}</h2>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                    offer.status === 'CONVERTED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : offer.status === 'ACCEPTED'
                      ? 'bg-blue-100 text-blue-800'
                      : offer.status === 'REJECTED'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {offer.status === 'CONVERTED'
                    ? 'Faturaya Dönüştürüldü'
                    : offer.status === 'ACCEPTED'
                    ? 'Kabul Edildi'
                    : offer.status === 'REJECTED'
                    ? 'Reddedildi'
                    : isExpired
                    ? 'Süresi Doldu'
                    : 'Teklif Gönderildi'}
                </span>
              </div>
              <p className="text-xs text-stone-500">
                {offer.offerType === 'VERILEN' ? 'Müşteriye Verilen Satış Teklifi' : 'Tedarikçiden Alınan Alış Teklifi'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-700 bg-white hover:bg-stone-100 border border-stone-300 rounded-lg shadow-2xs transition-colors"
            >
              <Printer className="w-4 h-4 text-stone-600" />
              <span>Yazdır / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TEKLİF ÜST BİLGİ KARTLARI */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Firma Bilgisi */}
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block mb-1">
                {offer.offerType === 'VERILEN' ? 'Teklif Verilen Müşteri' : 'Teklif Alınan Tedarikçi'}
              </span>
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>{offer.contactTitle}</span>
              </h3>
              {(offer.contactTaxNumber || offer.contactTcNumber) && (
                <p className="text-xs text-stone-600 mt-1">
                  {offer.contactTaxNumber ? `VKN: ${offer.contactTaxNumber}` : `TCKN: ${offer.contactTcNumber}`}
                  {offer.contactTaxOffice && ` (${offer.contactTaxOffice})`}
                </p>
              )}
              {offer.contactAddress && (
                <p className="text-xs text-stone-600 mt-1 flex items-start gap-1">
                  <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                  <span>{offer.contactAddress}</span>
                </p>
              )}
              <div className="mt-2 text-xs text-stone-500 space-y-0.5">
                {offer.contactPhone && (
                  <p className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-stone-400" /> {offer.contactPhone}
                  </p>
                )}
                {offer.contactEmail && (
                  <p className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-stone-400" /> {offer.contactEmail}
                  </p>
                )}
              </div>
            </div>

            {/* Tarih ve Koşullar */}
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-stone-500 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Düzenleme Tarihi:
                </span>
                <span className="font-bold text-stone-900">{offer.issueDate}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-stone-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" /> Opsiyon Bitiş Tarihi:
                </span>
                <span className={`font-bold ${isExpired ? 'text-rose-600' : 'text-amber-700'}`}>
                  {offer.validUntilDate} {isExpired ? '(Süresi Doldu)' : ''}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-stone-500">Ödeme Koşulu:</span>
                <span className="font-medium text-stone-800">{offer.paymentTerms}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-stone-500">Teslimat Şekli:</span>
                <span className="font-medium text-stone-800">{offer.deliveryTerms}</span>
              </div>
            </div>
          </div>

          {/* KALEMLER TABLOSU */}
          <div className="border border-stone-200 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-stone-100 text-stone-700 border-b border-stone-200 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3 w-8">#</th>
                  <th className="p-3">Ürün / Hizmet Kalemi</th>
                  <th className="p-3 w-20 text-center">Miktar</th>
                  <th className="p-3 w-24 text-right">Birim Fiyat</th>
                  <th className="p-3 w-16 text-center">İsk.</th>
                  <th className="p-3 w-16 text-center">KDV</th>
                  <th className="p-3 w-32 text-right">Tutar ({offer.currency})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 bg-white">
                {offer.items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-stone-50/60">
                    <td className="p-3 text-stone-400 font-mono text-[11px]">{idx + 1}</td>
                    <td className="p-3">
                      <div className="font-semibold text-stone-900">{item.productName}</div>
                      {item.skuCode && <div className="text-[10px] text-stone-400 font-mono">{item.skuCode}</div>}
                    </td>
                    <td className="p-3 text-center font-mono font-medium">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="p-3 text-right font-mono text-stone-700">
                      {item.unitPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-center font-mono text-stone-500">
                      {item.discountPercent > 0 ? `%${item.discountPercent}` : '-'}
                    </td>
                    <td className="p-3 text-center font-mono text-stone-500">%{item.vatRate}</td>
                    <td className="p-3 text-right font-mono font-bold text-stone-900">
                      {item.lineTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* NOTLAR VE TOPLAM ÖZETİ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">
                Teklif Açıklaması & Notlar
              </span>
              <p className="text-xs text-stone-700 whitespace-pre-line">
                {offer.notes || 'Herhangi bir özel not belirtilmemiştir.'}
              </p>
            </div>

            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Ara Toplam (KDV Hariç):</span>
                <span className="font-mono font-bold">
                  {offer.subtotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {offer.currency}
                </span>
              </div>
              {offer.discountTotal > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Toplam İskonto:</span>
                  <span className="font-mono font-bold">
                    -{offer.discountTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {offer.currency}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-stone-600">
                <span>Hesaplanan KDV:</span>
                <span className="font-mono font-bold">
                  {offer.vatTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {offer.currency}
                </span>
              </div>
              <div className="h-px bg-stone-300 my-1" />
              <div className="flex justify-between text-sm font-black text-stone-900">
                <span>Genel Toplam:</span>
                <span className="font-mono text-indigo-700">
                  {offer.grandTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {offer.currency}
                </span>
              </div>
              {offer.currency !== 'TRY' && (
                <div className="flex justify-between text-[11px] font-bold text-stone-500">
                  <span>TL Karşılığı:</span>
                  <span className="font-mono text-stone-800">
                    ₺ {offer.grandTotalTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-stone-200 bg-stone-50">
          <div>
            {offer.status === 'CONVERTED' ? (
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
                <span>Bu teklif {offer.convertedInvoiceNumber} nolu faturaya dönüştürülmüştür.</span>
              </span>
            ) : (
              <span className="text-xs text-stone-500">
                Teklifi onaylayarak anında resmi faturaya aktarabilirsiniz.
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-200/70 rounded-lg transition-colors"
            >
              Kapat
            </button>
            {offer.status !== 'CONVERTED' && (
              <button
                onClick={() => {
                  onConvertToInvoice(offer.id);
                  onClose();
                }}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
              >
                <span>{offer.offerType === 'VERILEN' ? 'Satış Faturasına Dönüştür' : 'Alış Faturasına Dönüştür'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

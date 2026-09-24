import React, { useRef } from 'react';
import {
  X,
  Printer,
  Download,
  Building2,
  Calendar,
  CreditCard,
  FileText,
  CheckCircle2,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';
import { RevenueExpenseItem, Tenant } from '../../types/fx';
import { CURRENT_TENANT } from '../../data/mockData';

interface GelirGiderMakbuzModalProps {
  item: RevenueExpenseItem | null;
  onClose: () => void;
}

export const GelirGiderMakbuzModal: React.FC<GelirGiderMakbuzModalProps> = ({ item, onClose }) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!item) return null;

  const handlePrint = () => {
    window.print();
  };

  const isIncome = item.type === 'GELIR';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-stone-300 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* ÜST ARAÇ ÇUBUĞU */}
        <div className="px-5 py-3 border-b border-stone-200 bg-stone-50 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                isIncome ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}
            >
              {isIncome ? 'RESMİ GELİR / TAHSİL FİŞİ' : 'RESMİ GİDER / TEDİYE MAKBUZU'}
            </span>
            <span className="text-xs font-mono text-stone-500">{item.itemCode}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Yazdır / PDF Kaydet</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* YAZDIRILABİLİR FİŞ GÖVDESİ */}
        <div ref={printRef} className="flex-1 overflow-y-auto p-6 sm:p-8 bg-white text-stone-800 space-y-6">
          
          {/* FİRMA BİLGİSİ VE FİŞ BAŞLIĞI */}
          <div className="border-b-2 border-stone-800 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-700 text-white flex items-center justify-center font-black text-sm">
                  FX
                </div>
                <h1 className="text-base font-bold text-stone-900 tracking-tight">{CURRENT_TENANT.name}</h1>
              </div>
              <p className="text-xs text-stone-500 mt-1">
                VKN: {CURRENT_TENANT.taxNumber} &bull; {CURRENT_TENANT.taxOffice}
              </p>
              <p className="text-[11px] text-stone-400">
                Ticaret Sicil No: {CURRENT_TENANT.tradeRegisterNumber} &bull; MERSİS: {CURRENT_TENANT.mersisNumber}
              </p>
              <p className="text-xs text-indigo-700 font-semibold mt-1">
                Düzenleyen Şube: {item.branchName || 'Merkez Şube'}
              </p>
            </div>

            <div className="text-left sm:text-right">
              <div
                className={`inline-block px-3 py-1 rounded text-xs font-black tracking-wider ${
                  isIncome ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-rose-100 text-rose-900 border border-rose-300'
                }`}
              >
                {isIncome ? 'MUHASEBE TAHSİL FİŞİ' : 'MUHASEBE TEDİYE FİŞİ'}
              </div>
              <div className="text-xs font-mono text-stone-600 mt-1">Fiş No: <strong>{item.itemCode}</strong></div>
              <div className="text-xs font-mono text-stone-600">Belge No: <strong>{item.documentNumber}</strong></div>
              <div className="text-xs text-stone-500 mt-0.5">Tarih: {item.transactionDate}</div>
            </div>
          </div>

          {/* İŞLEM DETAYLARI TABLOSU */}
          <div className="border border-stone-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <tbody>
                <tr className="border-b border-stone-100 bg-stone-50">
                  <td className="px-4 py-2.5 font-semibold text-stone-600 w-1/3">İşlem Başlığı:</td>
                  <td className="px-4 py-2.5 font-bold text-stone-900">{item.title}</td>
                </tr>
                <tr className="border-b border-stone-100">
                  <td className="px-4 py-2.5 font-semibold text-stone-600">Muhasebe Kategorisi:</td>
                  <td className="px-4 py-2.5 text-stone-800">{item.category}</td>
                </tr>
                {item.accountingCode && (
                  <tr className="border-b border-stone-100 bg-stone-50">
                    <td className="px-4 py-2.5 font-semibold text-stone-600">TDHP Hesap Kodu:</td>
                    <td className="px-4 py-2.5 font-mono text-indigo-700 font-bold">{item.accountingCode}</td>
                  </tr>
                )}
                {item.contactTitle && (
                  <tr className="border-b border-stone-100">
                    <td className="px-4 py-2.5 font-semibold text-stone-600">İlişkili Cari Ünvanı:</td>
                    <td className="px-4 py-2.5 text-stone-800 font-medium">
                      {item.contactTitle} {item.contactCode ? `(${item.contactCode})` : ''}
                    </td>
                  </tr>
                )}
                <tr className="border-b border-stone-100 bg-stone-50">
                  <td className="px-4 py-2.5 font-semibold text-stone-600">Ödeme / Tahsil Kanalı:</td>
                  <td className="px-4 py-2.5 text-stone-800">{item.cashBankName || 'Nakit Kasa / Banka Hesabı'}</td>
                </tr>
                <tr className="border-b border-stone-100">
                  <td className="px-4 py-2.5 font-semibold text-stone-600">Ödeme Durumu & Yöntemi:</td>
                  <td className="px-4 py-2.5">
                    <span className="font-semibold text-emerald-700">{item.paymentStatus === 'PAID' ? 'Ödendi / Tahsil Edildi' : 'Beklemede'}</span>
                    <span className="text-stone-400 mx-1.5">&bull;</span>
                    <span className="text-stone-600 font-medium">{item.paymentMethod}</span>
                  </td>
                </tr>
                {item.description && (
                  <tr className="bg-stone-50">
                    <td className="px-4 py-2.5 font-semibold text-stone-600">Açıklama / İzah:</td>
                    <td className="px-4 py-2.5 text-stone-600 italic">{item.description}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* TUTAR VE VERGİ DAĞILIMI */}
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-xs text-stone-600">
              <span>Matrah (KDV Hariç Tutar):</span>
              <span className="font-mono font-medium">₺{item.baseAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="flex justify-between text-xs text-stone-600">
              <span>Hesaplanan KDV (%{item.vatRate}):</span>
              <span className="font-mono font-medium">₺{item.vatAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
            </div>

            {item.stoppageAmount && item.stoppageAmount > 0 && (
              <div className="flex justify-between text-xs text-amber-700">
                <span>Stopaj Kesintisi (%{item.stoppageRate}):</span>
                <span className="font-mono font-medium">-₺{item.stoppageAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
              </div>
            )}

            {item.withholdingAmount && item.withholdingAmount > 0 && (
              <div className="flex justify-between text-xs text-indigo-700">
                <span>KDV Tevkifat Kesintisi:</span>
                <span className="font-mono font-medium">-₺{item.withholdingAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
              </div>
            )}

            {item.isKKEG && (
              <div className="flex justify-between text-xs text-rose-700 font-semibold bg-rose-50 p-1.5 rounded">
                <span>Kanunen Kabul Edilmeyen Gider (KKEG):</span>
                <span className="font-mono">₺{(item.kkegAmount || item.grandTotal).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
              </div>
            )}

            <div className="border-t-2 border-stone-300 pt-2 flex justify-between items-center text-sm font-bold text-stone-900">
              <span className="uppercase">{isIncome ? 'Net Tahsil Edilen Tutar:' : 'Net Ödenen Tutar:'}</span>
              <span className="font-mono text-base font-black text-indigo-900">
                ₺{item.grandTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* İMZA VE ONAY ALANLARI */}
          <div className="grid grid-cols-3 gap-4 pt-6 text-center text-xs text-stone-600">
            <div className="p-3 border border-dashed border-stone-300 rounded-lg min-h-[90px] flex flex-col justify-between">
              <span className="font-semibold text-stone-800">Düzenleyen</span>
              <div className="text-[10px] text-stone-400">{item.createdByUser || 'Muhasebe Yetkilisi'}</div>
              <div className="border-t border-stone-300 pt-1 text-[9px] text-stone-400">İmza</div>
            </div>

            <div className="p-3 border border-dashed border-stone-300 rounded-lg min-h-[90px] flex flex-col justify-between">
              <span className="font-semibold text-stone-800">Mali Müşavir / Onay</span>
              <div className="text-[10px] text-stone-400">Şube Müdürü</div>
              <div className="border-t border-stone-300 pt-1 text-[9px] text-stone-400">İmza / Kaşe</div>
            </div>

            <div className="p-3 border border-dashed border-stone-300 rounded-lg min-h-[90px] flex flex-col justify-between">
              <span className="font-semibold text-stone-800">Teslim Alan / Eden</span>
              <div className="text-[10px] text-stone-400">{item.contactTitle || 'İlgili Şahıs'}</div>
              <div className="border-t border-stone-300 pt-1 text-[9px] text-stone-400">İmza</div>
            </div>
          </div>

          <div className="text-[10px] text-stone-400 text-center font-mono">
            Bu belge 213 Sayılı Vergi Usul Kanunu ve Türk Ticaret Kanunu hükümleri uyarınca FX Enterprise ERP sistemi üzerinden elektronik olarak tanzim edilmiştir.
          </div>
        </div>
      </div>
    </div>
  );
};

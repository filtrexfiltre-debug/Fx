import React from 'react';
import {
  X,
  Printer,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  Building,
  CreditCard,
  FileText,
  Clock,
  Phone,
  Hash,
  Coins,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
} from 'lucide-react';
import { DebtCreditItem } from '../../types/fx';

interface DebtCreditDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: DebtCreditItem | null;
  onOpenPaymentModal: (item: DebtCreditItem) => void;
  onDelete: (id: string) => void;
}

export const DebtCreditDetailModal: React.FC<DebtCreditDetailModalProps> = ({
  isOpen,
  onClose,
  item,
  onOpenPaymentModal,
  onDelete,
}) => {
  if (!isOpen || !item) return null;

  const isAlacak = item.type === 'ALACAK';
  const percentPaid = item.totalAmount > 0 ? Math.min(100, Math.round((item.paidAmount / item.totalAmount) * 100)) : 0;

  const handlePrint = () => {
    window.print();
  };

  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = item.dueDate && item.dueDate < today && item.remainingAmount > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white">
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden my-6 print:shadow-none print:border-none print:m-0">
        {/* Başlık Barı (Ekranda görünür, yazdırmada sadeleşir) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50 print:bg-white print:border-b-2">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-xs print:border ${
                isAlacak ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
              }`}
            >
              {isAlacak ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm px-2 py-0.5 rounded-md bg-stone-200 text-stone-800">
                  {item.itemCode}
                </span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                    isAlacak ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {isAlacak ? 'MÜŞTERİ ALACAĞI' : 'TEDARİKÇİ BORCU'}
                </span>
              </div>
              <h2 className="text-base font-bold text-stone-900 mt-1">{item.contactTitle}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Yazdır / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Gövde */}
        <div className="p-6 space-y-6">
          {/* Durum & İlerleme Çubuğu */}
          <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-stone-700">Tahsilat / Ödeme Durumu</span>
              <span className="font-bold font-mono text-stone-900">%{percentPaid} Tamamlandı</span>
            </div>
            {/* Progress bar */}
            <div className="w-full h-2.5 bg-stone-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  isAlacak ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
                style={{ width: `${percentPaid}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 text-center pt-2">
              <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                <span className="text-[11px] text-stone-500 block">Toplam Tutar</span>
                <span className="text-sm font-bold font-mono text-stone-900">
                  ₺{item.totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                <span className="text-[11px] text-stone-500 block">Kapanan Tutar</span>
                <span className="text-sm font-bold font-mono text-emerald-700">
                  ₺{item.paidAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div
                className={`p-2.5 rounded-lg border ${
                  item.remainingAmount <= 0
                    ? 'bg-stone-100 border-stone-300 text-stone-600'
                    : isAlacak
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <span className="text-[11px] font-semibold block">Kalan Bakiye</span>
                <span className="text-sm font-extrabold font-mono">
                  ₺{item.remainingAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Belge & Cari Detayları (Grid) */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-white border border-stone-200 rounded-lg space-y-2">
              <span className="font-bold text-stone-800 uppercase tracking-wider block border-b border-stone-100 pb-1">
                Fatura / Belge Bilgileri
              </span>
              <div className="flex justify-between">
                <span className="text-stone-500">Belge No:</span>
                <span className="font-mono font-semibold text-stone-800">{item.documentNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Belge Türü:</span>
                <span className="font-medium text-stone-800">{item.documentType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Düzenleme Tarihi:</span>
                <span className="font-mono text-stone-800">{item.issueDate}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500">Vade Tarihi:</span>
                <span className="font-mono font-bold text-stone-900 flex items-center gap-1">
                  {item.dueDate}
                  {isOverdue && (
                    <span className="px-1.5 py-0.5 rounded-xs text-[10px] bg-rose-100 text-rose-700 font-bold">
                      Gecikti
                    </span>
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Kategori:</span>
                <span className="text-stone-800 font-medium">{item.category || '-'}</span>
              </div>
            </div>

            <div className="p-3 bg-white border border-stone-200 rounded-lg space-y-2">
              <span className="font-bold text-stone-800 uppercase tracking-wider block border-b border-stone-100 pb-1">
                Cari & Şube Bilgileri
              </span>
              <div className="flex justify-between">
                <span className="text-stone-500">Cari Ünvan:</span>
                <span className="font-semibold text-stone-800 truncate max-w-[160px]" title={item.contactTitle}>
                  {item.contactTitle}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Cari Kodu:</span>
                <span className="font-mono text-stone-800">{item.contactCode || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Vergi / TC No:</span>
                <span className="font-mono text-stone-800">{item.contactTaxNumber || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">İletişim Tel:</span>
                <span className="font-mono text-stone-800">{item.contactPhone || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">İşlem Şubesi:</span>
                <span className="font-medium text-stone-800 truncate max-w-[160px]">{item.branchName || '-'}</span>
              </div>
            </div>
          </div>

          {/* Açıklama & Notlar */}
          {item.description && (
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg text-xs">
              <span className="font-semibold text-stone-700 block mb-1">Açıklama:</span>
              <p className="text-stone-600 leading-relaxed">{item.description}</p>
            </div>
          )}

          {/* Tahsilat / Ödeme Geçmişi Tablosu */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                Tahsilat / Ödeme Geçmişi ({item.payments?.length || 0} Hareket)
              </h3>
              {item.remainingAmount > 0 && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenPaymentModal(item);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-md text-white transition-colors print:hidden ${
                    isAlacak ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isAlacak ? 'Tahsilat Ekle' : 'Ödeme Yap'}</span>
                </button>
              )}
            </div>

            {item.payments && item.payments.length > 0 ? (
              <div className="border border-stone-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-100 border-b border-stone-200 text-stone-600 font-semibold">
                    <tr>
                      <th className="p-2.5">Tarih</th>
                      <th className="p-2.5">Hesap / Kasa</th>
                      <th className="p-2.5">Yöntem</th>
                      <th className="p-2.5">Makbuz / Dekont</th>
                      <th className="p-2.5 text-right">Tutar (₺)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 bg-white">
                    {item.payments.map((p, idx) => (
                      <tr key={p.id || idx} className="hover:bg-stone-50">
                        <td className="p-2.5 font-mono text-stone-700">{p.paymentDate}</td>
                        <td className="p-2.5 font-medium text-stone-800">{p.cashBankName}</td>
                        <td className="p-2.5 text-stone-600">{p.paymentMethod}</td>
                        <td className="p-2.5 font-mono text-stone-500">{p.receiptNumber || '-'}</td>
                        <td className="p-2.5 font-mono font-bold text-right text-stone-900">
                          ₺{p.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-lg text-center text-xs text-stone-500">
                Bu kayda ait henüz bir ödeme veya tahsilat işlemi gerçekleşmemiştir.
              </div>
            )}
          </div>

          {/* Alt Aksiyon Butonları */}
          <div className="flex items-center justify-between pt-4 border-t border-stone-200 print:hidden">
            <button
              onClick={() => {
                if (window.confirm(`${item.itemCode} nolu kaydı silmek istediğinize emin misiniz?`)) {
                  onDelete(item.id);
                  onClose();
                }
              }}
              className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-3 py-2 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Kaydı Sil</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors"
              >
                Kapat
              </button>
              {item.remainingAmount > 0 && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenPaymentModal(item);
                  }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white shadow-xs transition-colors ${
                    isAlacak ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  <Coins className="w-4 h-4" />
                  <span>{isAlacak ? 'Tahsilat Al' : 'Ödeme Yap'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

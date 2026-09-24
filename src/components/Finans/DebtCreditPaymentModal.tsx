import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Calendar,
  Building,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  DollarSign,
} from 'lucide-react';
import { DebtCreditItem, CashBank, PaymentMethodType } from '../../types/fx';
import { fxApi } from '../../services/api';

interface DebtCreditPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  item: DebtCreditItem | null;
  cashBanks: CashBank[];
}

export const DebtCreditPaymentModal: React.FC<DebtCreditPaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  item,
  cashBanks,
}) => {
  if (!isOpen || !item) return null;

  const isAlacak = item.type === 'ALACAK';

  const [amount, setAmount] = useState<string>('');
  const [cashBankId, setCashBankId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('BANKA');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [receiptNumber, setReceiptNumber] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setAmount(item.remainingAmount.toString());
      setPaymentDate(new Date().toISOString().slice(0, 10));
      const randNum = Math.floor(10000 + Math.random() * 90000);
      setReceiptNumber(isAlacak ? `THS-${randNum}` : `ODM-${randNum}`);
      setDescription(
        `${item.documentNumber} no'lu faturaya mahsuben ${isAlacak ? 'tahsilat' : 'ödeme'} (${item.contactTitle})`
      );
      if (cashBanks.length > 0) {
        setCashBankId(cashBanks[0].id);
      }
      setError(null);
    }
  }, [item, isAlacak, cashBanks]);

  const numericAmount = parseFloat(amount) || 0;
  const newRemaining = Math.max(0, item.remainingAmount - numericAmount);
  const isFullPayment = numericAmount >= item.remainingAmount && item.remainingAmount > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (numericAmount <= 0) {
      setError('Lütfen sıfırdan büyük bir işlem tutarı giriniz.');
      return;
    }

    if (numericAmount > item.remainingAmount) {
      setError(
        `Girilen tutar kalan borç bakiyesinden (₺${item.remainingAmount.toLocaleString('tr-TR')}) fazla olamaz.`
      );
      return;
    }

    if (!cashBankId) {
      setError('Lütfen bir Kasa veya Banka hesabı seçiniz.');
      return;
    }

    try {
      setLoading(true);
      await fxApi.addDebtCreditPayment(item.id, {
        amount: numericAmount,
        cashBankId,
        paymentMethod,
        receiptNumber: receiptNumber.trim() || undefined,
        description: description.trim() || undefined,
        paymentDate,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Ödeme işlemi hatası:', err);
      setError(err?.message || 'İşlem kaydedilirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // Vade Gün Farkı
  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = item.dueDate && item.dueDate < today;
  let diffDays = 0;
  if (item.dueDate) {
    const d1 = new Date(today);
    const d2 = new Date(item.dueDate);
    diffDays = Math.round((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24));
  }

  const selectedCashBank = cashBanks.find(cb => cb.id === cashBankId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden my-6">
        {/* Başlık */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-xs ${
                isAlacak ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
              }`}
            >
              {isAlacak ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">
                {isAlacak ? 'Alacak Tahsilatı Kaydet' : 'Tedarikçi Ödemesi Yap'}
              </h2>
              <p className="text-xs text-stone-500 font-mono">
                {item.itemCode} • {item.contactTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Mevcut Durum Bilgi Kartı */}
          <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-white rounded-lg border border-stone-200 shadow-2xs">
                <span className="text-[11px] text-stone-500 font-medium block">Fatura Tutarı</span>
                <span className="text-sm font-bold font-mono text-stone-900">
                  ₺{item.totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-stone-200 shadow-2xs">
                <span className="text-[11px] text-stone-500 font-medium block">Tahsil Edilen/Ödenen</span>
                <span className="text-sm font-bold font-mono text-stone-600">
                  ₺{item.paidAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div
                className={`p-2 rounded-lg border shadow-2xs ${
                  isAlacak ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <span className="text-[11px] font-medium block">Kalan Bakiye</span>
                <span className="text-sm font-extrabold font-mono">
                  ₺{item.remainingAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-stone-600 px-1 pt-1 border-t border-stone-200">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-stone-400" />
                Belge No: <b>{item.documentNumber}</b> ({item.documentType})
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-stone-400" />
                Vade: <b>{item.dueDate}</b>
                {isOverdue ? (
                  <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-bold bg-rose-100 text-rose-700">
                    {Math.abs(diffDays)} gün gecikti!
                  </span>
                ) : (
                  <span className="text-stone-500 text-[11px]">({diffDays} gün kaldı)</span>
                )}
              </span>
            </div>
          </div>

          {/* Tutar Girişi ve Hızlı Tutar Butonları */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-stone-700">
                {isAlacak ? 'Tahsil Edilen Tutar (₺)' : 'Ödenen Tutar (₺)'} <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setAmount((item.remainingAmount * 0.5).toFixed(2))}
                  className="text-[11px] px-2 py-0.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md transition-colors"
                >
                  %50
                </button>
                <button
                  type="button"
                  onClick={() => setAmount(item.remainingAmount.toString())}
                  className="text-[11px] px-2 py-0.5 bg-stone-800 text-white rounded-md hover:bg-stone-700 transition-colors font-medium"
                >
                  Tamamını Kapat
                </button>
              </div>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-stone-400 font-bold text-sm">₺</span>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full h-11 pl-8 pr-3 text-base font-bold font-mono bg-white border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-stone-800"
              />
            </div>

            {/* Dinamik Kalan Göstergesi */}
            <div className="mt-2 text-xs flex items-center justify-between font-mono">
              <span className="text-stone-500">İşlem Sonrası Kalan:</span>
              <span className={`font-bold ${newRemaining <= 0.01 ? 'text-emerald-600' : 'text-stone-800'}`}>
                {newRemaining <= 0.01
                  ? '✅ Borç/Alacak tamamen kapanacaktır (₺0,00)'
                  : `₺${newRemaining.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`}
              </span>
            </div>
          </div>

          {/* Kasa/Banka Hesabı ve Ödeme Yöntemi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                İşlem Hesabı (Kasa / Banka) <span className="text-rose-500">*</span>
              </label>
              <select
                value={cashBankId}
                onChange={e => setCashBankId(e.target.value)}
                className="w-full h-10 px-3 text-xs bg-white border border-stone-300 rounded-lg"
              >
                {cashBanks.map(cb => (
                  <option key={cb.id} value={cb.id}>
                    {cb.name} (₺{cb.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Ödeme Yolu / Kanalı</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as PaymentMethodType)}
                className="w-full h-10 px-3 text-xs bg-white border border-stone-300 rounded-lg"
              >
                <option value="BANKA">Banka Transferi / EFT</option>
                <option value="NAKIT">Nakit / Kasa</option>
                <option value="KREDI_KARTI">Kredi Kartı / POS</option>
                <option value="CEK_SENET">Çek / Senet Takası</option>
              </select>
            </div>
          </div>

          {/* Tarih ve Makbuz No */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">İşlem Tarihi</label>
              <input
                type="date"
                value={paymentDate}
                onChange={e => setPaymentDate(e.target.value)}
                className="w-full h-10 px-3 text-xs font-mono bg-white border border-stone-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Makbuz / Dekont No</label>
              <input
                type="text"
                value={receiptNumber}
                onChange={e => setReceiptNumber(e.target.value)}
                placeholder="DEK-..."
                className="w-full h-10 px-3 text-xs font-mono bg-white border border-stone-300 rounded-lg"
              />
            </div>
          </div>

          {/* Açıklama */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Açıklama</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full h-9 px-3 text-xs bg-white border border-stone-300 rounded-lg"
            />
          </div>

          {/* Alt Butonlar */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-stone-600 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold text-white shadow-xs transition-all ${
                isAlacak
                  ? 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400'
                  : 'bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400'
              }`}
            >
              {loading ? (
                <span>Kaydediliyor...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {isAlacak ? 'Tahsilatı Onayla & Kasaya Ekle' : 'Ödemeyi Onayla & Hesaptan Düş'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

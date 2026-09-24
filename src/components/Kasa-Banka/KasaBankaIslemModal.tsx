import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Landmark,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  X,
  AlertCircle,
  Calendar,
  FileText,
  DollarSign,
} from 'lucide-react';
import { CashBank, PaymentMovementType, PaymentMethodType } from '../../types/fx';
import { fxApi } from '../../services/api';

interface KasaBankaIslemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  account: CashBank | null;
  initialType?: 'IN' | 'OUT';
}

export const KasaBankaIslemModal: React.FC<KasaBankaIslemModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  account,
  initialType = 'IN',
}) => {
  const [operationType, setOperationType] = useState<'IN' | 'OUT'>(initialType);
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<string>('Nakit Tahsilat / İşletme Girişi');
  const [documentNumber, setDocumentNumber] = useState<string>('');
  const [counterparty, setCounterparty] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    setOperationType(initialType);
    setAmount('');
    setDate(new Date().toISOString().slice(0, 10));
    setCounterparty('');
    setError(null);
    if (initialType === 'IN') {
      setDescription(`${account?.name || 'Hesap'} - Para Girişi / Tahsilat`);
      setCategory('Nakit Tahsilat / İşletme Girişi');
      setDocumentNumber(`GIR-${Date.now().toString().slice(-6)}`);
    } else {
      setDescription(`${account?.name || 'Hesap'} - Para Çıkışı / Ödeme`);
      setCategory('Genel İşletme Gideri & Ödeme');
      setDocumentNumber(`CIK-${Date.now().toString().slice(-6)}`);
    }
  }, [isOpen, initialType, account]);

  if (!isOpen || !account) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Lütfen geçerli bir tutar giriniz.');
      return;
    }

    if (operationType === 'OUT' && parsedAmount > account.balance) {
      // Show warning if exceeding balance
      if (!window.confirm(`Çıkış tutarı (₺${parsedAmount.toLocaleString('tr-TR')}) mevcut bakiyeden (₺${account.balance.toLocaleString('tr-TR')}) fazladır. Eksi bakiye oluşmasını onaylıyor musunuz?`)) {
        return;
      }
    }

    setSubmitting(true);
    try {
      const movementType: PaymentMovementType = operationType === 'IN' ? 'TAHSILAT' : 'ODEME';
      const paymentMethod: PaymentMethodType = account.type === 'Cash' ? 'NAKIT' : 'BANKA';

      await fxApi.createPaymentMovement({
        branchId: account.branchId,
        cashBankId: account.id,
        cashBankName: account.name,
        contactId: 'c-direct-cash-trans',
        contactTitle: counterparty.trim() || (operationType === 'IN' ? 'Muhtelif Müşteri / Giriş' : 'Muhtelif Tedarikçi / Çıkış'),
        movementType,
        paymentMethod,
        amount: parsedAmount,
        currency: account.currencyCode,
        movementDate: date,
        description: description.trim() || `${account.name} ${operationType === 'IN' ? 'Giriş' : 'Çıkış'} Hareketi`,
        status: 'COMPLETED',
        documentNumber: documentNumber.trim() || '',
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'İşlem kaydedilirken bir hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/40 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white border border-stone-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        {/* Başlık */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              operationType === 'IN' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}>
              {operationType === 'IN' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">
                {operationType === 'IN' ? 'Para Girişi (Tahsilat / Yatırma)' : 'Para Çıkışı (Ödeme / Çekme)'}
              </h3>
              <p className="text-xs text-stone-500 truncate max-w-[260px]">
                {account.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mevcut Hesap Kartı */}
        <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between text-xs">
          <div>
            <div className="text-[10px] text-stone-400 uppercase font-semibold">Aktif Bakiye</div>
            <div className="text-sm font-mono font-bold text-stone-900">
              ₺{account.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {account.currencyCode}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-stone-400 uppercase font-semibold">Tür</div>
            <div className="font-semibold text-stone-700">
              {account.type === 'Bank' ? 'Banka Hesabı' : 'Nakit Kasa'}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* İşlem Yönü Toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setOperationType('IN');
                setDescription(`${account.name} - Para Girişi`);
              }}
              className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold transition-all ${
                operationType === 'IN'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-200'
                  : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
              <span>Para Girişi (+)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setOperationType('OUT');
                setDescription(`${account.name} - Para Çıkışı`);
              }}
              className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold transition-all ${
                operationType === 'OUT'
                  ? 'border-rose-500 bg-rose-50 text-rose-900 ring-2 ring-rose-200'
                  : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
              <span>Para Çıkışı (-)</span>
            </button>
          </div>

          {/* Tutar */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              İşlem Tutarı *
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                required
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-base font-mono font-bold text-stone-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
              <span className="absolute left-3 top-2.5 text-stone-400 font-bold text-sm">
                ₺
              </span>
            </div>
          </div>

          {/* Tarih & Belge No */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                İşlem Tarihi
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-semibold text-stone-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                Makbuz / Dekont No
              </label>
              <input
                type="text"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="Örn: DKT-2026-001"
                className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono text-stone-800"
              />
            </div>
          </div>

          {/* Karşı Taraf / Cari / Açıklama */}
          <div>
            <label className="block text-[11px] font-semibold text-stone-600 mb-1">
              Karşı Taraf (Cari, Kişi veya Açıklayıcı Ünvan)
            </label>
            <input
              type="text"
              value={counterparty}
              onChange={(e) => setCounterparty(e.target.value)}
              placeholder="Örn: Garanti Bankası ATM / Ahmet Yılmaz / Nakit Teslimat"
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:border-indigo-500"
            />
          </div>

          {/* Açıklama */}
          <div>
            <label className="block text-[11px] font-semibold text-stone-600 mb-1">
              İşlem Açıklaması
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Açıklama giriniz..."
              className="w-full px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Butonlar */}
          <div className="pt-2 border-t border-stone-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white rounded-xl transition-all shadow-xs cursor-pointer ${
                operationType === 'IN'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{submitting ? 'İşleniyor...' : operationType === 'IN' ? 'Girişi Onayla' : 'Çıkışı Onayla'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

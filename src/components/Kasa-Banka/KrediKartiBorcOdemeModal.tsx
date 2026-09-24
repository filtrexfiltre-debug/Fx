import React, { useState } from 'react';
import {
  CreditCard as CreditCardIcon,
  Landmark,
  Wallet,
  Check,
  X,
  AlertCircle,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { CashBank } from '../../types/fx';

interface KrediKartiBorcOdemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardAccount: CashBank;
  availableFundingAccounts: CashBank[]; // Banka hesapları ve nakit kasalar
  onPayDebt: (payload: {
    cardId: string;
    sourceCashBankId: string;
    amount: number;
    description?: string;
  }) => Promise<void>;
}

export const KrediKartiBorcOdemeModal: React.FC<KrediKartiBorcOdemeModalProps> = ({
  isOpen,
  onClose,
  cardAccount,
  availableFundingAccounts,
  onPayDebt,
}) => {
  const defaultSource =
    availableFundingAccounts.find((a) => a.id === cardAccount.linkedBankAccountId) ||
    availableFundingAccounts.find((a) => a.branchId === cardAccount.branchId && a.type === 'Bank') ||
    availableFundingAccounts[0];

  const [sourceId, setSourceId] = useState<string>(defaultSource?.id || '');
  const [amount, setAmount] = useState<string>(cardAccount.balance.toString());
  const [description, setDescription] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const numAmount = parseFloat(amount.replace(',', '.')) || 0;
  const totalLimit = cardAccount.creditLimit || 0;
  const currentDebt = cardAccount.balance;
  const currentAvailableLimit = Math.max(0, totalLimit - currentDebt);
  const newDebt = Math.max(0, currentDebt - numAmount);
  const newAvailableLimit = Math.min(totalLimit, currentAvailableLimit + numAmount);

  const selectedSource = availableFundingAccounts.find((a) => a.id === sourceId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (numAmount <= 0) {
      setError('Lütfen geçerli bir ödeme tutarı giriniz.');
      return;
    }

    if (!sourceId) {
      setError('Lütfen ödemenin yapılacağı kaynak kasa veya banka hesabını seçiniz.');
      return;
    }

    if (selectedSource && selectedSource.balance < numAmount) {
      setError(
        `Seçilen kaynak hesapta (${selectedSource.name}) yeterli bakiye yok. Mevcut Bakiye: ₺${selectedSource.balance.toLocaleString(
          'tr-TR'
        )}.`
      );
      return;
    }

    setSubmitting(true);
    try {
      await onPayDebt({
        cardId: cardAccount.id,
        sourceCashBankId: sourceId,
        amount: numAmount,
        description:
          description.trim() ||
          `${cardAccount.name} (${cardAccount.cardNumberLast4 ? 'Son 4 Hane: ' + cardAccount.cardNumberLast4 : ''}) Ekstre/Borç Ödemesi`,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Borç ödeme sırasında bir hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/45 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white border border-stone-200 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4">
        {/* Başlık */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
              <CreditCardIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">
                Şirket Kredi Kartı Borç Ödemesi
              </h3>
              <p className="text-xs text-stone-500">
                Vadesiz banka veya kasadan kart borcunu ödeyerek limiti yenileyin
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Kart Bilgi Kartı */}
          <div className="p-4 bg-gradient-to-br from-stone-900 to-stone-800 rounded-xl text-white shadow-md relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-300">
                {cardAccount.cardBankName || 'Şirket Kredi Kartı'}
              </span>
              <div className="flex items-center gap-1.5 text-xs text-violet-300 font-mono font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>•••• {cardAccount.cardNumberLast4 || '8492'}</span>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-stone-400 uppercase tracking-wider block">
                  Kart Hamili
                </span>
                <span className="text-xs font-bold text-stone-100">
                  {cardAccount.cardHolderName || 'Şirket Yetkilisi'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-stone-400 uppercase tracking-wider block">
                  Güncel Dönem Borcu
                </span>
                <span className="text-sm font-black font-mono text-rose-400">
                  ₺{currentDebt.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-stone-700/80 flex items-center justify-between text-[11px] text-stone-300">
              <span>Toplam Limit: ₺{totalLimit.toLocaleString('tr-TR')}</span>
              <span>Kullanılabilir: ₺{currentAvailableLimit.toLocaleString('tr-TR')}</span>
            </div>
          </div>

          {/* Hızlı Tutar Seçenekleri */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAmount(currentDebt.toString())}
              className="flex-1 py-1.5 px-2 bg-stone-100 hover:bg-violet-50 hover:text-violet-700 hover:border-violet-300 border border-stone-200 rounded-lg text-xs font-bold text-stone-700 transition-all cursor-pointer"
            >
              Tüm Borç (₺{currentDebt.toLocaleString('tr-TR')})
            </button>
            {cardAccount.minPaymentAmount && (
              <button
                type="button"
                onClick={() => setAmount(cardAccount.minPaymentAmount!.toString())}
                className="flex-1 py-1.5 px-2 bg-stone-100 hover:bg-violet-50 hover:text-violet-700 hover:border-violet-300 border border-stone-200 rounded-lg text-xs font-bold text-stone-700 transition-all cursor-pointer"
              >
                Asgari Tutar (₺{cardAccount.minPaymentAmount!.toLocaleString('tr-TR')})
              </button>
            )}
          </div>

          {/* Ödenecek Tutar Girişi */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Ödenecek Tutar (₺) *
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm font-mono font-bold text-stone-900 focus:bg-white focus:border-violet-500"
              />
              <span className="absolute left-3 top-2.5 text-stone-400 font-bold text-xs">₺</span>
            </div>
          </div>

          {/* Ödemenin Yapılacağı Kaynak Hesap */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Ödemenin Çekileceği Hesap (Banka / Kasa) *
            </label>
            <div className="relative">
              <select
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-800 focus:bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-100 transition-all"
              >
                {availableFundingAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.type === 'Bank' ? '🏦 Banka: ' : '💵 Kasa: '} {a.name} (Bakiye: ₺
                    {a.balance.toLocaleString('tr-TR')})
                  </option>
                ))}
              </select>
              {selectedSource?.type === 'Bank' ? (
                <Landmark className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              ) : (
                <Wallet className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              )}
            </div>
          </div>

          {/* Ödeme Sonrası Kart Durumu Önizlemesi */}
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-stone-500 block text-[11px]">Ödeme Sonrası Borç:</span>
              <span className="font-mono font-bold text-stone-800 text-sm">
                ₺{newDebt.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="text-stone-500 block text-[11px]">Kullanılabilir Yeni Limit:</span>
              <span className="font-mono font-bold text-emerald-600 text-sm">
                ₺{newAvailableLimit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Açıklama */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Açıklama (İsteğe Bağlı)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Örn: Aylık kredi kartı ekstre borcu kapatma"
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:bg-white"
            />
          </div>

          {/* Butonlar */}
          <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={submitting || numAmount <= 0}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{submitting ? 'İşleniyor...' : 'Kart Borcunu Öde'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

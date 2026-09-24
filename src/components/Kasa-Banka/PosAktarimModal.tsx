import React, { useState } from 'react';
import {
  Smartphone,
  Landmark,
  ArrowRight,
  Check,
  X,
  AlertCircle,
  Percent,
  Receipt,
  HelpCircle,
} from 'lucide-react';
import { CashBank } from '../../types/fx';

interface PosAktarimModalProps {
  isOpen: boolean;
  onClose: () => void;
  posAccount: CashBank;
  bankAccounts: CashBank[];
  onSettle: (payload: {
    posId: string;
    amount: number;
    targetBankId: string;
    description?: string;
  }) => Promise<void>;
}

export const PosAktarimModal: React.FC<PosAktarimModalProps> = ({
  isOpen,
  onClose,
  posAccount,
  bankAccounts,
  onSettle,
}) => {
  const defaultTargetBank =
    bankAccounts.find((b) => b.id === posAccount.linkedBankAccountId) ||
    bankAccounts.find((b) => b.branchId === posAccount.branchId) ||
    bankAccounts[0];

  const [targetBankId, setTargetBankId] = useState<string>(defaultTargetBank?.id || '');
  const [amount, setAmount] = useState<string>(posAccount.balance.toString());
  const [description, setDescription] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const numAmount = parseFloat(amount.replace(',', '.')) || 0;
  const commissionRate = posAccount.commissionRate || 0;
  const commissionAmount = Math.round(((numAmount * commissionRate) / 100) * 100) / 100;
  const netAmount = Math.max(0, Math.round((numAmount - commissionAmount) * 100) / 100);

  const selectedTargetBank = bankAccounts.find((b) => b.id === targetBankId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (numAmount <= 0) {
      setError('Lütfen geçerli bir aktarım tutarı giriniz.');
      return;
    }

    if (numAmount > posAccount.balance) {
      setError(
        `Aktarılmak istenen tutar (₺${numAmount.toLocaleString(
          'tr-TR'
        )}) mevcut POS cirosundan (₺${posAccount.balance.toLocaleString('tr-TR')}) fazla olamaz.`
      );
      return;
    }

    if (!targetBankId) {
      setError('Lütfen aktarımın yapılacağı hedef vadesiz banka hesabını seçiniz.');
      return;
    }

    setSubmitting(true);
    try {
      await onSettle({
        posId: posAccount.id,
        amount: numAmount,
        targetBankId,
        description:
          description.trim() ||
          `${posAccount.name} Gün Sonu & Net Ciro Aktarımı (%${commissionRate} Komisyon = ₺${commissionAmount.toLocaleString(
            'tr-TR'
          )})`,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Aktarım sırasında bir hata oluştu.');
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
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">
                POS Gün Sonu & Banka Hesabına Aktarım
              </h3>
              <p className="text-xs text-stone-500">
                Bekleyen POS cirosunu komisyon kesintisiyle vadesiz hesaba aktarın
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
          {/* Kaynak POS Cihazı Bilgisi */}
          <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                Kaynak POS Cihazı
              </span>
              <p className="text-xs font-bold text-stone-900">{posAccount.name}</p>
              <div className="flex items-center gap-2 text-[11px] text-stone-500 mt-0.5">
                <span>Terminal: {posAccount.posTerminalId || 'Standart'}</span>
                <span>•</span>
                <span>Komisyon: %{commissionRate}</span>
                <span>•</span>
                <span>Valör: {posAccount.valorDays || 1} Gün</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-semibold text-stone-500">Bekleyen Ciro</span>
              <p className="text-sm font-black font-mono text-amber-700">
                ₺{posAccount.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Aktarılacak Tutar */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-stone-700">
                Aktarılacak Tutar (₺) *
              </label>
              <button
                type="button"
                onClick={() => setAmount(posAccount.balance.toString())}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                Tüm Ciroyu Aktar (₺{posAccount.balance.toLocaleString('tr-TR')})
              </button>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                required
                max={posAccount.balance}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm font-mono font-bold text-stone-900 focus:bg-white focus:border-indigo-500"
              />
              <span className="absolute left-3 top-2.5 text-stone-400 font-bold text-xs">₺</span>
            </div>
          </div>

          {/* Hedef Vadesiz Banka Hesabı */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Hedef Vadesiz Banka Hesabı *
            </label>
            <div className="relative">
              <select
                value={targetBankId}
                onChange={(e) => setTargetBankId(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-800 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
              >
                {bankAccounts.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} (Mevcut: ₺{b.balance.toLocaleString('tr-TR')})
                  </option>
                ))}
              </select>
              <Landmark className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            </div>
          </div>

          {/* Komisyon ve Net Hesap Özeti */}
          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-2 text-xs">
            <div className="flex items-center justify-between text-stone-600">
              <span>Brüt Çekilen Ciro:</span>
              <span className="font-mono font-bold text-stone-900">
                ₺{numAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between text-rose-600">
              <span className="flex items-center gap-1">
                <Percent className="w-3.5 h-3.5" />
                POS Banka Komisyonu (%{commissionRate}):
              </span>
              <span className="font-mono font-bold">
                -₺{commissionAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="pt-2 border-t border-stone-200 flex items-center justify-between font-bold text-emerald-700 text-sm">
              <span>Banka Hesabına Geçecek Net Tutar:</span>
              <span className="font-mono">
                ₺{netAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Açıklama */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              İşlem Açıklaması (İsteğe Bağlı)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Örn: Gün sonu POS ciro aktarımı ve valör kapatma"
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
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{submitting ? 'Aktarılıyor...' : 'Net Ciroyu Hesaba Aktar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

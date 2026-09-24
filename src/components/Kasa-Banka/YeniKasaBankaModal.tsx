import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Landmark,
  Building2,
  Check,
  X,
  AlertCircle,
  CreditCard as CreditCardIcon,
  Smartphone,
  Percent,
  Calendar,
  Layers,
} from 'lucide-react';
import { CashBank, CashBankType, Branch } from '../../types/fx';

interface YeniKasaBankaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (account: Omit<CashBank, 'id' | 'tenantId'>, editId?: string) => Promise<void>;
  branches: Branch[];
  currentBranchId: string;
  editAccount?: CashBank | null;
  existingAccounts?: CashBank[];
}

export const YeniKasaBankaModal: React.FC<YeniKasaBankaModalProps> = ({
  isOpen,
  onClose,
  onSave,
  branches,
  currentBranchId,
  editAccount,
  existingAccounts = [],
}) => {
  const [type, setType] = useState<CashBankType>('Bank');
  const [branchId, setBranchId] = useState<string>(
    currentBranchId === 'all' ? branches[0]?.id || '' : currentBranchId
  );
  const [name, setName] = useState<string>('');
  const [currencyCode, setCurrencyCode] = useState<'TRY' | 'USD' | 'EUR'>('TRY');
  const [balance, setBalance] = useState<string>('0');
  
  // Banka alanları
  const [iban, setIban] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [branchCode, setBranchCode] = useState<string>('');
  const [bankName, setBankName] = useState<string>('Garanti BBVA');

  // POS alanları
  const [posTerminalId, setPosTerminalId] = useState<string>('');
  const [posType, setPosType] = useState<'PHYSICAL' | 'VIRTUAL'>('PHYSICAL');
  const [commissionRate, setCommissionRate] = useState<string>('1.75');
  const [valorDays, setValorDays] = useState<string>('1');
  const [linkedBankAccountId, setLinkedBankAccountId] = useState<string>('');

  // Kredi Kartı alanları
  const [cardHolderName, setCardHolderName] = useState<string>('');
  const [cardNumberLast4, setCardNumberLast4] = useState<string>('');
  const [cardBankName, setCardBankName] = useState<string>('Garanti BBVA Bonus Business');
  const [creditLimit, setCreditLimit] = useState<string>('100000');
  const [cutoffDay, setCutoffDay] = useState<string>('15');
  const [paymentDueDay, setPaymentDueDay] = useState<string>('25');

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Filtrelenmiş vadesiz banka hesapları (Bağlı hesap seçimi için)
  const availableBankAccounts = existingAccounts.filter(
    (a) => a.type === 'Bank' && (branchId ? a.branchId === branchId : true)
  );

  useEffect(() => {
    if (editAccount) {
      setType(editAccount.type);
      setBranchId(editAccount.branchId);
      setName(editAccount.name);
      setCurrencyCode(editAccount.currencyCode);
      setBalance(String(editAccount.balance));
      setIban(editAccount.iban || '');
      setAccountNumber(editAccount.accountNumber || '');
      setBranchCode(editAccount.branchCode || '');
      setBankName(editAccount.bankName || 'Garanti BBVA');

      setPosTerminalId(editAccount.posTerminalId || '');
      setPosType(editAccount.posType || 'PHYSICAL');
      setCommissionRate(editAccount.commissionRate !== undefined ? String(editAccount.commissionRate) : '1.75');
      setValorDays(editAccount.valorDays !== undefined ? String(editAccount.valorDays) : '1');
      setLinkedBankAccountId(editAccount.linkedBankAccountId || '');

      setCardHolderName(editAccount.cardHolderName || '');
      setCardNumberLast4(editAccount.cardNumberLast4 || '');
      setCardBankName(editAccount.cardBankName || editAccount.name);
      setCreditLimit(editAccount.creditLimit !== undefined ? String(editAccount.creditLimit) : '100000');
      setCutoffDay(editAccount.cutoffDay !== undefined ? String(editAccount.cutoffDay) : '15');
      setPaymentDueDay(editAccount.paymentDueDay !== undefined ? String(editAccount.paymentDueDay) : '25');
    } else {
      setType('Bank');
      setBranchId(currentBranchId === 'all' ? branches[0]?.id || '' : currentBranchId);
      setName('');
      setCurrencyCode('TRY');
      setBalance('0');
      setIban('');
      setAccountNumber('');
      setBranchCode('');
      setBankName('Garanti BBVA');

      setPosTerminalId('');
      setPosType('PHYSICAL');
      setCommissionRate('1.75');
      setValorDays('1');
      setLinkedBankAccountId(availableBankAccounts[0]?.id || '');

      setCardHolderName('');
      setCardNumberLast4('');
      setCardBankName('Garanti BBVA Bonus Business');
      setCreditLimit('100000');
      setCutoffDay('15');
      setPaymentDueDay('25');
    }
    setError(null);
  }, [editAccount, isOpen, currentBranchId, branches]);

  if (!isOpen) return null;

  const handleIbanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!val.startsWith('TR') && val.length > 0) {
      val = 'TR' + val;
    }
    if (val.length > 26) val = val.slice(0, 26);
    setIban(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Lütfen hesap veya kart/cihaz adını belirtiniz.');
      return;
    }

    if (!branchId) {
      setError('Lütfen bağlı olduğu şubeyi seçiniz.');
      return;
    }

    const numBalance = parseFloat(balance.replace(',', '.'));
    if (isNaN(numBalance)) {
      setError('Geçerli bir bakiye tutarı giriniz.');
      return;
    }

    if (type === 'Bank') {
      if (iban && iban.length < 26) {
        setError('IBAN 26 karakter (TR dahil) olmalıdır.');
        return;
      }
    }

    if (type === 'CreditCard') {
      if (cardNumberLast4 && (cardNumberLast4.length !== 4 || isNaN(Number(cardNumberLast4)))) {
        setError('Kredi kartı son 4 hanesi 4 basamaklı sayı olmalıdır.');
        return;
      }
    }

    const selectedLinkedBank = existingAccounts.find((a) => a.id === linkedBankAccountId);

    setSubmitting(true);
    try {
      await onSave(
        {
          branchId,
          name: name.trim(),
          type,
          currencyCode,
          balance: numBalance,
          iban: type === 'Bank' && iban.trim() ? iban.trim() : undefined,
          accountNumber: type === 'Bank' && accountNumber.trim() ? accountNumber.trim() : undefined,
          branchCode: type === 'Bank' && branchCode.trim() ? branchCode.trim() : undefined,
          bankName: (type === 'Bank' || type === 'POS') ? bankName.trim() : undefined,

          posTerminalId: type === 'POS' ? posTerminalId.trim() : undefined,
          posType: type === 'POS' ? posType : undefined,
          commissionRate: type === 'POS' ? parseFloat(commissionRate) || 0 : undefined,
          valorDays: type === 'POS' ? parseInt(valorDays, 10) || 1 : undefined,
          linkedBankAccountId: (type === 'POS' || type === 'CreditCard') && linkedBankAccountId ? linkedBankAccountId : undefined,
          linkedBankAccountName: (type === 'POS' || type === 'CreditCard') && selectedLinkedBank ? selectedLinkedBank.name : undefined,

          cardHolderName: type === 'CreditCard' ? cardHolderName.trim() : undefined,
          cardNumberLast4: type === 'CreditCard' ? cardNumberLast4.trim() : undefined,
          cardBankName: type === 'CreditCard' ? cardBankName.trim() : undefined,
          creditLimit: type === 'CreditCard' ? parseFloat(creditLimit) || 0 : undefined,
          cutoffDay: type === 'CreditCard' ? parseInt(cutoffDay, 10) || 15 : undefined,
          paymentDueDay: type === 'CreditCard' ? parseInt(paymentDueDay, 10) || 25 : undefined,
          minPaymentAmount: type === 'CreditCard' ? (numBalance * 0.2) : undefined,
        },
        editAccount?.id
      );
      onClose();
    } catch (err: any) {
      setError(err.message || 'Hesap kaydedilirken bir hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/45 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white border border-stone-200 rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Başlık */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                type === 'Bank'
                  ? 'bg-indigo-100 text-indigo-700'
                  : type === 'Cash'
                  ? 'bg-emerald-100 text-emerald-700'
                  : type === 'POS'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-violet-100 text-violet-700'
              }`}
            >
              {type === 'Bank' && <Landmark className="w-5 h-5" />}
              {type === 'Cash' && <Wallet className="w-5 h-5" />}
              {type === 'POS' && <Smartphone className="w-5 h-5" />}
              {type === 'CreditCard' && <CreditCardIcon className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">
                {editAccount
                  ? 'Hesap / Kart / POS Düzenle'
                  : 'Yeni Finansal Hesap / Kart / POS Tanımla'}
              </h3>
              <p className="text-xs text-stone-500">
                Kasa, banka mevduatı, POS terminali veya ticari kredi kartı ekleyin
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
          {/* Hesap Türü Seçimi: 4 Sekmeli Kart */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Finansal Hesap Tipi *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => {
                  setType('Bank');
                  if (!name || name.includes('Nakit') || name.includes('POS') || name.includes('Kart')) {
                    setName('Ticari Vadesiz Banka Hesabı');
                  }
                }}
                className={`py-2.5 px-2 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-xs font-bold transition-all ${
                  type === 'Bank'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-200'
                    : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <Landmark className="w-4 h-4 text-indigo-600" />
                <span>Banka Hesabı</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('Cash');
                  if (!name || name.includes('Banka') || name.includes('POS') || name.includes('Kart')) {
                    setName('Şube Nakit TL Kasası');
                  }
                }}
                className={`py-2.5 px-2 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-xs font-bold transition-all ${
                  type === 'Cash'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-200'
                    : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <Wallet className="w-4 h-4 text-emerald-600" />
                <span>Nakit Kasa</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('POS');
                  if (!name || name.includes('Banka') || name.includes('Nakit') || name.includes('Kart')) {
                    setName('Mağaza POS Terminali');
                  }
                }}
                className={`py-2.5 px-2 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-xs font-bold transition-all ${
                  type === 'POS'
                    ? 'border-amber-600 bg-amber-50 text-amber-900 ring-2 ring-amber-200'
                    : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <Smartphone className="w-4 h-4 text-amber-600" />
                <span>POS Cihazı</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('CreditCard');
                  if (!name || name.includes('Banka') || name.includes('Nakit') || name.includes('POS')) {
                    setName('Şirket Ticari Kredi Kartı');
                  }
                }}
                className={`py-2.5 px-2 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-xs font-bold transition-all ${
                  type === 'CreditCard'
                    ? 'border-violet-600 bg-violet-50 text-violet-900 ring-2 ring-violet-200'
                    : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <CreditCardIcon className="w-4 h-4 text-violet-600" />
                <span>Kredi Kartı</span>
              </button>
            </div>
          </div>

          {/* Bağlı Şube */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Bağlı Olduğu Şube *
            </label>
            <div className="relative">
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-800 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.city}) {b.isHeadquarter ? ' - Merkez' : ''}
                  </option>
                ))}
              </select>
              <Building2 className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            </div>
          </div>

          {/* Hesap / Kart / POS Tanımı */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              {type === 'Bank'
                ? 'Banka & Hesap Adı *'
                : type === 'Cash'
                ? 'Kasa Tanımı / Adı *'
                : type === 'POS'
                ? 'POS Tanımı & Üye İşyeri Adı *'
                : 'Kredi Kartı Tanımı (Örn: Garanti Bonus Business) *'}
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                type === 'Bank'
                  ? 'Örn: Kadıköy Garanti BBVA Ticari Hesap'
                  : type === 'Cash'
                  ? 'Örn: Kadıköy Şube Nakit Kasası'
                  : type === 'POS'
                  ? 'Örn: Kadıköy Yapı Kredi Fiziksel POS'
                  : 'Örn: Garanti BBVA Bonus Business Kredi Kartı'
              }
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
            />
          </div>

          {/* Para Birimi & Bakiye / Borç */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Para Birimi
              </label>
              <select
                value={currencyCode}
                onChange={(e) => setCurrencyCode(e.target.value as any)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-800 focus:bg-white"
              >
                <option value="TRY">TRY - Türk Lirası (₺)</option>
                <option value="USD">USD - Amerikan Doları ($)</option>
                <option value="EUR">EUR - Euro (€)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                {type === 'CreditCard'
                  ? 'Güncel Kart Borcu (₺)'
                  : type === 'POS'
                  ? 'Bekleyen Ciro (₺)'
                  : editAccount
                  ? 'Mevcut Bakiye'
                  : 'Açılış Bakiyesi'}
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-bold text-stone-900 focus:bg-white focus:border-indigo-500"
                />
                <span className="absolute left-2.5 top-2 text-stone-400 font-bold text-xs">
                  {currencyCode === 'TRY' ? '₺' : currencyCode === 'USD' ? '$' : '€'}
                </span>
              </div>
            </div>
          </div>

          {/* ======================= BANKA HESABI ÖZEL ALANLARI ======================= */}
          {type === 'Bank' && (
            <div className="p-3.5 bg-indigo-50/40 rounded-xl border border-indigo-100 space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-stone-700 mb-1">
                  <span>IBAN Numarası</span>
                  <span className="text-[10px] font-mono text-stone-400">{iban.length} / 26</span>
                </div>
                <input
                  type="text"
                  value={iban}
                  onChange={handleIbanChange}
                  placeholder="TR330006200000012345678901"
                  maxLength={26}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold text-stone-900 uppercase tracking-wide focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                    Şube Kodu
                  </label>
                  <input
                    type="text"
                    value={branchCode}
                    onChange={(e) => setBranchCode(e.target.value)}
                    placeholder="Örn: 620"
                    className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono text-stone-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                    Hesap Numarası
                  </label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="Örn: 1234567-890"
                    className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono text-stone-800"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ======================= POS CİHAZI ÖZEL ALANLARI ======================= */}
          {type === 'POS' && (
            <div className="p-3.5 bg-amber-50/40 rounded-xl border border-amber-200/80 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    POS Cihaz Türü
                  </label>
                  <select
                    value={posType}
                    onChange={(e) => setPosType(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-semibold text-stone-800"
                  >
                    <option value="PHYSICAL">Fiziksel Mağaza POS Cihazı</option>
                    <option value="VIRTUAL">Sanal POS (E-Ticaret & Portal)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    Terminal ID / Üye No
                  </label>
                  <input
                    type="text"
                    value={posTerminalId}
                    onChange={(e) => setPosTerminalId(e.target.value)}
                    placeholder="Örn: GAR-POS-98120"
                    className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold text-stone-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1 flex items-center gap-1">
                    <Percent className="w-3.5 h-3.5 text-amber-600" />
                    <span>Komisyon Oranı (%)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(e.target.value)}
                    placeholder="Örn: 1.75"
                    className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold text-stone-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-amber-600" />
                    <span>Valör Süresi (Gün)</span>
                  </label>
                  <input
                    type="number"
                    value={valorDays}
                    onChange={(e) => setValorDays(e.target.value)}
                    placeholder="Örn: 1 (Ertesi Gün)"
                    className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold text-stone-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  Otomatik Aktarım Yapılacak Banka Hesabı
                </label>
                <select
                  value={linkedBankAccountId}
                  onChange={(e) => setLinkedBankAccountId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-medium text-stone-800"
                >
                  <option value="">Seçiniz (İsteğe Bağlı)</option>
                  {availableBankAccounts.map((ba) => (
                    <option key={ba.id} value={ba.id}>
                      {ba.name} (Bakiye: ₺{ba.balance.toLocaleString('tr-TR')})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* ======================= ŞİRKET KREDİ KARTI ÖZEL ALANLARI ======================= */}
          {type === 'CreditCard' && (
            <div className="p-3.5 bg-violet-50/40 rounded-xl border border-violet-200/80 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    Kart Hamili (Personel / Yetkili)
                  </label>
                  <input
                    type="text"
                    value={cardHolderName}
                    onChange={(e) => setCardHolderName(e.target.value)}
                    placeholder="Örn: Selim Vural (Genel Müdür)"
                    className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-medium text-stone-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    Kart Son 4 Hane
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={cardNumberLast4}
                    onChange={(e) => setCardNumberLast4(e.target.value.replace(/\D/g, ''))}
                    placeholder="Örn: 8492"
                    className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold tracking-widest text-stone-800 text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    Toplam Kart Limiti (₺)
                  </label>
                  <input
                    type="number"
                    step="1000"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                    placeholder="Örn: 150000"
                    className="w-full px-2 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold text-stone-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    Hesap Kesim Günü
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={cutoffDay}
                    onChange={(e) => setCutoffDay(e.target.value)}
                    placeholder="15"
                    className="w-full px-2 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold text-stone-800 text-center"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    Son Ödeme Günü
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={paymentDueDay}
                    onChange={(e) => setPaymentDueDay(e.target.value)}
                    placeholder="25"
                    className="w-full px-2 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold text-stone-800 text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  Otomatik Borç Ödeme Hesabı (Vadesiz Hesap)
                </label>
                <select
                  value={linkedBankAccountId}
                  onChange={(e) => setLinkedBankAccountId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-medium text-stone-800"
                >
                  <option value="">Seçiniz (İsteğe Bağlı)</option>
                  {availableBankAccounts.map((ba) => (
                    <option key={ba.id} value={ba.id}>
                      {ba.name} (Bakiye: ₺{ba.balance.toLocaleString('tr-TR')})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

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
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{submitting ? 'Kaydediliyor...' : editAccount ? 'Güncelle' : 'Hesabı Tanımla'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

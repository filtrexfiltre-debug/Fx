import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Check,
  Building2,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  CreditCard,
  Building,
  FileText,
  Calendar,
  AlertCircle,
  Clock,
  Sparkles,
  Info,
  DollarSign,
  ChevronDown,
  Search,
} from 'lucide-react';
import {
  PaymentMovement,
  PaymentMovementType,
  PaymentMethodType,
  Contact,
  CashBank,
  Branch,
} from '../../types/fx';
import { fxApi, branchContext } from '../../services/api';

interface NewHareketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (movement: PaymentMovement) => void;
  initialType?: PaymentMovementType;
  selectedBranchId: string;
}

const EXPENSE_CATEGORIES = [
  'Kira & Genel Yönetim',
  'Lojistik & Nakliye',
  'Personel Maaş & Avans',
  'Enerji & Elektrik / Isınma',
  'Yemek & Temsil Ağırlama',
  'Resmi Harç & Noter / Vergi',
  'Pazarlama & Reklam',
  'Bakım, Onarım & Sarf Malzeme',
  'Diğer Operasyonel Giderler',
];

export const NewHareketModal: React.FC<NewHareketModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialType = 'TAHSILAT',
  selectedBranchId,
}) => {
  const [movementType, setMovementType] = useState<PaymentMovementType>(initialType);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('BANKA');
  const [contactId, setContactId] = useState<string>('');
  const [contactSearch, setContactSearch] = useState<string>('');
  const [isContactDropdownOpen, setIsContactDropdownOpen] = useState<boolean>(false);
  const [customCounterparty, setCustomCounterparty] = useState<string>('');
  const [expenseCategory, setExpenseCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [cashBankId, setCashBankId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState<'TRY' | 'USD' | 'EUR'>('TRY');
  const [documentNumber, setDocumentNumber] = useState<string>('');
  const [receiptNumber, setReceiptNumber] = useState<string>('');
  const [movementDate, setMovementDate] = useState<string>(
    new Date().toISOString().slice(0, 16) // YYYY-MM-DDTHH:mm
  );
  const [dueDate, setDueDate] = useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [description, setDescription] = useState<string>('');

  // Çek / Senet Detayları
  const [chequeSerialNumber, setChequeSerialNumber] = useState<string>('');
  const [chequeBankName, setChequeBankName] = useState<string>('');
  const [chequeBranchName, setChequeBranchName] = useState<string>('');
  const [chequeDrawerName, setChequeDrawerName] = useState<string>('');

  // Veri Havuzu
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [cashBanks, setCashBanks] = useState<CashBank[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMovementType(initialType);
      loadFormData();
    }
  }, [isOpen, initialType]);

  const loadFormData = async () => {
    try {
      const [contactsRes, cashBanksRes, branchesRes] = await Promise.all([
        fxApi.getContacts(),
        fxApi.getCashBanks(selectedBranchId),
        fxApi.getBranches(),
      ]);

      setContacts(contactsRes.data || []);
      const cbList = cashBanksRes.data || [];
      setCashBanks(cbList);
      setBranches(Array.isArray(branchesRes) ? branchesRes : (branchesRes as any)?.data || []);

      // Varsayılan kasa/banka seç
      if (cbList.length > 0 && !cashBankId) {
        setCashBankId(cbList[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Seçili Kasa / Banka
  const selectedCashBank = useMemo(() => {
    return cashBanks.find(cb => cb.id === cashBankId);
  }, [cashBanks, cashBankId]);

  // Seçili Cari
  const selectedContact = useMemo(() => {
    return contacts.find(c => c.id === contactId);
  }, [contacts, contactId]);

  // Filtrelenmiş Cariler (Arama için)
  const filteredContacts = useMemo(() => {
    if (!contactSearch.trim()) return contacts.slice(0, 25);
    const q = contactSearch.toLowerCase();
    return contacts.filter(
      c =>
        c.title.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.taxNumber && c.taxNumber.includes(q))
    ).slice(0, 25);
  }, [contacts, contactSearch]);

  // Otomatik Belge No Önerisi
  useEffect(() => {
    const prefix = movementType === 'TAHSILAT' ? 'THS' : movementType === 'ODEME' ? 'ODM' : 'MAS';
    const rand = Math.floor(1000 + Math.random() * 9000);
    setDocumentNumber(`${prefix}-2026-${rand}`);
  }, [movementType]);

  // Kasa/Banka Filtreleme (Ödeme Yöntemine Göre)
  const availableCashBanks = useMemo(() => {
    if (paymentMethod === 'NAKIT') {
      const cashes = cashBanks.filter(cb => cb.type === 'Cash');
      return cashes.length > 0 ? cashes : cashBanks;
    } else {
      const banks = cashBanks.filter(cb => cb.type === 'Bank');
      return banks.length > 0 ? banks : cashBanks;
    }
  }, [cashBanks, paymentMethod]);

  useEffect(() => {
    if (availableCashBanks.length > 0) {
      if (!availableCashBanks.some(cb => cb.id === cashBankId)) {
        setCashBankId(availableCashBanks[0].id);
      }
    }
  }, [availableCashBanks, cashBankId]);

  if (!isOpen) return null;

  const numAmount = parseFloat(amount) || 0;

  // Yeni Kasa Bakiyesi Simülasyonu
  const simulatedCashBankBalance = selectedCashBank
    ? movementType === 'TAHSILAT'
      ? selectedCashBank.balance + numAmount
      : selectedCashBank.balance - numAmount
    : 0;

  // Yeni Cari Bakiyesi Simülasyonu
  const currentContactBal = selectedContact?.currentBalance || 0;
  const simulatedContactBalance =
    movementType === 'TAHSILAT'
      ? currentContactBal - numAmount
      : currentContactBal + numAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (numAmount <= 0) {
      setError('Lütfen geçerli bir işlem tutarı giriniz (0’dan büyük olmalıdır).');
      return;
    }

    if (!cashBankId) {
      setError('Lütfen işlem yapılacak kasa veya banka hesabını seçiniz.');
      return;
    }

    if (movementType !== 'MASRAF' && !contactId && !customCounterparty.trim()) {
      setError('Lütfen bir cari hesap seçiniz veya muhatap ünvanını giriniz.');
      return;
    }

    if (movementType === 'MASRAF' && !customCounterparty.trim()) {
      setError('Lütfen masrafın ödendiği kişi/firma muhatap bilgisini giriniz.');
      return;
    }

    try {
      setSubmitting(true);

      const contactTitle =
        movementType === 'MASRAF'
          ? customCounterparty.trim()
          : selectedContact
          ? selectedContact.title
          : customCounterparty.trim();

      const targetBranchId =
        selectedBranchId !== 'all'
          ? selectedBranchId
          : selectedCashBank?.branchId || branches[0]?.id;

      const res = await fxApi.createPaymentMovement({
        branchId: targetBranchId,
        movementType,
        paymentMethod,
        contactId: movementType !== 'MASRAF' && selectedContact ? selectedContact.id : undefined,
        contactCode: selectedContact?.code,
        contactTitle,
        cashBankId,
        cashBankName: selectedCashBank?.name || 'Kasa/Banka',
        amount: numAmount,
        currency,
        documentNumber: documentNumber.trim(),
        receiptNumber: receiptNumber.trim() || undefined,
        movementDate: new Date(movementDate).toISOString(),
        dueDate: paymentMethod === 'CEK_SENET' ? dueDate : undefined,
        status: paymentMethod === 'CEK_SENET' ? 'PENDING' : 'COMPLETED',
        description: description.trim(),
        category: movementType === 'MASRAF' ? expenseCategory : undefined,
        chequeInfo:
          paymentMethod === 'CEK_SENET'
            ? {
                serialNumber: chequeSerialNumber.trim() || 'CK-000000',
                bankName: chequeBankName.trim() || 'Banka',
                branchName: chequeBranchName.trim() || undefined,
                drawerName: chequeDrawerName.trim() || contactTitle,
                dueDate,
                isCustomerPortion: movementType === 'TAHSILAT',
              }
            : undefined,
      });

      if (res.success && res.data) {
        if (onSuccess) onSuccess(res.data);
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'İşlem kaydedilirken bir hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-3xl my-6 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* MODAL HEADER */}
        <div className="px-6 py-4 bg-stone-900 text-white flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-inner ${
                movementType === 'TAHSILAT'
                  ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/40'
                  : movementType === 'ODEME'
                  ? 'bg-rose-600/30 text-rose-400 border border-rose-500/40'
                  : 'bg-amber-600/30 text-amber-400 border border-amber-500/40'
              }`}
            >
              {movementType === 'TAHSILAT' ? (
                <ArrowDownLeft className="w-5 h-5" />
              ) : movementType === 'ODEME' ? (
                <ArrowUpRight className="w-5 h-5" />
              ) : (
                <Receipt className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight flex items-center gap-2">
                <span>Yeni Finansal Hareket / Fiş</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-stone-800 text-stone-300 border border-stone-700">
                  {documentNumber}
                </span>
              </h2>
              <p className="text-xs text-stone-400">
                Kasa, banka, cari bakiye ve resmi dekont entegrasyonu
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {/* 1. İŞLEM TÜRÜ SEÇİMİ (3 BÜYÜK KART) */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
              1. İşlem Türü Seçiniz *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* TAHSİLAT */}
              <button
                type="button"
                onClick={() => setMovementType('TAHSILAT')}
                className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                  movementType === 'TAHSILAT'
                    ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'bg-stone-50/60 border-stone-200 hover:bg-stone-100/80 text-stone-600'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    movementType === 'TAHSILAT'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-stone-200 text-stone-600'
                  }`}
                >
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-stone-900">Tahsilat (Giriş)</div>
                  <div className="text-[10px] text-stone-500">Müşteriden alınan para</div>
                </div>
              </button>

              {/* ÖDEME */}
              <button
                type="button"
                onClick={() => setMovementType('ODEME')}
                className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                  movementType === 'ODEME'
                    ? 'bg-rose-50/80 border-rose-500 ring-2 ring-rose-500/20 shadow-xs'
                    : 'bg-stone-50/60 border-stone-200 hover:bg-stone-100/80 text-stone-600'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    movementType === 'ODEME'
                      ? 'bg-rose-600 text-white'
                      : 'bg-stone-200 text-stone-600'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-stone-900">Ödeme (Çıkış)</div>
                  <div className="text-[10px] text-stone-500">Tedarikçiye tediye</div>
                </div>
              </button>

              {/* MASRAF */}
              <button
                type="button"
                onClick={() => setMovementType('MASRAF')}
                className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                  movementType === 'MASRAF'
                    ? 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                    : 'bg-stone-50/60 border-stone-200 hover:bg-stone-100/80 text-stone-600'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    movementType === 'MASRAF'
                      ? 'bg-amber-600 text-white'
                      : 'bg-stone-200 text-stone-600'
                  }`}
                >
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-stone-900">Gider / Masraf</div>
                  <div className="text-[10px] text-stone-500">Kira, elektrik, lojistik</div>
                </div>
              </button>
            </div>
          </div>

          {/* 2. ÖDEME YÖNTEMİ SEÇİMİ */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
              2. Ödeme Aracı / Kanalı *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'BANKA', label: 'Banka (EFT/Havale)', icon: Building },
                { id: 'NAKIT', label: 'Nakit (Kasa)', icon: Wallet },
                { id: 'KREDI_KARTI', label: 'Kredi Kartı (POS)', icon: CreditCard },
                { id: 'CEK_SENET', label: 'Çek / Senet Evrağı', icon: FileText },
              ].map(method => {
                const Icon = method.icon;
                const isSelected = paymentMethod === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id as PaymentMethodType)}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-900 font-bold ring-2 ring-indigo-500/20'
                        : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-indigo-600' : 'text-stone-400'}`} />
                    <span>{method.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. CARİ / MUHATAP VEYA MASRAF KATEGORİSİ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {movementType === 'MASRAF' ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Gider / Masraf Kategorisi *
                  </label>
                  <select
                    value={expenseCategory}
                    onChange={e => setExpenseCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {EXPENSE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Kime / Nereye Ödendi (Muhatap) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Levent Plaza Yönetimi / Aras Kargo"
                    value={customCounterparty}
                    onChange={e => setCustomCounterparty(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </>
            ) : (
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center justify-between">
                  <span>Cari Hesap (Müşteri / Tedarikçi / Bayi) *</span>
                  {selectedContact && (
                    <span className="text-[11px] font-mono text-stone-500">
                      Mevcut Bakiye:{' '}
                      <strong
                        className={
                          (selectedContact.currentBalance || 0) > 0
                            ? 'text-emerald-600 font-bold'
                            : (selectedContact.currentBalance || 0) < 0
                            ? 'text-rose-600 font-bold'
                            : 'text-stone-600'
                        }
                      >
                        ₺{(selectedContact.currentBalance || 0).toLocaleString('tr-TR', {
                          minimumFractionDigits: 2,
                        })}
                      </strong>
                    </span>
                  )}
                </label>

                {/* SEARCHABLE CARİ SELECTOR */}
                <div className="relative">
                  <div
                    onClick={() => setIsContactDropdownOpen(!isContactDropdownOpen)}
                    className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg flex items-center justify-between cursor-pointer hover:border-stone-400"
                  >
                    <span className={selectedContact ? 'font-medium text-stone-900' : 'text-stone-400'}>
                      {selectedContact
                        ? `[${selectedContact.code}] ${selectedContact.title}`
                        : 'Cari hesap seçmek için tıklayınız veya arayınız...'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-stone-400" />
                  </div>

                  {isContactDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl shadow-xl z-30 p-2 max-h-60 overflow-hidden flex flex-col">
                      <div className="relative mb-2">
                        <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
                        <input
                          type="text"
                          autoFocus
                          placeholder="Cari adı, kodu veya vergi no ile ara..."
                          value={contactSearch}
                          onChange={e => setContactSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="overflow-y-auto space-y-1 flex-1">
                        {filteredContacts.map(c => (
                          <div
                            key={c.id}
                            onClick={() => {
                              setContactId(c.id);
                              setIsContactDropdownOpen(false);
                            }}
                            className={`p-2 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-colors ${
                              c.id === contactId
                                ? 'bg-indigo-50 text-indigo-950 font-bold'
                                : 'hover:bg-stone-50 text-stone-700'
                            }`}
                          >
                            <div>
                              <div className="font-semibold">{c.title}</div>
                              <div className="text-[10px] text-stone-400 font-mono">
                                Kod: {c.code} {c.taxOffice ? `• ${c.taxOffice}` : ''}
                              </div>
                            </div>
                            <div className="text-right">
                              <div
                                className={`text-[11px] font-mono font-bold ${
                                  (c.currentBalance || 0) > 0
                                    ? 'text-emerald-600'
                                    : (c.currentBalance || 0) < 0
                                    ? 'text-rose-600'
                                    : 'text-stone-500'
                                }`}
                              >
                                ₺{(c.currentBalance || 0).toLocaleString('tr-TR', {
                                  minimumFractionDigits: 2,
                                })}
                              </div>
                              <div className="text-[9px] text-stone-400">
                                {(c.currentBalance || 0) > 0
                                  ? 'Alacaklı'
                                  : (c.currentBalance || 0) < 0
                                  ? 'Borçlu'
                                  : 'Sıfır'}
                              </div>
                            </div>
                          </div>
                        ))}

                        {filteredContacts.length === 0 && (
                          <div className="p-3 text-center text-xs text-stone-400">
                            Aramaya uygun cari bulunamadı.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 4. KASA / BANKA SEÇİMİ VE TUTAR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* KASA / BANKA HESABI */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center justify-between">
                <span>İşlem Yapılacak Kasa / Banka Hesabı *</span>
                {selectedCashBank && (
                  <span className="text-[11px] font-mono text-indigo-600 font-bold">
                    Mevcut: ₺{selectedCashBank.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </span>
                )}
              </label>
              <select
                value={cashBankId}
                onChange={e => setCashBankId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
              >
                {availableCashBanks.map(cb => (
                  <option key={cb.id} value={cb.id}>
                    {cb.type === 'Cash' ? '💵 [Nakit Kasa] ' : '🏦 [Banka] '}
                    {cb.name} — ₺{cb.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </option>
                ))}
              </select>
            </div>

            {/* TUTAR VE PARA BİRİMİ */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                İşlem Tutarı *
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 text-sm font-bold font-mono bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-stone-900"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-stone-400 font-bold">
                    {currency === 'TRY' ? '₺' : currency === 'USD' ? '$' : '€'}
                  </span>
                </div>

                <select
                  value={currency}
                  onChange={e => setCurrency(e.target.value as any)}
                  className="px-2.5 py-2 text-xs font-bold bg-stone-100 border border-stone-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="TRY">TRY (₺)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
            </div>
          </div>

          {/* 5. TARİH, BELGE NO VE MAKBUZ */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                İşlem Tarihi & Saati *
              </label>
              <input
                type="datetime-local"
                required
                value={movementDate}
                onChange={e => setMovementDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Fiş / Belge No *
              </label>
              <input
                type="text"
                required
                value={documentNumber}
                onChange={e => setDocumentNumber(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Resmi Makbuz / Dekont No
              </label>
              <input
                type="text"
                placeholder="Örn: MK-2026/8943"
                value={receiptNumber}
                onChange={e => setReceiptNumber(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
          </div>

          {/* 6. ÇEK / SENET DETAYLARI (KOŞULLU) */}
          {paymentMethod === 'CEK_SENET' && (
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                <FileText className="w-4 h-4 text-amber-600" />
                <span>Çek / Senet Evrak Detayları</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                    Çek Seri Numarası *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: CK-991823"
                    value={chequeSerialNumber}
                    onChange={e => setChequeSerialNumber(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-amber-300 rounded-lg font-mono focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                    Keşideci (Çeki Düzenleyen) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Firma / Şahıs Adı"
                    value={chequeDrawerName}
                    onChange={e => setChequeDrawerName(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                    Çek Bankası & Şubesi
                  </label>
                  <input
                    type="text"
                    placeholder="Örn: Garanti BBVA / Levent"
                    value={chequeBankName}
                    onChange={e => setChequeBankName(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                    Vade Tarihi *
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-amber-300 rounded-lg font-mono focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 7. AÇIKLAMA */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              İşlem Açıklaması / Notlar
            </label>
            <input
              type="text"
              placeholder="Örn: Fatura no 2026-0042 ye istinaden yapılan tahsilat"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* 8. CANLI BAKİYE ETKİ ÖNİZLEME KUTUSU */}
          {numAmount > 0 && selectedCashBank && (
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs space-y-1.5">
              <div className="font-bold text-stone-800 flex items-center gap-1.5 text-[11px]">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Finansal Etki Simülasyonu</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-stone-600">
                <div className="p-2 bg-white rounded-lg border border-stone-200/80">
                  <div className="text-[10px] text-stone-400">Kasa / Banka Değişimi:</div>
                  <div className="font-mono text-[11px]">
                    {selectedCashBank.name}:{' '}
                    <span className="line-through text-stone-400">
                      ₺{selectedCashBank.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </span>{' '}
                    &rarr;{' '}
                    <strong
                      className={
                        movementType === 'TAHSILAT' ? 'text-emerald-600 font-bold' : 'text-stone-900 font-bold'
                      }
                    >
                      ₺{simulatedCashBankBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                </div>

                {selectedContact && (
                  <div className="p-2 bg-white rounded-lg border border-stone-200/80">
                    <div className="text-[10px] text-stone-400">Cari Bakiye Değişimi:</div>
                    <div className="font-mono text-[11px]">
                      {selectedContact.title.slice(0, 20)}...:{' '}
                      <span className="line-through text-stone-400">
                        ₺{currentContactBal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </span>{' '}
                      &rarr;{' '}
                      <strong className="text-stone-900 font-bold">
                        ₺{simulatedContactBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* FOOTER ACTIONS */}
          <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-5 py-2 text-xs font-bold text-white rounded-lg transition-all shadow-md flex items-center gap-2 cursor-pointer ${
                movementType === 'TAHSILAT'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  : movementType === 'ODEME'
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                  : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{submitting ? 'Kaydediliyor...' : 'Hareketi Onayla & Kaydet'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

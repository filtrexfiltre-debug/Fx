import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Check,
  Building2,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
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
  Percent,
  ShieldAlert,
  FileSpreadsheet,
  CheckCircle2,
} from 'lucide-react';
import {
  RevenueExpenseItem,
  RevenueExpenseType,
  RevenueExpenseCategory,
  RevenueExpenseDocumentType,
  RevenueExpensePaymentStatus,
  RevenueExpensePaymentMethod,
  Contact,
  CashBank,
  Branch,
  RevenueExpenseCategoryItem,
} from '../../types/fx';
import { fxApi, branchContext } from '../../services/api';

interface NewGelirGiderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (item: RevenueExpenseItem) => void;
  initialType?: RevenueExpenseType;
  selectedBranchId: string;
  categories?: RevenueExpenseCategoryItem[];
}

const INCOME_CATEGORIES: { name: RevenueExpenseCategory; code: string; defaultVat: number }[] = [
  { name: 'Ticari Mal Satış Geliri', code: '600.01.001', defaultVat: 20 },
  { name: 'Hizmet & Proje Geliri', code: '600.02.001', defaultVat: 20 },
  { name: 'Danışmanlık & Lisans Geliri', code: '600.03.001', defaultVat: 20 },
  { name: 'Kira & Gayrimenkul Geliri', code: '649.01.001', defaultVat: 20 },
  { name: 'Mevduat Faizi & Repo Geliri', code: '642.01.001', defaultVat: 0 },
  { name: 'Kambiyo & Kur Farkı Geliri', code: '646.01.001', defaultVat: 0 },
  { name: 'Komisyon & Aracılık Geliri', code: '643.01.001', defaultVat: 20 },
  { name: 'Devlet Teşvik, Hibe & İndirim Geliri', code: '602.01.001', defaultVat: 0 },
  { name: 'Diğer Olağandışı Gelir & Kâr', code: '679.01.001', defaultVat: 20 },
];

const EXPENSE_CATEGORIES: { name: RevenueExpenseCategory; code: string; defaultVat: number; isKkegLikely?: boolean }[] = [
  { name: 'Kira & Stopaj Gideri', code: '770.01.001', defaultVat: 0 },
  { name: 'Elektrik, Su, Doğalgaz & Enerji', code: '770.02.001', defaultVat: 20 },
  { name: 'Personel Maaş & SGK & Prim', code: '770.01.002', defaultVat: 0 },
  { name: 'Yemek, Servis & Personel Ulaşım', code: '770.01.005', defaultVat: 10 },
  { name: 'Pazarlama, Reklam & Fuar', code: '760.02.001', defaultVat: 20 },
  { name: 'Lojistik, Kargo & Nakliye', code: '760.01.002', defaultVat: 20 },
  { name: 'İletişim, İnternet & GSM', code: '770.04.001', defaultVat: 20 },
  { name: 'Muhasebe, Mali Müşavir & Denetim', code: '770.03.001', defaultVat: 20 },
  { name: 'Yazılım, Bulut Sunucu & Lisans', code: '770.04.002', defaultVat: 20 },
  { name: 'Ofis Kırtasiye, Sarf & Temizlik', code: '770.05.001', defaultVat: 20 },
  { name: 'Bina Bakım, Onarım & Tadilat', code: '770.06.001', defaultVat: 20 },
  { name: 'Banka POS Komisyonu & Hesap Masrafı', code: '780.01.001', defaultVat: 0 },
  { name: 'Kredi Faizi & Finansman Gideri', code: '780.02.001', defaultVat: 0 },
  { name: 'Resmi Harç, Noter & Damga Vergisi', code: '770.07.001', defaultVat: 0 },
  { name: 'Kanunen Kabul Edilmeyen Gider (KKEG)', code: '689.01.001', defaultVat: 0, isKkegLikely: true },
  { name: 'Diğer Faaliyet Masraf & Gideri', code: '770.99.001', defaultVat: 20 },
];

export const NewGelirGiderModal: React.FC<NewGelirGiderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialType = 'GELIR',
  selectedBranchId,
  categories,
}) => {
  const [type, setType] = useState<RevenueExpenseType>(initialType);

  // Dinamik Kategori Listesi
  const activeCategories = useMemo(() => {
    if (categories && categories.length > 0) {
      const filtered = categories.filter(c => c.type === type);
      if (filtered.length > 0) {
        return filtered.map(c => ({
          name: c.name as RevenueExpenseCategory,
          code: c.code,
          defaultVat: c.defaultVat,
          isKkegLikely: c.isKkegLikely,
        }));
      }
    }
    return type === 'GELIR' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  }, [categories, type]);

  const [documentType, setDocumentType] = useState<RevenueExpenseDocumentType>('E_FATURA');
  const [documentNumber, setDocumentNumber] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [subCategory, setSubCategory] = useState<string>('');
  const [accountingCode, setAccountingCode] = useState<string>('');
  
  // Cari ve Kasa
  const [contactId, setContactId] = useState<string>('');
  const [contactSearch, setContactSearch] = useState<string>('');
  const [isContactDropdownOpen, setIsContactDropdownOpen] = useState<boolean>(false);
  const [cashBankId, setCashBankId] = useState<string>('');
  const [targetBranchId, setTargetBranchId] = useState<string>(selectedBranchId);
  
  // Finansal Değerler
  const [baseAmount, setBaseAmount] = useState<number>(0);
  const [vatRate, setVatRate] = useState<number>(20);
  const [stoppageRate, setStoppageRate] = useState<number>(0);
  const [withholdingFraction, setWithholdingFraction] = useState<number>(0); // 0, 0.2, 0.5, 0.7, 0.9
  const [currency, setCurrency] = useState<string>('TRY');
  const [isKKEG, setIsKKEG] = useState<boolean>(false);

  // Tarih ve Durum
  const [transactionDate, setTransactionDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<RevenueExpensePaymentStatus>('PAID');
  const [paymentMethod, setPaymentMethod] = useState<RevenueExpensePaymentMethod>('HAVALE_EFT');
  const [description, setDescription] = useState<string>('');

  // Yardımcı Veriler
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [cashBanks, setCashBanks] = useState<CashBank[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Modal açıldığında başlangıç değerlerini hazırla
  useEffect(() => {
    if (isOpen) {
      setType(initialType);
      const defaultCategories = initialType === 'GELIR' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
      const initialCat = defaultCategories[0];
      setCategory(initialCat.name);
      setAccountingCode(initialCat.code);
      setVatRate(initialCat.defaultVat);
      setStoppageRate(0);
      setWithholdingFraction(0);
      setIsKKEG(false);
      setBaseAmount(0);
      setTitle('');
      setSubCategory('');
      setDescription('');
      setDueDate('');
      setPaymentStatus('PAID');
      setPaymentMethod('HAVALE_EFT');
      setTransactionDate(new Date().toISOString().slice(0, 10));
      
      const randomDocNum = `GIB${new Date().getFullYear()}${Math.floor(10000000 + Math.random() * 90000000)}`;
      setDocumentNumber(randomDocNum);

      let effectiveBranch = selectedBranchId;
      if (!effectiveBranch || effectiveBranch === 'all') {
        effectiveBranch = branchContext.getSelectedBranchId();
        if (effectiveBranch === 'all') effectiveBranch = 'b1111111-1111-1111-1111-111111111111';
      }
      setTargetBranchId(effectiveBranch);

      loadResources(effectiveBranch);
    }
  }, [isOpen, initialType, selectedBranchId]);

  const loadResources = async (branchId: string) => {
    try {
      const [contRes, cbRes, brRes] = await Promise.all([
        fxApi.getContacts(),
        fxApi.getCashBanks(branchId === 'all' ? undefined : branchId),
        fxApi.getBranches(),
      ]);
      setContacts(contRes.data || []);
      const availableCB = cbRes.data || [];
      setCashBanks(availableCB);
      if (availableCB.length > 0) {
        setCashBankId(availableCB[0].id);
      }
      setBranches(Array.isArray(brRes) ? brRes : (brRes as any)?.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  // Tür değiştiğinde kategori listesini ve varsayılanları güncelle
  const handleTypeChange = (newType: RevenueExpenseType) => {
    setType(newType);
    let list = newType === 'GELIR' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    if (categories && categories.length > 0) {
      const filtered = categories.filter(c => c.type === newType);
      if (filtered.length > 0) {
        list = filtered.map(c => ({
          name: c.name as RevenueExpenseCategory,
          code: c.code,
          defaultVat: c.defaultVat,
          isKkegLikely: c.isKkegLikely,
        }));
      }
    }
    setCategory(list[0].name);
    setAccountingCode(list[0].code);
    setVatRate(list[0].defaultVat);
    setStoppageRate(0);
    setWithholdingFraction(0);
    setIsKKEG(false);
  };

  // Kategori değiştiğinde hesap kodu ve varsayılan KDV'yi güncelle
  const handleCategoryChange = (catName: string) => {
    setCategory(catName);
    const found = activeCategories.find(item => item.name === catName);
    if (found) {
      setAccountingCode(found.code);
      setVatRate(found.defaultVat);
      if ('isKkegLikely' in found && found.isKkegLikely) {
        setIsKKEG(true);
      }
    }
  };

  // Vergi ve Genel Toplam Hesaplamaları
  const financialTotals = useMemo(() => {
    const base = Number(baseAmount) || 0;
    const vat = Math.round(base * (vatRate / 100) * 100) / 100;
    const stoppage = Math.round(base * (stoppageRate / 100) * 100) / 100;
    const withholding = Math.round(vat * withholdingFraction * 100) / 100;

    // Genel Toplam:
    // Gelir ise: Matrah + KDV - Tevkifat (Müşteriden tahsil edilecek tutar)
    // Gider ise: Matrah + KDV - Tevkifat - Stopaj (Tedarikçiye / mülk sahibine ödenecek net tutar)
    let grand = base + vat - withholding;
    if (type === 'GIDER' && stoppageRate > 0) {
      grand = base + vat - stoppage - withholding;
    }

    grand = Math.max(0, Math.round(grand * 100) / 100);

    return {
      baseAmount: base,
      vatAmount: vat,
      stoppageAmount: stoppage,
      withholdingAmount: withholding,
      grandTotal: grand,
      kkegAmount: isKKEG ? grand : 0,
    };
  }, [baseAmount, vatRate, stoppageRate, withholdingFraction, type, isKKEG]);

  // Filtrelenmiş Cariler
  const filteredContacts = useMemo(() => {
    if (!contactSearch.trim()) return contacts.slice(0, 10);
    const q = contactSearch.toLowerCase();
    return contacts.filter(
      c => c.title.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.taxNumber?.includes(q)
    );
  }, [contacts, contactSearch]);

  const selectedContact = useMemo(() => {
    return contacts.find(c => c.id === contactId);
  }, [contacts, contactId]);

  // Form Gönderme
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (financialTotals.baseAmount <= 0) {
      setError('Lütfen sıfırdan büyük geçerli bir matrah tutarı giriniz.');
      return;
    }

    if (!title.trim()) {
      setError('Lütfen işlem adı veya açıklama başlığı giriniz.');
      return;
    }

    if (!documentNumber.trim()) {
      setError('Lütfen belge / fatura numarasını belirtiniz.');
      return;
    }

    const selectedCB = cashBanks.find(cb => cb.id === cashBankId);

    setIsSubmitting(true);
    try {
      const payload: Omit<RevenueExpenseItem, 'id' | 'createdAt' | 'tenantId'> = {
        branchId: targetBranchId,
        type,
        itemCode: '',
        title: title.trim(),
        category,
        subCategory: subCategory.trim() || undefined,
        documentType,
        documentNumber: documentNumber.trim(),
        transactionDate,
        dueDate: dueDate || undefined,
        contactId: selectedContact?.id,
        contactTitle: selectedContact?.title,
        contactCode: selectedContact?.code,
        cashBankId: selectedCB?.id,
        cashBankName: selectedCB?.name,
        paymentStatus,
        paymentMethod,
        currency,
        baseAmount: financialTotals.baseAmount,
        vatRate,
        vatAmount: financialTotals.vatAmount,
        stoppageRate: stoppageRate > 0 ? stoppageRate : undefined,
        stoppageAmount: financialTotals.stoppageAmount > 0 ? financialTotals.stoppageAmount : undefined,
        withholdingRate: withholdingFraction > 0 ? withholdingFraction : undefined,
        withholdingAmount: financialTotals.withholdingAmount > 0 ? financialTotals.withholdingAmount : undefined,
        grandTotal: financialTotals.grandTotal,
        isKKEG,
        kkegAmount: financialTotals.kkegAmount > 0 ? financialTotals.kkegAmount : undefined,
        accountingCode: accountingCode.trim() || undefined,
        description: description.trim() || title.trim(),
      };

      const res = await fxApi.createRevenueExpense(payload);
      if (res.success && res.data) {
        if (onSuccess) onSuccess(res.data);
        onClose();
      } else {
        setError(res.message || 'Kayıt sırasında hata oluştu.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Gelir/Gider fişi kaydedilemedi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* MODAL BAŞLIĞI */}
        <div className="px-6 py-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold shadow-xs ${
                type === 'GELIR' ? 'bg-emerald-600' : 'bg-rose-600'
              }`}
            >
              {type === 'GELIR' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 tracking-tight">
                {type === 'GELIR' ? 'Yeni Gelir Fişi Oluştur' : 'Yeni Gider / Masraf Fişi Oluştur'}
              </h2>
              <p className="text-xs text-stone-500">
                Tek Düzen Hesap Planı (TDHP) ve VUK mevzuatına tam uyumlu fiş kaydı
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FORM GÖVDESİ */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. TÜR SEÇİMİ (GELİR VS GİDER) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">İşlem Türü</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleTypeChange('GELIR')}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  type === 'GELIR'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-400 ring-2 ring-emerald-200 shadow-2xs'
                    : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                }`}
              >
                <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                <span>GELİR (Satış & Tahakkuk)</span>
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange('GIDER')}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  type === 'GIDER'
                    ? 'bg-rose-50 text-rose-800 border-rose-400 ring-2 ring-rose-200 shadow-2xs'
                    : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-rose-600" />
                <span>GİDER & MASRAF (Tediye)</span>
              </button>
            </div>
          </div>

          {/* 2. ŞUBE SEÇİMİ & BELGE BİLGİLERİ */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">Kayıt Edilecek Şube</label>
              <select
                value={targetBranchId}
                onChange={e => {
                  setTargetBranchId(e.target.value);
                  loadResources(e.target.value);
                }}
                className="w-full text-xs px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:bg-white"
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">Belge Türü</label>
              <select
                value={documentType}
                onChange={e => setDocumentType(e.target.value as RevenueExpenseDocumentType)}
                className="w-full text-xs px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:bg-white"
              >
                <option value="E_FATURA">E-Fatura (Ticari / Temel)</option>
                <option value="E_ARSIV">E-Arşiv Fatura</option>
                <option value="SMM">Serbest Meslek Makbuzu (SMM)</option>
                <option value="PERAKENDE_FIS">Perakende Satış Fişi / ÖKC</option>
                <option value="BANKA_DEKONTU">Banka Dekontu</option>
                <option value="GIDER_PUSULASI">Gider Pusulası</option>
                <option value="DIGER_BELGE">Diğer Resmi Belge</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">Belge / Fatura No *</label>
              <input
                type="text"
                required
                value={documentNumber}
                onChange={e => setDocumentNumber(e.target.value)}
                placeholder="Örn: GIB202600000189"
                className="w-full text-xs px-3 py-2 font-mono bg-white border border-stone-200 rounded-lg focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          {/* 3. BAŞLIK & KATEGORİ & MUHASEBE KODU */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-stone-700 block mb-1">İşlem Başlığı / Açıklama *</label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={type === 'GELIR' ? 'Örn: Kurumsal Filtre Satışı Faturası' : 'Örn: Mart 2026 Ofis Elektrik Faturası'}
                className="w-full text-xs px-3 py-2 bg-white border border-stone-200 rounded-lg focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">Alt Kategori (Opsiyonel)</label>
              <input
                type="text"
                value={subCategory}
                onChange={e => setSubCategory(e.target.value)}
                placeholder="Örn: Fabrika HVAC Filtresi"
                className="w-full text-xs px-3 py-2 bg-white border border-stone-200 rounded-lg focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">Muhasebe / Faaliyet Kategorisi</label>
              <select
                value={category}
                onChange={e => handleCategoryChange(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:bg-white font-medium text-stone-800"
              >
                {activeCategories.map(c => (
                  <option key={c.name} value={c.name}>
                    {c.name} ({c.code.split(' ')[0]})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">TDHP Hesap Kodu</label>
              <input
                type="text"
                value={accountingCode}
                onChange={e => setAccountingCode(e.target.value)}
                placeholder="Örn: 600.01.001 veya 770.02.001"
                className="w-full text-xs px-3 py-2 font-mono bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:bg-white"
              />
            </div>
          </div>

          {/* 4. CARİ VE KASA/BANKA HESABI SEÇİMİ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <label className="text-xs font-semibold text-stone-700 block mb-1">İlişkili Cari (Müşteri / Tedarikçi)</label>
              <div className="relative">
                <input
                  type="text"
                  value={contactSearch || selectedContact?.title || ''}
                  onChange={e => {
                    setContactSearch(e.target.value);
                    setIsContactDropdownOpen(true);
                  }}
                  onFocus={() => setIsContactDropdownOpen(true)}
                  placeholder="Cari Ara (Ünvan, VKN veya Kod)..."
                  className="w-full text-xs px-3 py-2 pr-8 bg-white border border-stone-200 rounded-lg focus:ring-2 focus:ring-indigo-400"
                />
                {selectedContact && (
                  <button
                    type="button"
                    onClick={() => {
                      setContactId('');
                      setContactSearch('');
                    }}
                    className="absolute right-2 top-2 text-stone-400 hover:text-stone-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {isContactDropdownOpen && (
                <div className="absolute left-0 right-0 z-20 mt-1 max-h-48 overflow-y-auto bg-white border border-stone-200 rounded-xl shadow-lg text-xs">
                  <div
                    onClick={() => {
                      setContactId('');
                      setContactSearch('');
                      setIsContactDropdownOpen(false);
                    }}
                    className="p-2 hover:bg-stone-50 text-stone-500 cursor-pointer border-b border-stone-100"
                  >
                    -- Cari Bağlantısı Yok (Münferit Harcama / Gelir) --
                  </div>
                  {filteredContacts.map(c => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setContactId(c.id);
                        setContactSearch('');
                        setIsContactDropdownOpen(false);
                      }}
                      className="p-2 hover:bg-indigo-50 cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold text-stone-800">{c.title}</span>
                        <span className="text-[10px] text-stone-400 font-mono">
                          {c.code} &bull; VKN: {c.taxNumber || '-'}
                        </span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-600">
                        {(c as any).city || 'Şehir Yok'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">Kasa / Banka Hesabı</label>
              <select
                value={cashBankId}
                onChange={e => setCashBankId(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:bg-white"
              >
                {cashBanks.map(cb => (
                  <option key={cb.id} value={cb.id}>
                    {cb.name} ({(cb as any).currency || 'TRY'} - Bakiye: ₺{cb.balance.toLocaleString('tr-TR')})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 5. FİNANSAL DEĞERLER (MATRAH, KDV, STOPAJ, TEVKİFAT) */}
          <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-2">
              <span className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-indigo-600" />
                <span>Matrah ve Vergi Dağılımı (TL)</span>
              </span>
              <span className="text-[11px] text-stone-500 font-mono">VUK & KDV Kanunu Esaslı</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-bold text-stone-900 block mb-1">Matrah (KDV Hariç) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={baseAmount || ''}
                  onChange={e => setBaseAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full text-xs px-3 py-2 font-mono font-bold text-indigo-900 bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">KDV Oranı</label>
                <select
                  value={vatRate}
                  onChange={e => setVatRate(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 bg-white border border-stone-200 rounded-lg focus:ring-2 focus:ring-indigo-400"
                >
                  <option value={0}>%0 (İstisna / Muaf)</option>
                  <option value={1}>%1 (Temel İhtiyaç)</option>
                  <option value={10}>%10 (Gıda / Hizmet)</option>
                  <option value={20}>%20 (Standart KDV)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Stopaj Oranı</label>
                <select
                  value={stoppageRate}
                  onChange={e => setStoppageRate(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 bg-white border border-stone-200 rounded-lg focus:ring-2 focus:ring-indigo-400"
                >
                  <option value={0}>%0 (Yok)</option>
                  <option value={10}>%10</option>
                  <option value={20}>%20 (Kira / SMM Stopajı)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">KDV Tevkifatı</label>
                <select
                  value={withholdingFraction}
                  onChange={e => setWithholdingFraction(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 bg-white border border-stone-200 rounded-lg focus:ring-2 focus:ring-indigo-400"
                >
                  <option value={0}>Tevkifat Yok</option>
                  <option value={0.2}>2/10 Tevkifat</option>
                  <option value={0.5}>5/10 Tevkifat</option>
                  <option value={0.7}>7/10 Tevkifat</option>
                  <option value={0.9}>9/10 Tevkifat</option>
                </select>
              </div>
            </div>

            {/* HESAPLANAN DÖKÜM KARTI */}
            <div className="p-3 bg-white border border-stone-200 rounded-lg grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div>
                <span className="text-stone-400 block text-[10px]">KDV Tutarı:</span>
                <span className="font-bold text-stone-800">
                  ₺{financialTotals.vatAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              {stoppageRate > 0 && (
                <div>
                  <span className="text-stone-400 block text-[10px]">Stopaj Kesintisi:</span>
                  <span className="font-bold text-amber-700">
                    -₺{financialTotals.stoppageAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              {withholdingFraction > 0 && (
                <div>
                  <span className="text-stone-400 block text-[10px]">Tevkifat Tutarı:</span>
                  <span className="font-bold text-indigo-700">
                    -₺{financialTotals.withholdingAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              <div className="col-span-2 sm:col-span-1 border-t sm:border-t-0 sm:border-l border-stone-200 pt-2 sm:pt-0 sm:pl-3">
                <span className="text-stone-500 block text-[10px] font-bold">GENEL TOPLAM:</span>
                <span className={`text-base font-black ${type === 'GELIR' ? 'text-emerald-700' : 'text-stone-900'}`}>
                  ₺{financialTotals.grandTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* KKEG (Kanunen Kabul Edilmeyen Gider) ONAYI */}
            {type === 'GIDER' && (
              <label className="flex items-center gap-2 p-2 rounded-lg bg-amber-50/70 border border-amber-200 text-xs text-amber-900 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isKKEG}
                  onChange={e => setIsKKEG(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Kanunen Kabul Edilmeyen Gider (KKEG)</strong> - Ticari kazançtan indirilemez, dönem sonu matraha ilave edilir.
                </span>
              </label>
            )}
          </div>

          {/* 6. TARİH, VADE VE ÖDEME DURUMU */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">İşlem / Belge Tarihi *</label>
              <input
                type="date"
                required
                value={transactionDate}
                onChange={e => setTransactionDate(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white border border-stone-200 rounded-lg focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">Vade Tarihi (Opsiyonel)</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white border border-stone-200 rounded-lg focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">Ödeme Durumu</label>
              <select
                value={paymentStatus}
                onChange={e => setPaymentStatus(e.target.value as RevenueExpensePaymentStatus)}
                className="w-full text-xs px-3 py-2 bg-white border border-stone-200 rounded-lg focus:ring-2 focus:ring-indigo-400 font-semibold"
              >
                <option value="PAID">{type === 'GELIR' ? 'Tahsil Edildi (Peşin)' : 'Ödendi (Peşin)'}</option>
                <option value="PENDING">Beklemede (Vadeli / Açık Hesap)</option>
                <option value="CANCELLED">İptal Edildi</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">Ödeme Yöntemi</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as RevenueExpensePaymentMethod)}
                className="w-full text-xs px-3 py-2 bg-white border border-stone-200 rounded-lg focus:ring-2 focus:ring-indigo-400"
              >
                <option value="HAVALE_EFT">Banka Havalesi / EFT</option>
                <option value="NAKIT">Nakit Kasa</option>
                <option value="KREDI_KARTI">Kredi Kartı / POS</option>
                <option value="CEK_SENET">Çek / Senet</option>
                <option value="ACIK_HESAP">Açık Hesap (Cari Mahsup)</option>
              </select>
            </div>
          </div>

          {/* 7. DETAYLI AÇIKLAMA */}
          <div>
            <label className="text-xs font-semibold text-stone-700 block mb-1">Detaylı Fiş Notu ve İzahı</label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="İşlem hakkında muhasebe ve denetim amaçlı not ekleyin..."
              className="w-full text-xs px-3 py-2 bg-white border border-stone-200 rounded-lg focus:ring-2 focus:ring-indigo-400 resize-none"
            />
          </div>

          {/* MODAL FOOTER */}
          <div className="pt-3 border-t border-stone-200 flex items-center justify-between">
            <div className="text-xs text-stone-500">
              {paymentStatus === 'PAID' && (
                <span className="text-emerald-700 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Kasa/Banka bakiyesi anında güncellenecektir.
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
              >
                Vazgeç
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-5 py-2 text-xs font-bold text-white rounded-lg transition-all shadow-xs cursor-pointer flex items-center gap-1.5 ${
                  type === 'GELIR'
                    ? 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400'
                    : 'bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>{isSubmitting ? 'Kaydediliyor...' : type === 'GELIR' ? 'Gelir Fişini Kaydet' : 'Gider Fişini Kaydet'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

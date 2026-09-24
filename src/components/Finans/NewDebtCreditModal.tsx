import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  Building,
  FileText,
  CreditCard,
  Wallet,
  AlertCircle,
  Clock,
  Coins,
  CheckCircle2,
  Paperclip,
  UploadCloud,
  FileSpreadsheet,
} from 'lucide-react';
import {
  Contact,
  CashBank,
  DebtCreditType,
  DebtCreditDocumentType,
  PaymentMethodType,
} from '../../types/fx';
import { fxApi } from '../../services/api';

interface NewDebtCreditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialType?: DebtCreditType;
  contacts: Contact[];
  cashBanks: CashBank[];
  currentBranchId: string;
  currentBranchName?: string;
}

export const NewDebtCreditModal: React.FC<NewDebtCreditModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialType = 'ALACAK',
  contacts,
  cashBanks,
  currentBranchId,
  currentBranchName,
}) => {
  const [type, setType] = useState<DebtCreditType>(initialType);
  const [contactId, setContactId] = useState<string>('');
  const [customContactTitle, setCustomContactTitle] = useState<string>('');
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [vatRate, setVatRate] = useState<number>(20);
  const [documentNumber, setDocumentNumber] = useState<string>('');
  const [documentType, setDocumentType] = useState<DebtCreditDocumentType>('E_FATURA');
  const [issueDate, setIssueDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Peşin Tahsilat / Ödeme Bölümü
  const [hasImmediatePayment, setHasImmediatePayment] = useState<boolean>(false);
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [cashBankId, setCashBankId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('BANKA');

  // Dosya eki simülasyonu
  const [attachedFileName, setAttachedFileName] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Modal açıldığında varsayılanları hazırla
  useEffect(() => {
    if (isOpen) {
      setType(initialType);
      const today = new Date().toISOString().slice(0, 10);
      setIssueDate(today);

      // Varsayılan vade: 30 gün sonra
      const in30Days = new Date();
      in30Days.setDate(in30Days.getDate() + 30);
      setDueDate(in30Days.toISOString().slice(0, 10));

      const randNum = Math.floor(100000 + Math.random() * 900000);
      setDocumentNumber(`FAT-2026-${randNum}`);

      if (cashBanks.length > 0) {
        setCashBankId(cashBanks[0].id);
      }
      setTotalAmount('');
      setPaidAmount('');
      setHasImmediatePayment(false);
      setError(null);
      setAttachedFileName('');
      setCategory(initialType === 'ALACAK' ? 'Ticari Mal / Ürün Satışı' : 'Hammadde / Mal Alımı');
      setDescription('');
      setNotes('');
    }
  }, [isOpen, initialType, cashBanks]);

  if (!isOpen) return null;

  // Hızlı Vade Butonları
  const applyQuickDueDate = (days: number) => {
    const base = issueDate ? new Date(issueDate) : new Date();
    base.setDate(base.getDate() + days);
    setDueDate(base.toISOString().slice(0, 10));
  };

  // Matrah ve KDV Hesaplama
  const numericTotal = parseFloat(totalAmount) || 0;
  const calculatedVat = vatRate > 0 ? (numericTotal * vatRate) / (100 + vatRate) : 0;
  const calculatedBase = numericTotal - calculatedVat;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (numericTotal <= 0) {
      setError('Lütfen geçerli bir işlem tutarı giriniz.');
      return;
    }

    if (!contactId && !customContactTitle.trim()) {
      setError('Lütfen bir cari seçiniz veya cari ünvanı belirtiniz.');
      return;
    }

    if (!documentNumber.trim()) {
      setError('Lütfen belge / fatura numarasını giriniz.');
      return;
    }

    if (!dueDate) {
      setError('Lütfen bir vade tarihi belirleyiniz.');
      return;
    }

    const numericPaid = hasImmediatePayment ? parseFloat(paidAmount) || 0 : 0;
    if (hasImmediatePayment) {
      if (numericPaid <= 0) {
        setError('Lütfen geçerli bir peşinat / ödeme tutarı giriniz.');
        return;
      }
      if (numericPaid > numericTotal) {
        setError('Ödenen tutar toplam işlem tutarından büyük olamaz.');
        return;
      }
      if (!cashBankId) {
        setError('Lütfen tahsilat/ödemenin yapılacağı Kasa veya Banka hesabını seçiniz.');
        return;
      }
    }

    let resolvedContactTitle = customContactTitle.trim();
    if (contactId) {
      const found = contacts.find(c => c.id === contactId);
      if (found) resolvedContactTitle = found.title;
    }

    try {
      setLoading(true);
      await fxApi.createDebtCredit({
        type,
        contactId,
        contactTitle: resolvedContactTitle,
        totalAmount: numericTotal,
        paidAmount: numericPaid,
        issueDate,
        dueDate,
        documentNumber: documentNumber.trim(),
        documentType,
        vatRate,
        description: description.trim() || `${type === 'ALACAK' ? 'Alacak' : 'Borç'} - ${resolvedContactTitle}`,
        category: category.trim() || undefined,
        notes: notes.trim() || undefined,
        branchId: currentBranchId,
        cashBankId: hasImmediatePayment ? cashBankId : undefined,
        paymentMethod: hasImmediatePayment ? paymentMethod : undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Kayıt oluşturma hatası:', err);
      setError(err?.message || 'Kayıt sırasında beklenmeyen bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const selectedContact = contacts.find(c => c.id === contactId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden my-6">
        {/* Başlık Barı */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-xs ${
                type === 'ALACAK' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
              }`}
            >
              {type === 'ALACAK' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900">
                {type === 'ALACAK' ? 'Yeni Müşteri Alacak Kaydı (Satış)' : 'Yeni Tedarikçi Borç Kaydı (Alım)'}
              </h2>
              <p className="text-xs text-stone-500">
                {currentBranchName || 'Seçili Şube'} • Faturalı ve vadeli finansal kayıt oluşturma
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

        {/* Form Alanı */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* İşlem Türü Seçimi (Segmented Buttons) */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
              İşlem Yönü & Türü
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setType('ALACAK');
                  if (!category || category === 'Hammadde / Mal Alımı') setCategory('Ticari Mal / Ürün Satışı');
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-semibold text-sm border transition-all ${
                  type === 'ALACAK'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-200'
                    : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                <ArrowDownLeft className={`w-4 h-4 ${type === 'ALACAK' ? 'text-emerald-600' : 'text-stone-400'}`} />
                <span>Alacak Kaydı (Bize Ödenecek)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('BORC');
                  if (!category || category === 'Ticari Mal / Ürün Satışı') setCategory('Hammadde / Mal Alımı');
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-semibold text-sm border transition-all ${
                  type === 'BORC'
                    ? 'bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-200'
                    : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                <ArrowUpRight className={`w-4 h-4 ${type === 'BORC' ? 'text-rose-600' : 'text-stone-400'}`} />
                <span>Borç Kaydı (Bizim Ödeyeceğimiz)</span>
              </button>
            </div>
          </div>

          {/* 2 Sütunlu Form Gövdesi */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* SOL SÜTUN: Cari ve Tutar */}
            <div className="space-y-4">
              {/* Cari Seçimi */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Cari Firma / Şahıs <span className="text-rose-500">*</span>
                </label>
                <select
                  value={contactId}
                  onChange={e => {
                    setContactId(e.target.value);
                    const found = contacts.find(c => c.id === e.target.value);
                    if (found) {
                      setCustomContactTitle('');
                      if (found.defaultPaymentTermsDays) {
                        applyQuickDueDate(found.defaultPaymentTermsDays);
                      }
                    }
                  }}
                  className="w-full h-10 px-3 text-sm bg-white border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-stone-800"
                >
                  <option value="">-- Cari Seçiniz --</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.code ? `[${c.code}] ` : ''}{c.title}
                    </option>
                  ))}
                </select>

                {!contactId && (
                  <div className="mt-2">
                    <input
                      type="text"
                      placeholder="veya Manuel Cari Ünvanı Yazınız..."
                      value={customContactTitle}
                      onChange={e => setCustomContactTitle(e.target.value)}
                      className="w-full h-9 px-3 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-stone-800"
                    />
                  </div>
                )}

                {selectedContact && (
                  <div className="mt-2 p-2 bg-stone-50 border border-stone-200 rounded-md text-xs text-stone-600 flex justify-between items-center">
                    <span>VKN/TC: <b>{selectedContact.taxNumber || selectedContact.tcNumber || '-'}</b></span>
                    <span>Mevcut Bakiye: <b className="font-mono">{selectedContact.currentBalance?.toLocaleString('tr-TR')} ₺</b></span>
                  </div>
                )}
              </div>

              {/* Tutar & KDV */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Toplam Tutar (₺ - KDV Dahil) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-stone-400 font-bold text-sm">₺</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={totalAmount}
                    onChange={e => setTotalAmount(e.target.value)}
                    className="w-full h-10 pl-8 pr-3 text-sm font-semibold font-mono bg-white border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-stone-800"
                  />
                </div>
              </div>

              {/* KDV Oranı ve Dağılımı */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-stone-50 border border-stone-200 rounded-lg text-xs">
                <div>
                  <label className="block text-stone-600 font-medium mb-1">KDV Oranı</label>
                  <select
                    value={vatRate}
                    onChange={e => setVatRate(Number(e.target.value))}
                    className="w-full h-8 px-2 text-xs bg-white border border-stone-300 rounded-md"
                  >
                    <option value={0}>%0 (KDV Muaf)</option>
                    <option value={1}>%1</option>
                    <option value={10}>%10</option>
                    <option value={20}>%20 (Standart)</option>
                  </select>
                </div>
                <div>
                  <span className="text-stone-500 block mb-1">Hesaplanan Matrah / KDV:</span>
                  <div className="font-mono text-stone-800">
                    <div>Matrah: ₺{calculatedBase.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div>KDV: ₺{calculatedVat.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </div>
                </div>
              </div>

              {/* Kategori */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Kategori / İşlem Konusu</label>
                <input
                  type="text"
                  placeholder="Örn: Endüstriyel Filtre Satışı, Hammadde Alımı..."
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-white border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-stone-800"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {(type === 'ALACAK'
                    ? ['Ürün Satışı', 'Hizmet Geliri', 'Mühendislik / Montaj', 'Kira Geliri']
                    : ['Hammadde Alımı', 'Enerji / Elektrik', 'Kira & Aidat', 'Lojistik & Kargo', 'Bulut / Yazılım']
                  ).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className="text-[11px] px-2 py-0.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md border border-stone-200 transition-colors"
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* SAĞ SÜTUN: Evrak, Vadeler ve Dosya */}
            <div className="space-y-4">
              {/* Belge Türü & Belge No */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Belge Türü</label>
                  <select
                    value={documentType}
                    onChange={e => setDocumentType(e.target.value as DebtCreditDocumentType)}
                    className="w-full h-10 px-2 text-xs bg-white border border-stone-300 rounded-lg"
                  >
                    <option value="E_FATURA">E-Fatura</option>
                    <option value="E_ARSIV">E-Arşiv Fatura</option>
                    <option value="SENET">Senet (Kıymetli Evrak)</option>
                    <option value="CEK">Çek</option>
                    <option value="SOZLESME">Sözleşme / Protokol</option>
                    <option value="DIGER">Diğer Belge</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Belge / Fatura No <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={documentNumber}
                    onChange={e => setDocumentNumber(e.target.value)}
                    placeholder="FAT-2026-..."
                    className="w-full h-10 px-3 text-xs font-mono font-semibold bg-white border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-stone-800"
                  />
                </div>
              </div>

              {/* Fatura Tarihi & Vade Tarihi */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    İşlem / Düzenleme Tarihi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={e => setIssueDate(e.target.value)}
                    className="w-full h-10 px-3 text-xs bg-white border border-stone-300 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Vade Tarihi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full h-10 px-3 text-xs bg-white border border-stone-300 rounded-lg font-mono font-semibold text-stone-900"
                  />
                </div>
              </div>

              {/* Hızlı Vade Seçicileri */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-stone-500">Hızlı Vade:</span>
                {[
                  { label: 'Peşin (Bugün)', days: 0 },
                  { label: '+15 Gün', days: 15 },
                  { label: '+30 Gün', days: 30 },
                  { label: '+60 Gün', days: 60 },
                  { label: '+90 Gün', days: 90 },
                ].map(v => (
                  <button
                    key={v.label}
                    type="button"
                    onClick={() => applyQuickDueDate(v.days)}
                    className="text-[11px] px-2 py-0.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md border border-stone-200 transition-colors"
                  >
                    {v.label}
                  </button>
                ))}
              </div>

              {/* Açıklama */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">İşlem Açıklaması</label>
                <textarea
                  rows={2}
                  placeholder="Fatura konusu, sipariş no veya detaylı açıklama..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full p-2.5 text-xs bg-white border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-stone-800"
                />
              </div>

              {/* Belge Yükleme (Dosya Eki) */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Fatura / Evrak Eki (Opsiyonel)</label>
                <div className="border-2 border-dashed border-stone-200 hover:border-stone-400 rounded-lg p-3 text-center transition-colors">
                  {attachedFileName ? (
                    <div className="flex items-center justify-between text-xs text-stone-700">
                      <span className="flex items-center gap-1.5 font-medium truncate">
                        <Paperclip className="w-3.5 h-3.5 text-stone-500" />
                        {attachedFileName}
                      </span>
                      <button
                        type="button"
                        onClick={() => setAttachedFileName('')}
                        className="text-rose-600 hover:text-rose-800 text-xs font-semibold"
                      >
                        Kaldır
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center justify-center">
                      <UploadCloud className="w-6 h-6 text-stone-400 mb-1" />
                      <span className="text-xs text-stone-600 font-medium">PDF veya görsel dosyası seçin</span>
                      <span className="text-[10px] text-stone-400">Maks. 10 MB (E-Fatura XML/PDF, Senet Görseli)</span>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.png,.jpg,.jpeg,.xml"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) setAttachedFileName(file.name);
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ANINDA PEŞİNAT / ÖDEME KUTUSU */}
          <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="immediatePaymentCheck"
                  checked={hasImmediatePayment}
                  onChange={e => {
                    setHasImmediatePayment(e.target.checked);
                    if (e.target.checked && !paidAmount) {
                      setPaidAmount(totalAmount || '');
                    }
                  }}
                  className="w-4 h-4 text-stone-900 rounded border-stone-300 focus:ring-stone-800 cursor-pointer"
                />
                <label htmlFor="immediatePaymentCheck" className="text-xs font-bold text-stone-800 cursor-pointer">
                  Bu işlem için anında kısmi veya tam ödeme/tahsilat yapıldı
                </label>
              </div>
              <span className="text-[11px] text-stone-500 font-medium">
                (Kasa/Banka bakiyesi anında güncellenir)
              </span>
            </div>

            {hasImmediatePayment && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t border-stone-200">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Ödenen / Tahsil Edilen (₺) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={paidAmount}
                    onChange={e => setPaidAmount(e.target.value)}
                    className="w-full h-9 px-3 text-xs font-mono font-bold bg-white border border-stone-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Kasa / Banka Hesabı <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={cashBankId}
                    onChange={e => setCashBankId(e.target.value)}
                    className="w-full h-9 px-2 text-xs bg-white border border-stone-300 rounded-lg"
                  >
                    {cashBanks.map(cb => (
                      <option key={cb.id} value={cb.id}>
                        {cb.name} (₺{cb.balance.toLocaleString('tr-TR')})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Ödeme Yöntemi</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as PaymentMethodType)}
                    className="w-full h-9 px-2 text-xs bg-white border border-stone-300 rounded-lg"
                  >
                    <option value="BANKA">Banka Havalesi / EFT</option>
                    <option value="NAKIT">Nakit / Elden</option>
                    <option value="KREDI_KARTI">Kredi Kartı / POS</option>
                    <option value="CEK_SENET">Çek / Senet</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Alt Butonlar */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-stone-600 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold text-white shadow-xs transition-all ${
                type === 'ALACAK'
                  ? 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400'
                  : 'bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400'
              }`}
            >
              {loading ? (
                <span>Kaydediliyor...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{type === 'ALACAK' ? 'Alacak Kaydını Tamamla' : 'Borç Kaydını Tamamla'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

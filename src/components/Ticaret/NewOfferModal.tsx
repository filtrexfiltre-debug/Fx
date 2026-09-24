import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Calendar,
  Building,
  DollarSign,
  Clock,
  Send,
  FileSpreadsheet,
  AlertCircle,
  Truck,
  CreditCard,
  MapPin,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { TradeOffer, TradeItemLine, OfferType } from '../../types/trade';
import { Contact, Product, ContactAddress } from '../../types/fx';
import { tradeService } from '../../services/tradeService';
import { fxApi } from '../../services/api';

interface NewOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (offer: TradeOffer) => void;
  initialType?: OfferType;
  currentBranchId: string;
  currentBranchName?: string;
}

export const NewOfferModal: React.FC<NewOfferModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialType = 'VERILEN',
  currentBranchId,
  currentBranchName = 'Merkez Şube (Genel Müdürlük - Levent)',
}) => {
  const [offerType, setOfferType] = useState<OfferType>(initialType);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  
  // Adres ve Vergi Durumu
  const [contactAddress, setContactAddress] = useState<string>('');
  const [selectedAddressId, setSelectedAddressId] = useState<string>('default');
  const [taxIdType, setTaxIdType] = useState<'VKN' | 'TCKN'>('VKN');
  const [contactTaxNumber, setContactTaxNumber] = useState<string>('');
  const [contactTcNumber, setContactTcNumber] = useState<string>('');
  const [contactTaxOffice, setContactTaxOffice] = useState<string>('');

  const [issueDate, setIssueDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [validUntilDate, setValidUntilDate] = useState<string>(
    new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10)
  );

  const [currency, setCurrency] = useState<'TRY' | 'USD' | 'EUR'>('TRY');
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  const [paymentTerms, setPaymentTerms] = useState<string>('%30 Peşin, Kalan 45 Gün Vadeli Çek');
  const [deliveryTerms, setDeliveryTerms] = useState<string>('Depo Teslim - 3 İş Günü');
  const [notes, setNotes] = useState<string>('');

  // Kalemler
  const [items, setItems] = useState<TradeItemLine[]>([
    {
      id: 'it-1',
      skuCode: '',
      productName: '',
      quantity: 10,
      unit: 'Adet',
      unitPrice: 500,
      discountPercent: 0,
      vatRate: 20,
      taxExclusiveAmount: 5000,
      taxAmount: 1000,
      lineTotal: 6000,
    },
  ]);

  const applyContactData = (contact: Contact) => {
    const addrList = contact.addresses && contact.addresses.length > 0 ? contact.addresses : [];
    const defaultAddr = addrList.find((a) => a.isDefaultAddress) || addrList[0];
    const initialAddrText =
      defaultAddr?.formattedAddress ||
      defaultAddr?.streetLine ||
      contact.formattedAddress ||
      contact.streetLine ||
      `${contact.districtId || ''} ${contact.cityId ? 'İstanbul' : ''}`.trim() ||
      'İstanbul';

    setContactAddress(initialAddrText);
    setSelectedAddressId(defaultAddr?.id || 'default');

    const hasTc = !!contact.tcNumber && !contact.taxNumber;
    setTaxIdType(hasTc ? 'TCKN' : 'VKN');
    setContactTaxNumber(contact.taxNumber || '');
    setContactTcNumber(contact.tcNumber || '');
    setContactTaxOffice(contact.taxOffice || '');
  };

  useEffect(() => {
    if (isOpen) {
      setOfferType(initialType);
      fxApi.getContacts().then((res) => {
        const c = res.data || [];
        setContacts(c);
        if (c.length > 0) {
          const target = selectedContactId ? c.find((it) => it.id === selectedContactId) || c[0] : c[0];
          setSelectedContactId(target.id);
          applyContactData(target);
        }
      });
      fxApi.getProducts().then((res) => setProducts(res.data || []));
    }
  }, [isOpen, initialType]);

  if (!isOpen) return null;

  const handleContactChange = (cid: string) => {
    setSelectedContactId(cid);
    const c = contacts.find((item) => item.id === cid);
    if (c) {
      applyContactData(c);
    }
  };

  const handleAddressSelectChange = (addrId: string, currentContact: Contact | undefined) => {
    setSelectedAddressId(addrId);
    if (addrId === 'custom') {
      return;
    }
    if (currentContact?.addresses) {
      const found = currentContact.addresses.find((a) => a.id === addrId);
      if (found) {
        setContactAddress(found.formattedAddress || found.streetLine || '');
        return;
      }
    }
    setContactAddress(currentContact?.formattedAddress || currentContact?.streetLine || '');
  };

  const handleResetToDefaultAddress = (currentContact: Contact | undefined) => {
    if (!currentContact) return;
    const addrList = currentContact.addresses && currentContact.addresses.length > 0 ? currentContact.addresses : [];
    const defaultAddr = addrList.find((a) => a.isDefaultAddress) || addrList[0];
    const initialAddrText =
      defaultAddr?.formattedAddress ||
      defaultAddr?.streetLine ||
      currentContact.formattedAddress ||
      currentContact.streetLine ||
      '';
    setContactAddress(initialAddrText);
    setSelectedAddressId(defaultAddr?.id || 'default');
  };

  // Kalem Değişikliği
  const handleItemChange = (index: number, field: keyof TradeItemLine, val: any) => {
    const next = [...items];
    const item = { ...next[index], [field]: val };

    // Otomatik hesaplama
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const disc = Number(item.discountPercent) || 0;
    const vat = Number(item.vatRate) || 0;

    const rawTotal = qty * price;
    const discountAmount = rawTotal * (disc / 100);
    const taxExclusive = rawTotal - discountAmount;
    const taxAmount = taxExclusive * (vat / 100);
    const lineTotal = taxExclusive + taxAmount;

    item.taxExclusiveAmount = taxExclusive;
    item.taxAmount = taxAmount;
    item.lineTotal = lineTotal;

    next[index] = item;
    setItems(next);
  };

  const handleProductSelect = (index: number, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    const next = [...items];
    const isSales = offerType === 'VERILEN';
    const price = isSales ? (prod.salePriceExclVat || 500) : (prod.purchasePrice || 350);

    next[index] = {
      ...next[index],
      productId: prod.id,
      skuCode: prod.skuCode || '',
      productName: prod.name || '',
      unitPrice: price,
      unit: prod.unitType || 'Adet',
      vatRate: prod.vatRatePercent || 20,
    };
    // Hesaplat
    handleItemChange(index, 'unitPrice', price);
  };

  const handleAddItem = () => {
    const newItem: TradeItemLine = {
      id: `it-${Date.now()}`,
      skuCode: '',
      productName: '',
      quantity: 1,
      unit: 'Adet',
      unitPrice: 0,
      discountPercent: 0,
      vatRate: 20,
      taxExclusiveAmount: 0,
      taxAmount: 0,
      lineTotal: 0,
    };
    setItems([...items, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Genel Toplamlar
  const subtotal = items.reduce((acc, it) => acc + (it.quantity * it.unitPrice), 0);
  const discountTotal = items.reduce((acc, it) => acc + ((it.quantity * it.unitPrice) * (it.discountPercent / 100)), 0);
  const vatTotal = items.reduce((acc, it) => acc + it.taxAmount, 0);
  const grandTotal = items.reduce((acc, it) => acc + it.lineTotal, 0);
  const grandTotalTRY = grandTotal * exchangeRate;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const contact = contacts.find((c) => c.id === selectedContactId);
    if (!contact) {
      alert('Lütfen bir cari seçiniz!');
      return;
    }

    const created = tradeService.createOffer({
      tenantId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      branchId: currentBranchId === 'all' ? 'b1111111-1111-1111-1111-111111111111' : currentBranchId,
      branchName: currentBranchName,
      offerType,
      contactId: contact.id,
      contactTitle: contact.title || contact.authorizedPerson || 'İsimsiz Cari',
      contactEmail: contact.email,
      contactPhone: contact.mobilePhone1 || (contact as any).phone,
      contactTaxNumber: taxIdType === 'VKN' ? contactTaxNumber : undefined,
      contactTcNumber: taxIdType === 'TCKN' ? contactTcNumber : undefined,
      contactTaxOffice: contactTaxOffice.trim() || undefined,
      contactAddress: contactAddress.trim(),
      contactCity: (contact as any).city,
      issueDate,
      validUntilDate,
      currency,
      exchangeRate,
      items,
      subtotal,
      discountTotal,
      vatTotal,
      grandTotal,
      grandTotalTRY,
      paymentTerms,
      deliveryTerms,
      status: 'SENT',
      notes,
    });

    onSuccess(created);
    onClose();
  };

  const selectedContact = contacts.find((c) => c.id === selectedContactId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-auto max-h-[95vh] flex flex-col">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-xs ${
                offerType === 'VERILEN' ? 'bg-indigo-600' : 'bg-emerald-600'
              }`}
            >
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900">
                {offerType === 'VERILEN' ? 'Yeni Verilen Teklif (Müşteriye Satış Teklifi)' : 'Yeni Alınan Teklif (Tedarikçi Satınalma Teklifi)'}
              </h2>
              <p className="text-xs text-stone-500">
                Resmi kurumsal teklif formu hazırlayın; onaylandığında tek tıkla faturaya dönüştürebilirsiniz.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. YÖN TOGGLE & CARİ SEÇİMİ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Teklif Türü */}
            <div className="bg-stone-100 p-1.5 rounded-xl flex border border-stone-200">
              <button
                type="button"
                onClick={() => setOfferType('VERILEN')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                  offerType === 'VERILEN'
                    ? 'bg-white text-indigo-700 shadow-xs border border-indigo-200'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Müşteriye Verilen Teklif
              </button>
              <button
                type="button"
                onClick={() => setOfferType('ALINAN')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                  offerType === 'ALINAN'
                    ? 'bg-white text-emerald-700 shadow-xs border border-emerald-200'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Tedarikçiden Alınan Teklif
              </button>
            </div>

            {/* Cari Firma */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {offerType === 'VERILEN' ? 'Müşteri / Cari Hesap *' : 'Tedarikçi Firma *'}
              </label>
              <select
                value={selectedContactId}
                onChange={(e) => handleContactChange(e.target.value)}
                required
                className="w-full h-10 px-3 bg-white border border-stone-300 rounded-lg text-xs font-medium text-stone-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-hidden"
              >
                <option value="">Cari Seçiniz...</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title || (c as any).contactName} ({c.taxNumber ? `VKN: ${c.taxNumber}` : c.tcNumber ? `TCKN: ${c.tcNumber}` : 'Bireysel'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* CARİ FATURA / TESLİMAT ADRESİ VE VERGİ / TCKN BİLGİLERİ */}
          <div className="p-4 bg-stone-50/90 rounded-xl border border-stone-200 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-stone-200 text-stone-700 flex items-center justify-center">
                  <Building className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                  Teklif / Fatura Adresi ve Resmi Vergi / TCKN Bilgileri
                </span>
              </div>
              {selectedContact && (
                <div className="flex items-center gap-2 text-xs">
                  {selectedContact.isEinvoiceTaxpayer ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center gap-1 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> GİB E-Fatura Mükellefi
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-stone-200 text-stone-700 font-semibold text-[11px] flex items-center gap-1 border border-stone-300">
                      <ShieldCheck className="w-3 h-3 text-stone-500" /> E-Arşiv Kapsamında
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* ADRES BÖLÜMÜ (7 Sütun) */}
              <div className="lg:col-span-7 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-stone-500" />
                    <span>Teklif Adresi *</span>
                  </label>

                  {/* Çoklu Adres Seçimi Dropdown */}
                  {selectedContact?.addresses && selectedContact.addresses.length > 0 ? (
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-[11px] text-stone-500 font-medium">Kayıtlı Adres:</span>
                      <select
                        value={selectedAddressId}
                        onChange={(e) => handleAddressSelectChange(e.target.value, selectedContact)}
                        className="px-2 py-1 bg-white border border-stone-300 rounded-md text-[11px] font-semibold text-stone-800 cursor-pointer focus:ring-1 focus:ring-indigo-500 max-w-[210px] truncate"
                      >
                        {selectedContact.addresses.map((addr) => (
                          <option key={addr.id} value={addr.id}>
                            {addr.isDefaultAddress ? '⭐ ' : ''}{addr.title || addr.addressType} ({addr.cityName || 'Şehir'})
                          </option>
                        ))}
                        <option value="custom">✍️ Özel / Yeni Adres Yaz...</option>
                      </select>
                    </div>
                  ) : (
                    <span className="text-[10px] text-stone-400">Tek adres kayıtlı</span>
                  )}
                </div>

                <textarea
                  rows={2}
                  value={contactAddress}
                  onChange={(e) => setContactAddress(e.target.value)}
                  placeholder="Teklif üzerinde yer alacak şirket/şahıs resmi açık adresi..."
                  required
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs font-medium text-stone-900 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 leading-relaxed placeholder:text-stone-400"
                />

                <div className="flex items-center justify-between text-[10px] text-stone-500">
                  <span>Bu adres teklif onaylandığında faturaya ve resmi belgelere otomatik aktarılır.</span>
                  {selectedContact && (
                    <button
                      type="button"
                      onClick={() => handleResetToDefaultAddress(selectedContact)}
                      className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 hover:underline font-medium cursor-pointer"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>Varsayılan Adrese Sıfırla</span>
                    </button>
                  )}
                </div>
              </div>

              {/* VERGİ / TCKN BÖLÜMÜ (5 Sütun) */}
              <div className="lg:col-span-5 space-y-2 bg-white p-3 rounded-lg border border-stone-200">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-stone-800">Vergi / Kimlik Tipi</label>
                  <div className="flex bg-stone-100 p-0.5 rounded-lg border border-stone-200 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setTaxIdType('VKN')}
                      className={`px-2.5 py-0.5 rounded-md font-bold transition-all ${
                        taxIdType === 'VKN'
                          ? 'bg-white text-indigo-900 shadow-2xs border border-stone-200'
                          : 'text-stone-500 hover:text-stone-800'
                      }`}
                    >
                      Kurumsal (VKN)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaxIdType('TCKN')}
                      className={`px-2.5 py-0.5 rounded-md font-bold transition-all ${
                        taxIdType === 'TCKN'
                          ? 'bg-white text-indigo-900 shadow-2xs border border-stone-200'
                          : 'text-stone-500 hover:text-stone-800'
                      }`}
                    >
                      Şahıs (TCKN)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {taxIdType === 'VKN' ? (
                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-0.5">
                        Vergi No (VKN) *
                      </label>
                      <input
                        type="text"
                        maxLength={10}
                        value={contactTaxNumber}
                        onChange={(e) => setContactTaxNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="10 Haneli VKN"
                        className="w-full h-8 px-2.5 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold text-stone-900 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-0.5">
                        T.C. Kimlik No *
                      </label>
                      <input
                        type="text"
                        maxLength={11}
                        value={contactTcNumber}
                        onChange={(e) => setContactTcNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="11 Haneli TCKN"
                        className="w-full h-8 px-2.5 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold text-stone-900 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-0.5">
                      Vergi Dairesi {taxIdType === 'TCKN' ? '(Opsiyonel)' : '*'}
                    </label>
                    <input
                      type="text"
                      value={contactTaxOffice}
                      onChange={(e) => setContactTaxOffice(e.target.value)}
                      placeholder="Örn: Boğaziçi V.D."
                      className="w-full h-8 px-2.5 bg-white border border-stone-300 rounded-lg text-xs font-medium text-stone-900 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <p className="text-[10px] text-stone-500 leading-tight">
                  {taxIdType === 'VKN'
                    ? '10 haneli VKN kurumsal teklif ve sözleşmeler için gereklidir.'
                    : 'Bireysel müşterilere düzenlenen tekliflerde TCKN kullanılabilir.'}
                </p>
              </div>
            </div>
          </div>

          {/* 2. TARİH, PARA BİRİMİ VE VADE AYARLARI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-stone-50 rounded-xl border border-stone-200">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-stone-500" /> Teklif Tarihi
              </label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                required
                className="w-full h-9 px-3 bg-white border border-stone-300 rounded-lg text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" /> Opsiyon (Geçerlilik Bitiş)
              </label>
              <input
                type="date"
                value={validUntilDate}
                onChange={(e) => setValidUntilDate(e.target.value)}
                required
                className="w-full h-9 px-3 bg-white border border-stone-300 rounded-lg text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Para Birimi
              </label>
              <div className="flex gap-2">
                <select
                  value={currency}
                  onChange={(e) => {
                    const c = e.target.value as 'TRY' | 'USD' | 'EUR';
                    setCurrency(c);
                    setExchangeRate(c === 'USD' ? 36.5 : c === 'EUR' ? 38.2 : 1);
                  }}
                  className="w-1/2 h-9 px-2 bg-white border border-stone-300 rounded-lg text-xs font-bold"
                >
                  <option value="TRY">₺ TRY</option>
                  <option value="USD">$ USD</option>
                  <option value="EUR">€ EUR</option>
                </select>
                <input
                  type="number"
                  step="0.0001"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(Number(e.target.value) || 1)}
                  disabled={currency === 'TRY'}
                  title="Döviz Kuru"
                  placeholder="Kur"
                  className="w-1/2 h-9 px-2 bg-white border border-stone-300 rounded-lg text-xs font-mono text-stone-800 disabled:bg-stone-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1 flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-stone-500" /> Şube
              </label>
              <div className="h-9 px-3 bg-stone-100 border border-stone-200 rounded-lg text-xs font-medium flex items-center text-stone-700 truncate">
                {currentBranchName}
              </div>
            </div>
          </div>

          {/* 3. ÜRÜN & HİZMET KALEMLERİ LİSTESİ */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                <span>Teklif Kalemleri</span>
              </h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Kalem Ekle</span>
              </button>
            </div>

            <div className="border border-stone-200 rounded-xl overflow-x-auto shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-stone-100 text-stone-700 border-b border-stone-200 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-2.5 w-8">#</th>
                    <th className="p-2.5 min-w-[220px]">Ürün / Hizmet Seçimi</th>
                    <th className="p-2.5 w-24">Miktar</th>
                    <th className="p-2.5 w-20">Birim</th>
                    <th className="p-2.5 w-28">Birim Fiyat ({currency})</th>
                    <th className="p-2.5 w-20">İsk. %</th>
                    <th className="p-2.5 w-20">KDV %</th>
                    <th className="p-2.5 w-32 text-right">Tutar ({currency})</th>
                    <th className="p-2.5 w-10 text-center">Sil</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 bg-white">
                  {items.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-stone-50/80">
                      <td className="p-2.5 text-stone-400 font-mono text-[11px]">{idx + 1}</td>
                      <td className="p-2.5">
                        <select
                          value={item.productId || ''}
                          onChange={(e) => handleProductSelect(idx, e.target.value)}
                          className="w-full h-8 px-2 bg-white border border-stone-300 rounded text-xs font-medium text-stone-800"
                        >
                          <option value="">Listeden Ürün Seçiniz...</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              [{p.skuCode}] {p.name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={item.productName}
                          onChange={(e) => handleItemChange(idx, 'productName', e.target.value)}
                          placeholder="Ürün adı / açıklaması"
                          className="w-full h-7 px-2 mt-1 bg-stone-50 border border-stone-200 rounded text-[11px] text-stone-600"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                          className="w-full h-8 px-2 bg-white border border-stone-300 rounded text-xs font-mono text-center"
                        />
                      </td>
                      <td className="p-2.5">
                        <select
                          value={item.unit}
                          onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                          className="w-full h-8 px-1 bg-white border border-stone-300 rounded text-xs"
                        >
                          <option value="Adet">Adet</option>
                          <option value="KG">KG</option>
                          <option value="Metre">Metre</option>
                          <option value="Set">Set</option>
                          <option value="Paket">Paket</option>
                          <option value="Koli">Koli</option>
                        </select>
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(idx, 'unitPrice', Number(e.target.value))}
                          className="w-full h-8 px-2 bg-white border border-stone-300 rounded text-xs font-mono text-right"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.discountPercent}
                          onChange={(e) => handleItemChange(idx, 'discountPercent', Number(e.target.value))}
                          className="w-full h-8 px-1 bg-white border border-stone-300 rounded text-xs font-mono text-center"
                        />
                      </td>
                      <td className="p-2.5">
                        <select
                          value={item.vatRate}
                          onChange={(e) => handleItemChange(idx, 'vatRate', Number(e.target.value))}
                          className="w-full h-8 px-1 bg-white border border-stone-300 rounded text-xs text-center"
                        >
                          <option value={20}>%20</option>
                          <option value={10}>%10</option>
                          <option value={1}>%1</option>
                          <option value={0}>%0</option>
                        </select>
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-stone-900 text-xs">
                        {item.lineTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {currency}
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          disabled={items.length <= 1}
                          className="p-1 text-stone-400 hover:text-rose-600 disabled:opacity-30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. ŞARTLAR, NOTLAR VE TOPLAMLAR */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1 flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-stone-500" /> Ödeme Koşulları
                </label>
                <input
                  type="text"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="Örn: %40 Peşin, Kalan 60 Gün Vade"
                  className="w-full h-9 px-3 bg-white border border-stone-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1 flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-stone-500" /> Teslimat Koşulları
                </label>
                <input
                  type="text"
                  value={deliveryTerms}
                  onChange={(e) => setDeliveryTerms(e.target.value)}
                  placeholder="Örn: Fabrika Teslim / Nakliye Alıcıya Ait"
                  className="w-full h-9 px-3 bg-white border border-stone-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Teklif Notu & Açıklamalar
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Müşteriye teklif çıktısında iletilecek özel notlar..."
                  className="w-full p-2.5 bg-white border border-stone-300 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* FİNANSAL TOPLAM KARTI */}
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-2.5">
              <div className="flex justify-between text-xs text-stone-600">
                <span>Ara Toplam (KDV Hariç):</span>
                <span className="font-mono font-semibold">
                  {subtotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {currency}
                </span>
              </div>
              {discountTotal > 0 && (
                <div className="flex justify-between text-xs text-rose-600">
                  <span>Toplam İskonto:</span>
                  <span className="font-mono font-semibold">
                    -{discountTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {currency}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-xs text-stone-600">
                <span>Toplam KDV:</span>
                <span className="font-mono font-semibold">
                  {vatTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {currency}
                </span>
              </div>
              <div className="h-px bg-stone-300 my-2" />
              <div className="flex justify-between text-base font-black text-stone-900">
                <span>Genel Toplam:</span>
                <span className="font-mono text-indigo-700">
                  {grandTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {currency}
                </span>
              </div>
              {currency !== 'TRY' && (
                <div className="flex justify-between text-xs font-bold text-stone-500 pt-1">
                  <span>TL Karşılığı (Kur: {exchangeRate}):</span>
                  <span className="font-mono text-stone-800">
                    ₺ {grandTotalTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* MODAL FOOTER */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Teklifi Kaydet & Gönder</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

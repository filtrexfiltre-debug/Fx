import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Calendar,
  Building,
  DollarSign,
  FileText,
  Clock,
  CheckCircle2,
  MapPin,
  RotateCcw,
  ShieldCheck,
  UserCheck,
  Mail,
  Warehouse as WarehouseIcon,
} from 'lucide-react';
import { TradeInvoice, TradeItemLine } from '../../types/trade';
import { Contact, Product, Employee, Warehouse, ContactAddress } from '../../types/fx';
import { tradeService } from '../../services/tradeService';
import { fxApi } from '../../services/api';

interface NewInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (invoice: TradeInvoice) => void;
  currentBranchId: string;
  currentBranchName?: string;
  initialOfferNumber?: string;
  initialOfferDate?: string;
  initialContactId?: string;
  initialItems?: TradeItemLine[];
  initialDirection?: string;
}

export const NewInvoiceModal: React.FC<NewInvoiceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentBranchId,
  currentBranchName = 'Merkez Şube (Genel Müdürlük - Levent)',
  initialOfferNumber,
  initialOfferDate,
  initialContactId,
  initialItems,
}) => {
  const [scenario, setScenario] = useState<'TICARI' | 'TEMEL' | 'E_ARSIV'>('TICARI');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedEmployeeName, setSelectedEmployeeName] = useState<string>('');

  // Adres, Mail ve Vergi Durumu
  const [contactAddress, setContactAddress] = useState<string>('');
  const [selectedAddressId, setSelectedAddressId] = useState<string>('default');
  const [contactEmail, setContactEmail] = useState<string>('');
  const [taxIdType, setTaxIdType] = useState<'VKN' | 'TCKN'>('VKN');
  const [contactTaxNumber, setContactTaxNumber] = useState<string>('');
  const [contactTcNumber, setContactTcNumber] = useState<string>('');
  const [contactTaxOffice, setContactTaxOffice] = useState<string>('');

  const [issueDate, setIssueDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState<string>(
    new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10) // 60 gün vade
  );

  const [currency, setCurrency] = useState<'TRY' | 'USD' | 'EUR'>('TRY');
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');

  // Kalemler
  const [items, setItems] = useState<TradeItemLine[]>([
    {
      id: 'inv-it-1',
      skuCode: 'FLT-001',
      productName: 'Endüstriyel Yağ Filtresi',
      quantity: 50,
      unit: 'Adet',
      unitPrice: 650,
      discountPercent: 0,
      vatRate: 20,
      taxExclusiveAmount: 32500,
      taxAmount: 6500,
      lineTotal: 39000,
    },
  ]);

  const applyContactData = (contact: Contact) => {
    // Adres listesi
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
    setContactEmail(contact.email || '');

    // Kimlik ve Vergi
    const hasTc = !!contact.tcNumber && !contact.taxNumber;
    setTaxIdType(hasTc ? 'TCKN' : 'VKN');
    setContactTaxNumber(contact.taxNumber || '');
    setContactTcNumber(contact.tcNumber || '');
    setContactTaxOffice(contact.taxOffice || '');

    // E-Fatura senaryo önerisi
    if (contact.isEinvoiceTaxpayer) {
      setScenario('TICARI');
    } else if (hasTc) {
      setScenario('E_ARSIV');
    }
  };

  useEffect(() => {
    if (isOpen) {
      fxApi.getContacts().then((res) => {
        const c = res.data || [];
        setContacts(c);
        if (c.length > 0) {
          const target = initialContactId ? c.find((it) => it.id === initialContactId) || c[0] : c[0];
          setSelectedContactId(target.id);
          applyContactData(target);
        }
      });
      fxApi.getProducts().then((res) => setProducts(res.data || []));
      fxApi.getEmployees().then((res) => {
        const emps = res.data || [];
        setEmployees(emps);
        if (emps.length > 0) {
          setSelectedEmployeeId(emps[0].id);
          setSelectedEmployeeName(`${emps[0].firstName} ${emps[0].lastName} (${emps[0].title || 'Satış Uzmanı'})`);
        }
      });
      fxApi.getWarehouses().then((res) => {
        const whs = res.data || [];
        setWarehouses(whs);
        if (whs.length > 0) {
          // Otomatik şube / personel / varsayılan depo eşleşmesi
          const matched =
            whs.find(
              (w) =>
                w.name.toLowerCase().includes('merkez') ||
                w.name.toLowerCase().includes(currentBranchName.toLowerCase().split(' ')[0]) ||
                w.warehouseType === 'Merkez'
            ) || whs[0];

          setItems((prev) =>
            prev.map((it) => ({
              ...it,
              warehouseId: matched.id,
              warehouseName: matched.name,
            }))
          );
        }
      });

      if (initialItems && initialItems.length > 0) {
        setItems(initialItems);
      }
    }
  }, [isOpen, initialContactId, currentBranchName]);

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

  const handleItemChange = (index: number, field: keyof TradeItemLine, val: any) => {
    const next = [...items];
    const item = { ...next[index], [field]: val };

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
    const price = prod.salePriceExclVat || 650;

    next[index] = {
      ...next[index],
      productId: prod.id,
      skuCode: prod.skuCode || '',
      productName: prod.name || '',
      unitPrice: price,
      unit: prod.unitType || 'Adet',
      vatRate: prod.vatRatePercent || 20,
    };
    handleItemChange(index, 'unitPrice', price);
  };

  const handleWarehouseSelect = (index: number, warehouseId: string) => {
    const wh = warehouses.find((w) => w.id === warehouseId);
    const next = [...items];
    next[index] = {
      ...next[index],
      warehouseId,
      warehouseName: wh ? wh.name : undefined,
    };
    setItems(next);
  };

  // Tüm kalemler için ortak depo seçimi (İlk Önce Depo Seç)
  const handleMasterWarehouseChange = (warehouseId: string) => {
    const wh = warehouses.find((w) => w.id === warehouseId);
    setItems((prev) =>
      prev.map((it) => ({
        ...it,
        warehouseId,
        warehouseName: wh ? wh.name : undefined,
      }))
    );
  };

  const handleAddItem = () => {
    const defaultWh = warehouses[0];
    const currentMasterWhId = items[0]?.warehouseId || defaultWh?.id;
    const currentMasterWhName = items[0]?.warehouseName || defaultWh?.name;

    const newItem: TradeItemLine = {
      id: `inv-it-${Date.now()}`,
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
      warehouseId: currentMasterWhId,
      warehouseName: currentMasterWhName,
    };
    setItems([...items, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((acc, it) => acc + it.quantity * it.unitPrice, 0);
  const discountTotal = items.reduce(
    (acc, it) => acc + it.quantity * it.unitPrice * (it.discountPercent / 100),
    0
  );
  const vatTotal = items.reduce((acc, it) => acc + it.taxAmount, 0);
  const grandTotal = items.reduce((acc, it) => acc + it.lineTotal, 0);
  const grandTotalTRY = grandTotal * exchangeRate;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const contact = contacts.find((c) => c.id === selectedContactId);
    if (!contact) {
      alert('Lütfen bir müşteri cari hesabı seçiniz!');
      return;
    }

    const created = tradeService.createInvoice({
      tenantId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      branchId: currentBranchId === 'all' ? 'b1111111-1111-1111-1111-111111111111' : currentBranchId,
      branchName: currentBranchName,
      direction: 'SATIS',
      scenario,
      invoiceType: 'SATIS',
      contactId: contact.id,
      contactTitle: contact.title || contact.authorizedPerson || 'İsimsiz Müşteri',
      contactTaxNumber: taxIdType === 'VKN' ? contactTaxNumber : undefined,
      contactTcNumber: taxIdType === 'TCKN' ? contactTcNumber : undefined,
      contactTaxOffice: contactTaxOffice.trim() || undefined,
      contactAddress: contactAddress.trim(),
      issueDate,
      dueDate,
      currency,
      exchangeRate,
      items,
      subtotal,
      discountTotal,
      vatTotal,
      grandTotal,
      grandTotalTRY,
      paymentStatus: 'UNPAID',
      paidAmount: 0,
      remainingAmount: grandTotal,
      gibStatus: 'NOT_SENT',
      ettn: crypto.randomUUID ? crypto.randomUUID() : `uuid-inv-${Date.now()}`,
      notes: initialOfferNumber
        ? `${initialOfferNumber} numaralı teklif faturaya dönüştürülmüştür. ${notes}`
        : notes,
    });

    onSuccess(created);
    onClose();
  };

  const selectedContact = contacts.find((c) => c.id === selectedContactId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-7xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-auto max-h-[96vh] flex flex-col">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900">Yeni Satış Faturası Düzenle</h2>
              <p className="text-xs text-stone-500">
                Oluşturulan satış faturası cari hesabına borç olarak yansır ve GİB entegrasyonuna gönderilir.
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

        {/* MODAL BODY */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TEKLİF KAYNAĞI BİLGİSİ (EĞER TEKLİFTEN GELMİŞSE) */}
          {initialOfferNumber && (
            <div className="p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-indigo-900 font-semibold">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>Tekliften Dönüştürülen Fatura:</span>
                <strong className="font-mono bg-white px-2 py-0.5 rounded border border-indigo-200 text-indigo-700">
                  {initialOfferNumber}
                </strong>
                {initialOfferDate && <span className="text-stone-500">({initialOfferDate})</span>}
              </div>
              <span className="text-[11px] text-indigo-600 font-medium">Teklif kalemleri ve bilgileri otomatik aktarıldı</span>
            </div>
          )}

          {/* SENARYO VE PARA BİRİMİ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">E-Fatura Senaryosu</label>
              <select
                value={scenario}
                onChange={(e) => setScenario(e.target.value as any)}
                className="w-full h-10 px-3 bg-white border border-stone-300 rounded-lg text-xs font-bold text-stone-800"
              >
                <option value="TICARI">Ticari Fatura (7 Gün İtirazlı E-Fatura)</option>
                <option value="TEMEL">Temel Fatura (Doğrudan Kabul E-Fatura)</option>
                <option value="E_ARSIV">E-Arşiv Fatura (Bireysel / Vergisiz)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Para Birimi & Kur</label>
              <div className="flex gap-2">
                <select
                  value={currency}
                  onChange={(e) => {
                    const c = e.target.value as any;
                    setCurrency(c);
                    setExchangeRate(c === 'USD' ? 36.5 : c === 'EUR' ? 38.2 : 1);
                  }}
                  className="w-1/2 h-10 px-3 bg-white border border-stone-300 rounded-lg text-xs font-bold text-stone-800"
                >
                  <option value="TRY">₺ Türk Lirası (TRY)</option>
                  <option value="USD">$ Dolar (USD)</option>
                  <option value="EUR">€ Euro (EUR)</option>
                </select>
                {currency !== 'TRY' && (
                  <input
                    type="number"
                    step="0.0001"
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(Number(e.target.value))}
                    placeholder="Döviz Kuru"
                    className="w-1/2 h-10 px-3 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold"
                  />
                )}
              </div>
            </div>
          </div>

          {/* MÜŞTERİ CARİ HESABI */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">Müşteri Cari Hesabı *</label>
            <select
              value={selectedContactId}
              onChange={(e) => handleContactChange(e.target.value)}
              required
              className="w-full h-10 px-3 bg-white border border-stone-300 rounded-lg text-xs font-medium text-stone-900"
            >
              <option value="">Cari Müşteri Seçiniz...</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title || (c as any).contactName} ({c.taxNumber ? `VKN: ${c.taxNumber}` : c.tcNumber ? `TCKN: ${c.tcNumber}` : 'Bireysel'})
                </option>
              ))}
            </select>
          </div>

          {/* ADRES VE VERGİ / TCKN & MAİL BİLGİLERİ */}
          <div className="p-4 bg-stone-50/90 rounded-xl border border-stone-200 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-stone-200 text-stone-700 flex items-center justify-center">
                  <Building className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                  Cari Adres, E-posta ve Vergi / Kimlik Bilgileri
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
                      <ShieldCheck className="w-3 h-3 text-stone-500" /> E-Arşiv Fatura Kapsamında
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* ADRES VE MAİL (7 Sütun) */}
              <div className="lg:col-span-7 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-stone-500" />
                    <span>Adres Tipi & Fatura Adresi *</span>
                  </label>

                  {/* Adres Tipi / Çoklu Adres Seçimi */}
                  {selectedContact?.addresses && selectedContact.addresses.length > 0 ? (
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-[11px] text-stone-500 font-medium">Adres Tipi:</span>
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
                        <option value="custom">✍️ Özel Adres Yaz...</option>
                      </select>
                    </div>
                  ) : (
                    <span className="text-[10px] text-stone-400">Varsayılan Adres</span>
                  )}
                </div>

                <textarea
                  rows={2}
                  value={contactAddress}
                  onChange={(e) => setContactAddress(e.target.value)}
                  placeholder="Fatura üzerinde basılacak açık adres..."
                  required
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs font-medium text-stone-900 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 leading-relaxed placeholder:text-stone-400"
                />

                <div className="flex items-center justify-between text-[10px] text-stone-500">
                  <span>Adres tipi değiştiğinde otomatik güncellenir.</span>
                  {selectedContact && (
                    <button
                      type="button"
                      onClick={() => handleResetToDefaultAddress(selectedContact)}
                      className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 hover:underline font-medium cursor-pointer"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>Varsayılan Adrese Dön</span>
                    </button>
                  )}
                </div>

                {/* E-posta Alanı */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-stone-500" /> E-posta Adresi (Otomatik)
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="cari@firma.com"
                    className="w-full h-8 px-2.5 bg-white border border-stone-300 rounded-lg text-xs text-stone-800 font-medium"
                  />
                </div>
              </div>

              {/* VERGİ / TCKN BÖLÜMÜ (5 Sütun) */}
              <div className="lg:col-span-5 space-y-2.5 bg-white p-3 rounded-lg border border-stone-200">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-stone-800">Cari Türü</label>
                  <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    {taxIdType === 'VKN' ? '🏢 Kurumsal Cari' : '👤 Bireysel Cari'}
                  </span>
                </div>

                {taxIdType === 'VKN' ? (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-0.5">Vergi Numarası (VKN) *</label>
                      <input
                        type="text"
                        maxLength={10}
                        value={contactTaxNumber}
                        onChange={(e) => setContactTaxNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="10 Haneli VKN"
                        className="w-full h-8 px-2.5 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold text-stone-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-0.5">Vergi Dairesi *</label>
                      <input
                        type="text"
                        value={contactTaxOffice}
                        onChange={(e) => setContactTaxOffice(e.target.value)}
                        placeholder="Vergi Dairesi"
                        className="w-full h-8 px-2.5 bg-white border border-stone-300 rounded-lg text-xs font-medium text-stone-900"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-0.5">T.C. Kimlik No (TCKN) *</label>
                      <input
                        type="text"
                        maxLength={11}
                        value={contactTcNumber}
                        onChange={(e) => setContactTcNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="11 Haneli TCKN"
                        className="w-full h-8 px-2.5 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold text-stone-900"
                      />
                    </div>
                  </div>
                )}

                <p className="text-[10px] text-stone-500 leading-tight pt-1">
                  {taxIdType === 'VKN'
                    ? 'Kurumsal cariler için vergi dairesi ve VKN zorunludur.'
                    : 'Bireysel cariler için T.C. Kimlik Numarası otomatik doldurulur.'}
                </p>
              </div>
            </div>
          </div>

          {/* TARİH, VADE, ŞUBE VE PERSONEL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-stone-50 rounded-xl border border-stone-200">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-stone-500" /> Satış Tarihi *
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
                <Clock className="w-3.5 h-3.5 text-amber-600" /> Ödeme Vadesi *
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="w-full h-9 px-3 bg-white border border-stone-300 rounded-lg text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1 flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-stone-500" /> Düzenleyen Şube
              </label>
              <div className="h-9 px-3 bg-stone-100 border border-stone-200 rounded-lg text-xs font-medium flex items-center text-stone-700 truncate">
                {currentBranchName}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-indigo-600" /> Düzenleyen Personel
              </label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => {
                  const emp = employees.find((emp) => emp.id === e.target.value);
                  setSelectedEmployeeId(e.target.value);
                  if (emp) setSelectedEmployeeName(`${emp.firstName} ${emp.lastName} (${emp.title || 'Personel'})`);
                }}
                className="w-full h-9 px-2 bg-white border border-stone-300 rounded-lg text-xs font-medium text-stone-800"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} ({emp.title || 'Personel'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ÇIKIŞ DEPOSU VE EKLE */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 bg-stone-50 p-3 rounded-xl border border-stone-200">
              <div className="flex items-center gap-2">
                <WarehouseIcon className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-stone-800">Çıkış Deposu:</span>
                <select
                  value={items[0]?.warehouseId || ''}
                  onChange={(e) => handleMasterWarehouseChange(e.target.value)}
                  className="h-9 px-3 bg-white border border-stone-300 rounded-lg text-xs font-bold text-stone-900 shadow-2xs focus:ring-2 focus:ring-indigo-500 cursor-pointer min-w-[220px]"
                >
                  <option value="">Depo Seçiniz...</option>
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name} ({wh.warehouseType})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ekle</span>
              </button>
            </div>

            <div className="border border-stone-200 rounded-xl overflow-x-auto shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-stone-100 text-stone-700 border-b border-stone-200 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-2.5 w-8">#</th>
                    <th className="p-2.5 min-w-[260px]">Ürün / Hizmet Adı</th>
                    <th className="p-2.5 w-20">Miktar</th>
                    <th className="p-2.5 w-20">Birim</th>
                    <th className="p-2.5 w-28">Birim Fiyat</th>
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
                          className="w-full h-9 px-2 bg-white border border-stone-300 rounded-lg text-xs font-bold text-stone-900 shadow-2xs"
                        >
                          <option value="">Ürün / Hizmet Adı Seçiniz...</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} {p.skuCode ? `(${p.skuCode})` : ''}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="p-2.5">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                          className="w-full h-9 px-2 bg-white border border-stone-300 rounded-lg text-xs font-mono text-center font-bold"
                        />
                      </td>
                      <td className="p-2.5">
                        <select
                          value={item.unit}
                          onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                          className="w-full h-9 px-1 bg-white border border-stone-300 rounded-lg text-xs"
                        >
                          <option value="Adet">Adet</option>
                          <option value="KG">KG</option>
                          <option value="Metre">Metre</option>
                          <option value="Set">Set</option>
                          <option value="Paket">Paket</option>
                        </select>
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(idx, 'unitPrice', Number(e.target.value))}
                          className="w-full h-9 px-2 bg-white border border-stone-300 rounded-lg text-xs font-mono text-right font-bold"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.discountPercent}
                          onChange={(e) => handleItemChange(idx, 'discountPercent', Number(e.target.value))}
                          className="w-full h-9 px-1 bg-white border border-stone-300 rounded-lg text-xs font-mono text-center"
                        />
                      </td>
                      <td className="p-2.5">
                        <select
                          value={item.vatRate}
                          onChange={(e) => handleItemChange(idx, 'vatRate', Number(e.target.value))}
                          className="w-full h-9 px-1 bg-white border border-stone-300 rounded-lg text-xs text-center"
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
                          className="p-1 text-stone-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer"
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

          {/* NOTLAR VE TOPLAM */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Fatura Açıklaması / Notlar
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Fatura üzerinde yer alacak yasal not veya açıklama..."
                className="w-full p-2.5 bg-white border border-stone-300 rounded-lg text-xs"
              />
            </div>

            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-2.5">
              <div className="flex justify-between text-xs text-stone-600">
                <span>Ara Toplam (Matrah):</span>
                <span className="font-mono font-semibold">
                  {subtotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {currency}
                </span>
              </div>
              {discountTotal > 0 && (
                <div className="flex justify-between text-xs text-rose-600">
                  <span>İskonto Toplamı:</span>
                  <span className="font-mono font-semibold">
                    -{discountTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {currency}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-xs text-stone-600">
                <span>Hesaplanan KDV:</span>
                <span className="font-mono font-semibold">
                  {vatTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {currency}
                </span>
              </div>
              <div className="h-px bg-stone-300 my-2" />
              <div className="flex justify-between text-base font-black text-stone-900">
                <span>Ödenecek Tutar:</span>
                <span className="font-mono text-indigo-700">
                  {grandTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {currency}
                </span>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Faturayı Kaydet & Kes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import {
  TradeOffer,
  TradeInvoice,
  GibInvoice,
  GibDispatch,
  OfferType,
  TradeDirection,
  GibDirection,
  GibCommercialResponse,
} from '../types/trade';
import { fxApi } from './api';
import { DebtCreditItem } from '../types/fx';

const STORAGE_KEYS = {
  OFFERS: 'fx_trade_offers_list',
  INVOICES: 'fx_trade_invoices_list',
  GIB_INVOICES: 'fx_gib_invoices_list',
  GIB_DISPATCHES: 'fx_gib_dispatches_list',
};

// Seed Verileri
const INITIAL_OFFERS: TradeOffer[] = [
  {
    id: 'off-1',
    tenantId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    branchId: 'b1111111-1111-1111-1111-111111111111',
    branchName: 'Merkez Şube (Genel Müdürlük - Levent)',
    offerNumber: 'TLF-2026-0042',
    offerType: 'VERILEN',
    contactId: 'c1',
    contactTitle: 'Ahmet Yılmaz İnşaat ve Otomotiv Ltd. Şti.',
    contactEmail: 'muhasebe@ahmetyilmaz.com.tr',
    contactPhone: '+90 212 455 88 99',
    contactTaxNumber: '0480123456',
    contactTaxOffice: 'Marmara Kurumlar V.D.',
    contactCity: 'İstanbul',
    issueDate: '2026-03-10',
    validUntilDate: '2026-03-25', // 7 gün kaldı
    currency: 'TRY',
    exchangeRate: 1,
    items: [
      {
        id: 'item-1',
        skuCode: 'FLT-OIL-001',
        productName: 'Ağır Vasıta Yağ Filtresi XL-500 (Euro 6)',
        quantity: 50,
        unit: 'Adet',
        unitPrice: 650,
        discountPercent: 5,
        vatRate: 20,
        taxExclusiveAmount: 30875,
        taxAmount: 6175,
        lineTotal: 37050,
      },
      {
        id: 'item-2',
        skuCode: 'FLT-AIR-002',
        productName: 'Endüstriyel Hava Filtresi H-220 Panel',
        quantity: 20,
        unit: 'Adet',
        unitPrice: 1200,
        discountPercent: 0,
        vatRate: 20,
        taxExclusiveAmount: 24000,
        taxAmount: 4800,
        lineTotal: 28800,
      },
    ],
    subtotal: 56500,
    discountTotal: 1625,
    vatTotal: 10975,
    grandTotal: 65850,
    grandTotalTRY: 65850,
    paymentTerms: '%40 Peşin, Kalan 45 Gün Vadeli Çek',
    deliveryTerms: 'Fabrika Teslim (Ex-Works) - 3 İş Günü',
    status: 'SENT',
    notes: '2026 İlkbahar filo bakım paketi özel iskonto teklifi.',
    createdAt: '2026-03-10T09:30:00Z',
    updatedAt: '2026-03-10T09:30:00Z',
  },
  {
    id: 'off-2',
    tenantId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    branchId: 'b1111111-1111-1111-1111-111111111111',
    branchName: 'Merkez Şube (Genel Müdürlük - Levent)',
    offerNumber: 'TLF-2026-0043',
    offerType: 'VERILEN',
    contactId: 'c2',
    contactTitle: 'Borusan Lojistik ve Dağıtım Hizmetleri A.Ş.',
    contactEmail: 'tedarik@borusanlojistik.com',
    contactPhone: '+90 216 570 00 00',
    contactTaxNumber: '1800543210',
    contactCity: 'İstanbul',
    issueDate: '2026-03-14',
    validUntilDate: '2026-03-20', // 2 gün kaldı
    currency: 'USD',
    exchangeRate: 36.5,
    items: [
      {
        id: 'item-3',
        skuCode: 'FLT-HYD-004',
        productName: 'Hidrolik Basınç Filtresi Yüksek Debi (ISO 4406)',
        quantity: 30,
        unit: 'Adet',
        unitPrice: 180,
        discountPercent: 10,
        vatRate: 20,
        taxExclusiveAmount: 4860,
        taxAmount: 972,
        lineTotal: 5832,
      },
    ],
    subtotal: 5400,
    discountTotal: 540,
    vatTotal: 972,
    grandTotal: 5832,
    grandTotalTRY: 212868,
    paymentTerms: 'Fatura Tarihinden İtibaren 60 Gün Vade',
    deliveryTerms: 'Tuzla Lojistik Depo Teslimi',
    status: 'SENT',
    notes: 'Konteyner vinçleri hidrolik revizyon paketi teklifi.',
    createdAt: '2026-03-14T11:00:00Z',
    updatedAt: '2026-03-14T11:00:00Z',
  },
  {
    id: 'off-3',
    tenantId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    branchId: 'b1111111-1111-1111-1111-111111111111',
    branchName: 'Merkez Şube (Genel Müdürlük - Levent)',
    offerNumber: 'TLF-2026-0040',
    offerType: 'VERILEN',
    contactId: 'c3',
    contactTitle: 'Metro Raylı Taşımacılık İşletmeleri A.Ş.',
    contactTaxNumber: '6200987654',
    issueDate: '2026-02-20',
    validUntilDate: '2026-03-05', // Süresi Doldu
    currency: 'TRY',
    exchangeRate: 1,
    items: [
      {
        id: 'item-4',
        skuCode: 'FLT-CAB-003',
        productName: 'Kabin HEPA Karbonlu Havalandırma Filtresi',
        quantity: 120,
        unit: 'Adet',
        unitPrice: 420,
        discountPercent: 0,
        vatRate: 20,
        taxExclusiveAmount: 50400,
        taxAmount: 10080,
        lineTotal: 60480,
      },
    ],
    subtotal: 50400,
    discountTotal: 0,
    vatTotal: 10080,
    grandTotal: 60480,
    grandTotalTRY: 60480,
    paymentTerms: '30 Gün Vade',
    deliveryTerms: 'Depo Teslim',
    status: 'REJECTED',
    notes: 'Müşteri bütçe revizyonu nedeniyle teklifi kabul etmedi.',
    createdAt: '2026-02-20T14:00:00Z',
    updatedAt: '2026-03-06T10:00:00Z',
  },
  {
    id: 'off-4',
    tenantId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    branchId: 'b1111111-1111-1111-1111-111111111111',
    branchName: 'Merkez Şube (Genel Müdürlük - Levent)',
    offerNumber: 'ATLF-2026-0012',
    offerType: 'ALINAN',
    contactId: 'c4',
    contactTitle: 'Mann+Hummel Filtre Sanayi ve Ticaret A.Ş.',
    contactEmail: 'sales.tr@mann-hummel.com',
    contactPhone: '+90 262 677 10 00',
    contactTaxNumber: '6110293847',
    issueDate: '2026-03-12',
    validUntilDate: '2026-03-31',
    currency: 'EUR',
    exchangeRate: 38.2,
    items: [
      {
        id: 'item-5',
        skuCode: 'RAW-PAPER-01',
        productName: 'Mikro Cam Elyaf Filtre Kağıdı Rulo (120gr/m2)',
        quantity: 15,
        unit: 'Rulo',
        unitPrice: 850,
        discountPercent: 8,
        vatRate: 20,
        taxExclusiveAmount: 11730,
        taxAmount: 2346,
        lineTotal: 14076,
      },
    ],
    subtotal: 12750,
    discountTotal: 1020,
    vatTotal: 2346,
    grandTotal: 14076,
    grandTotalTRY: 537703.2,
    paymentTerms: 'Mal Mukabili 90 Gün Vadeli Akreditif',
    deliveryTerms: 'CIF Gebze Gümrük Teslim',
    status: 'ACCEPTED',
    notes: 'Üretim bandı için ithal hammadde teklifi (Kabul Edildi).',
    createdAt: '2026-03-12T16:20:00Z',
    updatedAt: '2026-03-15T09:10:00Z',
  },
  {
    id: 'off-5',
    tenantId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    branchId: 'b1111111-1111-1111-1111-111111111111',
    branchName: 'Merkez Şube (Genel Müdürlük - Levent)',
    offerNumber: 'ATLF-2026-0015',
    offerType: 'ALINAN',
    contactId: 'c5',
    contactTitle: 'Bosch Rexroth Otomasyon San. A.Ş.',
    contactTaxNumber: '1800112233',
    issueDate: '2026-03-15',
    validUntilDate: '2026-04-05',
    currency: 'TRY',
    exchangeRate: 1,
    items: [
      {
        id: 'item-6',
        skuCode: 'SEAL-O-RING-01',
        productName: 'Viton Conta & O-Ring Takımı Endüstriyel',
        quantity: 500,
        unit: 'Paket',
        unitPrice: 45,
        discountPercent: 12,
        vatRate: 20,
        taxExclusiveAmount: 19800,
        taxAmount: 3960,
        lineTotal: 23760,
      },
    ],
    subtotal: 22500,
    discountTotal: 2700,
    vatTotal: 3960,
    grandTotal: 23760,
    grandTotalTRY: 23760,
    paymentTerms: 'Peşin Havale',
    deliveryTerms: 'Kargo ile Adrese Teslim',
    status: 'DRAFT',
    notes: 'Yeni ürün kalıpları için sızdırmazlık contası fiyat teklifi.',
    createdAt: '2026-03-15T14:45:00Z',
    updatedAt: '2026-03-15T14:45:00Z',
  },
];

const INITIAL_INVOICES: TradeInvoice[] = [
  {
    id: 'inv-1',
    tenantId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    branchId: 'b1111111-1111-1111-1111-111111111111',
    branchName: 'Merkez Şube (Genel Müdürlük - Levent)',
    invoiceNumber: 'SAT-2026-000189',
    direction: 'SATIS',
    scenario: 'TICARI',
    invoiceType: 'SATIS',
    contactId: 'c1',
    contactTitle: 'Ahmet Yılmaz İnşaat ve Otomotiv Ltd. Şti.',
    contactTaxNumber: '0480123456',
    contactTaxOffice: 'Marmara Kurumlar V.D.',
    contactAddress: 'İkitelli OSB Metal-İş Sanayi Sitesi 12. Blok No:4 Başakşehir / İstanbul',
    issueDate: '2026-03-01',
    dueDate: '2026-04-30', // 60 gün vade
    currency: 'TRY',
    exchangeRate: 1,
    items: [
      {
        id: 'i-1',
        skuCode: 'FLT-OIL-001',
        productName: 'Ağır Vasıta Yağ Filtresi XL-500 (Euro 6)',
        quantity: 100,
        unit: 'Adet',
        unitPrice: 650,
        discountPercent: 10,
        vatRate: 20,
        taxExclusiveAmount: 58500,
        taxAmount: 11700,
        lineTotal: 70200,
      },
    ],
    subtotal: 65000,
    discountTotal: 6500,
    vatTotal: 11700,
    grandTotal: 70200,
    grandTotalTRY: 70200,
    paymentStatus: 'UNPAID', // Vadesi var, henüz tahsil edilmedi
    paidAmount: 0,
    remainingAmount: 70200,
    gibStatus: 'APPROVED',
    ettn: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    notes: 'GİB Onaylı Ticari E-Fatura (İrsaliye yerine geçer).',
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-03-01T10:00:00Z',
  },
  {
    id: 'inv-2',
    tenantId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    branchId: 'b1111111-1111-1111-1111-111111111111',
    branchName: 'Merkez Şube (Genel Müdürlük - Levent)',
    invoiceNumber: 'SAT-2026-000190',
    direction: 'SATIS',
    scenario: 'E_ARSIV',
    invoiceType: 'SATIS',
    contactId: 'c2',
    contactTitle: 'Borusan Lojistik ve Dağıtım Hizmetleri A.Ş.',
    contactTaxNumber: '1800543210',
    issueDate: '2026-03-05',
    dueDate: '2026-03-20',
    currency: 'TRY',
    exchangeRate: 1,
    items: [
      {
        id: 'i-2',
        skuCode: 'FLT-AIR-002',
        productName: 'Endüstriyel Hava Filtresi H-220 Panel',
        quantity: 40,
        unit: 'Adet',
        unitPrice: 1200,
        discountPercent: 5,
        vatRate: 20,
        taxExclusiveAmount: 45600,
        taxAmount: 9120,
        lineTotal: 54720,
      },
    ],
    subtotal: 48000,
    discountTotal: 2400,
    vatTotal: 9120,
    grandTotal: 54720,
    grandTotalTRY: 54720,
    paymentStatus: 'PARTIAL',
    paidAmount: 25000,
    remainingAmount: 29720,
    gibStatus: 'APPROVED',
    ettn: '3c2efa5a-8f1b-4221-a391-729ab999c112',
    notes: 'Kısmi havale tahsil edildi, bakiye açık.',
    createdAt: '2026-03-05T14:30:00Z',
    updatedAt: '2026-03-05T14:30:00Z',
  },
  {
    id: 'inv-3',
    tenantId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    branchId: 'b1111111-1111-1111-1111-111111111111',
    branchName: 'Merkez Şube (Genel Müdürlük - Levent)',
    invoiceNumber: 'ALS-2026-000084',
    direction: 'ALIS',
    scenario: 'TICARI',
    invoiceType: 'SATIS',
    contactId: 'c4',
    contactTitle: 'Mann+Hummel Filtre Sanayi ve Ticaret A.Ş.',
    contactTaxNumber: '6110293847',
    contactAddress: 'Çerkezköy OSB 4. Cadde No:18 Tekirdağ',
    issueDate: '2026-03-08',
    dueDate: '2026-04-08',
    currency: 'TRY',
    exchangeRate: 1,
    items: [
      {
        id: 'i-3',
        skuCode: 'RAW-PAPER-01',
        productName: 'Mikro Cam Elyaf Filtre Kağıdı Rulo (120gr/m2)',
        quantity: 10,
        unit: 'Rulo',
        unitPrice: 32000,
        discountPercent: 5,
        vatRate: 20,
        taxExclusiveAmount: 304000,
        taxAmount: 60800,
        lineTotal: 364800,
      },
    ],
    subtotal: 320000,
    discountTotal: 16000,
    vatTotal: 60800,
    grandTotal: 364800,
    grandTotalTRY: 364800,
    paymentStatus: 'UNPAID',
    paidAmount: 0,
    remainingAmount: 364800,
    gibStatus: 'APPROVED',
    ettn: '1a98c21b-4112-4eb9-bb88-33a110bb4411',
    notes: 'Tedarikçi hammadde alım faturası. 30 gün vadeli borç.',
    createdAt: '2026-03-08T11:20:00Z',
    updatedAt: '2026-03-08T11:20:00Z',
  },
  {
    id: 'inv-4',
    tenantId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    branchId: 'b1111111-1111-1111-1111-111111111111',
    branchName: 'Merkez Şube (Genel Müdürlük - Levent)',
    invoiceNumber: 'ALS-2026-000085',
    direction: 'ALIS',
    scenario: 'TEMEL',
    invoiceType: 'SATIS',
    contactId: 'c5',
    contactTitle: 'Bosch Rexroth Otomasyon San. A.Ş.',
    contactTaxNumber: '1800112233',
    issueDate: '2026-02-15',
    dueDate: '2026-03-01',
    currency: 'TRY',
    exchangeRate: 1,
    items: [
      {
        id: 'i-4',
        skuCode: 'SEAL-O-RING-01',
        productName: 'Viton Conta & O-Ring Takımı Endüstriyel',
        quantity: 200,
        unit: 'Paket',
        unitPrice: 45,
        discountPercent: 0,
        vatRate: 20,
        taxExclusiveAmount: 9000,
        taxAmount: 1800,
        lineTotal: 10800,
      },
    ],
    subtotal: 9000,
    discountTotal: 0,
    vatTotal: 1800,
    grandTotal: 10800,
    grandTotalTRY: 10800,
    paymentStatus: 'PAID', // Ödendi
    paidAmount: 10800,
    remainingAmount: 0,
    gibStatus: 'APPROVED',
    ettn: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    notes: 'Kasa ödemesi tamamlanmış fatura.',
    createdAt: '2026-02-15T09:15:00Z',
    updatedAt: '2026-03-01T15:00:00Z',
  },
];

const INITIAL_GIB_INVOICES: GibInvoice[] = [
  {
    id: 'gib-in-1',
    ettn: 'e7136f4d-1765-4f40-8b1b-d1235698ab42',
    invoiceNumber: 'MNM2026000004912',
    direction: 'INCOMING',
    scenario: 'TICARI',
    invoiceType: 'SATIS',
    senderTitle: 'Mann+Hummel Filtre Sanayi ve Ticaret A.Ş.',
    senderVkn: '6110293847',
    senderTaxOffice: 'Çerkezköy V.D.',
    senderAddress: 'Çerkezköy OSB 4. Cadde No:18 Tekirdağ',
    receiverTitle: 'FX Finansal Teknolojiler ve Filtre Sistemleri A.Ş.',
    receiverVkn: '3880491204',
    receiverTaxOffice: 'Büyük Mükellefler V.D.',
    issueDate: '2026-03-16',
    envelopeDate: '2026-03-16T10:14:22Z',
    currency: 'TRY',
    taxExclusiveAmount: 145000,
    taxTotal: 29000,
    totalPayable: 174000,
    commercialResponse: 'PENDING',
    commercialDeadline: '2026-03-23 10:14', // 7 Günlük İtiraz süresi: 5 gün kaldı!
    gibStatusCode: 1200,
    gibStatusDescription: 'GİB Zarfı Başarıyla İşlendi - Alıcıya İletildi',
    envelopeUuid: 'env-8842-12aa-9988-bb77ff66',
    isImportedToErp: false, // Henüz sisteme aktarılmadı!
    items: [
      {
        id: 'gib-it-1',
        skuCode: 'FLT-MED-22',
        productName: 'Endüstriyel Filtre Medyası Sentetik Selüloz Karışım 140g',
        quantity: 500,
        unit: 'Metre',
        unitPrice: 290,
        discountPercent: 0,
        vatRate: 20,
        taxExclusiveAmount: 145000,
        taxAmount: 29000,
        lineTotal: 174000,
      },
    ],
    notes: 'Sipariş No: SIP-2026-89 referanslı sevkiyat faturası.',
  },
  {
    id: 'gib-in-2',
    ettn: '8a5291cc-62b1-419b-b567-2c9e78216ab0',
    invoiceNumber: 'KOC2026000010992',
    direction: 'INCOMING',
    scenario: 'TEMEL',
    invoiceType: 'SATIS',
    senderTitle: 'Koçtaş Yapı Marketleri Ticaret A.Ş.',
    senderVkn: '5710012233',
    receiverTitle: 'FX Finansal Teknolojiler ve Filtre Sistemleri A.Ş.',
    receiverVkn: '3880491204',
    issueDate: '2026-03-14',
    envelopeDate: '2026-03-14T15:20:00Z',
    currency: 'TRY',
    taxExclusiveAmount: 12500,
    taxTotal: 2500,
    totalPayable: 15000,
    commercialResponse: 'ACCEPTED',
    commercialDeadline: '2026-03-21 15:20',
    gibStatusCode: 1200,
    gibStatusDescription: 'Temel Fatura - İtiraz Yolu Yok (Sistem Tarafından Onaylandı)',
    envelopeUuid: 'env-3321-44bb-1122-aa55cc44',
    isImportedToErp: true,
    importedInvoiceId: 'inv-4',
    items: [
      {
        id: 'gib-it-2',
        skuCode: 'TOL-SET-01',
        productName: 'Atölye Montaj Takım Çantası & El Aletleri',
        quantity: 2,
        unit: 'Set',
        unitPrice: 6250,
        discountPercent: 0,
        vatRate: 20,
        taxExclusiveAmount: 12500,
        taxAmount: 2500,
        lineTotal: 15000,
      },
    ],
    notes: 'Şube bakım atölyesi demirbaş sarf malzemesi.',
  },
  {
    id: 'gib-out-1',
    ettn: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    invoiceNumber: 'GIB2026000000189',
    direction: 'OUTGOING',
    scenario: 'TICARI',
    invoiceType: 'SATIS',
    senderTitle: 'FX Finansal Teknolojiler ve Filtre Sistemleri A.Ş.',
    senderVkn: '3880491204',
    senderTaxOffice: 'Büyük Mükellefler V.D.',
    receiverTitle: 'Ahmet Yılmaz İnşaat ve Otomotiv Ltd. Şti.',
    receiverVkn: '0480123456',
    receiverTaxOffice: 'Marmara Kurumlar V.D.',
    issueDate: '2026-03-01',
    envelopeDate: '2026-03-01T10:02:15Z',
    currency: 'TRY',
    taxExclusiveAmount: 58500,
    taxTotal: 11700,
    totalPayable: 70200,
    commercialResponse: 'ACCEPTED',
    commercialDeadline: '2026-03-08 10:02',
    gibStatusCode: 1200,
    gibStatusDescription: 'GİB Onaylandı: 1200 - Fatura Başarıyla İletildi (Ticari Kabul)',
    envelopeUuid: 'env-9901-aa33-5566-bb88ee22',
    isImportedToErp: true,
    items: [
      {
        id: 'gib-out-it-1',
        skuCode: 'FLT-OIL-001',
        productName: 'Ağır Vasıta Yağ Filtresi XL-500 (Euro 6)',
        quantity: 100,
        unit: 'Adet',
        unitPrice: 650,
        discountPercent: 10,
        vatRate: 20,
        taxExclusiveAmount: 58500,
        taxAmount: 11700,
        lineTotal: 70200,
      },
    ],
    notes: 'İrsaliye yerine geçer ibarelidir. Vade: 60 gün.',
  },
  {
    id: 'gib-out-2',
    ettn: '3c2efa5a-8f1b-4221-a391-729ab999c112',
    invoiceNumber: 'GIB2026000000190',
    direction: 'OUTGOING',
    scenario: 'E_ARSIV',
    invoiceType: 'SATIS',
    senderTitle: 'FX Finansal Teknolojiler ve Filtre Sistemleri A.Ş.',
    senderVkn: '3880491204',
    receiverTitle: 'Borusan Lojistik ve Dağıtım Hizmetleri A.Ş.',
    receiverVkn: '1800543210',
    issueDate: '2026-03-05',
    envelopeDate: '2026-03-05T14:32:00Z',
    currency: 'TRY',
    taxExclusiveAmount: 45600,
    taxTotal: 9120,
    totalPayable: 54720,
    commercialResponse: 'ACCEPTED',
    commercialDeadline: '2026-03-12 14:32',
    gibStatusCode: 1200,
    gibStatusDescription: 'E-Arşiv Raporlandı - GİB Sistemine İmzalı Olarak İletildi',
    envelopeUuid: 'env-4411-8899-2233-ff77aa99',
    isImportedToErp: true,
    items: [
      {
        id: 'gib-out-it-2',
        skuCode: 'FLT-AIR-002',
        productName: 'Endüstriyel Hava Filtresi H-220 Panel',
        quantity: 40,
        unit: 'Adet',
        unitPrice: 1200,
        discountPercent: 5,
        vatRate: 20,
        taxExclusiveAmount: 45600,
        taxAmount: 9120,
        lineTotal: 54720,
      },
    ],
    notes: 'E-Arşiv fatura e-posta yoluyla teslim edildi.',
  },
];

const INITIAL_GIB_DISPATCHES: GibDispatch[] = [
  {
    id: 'disp-out-1',
    ettn: '7c8291aa-9912-4fb8-b981-d1123499aabb',
    dispatchNumber: 'IRS2026000000088',
    direction: 'OUTGOING',
    scenario: 'TEMEL',
    senderTitle: 'FX Finansal Teknolojiler ve Filtre Sistemleri A.Ş.',
    senderVkn: '3880491204',
    receiverTitle: 'Ahmet Yılmaz İnşaat ve Otomotiv Ltd. Şti.',
    receiverVkn: '0480123456',
    deliveryAddress: 'İkitelli OSB Metal-İş Sanayi Sitesi 12. Blok No:4 Başakşehir / İstanbul',
    issueDate: '2026-03-17',
    despatchDate: '2026-03-17',
    despatchTime: '14:30',
    carrierTitle: 'Öz Trans Lojistik A.Ş.',
    carrierPlateNumber: '34 FX 1905 / 34 DORSE 99',
    driverName: 'Mehmet Salih Demir',
    driverIdNumber: '28910482910',
    status: 'SENT_TO_GIB',
    gibStatusCode: 1200,
    gibStatusDescription: 'GİB e-İrsaliye Başarıyla İletildi ve Plaka Kaydedildi',
    items: [
      {
        name: 'Ağır Vasıta Yağ Filtresi XL-500 (Euro 6)',
        sku: 'FLT-OIL-001',
        quantity: 100,
        unit: 'Adet',
      },
      {
        name: 'Endüstriyel Hava Filtresi H-220 Panel',
        sku: 'FLT-AIR-002',
        quantity: 40,
        unit: 'Adet',
      },
    ],
    notes: 'Taşıma irsaliyesi yoldadır. Araç takip no: OZ-88129',
    createdAt: '2026-03-17T14:15:00Z',
  },
  {
    id: 'disp-in-1',
    ettn: '4b1239aa-7788-4901-a123-bc9988112233',
    dispatchNumber: 'IRS2026000014290',
    direction: 'INCOMING',
    scenario: 'TICARI',
    senderTitle: 'Mann+Hummel Filtre Sanayi ve Ticaret A.Ş.',
    senderVkn: '6110293847',
    receiverTitle: 'FX Finansal Teknolojiler ve Filtre Sistemleri A.Ş.',
    receiverVkn: '3880491204',
    deliveryAddress: 'Büyükdere Cad. No:199 Levent / İstanbul',
    issueDate: '2026-03-16',
    despatchDate: '2026-03-16',
    despatchTime: '09:00',
    carrierTitle: 'Yurtiçi Lojistik Kargo',
    carrierPlateNumber: '59 YR 441',
    driverName: 'Kemal Arslan',
    driverIdNumber: '48190284712',
    status: 'DELIVERED',
    gibStatusCode: 1200,
    gibStatusDescription: 'Teslim Alındı (Depo Stok Sayımı Yapıldı)',
    items: [
      {
        name: 'Endüstriyel Filtre Medyası Sentetik Selüloz Karışım 140g',
        sku: 'FLT-MED-22',
        quantity: 500,
        unit: 'Metre',
      },
    ],
    notes: 'Merkez depo rampasından teslim alındı. Eksik/hasar yok.',
    createdAt: '2026-03-16T09:30:00Z',
  },
];

class TradeService {
  // -------------------------------------------------------------
  // TEKLİF İŞLEMLERİ (VERİLEN / ALINAN)
  // -------------------------------------------------------------
  getOffers(branchId?: string, type?: OfferType): TradeOffer[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.OFFERS);
      let list: TradeOffer[] = saved ? JSON.parse(saved) : INITIAL_OFFERS;
      if (branchId && branchId !== 'all') {
        list = list.filter((o) => o.branchId === branchId);
      }
      if (type) {
        list = list.filter((o) => o.offerType === type);
      }
      return list;
    } catch {
      return INITIAL_OFFERS;
    }
  }

  saveOffers(offers: TradeOffer[]) {
    localStorage.setItem(STORAGE_KEYS.OFFERS, JSON.stringify(offers));
  }

  createOffer(newOfferData: Omit<TradeOffer, 'id' | 'createdAt' | 'updatedAt' | 'offerNumber'>): TradeOffer {
    const list = this.getOffers();
    const prefix = newOfferData.offerType === 'VERILEN' ? 'TLF-2026-' : 'ATLF-2026-';
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const offerNumber = `${prefix}${randomNum}`;

    const newOffer: TradeOffer = {
      ...newOfferData,
      id: `off-${Date.now()}`,
      offerNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newOffer, ...list];
    this.saveOffers(updated);
    return newOffer;
  }

  updateOfferStatus(offerId: string, status: TradeOffer['status']): TradeOffer | null {
    const list = this.getOffers();
    const index = list.findIndex((o) => o.id === offerId);
    if (index === -1) return null;

    list[index] = {
      ...list[index],
      status,
      updatedAt: new Date().toISOString(),
    };
    this.saveOffers(list);
    return list[index];
  }

  // TEKLİFİ TEK TIKLA SATIŞ/ALIŞ FATURASINA DÖNÜŞTÜRME (Sihirli Dönüşüm Zinciri)
  convertOfferToInvoice(offerId: string): TradeInvoice | null {
    const offers = this.getOffers();
    const offer = offers.find((o) => o.id === offerId);
    if (!offer) return null;

    const isSales = offer.offerType === 'VERILEN';
    const direction: TradeDirection = isSales ? 'SATIS' : 'ALIS';
    const prefix = isSales ? 'SAT-2026-' : 'ALS-2026-';
    const invoiceNumber = `${prefix}${Math.floor(100000 + Math.random() * 900000)}`;

    const newInvoice: TradeInvoice = {
      id: `inv-${Date.now()}`,
      tenantId: offer.tenantId,
      branchId: offer.branchId,
      branchName: offer.branchName,
      invoiceNumber,
      direction,
      scenario: 'TICARI',
      invoiceType: 'SATIS',
      contactId: offer.contactId,
      contactTitle: offer.contactTitle,
      contactTaxNumber: offer.contactTaxNumber,
      contactTaxOffice: offer.contactTaxOffice,
      contactTcNumber: offer.contactTcNumber,
      contactAddress: offer.contactAddress,
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: offer.validUntilDate || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      currency: offer.currency,
      exchangeRate: offer.exchangeRate,
      items: offer.items,
      subtotal: offer.subtotal,
      discountTotal: offer.discountTotal,
      vatTotal: offer.vatTotal,
      grandTotal: offer.grandTotal,
      grandTotalTRY: offer.grandTotalTRY,
      paymentStatus: 'UNPAID',
      paidAmount: 0,
      remainingAmount: offer.grandTotal,
      gibStatus: 'APPROVED',
      ettn: crypto.randomUUID ? crypto.randomUUID() : `uuid-${Date.now()}`,
      sourceOfferId: offer.id,
      sourceOfferNumber: offer.offerNumber,
      notes: `${offer.offerNumber} numaralı teklif onaylanarak faturaya dönüştürülmüştür.`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Faturayı ekle
    const invoices = this.getInvoices();
    this.saveInvoices([newInvoice, ...invoices]);

    // Teklifin durumunu CONVERTED yap
    offer.status = 'CONVERTED';
    offer.convertedInvoiceId = newInvoice.id;
    offer.convertedInvoiceNumber = newInvoice.invoiceNumber;
    this.saveOffers(offers);

    // Ödemeler & Tahsilatlar modülüne de otomatik Borç/Alacak kaydı aç!
    try {
      const debtCreditItem: Omit<DebtCreditItem, 'id' | 'createdAt' | 'updatedAt' | 'itemCode'> = {
        tenantId: newInvoice.tenantId,
        branchId: newInvoice.branchId,
        branchName: newInvoice.branchName,
        type: isSales ? 'ALACAK' : 'BORC',
        contactId: newInvoice.contactId,
        contactTitle: newInvoice.contactTitle,
        contactTaxNumber: newInvoice.contactTaxNumber || newInvoice.contactTcNumber,
        totalAmount: newInvoice.grandTotalTRY,
        paidAmount: 0,
        remainingAmount: newInvoice.grandTotalTRY,
        issueDate: newInvoice.issueDate,
        dueDate: newInvoice.dueDate,
        status: 'PENDING',
        documentNumber: newInvoice.invoiceNumber,
        documentType: 'E_FATURA',
        vatRate: 20,
        vatAmount: newInvoice.vatTotal,
        description: `${newInvoice.invoiceNumber} numaralı ${isSales ? 'Satış' : 'Alış'} Faturası`,
        category: isSales ? 'Ürün Satışı' : 'Hammadde Alımı',
        payments: [],
      };
      fxApi.createDebtCredit(debtCreditItem);
    } catch (e) {
      console.warn('Otomatik borç/alacak kaydı açılırken hata:', e);
    }

    return newInvoice;
  }

  // -------------------------------------------------------------
  // FATURA İŞLEMLERİ (SATIŞLAR & ALIŞLAR)
  // -------------------------------------------------------------
  getInvoices(branchId?: string, direction?: TradeDirection): TradeInvoice[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.INVOICES);
      let list: TradeInvoice[] = saved ? JSON.parse(saved) : INITIAL_INVOICES;
      if (branchId && branchId !== 'all') {
        list = list.filter((i) => i.branchId === branchId);
      }
      if (direction) {
        list = list.filter((i) => i.direction === direction);
      }
      return list;
    } catch {
      return INITIAL_INVOICES;
    }
  }

  saveInvoices(invoices: TradeInvoice[]) {
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
  }

  createInvoice(invoiceData: Omit<TradeInvoice, 'id' | 'createdAt' | 'updatedAt' | 'invoiceNumber'>): TradeInvoice {
    const list = this.getInvoices();
    const prefix = invoiceData.direction === 'SATIS' ? 'SAT-2026-' : 'ALS-2026-';
    const invoiceNumber = `${prefix}${Math.floor(100000 + Math.random() * 900000)}`;

    const newInvoice: TradeInvoice = {
      ...invoiceData,
      id: `inv-${Date.now()}`,
      invoiceNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newInvoice, ...list];
    this.saveInvoices(updated);

    // Ödemeler & Tahsilatlar modülüne yansıt
    try {
      const isSales = newInvoice.direction === 'SATIS';
      const debtCreditItem: Omit<DebtCreditItem, 'id' | 'createdAt' | 'updatedAt' | 'itemCode'> = {
        tenantId: newInvoice.tenantId,
        branchId: newInvoice.branchId,
        branchName: newInvoice.branchName,
        type: isSales ? 'ALACAK' : 'BORC',
        contactId: newInvoice.contactId,
        contactTitle: newInvoice.contactTitle,
        contactTaxNumber: newInvoice.contactTaxNumber || newInvoice.contactTcNumber,
        totalAmount: newInvoice.grandTotalTRY,
        paidAmount: newInvoice.paidAmount,
        remainingAmount: newInvoice.remainingAmount,
        issueDate: newInvoice.issueDate,
        dueDate: newInvoice.dueDate,
        status: newInvoice.paymentStatus === 'PAID' ? 'PAID' : newInvoice.paymentStatus === 'PARTIAL' ? 'PARTIAL' : 'PENDING',
        documentNumber: newInvoice.invoiceNumber,
        documentType: 'E_FATURA',
        vatRate: 20,
        vatAmount: newInvoice.vatTotal,
        description: `${newInvoice.invoiceNumber} no'lu fatura kaydı`,
        category: isSales ? 'Ürün Satışı' : 'Mal/Hizmet Alımı',
        payments: [],
      };
      fxApi.createDebtCredit(debtCreditItem);
    } catch (e) {
      console.warn('Otomatik borç-alacak senkronizasyonunda hata:', e);
    }

    return newInvoice;
  }

  sendInvoiceToGib(invoiceId: string): TradeInvoice | null {
    const list = this.getInvoices();
    const index = list.findIndex((i) => i.id === invoiceId);
    if (index === -1) return null;

    list[index] = {
      ...list[index],
      gibStatus: 'APPROVED',
      updatedAt: new Date().toISOString(),
    };
    this.saveInvoices(list);
    return list[index];
  }

  // -------------------------------------------------------------
  // E-FATURA & GİB MERKEZİ İŞLEMLERİ
  // -------------------------------------------------------------
  getGibInvoices(direction?: GibDirection): GibInvoice[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.GIB_INVOICES);
      let list: GibInvoice[] = saved ? JSON.parse(saved) : INITIAL_GIB_INVOICES;
      if (direction) {
        list = list.filter((g) => g.direction === direction);
      }
      return list;
    } catch {
      return INITIAL_GIB_INVOICES;
    }
  }

  saveGibInvoices(invoices: GibInvoice[]) {
    localStorage.setItem(STORAGE_KEYS.GIB_INVOICES, JSON.stringify(invoices));
  }

  // 7 Günlük İtiraz Yanıtı Ver (KABUL / RED)
  respondToGibCommercial(gibInvoiceId: string, response: GibCommercialResponse): GibInvoice | null {
    const list = this.getGibInvoices();
    const index = list.findIndex((i) => i.id === gibInvoiceId);
    if (index === -1) return null;

    list[index] = {
      ...list[index],
      commercialResponse: response,
      gibStatusCode: response === 'ACCEPTED' ? 1210 : 1220,
      gibStatusDescription: response === 'ACCEPTED' ? 'GİB Yanıtı: Kabul Edildi (1210)' : 'GİB Yanıtı: İtiraz / Red Edildi (1220)',
    };
    this.saveGibInvoices(list);
    return list[index];
  }

  // GELEN E-FATURAYI SİSTEME "ALIŞ FATURASI VE STOK" OLARAK AKTAR (Sihirli Entegratör Butonu)
  importGibInvoiceToErp(gibInvoiceId: string): TradeInvoice | null {
    const list = this.getGibInvoices();
    const gibInv = list.find((i) => i.id === gibInvoiceId);
    if (!gibInv || gibInv.isImportedToErp) return null;

    // Alış Faturası Oluştur
    const newInvoice: TradeInvoice = {
      id: `inv-${Date.now()}`,
      tenantId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      branchId: 'b1111111-1111-1111-1111-111111111111',
      branchName: 'Merkez Şube (Genel Müdürlük - Levent)',
      invoiceNumber: gibInv.invoiceNumber,
      direction: 'ALIS',
      scenario: gibInv.scenario === 'TICARI' ? 'TICARI' : 'TEMEL',
      invoiceType: gibInv.invoiceType,
      contactId: 'c-gib-supplier',
      contactTitle: gibInv.senderTitle,
      contactTaxNumber: gibInv.senderVkn,
      contactTaxOffice: gibInv.senderTaxOffice,
      contactAddress: gibInv.senderAddress,
      issueDate: gibInv.issueDate,
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      currency: gibInv.currency,
      exchangeRate: 1,
      items: gibInv.items,
      subtotal: gibInv.taxExclusiveAmount,
      discountTotal: 0,
      vatTotal: gibInv.taxTotal,
      grandTotal: gibInv.totalPayable,
      grandTotalTRY: gibInv.totalPayable,
      paymentStatus: 'UNPAID',
      paidAmount: 0,
      remainingAmount: gibInv.totalPayable,
      gibStatus: 'APPROVED',
      ettn: gibInv.ettn,
      notes: `GİB E-Fatura Sistemi üzerinden otomatik aktarılmıştır. (ETTN: ${gibInv.ettn})`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const invoices = this.getInvoices();
    this.saveInvoices([newInvoice, ...invoices]);

    // GİB faturasını içeri alındı olarak işaretle
    gibInv.isImportedToErp = true;
    gibInv.importedInvoiceId = newInvoice.id;
    this.saveGibInvoices(list);

    // Ödemeler & Tahsilatlar modülüne borç kaydı aç
    try {
      const debtCreditItem: Omit<DebtCreditItem, 'id' | 'createdAt' | 'updatedAt' | 'itemCode'> = {
        tenantId: newInvoice.tenantId,
        branchId: newInvoice.branchId,
        branchName: newInvoice.branchName,
        type: 'BORC',
        contactId: newInvoice.contactId,
        contactTitle: newInvoice.contactTitle,
        contactTaxNumber: newInvoice.contactTaxNumber,
        totalAmount: newInvoice.grandTotalTRY,
        paidAmount: 0,
        remainingAmount: newInvoice.grandTotalTRY,
        issueDate: newInvoice.issueDate,
        dueDate: newInvoice.dueDate,
        status: 'PENDING',
        documentNumber: newInvoice.invoiceNumber,
        documentType: 'E_FATURA',
        vatRate: 20,
        vatAmount: newInvoice.vatTotal,
        description: `${gibInv.senderTitle} firmasından gelen ${gibInv.invoiceNumber} no'lu e-fatura`,
        category: 'GİB İthalat / Hammadde',
        payments: [],
      };
      fxApi.createDebtCredit(debtCreditItem);
    } catch (e) {
      console.warn('GİB aktarım borç kaydı hatası:', e);
    }

    return newInvoice;
  }

  // -------------------------------------------------------------
  // E-İRSALİYE İŞLEMLERİ (GELEN / GİDEN)
  // -------------------------------------------------------------
  getGibDispatches(direction?: GibDirection): GibDispatch[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.GIB_DISPATCHES);
      let list: GibDispatch[] = saved ? JSON.parse(saved) : INITIAL_GIB_DISPATCHES;
      if (direction) {
        list = list.filter((d) => d.direction === direction);
      }
      return list;
    } catch {
      return INITIAL_GIB_DISPATCHES;
    }
  }

  saveGibDispatches(dispatches: GibDispatch[]) {
    localStorage.setItem(STORAGE_KEYS.GIB_DISPATCHES, JSON.stringify(dispatches));
  }

  createGibDispatch(data: Omit<GibDispatch, 'id' | 'createdAt' | 'dispatchNumber' | 'ettn'>): GibDispatch {
    const list = this.getGibDispatches();
    const randomNum = Math.floor(100000000 + Math.random() * 900000000);
    const dispatchNumber = `IRS2026${randomNum}`;
    const ettn = crypto.randomUUID ? crypto.randomUUID() : `uuid-disp-${Date.now()}`;

    const newDispatch: GibDispatch = {
      ...data,
      id: `disp-${Date.now()}`,
      ettn,
      dispatchNumber,
      createdAt: new Date().toISOString(),
    };

    const updated = [newDispatch, ...list];
    this.saveGibDispatches(updated);
    return newDispatch;
  }
}

export const tradeService = new TradeService();

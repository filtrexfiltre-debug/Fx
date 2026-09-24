export type TradeDirection = 'SATIS' | 'ALIS';
export type OfferType = 'VERILEN' | 'ALINAN';
export type OfferStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'CONVERTED';
export type InvoicePaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE';
export type InvoiceGibStatus = 'NOT_SENT' | 'SENT_TO_GIB' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface TradeItemLine {
  id: string;
  productId?: string;
  skuCode: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discountPercent: number;
  vatRate: number; // %0, %1, %10, %20
  taxExclusiveAmount: number; // (quantity * unitPrice) - discount
  taxAmount: number;
  lineTotal: number; // taxExclusiveAmount + taxAmount
  warehouseId?: string;
  warehouseName?: string;
}

export interface TradeOffer {
  id: string;
  tenantId: string;
  branchId: string;
  branchName?: string;
  offerNumber: string; // TLF-2026-0001 (Verilen) veya ATLF-2026-0001 (Alınan)
  offerType: OfferType; // VERILEN (Müşteriye) | ALINAN (Tedarikçiden)
  contactId: string;
  contactTitle: string;
  contactEmail?: string;
  contactPhone?: string;
  contactTaxNumber?: string;
  contactTaxOffice?: string;
  contactTcNumber?: string;
  contactAddress?: string;
  contactCity?: string;

  issueDate: string; // YYYY-MM-DD
  validUntilDate: string; // Opsiyon / Geçerlilik Tarihi (YYYY-MM-DD)
  
  currency: 'TRY' | 'USD' | 'EUR';
  exchangeRate: number; // 1 for TRY

  items: TradeItemLine[];

  subtotal: number; // Ara Toplam
  discountTotal: number; // Toplam İskonto
  vatTotal: number; // Toplam KDV
  grandTotal: number; // Genel Toplam (Teklif Para Biriminde)
  grandTotalTRY: number; // TL Karşılığı

  paymentTerms: string; // Ödeme Koşulu (Örn: "%30 Peşin, Kalan 60 Gün Vade")
  deliveryTerms: string; // Teslimat Şekli (Örn: "Fabrika Teslim / 3 İş Günü")
  
  status: OfferStatus; // DRAFT | SENT | ACCEPTED | REJECTED | CONVERTED
  convertedInvoiceId?: string;
  convertedInvoiceNumber?: string;

  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TradeInvoice {
  id: string;
  tenantId: string;
  branchId: string;
  branchName?: string;
  invoiceNumber: string; // SAT-2026-0001 veya ALS-2026-0001
  direction: TradeDirection; // SATIS | ALIS
  scenario: 'TICARI' | 'TEMEL' | 'E_ARSIV';
  invoiceType: 'SATIS' | 'IADE' | 'TEVKIFAT' | 'ISTISNA';

  contactId: string;
  contactTitle: string;
  contactTaxNumber?: string;
  contactTaxOffice?: string;
  contactTcNumber?: string;
  contactAddress?: string;

  issueDate: string;
  dueDate: string;

  currency: 'TRY' | 'USD' | 'EUR';
  exchangeRate: number;

  items: TradeItemLine[];

  subtotal: number;
  discountTotal: number;
  vatTotal: number;
  grandTotal: number;
  grandTotalTRY: number;

  paymentStatus: InvoicePaymentStatus; // UNPAID | PARTIAL | PAID | OVERDUE
  paidAmount: number;
  remainingAmount: number;

  gibStatus: InvoiceGibStatus; // NOT_SENT | SENT_TO_GIB | APPROVED | REJECTED
  ettn?: string; // UUID

  sourceOfferId?: string;
  sourceOfferNumber?: string;

  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// =========================================================================
// E-FATURA & GİB MERKEZİ TİPLERİ
// =========================================================================
export type GibDirection = 'INCOMING' | 'OUTGOING';
export type GibCommercialResponse = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

export interface GibInvoice {
  id: string;
  ettn: string; // UUID: 128-bit Evrensel Tekil Tanımlayıcı
  invoiceNumber: string; // Örn: GIB2026000001234
  direction: GibDirection; // INCOMING (Gelen) | OUTGOING (Giden)
  scenario: 'TICARI' | 'TEMEL' | 'E_ARSIV' | 'KAMU' | 'IHRACAT';
  invoiceType: 'SATIS' | 'IADE' | 'TEVKIFAT' | 'ISTISNA';

  senderTitle: string;
  senderVkn: string;
  senderTaxOffice?: string;
  senderAddress?: string;

  receiverTitle: string;
  receiverVkn: string;
  receiverTaxOffice?: string;
  receiverAddress?: string;

  issueDate: string; // Düzenleme Tarihi
  envelopeDate: string; // Zarf / GİB Gönderim Tarihi
  
  currency: 'TRY' | 'USD' | 'EUR';
  totalPayable: number; // Ödenecek Tutar
  taxExclusiveAmount: number; // Mal Hizmet Tutarı
  taxTotal: number; // Vergi Tutarı

  commercialResponse: GibCommercialResponse; // PENDING | ACCEPTED | REJECTED | EXPIRED
  commercialDeadline: string; // 7 Günlük İtiraz Bitiş Tarihi (YYYY-MM-DD HH:mm)
  
  gibStatusCode: number; // 1200: Başarıyla İşlendi, 1210: Kullanıcı Kabul Etti, vb.
  gibStatusDescription: string;
  envelopeUuid: string; // GİB Zarf UUID

  isImportedToErp: boolean; // Alış faturası ve stok olarak içeri alındı mı?
  importedInvoiceId?: string;

  items: TradeItemLine[];
  notes?: string;
}

export interface GibDispatch {
  id: string;
  ettn: string; // UUID
  dispatchNumber: string; // Örn: IRS2026000000045
  direction: GibDirection; // INCOMING | OUTGOING
  scenario: 'TEMEL' | 'TICARI';

  senderTitle: string;
  senderVkn: string;
  receiverTitle: string;
  receiverVkn: string;
  deliveryAddress: string;

  issueDate: string; // Düzenleme Tarihi
  despatchDate: string; // Fiili Sevk Tarihi (Zorunlu)
  despatchTime: string; // Fiili Sevk Saati (Zorunlu - HH:mm)

  // Taşıyıcı & Şoför Bilgileri (Yasal Zorunlu)
  carrierTitle?: string; // Taşıyıcı Firma / Kargo
  carrierPlateNumber: string; // Araç Plakası (Zorunlu)
  driverName: string; // Şoför Adı Soyadı (Zorunlu)
  driverIdNumber: string; // Şoför TCKN (Zorunlu)

  status: 'DRAFT' | 'SENT_TO_GIB' | 'DELIVERED' | 'REJECTED';
  gibStatusCode: number;
  gibStatusDescription: string;

  items: Array<{
    name: string;
    sku: string;
    quantity: number;
    unit: string;
  }>;

  notes?: string;
  createdAt: string;
}

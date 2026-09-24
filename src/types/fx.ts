export interface Branch {
  id: string;
  code: string;
  name: string;
  city: string;
  isHeadquarter: boolean;
  address: string;
}

export interface Tenant {
  id: string;
  name: string;
  taxNumber: string; // VKN (10 hane)
  taxOffice: string;
  tradeRegisterNumber: string;
  mersisNumber: string;
}

export interface ContactType {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  isSystem: boolean;
  isActive: boolean;
}

export interface City {
  id: number;
  name: string;
}

export interface District {
  id: string;
  cityId: number;
  name: string;
}

export interface Neighborhood {
  id: string;
  districtId: string;
  name: string;
  postalCode?: string;
}

export interface ContactAddress {
  id: string;
  tenantId: string;
  contactId: string;
  title?: string; // Örn: 'Merkez Fatura Adresi', 'İkitelli Depo'
  addressType: 'INVOICE' | 'DELIVERY' | 'WAREHOUSE' | 'OTHER' | string;
  isDefaultAddress?: boolean;
  cityId?: number;
  cityName?: string;
  districtId?: string;
  neighborhoodId?: string;
  streetLine?: string;
  doorNumber?: string;
  apartmentNumber?: string;
  buildingName?: string;
  blockName?: string;
  siteName?: string;
  formattedAddress?: string;
}

export interface ContactBalance {
  id: string;
  tenantId: string;
  contactId: string;
  currency: string;
  openingBalance: number;
  currentBalance: number;
}

export interface Contact {
  id: string;
  tenantId: string;
  branchId: string;
  contactTypeId: string;
  
  // [Genel Bilgiler]
  code: string;
  status: 'ACTIVE' | 'PASSIVE' | 'LEAD';
  title: string;
  authorizedPerson?: string;
  accountRepresentative?: string;
  referenceInfo?: string;
  mobilePhone1: string;
  mobilePhone2?: string;
  homePhone?: string;
  workPhone?: string;
  email?: string;
  website?: string;
  
  // [Adres Bilgileri] - Create/Update payload için denormalize edilmiş alanlar
  addressType?: 'INVOICE' | 'DELIVERY' | 'WAREHOUSE' | 'OTHER' | string;
  isDefaultAddress?: boolean;
  cityId?: number;
  districtId?: string;
  neighborhoodId?: string;
  streetLine?: string;
  doorNumber?: string;
  apartmentNumber?: string;
  buildingName?: string;
  blockName?: string;
  siteName?: string;
  formattedAddress?: string;
  addresses?: ContactAddress[]; // Kayıtlı Çoklu Adresler (Fatura, Sevkiyat, Depo vb.)

  // [Fatura ve Finansal Bilgiler]
  taxOffice?: string;
  taxNumber?: string;
  tcNumber?: string;
  isEinvoiceTaxpayer: boolean;
  openingBalance?: number;
  currency?: string;
  creditRiskLimit: number;
  defaultPaymentTermsDays: number;
  defaultDiscountAmount: number;
  notes?: string;
  currentBalance?: number; // UI için denormalize bakiye
  
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  vatRate: number; // 0.01, 0.10, 0.20
  vatAmount: number;
  totalAmount: number;
}

export interface Invoice {
  id: string;
  tenantId: string;
  branchId: string;
  invoiceNumber: string; // Şube serisi: örn. FXA202600000001
  contactId: string;
  contactName: string;
  issueDate: string;
  totalAmount: number;
  taxAmount: number;
  grandTotal: number;
  status: 'Draft' | 'Sent' | 'GibApproved' | 'Cancelled';
  gibUuid: string;
  items: InvoiceItem[];
}

export interface CustomerMovement {
  id: string;
  tenantId: string;
  branchId: string;
  contactId: string;
  movementType: 'Debit' | 'Credit'; // Borç / Alacak
  amount: number;
  balanceAfter: number;
  documentType: 'Invoice' | 'Receipt' | 'Virman' | 'Opening';
  documentNumber: string;
  dueDate: string;
  description: string;
  createdAt: string;
}

export interface OperationalExpense {
  id: string;
  tenantId: string;
  branchId: string;
  category: 'Kira' | 'Enerji/Elektrik' | 'Lojistik' | 'Yemek' | 'Pazarlama' | 'Resmi Harç' | 'Genel Yönetim';
  amount: number;
  taxAmount: number;
  expenseDate: string;
  description: string;
  receiptNumber: string;
  isTaxDeductible: boolean;
  isSharedExpense: boolean;
}

export interface Product {
  id: string;
  tenantId: string;
  skuCode: string; // Ürün Kodu *
  barcodeEan13?: string; // EAN-13 Barkod
  unitType: string; // Birim * (Adet, KG, Metre, Litre, Koli, Paket)
  name: string; // Ürün Adı *
  categoryGroup?: string; // Kategori / Grup
  brandName?: string; // Marka
  supplierTitle?: string; // Tedarikçi / Firma

  // Fiyatlandırma, Kâr Oranı & Vergiler
  purchasePrice: number; // Alış Fiyatı (TRY)
  purchaseDiscountPercent: number; // Alış İskonto (%)
  netPurchaseCost: number; // Net Alış Maliyeti (İskonto Sonrası)
  profitMarginPercent: number; // Kâr Marjı (%)
  salePriceExclVat: number; // Satış Fiyatı (TRY) * (KDV Hariç)
  vatRatePercent: number; // KDV Oranı (%) - Varsayılan %20
  salePriceInclVat: number; // Satış (KDV Dahil)
  currency: string; // Para Birimi * (TRY, USD, EUR)

  // Lojistik Hesaplama Alanları
  weightGross?: number; // Brüt Ağırlık (KG)
  widthCm?: number; // En (cm)
  lengthCm?: number; // Boy (cm)
  heightCm?: number; // Yükseklik (cm)
  volumeM3?: number; // Hacim (Metreküp m3)
  calculatedDesi?: number; // Otomatik veya Manuel Girilen Desi ((En*Boy*Yükseklik)/3000 veya m3*333.33)

  // Açılış ve Notlar
  openingStockQuantity: number; // Açılış Stok Miktarı (Adet)
  descriptionNotes?: string; // Ürün Açıklaması & Notlar
  
  // Geriye dönük uyumluluk alanları
  code?: string;
  barcode?: string;
  unit?: string;
  vatRate?: number;
  salePrice?: number;

  createdAt?: string;
  updatedAt?: string;
}

export interface Warehouse {
  id: string;
  tenantId: string;
  branchId?: string;
  warehouseCode: string; // Depo Kodu *
  warehouseType: 'Merkez' | 'Soğuk Hava' | 'Sanal Depo' | 'Şube Deposu' | 'Gümrüklü Depo' | string; // Depo Türü *
  name: string; // Depo Adı *
  managerName?: string; // Depo Sorumlusu
  branchRegion?: string; // Şube Bölge
  status: 'ACTIVE' | 'PASSIVE' | 'MAINTENANCE'; // Durum
  addressLine?: string; // Adres
  createdAt?: string;
}

export interface StockMovement {
  id: string;
  tenantId: string;
  movementDate: string; // Tarih
  productId: string; // Ürün Bağlantısı (Stok Kodu)
  productSku?: string;
  productName?: string;
  warehouseId: string; // Depo Lokasyon Bağlantısı
  warehouseName?: string;
  movementType: 'IN' | 'OUT' | 'TRANSFER_IN' | 'TRANSFER_OUT'; // İşlem Türü *
  quantity: number; // Miktar *
  unitPrice: number; // Birim Fiyat *
  totalAmount: number; // Toplam Tutar * (Miktar * Birim Fiyat)
  documentNumber?: string; // Belge No *
  contactTitle?: string; // Cari Ünvan *
  notes?: string;
  createdAt?: string;
}

export interface WarehouseStock {
  id: string;
  tenantId: string;
  warehouseId: string; // Depo *
  warehouseName?: string;
  productId: string; // Ürün Bağlantısı
  productSku?: string;
  productName?: string;
  unitType?: string;
  criticalStockLevel: number; // Kritik Stok *
  totalQuantity: number; // Toplam Miktar *
  totalCostValue: number; // Maliyet Değeri * (Miktar * Net Alış Maliyeti)
  totalCurrentValue: number; // Güncel Değer * (Miktar * Satış Fiyatı)
}

export interface ShippingRate {
  id: string;
  shippingCompanyName: string; // Kargo Firması Adı (Örn: Yurtiçi Kargo)
  rateTitle: string; // Tarife Başlığı
  minDesi: number; // Minimum Desi Sınırı
  maxDesi: number; // Maksimum Desi Sınırı
  fixedPrice: number; // Dilim Sabit Ücreti
  extraPerDesiPrice: number; // Limit Üstü Ek Desi Başına Ücret
  currency: string;
  isActive: boolean;
}

export interface ProductStock {
  id: string;
  tenantId: string;
  branchId: string;
  productId: string;
  productName: string;
  productCode: string;
  quantity: number;
  reservedQuantity: number;
  minStockLevel: number;
}

export type CashBankType = 'Cash' | 'Bank' | 'POS' | 'CreditCard';

export interface CashBank {
  id: string;
  tenantId: string;
  branchId: string;
  name: string;
  type: CashBankType;
  currencyCode: 'TRY' | 'USD' | 'EUR';
  balance: number; // Cash/Bank: Mevcut Bakiye, POS: Bekleyen Ciro, CreditCard: Güncel Borç Tutarı
  iban?: string;
  accountNumber?: string;
  branchCode?: string;
  bankName?: string;

  // POS Cihazı & Sanal POS Alanları
  posTerminalId?: string; // Terminal / Üye İşyeri No
  posType?: 'PHYSICAL' | 'VIRTUAL'; // Fiziksel Mağaza POS / Sanal POS (E-Ticaret)
  commissionRate?: number; // Komisyon Oranı % (Örn: 1.85)
  valorDays?: number; // Valör / Bloke Süresi (Gün - Örn: 1 veya 30)
  linkedBankAccountId?: string; // Otomatik aktarımın yapılacağı vadesiz banka hesabı
  linkedBankAccountName?: string; // Bağlı vadesiz hesap adı

  // Şirket Kredi Kartı Alanları
  cardHolderName?: string; // Kart Hamili / Tahsis Edilen Personel
  cardNumberLast4?: string; // Son 4 Hane (Örn: 8492)
  cardBankName?: string; // Banka / Kart Programı (Örn: Garanti Bonus Business)
  creditLimit?: number; // Toplam Kart Limiti (Örn: 250.000 TL)
  cutoffDay?: number; // Hesap Kesim Günü (1-31)
  paymentDueDay?: number; // Son Ödeme Günü (1-31)
  minPaymentAmount?: number; // Asgari Ödeme Tutarı
}

export interface ChequeBond {
  id: string;
  tenantId: string;
  branchId: string;
  contactId: string;
  contactName: string;
  serialNumber: string;
  dueDate: string;
  amount: number;
  type: 'Cheque' | 'Bond';
  status: 'InPortfolio' | 'Endorsed' | 'Collected' | 'Bounced';
  drawerBank?: string;
  drawerName: string;
  isCustomerPortion: boolean;
}

export interface Receipt {
  id: string;
  tenantId: string;
  branchId: string;
  contactId: string;
  contactName: string;
  cashBankId: string;
  cashBankName: string;
  receiptNumber: string;
  type: 'Collection' | 'Payment'; // Tahsilat / Ödeme
  totalAmount: number;
  receiptDate: string;
  status: 'Completed' | 'Pending';
}

export interface EmployeeAddress {
  id: string;
  tenantId: string;
  employeeId: string;
  addressType: 'Residence' | 'Notification' | 'Emergency' | string;
  cityId: number;
  cityName?: string;
  districtId: string;
  districtName?: string;
  neighborhoodId?: string;
  streetLine: string;
  doorNumber: string;
  buildingName?: string;
  apartmentNumber?: string;
  blockName?: string;
  siteName?: string;
  formattedAddress?: string;
  isDefault: boolean;
}

export interface Employee {
  id: string;
  tenantId: string;
  branchId: string;
  branchName?: string;
  firstName: string;
  lastName: string;
  identityNumber: string; // 11 haneli TCKN
  phoneNumber?: string;
  email?: string;
  title?: string; // Görev / Unvan
  bloodGroup?: '0 Rh(+)' | '0 Rh(-)' | 'A Rh(+)' | 'A Rh(-)' | 'B Rh(+)' | 'B Rh(-)' | 'AB Rh(+)' | 'AB Rh(-)' | string; // Kan Grubu
  emergencyContactName?: string; // Acil Durum Yakını Ad Soyad
  emergencyContactPhone?: string; // Acil Durum Yakını Telefonu
  emergencyContactRelation?: string; // Yakınlık Derecesi (Örn: Eşi, Anne, Baba, Kardeş)
  birthDate?: string; // Doğum Tarihi (YYYY-MM-DD)
  educationLevel?: 'İlköğretim' | 'Lise' | 'Ön Lisans' | 'Lisans' | 'Yüksek Lisans' | 'Doktora' | string; // Öğrenim Durumu
  employmentType?: 'Tam Zamanlı' | 'Yarı Zamanlı' | 'Uzaktan' | 'Hibrit' | 'Sözleşmeli' | string; // Çalışma Şekli
  salary: number;
  department: string;
  isActive: boolean;
  hireDate: string;
  iban: string;
  addresses?: EmployeeAddress[];
  createdAt?: string;
  updatedAt?: string;
}

export interface TaxAllocation {
  id: string;
  tenantId: string;
  parentExpenseId: string;
  branchId: string;
  branchName: string;
  allocatedAmount: number;
  allocationRatio: number; // 0.40 = %40
  taxType: 'KDV_1' | 'Muhtasar_Gelir' | 'Kurumlar_Vergisi' | 'Damga_Vergisi';
  taxPeriod: string; // '2026/08'
  createdAt: string;
}

export interface InterBranchTransfer {
  id: string;
  tenantId: string;
  transferNumber: string;
  sourceBranchId: string;
  sourceBranchName: string;
  targetBranchId: string;
  targetBranchName: string;
  sourceCashBankId: string;
  sourceCashBankName: string;
  targetCashBankId: string;
  targetCashBankName: string;
  amount: number;
  currencyCode: string;
  description: string;
  status: 'WaitingApproval' | 'Completed' | 'Rejected' | 'RolledBack';
  createdAt: string;
  approvedAt?: string;
  createdByUser: string;
  approvedByUser?: string;
}

export type PaymentMovementType = 'TAHSILAT' | 'ODEME' | 'MASRAF' | 'VIRMAN';
export type PaymentMethodType = 'NAKIT' | 'BANKA' | 'KREDI_KARTI' | 'CEK_SENET';
export type PaymentMovementStatus = 'COMPLETED' | 'PENDING' | 'CANCELLED';

export interface ChequeInfo {
  serialNumber: string;
  bankName: string;
  branchName?: string;
  drawerName: string;
  dueDate: string;
  isCustomerPortion?: boolean;
}

export interface PaymentMovement {
  id: string;
  tenantId: string;
  branchId: string;
  branchName?: string;
  movementType: PaymentMovementType; // TAHSILAT (Giriş), ODEME (Çıkış), MASRAF (Gider), VIRMAN (Mahsup)
  paymentMethod: PaymentMethodType; // NAKIT (Kasa), BANKA (Havale/EFT), KREDI_KARTI (POS), CEK_SENET
  contactId?: string; // İlgili Cari ID
  contactTitle: string; // Cari Ünvan veya Masraf Kalemi Adı
  contactCode?: string; // CAR-0001
  cashBankId: string; // İlgili Kasa / Banka Hesabı ID
  cashBankName: string; // Kasa veya Banka Adı
  amount: number; // İşlem Tutarı
  currency: 'TRY' | 'USD' | 'EUR' | string;
  exchangeRate?: number; // Döviz Kuru
  documentNumber: string; // Fiş / Belge No: THS-2026-0001, ODM-2026-0001 vb.
  receiptNumber?: string; // Makbuz Seri/Sıra No
  movementDate: string; // İşlem Tarihi (ISO)
  dueDate?: string; // Vade Tarihi (Çek/Senet)
  status: PaymentMovementStatus; // COMPLETED, PENDING, CANCELLED
  description: string; // Açıklama
  category?: string; // Masraf Kategorisi (Kira, Enerji, Lojistik, Personel Avans, Vergi/Harç)
  chequeInfo?: ChequeInfo; // Çek / Senet Detayı
  createdAt: string;
  createdByUser?: string;
}

// =========================================================================
// GELİRLER & GİDERLER MODÜLÜ TİPLERİ (REVENUE & EXPENSE MANAGEMENT)
// =========================================================================
export type RevenueExpenseType = 'GELIR' | 'GIDER';

export type RevenueExpenseCategory =
  // Gelir Kategorileri (TDHP 600, 642, 646, 679)
  | 'Ticari Mal Satış Geliri'
  | 'Hizmet & Proje Geliri'
  | 'Danışmanlık & Lisans Geliri'
  | 'Kira & Gayrimenkul Geliri'
  | 'Mevduat Faizi & Repo Geliri'
  | 'Kambiyo & Kur Farkı Geliri'
  | 'Komisyon & Aracılık Geliri'
  | 'Devlet Teşvik, Hibe & İndirim Geliri'
  | 'Diğer Olağandışı Gelir & Kâr'
  // Gider Kategorileri (TDHP 740, 760, 770, 780, 689)
  | 'Kira & Stopaj Gideri'
  | 'Elektrik, Su, Doğalgaz & Enerji'
  | 'Personel Maaş & SGK & Prim'
  | 'Yemek, Servis & Personel Ulaşım'
  | 'Pazarlama, Reklam & Fuar'
  | 'Lojistik, Kargo & Nakliye'
  | 'İletişim, İnternet & GSM'
  | 'Muhasebe, Mali Müşavir & Denetim'
  | 'Yazılım, Bulut Sunucu & Lisans'
  | 'Ofis Kırtasiye, Sarf & Temizlik'
  | 'Bina Bakım, Onarım & Tadilat'
  | 'Banka POS Komisyonu & Hesap Masrafı'
  | 'Kredi Faizi & Finansman Gideri'
  | 'Resmi Harç, Noter & Damga Vergisi'
  | 'Kanunen Kabul Edilmeyen Gider (KKEG)'
  | 'Diğer Faaliyet Masraf & Gideri';

export interface RevenueExpenseCategoryItem {
  id: string;
  name: string;
  type: RevenueExpenseType;
  code: string;
  defaultVat: number;
  description?: string;
  isKkegLikely?: boolean;
  order?: number;
}

export type RevenueExpenseDocumentType =
  | 'E_FATURA'
  | 'E_ARSIV'
  | 'SMM' // Serbest Meslek Makbuzu
  | 'PERAKENDE_FIS'
  | 'BANKA_DEKONTU'
  | 'GIDER_PUSULASI'
  | 'DIGER_BELGE';

export type RevenueExpensePaymentStatus = 'PAID' | 'PENDING' | 'CANCELLED';

export type RevenueExpensePaymentMethod =
  | 'NAKIT'
  | 'HAVALE_EFT'
  | 'KREDI_KARTI'
  | 'CEK_SENET'
  | 'ACIK_HESAP';

export interface RevenueExpenseItem {
  id: string;
  tenantId: string;
  branchId: string;
  branchName?: string;
  type: RevenueExpenseType; // GELIR veya GIDER
  itemCode: string; // GLR-2026-0001 veya GDR-2026-0001
  category: RevenueExpenseCategory | string;
  subCategory?: string;
  title: string; // İşlem Adı / Başlık
  documentType: RevenueExpenseDocumentType;
  documentNumber: string; // Fatura / Fiş No (GIB202600000124)
  transactionDate: string; // YYYY-MM-DD
  dueDate?: string; // Vade Tarihi
  contactId?: string; // İlişkili Cari (varsa)
  contactTitle?: string; // Cari Firma / Şahıs Ünvanı
  contactCode?: string;
  cashBankId?: string; // Kasa veya Banka Hesabı ID
  cashBankName?: string; // Kasa / Banka Hesabı Adı
  paymentStatus: RevenueExpensePaymentStatus; // PAID (Tahsil Edildi / Ödendi), PENDING (Beklemede), CANCELLED
  paymentMethod: RevenueExpensePaymentMethod; // NAKIT, HAVALE_EFT, KREDI_KARTI, CEK_SENET, ACIK_HESAP

  // Finansal ve Vergi Matrahı Detayları
  currency: 'TRY' | 'USD' | 'EUR' | string;
  exchangeRate?: number;
  baseAmount: number; // KDV Hariç Matrah (TRY)
  vatRate: number; // KDV Oranı: 0, 1, 10, 20
  vatAmount: number; // KDV Tutarı
  stoppageRate?: number; // Stopaj Oranı: %0, %10, %20 (Örn: Kira stopajı)
  stoppageAmount?: number; // Stopaj Tutarı
  withholdingRate?: number; // KDV Tevkifat Oranı (Örn: 5/10 = 0.5)
  withholdingAmount?: number; // Tevkifat Tutarı
  grandTotal: number; // Genel Toplam (Ödenecek / Tahsil Edilecek Tutar)
  
  // Vergi ve Muhasebe Nitelikleri
  isKKEG: boolean; // Kanunen Kabul Edilmeyen Gider
  kkegAmount?: number;
  accountingCode?: string; // TDHP Kodu: 600.01, 770.02 vb.
  description: string; // Detaylı Açıklama
  notes?: string;

  createdAt: string;
  createdByUser?: string;
}

// =========================================================================
// BORÇLAR & ALACAKLAR (DEBT & CREDIT / PAYABLES & RECEIVABLES) TİPLERİ
// =========================================================================
export type DebtCreditType = 'ALACAK' | 'BORC'; // ALACAK (Receivable) | BORC (Payable)
export type DebtCreditStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED';
export type DebtCreditDocumentType = 'E_FATURA' | 'E_ARSIV' | 'SENET' | 'CEK' | 'SOZLESME' | 'DIGER';

export interface DebtCreditPaymentRecord {
  id: string;
  debtCreditId: string;
  amount: number;
  paymentDate: string;
  cashBankId: string;
  cashBankName: string;
  paymentMethod: PaymentMethodType;
  receiptNumber?: string;
  description?: string;
  createdAt: string;
  createdByUser?: string;
}

export interface DebtCreditItem {
  id: string;
  tenantId: string;
  branchId: string;
  branchName?: string;
  itemCode: string; // ALC-2026-0001 veya BRC-2026-0001
  type: DebtCreditType; // ALACAK (+) veya BORC (-)
  contactId: string;
  contactTitle: string;
  contactCode?: string;
  contactTaxNumber?: string;
  contactPhone?: string;
  totalAmount: number; // Toplam Tutar
  paidAmount: number; // Tahsil Edilen / Ödenen
  remainingAmount: number; // Kalan Borç / Alacak Bakiyesi
  issueDate: string; // Belge / Fatura Tarihi (YYYY-MM-DD)
  dueDate: string; // Vade Tarihi (YYYY-MM-DD)
  status: DebtCreditStatus; // PENDING | PARTIAL | PAID | OVERDUE | CANCELLED
  documentNumber: string; // Fatura / Belge / Senet No
  documentType: DebtCreditDocumentType;
  vatRate?: number; // %0, %1, %10, %20
  vatAmount?: number;
  description: string;
  category?: string;
  notes?: string;
  documentFileUrl?: string; // Eklenen Fatura / Evrak Dosyası
  documentFileName?: string;
  payments: DebtCreditPaymentRecord[];
  createdAt: string;
  updatedAt: string;
}



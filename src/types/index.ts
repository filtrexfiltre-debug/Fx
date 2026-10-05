import React from 'react';

export type ServisOdemeTuru = 'NAKIT' | 'ACIK_HESAP';
export type ServisDurumu = 'RANDEVU_PLANLANDI' | 'YOLDA_SAHADA' | 'TAMAMLANDI_KAPATILDI' | 'FATURALANDI' | 'IPTAL';
export type ServisTipi = 'PERIYODIK_BAKIM' | 'FILTRE_DEGISIMI' | 'ARIZA_ONARIM' | 'MONTAJ_KURULUM' | 'KESIF_DURUM_TESPITI';
export type CagriGorusmeDurumu = 'RANDEVU_ALINDI' | 'DUSUNECEK_TEKRAR_ARA' | 'ULASILAMADI_MESGUL' | 'YETKILI_YOKTU' | 'IPTAL_BAKIM_ISTEMIYOR' | string;

export interface GridColumnDef<T> {
  field: keyof T | string;
  headerName: string;
  width?: number;
  minWidth?: number;
  align?: 'left' | 'center' | 'right';
  renderCell?: (row: T) => React.ReactNode;
}

export interface Cari {
  id: string;
  code: string;
  title: string;
  shortName: string;
  type: string;
  status: string;
  authorizedPerson: string;
  phone: string;
  phone2: string;
  homePhone: string;
  workPhone: string;
  email: string;
  taxNumber: string;
  taxOffice: string;
  balance: number;
  creditLimit: number;
  paymentTermDays: number;
  riskStatus: string;
  isEInvoice: boolean;
  addressType: string;
  city: string;
  district: string;
  neighborhood: string;
  street: string;
  doorNo: string;
  apartmentNo: string;
  buildingName: string;
  blockName: string;
  siteName: string;
  address: string;
  referenceNote: string;
  notes: string;
  createdAt: string;
  branchId?: string; // Multi-branch support
  addresses?: any[];
}

export interface Stok {
  id: string;
  code: string;
  skuCode?: string;
  name: string;
  category: string;
  categoryGroup?: string;
  unit: string;
  unitType?: string;
  barcode: string;
  barcodeEan13?: string;
  costMethod?: string;
  buyPrice: number;
  purchasePrice?: number;
  sellPrice: number;
  sellingPrice?: number;
  salePrice?: number;
  salePriceExclVat?: number;
  salePriceInclVat?: number;
  vatRate: number;
  vatRatePercent?: number;
  currency: string;
  currentQuantity: number;
  currentStock?: number;
  openingStockQuantity?: number;
  criticalQuantity: number;
  warehouseLocation: string;
  brand: string;
  brandName?: string;
  isActive: boolean;
}

export interface Personel {
  id: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  department: string;
  title?: string;
}

export interface KasaBanka {
  id: string;
  name: string;
  type: string;
  balance: number;
}

export interface MusteriCihazi {
  id: string;
  cariId: string;
  cariTitle: string;
  adresTipi: string;
  il: string;
  ilce: string;
  mahalle: string;
  acikAdres: string;
  yetkiliKisi: string;
  yetkiliTelefon: string;
  cihazAdi: string;
  seriNo: string;
  montajTarihi: string;
  bakimPeriyoduAy: number;
  sonBakimTarihi: string;
  gelecekBakimTarihi: string;
  durum: string;
  ozelNotlar: string;
  branchId?: string; // Multi-branch support
  markaModel?: string; // Marka/Model definition for service devices
  servisTuru?: string; // Servis Türü (Periyodik Bakım, Arıza Onarım, Montaj vb.)
}

export interface CagriAramaKaydi {
  id: string;
  cihazId: string;
  cihazAdi: string;
  cariId: string;
  cariTitle: string;
  telefon: string;
  personelId: string;
  personelAdi: string;
  aramaTarihi: string;
  durum: CagriGorusmeDurumu;
  tekrarAramaTarihi?: string;
  gorusmeNotu: string;
  olusturulanServisFisId?: string;
  branchId?: string; // Multi-branch support
}

export interface ServisFisKalemi {
  id: string;
  stokId: string;
  stokKodu: string;
  stokAdi: string;
  miktar: number;
  birim: string;
  birimFiyat: number;
  kdvOrani: number;
  toplamTutar: number;
}

export interface ServisFisi {
  id: string;
  servisNo: string;
  cihazId: string;
  cihazAdi: string;
  seriNo: string;
  cariId: string;
  cariTitle: string;
  adresTipi: string;
  il?: string;
  ilce?: string;
  mahalle?: string;
  acikAdres?: string;
  telefon: string;
  yetkili: string;
  randevuTarihi: string;
  atananTeknisyenId: string;
  atananTeknisyenAdi: string;
  teknisyenDepoId: string;
  teknisyenDepoAdi: string;
  durum: string;
  odemeTuru: ServisOdemeTuru;
  tahsilatTutari: number;
  kasaId?: string;
  kasaAdi?: string;
  kalemler: ServisFisKalemi[];
  createdAt: string;
  servisTipi?: string;
  servisTuru?: string;
  cihazKaynagi?: string;
  bildirilenAriza?: string;
  teknisyenNotu?: string;
  musteriImza?: boolean;
  faturaId?: string;
  branchId?: string; // Multi-branch support
}

export interface ServisBildirim {
  id: string;
  servisId?: string;
  servisNo?: string;
  cariId: string;
  cariTitle: string;
  telefon: string;
  kanal: 'WHATSAPP' | 'SMS' | string;
  tip: string;
  mesaj: string;
  durum: 'ONAY_BEKLIYOR' | 'GONDERILDI' | 'IPTAL' | string;
  gonderenKullanici?: string;
  olusturmaTarihi: string;
  gonderimTarihi?: string;
  cihazId?: string;
  cihazAdi?: string;
  branchId?: string; // Multi-branch support
}

export interface UnifiedServisBakimItem {
  id: string;
  kayitTipi: 'SERVIS_FISI' | 'BAKIM_HAVUZU';
  kodNo: string;
  tarih: string;
  cariId: string;
  cariTitle: string;
  adresTipi: string;
  yetkili?: string;
  telefon?: string;
  cihazId?: string;
  cihazAdi?: string;
  seriNo?: string;
  aciklama?: string;
  servisTipi: string;
  il?: string;
  ilce?: string;
  mahalle?: string;
  acikAdres?: string;
  atananTeknisyenAdi?: string;
  teknisyenDepoAdi?: string;
  durum: string;
  tahsilatTutari?: number;
  odemeTuru?: string;
  rawServis?: ServisFisi;
  rawCihaz?: MusteriCihazi;
  branchId?: string; // Multi-branch support
}

// ============= API ERROR TYPES =============

export enum ApiErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  BAD_REQUEST = 'BAD_REQUEST',
  SERVER_ERROR = 'SERVER_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN = 'UNKNOWN',
}

export class ApiError extends Error {
  public code: ApiErrorCode | string;
  public status: number;
  public override message: string;
  public details?: unknown;

  constructor(
    param1: number | ApiErrorCode | string,
    param2: string | number,
    param3?: string,
    param4?: unknown
  ) {
    if (typeof param1 === 'number') {
      // Signature: (status, message, code?, details?)
      const status = param1;
      const message = String(param2);
      const code = param3 || (status >= 500 ? ApiErrorCode.SERVER_ERROR : status === 401 ? ApiErrorCode.UNAUTHORIZED : status === 403 ? ApiErrorCode.FORBIDDEN : status === 404 ? ApiErrorCode.NOT_FOUND : ApiErrorCode.UNKNOWN);
      super(message);
      this.status = status;
      this.message = message;
      this.code = code;
      this.details = param4;
    } else {
      // Signature: (code, status, message, details?)
      const code = param1;
      const status = typeof param2 === 'number' ? param2 : 500;
      const message = param3 || 'Bir hata oluştu';
      super(message);
      this.code = code;
      this.status = status;
      this.message = message;
      this.details = param4;
    }
    this.name = 'ApiError';
  }
}


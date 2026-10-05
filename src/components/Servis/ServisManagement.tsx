import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Wrench, 
  Plus, 
  Calendar, 
  PhoneCall, 
  MessageSquare, 
  BarChart3, 
  FileSpreadsheet, 
  FileText, 
  Layers, 
  Users, 
  Cpu, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Building2,
  RefreshCw,
  TrendingUp,
  Search,
  Send,
  Edit2,
  RotateCcw
} from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { appTheme } from '../../lib/agGridTheme';
import { AG_GRID_LOCALE_TR } from '../../lib/agGridLocaleTR';
import {
  ColDef,
  ICellRendererParams,
  GridReadyEvent,
  GridApi,
  RowSelectionOptions,
} from 'ag-grid-community';
import { AgGridColumnSidebar, AgGridSidebarToggleBtn } from '../common/AgGridColumnSidebar';
import { 
  Cari, 
  MusteriCihazi, 
  ServisFisi, 
  CagriAramaKaydi, 
  ServisBildirim, 
  Personel, 
  KasaBanka, 
  Stok,
  ServisOdemeTuru,
  ServisFisKalemi
} from '../../types';
import { fxApi, branchContext } from '../../services/api';
import { Branch, Contact, Employee, Product } from '../../types/fx';
import { TURKEY_CITIES } from '../../data/mockData';
import {
  normalizeServiceType,
  getServiceTypeLabel,
  isServiceTypeMatch,
  SERVIS_TIPI_COLORS,
  SERVIS_TIPI_LABELS,
} from '../../lib/serviceUtils';

// Sub-components
import { AgDataGrid } from '../common/AgDataGrid';
import { YeniServisArizaModal } from './YeniServisArizaModal';
import { YeniBildirimModal } from './YeniBildirimModal';
import { CagriKayitModal } from './CagriKayitModal';
import { CihazTanimModal } from './CihazTanimModal';
import { AramaGecmisiModal } from './AramaGecmisiModal';
import { ServisFisDetayModal } from './ServisFisDetayModal';
import { BakimGanttChart } from './BakimGanttChart';
import { ServisCharts } from './ServisCharts';

// Export functions using standard tools
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Storage keys
const STORAGE_KEYS = {
  SERVIS_FISLERI: 'fx_servis_fisleri',
  CIHAZLAR: 'fx_musteri_cihazlari',
  CAGRI_KAYITLARI: 'fx_cagri_kayitlari',
  BILDIRIMLER: 'fx_servis_bildirimleri',
};

// Seed/Mock Data for Filtrex Su Teknolojileri
const DEFAULT_CIHAZLAR: MusteriCihazi[] = [
  {
    id: 'cihaz-101',
    cariId: 'c1010101-0001-4000-8000-000000000001',
    cariTitle: 'Ege Un Sanayi ve Ticaret A.Ş.',
    adresTipi: 'Fabrika Adresi',
    il: 'İzmir',
    ilce: 'Bornova',
    mahalle: 'Pınarbaşı Mah.',
    acikAdres: 'Sanayi Cd. No: 45, Pınarbaşı Sanayi Bölgesi',
    yetkiliKisi: 'Mehmet Ali Güneş',
    yetkiliTelefon: '0532 987 65 43',
    cihazAdi: 'RO-200 Çift Membranlı Endüstriyel Su Arıtma',
    seriNo: 'FLX-RO-2025-982',
    montajTarihi: '2025-03-15',
    bakimPeriyoduAy: 6,
    sonBakimTarihi: '2025-09-15',
    gelecekBakimTarihi: '2026-03-15',
    durum: 'AKTIF',
    ozelNotlar: 'Membran giriş TDS değeri yüksek. Her bakımda antiskalant kimyasalı kontrol edilmeli.',
    branchId: 'b1111111-1111-1111-1111-111111111111',
    markaModel: 'Endüstriyel Yumuşatma Sistemi',
    servisTuru: 'Periyodik Bakım & Filtre Değişimi'
  },
  {
    id: 'cihaz-102',
    cariId: 'c1010101-0001-4000-8000-000000000002',
    cariTitle: 'Bornova Tıp Merkezi',
    adresTipi: 'Bornova Merkez Şube',
    il: 'İzmir',
    ilce: 'Bornova',
    mahalle: 'Erzene Mah.',
    acikAdres: 'Fevzi Çakmak Cd. No: 12',
    yetkiliKisi: 'Selin Doğan (Başhemşire)',
    yetkiliTelefon: '0505 111 22 33',
    cihazAdi: 'Lab-Deiyonize Ultra Saf Su Sistemi',
    seriNo: 'FLX-LAB-304',
    montajTarihi: '2024-11-20',
    bakimPeriyoduAy: 3,
    sonBakimTarihi: '2025-08-20',
    gelecekBakimTarihi: '2025-11-20',
    durum: 'AKTIF',
    ozelNotlar: 'Kritik laboratuvar cihazlarına bağlı. Su iletkenliği <0.1 µS/cm olmalı. Bakımları geciktirilmemeli.',
    branchId: 'b1111111-1111-1111-1111-111111111111',
    markaModel: 'Ultraviyole Sterilizasyon',
    servisTuru: 'Periyodik Bakım & Filtre Değişimi'
  },
  {
    id: 'cihaz-103',
    cariId: 'c1010101-0001-4000-8000-000000000003',
    cariTitle: 'Kadıköy Kahve Fabrikası Ltd. Şti.',
    adresTipi: 'Moda Mağaza Adresi',
    il: 'İstanbul',
    ilce: 'Kadıköy',
    mahalle: 'Caferağa Mah.',
    acikAdres: 'Moda Cd. No: 88, Caferağa',
    yetkiliKisi: 'Burak Demir',
    yetkiliTelefon: '0544 333 44 55',
    cihazAdi: 'Filtrex Espresso-TDS Kahve Su Arıtma Sistemi',
    seriNo: 'FLX-ESP-501',
    montajTarihi: '2025-01-10',
    bakimPeriyoduAy: 6,
    sonBakimTarihi: '2025-07-10',
    gelecekBakimTarihi: '2026-01-10',
    durum: 'AKTIF',
    ozelNotlar: 'Kahve makinelerinin kireçlenmesini önlemek için bypass vanası %20 açık tutuluyor. Hedef TDS: 80 ppm.',
    branchId: 'b2222222-2222-2222-2222-222222222222',
    markaModel: '5 Aşamalı Tezgah Altı RO',
    servisTuru: 'Periyodik Bakım & Filtre Değişimi'
  }
];

const DEFAULT_SERVIS_FISLERI: ServisFisi[] = [
  {
    id: 'srv-201',
    servisNo: 'SRV-2026-0001',
    cihazId: 'cihaz-101',
    cihazAdi: 'RO-200 Çift Membranlı Endüstriyel Su Arıtma',
    seriNo: 'FLX-RO-2025-982',
    cariId: 'c1010101-0001-4000-8000-000000000001',
    cariTitle: 'Ege Un Sanayi ve Ticaret A.Ş.',
    adresTipi: 'Fabrika Adresi',
    il: 'İzmir',
    ilce: 'Bornova',
    mahalle: 'Pınarbaşı Mah.',
    acikAdres: 'Sanayi Cd. No: 45, Pınarbaşı Sanayi Bölgesi',
    telefon: '0532 987 65 43',
    yetkili: 'Mehmet Ali Güneş',
    randevuTarihi: '2026-03-15',
    atananTeknisyenId: 'emp-101',
    atananTeknisyenAdi: 'Caner Yıldız',
    teknisyenDepoId: 'w-caner-saha',
    teknisyenDepoAdi: 'Caner Yıldız Saha Aracı Deposu',
    durum: 'RANDEVU_PLANLANDI',
    odemeTuru: 'ACIK_HESAP',
    tahsilatTutari: 3200,
    kalemler: [
      {
        id: 'k-1',
        stokId: 's-iscilik',
        stokKodu: 'SRV-ISC-01',
        stokAdi: 'Periyodik Bakım & Saha Servis İşçilik Bedeli',
        miktar: 1,
        birim: 'Adet',
        birimFiyat: 1500,
        kdvOrani: 20,
        toplamTutar: 1800
      },
      {
        id: 'k-2',
        stokId: 's-filtre-sediment',
        stokKodu: 'FLT-SED-20',
        stokAdi: '20 İnç Sediment Ön Filtre (5 Mikron)',
        miktar: 2,
        birim: 'Adet',
        birimFiyat: 583.33,
        kdvOrani: 20,
        toplamTutar: 1400
      }
    ],
    createdAt: '2026-03-01T10:00:00.000Z',
    servisTipi: 'Periyodik Bakım & Filtre Değişimi',
    bildirilenAriza: 'Periyodik 6 aylık filtre değişimi ve karbon filtre temizliği.',
    teknisyenNotu: ''
  },
  {
    id: 'srv-202',
    servisNo: 'SRV-2025-0450',
    cihazId: 'cihaz-102',
    cihazAdi: 'Lab-Deiyonize Ultra Saf Su Sistemi',
    seriNo: 'FLX-LAB-304',
    cariId: 'c1010101-0001-4000-8000-000000000002',
    cariTitle: 'Bornova Tıp Merkezi',
    adresTipi: 'Bornova Merkez Şube',
    il: 'İzmir',
    ilce: 'Bornova',
    mahalle: 'Erzene Mah.',
    acikAdres: 'Fevzi Çakmak Cd. No: 12',
    telefon: '0505 111 22 33',
    yetkili: 'Selin Doğan (Başhemşire)',
    randevuTarihi: '2025-08-20',
    atananTeknisyenId: 'emp-101',
    atananTeknisyenAdi: 'Caner Yıldız',
    teknisyenDepoId: 'w-caner-saha',
    teknisyenDepoAdi: 'Caner Yıldız Saha Aracı Deposu',
    durum: 'TAMAMLANDI_KAPATILDI',
    odemeTuru: 'NAKIT',
    tahsilatTutari: 4500,
    kasaId: 'cb-1',
    kasaAdi: 'Merkez Kasa (TL)',
    kalemler: [
      {
        id: 'k-3',
        stokId: 's-resin',
        stokKodu: 'FLT-RESIN-DI',
        stokAdi: 'Deiyonize Karışık Yataklı Saf Su Reçine Kartuşu',
        miktar: 1,
        birim: 'Adet',
        birimFiyat: 3750,
        kdvOrani: 20,
        toplamTutar: 4500
      }
    ],
    createdAt: '2025-08-19T14:30:00.000Z',
    servisTipi: 'Arıza & Onarım (Cihaz Bozuk / Şikayet Var)',
    bildirilenAriza: 'Saf su çıkış iletkenliği normalin üstünde (0.9 µS/cm). Reçine doygunluğu uyarısı.',
    teknisyenNotu: 'Saf su deiyonize reçine tüpü yenisiyle değiştirildi. Hat temizliği yapıldı. İletkenlik ölçümü 0.05 µS/cm değerine düştü. Sistem sağlıklı çalışıyor.',
    musteriImza: true
  }
];

const DEFAULT_CAGRI_KAYITLARI: CagriAramaKaydi[] = [
  {
    id: 'call-301',
    cihazId: 'cihaz-101',
    cihazAdi: 'RO-200 Çift Membranlı Endüstriyel Su Arıtma',
    cariId: 'c1010101-0001-4000-8000-000000000001',
    cariTitle: 'Ege Un Sanayi ve Ticaret A.Ş.',
    telefon: '0532 987 65 43',
    personelId: 'emp-default',
    personelAdi: 'Selin Kaya',
    aramaTarihi: '2026-03-01T10:15:00.000Z',
    durum: 'RANDEVU_ALINDI',
    gorusmeNotu: 'Gelecek periyodik filtre değişim zamanı hatırlatıldı. 15 Mart 2026 tarihi için Caner Bey teknik servise atandı ve randevu kesinleştirildi.',
    olusturulanServisFisId: 'srv-201',
    branchId: 'b1111111-1111-1111-1111-111111111111'
  }
];

const DEFAULT_BILDIRIMLER: ServisBildirim[] = [
  {
    id: 'notif-401',
    cariId: 'c1010101-0001-4000-8000-000000000001',
    cariTitle: 'Ege Un Sanayi ve Ticaret A.Ş.',
    telefon: '0532 987 65 43',
    kanal: 'WHATSAPP',
    tip: 'Bakım Hatırlatma',
    mesaj: 'Sayın Mehmet Ali Güneş (Ege Un Sanayi ve Ticaret A.Ş.),\n\nRO-200 Çift Membranlı Endüstriyel Su Arıtma cihazınızın periyodik filtre değişim ve bakım zamanı gelmiştir. Randevu için bize ulaşabilirsiniz.',
    durum: 'GONDERILDI',
    gonderenKullanici: 'Selin Kaya',
    olusturmaTarihi: '2026-03-01T10:05:00.000Z',
    gonderimTarihi: '2026-03-01T10:05:30.000Z',
    cihazId: 'cihaz-101',
    cihazAdi: 'RO-200 Çift Membranlı Endüstriyel Su Arıtma',
    branchId: 'b1111111-1111-1111-1111-111111111111'
  }
];

const mapContactToCari = (c: Contact): Cari => {
  const p1 = c.mobilePhone1 || c.workPhone || '0532 111 22 33';
  const p2 = c.mobilePhone2 || c.workPhone || c.homePhone || '0542 999 88 77';
  const foundCity = c.cityId ? TURKEY_CITIES.find(tc => tc.id === c.cityId)?.name : null;
  return {
    id: c.id,
    code: c.code,
    title: c.title,
    shortName: c.title.slice(0, 15),
    type: c.contactTypeId || 'MÜŞTERİ',
    status: c.status,
    authorizedPerson: c.authorizedPerson || '',
    phone: p1,
    phone2: p2,
    homePhone: c.homePhone || '',
    workPhone: c.workPhone || '',
    email: c.email || '',
    taxNumber: c.taxNumber || '',
    taxOffice: c.taxOffice || '',
    balance: c.currentBalance || 0,
    creditLimit: c.creditRiskLimit || 0,
    paymentTermDays: c.defaultPaymentTermsDays || 0,
    riskStatus: 'NORMAL',
    isEInvoice: c.isEinvoiceTaxpayer || false,
    addressType: c.addressType || 'Fatura Adresi',
    city: foundCity || (c.formattedAddress ? c.formattedAddress.split(' ')[0] : 'İzmir'),
    district: c.districtId || 'Bornova',
    neighborhood: c.neighborhoodId || 'Zafer Mah.',
    street: c.streetLine || '',
    doorNo: c.doorNumber || '',
    apartmentNo: c.apartmentNumber || '',
    buildingName: c.buildingName || '',
    blockName: c.blockName || '',
    siteName: c.siteName || '',
    address: c.formattedAddress || '',
    referenceNote: c.notes || '',
    notes: c.notes || '',
    createdAt: c.createdAt || new Date().toISOString(),
    branchId: c.branchId,
    addresses: (c as any).addresses || []
  };
};

const mapEmployeeToPersonel = (e: Employee): Personel => {
  return {
    id: e.id,
    fullName: `${e.firstName} ${e.lastName}`,
    firstName: e.firstName,
    lastName: e.lastName,
    department: e.department || 'Teknik Servis',
    title: e.title || 'Saha Teknisyeni'
  };
};

const mapProductToStok = (p: Product): Stok => {
  const sPrice = p.salePriceExclVat ?? p.salePrice ?? p.sellPrice ?? 0;
  const bPrice = p.purchasePrice ?? p.buyPrice ?? p.netPurchaseCost ?? 0;
  const vRate = p.vatRatePercent !== undefined ? p.vatRatePercent : (p.vatRate !== undefined ? p.vatRate : 20);
  const qty = p.currentStock ?? p.currentQuantity ?? p.openingStockQuantity ?? 50;

  return {
    id: p.id,
    code: p.skuCode || p.code || '',
    skuCode: p.skuCode || p.code || '',
    name: p.name,
    category: p.categoryGroup || p.category || '',
    categoryGroup: p.categoryGroup || p.category || '',
    unit: p.unitType || p.unit || 'Adet',
    unitType: p.unitType || p.unit || 'Adet',
    barcode: p.barcodeEan13 || p.barcode || '',
    barcodeEan13: p.barcodeEan13 || p.barcode || '',
    costMethod: 'FIFO',
    buyPrice: bPrice,
    purchasePrice: bPrice,
    sellPrice: sPrice,
    sellingPrice: sPrice,
    salePrice: sPrice,
    salePriceExclVat: sPrice,
    salePriceInclVat: p.salePriceInclVat || (sPrice * (1 + vRate / 100)),
    vatRate: vRate,
    vatRatePercent: vRate,
    currency: p.currency || 'TRY',
    currentQuantity: qty,
    currentStock: qty,
    openingStockQuantity: p.openingStockQuantity ?? qty,
    criticalQuantity: 5,
    warehouseLocation: 'Merkez',
    brand: p.brandName || p.brand || '',
    brandName: p.brandName || p.brand || '',
    isActive: p.isActive ?? true
  };
};

export function ServisManagement() {
  const [activeTab, setActiveTab] = useState<'isEmirleri' | 'bakimGantt' | 'cihazRegistry' | 'cagriMerkezi' | 'bildirimLogs' | 'analitik'>('bakimGantt');

  const mappedCurrentUser = useMemo<Personel | null>(() => {
    const saved = localStorage.getItem('fx_current_user');
    if (!saved) return null;
    try {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        return {
          id: parsed.email || 'per-logged-in',
          fullName: parsed.name || 'Sorumlu Kullanıcı',
          department: parsed.role || 'Yönetici',
          title: parsed.role || 'Kullanıcı'
        };
      }
    } catch {
      // ignore
    }
    return null;
  }, []);

  // Multi-branch state
  const [selectedBranchId, setSelectedBranchId] = useState<string>(branchContext.getSelectedBranchId());
  const isGlobalUser = branchContext.getIsGlobalUser();
  const [branches, setBranches] = useState<Branch[]>([]);

  // Core Datasets
  const [servisFisleri, setServisFisleri] = useState<ServisFisi[]>([]);
  const [cihazlar, setCihazlar] = useState<MusteriCihazi[]>([]);
  const [cagriKayitlari, setCagriKayitlari] = useState<CagriAramaKaydi[]>([]);
  const [bildirimler, setBildirimler] = useState<ServisBildirim[]>([]);

  // Other dynamic collections
  const [cariler, setCariler] = useState<Cari[]>([]);
  const [personeller, setPersoneller] = useState<Personel[]>([]);
  const [kasalar, setKasalar] = useState<KasaBanka[]>([]);
  const [stoklar, setStoklar] = useState<Stok[]>([]);

  // Active Modals & Operations
  const [isYeniServisOpen, setIsYeniServisOpen] = useState(false);
  const [editingServis, setEditingServis] = useState<ServisFisi | null>(null);
  const [isYeniBildirimOpen, setIsYeniBildirimOpen] = useState(false);
  const [isCagriKayitOpen, setIsCagriKayitOpen] = useState(false);
  const [isCihazTanimOpen, setIsCihazTanimOpen] = useState(false);
  const [editingCihaz, setEditingCihaz] = useState<MusteriCihazi | null>(null);
  const [isAramaGecmisiOpen, setIsAramaGecmisiOpen] = useState(false);
  const [isServisDetayOpen, setIsServisDetayOpen] = useState(false);

  // Selected entities for modals
  const [selectedCihaz, setSelectedCihaz] = useState<MusteriCihazi | null>(null);
  const [selectedServis, setSelectedServis] = useState<ServisFisi | null>(null);
  const [cagriMerkeziSearchTerm, setCagriMerkeziSearchTerm] = useState('');
  const [isModalCreateEmpty, setIsModalCreateEmpty] = useState(false);

  // AG Grid States for Servisler Listesi
  const [servisGridApi, setServisGridApi] = useState<GridApi<ServisFisi> | null>(null);
  const servisGridRef = useRef<AgGridReact<ServisFisi>>(null);
  const [isServisSidebarOpen, setIsServisSidebarOpen] = useState<boolean>(false);
  const servisSidebarButtonRef = useRef<HTMLButtonElement>(null);
  const [servisSearchText, setServisSearchText] = useState<string>('');
  const [servisDurumFilter, setServisDurumFilter] = useState<string>('ALL');
  const [servisTuruFilter, setServisTuruFilter] = useState<string>('ALL');
  const [servisTeknisyenFilter, setServisTeknisyenFilter] = useState<string>('ALL');

  // Initial loads and subscriptions
  useEffect(() => {
    // 1. Fetch static or dynamic lists
    setBranches(fxApi.getBranches());
    
    fxApi.getContacts().then(res => {
      setCariler(res.data.map(mapContactToCari));
    });

    fxApi.getEmployees().then(res => {
      setPersoneller(res.data.map(mapEmployeeToPersonel));
    });

    fxApi.getCashBanks().then(res => {
      setKasalar(res.data);
    });

    // We can assume getting products as stock list
    fxApi.getHeaders(); // to check active branch headers are fine
    // Fallback products/stoklar mapping
    try {
      const storedProducts = localStorage.getItem('fx_products_list');
      if (storedProducts) {
        const parsed: Stok[] = JSON.parse(storedProducts).map((p: any) => mapProductToStok(p));
        setStoklar(parsed);
      } else {
        setStoklar([
          {
            id: 's-iscilik',
            code: 'SRV-ISC-01',
            name: 'Periyodik Bakım & Saha Servis İşçilik Bedeli',
            category: 'Hizmet',
            unit: 'Adet',
            barcode: '',
            costMethod: 'LIFO',
            buyPrice: 0,
            sellPrice: 1500,
            vatRate: 20,
            currency: 'TRY',
            currentQuantity: 9999,
            criticalQuantity: 0,
            warehouseLocation: 'Merkez',
            brand: 'Filtrex',
            isActive: true
          },
          {
            id: 's-filtre-sediment',
            code: 'FLT-SED-20',
            name: '20 İnç Sediment Ön Filtre (5 Mikron)',
            category: 'Filtre Kartuşu',
            unit: 'Adet',
            barcode: '8681234500012',
            costMethod: 'FIFO',
            buyPrice: 200,
            sellPrice: 583.33,
            vatRate: 20,
            currency: 'TRY',
            currentQuantity: 120,
            criticalQuantity: 10,
            warehouseLocation: 'Merkez Depo',
            brand: 'Filtrex',
            isActive: true
          },
          {
            id: 's-resin',
            code: 'FLT-RESIN-DI',
            name: 'Deiyonize Karışık Yataklı Saf Su Reçine Kartuşu',
            category: 'Kartuş',
            unit: 'Adet',
            barcode: '8681234500043',
            costMethod: 'FIFO',
            buyPrice: 1500,
            sellPrice: 3750,
            vatRate: 20,
            currency: 'TRY',
            currentQuantity: 45,
            criticalQuantity: 5,
            warehouseLocation: 'Bornova Depo',
            brand: 'Aquaturk',
            isActive: true
          }
        ]);
      }
    } catch {
      // Ignored
    }

    // 2. Load Core Servis Datasets from API
    const loadCoreData = async () => {
      try {
        const [servisRes, cihazRes, cagriRes, notifRes] = await Promise.all([
          fxApi.getServiceTickets(),
          fxApi.getDevices(),
          fxApi.getCallRecords(),
          fxApi.getNotifications()
        ]);

        if (servisRes.success) setServisFisleri(servisRes.data.length > 0 ? servisRes.data : DEFAULT_SERVIS_FISLERI);
        if (cihazRes.success) setCihazlar(cihazRes.data.length > 0 ? cihazRes.data : DEFAULT_CIHAZLAR);
        if (cagriRes.success) setCagriKayitlari(cagriRes.data.length > 0 ? cagriRes.data : DEFAULT_CAGRI_KAYITLARI);
        if (notifRes.success) setBildirimler(notifRes.data.length > 0 ? notifRes.data : DEFAULT_BILDIRIMLER);
      } catch (err) {
        console.error('Servis verileri yüklenemedi:', err);
      }
    };

    loadCoreData();

    // Subscribe to branch context changes
    const unsubscribe = branchContext.subscribe(() => {
      setSelectedBranchId(branchContext.getSelectedBranchId());
      setBranches(fxApi.getBranches());
      // Re-fetch branch dependent lists (contacts, employees, cash banks)
      fxApi.getContacts().then(res => setCariler(res.data.map(mapContactToCari)));
      fxApi.getEmployees().then(res => setPersoneller(res.data.map(mapEmployeeToPersonel)));
      fxApi.getCashBanks().then(res => setKasalar(res.data));
    });

    return () => unsubscribe();
  }, []);

  // Update localStorage helper
  const updateStorage = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  // Branch filtered collections
  const filteredServisler = useMemo(() => {
    if (selectedBranchId === 'all') return servisFisleri;
    return servisFisleri.filter(s => s.branchId === selectedBranchId);
  }, [servisFisleri, selectedBranchId]);

  const distinctTeknisyenler = useMemo(() => {
    const map = new Map<string, string>();
    filteredServisler.forEach(s => {
      if (s.atananTeknisyenAdi) {
        map.set(s.atananTeknisyenAdi, s.atananTeknisyenAdi);
      }
    });
    return Array.from(map.values()).sort();
  }, [filteredServisler]);

  const filteredServislerForGrid = useMemo(() => {
    let result = filteredServisler;
    if (servisDurumFilter !== 'ALL') {
      result = result.filter(s => s.durum === servisDurumFilter);
    }
    if (servisTuruFilter !== 'ALL') {
      result = result.filter(s => isServiceTypeMatch(s.servisTuru || s.servisTipi, servisTuruFilter));
    }
    if (servisTeknisyenFilter !== 'ALL') {
      result = result.filter(s => s.atananTeknisyenAdi === servisTeknisyenFilter || s.atananTeknisyenId === servisTeknisyenFilter);
    }
    if (servisSearchText.trim()) {
      const q = servisSearchText.trim().toLowerCase();
      result = result.filter(s => 
        (s.servisNo && s.servisNo.toLowerCase().includes(q)) ||
        (s.cariTitle && s.cariTitle.toLowerCase().includes(q)) ||
        (s.cihazAdi && s.cihazAdi.toLowerCase().includes(q)) ||
        (s.seriNo && s.seriNo.toLowerCase().includes(q)) ||
        (s.atananTeknisyenAdi && s.atananTeknisyenAdi.toLowerCase().includes(q)) ||
        (s.telefon && s.telefon.includes(q)) ||
        (s.ilce && s.ilce.toLowerCase().includes(q)) ||
        (s.bildirilenAriza && s.bildirilenAriza.toLowerCase().includes(q)) ||
        (s.teknisyenNotu && s.teknisyenNotu.toLowerCase().includes(q))
      );
    }
    return result;
  }, [filteredServisler, servisDurumFilter, servisTuruFilter, servisTeknisyenFilter, servisSearchText]);

  const filteredCihazlar = useMemo(() => {
    if (selectedBranchId === 'all') return cihazlar;
    return cihazlar.filter(c => c.branchId === selectedBranchId);
  }, [cihazlar, selectedBranchId]);

  const filteredCagriKayitlari = useMemo(() => {
    if (selectedBranchId === 'all') return cagriKayitlari;
    return cagriKayitlari.filter(c => c.branchId === selectedBranchId);
  }, [cagriKayitlari, selectedBranchId]);

  const filteredBildirimler = useMemo(() => {
    if (selectedBranchId === 'all') return bildirimler;
    return bildirimler.filter(b => b.branchId === selectedBranchId);
  }, [bildirimler, selectedBranchId]);

  const combinedGorusmeLogs = useMemo(() => {
    const mappedCalls = filteredCagriKayitlari.map(c => ({
      id: c.id,
      tarih: c.aramaTarihi,
      kanal: 'TELEFON' as const,
      cariTitle: c.cariTitle,
      telefon: c.telefon,
      cihazAdi: c.cihazAdi,
      durum: c.durum,
      icerik: c.gorusmeNotu,
      yapanPersonel: c.personelAdi
    }));

    const mappedNotifications = filteredBildirimler.map(b => ({
      id: b.id,
      tarih: b.olusturmaTarihi,
      kanal: b.kanal as 'WHATSAPP' | 'SMS',
      cariTitle: b.cariTitle,
      telefon: b.telefon || '',
      cihazAdi: b.cihazAdi || 'Cihaz Belirtilmemiş',
      durum: b.durum,
      icerik: b.mesaj,
      yapanPersonel: b.gonderenKullanici || 'Sistem'
    }));

    return [...mappedCalls, ...mappedNotifications].sort((a, b) => {
      try {
        return new Date(b.tarih).getTime() - new Date(a.tarih).getTime();
      } catch (e) {
        return 0;
      }
    });
  }, [filteredCagriKayitlari, filteredBildirimler]);

  // General Statistics Counters for Widgets
  const stats = useMemo(() => {
    const totalJobs = filteredServisler.length;
    const activeRandevular = filteredServisler.filter(s => s.durum === 'RANDEVU_PLANLANDI' || s.durum === 'YOLDA_SAHADA').length;
    const completedJobs = filteredServisler.filter(s => s.durum === 'TAMAMLANDI_KAPATILDI' || s.durum === 'FATURALANDI').length;
    
    // Count delayed or upcoming periodic maintenance devices
    const totalDevices = filteredCihazlar.length;
    const activeCalls = filteredCagriKayitlari.length;
    const sentNotifications = filteredBildirimler.length;

    // Total income from closed service tickets
    const totalTahsilat = filteredServisler
      .filter(s => s.durum === 'TAMAMLANDI_KAPATILDI' || s.durum === 'FATURALANDI')
      .reduce((sum, s) => sum + (s.tahsilatTutari || 0), 0);

    return {
      totalJobs,
      activeRandevular,
      completedJobs,
      totalDevices,
      activeCalls,
      sentNotifications,
      totalTahsilat
    };
  }, [filteredServisler, filteredCihazlar, filteredCagriKayitlari, filteredBildirimler]);

  // Handler: Save / Update Service Ticket from Ariza/Tesisat Modal (Integrated)
  // Handler: Save / Update Service Ticket from Ariza/Tesisat Modal (Atomic Transaction)
  const handleKaydetYeniServis = async (
    yeniServis: Omit<ServisFisi, 'id'>, 
    yeniCihazKaydi?: Omit<MusteriCihazi, 'id'>,
    yeniBildirim?: Omit<ServisBildirim, 'id'>,
    yeniCariKaydi?: Omit<Cari, 'id'>,
    yeniStokKaydi?: Omit<Stok, 'id'>,
    guncellenenCari?: Partial<Cari> & { id: string },
    editServisId?: string,
    guncellenenCihaz?: Partial<MusteriCihazi> & { id: string }
  ) => {
    try {
      const activeBranchToSet = yeniServis.branchId || (selectedBranchId === 'all' ? (branches[0]?.id || 'b1111111-1111-1111-1111-111111111111') : selectedBranchId);

      const res = await fxApi.saveServiceTransaction({
        serviceData: { ...yeniServis, branchId: activeBranchToSet },
        editServisId,
        newDeviceData: yeniCihazKaydi ? { ...yeniCihazKaydi, branchId: activeBranchToSet } : undefined,
        updatedDeviceData: guncellenenCihaz,
        newContactData: yeniCariKaydi ? { ...yeniCariKaydi, branchId: activeBranchToSet } : undefined,
        updatedContactData: guncellenenCari,
        newProductData: yeniStokKaydi ? {
          code: yeniStokKaydi.code,
          name: yeniStokKaydi.name,
          unit: yeniStokKaydi.unit,
          buyPrice: yeniStokKaydi.buyPrice,
          sellPrice: yeniStokKaydi.sellPrice,
          vatRate: yeniStokKaydi.vatRate
        } : undefined,
        notificationData: yeniBildirim ? { ...yeniBildirim, branchId: activeBranchToSet } : undefined,
        branchId: activeBranchToSet
      });

      if (!res.success) {
        throw new Error(res.message || 'Servis ve bağlı kayıtlar kaydedilemedi.');
      }

      // Reload all related states atomically
      const [sRes, cRes, dRes, nRes, stRes] = await Promise.all([
        fxApi.getServiceTickets(),
        fxApi.getContacts(),
        fxApi.getDevices(),
        fxApi.getNotifications(),
        fxApi.getProducts()
      ]);

      if (sRes.success) setServisFisleri(sRes.data);
      if (cRes.success) setCariler(cRes.data.map(mapContactToCari));
      if (dRes.success) setCihazlar(dRes.data);
      if (nRes.success) setBildirimler(nRes.data);
      if (stRes.success) setStoklar(stRes.data.map(mapProductToStok));

      setIsYeniServisOpen(false);
      setEditingServis(null);
      setSelectedCihaz(null);
    } catch (err) {
      alert('Servis ve bağlı kayıtlar kaydedilirken hata oluştu (Tüm işlemler geri alındı): ' + (err instanceof Error ? err.message : 'Bilinmeyen hata'));
      throw err;
    }
  };

  // Handler: Close/Complete Service Ticket & deduct stock/post payment (Atomic Integration)
  const handleKapatServis = async (
    servisId: string, 
    data: {
      kalemler: ServisFisKalemi[];
      odemeTuru: ServisOdemeTuru;
      tahsilatTutari: number;
      kasaId?: string;
      teknisyenNotu?: string;
      musteriImza?: boolean;
    }
  ) => {
    try {
      const res = await fxApi.completeService(servisId, data);
      if (res.success) {
        // Refresh All Related States for instant UI updates (services, stock, cash/bank, and devices)
        const [sRes, stRes, kRes, dRes] = await Promise.all([
          fxApi.getServiceTickets(),
          fxApi.getProducts(), // To refresh stock quantities
          fxApi.getCashBanks(), // To refresh balances
          fxApi.getDevices() // To refresh device maintenance dates (sonBakimTarihi, gelecekBakimTarihi)
        ]);
        
        if (sRes.success) setServisFisleri(sRes.data);
        if (stRes.success) setStoklar(stRes.data.map(mapProductToStok));
        if (kRes.success) setKasalar(kRes.data);
        if (dRes.success) setCihazlar(dRes.data);
        
        setIsServisDetayOpen(false);
        setSelectedServis(null);
      }
    } catch (err) {
      alert('Servis kapatılırken hata oluştu (Tüm işlemler geri alındı): ' + (err instanceof Error ? err.message : 'Bilinmeyen hata'));
    }
  };

  // Handler: Register Call Record (Atomic Call + Service Ticket + Notification)
  const handleKaydetArama = async (
    arama: Omit<CagriAramaKaydi, 'id'>, 
    yeniServis?: Omit<ServisFisi, 'id'>,
    bildirim?: Omit<ServisBildirim, 'id'>
  ) => {
    try {
      const activeBranchToSet = selectedBranchId === 'all' ? (branches[0]?.id || 'b1111111-1111-1111-1111-111111111111') : selectedBranchId;
      const res = await fxApi.saveCallRecordAtomic({
        callData: arama,
        serviceData: yeniServis,
        notificationData: bildirim,
        branchId: activeBranchToSet
      });

      if (!res.success) throw new Error(res.message);

      // Refresh states
      const [cRes, sRes, nRes] = await Promise.all([
        fxApi.getCallRecords(),
        fxApi.getServiceTickets(),
        fxApi.getNotifications()
      ]);

      if (cRes.success) setCagriKayitlari(cRes.data);
      if (sRes.success) setServisFisleri(sRes.data);
      if (nRes.success) setBildirimler(nRes.data);

      if (bildirim && bildirim.telefon) {
        const sanitizedPhone = bildirim.telefon.replace(/\D/g, '');
        const encodedMsg = encodeURIComponent(bildirim.mesaj);
        window.open(`https://api.whatsapp.com/send?phone=${sanitizedPhone}&text=${encodedMsg}`, '_blank');
      }

      setIsCagriKayitOpen(false);
      setSelectedCihaz(null);
    } catch (err) {
      alert('Çağrı kaydı oluşturulamadı (İşlemler geri alındı): ' + (err instanceof Error ? err.message : 'Bilinmeyen hata'));
    }
  };

  // Handler: Create or Update Customer Device (Atomic Device + Open Tickets + Contact Sync)
  const handleKaydetCihaz = async (cihazData: Omit<MusteriCihazi, 'id'>, editId?: string) => {
    try {
      const activeBranchToSet = selectedBranchId === 'all' ? (branches[0]?.id || 'b1111111-1111-1111-1111-111111111111') : selectedBranchId;
      const res = await fxApi.saveDeviceAtomic({
        deviceData: { ...cihazData, branchId: activeBranchToSet },
        editId,
        branchId: activeBranchToSet
      });

      if (!res.success) {
        throw new Error(res.message || 'Cihaz kaydedilemedi.');
      }

      // Reload all related states atomically
      const [dRes, sRes, cRes] = await Promise.all([
        fxApi.getDevices(),
        fxApi.getServiceTickets(),
        fxApi.getContacts()
      ]);

      if (dRes.success) setCihazlar(dRes.data);
      if (sRes.success) setServisFisleri(sRes.data);
      if (cRes.success) setCariler(cRes.data.map(mapContactToCari));

      setIsCihazTanimOpen(false);
      setEditingCihaz(null);
    } catch (err) {
      alert('Cihaz kaydedilirken hata oluştu (İşlemler geri alındı): ' + (err instanceof Error ? err.message : 'Bilinmeyen hata'));
    }
  };

  const handleDeleteCihaz = (cihazId: string) => {
    if (window.confirm('Bu müşteri cihaz kartını silmek istediğinize emin misiniz?')) {
      const updated = cihazlar.filter(c => c.id !== cihazId);
      setCihazlar(updated);
      updateStorage(STORAGE_KEYS.CIHAZLAR, updated);
      setIsCihazTanimOpen(false);
      setEditingCihaz(null);
    }
  };

  // Handler: Save Notification
  const handleKaydetBildirim = (yeniBildirim: Omit<ServisBildirim, 'id'>, autoOpenWhatsApp?: boolean) => {
    const activeBranchToSet = selectedBranchId === 'all' ? (branches[0]?.id || 'b1111111-1111-1111-1111-111111111111') : selectedBranchId;
    const newNotif: ServisBildirim = {
      ...yeniBildirim,
      id: `notif-${Date.now()}`,
      branchId: activeBranchToSet,
      olusturmaTarihi: new Date().toISOString()
    };
    const updated = [newNotif, ...bildirimler];
    setBildirimler(updated);
    updateStorage(STORAGE_KEYS.BILDIRIMLER, updated);
    setIsYeniBildirimOpen(false);

    if (autoOpenWhatsApp && yeniBildirim.telefon) {
      const sanitizedPhone = yeniBildirim.telefon.replace(/\D/g, '');
      const encodedMsg = encodeURIComponent(yeniBildirim.mesaj);
      window.open(`https://api.whatsapp.com/send?phone=${sanitizedPhone}&text=${encodedMsg}`, '_blank');
    }
  };

  // Direct WhatsApp Launcher from Grid/Gantt
  const handleOpenWhatsAppDirect = (cihaz: MusteriCihazi) => {
    const phone = cihaz.yetkiliTelefon || '05551234567';
    const msg = `Sayın ${cihaz.yetkiliKisi || 'Yetkili'},\n\nFiltrex Su Teknolojileri olarak periyodik bakım filtrenizin değişim zamanının yaklaştığını bildirmek isteriz.\n\nRandevu planlaması için ne zaman müsaitsiniz?`;
    const sanitizedPhone = phone.replace(/\D/g, '');
    window.open(`https://api.whatsapp.com/send?phone=${sanitizedPhone}&text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Handler: Update Device Service Type directly from Table (Atomic Device + Service Ticket Sync)
  const handleUpdateCihazServisTuru = (cihazId: string, newServisTuru: string) => {
    const prevDevices = [...cihazlar];
    const prevServisler = [...servisFisleri];

    try {
      const norm = getServiceTypeLabel(newServisTuru);
      const sTipi = normalizeServiceType(newServisTuru);

      const updated = cihazlar.map(c => c.id === cihazId ? { ...c, servisTuru: norm } : c);
      setCihazlar(updated);
      updateStorage(STORAGE_KEYS.CIHAZLAR, updated);

      // Sync any open/pending service tickets for this device
      const updatedServisler = servisFisleri.map(s => {
        if (s.cihazId === cihazId && (s.durum === 'RANDEVU_PLANLANDI' || s.durum === 'YOLDA_SAHADA' || s.durum === 'BEKLEMEDE')) {
          return {
            ...s,
            servisTuru: norm,
            servisTipi: sTipi
          };
        }
        return s;
      });
      setServisFisleri(updatedServisler);
      updateStorage(STORAGE_KEYS.SERVIS_FISLERI, updatedServisler);
    } catch (err) {
      setCihazlar(prevDevices);
      setServisFisleri(prevServisler);
      updateStorage(STORAGE_KEYS.CIHAZLAR, prevDevices);
      updateStorage(STORAGE_KEYS.SERVIS_FISLERI, prevServisler);
      alert('Cihaz servis türü güncellenirken hata oluştu (Geri alındı): ' + (err instanceof Error ? err.message : 'Bilinmeyen hata'));
    }
  };

  // EXPORT UTILS
  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredServisler.map(s => ({
      'Servis No': s.servisNo,
      'Cari Müşteri': s.cariTitle,
      'Cihaz Adı': s.cihazAdi,
      'Seri No': s.seriNo,
      'Randevu Tarihi': s.randevuTarihi,
      'Atanan Teknisyen': s.atananTeknisyenAdi,
      'Durum': s.durum,
      'Ödeme': s.odemeTuru,
      'Tahsilat': s.tahsilatTutari,
      'Servis Tipi': s.servisTipi || 'Genel Bakım'
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Servis Fişleri');
    XLSX.writeFile(wb, `Filtrex_ServisFisleri_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('FILTREX SU TEKNOLOJILERI', 14, 20);
    doc.setFontSize(11);
    doc.text('Servis Fişleri ve Periyodik Bakım Raporu', 14, 28);
    doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')} | Şube Filtresi: ${selectedBranchId === 'all' ? 'Tüm Şubeler' : 'Tekil Şube'}`, 14, 34);

    const headers = [['Servis No', 'Müşteri', 'Cihaz', 'Randevu', 'Teknisyen', 'Durum', 'Tutar']];
    const data = filteredServisler.map(s => [
      s.servisNo,
      s.cariTitle.slice(0, 20),
      s.cihazAdi.slice(0, 15),
      s.randevuTarihi,
      s.atananTeknisyenAdi,
      s.durum.replace('_', ' '),
      `₺${s.tahsilatTutari}`
    ]);

    (doc as any).autoTable({
      head: headers,
      body: data,
      startY: 40,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] }, // Nice indigo header
      styles: { fontSize: 8, font: 'helvetica' }
    });

    doc.save(`Filtrex_Servis_Raporu_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // AG Grid Column Definitions for Servisler Listesi
  const columnsServisDefs = useMemo<ColDef<ServisFisi>[]>(() => [
    {
      field: 'servisNo',
      headerName: 'Servis No & Tarih',
      minWidth: 160,
      width: 170,
      cellRenderer: (params: ICellRendererParams<ServisFisi>) => {
        const data = params.data;
        if (!data) return null;
        return (
          <div className="flex flex-col justify-center py-1">
            <span 
              onClick={() => {
                setEditingServis(data);
                setIsModalCreateEmpty(false);
                setIsYeniServisOpen(true);
              }}
              className="font-mono font-black text-xs text-indigo-700 hover:text-indigo-900 bg-indigo-50/80 px-2 py-0.5 rounded-md border border-indigo-200/80 w-fit cursor-pointer tracking-tight"
            >
              {data.servisNo}
            </span>
            <span className="text-[10px] text-slate-500 font-medium mt-0.5 flex items-center gap-1">
              <Calendar className="w-2.5 h-2.5 text-slate-400" />
              {data.randevuTarihi || (data.createdAt ? data.createdAt.slice(0, 10) : '-')}
            </span>
          </div>
        );
      }
    },
    {
      field: 'cariTitle',
      headerName: 'Cari Ünvan',
      minWidth: 220,
      flex: 1.5,
      cellRenderer: (params: ICellRendererParams<ServisFisi>) => {
        const data = params.data;
        if (!data) return null;
        return (
          <div className="flex flex-col justify-center py-1">
            <span 
              onClick={() => {
                setEditingServis(data);
                setIsModalCreateEmpty(false);
                setIsYeniServisOpen(true);
              }}
              className="font-bold text-slate-900 text-xs hover:text-indigo-600 transition-colors cursor-pointer truncate"
              title={data.cariTitle}
            >
              {data.cariTitle}
            </span>
            <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5 truncate">
              {data.yetkili && <span className="text-slate-700 font-semibold">{data.yetkili}</span>}
              {data.yetkili && <span>&bull;</span>}
              <span className="truncate">{data.il || 'İzmir'} / {data.ilce || ''}</span>
            </div>
          </div>
        );
      }
    },
    {
      field: 'servisTipi',
      headerName: 'Servis Türü',
      minWidth: 165,
      width: 175,
      cellRenderer: (params: ICellRendererParams<ServisFisi>) => {
        const row = params.data;
        if (!row) return null;
        const norm = normalizeServiceType(row.servisTipi || row.servisTuru);
        const colors = SERVIS_TIPI_COLORS[norm];
        const label = SERVIS_TIPI_LABELS[norm];
        return (
          <div className="flex items-center h-full">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${colors.bg} ${colors.text} ${colors.border} truncate`}>
              <span className={`w-1.5 h-1.5 rounded-full ${colors.dot} shrink-0`} />
              {label}
            </span>
          </div>
        );
      }
    },
    {
      field: 'cihazAdi',
      headerName: 'Cihaz & Seri No',
      minWidth: 180,
      width: 190,
      cellRenderer: (params: ICellRendererParams<ServisFisi>) => {
        const data = params.data;
        if (!data) return null;
        return (
          <div className="flex flex-col justify-center py-1">
            <span className="text-xs font-semibold text-slate-800 flex items-center gap-1 truncate">
              <Cpu className="w-3 h-3 text-indigo-500 shrink-0" />
              {data.cihazAdi || 'Arıtma Cihazı'}
            </span>
            <span className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
              SN: <strong className="text-slate-600">{data.seriNo || '-'}</strong>
            </span>
          </div>
        );
      }
    },
    {
      field: 'bildirilenAriza',
      headerName: 'Bildirilen İş / Arıza Notu',
      minWidth: 200,
      flex: 1.2,
      cellRenderer: (params: ICellRendererParams<ServisFisi>) => {
        const data = params.data;
        if (!data) return null;
        return (
          <div className="flex items-center h-full pr-2">
            <p className="text-xs text-slate-600 truncate font-medium" title={data.bildirilenAriza || data.teknisyenNotu || '-'}>
              {data.bildirilenAriza || data.teknisyenNotu || 'Standart periyodik bakım talebi'}
            </p>
          </div>
        );
      }
    },
    {
      field: 'atananTeknisyenAdi',
      headerName: 'Atanan Teknisyen',
      minWidth: 160,
      width: 170,
      cellRenderer: (params: ICellRendererParams<ServisFisi>) => {
        const data = params.data;
        if (!data) return null;
        return (
          <div className="flex flex-col justify-center py-1">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1 truncate">
              <Users className="w-3 h-3 text-indigo-500 shrink-0" />
              {data.atananTeknisyenAdi || 'Atama Bekliyor'}
            </span>
            {data.teknisyenDepoAdi && (
              <span className="text-[10px] text-slate-400 truncate mt-0.5">
                {data.teknisyenDepoAdi}
              </span>
            )}
          </div>
        );
      }
    },
    {
      field: 'durum',
      headerName: 'Durum',
      minWidth: 140,
      width: 150,
      cellRenderer: (params: ICellRendererParams<ServisFisi>) => {
        const row = params.data;
        if (!row) return null;
        let badgeStyle = 'bg-slate-50 text-slate-700 border-slate-200';
        let text = 'Planlandı';
        if (row.durum === 'RANDEVU_PLANLANDI') {
          badgeStyle = 'bg-sky-50 text-sky-800 border-sky-200';
          text = 'Randevu Alındı';
        } else if (row.durum === 'YOLDA_SAHADA') {
          badgeStyle = 'bg-amber-50 text-amber-800 border-amber-250 animate-pulse';
          text = 'Yolda / Sahada';
        } else if (row.durum === 'TAMAMLANDI_KAPATILDI') {
          badgeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-250';
          text = 'Tamamlandı';
        } else if (row.durum === 'FATURALANDI') {
          badgeStyle = 'bg-indigo-50 text-indigo-800 border-indigo-200';
          text = 'Faturalandı';
        } else if (row.durum === 'IPTAL_EDILDI') {
          badgeStyle = 'bg-rose-50 text-rose-800 border-rose-200';
          text = 'İptal Edildi';
        }
        return (
          <div className="flex items-center h-full">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${badgeStyle}`}>
              {text}
            </span>
          </div>
        );
      }
    },
    {
      field: 'tahsilatTutari',
      headerName: 'Tahsilat / Tutar',
      minWidth: 130,
      width: 140,
      cellRenderer: (params: ICellRendererParams<ServisFisi>) => {
        const data = params.data;
        if (!data) return null;
        return (
          <div className="flex flex-col justify-center py-1">
            <span className="font-mono font-bold text-xs text-slate-900">
              ₺{(data.tahsilatTutari || 0).toLocaleString('tr-TR')}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              {data.odemeTuru || 'Ödeme Bekliyor'}
            </span>
          </div>
        );
      }
    },
    {
      colId: 'actions',
      headerName: 'İşlemler',
      minWidth: 170,
      width: 180,
      pinned: 'right',
      cellRenderer: (params: ICellRendererParams<ServisFisi>) => {
        const data = params.data;
        if (!data) return null;
        return (
          <div className="flex items-center gap-1.5 h-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => {
                setEditingServis(data);
                setIsModalCreateEmpty(false);
                setIsYeniServisOpen(true);
              }}
              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1"
              title="Servis Fişini Düzenle"
            >
              <Edit2 className="w-3 h-3" />
              <span>Düzenle</span>
            </button>
            <button
              onClick={() => {
                setSelectedServis(data);
                setIsServisDetayOpen(true);
              }}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs"
              title="Yazdır / Detay Görüntüle"
            >
              <FileText className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      }
    }
  ], []);

  const defaultServisColDef = useMemo<ColDef>(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    floatingFilter: false,
  }), []);

  const rowSelectionServis = useMemo<RowSelectionOptions<ServisFisi>>(
    () => ({
      mode: 'multiRow',
      checkboxes: true,
      headerCheckbox: true,
      enableClickSelection: true,
      selectAll: 'all',
      selectionColumnDef: {
        pinned: 'left',
        width: 48,
        minWidth: 48,
        maxWidth: 48,
        resizable: false,
        sortable: false,
        suppressColumnsToolPanel: true,
      },
    }),
    []
  );

  // Define Columns for grids
  const columnsServis = [
    { field: 'servisNo', headerName: 'Servis No', width: 140, renderCell: (row: ServisFisi) => (
      <span className="font-mono font-bold text-slate-800">{row.servisNo}</span>
    )},
    { field: 'cariTitle', headerName: 'Müşteri / Cari', minWidth: 200, renderCell: (row: ServisFisi) => (
      <div>
        <div className="font-semibold text-slate-900 leading-tight">{row.cariTitle}</div>
        <div className="text-[10px] text-slate-500 mt-0.5">{row.yetkili} &bull; {row.telefon}</div>
      </div>
    )},
    { field: 'cihazAdi', headerName: 'Cihaz & Seri No', minWidth: 180, renderCell: (row: ServisFisi) => (
      <div>
        <div className="font-medium text-slate-800">{row.cihazAdi}</div>
        <div className="text-[10px] font-mono text-indigo-600 mt-0.5">{row.seriNo}</div>
      </div>
    )},
    { field: 'randevuTarihi', headerName: 'Tarih', width: 110, renderCell: (row: ServisFisi) => (
      <span className="font-medium">{row.randevuTarihi}</span>
    )},
    { field: 'servisTipi', headerName: 'Servis Türü', width: 160, renderCell: (row: ServisFisi) => {
      const norm = normalizeServiceType(row.servisTipi || row.servisTuru);
      const colors = SERVIS_TIPI_COLORS[norm];
      const text = SERVIS_TIPI_LABELS[norm];
      return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${colors.bg} ${colors.text} ${colors.border}`}>
          {text}
        </span>
      );
    }},
    { field: 'atananTeknisyenAdi', headerName: 'Atanan Teknisyen', width: 140, renderCell: (row: ServisFisi) => (
      <span className="inline-flex items-center gap-1 font-medium text-slate-700">
        <Wrench className="w-3 h-3 text-slate-400" />
        {row.atananTeknisyenAdi}
      </span>
    )},
    { field: 'durum', headerName: 'Durum', width: 150, renderCell: (row: ServisFisi) => {
      let badgeStyle = 'bg-slate-50 text-slate-700 border-slate-200';
      let text = 'Planlandı';
      if (row.durum === 'RANDEVU_PLANLANDI') {
        badgeStyle = 'bg-sky-50 text-sky-800 border-sky-200';
        text = 'Randevu Alındı';
      } else if (row.durum === 'YOLDA_SAHADA') {
        badgeStyle = 'bg-amber-50 text-amber-800 border-amber-200 animate-pulse';
        text = 'Yolda / Sahada';
      } else if (row.durum === 'TAMAMLANDI_KAPATILDI') {
        badgeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-200';
        text = 'Tamamlandı';
      } else if (row.durum === 'FATURALANDI') {
        badgeStyle = 'bg-indigo-50 text-indigo-800 border-indigo-200';
        text = 'Faturalandı';
      }
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badgeStyle}`}>
          {text}
        </span>
      );
    }},
    { field: 'tahsilatTutari', headerName: 'Tutar', width: 110, align: 'right' as const, renderCell: (row: ServisFisi) => (
      <span className="font-bold text-slate-900">₺{row.tahsilatTutari?.toLocaleString('tr-TR')}</span>
    )},
    { field: 'actions', headerName: 'İşlemler', width: 140, align: 'center' as const, renderCell: (row: ServisFisi) => (
      <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => {
            setEditingServis(row);
            setIsModalCreateEmpty(false);
            setIsYeniServisOpen(true);
          }}
          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold shadow-2xs cursor-pointer transition-colors flex items-center gap-1"
          title="Servis kaydını düzenle / detaylarını incele"
        >
          <Edit2 className="w-3 h-3" />
          Düzenle
        </button>
        <button
          onClick={() => {
            setEditingServis(row);
            setIsModalCreateEmpty(false);
            setIsYeniServisOpen(true);
          }}
          className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold shadow-2xs hover:border-slate-300 cursor-pointer transition-colors"
          title="Servis kaydı detaylarını görüntüle ve düzenle"
        >
          Detay
        </button>
      </div>
    )}
  ];

  const columnsCihazlar = [
    { field: 'cihazAdi', headerName: 'Cihaz / Sistem Adı *', minWidth: 200, renderCell: (row: MusteriCihazi) => (
      <div>
        <div className="font-semibold text-slate-900">{row.cihazAdi}</div>
        <div className="text-[10px] text-slate-500 font-mono mt-0.5">S/N: {row.seriNo}</div>
      </div>
    )},
    { field: 'cariTitle', headerName: 'Cari Unvan (Firma / Şahıs Adı) *', minWidth: 200, renderCell: (row: MusteriCihazi) => (
      <div>
        <div className="font-medium text-slate-800">{row.cariTitle}</div>
        <div className="text-[10px] text-slate-400 mt-0.5">{row.adresTipi} &bull; {row.il} / {row.ilce}</div>
      </div>
    )},
    { field: 'bakimPeriyoduAy', headerName: 'Periyot', width: 90, align: 'center' as const, renderCell: (row: MusteriCihazi) => (
      <span className="font-semibold">{row.bakimPeriyoduAy} Ay</span>
    )},
    { field: 'servisTuru', headerName: 'Servis Türü *', width: 170, renderCell: (row: MusteriCihazi) => (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
        <Wrench className="w-2.5 h-2.5 text-indigo-500" />
        {row.servisTuru || 'Periyodik Bakım & Filtre Değişimi'}
      </span>
    )},
    { field: 'montajTarihi', headerName: 'Montaj Tarihi', width: 110, renderCell: (row: MusteriCihazi) => (
      <span className="font-medium text-slate-700">{row.montajTarihi ? new Date(row.montajTarihi).toLocaleDateString('tr-TR') : 'Belirtilmemiş'}</span>
    )},
    { field: 'garantiDurumu', headerName: 'Garanti Süresi ve Durumu', minWidth: 180, renderCell: (row: MusteriCihazi) => {
      if (!row.montajTarihi) return <span className="text-slate-400 text-xs">Belirtilmemiş</span>;
      try {
        const montaj = new Date(row.montajTarihi);
        const garantiBitis = new Date(montaj);
        garantiBitis.setFullYear(montaj.getFullYear() + 2); // Default 2 years warranty
        const bugun = new Date();
        const isAktif = garantiBitis.getTime() > bugun.getTime();
        
        const bitisStr = garantiBitis.toLocaleDateString('tr-TR');
        
        return isAktif ? (
          <div className="flex flex-col">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-250 w-fit">
              Garanti Devam Ediyor
            </span>
            <span className="text-[10px] text-slate-500 font-medium mt-1">Bitiş: {bitisStr} (2 Yıl)</span>
          </div>
        ) : (
          <div className="flex flex-col">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 w-fit">
              Garanti Süresi Doldu
            </span>
            <span className="text-[10px] text-slate-400 font-medium mt-1">Bitiş: {bitisStr}</span>
          </div>
        );
      } catch (e) {
        return <span className="text-slate-400 text-xs">Hata</span>;
      }
    }},
    { field: 'sonBakimTarihi', headerName: 'Son Bakım', width: 110, renderCell: (row: MusteriCihazi) => (
      <span className="font-medium text-slate-700">{row.sonBakimTarihi ? new Date(row.sonBakimTarihi).toLocaleDateString('tr-TR') : 'Yazılmamış'}</span>
    )},
    { field: 'gelecekBakimTarihi', headerName: 'Gelecek Bakım', width: 110, renderCell: (row: MusteriCihazi) => (
      <span className="font-bold text-indigo-600">{row.gelecekBakimTarihi ? new Date(row.gelecekBakimTarihi).toLocaleDateString('tr-TR') : 'Yazılmamış'}</span>
    )},
    { field: 'durum', headerName: 'Durum', width: 100, renderCell: (row: MusteriCihazi) => (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3" /> {row.durum}
      </span>
    )},
    { field: 'ozelNotlar', headerName: 'Kurulum Notu', minWidth: 200, renderCell: (row: MusteriCihazi) => (
      <span className="text-xs text-slate-600 truncate max-w-[180px] block" title={row.ozelNotlar}>
        {row.ozelNotlar || '-'}
      </span>
    )},
    { field: 'islemler', headerName: 'İşlemler', width: 145, align: 'center' as const, renderCell: (row: MusteriCihazi) => (
      <div className="flex items-center gap-1.5 justify-center">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedCihaz(row);
            setEditingServis(null);
            setIsModalCreateEmpty(false);
            setIsYeniServisOpen(true);
          }}
          className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 border border-indigo-200 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
          title="Bu cihaza Servis / İş Emri Aç"
        >
          <Wrench className="w-3.5 h-3.5" />
          Servis Aç
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setEditingCihaz(row);
            setIsCihazTanimOpen(true);
          }}
          className="inline-flex items-center p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-all cursor-pointer"
          title="Cihaz Kartını Düzenle"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
      </div>
    )}
  ];

  const columnsCombinedLogs = [
    { field: 'tarih', headerName: 'Tarih & Saat', width: 140, renderCell: (row: any) => {
      try {
        const d = new Date(row.tarih);
        return <span className="font-mono font-semibold text-slate-700">{d.toLocaleString('tr-TR', { hour12: false }).slice(0, 16)}</span>;
      } catch (e) {
        return <span className="font-mono text-slate-500">{row.tarih}</span>;
      }
    }},
    { field: 'kanal', headerName: 'Kanal / İletişim Türü', width: 160, renderCell: (row: any) => {
      if (row.kanal === 'TELEFON') {
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            📞 Telefon Araması
          </span>
        );
      }
      if (row.kanal === 'WHATSAPP') {
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-250">
            💬 WhatsApp Mesajı
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
          📱 Kısa SMS
        </span>
      );
    }},
    { field: 'cariTitle', headerName: 'Cari Unvan (Müşteri) & Telefon', minWidth: 200, renderCell: (row: any) => (
      <div>
        <div className="font-bold text-slate-900 leading-snug">{row.cariTitle}</div>
        <div className="text-[10px] font-medium text-slate-500 mt-0.5">{row.telefon}</div>
      </div>
    )},
    { field: 'cihazAdi', headerName: 'Cihaz / Sistem Bilgisi', minWidth: 160, renderCell: (row: any) => (
      <span className="text-xs font-semibold text-slate-700">{row.cihazAdi}</span>
    )},
    { field: 'durum', headerName: 'İşlem Durumu', width: 160, renderCell: (row: any) => {
      let badgeStyle = 'bg-slate-50 text-slate-700 border-slate-200';
      let text = row.durum;
      if (row.durum === 'RANDEVU_ALINDI') {
        badgeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-250';
        text = 'Randevu Alındı';
      } else if (row.durum === 'ULASILAMADI_MESGUL') {
        badgeStyle = 'bg-rose-50 text-rose-800 border-rose-200';
        text = 'Ulaşılamadı / Meşgul';
      } else if (row.durum === 'DUSUNECEK_TEKRAR_ARA') {
        badgeStyle = 'bg-amber-50 text-amber-800 border-amber-200';
        text = 'Düşünecek / Tekrar Ara';
      } else if (row.durum === 'YETKILI_YOKTU') {
        badgeStyle = 'bg-purple-50 text-purple-800 border-purple-200';
        text = 'Yetkili Yoktu / Sahada';
      } else if (row.durum === 'GONDERILDI' || row.durum === 'GÖNDERİLDİ') {
        badgeStyle = 'bg-sky-50 text-sky-800 border-sky-250';
        text = 'İletildi / Gönderildi';
      } else if (row.durum === 'ONAY_BEKLIYOR') {
        badgeStyle = 'bg-indigo-50 text-indigo-800 border-indigo-200';
        text = 'Onay Bekliyor';
      }
      return (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeStyle}`}>
          {text}
        </span>
      );
    }},
    { field: 'icerik', headerName: 'İçerik / Görüşme Notu / Mesaj', minWidth: 260, renderCell: (row: any) => (
      <p className="text-xs text-slate-600 font-medium line-clamp-2 pr-2" title={row.icerik}>{row.icerik}</p>
    )},
    { field: 'yapanPersonel', headerName: 'İşlemi Yapan (Kullanıcı)', minWidth: 150, renderCell: (row: any) => (
      <span className="text-xs font-bold text-slate-800 flex items-center gap-1 bg-slate-100/60 px-2 py-1 rounded-md border border-slate-200 w-fit">
        👤 {row.yapanPersonel}
      </span>
    )}
  ];

  return (
    <div className="flex flex-col gap-4 w-full animate-fade-in text-slate-800">
      
      {/* 1. TOP HERO SECTION */}
      <div className="bg-gradient-to-r from-indigo-50 to-indigo-100/50 p-4 sm:p-6 rounded-2xl border border-indigo-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-3.5">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-indigo-100 shrink-0">
            <Wrench className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight leading-tight">Teknik Servis ve Periyodik Bakım Planlaması</h1>
          </div>
        </div>

        {/* Global Action Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full lg:w-auto">
          <button
            onClick={() => {
              setEditingServis(null);
              setSelectedCihaz(null);
              setIsModalCreateEmpty(true);
              setIsYeniServisOpen(true);
            }}
            className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Wrench className="w-4 h-4 text-white" />
            Yeni Servis Kaydı Oluştur
          </button>
          <button
            onClick={() => setIsYeniBildirimOpen(true)}
            className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-2xs hover:border-slate-300 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 text-slate-400" />
            Toplu Bildirim / SMS
          </button>
        </div>
      </div>


      {/* 2. STATS OVERVIEW WIDGETS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="block text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-wider">Açılan Servisler</span>
            <span className="block text-lg sm:text-xl font-black text-slate-800 mt-0.5 sm:mt-1">{stats.totalJobs}</span>
            <span className="text-[9px] sm:text-[10px] font-semibold text-emerald-600 flex items-center gap-0.5 mt-1 sm:mt-1.5">
              <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> {stats.completedJobs} Tamam
            </span>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 text-indigo-600 shrink-0">
            <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="block text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-wider">Randevular</span>
            <span className="block text-lg sm:text-xl font-black text-amber-600 mt-0.5 sm:mt-1">{stats.activeRandevular}</span>
            <span className="text-[9px] sm:text-[10px] font-semibold text-slate-500 mt-1 sm:mt-1.5 block">Saha Atama</span>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-50 rounded-xl flex items-center justify-center border border-amber-100 text-amber-600 shrink-0">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="block text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-wider">Cihaz Havuzu</span>
            <span className="block text-lg sm:text-xl font-black text-indigo-600 mt-0.5 sm:mt-1">{stats.totalDevices}</span>
            <span className="text-[9px] sm:text-[10px] font-semibold text-slate-500 mt-1 sm:mt-1.5 block">Aktif Sistem</span>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100 text-indigo-600 shrink-0">
            <Cpu className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="block text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-wider">Hizmet Cirosu</span>
            <span className="block text-lg sm:text-xl font-black text-emerald-600 mt-0.5 sm:mt-1">₺{stats.totalTahsilat.toLocaleString('tr-TR')}</span>
            <span className="text-[9px] sm:text-[10px] font-semibold text-emerald-600 mt-1 sm:mt-1.5 block">Tahsil Edilen</span>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100 text-emerald-600 shrink-0">
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
      </div>


      {/* 3. TABS HEADER & EXPORT & FILTER */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-3xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 overflow-hidden">
        {/* Tab Buttons - Horizontal Scroll on Mobile */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide -mx-1 px-1 lg:mx-0 lg:px-0">
          <button
            onClick={() => setActiveTab('bakimGantt')}
            className={`px-3 py-2 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'bakimGantt'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">Müşteri & Bakım Takip ({filteredCihazlar.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('isEmirleri')}
            className={`px-3 py-2 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'isEmirleri'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">Servisler ({filteredServisler.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('cagriMerkezi')}
            className={`px-3 py-2 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'cagriMerkezi'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">Görüşme Günlüğü ({combinedGorusmeLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('cihazRegistry')}
            className={`px-3 py-2 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'cihazRegistry'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">Cihaz & Model Bilgisi ({filteredCihazlar.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('analitik')}
            className={`px-3 py-2 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'analitik'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">Analitik</span>
          </button>
        </div>

        {/* Global Export actions */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto lg:ml-0">
          <button
            onClick={exportToExcel}
            className="p-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-lg hover:border-slate-300 shadow-2xs transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
            title="Excel Formatında İndir"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Excel</span>
          </button>
          <button
            onClick={exportToPDF}
            className="p-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-lg hover:border-slate-300 shadow-2xs transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
            title="PDF formatında dışa aktar"
          >
            <FileText className="w-4 h-4 text-rose-600" />
            <span className="hidden sm:inline">PDF Raporu</span>
          </button>
        </div>
      </div>


      {/* 4. ACTIVE VIEW RENDERING */}
      <div className="w-full">
        {activeTab === 'isEmirleri' && (
          <div className="flex flex-col gap-3.5">
            {/* Filter Toolbar matching Personel Management AG Grid */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-xs">
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 flex-wrap">
                  {/* Search input */}
                  <div className="relative flex-1 min-w-[240px] max-w-md">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Servis no, müşteri, cihaz, teknisyen, telefon ara..."
                      value={servisSearchText}
                      onChange={e => setServisSearchText(e.target.value)}
                      className="w-full bg-white border border-slate-300 hover:border-slate-400 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    />
                    {servisSearchText && (
                      <button
                        type="button"
                        onClick={() => setServisSearchText('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs w-5 h-5 flex items-center justify-center rounded-full hover:bg-slate-100"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Status Filter */}
                  <select
                    value={servisDurumFilter}
                    onChange={e => setServisDurumFilter(e.target.value)}
                    className="bg-white border border-slate-300 hover:border-slate-400 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="ALL">Servis Durumu (Tümü)</option>
                    <option value="RANDEVU_PLANLANDI">Randevu Planlandı</option>
                    <option value="YOLDA_SAHADA">Yolda / Sahada</option>
                    <option value="BEKLEMEDE">Beklemede</option>
                    <option value="TAMAMLANDI_KAPATILDI">Tamamlandı</option>
                    <option value="FATURALANDI">Faturalandı</option>
                    <option value="IPTAL_EDILDI">İptal Edildi</option>
                  </select>

                  {/* Service Type Filter */}
                  <select
                    value={servisTuruFilter}
                    onChange={e => setServisTuruFilter(e.target.value)}
                    className="bg-white border border-slate-300 hover:border-slate-400 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer font-medium"
                  >
                    <option value="ALL">Servis Türü (Tümü)</option>
                    <option value="PERIYODIK_BAKIM">Periyodik Bakım & Filtre Değişimi</option>
                    <option value="FILTRE_DEGISIMI">Filtre Değişimi</option>
                    <option value="ARIZA_ONARIM">Arıza & Onarım</option>
                    <option value="MONTAJ_KURULUM">Montaj & Yeni Kurulum</option>
                    <option value="KESIF_DURUM_TESPITI">Keşif & Su Analizi</option>
                  </select>

                  {/* Technician Filter */}
                  <select
                    value={servisTeknisyenFilter}
                    onChange={e => setServisTeknisyenFilter(e.target.value)}
                    className="bg-white border border-slate-300 hover:border-slate-400 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="ALL">Teknisyen (Tümü)</option>
                    {distinctTeknisyenler.map(tek => (
                      <option key={tek} value={tek}>{tek}</option>
                    ))}
                  </select>
                </div>

                {/* Right toolbar buttons */}
                <div className="flex items-center gap-2">
                  {(servisDurumFilter !== 'ALL' || servisTuruFilter !== 'ALL' || servisTeknisyenFilter !== 'ALL' || servisSearchText) && (
                    <button
                      type="button"
                      onClick={() => {
                        setServisDurumFilter('ALL');
                        setServisTuruFilter('ALL');
                        setServisTeknisyenFilter('ALL');
                        setServisSearchText('');
                      }}
                      className="px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Temizle
                    </button>
                  )}

                  <AgGridSidebarToggleBtn
                    isOpen={isServisSidebarOpen}
                    onToggle={() => setIsServisSidebarOpen(!isServisSidebarOpen)}
                    gridApi={servisGridApi}
                    buttonRef={servisSidebarButtonRef}
                  />

                  <button
                    onClick={() => {
                      setEditingServis(null);
                      setSelectedCihaz(null);
                      setIsModalCreateEmpty(true);
                      setIsYeniServisOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Yeni Servis Kaydı
                  </button>
                </div>
              </div>
            </div>

            {/* AG Grid Area & Column Sidebar */}
            <div className="flex gap-4 items-start relative h-[600px]">
              <div
                className={`bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden transition-all duration-300 ${
                  isServisSidebarOpen ? 'flex-1' : 'w-full'
                }`}
              >
                <div style={{ height: '600px', width: '100%' }}>
                  <AgGridReact<ServisFisi>
                    theme={appTheme}
                    ref={servisGridRef}
                    localeText={AG_GRID_LOCALE_TR}
                    rowData={filteredServislerForGrid}
                    columnDefs={columnsServisDefs}
                    defaultColDef={defaultServisColDef}
                    rowSelection={rowSelectionServis}
                    pagination={true}
                    paginationPageSize={15}
                    paginationPageSizeSelector={[10, 15, 25, 50, 100]}
                    onGridReady={(params) => {
                      setServisGridApi(params.api);
                      const saved = localStorage.getItem('fx_servis_list_grid_state');
                      if (saved) {
                        try {
                          const parsed = JSON.parse(saved);
                          if (Array.isArray(parsed)) {
                            const cleanParsed = parsed.map((col: any) => {
                              if (col.colId === 'servisNo') return { ...col, pinned: null };
                              return col;
                            });
                            params.api.applyColumnState({ state: cleanParsed, applyOrder: true });
                          }
                        } catch (e) {
                          console.error('Servis grid state parse error:', e);
                        }
                      }
                    }}
                    onColumnMoved={() => {
                      if (servisGridRef.current?.api) {
                        const state = servisGridRef.current.api.getColumnState();
                        localStorage.setItem('fx_servis_list_grid_state', JSON.stringify(state));
                      }
                    }}
                    onColumnVisible={() => {
                      if (servisGridRef.current?.api) {
                        const state = servisGridRef.current.api.getColumnState();
                        localStorage.setItem('fx_servis_list_grid_state', JSON.stringify(state));
                      }
                    }}
                    onColumnPinned={() => {
                      if (servisGridRef.current?.api) {
                        const state = servisGridRef.current.api.getColumnState();
                        localStorage.setItem('fx_servis_list_grid_state', JSON.stringify(state));
                      }
                    }}
                    onRowClicked={(event) => {
                      if (event.data) {
                        setEditingServis(event.data);
                        setIsModalCreateEmpty(false);
                        setIsYeniServisOpen(true);
                      }
                    }}
                    rowHeight={64}
                    headerHeight={40}
                  />
                </div>
              </div>

              {isServisSidebarOpen && (
                <AgGridColumnSidebar
                  onClose={() => setIsServisSidebarOpen(false)}
                  gridApi={servisGridApi}
                  onSaveGridState={() => {
                    if (servisGridRef.current?.api) {
                      const state = servisGridRef.current.api.getColumnState();
                      localStorage.setItem('fx_servis_list_grid_state', JSON.stringify(state));
                    }
                  }}
                />
              )}
            </div>
          </div>
        )}

        {activeTab === 'bakimGantt' && (
          <div className="w-full">
            <BakimGanttChart
              cihazlar={filteredCihazlar}
              servisler={filteredServisler}
              cagriAramalari={filteredCagriKayitlari}
              cariler={cariler}
              onOpenYeniServisEmpty={() => {
                setEditingServis(null);
                setSelectedCihaz(null);
                setIsModalCreateEmpty(true);
                setIsYeniServisOpen(true);
              }}
              onOpenYeniServis={(device) => {
                const existingActiveSlip = filteredServisler.find(s => 
                  s.cihazId === device.id && 
                  (s.durum === 'RANDEVU_PLANLANDI' || s.durum === 'YOLDA_SAHADA' || s.durum === 'BEKLEMEDE')
                );
                if (existingActiveSlip) {
                  setEditingServis(existingActiveSlip);
                } else {
                  const anySlip = filteredServisler.find(s => s.cihazId === device.id);
                  if (anySlip) {
                    setEditingServis(anySlip);
                  } else {
                    const draftSlip: ServisFisi = {
                      id: `srv-${Date.now()}`,
                      servisNo: `SRV-2026-${String(servisFisleri.length + 1).padStart(4, '0')}`,
                      cihazId: device.id,
                      cihazAdi: device.cihazAdi,
                      seriNo: device.seriNo || '',
                      cariId: device.cariId,
                      cariTitle: device.cariTitle || '',
                      adresTipi: device.adresTipi || 'Merkez / Fatura Adresi',
                      il: device.il || 'İzmir',
                      ilce: device.ilce || '',
                      mahalle: device.mahalle || '',
                      acikAdres: device.acikAdres || '',
                      telefon: device.yetkiliTelefon || '',
                      yetkili: device.yetkiliKisi || '',
                      randevuTarihi: device.gelecekBakimTarihi ? `${device.gelecekBakimTarihi} 11:00` : '',
                      atananTeknisyenId: '',
                      atananTeknisyenAdi: '',
                      teknisyenDepoId: '',
                      teknisyenDepoAdi: '',
                      durum: 'RANDEVU_PLANLANDI',
                      odemeTuru: 'ACIK_HESAP',
                      tahsilatTutari: 0,
                      kalemler: [],
                      createdAt: new Date().toISOString(),
                      servisTipi: normalizeServiceType(device.servisTuru),
                      servisTuru: getServiceTypeLabel(device.servisTuru || 'PERIYODIK_BAKIM'),
                      bildirilenAriza: `Periyodik bakım ve filtre kontrolleri.`
                    };
                    setEditingServis(draftSlip);
                  }
                }
                setSelectedCihaz(device);
                setIsModalCreateEmpty(false);
                setIsYeniServisOpen(true);
              }}
              onOpenCagriModal={(device) => {
                setSelectedCihaz(device);
                setIsCagriKayitOpen(true);
              }}
              onOpenGecmisModal={(device) => {
                setSelectedCihaz(device);
                setIsAramaGecmisiOpen(true);
              }}
              onOpenWhatsAppDirect={handleOpenWhatsAppDirect}
              onOpenEditServis={(servis) => {
                setEditingServis(servis);
                setIsModalCreateEmpty(false);
                setIsYeniServisOpen(true);
              }}
              onUpdateCihazServisTuru={handleUpdateCihazServisTuru}
              onViewCommunicationHistory={(cariTitle) => {
                setCagriMerkeziSearchTerm(cariTitle);
                setActiveTab('cagriMerkezi');
              }}
              onEditCihaz={(device) => {
                setEditingCihaz(device);
                setIsCihazTanimOpen(true);
              }}
            />
          </div>
        )}

        {activeTab === 'cihazRegistry' && (
          <AgDataGrid
            id="grid-cihaz-registry"
            data={filteredCihazlar}
            columns={columnsCihazlar}
            keyField="id"
            showSearch={true}
            onRowClick={(row: MusteriCihazi) => {
              setSelectedCihaz(row);
              setEditingServis(null);
              setIsModalCreateEmpty(false);
              setIsYeniServisOpen(true);
            }}
            toolbarLeftContent={
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                  Cihaz & Model Bilgisi
                </span>
                <span className="text-[10px] text-slate-400">({filteredCihazlar.length} Cihaz)</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCihaz(null);
                    setEditingServis(null);
                    setIsModalCreateEmpty(true);
                    setIsYeniServisOpen(true);
                  }}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + Yeni Cihaz & Model Ekle (Yeni Servis Kaydı İle)
                </button>
                <span className="text-[11px] text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded-md border border-indigo-200/60 font-medium hidden md:inline">
                  💡 Yeni cihaz & model kayıtları ve iş emirleri "Yeni Servis Kaydı Oluştur" formu üzerinden eklenir
                </span>
              </div>
            }
          />
        )}

        {activeTab === 'cagriMerkezi' && (
          <AgDataGrid
            id="grid-cagri-merkezi"
            data={combinedGorusmeLogs}
            columns={columnsCombinedLogs}
            keyField="id"
            showSearch={true}
            searchTerm={cagriMerkeziSearchTerm}
            onSearchChange={setCagriMerkeziSearchTerm}
            toolbarLeftContent={
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">İletişim & Görüşme Günlüğü</span>
                <span className="text-[10px] text-slate-400">({combinedGorusmeLogs.length} İletişim Kaydı)</span>
                {cagriMerkeziSearchTerm && (
                  <button
                    onClick={() => setCagriMerkeziSearchTerm('')}
                    className="text-[10px] font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 px-2 py-0.5 rounded transition-colors cursor-pointer ml-2 flex items-center gap-1"
                  >
                    <span>Filtreyi Temizle</span>
                    <span>×</span>
                  </button>
                )}
              </div>
            }
          />
        )}

        {activeTab === 'analitik' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5">
            <ServisCharts
              servisler={filteredServisler}
              cihazlar={filteredCihazlar}
              cagriAramalari={filteredCagriKayitlari}
            />
          </div>
        )}
      </div>

      {/* 5. MODAL DECLARATIONS */}
      {isYeniServisOpen && (
        <YeniServisArizaModal
          isOpen={isYeniServisOpen}
          onClose={() => {
            setIsYeniServisOpen(false);
            setEditingServis(null);
            setSelectedCihaz(null);
            setIsModalCreateEmpty(true);
          }}
          cariler={cariler}
          cihazlar={cihazlar}
          servisler={servisFisleri}
          personeller={personeller}
          stoklar={stoklar}
          initialCariId={selectedCihaz?.cariId || editingServis?.cariId}
          initialCihazId={selectedCihaz?.id || editingServis?.cihazId}
          initialCihaz={selectedCihaz}
          editingServis={editingServis}
          isCreateEmpty={isModalCreateEmpty}
          onOpenKapatmaModal={(servis) => {
            setIsYeniServisOpen(false);
            setSelectedServis(servis);
            setIsServisDetayOpen(true);
          }}
          onKaydetServis={handleKaydetYeniServis}
        />
      )}

      {isYeniBildirimOpen && (
        <YeniBildirimModal
          isOpen={isYeniBildirimOpen}
          onClose={() => setIsYeniBildirimOpen(false)}
          cariler={cariler}
          cihazlar={cihazlar}
          servisler={servisFisleri}
          currentUser={mappedCurrentUser}
          onKaydetBildirim={handleKaydetBildirim}
        />
      )}

      {isCagriKayitOpen && (
        <CagriKayitModal
          isOpen={isCagriKayitOpen}
          onClose={() => {
            setIsCagriKayitOpen(false);
            setSelectedCihaz(null);
          }}
          cihaz={selectedCihaz}
          cariler={cariler}
          cihazlar={cihazlar}
          currentUser={mappedCurrentUser}
          personeller={personeller}
          aramaKayitlari={cagriKayitlari}
          onKaydetArama={handleKaydetArama}
        />
      )}

      {isCihazTanimOpen && (
        <CihazTanimModal
          isOpen={isCihazTanimOpen}
          onClose={() => {
            setIsCihazTanimOpen(false);
            setEditingCihaz(null);
          }}
          cariler={cariler}
          editingCihaz={editingCihaz}
          onKaydetCihaz={handleKaydetCihaz}
          onDeleteCihaz={handleDeleteCihaz}
        />
      )}

      {isAramaGecmisiOpen && selectedCihaz && (
        <AramaGecmisiModal
          isOpen={isAramaGecmisiOpen}
          onClose={() => {
            setIsAramaGecmisiOpen(false);
            setSelectedCihaz(null);
          }}
          cihaz={selectedCihaz}
          aramaKayitlari={cagriKayitlari}
        />
      )}

      {isServisDetayOpen && selectedServis && (
        <ServisFisDetayModal
          isOpen={isServisDetayOpen}
          onClose={() => {
            setIsServisDetayOpen(false);
            setSelectedServis(null);
          }}
          servis={selectedServis}
          stoklar={stoklar}
          kasalar={kasalar}
          cariler={cariler}
          personeller={personeller}
          currentUser={personeller[0] || null}
          onKapatServis={handleKapatServis}
          onOpenEditServis={(servis) => {
            setIsServisDetayOpen(false);
            setSelectedServis(null);
            setEditingServis(servis);
            setIsModalCreateEmpty(false);
            setIsYeniServisOpen(true);
          }}
          onGonderMesaj={(tel, msg) => {
            // Log as notification
            handleKaydetBildirim({
              cariId: selectedServis.cariId,
              cariTitle: selectedServis.cariTitle,
              telefon: tel,
              kanal: 'WHATSAPP',
              tip: 'Servis Bilgisi',
              mesaj: msg,
              durum: 'GONDERILDI',
              gonderenKullanici: 'Saha Teknisyeni',
              cihazId: selectedServis.cihazId,
              cihazAdi: selectedServis.cihazAdi,
              olusturmaTarihi: new Date().toISOString()
            }, true);
          }}
        />
      )}

    </div>
  );
}

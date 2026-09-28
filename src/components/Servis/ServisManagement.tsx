import React, { useState, useEffect, useMemo } from 'react';
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
  Edit2
} from 'lucide-react';
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
import { Branch, Contact, Employee } from '../../types/fx';
import { TURKEY_CITIES } from '../../data/mockData';

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
        const parsed: Stok[] = JSON.parse(storedProducts).map((p: any) => ({
          id: p.id,
          code: p.skuCode || p.code,
          name: p.name,
          category: p.categoryGroup || p.category,
          unit: p.unitType || p.unit,
          barcode: p.barcodeEan13 || p.barcode || '',
          buyPrice: p.purchasePrice || p.buyPrice || 0,
          sellPrice: p.salePriceExclVat || p.sellPrice || 0,
          vatRate: p.vatRatePercent || p.vatRate || 20,
          currency: 'TRY',
          currentQuantity: p.currentStock || p.currentQuantity || 50,
          criticalQuantity: p.criticalStock || p.criticalQuantity || 5,
          warehouseLocation: p.warehouseLocation || 'Saha Aracı Raf 2',
          brand: p.brandName || p.brand || 'Filtrex',
          isActive: true
        }));
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

    // 2. Load Core Servis Datasets from Storage or Seed
    const loadFromStorage = <T,>(key: string, defaultVal: T[]): T[] => {
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return defaultVal;
        }
      } else {
        localStorage.setItem(key, JSON.stringify(defaultVal));
        return defaultVal;
      }
    };

    setServisFisleri(loadFromStorage(STORAGE_KEYS.SERVIS_FISLERI, DEFAULT_SERVIS_FISLERI));
    setCihazlar(loadFromStorage(STORAGE_KEYS.CIHAZLAR, DEFAULT_CIHAZLAR));
    setCagriKayitlari(loadFromStorage(STORAGE_KEYS.CAGRI_KAYITLARI, DEFAULT_CAGRI_KAYITLARI));
    setBildirimler(loadFromStorage(STORAGE_KEYS.BILDIRIMLER, DEFAULT_BILDIRIMLER));

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

  // Handler: Save / Update Service Ticket from Ariza/Tesisat Modal
  const handleKaydetYeniServis = (
    yeniServis: Omit<ServisFisi, 'id'>, 
    yeniCihazKaydi?: Omit<MusteriCihazi, 'id'>,
    yeniBildirim?: Omit<ServisBildirim, 'id'>,
    yeniCariKaydi?: Omit<Cari, 'id'>,
    yeniStokKaydi?: Omit<Stok, 'id'>,
    guncellenenCari?: Partial<Cari> & { id: string },
    editServisId?: string
  ) => {
    const activeBranchToSet = yeniServis.branchId || (selectedBranchId === 'all' ? (branches[0]?.id || 'b1111111-1111-1111-1111-111111111111') : selectedBranchId);
    
    // If we have a new Cari record
    let finalCariId = yeniServis.cariId;
    let finalCariTitle = yeniServis.cariTitle;
    if (yeniCariKaydi) {
      const createdCari: Cari = {
        ...yeniCariKaydi,
        id: `c-new-${Date.now()}`,
        branchId: activeBranchToSet,
        createdAt: new Date().toISOString()
      };
      const updatedCariler = [createdCari, ...cariler];
      setCariler(updatedCariler);
      finalCariId = createdCari.id;
      finalCariTitle = createdCari.title;
      // Persist new contact to global ERP database too!
      fxApi.createContact({
        contactTypeId: 'c-type-customer',
        code: yeniCariKaydi.code || `C-${Date.now().toString().slice(-6)}`,
        status: 'ACTIVE',
        title: yeniCariKaydi.title || 'Yeni Cari',
        mobilePhone1: yeniCariKaydi.phone || '+90 (532) 000 00 00',
        mobilePhone2: yeniCariKaydi.phone2 || '',
        homePhone: yeniCariKaydi.homePhone || '',
        workPhone: yeniCariKaydi.workPhone || '',
        branchId: activeBranchToSet,
        openingBalance: 0,
        currentBalance: 0,
        currency: 'TRY',
        creditRiskLimit: 50000,
        defaultPaymentTermsDays: 14,
        defaultDiscountAmount: 0,
        isEinvoiceTaxpayer: false,
        authorizedPerson: yeniCariKaydi.authorizedPerson || '',
        notes: yeniCariKaydi.notes || '',
        districtId: yeniCariKaydi.district || '',
        neighborhoodId: yeniCariKaydi.neighborhood || '',
        formattedAddress: yeniCariKaydi.address || ''
      });
    } else if (guncellenenCari) {
      // Update existing customer in state & API
      const updatedCariler = cariler.map(c => c.id === guncellenenCari.id ? { ...c, ...guncellenenCari } : c);
      setCariler(updatedCariler);
      try {
        fxApi.updateContact(guncellenenCari.id, {
          title: guncellenenCari.title,
          authorizedPerson: guncellenenCari.authorizedPerson,
          mobilePhone1: guncellenenCari.phone,
          mobilePhone2: guncellenenCari.phone2,
          homePhone: guncellenenCari.homePhone,
          workPhone: guncellenenCari.workPhone,
          districtId: guncellenenCari.district,
          neighborhoodId: guncellenenCari.neighborhood,
          formattedAddress: guncellenenCari.address
        });
      } catch (err) {
        console.error('Error updating contact:', err);
      }
    }

    // Save inline stock product if requested
    if (yeniStokKaydi) {
      const createdStock: Stok = {
        ...yeniStokKaydi,
        id: `stok-${Date.now()}`
      };
      const updatedStoklar = [createdStock, ...stoklar];
      setStoklar(updatedStoklar);
      try {
        const storedProducts = localStorage.getItem('fx_products_list');
        const parsed = storedProducts ? JSON.parse(storedProducts) : [];
        const newProductForErp = {
          id: createdStock.id,
          skuCode: createdStock.code,
          name: createdStock.name,
          categoryGroup: createdStock.category,
          unitType: createdStock.unit,
          barcodeEan13: createdStock.barcode,
          purchasePrice: createdStock.buyPrice,
          salePriceExclVat: createdStock.sellPrice,
          vatRatePercent: createdStock.vatRate,
          currentStock: createdStock.currentQuantity,
          criticalStock: createdStock.criticalQuantity,
          warehouseLocation: createdStock.warehouseLocation,
          brandName: createdStock.brand,
          isActive: true
        };
        localStorage.setItem('fx_products_list', JSON.stringify([newProductForErp, ...parsed]));
      } catch (e) {
        console.error('Error saving new inline product:', e);
      }
    }

    // If we have a new customer device registry
    let finalCihazId = yeniServis.cihazId;
    if (yeniCihazKaydi) {
      const createdCihaz: MusteriCihazi = {
        ...yeniCihazKaydi,
        id: `cihaz-${Date.now()}`,
        cariId: finalCariId,
        cariTitle: finalCariTitle,
        branchId: activeBranchToSet
      };
      const updatedCihazlar = [createdCihaz, ...cihazlar];
      setCihazlar(updatedCihazlar);
      updateStorage(STORAGE_KEYS.CIHAZLAR, updatedCihazlar);
      finalCihazId = createdCihaz.id;
    } else if (finalCihazId) {
      // Sync contact and address on existing device if needed
      const existingIdx = cihazlar.findIndex(c => c.id === finalCihazId);
      if (existingIdx !== -1) {
        const updated = [...cihazlar];
        const datePart = yeniServis.randevuTarihi.slice(0, 10);
        const isBakim = yeniServis.servisTipi === 'PERIYODIK_BAKIM' || yeniServis.servisTipi === 'FILTRE_DEGISIMI';

        updated[existingIdx] = {
          ...updated[existingIdx],
          yetkiliKisi: yeniServis.yetkili || updated[existingIdx].yetkiliKisi,
          yetkiliTelefon: yeniServis.telefon || updated[existingIdx].yetkiliTelefon,
          acikAdres: yeniServis.acikAdres || updated[existingIdx].acikAdres,
          il: yeniServis.il || updated[existingIdx].il,
          ilce: yeniServis.ilce || updated[existingIdx].ilce,
          mahalle: yeniServis.mahalle || updated[existingIdx].mahalle,
          // INTEGRATION: Automatically sync the service type and next maintenance target date on the device registry
          servisTuru: yeniServis.servisTipi === 'PERIYODIK_BAKIM' ? 'Periyodik Bakım' : yeniServis.servisTipi === 'FILTRE_DEGISIMI' ? 'Filtre Değişimi' : 'Arıza Onarım',
          gelecekBakimTarihi: isBakim ? datePart : updated[existingIdx].gelecekBakimTarihi
        };
        setCihazlar(updated);
        updateStorage(STORAGE_KEYS.CIHAZLAR, updated);
      }
    }

    // Create or Update Service Record
    if (editServisId) {
      const updatedServisler = servisFisleri.map(s => {
        if (s.id === editServisId) {
          return {
            ...s,
            ...yeniServis,
            id: editServisId,
            cariId: finalCariId,
            cariTitle: finalCariTitle,
            cihazId: finalCihazId || s.cihazId,
            servisNo: s.servisNo || yeniServis.servisNo,
            branchId: activeBranchToSet,
            kalemler: s.kalemler || [],
            durum: s.durum || yeniServis.durum
          };
        }
        return s;
      });
      setServisFisleri(updatedServisler);
      updateStorage(STORAGE_KEYS.SERVIS_FISLERI, updatedServisler);
    } else {
      // MÜKERRER KAYIT ÖNLEME: Bu cihaza ait zaten açık bir servis fişi var mı?
      const existingOpenSlip = finalCihazId 
        ? servisFisleri.find(s => s.cihazId === finalCihazId && (s.durum === 'RANDEVU_PLANLANDI' || s.durum === 'YOLDA_SAHADA' || s.durum === 'BEKLEMEDE'))
        : null;

      if (existingOpenSlip) {
        // Mükerrer kayıt açmak yerine mevcut açık servis fişini güncelle!
        const updatedServisler = servisFisleri.map(s => {
          if (s.id === existingOpenSlip.id) {
            return {
              ...s,
              ...yeniServis,
              id: existingOpenSlip.id,
              servisNo: existingOpenSlip.servisNo, // Mevcut servis numarasını koru
              cariId: finalCariId,
              cariTitle: finalCariTitle,
              cihazId: finalCihazId,
              branchId: activeBranchToSet
            };
          }
          return s;
        });
        setServisFisleri(updatedServisler);
        updateStorage(STORAGE_KEYS.SERVIS_FISLERI, updatedServisler);
      } else {
        const sId = `srv-${Date.now()}`;
        const newServiceRecord: ServisFisi = {
          ...yeniServis,
          id: sId,
          cariId: finalCariId,
          cariTitle: finalCariTitle,
          cihazId: finalCihazId,
          servisNo: `SRV-2026-${String(servisFisleri.length + 1).padStart(4, '0')}`,
          branchId: activeBranchToSet,
          createdAt: new Date().toISOString()
        };

        const updatedServisler = [newServiceRecord, ...servisFisleri];
        setServisFisleri(updatedServisler);
        updateStorage(STORAGE_KEYS.SERVIS_FISLERI, updatedServisler);

        // Save optional Notification
        if (yeniBildirim) {
          const createdNotification: ServisBildirim = {
            ...yeniBildirim,
            id: `notif-${Date.now()}`,
            servisId: sId,
            servisNo: newServiceRecord.servisNo,
            cariId: finalCariId,
            cariTitle: finalCariTitle,
            cihazId: finalCihazId,
            cihazAdi: yeniServis.cihazAdi,
            branchId: activeBranchToSet,
            olusturmaTarihi: new Date().toISOString()
          };
          const updatedBildirimler = [createdNotification, ...bildirimler];
          setBildirimler(updatedBildirimler);
          updateStorage(STORAGE_KEYS.BILDIRIMLER, updatedBildirimler);
        }
      }
    }

    // Auto-switch parent's branch view if different from the saved service branch to ensure instant visibility!
    if (activeBranchToSet && selectedBranchId !== 'all' && selectedBranchId !== activeBranchToSet) {
      setSelectedBranchId(activeBranchToSet);
      branchContext.setSelectedBranchId(activeBranchToSet);
    }

    setIsYeniServisOpen(false);
    setEditingServis(null);
    setSelectedCihaz(null);
    setActiveTab('isEmirleri'); // Auto-switch to Job Cards tab so they see it instantly!
  };

  // Handler: Close/Complete Service Ticket & deduct stock/post payment
  const handleKapatServis = (
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
    const updated = servisFisleri.map(s => {
      if (s.id === servisId) {
        const matchingKasa = kasalar.find(k => k.id === data.kasaId);
        return {
          ...s,
          ...data,
          kasaAdi: matchingKasa?.name || 'Saha Kasası',
          durum: 'TAMAMLANDI_KAPATILDI'
        };
      }
      return s;
    });

    setServisFisleri(updated);
    updateStorage(STORAGE_KEYS.SERVIS_FISLERI, updated);

    // Process payment integration to main bank accounts if CASH or ACIK HESAP
    const closedServis = servisFisleri.find(s => s.id === servisId);
    if (closedServis && data.tahsilatTutari > 0) {
      // Post financial movement to KasaBanka via mock updates
      const activeKasaId = data.kasaId || kasalar[0]?.id;
      if (activeKasaId) {
        const kIndex = kasalar.findIndex(k => k.id === activeKasaId);
        if (kIndex !== -1) {
          const updatedKasalar = [...kasalar];
          updatedKasalar[kIndex] = {
            ...updatedKasalar[kIndex],
            balance: updatedKasalar[kIndex].balance + data.tahsilatTutari
          };
          setKasalar(updatedKasalar);
          localStorage.setItem('fx_cash_banks_list', JSON.stringify(updatedKasalar));
        }
      }

      // Deduct stock quantities from Saha Teknisyen Deposu
      data.kalemler.forEach(item => {
        const pIndex = stoklar.findIndex(st => st.id === item.stokId);
        if (pIndex !== -1) {
          const updatedStok = [...stoklar];
          updatedStok[pIndex] = {
            ...updatedStok[pIndex],
            currentQuantity: Math.max(0, updatedStok[pIndex].currentQuantity - item.miktar)
          };
          setStoklar(updatedStok);
        }
      });
    }

    setIsServisDetayOpen(false);
    setSelectedServis(null);
  };

  // Handler: Register Call Record
  const handleKaydetArama = (
    arama: Omit<CagriAramaKaydi, 'id'>, 
    yeniServis?: Omit<ServisFisi, 'id'>,
    bildirim?: Omit<ServisBildirim, 'id'>
  ) => {
    const activeBranchToSet = selectedBranchId === 'all' ? (branches[0]?.id || 'b1111111-1111-1111-1111-111111111111') : selectedBranchId;
    const callId = `call-${Date.now()}`;

    let createdServisFisId = undefined;
    if (yeniServis) {
      const sId = `srv-${Date.now()}`;
      const newService: ServisFisi = {
        ...yeniServis,
        id: sId,
        servisNo: `SRV-2026-${String(servisFisleri.length + 1).padStart(4, '0')}`,
        branchId: activeBranchToSet,
        createdAt: new Date().toISOString()
      };
      const updatedServisler = [newService, ...servisFisleri];
      setServisFisleri(updatedServisler);
      updateStorage(STORAGE_KEYS.SERVIS_FISLERI, updatedServisler);
      createdServisFisId = sId;
    }

    const newCall: CagriAramaKaydi = {
      ...arama,
      id: callId,
      olusturulanServisFisId: createdServisFisId,
      branchId: activeBranchToSet
    };

    const updatedCalls = [newCall, ...cagriKayitlari];
    setCagriKayitlari(updatedCalls);
    updateStorage(STORAGE_KEYS.CAGRI_KAYITLARI, updatedCalls);

    // If we have notification trigger
    if (bildirim) {
      const newNotif: ServisBildirim = {
        ...bildirim,
        id: `notif-${Date.now()}`,
        servisId: createdServisFisId,
        branchId: activeBranchToSet,
        olusturmaTarihi: new Date().toISOString()
      };
      const updatedNotifs = [newNotif, ...bildirimler];
      setBildirimler(updatedNotifs);
      updateStorage(STORAGE_KEYS.BILDIRIMLER, updatedNotifs);

      if (bildirim.telefon) {
        const sanitizedPhone = bildirim.telefon.replace(/\D/g, '');
        const encodedMsg = encodeURIComponent(bildirim.mesaj);
        window.open(`https://api.whatsapp.com/send?phone=${sanitizedPhone}&text=${encodedMsg}`, '_blank');
      }
    }

    setIsCagriKayitOpen(false);
    setSelectedCihaz(null);
  };

  // Handler: Create or Update Customer Device
  const handleKaydetCihaz = (cihazData: Omit<MusteriCihazi, 'id'>, editId?: string) => {
    if (editId) {
      // Update existing device
      const updated = cihazlar.map(c => {
        if (c.id === editId) {
          return {
            ...c,
            ...cihazData,
            id: editId
          };
        }
        return c;
      });
      setCihazlar(updated);
      updateStorage(STORAGE_KEYS.CIHAZLAR, updated);
    } else {
      // Create new device
      const activeBranchToSet = selectedBranchId === 'all' ? (branches[0]?.id || 'b1111111-1111-1111-1111-111111111111') : selectedBranchId;
      const newDevice: MusteriCihazi = {
        ...cihazData,
        id: `cihaz-${Date.now()}`,
        branchId: activeBranchToSet
      };
      const updated = [newDevice, ...cihazlar];
      setCihazlar(updated);
      updateStorage(STORAGE_KEYS.CIHAZLAR, updated);
    }
    setIsCihazTanimOpen(false);
    setEditingCihaz(null);
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

  // Handler: Update Device Service Type directly from Table
  const handleUpdateCihazServisTuru = (cihazId: string, newServisTuru: string) => {
    const updated = cihazlar.map(c => c.id === cihazId ? { ...c, servisTuru: newServisTuru } : c);
    setCihazlar(updated);
    updateStorage(STORAGE_KEYS.CIHAZLAR, updated);
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
    { field: 'servisTipi', headerName: 'Servis Türü', width: 140, renderCell: (row: ServisFisi) => {
      let badgeStyle = 'bg-slate-50 text-slate-700 border-slate-200';
      let text = row.servisTipi || 'Arıza Onarım';
      if (row.servisTipi === 'PERIYODIK_BAKIM') {
        badgeStyle = 'bg-teal-50 text-teal-800 border-teal-200';
        text = 'Periyodik Bakım';
      } else if (row.servisTipi === 'FILTRE_DEGISIMI') {
        badgeStyle = 'bg-indigo-50 text-indigo-800 border-indigo-200';
        text = 'Filtre Değişimi';
      } else if (row.servisTipi === 'MONTAJ_KURULUM') {
        badgeStyle = 'bg-purple-50 text-purple-800 border-purple-200';
        text = 'Montaj / Kurulum';
      } else if (row.servisTipi === 'KESIF_DURUM_TESPITI') {
        badgeStyle = 'bg-blue-50 text-blue-800 border-blue-200';
        text = 'Keşif / Tespit';
      } else if (row.servisTipi === 'ARIZA_ONARIM') {
        badgeStyle = 'bg-rose-50 text-rose-800 border-rose-200';
        text = 'Arıza Onarım';
      }
      return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${badgeStyle}`}>
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
          title="Servis kaydını düzenle"
        >
          <Edit2 className="w-3 h-3" />
          Düzenle
        </button>
        <button
          onClick={() => {
            setSelectedServis(row);
            setIsServisDetayOpen(true);
          }}
          className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold shadow-2xs hover:border-slate-300 cursor-pointer transition-colors"
          title="Detay / Kapat"
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
    { field: 'islemler', headerName: 'İşlemler', width: 110, align: 'center' as const, renderCell: (row: MusteriCihazi) => (
      <button
        onClick={(e) => {
          e.stopPropagation();
          setEditingCihaz(row);
          setIsCihazTanimOpen(true);
        }}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 border border-indigo-200 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
      >
        <Edit2 className="w-3.5 h-3.5" />
        Düzenle
      </button>
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
            <span className="block text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-wider">İş Emri</span>
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
            <span className="whitespace-nowrap">Servis & Bakım ({filteredCihazlar.length})</span>
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
            <span className="whitespace-nowrap">İş Emirleri ({filteredServisler.length})</span>
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
            <span className="whitespace-nowrap">Cihaz Kartları ({filteredCihazlar.length})</span>
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
          <div className="flex flex-col gap-4">
            <AgDataGrid
              id="grid-is-emirleri"
              data={filteredServisler}
              columns={columnsServis}
              keyField="id"
              showSearch={true}
              onRowClick={(row: ServisFisi) => {
                setEditingServis(row);
                setIsModalCreateEmpty(false);
                setIsYeniServisOpen(true);
              }}
              toolbarLeftContent={
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">İş Emirleri Listesi</span>
                  {selectedBranchId === 'all' && (
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-md border border-indigo-100">
                      Tüm Şubeler Konsolide
                    </span>
                  )}
                  <span className="text-[11px] text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded-md border border-indigo-200/60 font-medium">
                    💡 Düzenlemek için satıra tıklayınız
                  </span>
                </div>
              }
            />
          </div>
        )}

        {activeTab === 'bakimGantt' && (
          <div className="w-full">
            <BakimGanttChart
              cihazlar={filteredCihazlar}
              servisler={filteredServisler}
              cagriAramalari={filteredCagriKayitlari}
              cariler={cariler}
              todayDateStr="2026-03-01"
              onOpenYeniServis={(device) => {
                const existingActiveSlip = filteredServisler.find(s => 
                  s.cihazId === device.id && 
                  (s.durum === 'RANDEVU_PLANLANDI' || s.durum === 'YOLDA_SAHADA' || s.durum === 'BEKLEMEDE')
                );
                if (existingActiveSlip) {
                  setEditingServis(existingActiveSlip);
                } else {
                  setEditingServis(null);
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
              setEditingCihaz(row);
              setIsCihazTanimOpen(true);
            }}
            toolbarLeftContent={
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                  Müşteri Cihaz Kartları
                </span>
                <span className="text-[10px] text-slate-400">({filteredCihazlar.length} Cihaz)</span>
                <span className="text-[11px] text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded-md border border-indigo-200/60 font-medium">
                  💡 Düzenlemek için satıra tıklayınız
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

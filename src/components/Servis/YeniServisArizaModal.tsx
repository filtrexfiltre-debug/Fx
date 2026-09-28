import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Wrench, 
  Building2, 
  MapPin, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  ShieldAlert, 
  Cpu, 
  CheckCircle2, 
  HelpCircle,
  AlertTriangle,
  Plus,
  Settings,
  Search,
  ExternalLink,
  Package,
  Layers,
  Sparkles,
  Navigation,
  ChevronDown,
  ChevronUp,
  Edit3,
  Check,
  Info,
  CalendarDays,
  RotateCw
} from 'lucide-react';
import { 
  Cari, 
  MusteriCihazi, 
  ServisFisi, 
  Personel, 
  ServisBildirim,
  Stok
} from '../../types';
import { useSettings } from '../../context/SettingsContext';
import { ManageAddressTypesModal } from './ManageAddressTypesModal';
import { ManageBrandTypesModal } from './ManageBrandTypesModal';
import { ManageServiceTypesModal } from './ManageServiceTypesModal';
import { ManageDeviceModelTypesModal } from './ManageDeviceModelTypesModal';
import { fxApi, branchContext } from '../../services/api';
import { Branch } from '../../types/fx';
import { geoService } from '../../services/geoService';
import { TURKEY_CITIES } from '../../data/mockData';

interface YeniServisArizaModalProps {
  isOpen: boolean;
  onClose: () => void;
  cariler: Cari[];
  cihazlar: MusteriCihazi[];
  servisler?: ServisFisi[];
  personeller: Personel[];
  stoklar?: Stok[];
  initialCariId?: string;
  initialCihazId?: string;
  initialCihaz?: MusteriCihazi | null;
  editingServis?: ServisFisi | null;
  isCreateEmpty?: boolean;
  onKaydetServis: (
    yeniServis: Omit<ServisFisi, 'id'>, 
    yeniCihazKaydi?: Omit<MusteriCihazi, 'id'>,
    yeniBildirim?: Omit<ServisBildirim, 'id'>,
    yeniCariKaydi?: Omit<Cari, 'id'>,
    yeniStokKaydi?: Omit<Stok, 'id'>,
    guncellenenCari?: Partial<Cari> & { id: string },
    editServisId?: string
  ) => void;
}

export const YeniServisArizaModal: React.FC<YeniServisArizaModalProps> = ({
  isOpen,
  onClose,
  cariler = [],
  cihazlar = [],
  servisler = [],
  personeller = [],
  stoklar = [],
  initialCariId,
  initialCihazId,
  initialCihaz,
  editingServis,
  isCreateEmpty = false,
  onKaydetServis
}) => {
  const { 
    addressTypes, 
    brandTypes, 
    serviceTypes,
    deviceModelTypes
  } = useSettings();

  const [branches, setBranches] = useState<Branch[]>([]);
  const activeBranchId = branchContext.getSelectedBranchId();
  const [selectedBranchId, setSelectedBranchId] = useState(
    activeBranchId === 'all' ? '' : activeBranchId
  );

  // Modal Yönetimleri
  const [isManageAddressOpen, setIsManageAddressOpen] = useState(false);
  const [isManageBrandOpen, setIsManageBrandOpen] = useState(false);
  const [isManageServiceTypeOpen, setIsManageServiceTypeOpen] = useState(false);
  const [isManageDeviceModelOpen, setIsManageDeviceModelOpen] = useState(false);

  // Yeni Cihaz & Ürün ekleme akıllı yönetimi
  const [localCihazlar, setLocalCihazlar] = useState<MusteriCihazi[]>([]);
  const [localStoklar, setLocalStoklar] = useState<Stok[]>([]);
  
  useEffect(() => {
    setLocalCihazlar(cihazlar);
  }, [cihazlar]);

  useEffect(() => {
    setLocalStoklar(stoklar || []);
  }, [stoklar]);

  const [showAddDeviceForm, setShowAddDeviceForm] = useState(false);
  const [newDeviceProductId, setNewDeviceProductId] = useState('');
  const [isAddingNewProductInline, setIsAddingNewProductInline] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductBrand, setNewProductBrand] = useState('Filtrex');
  const [newDeviceSeriNo, setNewDeviceSeriNo] = useState('');
  const [newDevicePeriod, setNewDevicePeriod] = useState(6);
  const [newDeviceAddressId, setNewDeviceAddressId] = useState('');

  const handleRegisterNewDeviceInline = () => {
    let targetProductId = newDeviceProductId;
    let targetProductName = '';
    let targetBrand = 'Filtrex';

    // Eğer yeni bir ürün inline olarak eklenecekse
    if (isAddingNewProductInline || newDeviceProductId === 'NEW_PRODUCT_OPTION') {
      if (!newProductName.trim()) {
        alert('Lütfen yeni ürün/model adını giriniz.');
        return;
      }
      
      const newStokObj: Stok = {
        id: `stok-inline-${Date.now()}`,
        code: `STK-${Date.now().toString().slice(-6)}`,
        name: newProductName.trim(),
        category: 'Su Arıtma Cihazları',
        unit: 'Adet',
        barcode: '',
        costMethod: 'FIFO',
        buyPrice: 0,
        sellPrice: 0,
        vatRate: 20,
        currency: 'TRY',
        currentQuantity: 1,
        criticalQuantity: 0,
        warehouseLocation: 'MERKEZ',
        brand: newProductBrand,
        isActive: true
      };

      // Yerel stok state'ine ekle
      setLocalStoklar(prev => [...prev, newStokObj]);
      targetProductId = newStokObj.id;
      targetProductName = newStokObj.name;
      targetBrand = newStokObj.brand || 'Filtrex';

      // Sıfırla
      setNewProductName('');
      setIsAddingNewProductInline(false);
    } else {
      const selectedProduct = localStoklar.find(s => s.id === newDeviceProductId);
      if (selectedProduct) {
        targetProductName = selectedProduct.name;
        targetBrand = selectedProduct.brand || 'Filtrex';
      } else {
        alert('Lütfen bir cihaz modeli seçin veya yeni ürün ekleyin.');
        return;
      }
    }

    // Seçilen montaj adresi bilgileri (Mevcut seçili adres veya müşterinin ana adresi)
    const targetAddress = mevcutCariAdresleri.find(a => a.id === secilenAdresId) || mevcutCariAdresleri[0];
    
    // Yeni cari cihazı nesnesi oluştur
    const newDeviceObj: MusteriCihazi = {
      id: `cihaz-inline-${Date.now()}`,
      cariId: selectedCariId,
      cariTitle: cariUnvan || 'Müşteri',
      cihazAdi: targetProductName,
      markaModel: targetBrand,
      seriNo: newDeviceSeriNo.trim() || `SN-${Math.floor(100000 + Math.random() * 900000)}`,
      bakimPeriyoduAy: newDevicePeriod,
      il: targetAddress?.city || sehir || 'İzmir',
      ilce: targetAddress?.district || ilce || 'Bornova',
      mahalle: targetAddress?.neighborhood || mahalle || '',
      acikAdres: targetAddress?.formattedAddress || birlesikAdres || '',
      adresTipi: targetAddress?.addressType || targetAddress?.title || adresTipi || 'Merkez',
      yetkiliKisi: yetkiliKisi || '',
      yetkiliTelefon: cepTelefonu || '',
      montajTarihi: new Date().toISOString().slice(0, 10),
      sonBakimTarihi: new Date().toISOString().slice(0, 10),
      gelecekBakimTarihi: new Date(Date.now() + newDevicePeriod * 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      durum: 'AKTIF',
      ozelNotlar: 'Inline servis ekranından tanımlandı.'
    };

    // Yerel cihazlar listesine ekle (böylece dropdown'da anında seçilebilir olur!)
    setLocalCihazlar(prev => [newDeviceObj, ...prev]);

    // Formu bu cihaza eşitle
    setSecilenCihazId(newDeviceObj.id);
    setCihazSecimModu('KAYITLI_CIHAZ');
    
    // Cihaz bilgilerini ana form değişkenlerine aktar
    setCihazAdi(newDeviceObj.cihazAdi);
    setMarkaModel(newDeviceObj.markaModel || 'Filtrex');
    setSeriNo(newDeviceObj.seriNo || '');
    setBakimPeriyoduAy(newDeviceObj.bakimPeriyoduAy || 6);
    setEnvantereKaydet(false);

    // Formu sıfırla ve gizle
    setNewDeviceSeriNo('');
    setNewDeviceProductId('');
    setShowAddDeviceForm(false);
  };

  useEffect(() => {
    setBranches(fxApi.getBranches());
  }, []);

  // Helper function to safely get personel full name
  const getPersonelName = (p?: Personel | { id: string; fullName?: string; firstName?: string; lastName?: string; name?: string }): string => {
    if (!p) return 'Saha Teknisyeni';
    if (p.fullName) return p.fullName;
    if (p.firstName) return `${p.firstName} ${p.lastName || ''}`.trim();
    if ((p as any).name) return (p as any).name;
    return 'Saha Teknisyeni';
  };

  // Saha Teknisyenleri listesi
  const sahaTeknisyenleri = personeller.filter(p => 
    p.department === 'Teknik Servis' || 
    (p.title && (p.title.toLowerCase().includes('servis') || p.title.toLowerCase().includes('teknisyen')))
  );
  const teknisyenListesi = sahaTeknisyenleri.length > 0 ? sahaTeknisyenleri : personeller;
  
  const defaultTeknisyen = teknisyenListesi?.[0] || {
    id: 'per-6',
    fullName: 'Caner Yıldız',
    firstName: 'Caner',
    lastName: 'Yıldız',
    department: 'Teknik Servis',
    title: 'Saha Servis Teknisyeni'
  };

  // --- CARİ MODU ---
  // 'KAYITLI' (sistemden seç) veya 'YENI' (yeni cari oluşturulacak)
  const [cariModu, setCariModu] = useState<'KAYITLI' | 'YENI'>('KAYITLI');
  const [cariArama, setCariArama] = useState('');
  const [selectedCariId, setSelectedCariId] = useState('');

  // CARİ BİLGİLERİ FORM ALANLARI
  const [cariUnvan, setCariUnvan] = useState('');
  const [yetkiliKisi, setYetkiliKisi] = useState('');
  const [cepTelefonu, setCepTelefonu] = useState('+90');
  const [cepTelefonu2, setCepTelefonu2] = useState('');
  const [evTelefonu, setEvTelefonu] = useState('');
  const [isTelefonu, setIsTelefonu] = useState('');
  const [adresTipi, setAdresTipi] = useState('');
  const [cityId, setCityId] = useState<number>(0);
  const [sehir, setSehir] = useState('');
  const [ilce, setIlce] = useState('');
  const [mahalle, setMahalle] = useState('');
  const [sokak, setSokak] = useState('');
  const [kapiNo, setKapiNo] = useState('');
  const [daireNo, setDaireNo] = useState('');
  const [apartmanAdi, setApartmanAdi] = useState('');
  const [blokAdi, setBlokAdi] = useState('');
  const [siteAdi, setSiteAdi] = useState('');
  const [birlesikAdres, setBirlesikAdres] = useState('');
  const [secilenAdresId, setSecilenAdresId] = useState('');
  const [referans, setReferans] = useState('');
  const [manuelAdresDegistirildi, setManuelAdresDegistirildi] = useState(false);

  // Akıllı UI Katlama ve Gizleme Durumları
  const [isEditCariDetailsOpen, setIsEditCariDetailsOpen] = useState(false);
  const [isExtraPhonesOpen, setIsExtraPhonesOpen] = useState(false);
  const [isDetailedAddressOpen, setIsDetailedAddressOpen] = useState(false);

  // Coğrafi Veri Listeleri (Cari Yönetim Modülüyle Birebir Uyumlu)
  const citiesList = useMemo(() => geoService.getCities(), []);
  const districtsList = useMemo(() => {
    if (!cityId) return [];
    return geoService.getDistricts(cityId);
  }, [cityId]);
  const neighborhoodsList = useMemo(() => {
    if (!cityId || !ilce) return [];
    return geoService.getNeighborhoods(cityId, ilce);
  }, [cityId, ilce]);

  // Telefon Formatlama ve Normalizasyon Yardımcıları (Cari Modülü ile Birebir Uyumlu)
  const normalizePhoneInput = (value: string): string => {
    let clean = value.replace(/\D/g, '');
    if (clean.startsWith('90')) clean = clean.slice(2);
    else if (clean.startsWith('0')) clean = clean.slice(1);
    clean = clean.slice(0, 10);
    if (!clean) return '+90';
    if (clean.length <= 3) return `+90 (${clean}`;
    if (clean.length <= 6) return `+90 (${clean.slice(0, 3)}) ${clean.slice(3)}`;
    if (clean.length <= 8) return `+90 (${clean.slice(0, 3)}) ${clean.slice(3, 6)} ${clean.slice(6)}`;
    return `+90 (${clean.slice(0, 3)}) ${clean.slice(3, 6)} ${clean.slice(6, 8)} ${clean.slice(8, 10)}`;
  };

  const formatPhoneNumber = (val: string): string => {
    if (!val) return '';
    const trimmed = val.trim();
    if (!trimmed || trimmed === '+' || trimmed === '+9') return '';
    if (trimmed === '+90' || trimmed === '+90 ') return '+90';
    if (trimmed.startsWith('+') && !trimmed.startsWith('+90')) {
      return trimmed;
    }
    return normalizePhoneInput(trimmed);
  };

  const formatPhoneDisplay = (raw?: string): string => {
    if (!raw) return '';
    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    let clean = digits;
    if (clean.startsWith('90')) clean = clean.slice(2);
    else if (clean.startsWith('0')) clean = clean.slice(1);
    if (clean.length === 10) {
      return `+90 (${clean.slice(0, 3)}) ${clean.slice(3, 6)} ${clean.slice(6, 8)} ${clean.slice(8, 10)}`;
    }
    if (clean.length > 0) {
      return normalizePhoneInput(clean);
    }
    return raw;
  };

  const getCityIdFromName = (cityName: string): number => {
    if (!cityName) return 35;
    const clean = cityName.trim().toLocaleLowerCase('tr');
    const found = TURKEY_CITIES.find(c => c.name.toLocaleLowerCase('tr') === clean);
    return found ? found.id : 35;
  };

  const getCityNameFromId = (id: number): string => {
    const found = TURKEY_CITIES.find(c => c.id === id);
    return found ? found.name : 'İzmir';
  };

  const handleCityChange = (newCityId: number) => {
    setCityId(newCityId);
    const cityName = getCityNameFromId(newCityId);
    setSehir(cityName);
    const dists = geoService.getDistricts(newCityId);
    const defaultDist = dists.length > 0 ? dists[0] : '';
    setIlce(defaultDist);
    const hoods = defaultDist ? geoService.getNeighborhoods(newCityId, defaultDist) : [];
    setMahalle(hoods.length > 0 ? hoods[0] : '');
    setManuelAdresDegistirildi(false);
  };

  const handleDistrictChange = (newDistrict: string) => {
    setIlce(newDistrict);
    const hoods = newDistrict ? geoService.getNeighborhoods(cityId, newDistrict) : [];
    setMahalle(hoods.length > 0 ? hoods[0] : '');
    setManuelAdresDegistirildi(false);
  };

  const handleNeighborhoodChange = (newMahalle: string) => {
    setMahalle(newMahalle);
    setManuelAdresDegistirildi(false);
  };

  // Google Haritalar Uyumlu Tam Resmi Adres Derleyici
  const computeFullAddress = (data: {
    mahalle?: string;
    sokak?: string;
    siteAdi?: string;
    apartmanAdi?: string;
    blokAdi?: string;
    kapiNo?: string;
    daireNo?: string;
    ilce?: string;
    sehir?: string;
  }): string => {
    const parts: string[] = [];
    if (data.mahalle) {
      const m = data.mahalle.trim();
      if (m) parts.push(m.toLowerCase().includes('mah') ? m : `${m} Mah.`);
    }
    if (data.sokak) parts.push(data.sokak.trim());
    if (data.siteAdi) parts.push(data.siteAdi.trim());
    if (data.apartmanAdi) parts.push(data.apartmanAdi.trim());
    if (data.blokAdi) {
      const b = data.blokAdi.trim();
      parts.push(b.toLowerCase().includes('blok') ? b : `${b} Blok`);
    }
    const doorParts: string[] = [];
    if (data.kapiNo) {
      const k = data.kapiNo.trim();
      doorParts.push(k.toLowerCase().startsWith('no') ? k : `No: ${k}`);
    }
    if (data.daireNo) {
      const d = data.daireNo.trim();
      doorParts.push(d.toLowerCase().startsWith('d') ? d : `D: ${d}`);
    }
    if (doorParts.length > 0) parts.push(doorParts.join(' '));

    const distCityParts: string[] = [];
    if (data.ilce) distCityParts.push(data.ilce.trim());
    if (data.sehir) distCityParts.push(data.sehir.trim());
    if (distCityParts.length > 0) {
      parts.push(distCityParts.join(' / '));
    }

    return parts.filter(Boolean).join(' ');
  };

  // CİHAZ BİLGİSİ & ARIZA DETAYI FORM ALANLARI
  const [talepServisTuru, setTalepServisTuru] = useState('');
  
  // Cihaz Seçim Yöntemi: 'KAYITLI_CIHAZ' | 'URUNLER_TABLOSU' | 'SERBEST_DIS'
  const [cihazSecimModu, setCihazSecimModu] = useState<'KAYITLI_CIHAZ' | 'URUNLER_TABLOSU' | 'SERBEST_DIS'>('KAYITLI_CIHAZ');
  const [secilenCihazId, setSecilenCihazId] = useState('');
  const [urunArama, setUrunArama] = useState('');
  const [secilenUrunId, setSecilenUrunId] = useState('');

  const [cihazAdi, setCihazAdi] = useState('');
  const [markaModel, setMarkaModel] = useState('');
  const [seriNo, setSeriNo] = useState('');
  const [bildirilenAriza, setBildirilenAriza] = useState('');
  
  // Ek Opsiyonlar
  const [envantereKaydet, setEnvantereKaydet] = useState(true);
  const [bakimPeriyoduAy, setBakimPeriyoduAy] = useState(6);
  const [urunlerTablosunaEkle, setUrunlerTablosunaEkle] = useState(false);

  // SAHA TEKNİSYENİ & RANDEVU PLANI
  const today = new Date().toISOString().slice(0, 10);
  const [randevuTarihi, setRandevuTarihi] = useState(today);
  const [randevuSaati, setRandevuSaati] = useState('11:00');
  const [atananTeknisyenId, setAtananTeknisyenId] = useState('');
  const [whatsappBildirimiOlustur, setWhatsappBildirimiOlustur] = useState(true);

  // Seçilen Carinin Sistemdeki Kayıtlı Cihazları ve Adresleri
  const cariCihazlari = useMemo(() => {
    if (cariModu !== 'KAYITLI' || !selectedCariId) return [];
    return localCihazlar.filter(d => d.cariId === selectedCariId);
  }, [localCihazlar, selectedCariId, cariModu]);

  // Sadece o cariye ait adres tipleri (veya kayıtlı cihazlardaki adres tipleri)
  const birlesikAdresTipleri = useMemo(() => {
    const tipler = new Set<string>();
    const currentCari = cariler.find(c => c.id === selectedCariId);
    if (currentCari?.addressType) tipler.add(currentCari.addressType);
    cariCihazlari.forEach(c => {
      if (c.adresTipi) tipler.add(c.adresTipi);
    });
    (addressTypes || []).forEach(t => tipler.add(t));
    if (tipler.size === 0) {
      tipler.add('Merkez');
    }
    return Array.from(tipler);
  }, [selectedCariId, cariCihazlari, cariler, addressTypes]);

  // Kayıtlı carinin tüm şube, depo ve cihaz adresleri listesi
  const mevcutCariAdresleri = useMemo(() => {
    if (cariModu !== 'KAYITLI' || !selectedCariId) return [];
    const currentCari = cariler.find(c => c.id === selectedCariId);
    if (!currentCari) return [];

    const list: Array<{
      id: string;
      title: string;
      addressType: string;
      formattedAddress: string;
      city?: string;
      district?: string;
      neighborhood?: string;
      street?: string;
      doorNo?: string;
      apartmentNo?: string;
      buildingName?: string;
      blockName?: string;
      siteName?: string;
      yetkiliKisi?: string;
      yetkiliTelefon?: string;
      cihazId?: string;
    }> = [];

    // 1. Cihaz montaj adresleri (Örn: Fabrika Adresi)
    cariCihazlari.forEach((d, idx) => {
      const fullAddr = d.acikAdres || computeFullAddress({
        mahalle: d.mahalle,
        ilce: d.ilce,
        sehir: d.il
      });
      if (fullAddr) {
        list.push({
          id: `dev-addr-${d.id || idx}`,
          title: d.adresTipi || 'Fabrika Adresi',
          addressType: d.adresTipi || 'Fabrika Adresi',
          formattedAddress: fullAddr,
          city: d.il,
          district: d.ilce,
          neighborhood: d.mahalle,
          street: d.acikAdres,
          yetkiliKisi: d.yetkiliKisi,
          yetkiliTelefon: d.yetkiliTelefon,
          cihazId: d.id
        });
      }
    });

    // 2. Cari ana / fatura adresi
    const cariFull = currentCari.address || computeFullAddress({
      mahalle: currentCari.neighborhood,
      sokak: currentCari.street,
      siteAdi: currentCari.siteName,
      apartmanAdi: currentCari.buildingName,
      blokAdi: currentCari.blockName,
      kapiNo: currentCari.doorNo,
      daireNo: currentCari.apartmentNo,
      ilce: currentCari.district,
      sehir: currentCari.city
    });

    if (cariFull) {
      list.push({
        id: `cari-main-${currentCari.id}`,
        title: currentCari.addressType || 'Merkez / Fatura Adresi',
        addressType: currentCari.addressType || 'Fatura Adresi',
        formattedAddress: cariFull,
        city: currentCari.city,
        district: currentCari.district,
        neighborhood: currentCari.neighborhood,
        street: currentCari.street,
        doorNo: currentCari.doorNo,
        apartmentNo: currentCari.apartmentNo,
        buildingName: currentCari.buildingName,
        blockName: currentCari.blockName,
        siteName: currentCari.siteName,
        yetkiliKisi: currentCari.authorizedPerson,
        yetkiliTelefon: currentCari.phone
      });
    }

    // 3. Cari kayıtlı diğer şube/antrepo adresleri (addresses listesi)
    if (Array.isArray(currentCari.addresses)) {
      currentCari.addresses.forEach((addr: any, idx: number) => {
        const addrFormatted = addr.formattedAddress || computeFullAddress({
          mahalle: addr.neighborhoodId,
          sokak: addr.streetLine,
          siteAdi: addr.siteName,
          apartmanAdi: addr.buildingName,
          blokAdi: addr.blockName,
          kapiNo: addr.doorNumber,
          daireNo: addr.apartmentNumber,
          ilce: addr.districtId,
          sehir: addr.cityName
        });
        if (addrFormatted) {
          list.push({
            id: `cari-addr-${addr.id || idx}`,
            title: addr.title || addr.addressType || `Şube / Adres ${idx + 1}`,
            addressType: addr.addressType || 'Teslimat Adresi',
            formattedAddress: addrFormatted,
            city: addr.cityName,
            district: addr.districtId,
            neighborhood: addr.neighborhoodId,
            street: addr.streetLine,
            doorNo: addr.doorNumber,
            apartmentNo: addr.apartmentNumber,
            buildingName: addr.buildingName,
            blockName: addr.blockName,
            siteName: addr.siteName
          });
        }
      });
    }

    // Caride alternatif şube/teslimat adresi yoksa alternatif şube ekle (kullanıcı test edebilsin)
    if (list.length === 1 && currentCari) {
      list.push({
        id: `cari-branch-alt-${currentCari.id}`,
        title: 'Kemalpaşa Lojistik Depo & Şube',
        addressType: 'Depo & Sevkiyat',
        formattedAddress: 'Kemalpaşa OSB Mah. 120. Sokak No: 8 Kemalpaşa / İzmir',
        city: 'İzmir',
        district: 'Kemalpaşa',
        neighborhood: 'Kemalpaşa OSB Mah.',
        street: '120. Sokak',
        doorNo: '8'
      });
    }

    // Tekilleştirme
    const uniqueList: typeof list = [];
    const seen = new Set<string>();
    list.forEach(item => {
      const key = (item.formattedAddress || '').trim().toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        uniqueList.push(item);
      }
    });

    return uniqueList;
  }, [cariModu, selectedCariId, cariler, cariCihazlari]);

  const handleAdresSecimi = (adresId: string) => {
    setSecilenAdresId(adresId);
    const secilen = mevcutCariAdresleri.find(a => a.id === adresId);
    if (!secilen) return;

    setAdresTipi(secilen.addressType || secilen.title);
    setBirlesikAdres(secilen.formattedAddress);

    if (secilen.city) {
      const cid = getCityIdFromName(secilen.city);
      setCityId(cid);
      setSehir(getCityNameFromId(cid));
    }
    if (secilen.district) setIlce(secilen.district);
    if (secilen.neighborhood) setMahalle(secilen.neighborhood);
    if (secilen.street) setSokak(secilen.street);
    if (secilen.doorNo) setKapiNo(secilen.doorNo);
    if (secilen.apartmentNo) setDaireNo(secilen.apartmentNo);
    if (secilen.buildingName) setApartmanAdi(secilen.buildingName);
    if (secilen.blockName) setBlokAdi(secilen.blockName);
    if (secilen.siteName) setSiteAdi(secilen.siteName);

    if (secilen.cihazId) {
      const dev = cihazlar.find(d => d.id === secilen.cihazId);
      if (dev) {
        setSecilenCihazId(dev.id);
        setCihazAdi(dev.cihazAdi);
        setSeriNo(dev.seriNo || '');
        setMarkaModel(dev.markaModel || 'Filtrex');
        setBakimPeriyoduAy(dev.bakimPeriyoduAy || 6);
        setEnvantereKaydet(false);
      }
    }
  };

  useEffect(() => {
    if (mevcutCariAdresleri.length > 0) {
      const found = mevcutCariAdresleri.find(
        a => a.formattedAddress.trim() === (birlesikAdres || '').trim() ||
             (adresTipi && a.title.toLowerCase() === adresTipi.toLowerCase())
      );
      if (found) {
        setSecilenAdresId(found.id);
      } else if (!secilenAdresId || !mevcutCariAdresleri.some(a => a.id === secilenAdresId)) {
        setSecilenAdresId(mevcutCariAdresleri[0].id);
      }
    }
  }, [mevcutCariAdresleri, birlesikAdres, adresTipi, secilenAdresId]);

  // Cari ve Cihaz nesnelerinden form alanlarını eksiksiz ve otomatik doldurma fonksiyonu
  const populateForm = (c: Cari | null, dev: MusteriCihazi | null) => {
    if (!c && !dev) return;

    // 1. Cari ve Yetkili Bilgileri (Kayıtlı caride en az iki telefon garantili)
    const targetTitle = dev?.cariTitle || c?.title || '';
    const targetYetkili = dev?.yetkiliKisi || c?.authorizedPerson || '';
    const targetTel = dev?.yetkiliTelefon || c?.phone || (c as any)?.mobilePhone1 || '';
    const targetTel2 = c?.phone2 || (c as any)?.mobilePhone2 || c?.workPhone || (c as any)?.homePhone || '';
    const targetEvTel = c?.homePhone || '';
    const targetIsTel = c?.workPhone || '';

    setCariUnvan(targetTitle);
    setYetkiliKisi(targetYetkili);
    setCepTelefonu(targetTel ? (formatPhoneNumber(targetTel) || targetTel) : '+90');
    setCepTelefonu2(targetTel2 ? (formatPhoneNumber(targetTel2) || targetTel2) : '');
    setEvTelefonu(targetEvTel ? (formatPhoneNumber(targetEvTel) || targetEvTel) : '');
    setIsTelefonu(targetIsTel ? (formatPhoneNumber(targetIsTel) || targetIsTel) : '');

    // Auto sync branch from selected cari to avoid manual selector
    if (c && c.branchId) {
      setSelectedBranchId(c.branchId);
    }

    // 2. Adres Bilgileri (Öncelik cihazın montaj/servis adresindedir, yoksa cari ana adresindedir)
    const effAdresTipi = dev?.adresTipi || c?.addressType || 'Fatura Adresi';
    const effSehir = dev?.il || c?.city || 'İzmir';
    const cid = getCityIdFromName(effSehir);
    const effCityName = getCityNameFromId(cid);
    const effIlce = dev?.ilce || c?.district || 'Bornova';
    const effMahalle = dev?.mahalle || c?.neighborhood || 'Zafer Mah.';
    const effSokak = c?.street || (dev?.acikAdres ? dev.acikAdres : '2040 Sokak');
    const effKapiNo = c?.doorNo || '15';
    const effDaireNo = c?.apartmentNo || '4';
    const effApartman = c?.buildingName || 'Yıldız Apt.';
    const effBlok = c?.blockName || 'A Blok';
    const effSite = c?.siteName || 'Park Sit.';
    const effRef = c?.referenceNote || dev?.ozelNotlar || '';

    const computedFull = computeFullAddress({
      mahalle: effMahalle,
      sokak: effSokak,
      siteAdi: effSite,
      apartmanAdi: effApartman,
      blokAdi: effBlok,
      kapiNo: effKapiNo,
      daireNo: effDaireNo,
      ilce: effIlce,
      sehir: effCityName
    });

    const effBirlesik = dev?.acikAdres || c?.address || computedFull;

    setAdresTipi(effAdresTipi);
    setCityId(cid);
    setSehir(effCityName);
    setIlce(effIlce);
    setMahalle(effMahalle);
    setSokak(effSokak);
    setKapiNo(effKapiNo);
    setDaireNo(effDaireNo);
    setApartmanAdi(effApartman);
    setBlokAdi(effBlok);
    setSiteAdi(effSite);
    setBirlesikAdres(effBirlesik);
    setReferans(effRef);
    setManuelAdresDegistirildi(false);

    // 3. Cihaz Bilgileri
    if (dev) {
      setSecilenCihazId(dev.id);
      setCihazSecimModu('KAYITLI_CIHAZ');
      setCihazAdi(dev.cihazAdi);
      setMarkaModel(dev.markaModel || brandTypes?.[0] || 'Filtrex');
      setSeriNo(dev.seriNo || '');
      setBakimPeriyoduAy(dev.bakimPeriyoduAy || 6);
      setEnvantereKaydet(false); // Zaten sistemde kayıtlı cihaz olduğu için mükerrer kayıt oluşmasın

      // Servis türü ve açıklama
      const matchedService = dev.servisTuru 
        ? (serviceTypes.find(t => t.toLowerCase() === dev.servisTuru?.toLowerCase()) || 
           serviceTypes.find(t => t.toLowerCase().includes(dev.servisTuru?.toLowerCase() || '')) ||
           dev.servisTuru)
        : null;
      const periyodikService = matchedService || serviceTypes.find(t => 
        t.toLowerCase().includes('periyodik') || t.toLowerCase().includes('bakım')
      ) || serviceTypes[0] || 'Periyodik Bakım & Filtre Değişimi';
      setTalepServisTuru(periyodikService);

      const isAriza = periyodikService.toLowerCase().includes('arıza') || periyodikService.toLowerCase().includes('ariza');
      const isMontaj = periyodikService.toLowerCase().includes('montaj') || periyodikService.toLowerCase().includes('kurulum');
      const isKesif = periyodikService.toLowerCase().includes('keşif') || periyodikService.toLowerCase().includes('kesif');

      const arizaAciklamasi = dev.ozelNotlar
        ? `${dev.cihazAdi} [${periyodikService}] randevusu. Not: ${dev.ozelNotlar}`
        : isAriza
        ? `${dev.cihazAdi} arıza onarım ve acil teknik servis müdahalesi`
        : isMontaj
        ? `${dev.cihazAdi} yeni montaj ve sistem devreye alma kurulumu`
        : isKesif
        ? `${dev.cihazAdi} saha keşif, debi ve su analizi ölçümü`
        : `${dev.cihazAdi} periyodik filtre değişimi ve genel cihaz bakımı randevusu (Hedef Bakım Tarihi: ${dev.gelecekBakimTarihi || 'Belirtilmedi'})`;
      setBildirilenAriza(arizaAciklamasi);

      if (dev.gelecekBakimTarihi) {
        setRandevuTarihi(dev.gelecekBakimTarihi);
      }
    } else {
      setSecilenCihazId('');
      setEnvantereKaydet(true);
    }
  };

  // Modal açıldığında veya initialCari / initialCihaz / editingServis verildiğinde tüm bilgileri otomatik doldur
  useEffect(() => {
    if (!isOpen) return;

    if (editingServis) {
      setCariModu('KAYITLI');
      setSelectedCariId(editingServis.cariId || '');
      setCariUnvan(editingServis.cariTitle || '');
      setYetkiliKisi(editingServis.yetkili || '');
      setCepTelefonu(editingServis.telefon ? (formatPhoneNumber(editingServis.telefon) || editingServis.telefon) : '+90');
      setAdresTipi(editingServis.adresTipi || 'Merkez / Fatura Adresi');
      
      const cityIdFound = getCityIdFromName(editingServis.il || 'İzmir');
      setCityId(cityIdFound);
      setSehir(editingServis.il || 'İzmir');
      setIlce(editingServis.ilce || '');
      setMahalle(editingServis.mahalle || '');
      setBirlesikAdres(editingServis.acikAdres || '');
      setManuelAdresDegistirildi(true);

      // Cihaz Bilgisi
      if (editingServis.cihazId) {
        setSecilenCihazId(editingServis.cihazId);
        setCihazSecimModu('KAYITLI_CIHAZ');
      } else {
        setCihazSecimModu('SERBEST_DIS');
      }
      setCihazAdi(editingServis.cihazAdi || '');
      setSeriNo(editingServis.seriNo || '');
      
      // Bildirilen Arıza / Servis Türü
      if (editingServis.bildirilenAriza) {
        setBildirilenAriza(editingServis.bildirilenAriza);
      }
      if (editingServis.servisTipi === 'PERIYODIK_BAKIM' || editingServis.servisTipi === 'FILTRE_DEGISIMI') {
        setTalepServisTuru('Periyodik Bakım & Filtre Değişimi');
      } else if (editingServis.servisTipi === 'MONTAJ_KURULUM') {
        setTalepServisTuru('Montaj & Yeni Kurulum');
      } else if (editingServis.servisTipi === 'KESIF_DURUM_TESPITI') {
        setTalepServisTuru('Keşif & Su Analizi');
      } else {
        setTalepServisTuru('Arıza & Onarım (Cihaz Bozuk / Şikayet Var)');
      }

      // Randevu & Teknisyen
      if (editingServis.randevuTarihi) {
        const parts = editingServis.randevuTarihi.split(' ');
        setRandevuTarihi(parts[0] || today);
        setRandevuSaati(parts[1] || '11:00');
      }
      if (editingServis.atananTeknisyenId) {
        setAtananTeknisyenId(editingServis.atananTeknisyenId);
      }
      if (editingServis.branchId) {
        setSelectedBranchId(editingServis.branchId);
      }
      setWhatsappBildirimiOlustur(false);
      setEnvantereKaydet(false);
      return;
    }

    if (isCreateEmpty) {
      setSelectedCariId('');
      setCariModu('KAYITLI');
      setCariUnvan('');
      setYetkiliKisi('');
      setCepTelefonu('+90');
      setCepTelefonu2('');
      setEvTelefonu('');
      setIsTelefonu('');
      setAdresTipi('');
      setSehir('');
      setCityId(0);
      setIlce('');
      setMahalle('');
      setSokak('');
      setKapiNo('');
      setDaireNo('');
      setApartmanAdi('');
      setBlokAdi('');
      setSiteAdi('');
      setBirlesikAdres('');
      setReferans('');
      setSecilenCihazId('');
      setCihazSecimModu('SERBEST_DIS');
      setCihazAdi('');
      setMarkaModel('');
      setSeriNo('');
      setBildirilenAriza('');
      setSecilenAdresId('');
      setEnvantereKaydet(true);
      setRandevuTarihi(today);
      setRandevuSaati('11:00');
      setAtananTeknisyenId('');
      setWhatsappBildirimiOlustur(true);
      setTalepServisTuru('');
      setSelectedBranchId('');
      setCariArama('');
      setManuelAdresDegistirildi(false);
      return;
    }

    const targetCihaz = initialCihaz || (initialCihazId ? cihazlar.find(d => d.id === initialCihazId) : null);
    const targetCariId = initialCariId || targetCihaz?.cariId || (cariler.length > 0 ? cariler[0].id : '');
    const targetCari = cariler.find(c => c.id === targetCariId) || null;

    if (targetCariId) {
      setSelectedCariId(targetCariId);
      setCariModu('KAYITLI');
    }

    if (targetCihaz) {
      populateForm(targetCari, targetCihaz);
    } else if (targetCari) {
      const cariDevices = cihazlar.filter(d => d.cariId === targetCari.id);
      populateForm(targetCari, cariDevices.length > 0 ? cariDevices[0] : null);
    }
  }, [isOpen, initialCariId, initialCihazId, initialCihaz, editingServis, isCreateEmpty]);

  // Cari seçim dropdown'ından başka bir cari seçildiğinde
  const handleCariSelectChange = (newCariId: string) => {
    setSelectedCariId(newCariId);
    const foundCari = cariler.find(c => c.id === newCariId) || null;
    const cariDevices = cihazlar.filter(d => d.cariId === newCariId);
    populateForm(foundCari, cariDevices.length > 0 ? cariDevices[0] : null);
  };

  // Kayıtlı cihaz listesinden cihaz değiştirildiğinde
  const handleCihazSelectChange = (cihazId: string) => {
    setSecilenCihazId(cihazId);
    const found = cihazlar.find(d => d.id === cihazId);
    if (found) {
      setCihazAdi(found.cihazAdi);
      setMarkaModel(found.markaModel || brandTypes?.[0] || 'Filtrex');
      setSeriNo(found.seriNo || '');
      setBakimPeriyoduAy(found.bakimPeriyoduAy || 6);
      if (found.gelecekBakimTarihi) {
        setRandevuTarihi(found.gelecekBakimTarihi);
      }
      if (found.adresTipi) setAdresTipi(found.adresTipi);
      if (found.il) {
        const cid = getCityIdFromName(found.il);
        setCityId(cid);
        setSehir(getCityNameFromId(cid));
      }
      if (found.ilce) setIlce(found.ilce);
      if (found.mahalle) setMahalle(found.mahalle);
      if (found.acikAdres) {
        setSokak(found.acikAdres);
        setBirlesikAdres(found.acikAdres);
      }
      if (found.yetkiliKisi) setYetkiliKisi(found.yetkiliKisi);
      if (found.yetkiliTelefon) setCepTelefonu(formatPhoneNumber(found.yetkiliTelefon) || found.yetkiliTelefon);
      setEnvantereKaydet(false);
    }
  };

  // Adres Tipi değiştiğinde:
  // "Eğer kayıtlı müşteri ise Adres Tipi alanı seçilince o adrese ait kayıtları getir"
  const handleAdresTipiChange = (newAdresTipi: string) => {
    setAdresTipi(newAdresTipi);

    if (cariModu === 'KAYITLI' && selectedCariId) {
      const currentCari = cariler.find(c => c.id === selectedCariId);

      // 1. Önce bu cariye ait bu adres tipindeki cihaz kaydını ara
      const eslesenCihazAdresi = cariCihazlari.find(c => 
        c.adresTipi?.toLowerCase() === newAdresTipi.toLowerCase() ||
        c.adresTipi?.toLowerCase().includes(newAdresTipi.toLowerCase()) ||
        newAdresTipi.toLowerCase().includes(c.adresTipi?.toLowerCase() || '')
      );
      
      if (eslesenCihazAdresi) {
        if (eslesenCihazAdresi.il) {
          const cid = getCityIdFromName(eslesenCihazAdresi.il);
          setCityId(cid);
          setSehir(getCityNameFromId(cid));
        }
        if (eslesenCihazAdresi.ilce) setIlce(eslesenCihazAdresi.ilce);
        if (eslesenCihazAdresi.mahalle) setMahalle(eslesenCihazAdresi.mahalle);
        if (eslesenCihazAdresi.acikAdres) {
          setSokak(eslesenCihazAdresi.acikAdres);
          setBirlesikAdres(eslesenCihazAdresi.acikAdres);
        }
        if (eslesenCihazAdresi.yetkiliKisi) setYetkiliKisi(eslesenCihazAdresi.yetkiliKisi);
        if (eslesenCihazAdresi.yetkiliTelefon) setCepTelefonu(formatPhoneNumber(eslesenCihazAdresi.yetkiliTelefon) || eslesenCihazAdresi.yetkiliTelefon);

        if (eslesenCihazAdresi.id) {
          setSecilenCihazId(eslesenCihazAdresi.id);
          setCihazAdi(eslesenCihazAdresi.cihazAdi);
          setSeriNo(eslesenCihazAdresi.seriNo || '');
          setMarkaModel(eslesenCihazAdresi.markaModel || 'Filtrex');
          setBakimPeriyoduAy(eslesenCihazAdresi.bakimPeriyoduAy || 6);
          setEnvantereKaydet(false);
        }
      } else if (currentCari) {
        // Cari ana adresine dön
        const cid = getCityIdFromName(currentCari.city || 'İzmir');
        const cCity = getCityNameFromId(cid);
        const cIlce = currentCari.district || 'Bornova';
        const cMahalle = currentCari.neighborhood || 'Zafer Mah.';
        const cSokak = currentCari.street || '2040 Sokak';
        const cKapi = currentCari.doorNo || '15';
        const cDaire = currentCari.apartmentNo || '4';
        const cApt = currentCari.buildingName || 'Yıldız Apt.';
        const cBlok = currentCari.blockName || 'A Blok';
        const cSite = currentCari.siteName || 'Park Sit.';

        setCityId(cid);
        setSehir(cCity);
        setIlce(cIlce);
        setMahalle(cMahalle);
        setSokak(cSokak);
        setKapiNo(cKapi);
        setDaireNo(cDaire);
        setApartmanAdi(cApt);
        setBlokAdi(cBlok);
        setSiteAdi(cSite);
        setBirlesikAdres(currentCari.address || computeFullAddress({
          mahalle: cMahalle,
          sokak: cSokak,
          siteAdi: cSite,
          apartmanAdi: cApt,
          blokAdi: cBlok,
          kapiNo: cKapi,
          daireNo: cDaire,
          ilce: cIlce,
          sehir: cCity
        }));
      }
    }
  };

  // Otomatik Birleştirilmiş Resmi Adres Hesaplama
  useEffect(() => {
    if (!manuelAdresDegistirildi) {
      const full = computeFullAddress({
        mahalle,
        sokak,
        siteAdi,
        apartmanAdi,
        blokAdi,
        kapiNo,
        daireNo,
        ilce,
        sehir
      });
      if (full) {
        setBirlesikAdres(full);
      }
    }
  }, [mahalle, sokak, siteAdi, apartmanAdi, blokAdi, kapiNo, daireNo, ilce, sehir, manuelAdresDegistirildi]);

  // Stoklar aramasından filtrelenen ürünler
  const filtrelenenUrunler = useMemo(() => {
    if (!stoklar || stoklar.length === 0) return [];
    if (!urunArama.trim()) return stoklar.slice(0, 15);
    const q = urunArama.toLowerCase();
    return stoklar.filter(s => 
      s.name.toLowerCase().includes(q) || 
      s.code.toLowerCase().includes(q) ||
      (s.brand && s.brand.toLowerCase().includes(q)) ||
      (s.category && s.category.toLowerCase().includes(q))
    ).slice(0, 15);
  }, [stoklar, urunArama]);

  // Ürünler tablosundan bir ürün seçildiğinde
  const handleSelectUrun = (urun: Stok) => {
    setSecilenUrunId(urun.id);
    setCihazAdi(urun.name);
    if (urun.brand) {
      setMarkaModel(urun.brand);
    }
  };

  // Cari arama filtresi (Cari Ünvan, Yetkili, Telefonlar, Adres)
  const filtrelenenCariler = useMemo(() => {
    if (!cariArama.trim()) return cariler;
    const q = cariArama.trim().toLowerCase();
    const qTr = cariArama.trim().toLocaleLowerCase('tr-TR');
    const qDigits = cariArama.replace(/\D/g, '');
    const cleanQDigits = qDigits.startsWith('0') ? qDigits.slice(1) : (qDigits.startsWith('90') ? qDigits.slice(2) : qDigits);

    return cariler.filter(c => {
      // Metin alanları: Ünvan, Kod, Yetkili, Adres
      const texts = [
        c.title,
        c.shortName,
        c.code,
        c.authorizedPerson,
        c.addressType,
        c.city,
        c.district,
        c.neighborhood,
        c.street,
        c.doorNo,
        c.apartmentNo,
        c.buildingName,
        c.siteName,
        c.address,
        c.referenceNote
      ];

      for (const t of texts) {
        if (!t) continue;
        if (t.toLowerCase().includes(q) || t.toLocaleLowerCase('tr-TR').includes(qTr)) {
          return true;
        }
      }

      // Telefonlar
      const phones = [c.phone, c.phone2, c.workPhone, c.homePhone];
      for (const p of phones) {
        if (!p) continue;
        if (p.toLowerCase().includes(q)) return true;
        if (cleanQDigits.length >= 2) {
          const pDigits = p.replace(/\D/g, '');
          const cleanPDigits = pDigits.startsWith('0') ? pDigits.slice(1) : (pDigits.startsWith('90') ? pDigits.slice(2) : pDigits);
          if (cleanPDigits.includes(cleanQDigits) || pDigits.includes(qDigits)) {
            return true;
          }
        }
      }

      return false;
    });
  }, [cariler, cariArama]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!cariUnvan.trim()) {
      alert('Lütfen Cari Unvanını (Müşteri / Firma Adı) giriniz.');
      return;
    }

    if (!cepTelefonu.trim() || cepTelefonu.trim() === '+90') {
      alert('Lütfen geçerli bir İletişim / Cep Telefonu numarası giriniz.');
      return;
    }

    const selectedTeknisyen = teknisyenListesi.find(t => t.id === atananTeknisyenId) || defaultTeknisyen;
    const tekFullName = getPersonelName(selectedTeknisyen);
    const isCaner = tekFullName.toLowerCase().includes('caner');
    
    const tekDepoId = isCaner ? 'depo-mobil-caner' : 'depo-mobil-isa';
    const tekDepoAdi = isCaner ? 'Caner Yıldız - 35 FLT 101 Mobil Servis Deposu' : 'İsa Doğan - 35 FLT 202 Mobil Servis Deposu';
    const tekKasaId = isCaner ? 'k-saha-caner' : 'k-saha-isa';
    const tekKasaAdi = `${tekFullName} Saha Kasası`;

    const branchToSave = selectedBranchId || (branches[0]?.id || 'b1111111-1111-1111-1111-111111111111');
    const servisNo = editingServis?.servisNo || `SRV-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    let targetCariId = selectedCariId;
    let yeniCariObj: Omit<Cari, 'id'> | undefined = undefined;

    // EĞER YENİ CARİ İSE Cari Yönetimi için yeni cari oluştur
    if (cariModu === 'YENI') {
      targetCariId = 'car-' + Date.now();
      yeniCariObj = {
        code: `CAR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        title: cariUnvan.trim(),
        shortName: cariUnvan.trim().slice(0, 20),
        type: 'Müşteri',
        status: 'Aktif',
        authorizedPerson: yetkiliKisi.trim(),
        phone: cepTelefonu.trim(),
        phone2: cepTelefonu2.trim(),
        homePhone: evTelefonu.trim(),
        workPhone: isTelefonu.trim(),
        email: '',
        taxNumber: '',
        taxOffice: '',
        balance: 0,
        creditLimit: 25000,
        paymentTermDays: 30,
        riskStatus: 'DUSUK',
        isEInvoice: false,
        addressType: adresTipi,
        city: sehir.trim() || 'İzmir',
        district: ilce.trim(),
        neighborhood: mahalle.trim(),
        street: sokak.trim(),
        doorNo: kapiNo.trim(),
        apartmentNo: daireNo.trim(),
        buildingName: apartmanAdi.trim(),
        blockName: blokAdi.trim(),
        siteName: siteAdi.trim(),
        address: birlesikAdres.trim(),
        referenceNote: referans.trim(),
        notes: `Servis Formundan Oluşturuldu (${servisNo})`,
        createdAt: new Date().toISOString()
      };
    }

    // Cihaz Adı ve Seri No
    const finalCihazAdi = cihazAdi.trim() || 'Su Arıtma / Filtrasyon Sistemi';
    const finalSeriNo = seriNo.trim() || `SN-${Math.floor(100000 + Math.random() * 900000)}`;
    const isInlineDevice = Boolean(secilenCihazId && secilenCihazId.startsWith('cihaz-inline-'));
    const isExistingDevice = Boolean(secilenCihazId && cihazSecimModu === 'KAYITLI_CIHAZ' && !isInlineDevice);
    const finalCihazId = isExistingDevice ? secilenCihazId : 'cihaz-' + Date.now();

    const inlineDevice = isInlineDevice ? localCihazlar.find(d => d.id === secilenCihazId) : null;

    // Müşteri Cihazı Envanter Kaydı (Yalnızca yeni / harici / inline cihazlar için envantere eklenecekse)
    let yeniCihazObj: Omit<MusteriCihazi, 'id'> | undefined = undefined;
    if (inlineDevice) {
      yeniCihazObj = {
        cariId: targetCariId,
        cariTitle: cariUnvan.trim(),
        adresTipi: inlineDevice.adresTipi || adresTipi,
        il: inlineDevice.il || sehir.trim() || 'İzmir',
        ilce: inlineDevice.ilce || ilce.trim(),
        mahalle: inlineDevice.mahalle || mahalle.trim(),
        acikAdres: inlineDevice.acikAdres || birlesikAdres.trim(),
        yetkiliKisi: inlineDevice.yetkiliKisi || yetkiliKisi.trim(),
        yetkiliTelefon: inlineDevice.yetkiliTelefon || cepTelefonu.trim(),
        cihazAdi: inlineDevice.cihazAdi,
        seriNo: inlineDevice.seriNo || finalSeriNo,
        montajTarihi: inlineDevice.montajTarihi || randevuTarihi,
        bakimPeriyoduAy: inlineDevice.bakimPeriyoduAy || bakimPeriyoduAy || 6,
        sonBakimTarihi: inlineDevice.sonBakimTarihi || randevuTarihi,
        gelecekBakimTarihi: inlineDevice.gelecekBakimTarihi || randevuTarihi,
        durum: 'AKTIF',
        ozelNotlar: `Servis Kaydı ile Inline Eklendi: ${servisNo}. Arıza: ${bildirilenAriza || 'Genel Servis'}`,
        branchId: branchToSave
      };
    } else if (envantereKaydet && !isExistingDevice) {
      const nextD = new Date(randevuTarihi);
      nextD.setMonth(nextD.getMonth() + (bakimPeriyoduAy || 6));

      yeniCihazObj = {
        cariId: targetCariId,
        cariTitle: cariUnvan.trim(),
        adresTipi: adresTipi,
        il: sehir.trim() || 'İzmir',
        ilce: ilce.trim(),
        mahalle: mahalle.trim(),
        acikAdres: birlesikAdres.trim(),
        yetkiliKisi: yetkiliKisi.trim(),
        yetkiliTelefon: cepTelefonu.trim(),
        cihazAdi: finalCihazAdi.includes(markaModel) ? finalCihazAdi : `${finalCihazAdi} (${markaModel})`,
        seriNo: finalSeriNo,
        montajTarihi: randevuTarihi,
        bakimPeriyoduAy: bakimPeriyoduAy || 6,
        sonBakimTarihi: randevuTarihi,
        gelecekBakimTarihi: nextD.toISOString().slice(0, 10),
        durum: 'AKTIF',
        ozelNotlar: `Servis Kaydı: ${servisNo}. Arıza: ${bildirilenAriza || 'Genel Servis'}. Ref: ${referans}`,
        branchId: branchToSave
      };
    }

    // Ürünler Tablosuna da Eklensin mi?
    let yeniStokObj: Omit<Stok, 'id'> | undefined = undefined;
    const inlineDeviceObj = isInlineDevice ? localCihazlar.find(d => d.id === secilenCihazId) : null;
    const associatedInlineStock = inlineDeviceObj 
      ? localStoklar.find(s => s.name === inlineDeviceObj.cihazAdi && s.id.startsWith('stok-inline-'))
      : null;

    if (associatedInlineStock) {
      yeniStokObj = {
        code: associatedInlineStock.code || `STK-SRV-${Math.floor(1000 + Math.random() * 9000)}`,
        name: associatedInlineStock.name,
        category: 'Su Arıtma Cihazları',
        unit: 'Adet',
        barcode: '',
        costMethod: 'FIFO',
        buyPrice: 0,
        sellPrice: 0,
        vatRate: 20,
        currency: 'TRY',
        currentQuantity: 1,
        criticalQuantity: 0,
        warehouseLocation: 'MERKEZ',
        brand: associatedInlineStock.brand || markaModel,
        isActive: true
      };
    } else if (urunlerTablosunaEkle && cihazSecimModu === 'SERBEST_DIS' && cihazAdi.trim()) {
      yeniStokObj = {
        code: `STK-SRV-${Math.floor(1000 + Math.random() * 9000)}`,
        name: finalCihazAdi,
        category: 'Su Arıtma Cihazları',
        unit: 'Adet',
        barcode: '',
        costMethod: 'FIFO',
        buyPrice: 0,
        sellPrice: 0,
        vatRate: 20,
        currency: 'TRY',
        currentQuantity: 1,
        criticalQuantity: 0,
        warehouseLocation: 'MERKEZ',
        brand: markaModel,
        isActive: true
      };
    }

    // Servis Fişi Nesnesi
    const yeniServis: Omit<ServisFisi, 'id'> = {
      servisNo: servisNo,
      cihazId: finalCihazId,
      cihazAdi: finalCihazAdi.includes(markaModel) ? finalCihazAdi : `${finalCihazAdi} (${markaModel})`,
      seriNo: finalSeriNo,
      cariId: targetCariId,
      cariTitle: cariUnvan.trim(),
      adresTipi: adresTipi,
      il: sehir.trim() || 'İzmir',
      ilce: ilce.trim(),
      mahalle: mahalle.trim(),
      acikAdres: birlesikAdres.trim(),
      telefon: cepTelefonu.trim(),
      yetkili: yetkiliKisi.trim(),
      randevuTarihi: `${randevuTarihi} ${randevuSaati}`,
      atananTeknisyenId: selectedTeknisyen.id,
      atananTeknisyenAdi: tekFullName,
      teknisyenDepoId: tekDepoId,
      teknisyenDepoAdi: tekDepoAdi,
      durum: 'RANDEVU_PLANLANDI',
      odemeTuru: 'NAKIT',
      tahsilatTutari: 0,
      kasaId: tekKasaId,
      kasaAdi: tekKasaAdi,
      kalemler: [],
      createdAt: new Date().toISOString().slice(0, 10),
      servisTipi: talepServisTuru.toLowerCase().includes('bakım') || talepServisTuru.toLowerCase().includes('bakim')
        ? 'PERIYODIK_BAKIM'
        : talepServisTuru.toLowerCase().includes('filtre') || talepServisTuru.toLowerCase().includes('değişim') || talepServisTuru.toLowerCase().includes('degisim')
        ? 'FILTRE_DEGISIMI'
        : talepServisTuru.toLowerCase().includes('montaj') || talepServisTuru.toLowerCase().includes('kurulum')
        ? 'MONTAJ_KURULUM'
        : talepServisTuru.toLowerCase().includes('keşif') || talepServisTuru.toLowerCase().includes('kesif')
        ? 'KESIF_DURUM_TESPITI'
        : 'ARIZA_ONARIM',
      cihazKaynagi: isExistingDevice ? 'BIZDEN_ALMIS' : 'DIS_CIHAZ_BASKASI_SATMIS',
      bildirilenAriza: `[${talepServisTuru}] - ${bildirilenAriza.trim()}`,
      branchId: branchToSave
    };

    // WhatsApp Bildirim Nesnesi
    let yeniBildirim: Omit<ServisBildirim, 'id'> | undefined = undefined;
    if (whatsappBildirimiOlustur) {
      yeniBildirim = {
        servisId: '',
        cariId: targetCariId,
        cariTitle: cariUnvan.trim(),
        telefon: cepTelefonu.trim(),
        kanal: 'WHATSAPP',
        tip: 'RANDEVU_BILGISI',
        mesaj: `Sayın Yetkili (${cariUnvan.trim()}), ${servisNo} numaralı servis talebiniz oluşturulmuştur. Randevu: ${randevuTarihi} ${randevuSaati}. Teknisyen: ${tekFullName}. Adres: ${birlesikAdres.trim()}. Filtrex Arıtma Servis Hizmetleri.`,
        durum: 'ONAY_BEKLIYOR',
        gonderenKullanici: 'Sistem',
        olusturmaTarihi: new Date().toISOString().slice(0, 16).replace('T', ' '),
        branchId: branchToSave
      };
    }

    // Eğer kayıtlı cari üzerinden telefon veya adres güncellendiyse
    let guncellenenCariObj: (Partial<Cari> & { id: string }) | undefined = undefined;
    if (cariModu === 'KAYITLI' && targetCariId) {
      guncellenenCariObj = {
        id: targetCariId,
        title: cariUnvan.trim(),
        authorizedPerson: yetkiliKisi.trim(),
        phone: cepTelefonu.trim(),
        phone2: cepTelefonu2.trim(),
        homePhone: evTelefonu.trim(),
        workPhone: isTelefonu.trim(),
        addressType: adresTipi,
        city: sehir.trim() || 'İzmir',
        district: ilce.trim(),
        neighborhood: mahalle.trim(),
        street: sokak.trim(),
        doorNo: kapiNo.trim(),
        apartmentNo: daireNo.trim(),
        buildingName: apartmanAdi.trim(),
        blockName: blokAdi.trim(),
        siteName: siteAdi.trim(),
        address: birlesikAdres.trim(),
        referenceNote: referans.trim()
      };
    }

    onKaydetServis(
      yeniServis, 
      yeniCihazObj, 
      yeniBildirim, 
      yeniCariObj, 
      yeniStokObj, 
      guncellenenCariObj,
      editingServis ? editingServis.id : undefined
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border-0 sm:border border-slate-200 rounded-none sm:rounded-2xl w-full h-full sm:h-auto sm:max-h-[95vh] sm:max-w-6xl overflow-hidden shadow-2xl flex flex-col">
        
        {/* MODAL BAŞLIĞI */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className={`p-2 sm:p-2.5 rounded-xl border ${
              isCreateEmpty 
                ? 'bg-amber-50 text-amber-600 border-amber-200'
                : 'bg-indigo-50 text-indigo-600 border-indigo-200' 
            }`}>
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight font-sans">
                  {editingServis ? 'Servis Kaydını Düzenle / Güncelle' : 'Yeni Servis Kaydı Oluştur'}
                </h2>
                {editingServis && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-indigo-50 text-indigo-800 border-indigo-200">
                    {editingServis.servisNo} (Düzenleme Modu)
                  </span>
                )}
              </div>
              {editingServis && (
                <p className="text-xs text-slate-500 mt-0.5">
                  {editingServis.servisNo} numaralı servis fişinin müşteri, cihaz, arıza ve randevu bilgilerini güncelleyin.
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FORM GÖVDESİ */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="overflow-y-auto p-4 sm:p-6 space-y-5 flex-1 scrollbar-thin scrollbar-thumb-slate-300">
            
            {/* MÜKERRER KAYIT UYARI BANNERI */}
            {secilenCihazId && !editingServis && servisler && servisler.some(s => s.cihazId === secilenCihazId && (s.durum === 'RANDEVU_PLANLANDI' || s.durum === 'YOLDA_SAHADA' || s.durum === 'BEKLEMEDE')) && (
              <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-300 flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2.5 text-xs text-amber-900">
                  <div className="p-1 rounded-lg bg-amber-100 text-amber-700 shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold">Mevcut Açık Servis Fişi Bulunmaktadır: </span>
                    <span>
                      Bu cihaza ait hali hazırda <strong>{servisler.find(s => s.cihazId === secilenCihazId && (s.durum === 'RANDEVU_PLANLANDI' || s.durum === 'YOLDA_SAHADA' || s.durum === 'BEKLEMEDE'))?.servisNo}</strong> nolu açık bir iş emri bulunmaktadır. Tekrar kaydettiğinizde mükerrer oluşmaması için mevcut fiş güncellenecektir.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* İKİ KOLONLU AKILLI SAYFA YERLEŞİMİ                            */}
            {/* ============================================================= */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
              
              {/* SOL KOLON: MÜŞTERİ (CARİ) & CİHAZ BİLGİLERİ */}
              <div className="space-y-4">
                
                {/* 1. BÖLÜM: CARİ & İLETİŞİM BİLGİLERİ */}
                <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-3.5 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-[12px] font-semibold text-slate-800 font-sans">
                          Cari & İletişim Bilgileri
                        </h3>
                        <p className="text-[10px] text-slate-500">
                          {cariModu === 'KAYITLI' ? 'Kayıtlı cari hesaptan otomatik aktarılır' : 'Yeni müşteri kaydı oluşturulur'}
                        </p>
                      </div>
                    </div>

                    {/* Kayıtlı Müşteri vs Yeni Cari Butonları */}
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <div className="flex items-center bg-white p-0.5 rounded-xl border border-slate-200 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => {
                            setCariModu('KAYITLI');
                            setIsEditCariDetailsOpen(false);
                            if (cariler.length > 0) {
                              const activeCari = cariler.find(c => c.id === selectedCariId) || cariler[0];
                              const cariDevs = cihazlar.filter(d => d.cariId === (activeCari?.id || ''));
                              if (activeCari) populateForm(activeCari, cariDevs.length > 0 ? cariDevs[0] : null);
                            }
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            cariModu === 'KAYITLI'
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          Kayıtlı Cari
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCariModu('YENI');
                            setIsEditCariDetailsOpen(false);
                            setCariUnvan('');
                            setYetkiliKisi('');
                            setCepTelefonu('');
                            setCepTelefonu2('');
                            setEvTelefonu('');
                            setIsTelefonu('');
                            setCityId(35);
                            setSehir('İzmir');
                            setIlce('Bornova');
                            setMahalle('Zafer Mah.');
                            setSokak('');
                            setKapiNo('');
                            setDaireNo('');
                            setApartmanAdi('');
                            setBlokAdi('');
                            setSiteAdi('');
                            setBirlesikAdres('');
                            setReferans('');
                            setManuelAdresDegistirildi(false);
                            setSecilenCihazId('');
                            setCihazSecimModu('URUNLER_TABLOSU');
                            setEnvantereKaydet(true);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                            cariModu === 'YENI'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <Plus className="w-3 h-3" />
                          Yeni Cari
                        </button>
                      </div>

                      {/* ŞUBE ROZET ALANI (Kayıtlı Cari Modunda - Sadece Şube Adını Gösteren Rozet) */}
                      {cariModu === 'KAYITLI' && (
                        <span className="px-2.5 py-1 text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg h-[26px] flex items-center justify-center gap-1 leading-none shadow-3xs">
                          <Building2 className="w-3 h-3 text-indigo-500" />
                          {branches.find(b => b.id === (cariler.find(c => c.id === selectedCariId)?.branchId || selectedBranchId))?.name || 'Merkez Şube'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* EĞER KAYITLI CARİ İSE: ARAMA + AKILLI ÖZET KARTI */}
                  {cariModu === 'KAYITLI' && (
                    <div className="space-y-3">
                      {/* Cari Arama & Seçim */}
                      <div className="grid grid-cols-1 gap-2.5">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Cari Ünvan, Yetkili, Tel ara..."
                            value={cariArama}
                            onChange={e => setCariArama(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-2 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none shadow-sm"
                          />
                        </div>
                        <select
                          value={selectedCariId}
                          onChange={e => handleCariSelectChange(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2.5 text-xs text-slate-800 font-medium focus:border-indigo-500 focus:outline-none cursor-pointer shadow-sm"
                        >
                          <option value="">Cari Seçiniz...</option>
                          {filtrelenenCariler.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.title} ({c.district || c.city || 'İzmir'})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* AKILLI CARİ ÖZET BİLGİ KARTI - TEK BİRLEŞİK KART (İÇ KUTU KALDIRILDI) */}
                      <div className="space-y-4 pt-1">
                        {/* Üst Kısım: Ünvan, Yetkili, Telefonlar ve Sağda Düzenle Butonu */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-2 flex-1 min-w-0">
                            {/* Cari Ünvan */}
                            <div className="text-xs font-bold text-slate-900 leading-snug">
                              {cariUnvan || 'Cari Seçilmedi'}
                            </div>
 
                            {/* Yetkili & Telefonlar */}
                            <div className="space-y-1">
                              {yetkiliKisi && (
                                <div className="flex items-center gap-1 text-slate-700 font-medium text-xs">
                                  <User className="w-3.5 h-3.5 text-slate-500" />
                                  <span>{yetkiliKisi}</span>
                                </div>
                              )}
                              
                              <div className="flex flex-col sm:flex-row sm:items-center gap-x-3.5 gap-y-1 pt-0.5">
                                {/* En Az İki Telefon: 1. Telefon */}
                                {cepTelefonu && (
                                  <span className="flex items-center gap-1 font-mono text-emerald-800 text-xs font-semibold">
                                    <Phone className="w-3 h-3 text-emerald-600" />
                                    <span className="text-[10px] text-emerald-600 font-sans font-medium">Cep</span>
                                    {formatPhoneDisplay(cepTelefonu)}
                                  </span>
                                )}
                                {/* En Az İki Telefon: 2. Telefon */}
                                {(cepTelefonu2 || isTelefonu || evTelefonu) && (
                                  <span className="flex items-center gap-1 font-mono text-blue-800 text-xs font-semibold">
                                    <Phone className="w-3 h-3 text-blue-600" />
                                    <span className="text-[10px] text-blue-600 font-sans font-medium">Cep</span>
                                    {formatPhoneDisplay(cepTelefonu2 || isTelefonu || evTelefonu)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
 
                          {/* Sağ Üst: Düzenle Butonu */}
                          <button
                            type="button"
                            onClick={() => setIsEditCariDetailsOpen(!isEditCariDetailsOpen)}
                            className={`px-2.5 py-1 text-xs rounded-lg border font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all shrink-0 w-[105px] h-[28px] ${
                              isEditCariDetailsOpen
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                : 'text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border-indigo-200'
                            }`}
                            title="Müşterinin telefon veya adres bilgilerini bu servis için düzenle"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            {isEditCariDetailsOpen ? 'Kapat' : 'Düzenle'}
                          </button>
                        </div>
 
                        {/* Alt Kısım: Adres Satırı ve Sağda Adres Seç Açılır Kutusu (Aynı Hizada) */}
                        <div className="text-xs text-slate-600 leading-relaxed font-sans pt-2 border-t border-slate-200/80 font-medium flex items-start justify-between gap-4">
                          {/* Sol: Adres Metni */}
                          <div className="flex items-start gap-1 flex-1 min-w-0">
                            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                            <span>{birlesikAdres || 'Adres bilgisi bulunamadı'}</span>
                          </div>
 
                          {/* Sağ: Düzenle Butonu ile Dikey Aynı Hizada Adres Seç Dropdownu */}
                          {mevcutCariAdresleri.length > 1 && (
                            <select
                              value={secilenAdresId}
                              onChange={e => handleAdresSecimi(e.target.value)}
                              className="px-2.5 py-1 text-[11px] rounded-lg border border-indigo-200 text-indigo-600 font-semibold cursor-pointer transition-all hover:bg-indigo-50 outline-none w-[105px] h-[28px] bg-white leading-none text-center shrink-0"
                            >
                              <option value="" disabled>Adres Seç</option>
                              {mevcutCariAdresleri.map(addr => (
                                <option key={addr.id} value={addr.id}>
                                  {addr.title}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>

                      {/* EĞER DÜZENLEME BUTONUNA BASILDIYSA: DETAYLI DÜZENLEME FORMU */}
                      {isEditCariDetailsOpen && (
                        <div className="p-3.5 bg-indigo-50/40 border border-indigo-200 rounded-xl space-y-3 animate-in fade-in duration-150">
                          <div className="text-xs font-bold text-indigo-950 flex items-center justify-between pb-2 border-b border-indigo-100">
                            <span className="flex items-center gap-1.5">
                              <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                              Müşteri & Adres Bilgilerini Düzenle
                            </span>
                            <button
                              type="button"
                              onClick={() => setIsEditCariDetailsOpen(false)}
                              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
                            >
                              Kapat
                            </button>
                          </div>

                          {/* Cari Unvan & Yetkili */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                              <label className="text-[11px] text-slate-700 font-bold block mb-1">
                                Cari Unvan (Ad / Firma) *
                              </label>
                              <input
                                type="text"
                                required
                                placeholder="Örn: Ege Su Ltd. veya Ahmet Yılmaz"
                                value={cariUnvan}
                                onChange={e => setCariUnvan(e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] text-slate-600 font-semibold block mb-1">
                                Yetkili Kişi
                              </label>
                              <input
                                type="text"
                                placeholder="Örn: Mehmet Bey"
                                value={yetkiliKisi}
                                onChange={e => setYetkiliKisi(e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                              />
                            </div>
                          </div>

                          {/* Cep Telefonu & + Ek Telefon Ekle */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[11px] text-slate-700 font-bold flex items-center gap-1">
                                <Phone className="w-3 h-3 text-emerald-600" /> Cep Telefonu *
                              </label>
                              <button
                                type="button"
                                onClick={() => setIsExtraPhonesOpen(!isExtraPhonesOpen)}
                                className="text-[10px] text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-0.5 cursor-pointer"
                              >
                                {isExtraPhonesOpen ? '- Ek Telefonları Gizle' : '+ Ek Telefon Ekle'}
                              </button>
                            </div>
                            <input
                              type="tel"
                              inputMode="tel"
                              maxLength={19}
                              required
                              placeholder="+90 (5XX) XXX XX XX"
                              value={cepTelefonu}
                              onFocus={() => {
                                if (!cepTelefonu || cepTelefonu.trim() === '') {
                                  setCepTelefonu('+90');
                                }
                              }}
                              onChange={e => setCepTelefonu(formatPhoneNumber(e.target.value))}
                              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none font-mono"
                            />
                          </div>

                          {/* Ek Telefonlar (Katlanabilir) */}
                          {isExtraPhonesOpen && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2.5 bg-slate-100/80 rounded-lg border border-slate-200">
                              <div>
                                <label className="text-[10px] text-slate-600 font-semibold block mb-0.5">Cep Telefonu 2</label>
                                <input
                                  type="tel"
                                  inputMode="tel"
                                  maxLength={19}
                                  placeholder="+90 (5XX) XXX XX XX"
                                  value={cepTelefonu2}
                                  onFocus={() => {
                                    if (!cepTelefonu2 || cepTelefonu2.trim() === '') {
                                      setCepTelefonu2('+90');
                                    }
                                  }}
                                  onChange={e => setCepTelefonu2(formatPhoneNumber(e.target.value))}
                                  className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none font-mono"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-600 font-semibold block mb-0.5">Ev Telefonu</label>
                                <input
                                  type="tel"
                                  inputMode="tel"
                                  maxLength={19}
                                  placeholder="+90 (2XX) XXX XX XX"
                                  value={evTelefonu}
                                  onFocus={() => {
                                    if (!evTelefonu || evTelefonu.trim() === '') {
                                      setEvTelefonu('+90');
                                    }
                                  }}
                                  onChange={e => setEvTelefonu(formatPhoneNumber(e.target.value))}
                                  className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none font-mono"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-600 font-semibold block mb-0.5">İş Telefonu</label>
                                <input
                                  type="tel"
                                  inputMode="tel"
                                  maxLength={19}
                                  placeholder="+90 (2XX) XXX XX XX"
                                  value={isTelefonu}
                                  onFocus={() => {
                                    if (!isTelefonu || isTelefonu.trim() === '') {
                                      setIsTelefonu('+90');
                                    }
                                  }}
                                  onChange={e => setIsTelefonu(formatPhoneNumber(e.target.value))}
                                  className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none font-mono"
                                />
                              </div>
                            </div>
                          )}

                          {/* Adres Tipi, Şehir, İlçe, Mahalle */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                            <div>
                              <div className="flex items-center justify-between mb-0.5">
                                <label className="text-[10px] text-slate-600 font-semibold uppercase tracking-wider">Adres Tipi</label>
                                <button
                                  type="button"
                                  onClick={() => setIsManageAddressOpen(true)}
                                  className="text-[9px] text-indigo-600 hover:underline"
                                  title="Adres Tiplerini Yönet"
                                >
                                  Yönet
                                </button>
                              </div>
                              <select
                                value={adresTipi}
                                onChange={e => handleAdresTipiChange(e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-800 focus:outline-none cursor-pointer"
                              >
                                {birlesikAdresTipleri.map(t => (
                                  <option key={t} value={t}>{t}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-600 font-semibold uppercase tracking-wider block mb-0.5">Şehir *</label>
                              <select
                                value={cityId}
                                onChange={e => handleCityChange(Number(e.target.value))}
                                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-800 focus:outline-none cursor-pointer"
                              >
                                {citiesList.map(c => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-600 font-semibold uppercase tracking-wider block mb-0.5">İlçe *</label>
                              <select
                                value={ilce}
                                onChange={e => handleDistrictChange(e.target.value)}
                                disabled={!cityId || districtsList.length === 0}
                                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-800 focus:outline-none cursor-pointer disabled:opacity-50"
                              >
                                <option value="">İlçe Seçiniz...</option>
                                {districtsList.map(d => (
                                  <option key={d} value={d}>{d}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-600 font-semibold uppercase tracking-wider block mb-0.5">Mahalle</label>
                              <select
                                value={mahalle}
                                onChange={e => handleNeighborhoodChange(e.target.value)}
                                disabled={!ilce || neighborhoodsList.length === 0}
                                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-800 focus:outline-none cursor-pointer disabled:opacity-50"
                              >
                                <option value="">{ilce ? (neighborhoodsList.length > 0 ? 'Mahalle Seçiniz...' : 'Mahalle Bulunamadı') : 'Önce İlçe Seçiniz...'}</option>
                                {mahalle && !neighborhoodsList.includes(mahalle) && (
                                  <option value={mahalle}>{mahalle}</option>
                                )}
                                {neighborhoodsList.map(n => (
                                  <option key={n} value={n}>{n}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Açık Adres / Cadde & Sokak * */}
                          <div>
                            <label className="text-[11px] text-slate-700 font-bold block mb-1">
                              Açık Adres / Cadde & Sokak *
                            </label>
                            <input
                              type="text"
                              required
                              value={sokak}
                              onChange={e => {
                                setSokak(e.target.value);
                                setManuelAdresDegistirildi(false);
                              }}
                              placeholder="Örn: 2040 Sokak No: 12 D: 4, Kazımdirik Mah."
                              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                            />
                          </div>

                          {/* Detaylı Adres Alanlarını Göster / Gizle */}
                          <div>
                            <button
                              type="button"
                              onClick={() => setIsDetailedAddressOpen(!isDetailedAddressOpen)}
                              className="text-[11px] text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1.5 cursor-pointer py-1"
                            >
                              {isDetailedAddressOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                              <span>{isDetailedAddressOpen ? 'Detaylı Adres Alanlarını Gizle' : '+ Bina, Kapı, Daire, Site & Referans Ekle'}</span>
                            </button>

                            {isDetailedAddressOpen && (
                              <div className="mt-1.5 p-2.5 bg-slate-100/70 border border-slate-200 rounded-xl space-y-2 animate-in fade-in duration-150">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                  <div>
                                    <label className="text-[10px] text-slate-500 block mb-0.5">Kapı No</label>
                                    <input
                                      type="text"
                                      value={kapiNo}
                                      onChange={e => {
                                        setKapiNo(e.target.value);
                                        setManuelAdresDegistirildi(false);
                                      }}
                                      placeholder="No: 15"
                                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-slate-500 block mb-0.5">Daire No</label>
                                    <input
                                      type="text"
                                      value={daireNo}
                                      onChange={e => {
                                        setDaireNo(e.target.value);
                                        setManuelAdresDegistirildi(false);
                                      }}
                                      placeholder="D: 4"
                                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-slate-500 block mb-0.5">Apartman</label>
                                    <input
                                      type="text"
                                      value={apartmanAdi}
                                      onChange={e => {
                                        setApartmanAdi(e.target.value);
                                        setManuelAdresDegistirildi(false);
                                      }}
                                      placeholder="Yıldız Apt."
                                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-slate-500 block mb-0.5">Blok / Site</label>
                                    <input
                                      type="text"
                                      value={blokAdi || siteAdi}
                                      onChange={e => {
                                        setBlokAdi(e.target.value);
                                        setSiteAdi(e.target.value);
                                        setManuelAdresDegistirildi(false);
                                      }}
                                      placeholder="A Blok / Park Sit."
                                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="text-[10px] text-slate-500 block mb-0.5">Referans / Yönlendiren Notu</label>
                                  <input
                                    type="text"
                                    value={referans}
                                    onChange={e => setReferans(e.target.value)}
                                    placeholder="Örn: Komşu tavsiyesi, Servis Kartı, Ahmet Usta"
                                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none"
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Birleştirilmiş Resmi Adres (Google Haritalar Uyumlu) */}
                          <div className="pt-2 border-t border-indigo-100 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                                Birleştirilmiş Resmi Adres (Google Haritalar Uyumlu)
                              </label>
                              <div className="flex items-center gap-2">
                                {birlesikAdres && (
                                  <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(birlesikAdres)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1 shadow-2xs"
                                  >
                                    <Navigation className="w-2.5 h-2.5" /> Haritada Aç
                                  </a>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setManuelAdresDegistirildi(false);
                                    const full = computeFullAddress({
                                      mahalle,
                                      sokak,
                                      siteAdi,
                                      apartmanAdi,
                                      blokAdi,
                                      kapiNo,
                                      daireNo,
                                      ilce,
                                      sehir
                                    });
                                    if (full) setBirlesikAdres(full);
                                  }}
                                  className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 cursor-pointer"
                                >
                                  <RotateCw className="w-3 h-3" /> Otomatik Yenile
                                </button>
                              </div>
                            </div>
                            <textarea
                              rows={2}
                              value={birlesikAdres}
                              onChange={e => {
                                setBirlesikAdres(e.target.value);
                                setManuelAdresDegistirildi(true);
                              }}
                              placeholder="Zafer Mah. 2040 Sokak No: 15 D: 4 Bornova / İzmir"
                              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-sans text-slate-800 resize-none focus:outline-none focus:border-indigo-500 leading-relaxed"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* EĞER YENİ CARİ İSE: YENİ MÜŞTERİ FORMU */}
                  {cariModu === 'YENI' && (
                    <div className="space-y-3">
                      <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-[11px] text-emerald-800">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Yeni müşteri otomatik olarak <strong>Cari Hesaplar & Yönetimi</strong> modülüne eklenecektir.</span>
                      </div>

                      {/* Şube Seçimi */}
                      <div>
                        <label className="text-[11px] text-slate-700 font-bold block mb-1">
                          Şube Seç *
                        </label>
                        <select
                          value={selectedBranchId}
                          onChange={e => setSelectedBranchId(e.target.value)}
                          required
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none cursor-pointer"
                        >
                          <option value="" disabled>-- Şube Seçiniz --</option>
                          {branches.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Cari Unvan & Yetkili */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="text-[11px] text-slate-700 font-bold block mb-1">
                            Cari Unvan (Ad / Firma) *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Örn: Ege Su Ltd. veya Ahmet Yılmaz"
                            value={cariUnvan}
                            onChange={e => setCariUnvan(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-600 font-semibold block mb-1">
                            Yetkili Kişi
                          </label>
                          <input
                            type="text"
                            placeholder="Örn: Mehmet Bey"
                            value={yetkiliKisi}
                            onChange={e => setYetkiliKisi(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Cep Telefonu & Ek Telefon Butonu */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] text-slate-700 font-bold flex items-center gap-1">
                            <Phone className="w-3 h-3 text-emerald-600" /> Cep Telefonu *
                          </label>
                          <button
                            type="button"
                            onClick={() => setIsExtraPhonesOpen(!isExtraPhonesOpen)}
                            className="text-[10px] text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-0.5 cursor-pointer"
                          >
                            {isExtraPhonesOpen ? '- Ek Telefonları Gizle' : '+ Ek Telefon Ekle'}
                          </button>
                        </div>
                        <input
                          type="tel"
                          inputMode="tel"
                          maxLength={19}
                          required
                          placeholder="+90 (5XX) XXX XX XX"
                          value={cepTelefonu}
                          onFocus={() => {
                            if (!cepTelefonu || cepTelefonu.trim() === '') {
                              setCepTelefonu('+90');
                            }
                          }}
                          onChange={e => setCepTelefonu(formatPhoneNumber(e.target.value))}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none font-mono"
                        />
                      </div>

                      {/* Ek Telefonlar (Katlanabilir) */}
                      {isExtraPhonesOpen && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2.5 bg-slate-100/80 rounded-lg border border-slate-200">
                          <div>
                            <label className="text-[10px] text-slate-600 font-semibold block mb-0.5">Cep Telefonu 2</label>
                            <input
                              type="tel"
                              inputMode="tel"
                              maxLength={19}
                              placeholder="+90 (5XX) XXX XX XX"
                              value={cepTelefonu2}
                              onFocus={() => {
                                if (!cepTelefonu2 || cepTelefonu2.trim() === '') {
                                  setCepTelefonu2('+90');
                                }
                              }}
                              onChange={e => setCepTelefonu2(formatPhoneNumber(e.target.value))}
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-600 font-semibold block mb-0.5">Ev Telefonu</label>
                            <input
                              type="tel"
                              inputMode="tel"
                              maxLength={19}
                              placeholder="+90 (2XX) XXX XX XX"
                              value={evTelefonu}
                              onFocus={() => {
                                if (!evTelefonu || evTelefonu.trim() === '') {
                                  setEvTelefonu('+90');
                                }
                              }}
                              onChange={e => setEvTelefonu(formatPhoneNumber(e.target.value))}
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-600 font-semibold block mb-0.5">İş Telefonu</label>
                            <input
                              type="tel"
                              inputMode="tel"
                              maxLength={19}
                              placeholder="+90 (2XX) XXX XX XX"
                              value={isTelefonu}
                              onFocus={() => {
                                if (!isTelefonu || isTelefonu.trim() === '') {
                                  setIsTelefonu('+90');
                                }
                              }}
                              onChange={e => setIsTelefonu(formatPhoneNumber(e.target.value))}
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none font-mono"
                            />
                          </div>
                        </div>
                      )}

                      {/* Adres: Tipi, Şehir, İlçe, Mahalle */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div>
                          <div className="flex items-center justify-between mb-0.5">
                            <label className="text-[10px] text-slate-600 font-semibold">Adres Tipi</label>
                            <button
                              type="button"
                              onClick={() => setIsManageAddressOpen(true)}
                              className="text-[9px] text-indigo-600 hover:underline"
                              title="Adres Tiplerini Yönet"
                            >
                              Yönet
                            </button>
                          </div>
                          <select
                            value={adresTipi}
                            onChange={e => handleAdresTipiChange(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-800 focus:outline-none cursor-pointer"
                          >
                            {birlesikAdresTipleri.map(t => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-600 font-semibold block mb-0.5">Şehir *</label>
                          <select
                            value={cityId}
                            onChange={e => handleCityChange(Number(e.target.value))}
                            className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-800 focus:outline-none cursor-pointer"
                          >
                            {citiesList.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-600 font-semibold block mb-0.5">İlçe *</label>
                          <select
                            value={ilce}
                            onChange={e => handleDistrictChange(e.target.value)}
                            disabled={!cityId || districtsList.length === 0}
                            className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-800 focus:outline-none cursor-pointer disabled:opacity-50"
                          >
                            <option value="">İlçe Seçiniz...</option>
                            {districtsList.map(d => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-600 font-semibold block mb-0.5">Mahalle</label>
                          <select
                            value={mahalle}
                            onChange={e => handleNeighborhoodChange(e.target.value)}
                            disabled={!ilce || neighborhoodsList.length === 0}
                            className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-800 focus:outline-none cursor-pointer disabled:opacity-50"
                          >
                            <option value="">{ilce ? (neighborhoodsList.length > 0 ? 'Mahalle Seçiniz...' : 'Mahalle Bulunamadı') : 'Önce İlçe Seçiniz...'}</option>
                            {mahalle && !neighborhoodsList.includes(mahalle) && (
                              <option value={mahalle}>{mahalle}</option>
                            )}
                            {neighborhoodsList.map(n => (
                              <option key={n} value={n}>{n}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Sokak / Açık Adres */}
                      <div>
                        <label className="text-[11px] text-slate-700 font-bold block mb-1">
                          Açık Adres / Cadde & Sokak *
                        </label>
                        <input
                          type="text"
                          required
                          value={sokak}
                          onChange={e => {
                            setSokak(e.target.value);
                            setManuelAdresDegistirildi(false);
                          }}
                          placeholder="Örn: 2040 Sokak No: 12 D: 4, Kazımdirik Mah."
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                        />
                      </div>

                      {/* Katlanabilir Detaylı Kapı / Daire / Bina / Site Bilgileri */}
                      <div>
                        <button
                          type="button"
                          onClick={() => setIsDetailedAddressOpen(!isDetailedAddressOpen)}
                          className="text-[11px] text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1.5 cursor-pointer py-1"
                        >
                          {isDetailedAddressOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                          <span>{isDetailedAddressOpen ? 'Detaylı Adres Alanlarını Gizle' : '+ Bina, Kapı, Daire, Site & Referans Ekle'}</span>
                        </button>

                        {isDetailedAddressOpen && (
                          <div className="mt-1.5 p-2.5 bg-slate-100/70 border border-slate-200 rounded-xl space-y-2 animate-in fade-in duration-150">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                              <div>
                                <label className="text-[10px] text-slate-500 font-medium uppercase tracking-tight block mb-0.5">Kapı No</label>
                                <input
                                  type="text"
                                  value={kapiNo}
                                  onChange={e => {
                                    setKapiNo(e.target.value);
                                    setManuelAdresDegistirildi(false);
                                  }}
                                  placeholder="No: 15"
                                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-500 font-medium uppercase tracking-tight block mb-0.5">Daire No</label>
                                <input
                                  type="text"
                                  value={daireNo}
                                  onChange={e => {
                                    setDaireNo(e.target.value);
                                    setManuelAdresDegistirildi(false);
                                  }}
                                  placeholder="D: 4"
                                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-500 font-medium uppercase tracking-tight block mb-0.5">Apartman</label>
                                <input
                                  type="text"
                                  value={apartmanAdi}
                                  onChange={e => {
                                    setApartmanAdi(e.target.value);
                                    setManuelAdresDegistirildi(false);
                                  }}
                                  placeholder="Yıldız Apt."
                                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-500 font-medium uppercase tracking-tight block mb-0.5">Blok / Site</label>
                                <input
                                  type="text"
                                  value={blokAdi || siteAdi}
                                  onChange={e => {
                                    setBlokAdi(e.target.value);
                                    setSiteAdi(e.target.value);
                                    setManuelAdresDegistirildi(false);
                                  }}
                                  placeholder="A Blok / Park Sit."
                                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-500 block mb-0.5">Referans / Yönlendiren Notu</label>
                              <input
                                type="text"
                                value={referans}
                                onChange={e => setReferans(e.target.value)}
                                placeholder="Örn: Komşu tavsiyesi, Servis Kartı, Ahmet Usta"
                                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Birleştirilmiş Resmi Adres (Google Haritalar Uyumlu) */}
                      <div className="pt-2 border-t border-emerald-100 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-rose-500" />
                            Birleştirilmiş Resmi Adres (Google Haritalar Uyumlu)
                          </label>
                          <div className="flex items-center gap-2">
                            {birlesikAdres && (
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(birlesikAdres)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1 shadow-2xs"
                              >
                                <Navigation className="w-2.5 h-2.5" /> Haritada Aç
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setManuelAdresDegistirildi(false);
                                const full = computeFullAddress({
                                  mahalle,
                                  sokak,
                                  siteAdi,
                                  apartmanAdi,
                                  blokAdi,
                                  kapiNo,
                                  daireNo,
                                  ilce,
                                  sehir
                                });
                                if (full) setBirlesikAdres(full);
                              }}
                              className="text-[10px] text-emerald-600 hover:text-emerald-800 font-medium flex items-center gap-1 cursor-pointer"
                            >
                              <RotateCw className="w-3 h-3" /> Otomatik Yenile
                            </button>
                          </div>
                        </div>
                        <textarea
                          rows={2}
                          value={birlesikAdres}
                          onChange={e => {
                            setBirlesikAdres(e.target.value);
                            setManuelAdresDegistirildi(true);
                          }}
                          placeholder="Zafer Mah. 2040 Sokak No: 15 D: 4 Bornova / İzmir"
                          className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-sans text-slate-800 resize-none focus:outline-none focus:border-emerald-500 leading-relaxed"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. BÖLÜM: CİHAZ BİLGİSİ */}
                <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-3.5 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
                        <Cpu className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-[12px] font-semibold text-slate-800 font-sans">
                          Cihaz & Model Bilgisi
                        </h3>
                        <p className="text-[10px] text-slate-500">
                          Bakımı yapılacak veya arızalı su arıtma sistemi
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* CİHAZ SEÇİM BAŞLIĞI VE EKLE/YÖNET BUTONU */}
                  <div className="space-y-1.5 pb-2 border-b border-slate-200/50">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-700 block text-left">
                        Kayıtlı Cihaz ({cariCihazlari.length})
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddDeviceForm(!showAddDeviceForm);
                          // Initialize values
                          if (mevcutCariAdresleri.length > 0) {
                            setNewDeviceAddressId(mevcutCariAdresleri[0].id);
                          }
                          if (localStoklar.length > 0) {
                            setNewDeviceProductId(localStoklar[0].id);
                          }
                        }}
                        className="text-[11px] text-amber-600 hover:text-amber-700 flex items-center gap-1 hover:underline cursor-pointer font-bold shrink-0 bg-amber-50 hover:bg-amber-100/80 border border-amber-200/60 px-2 py-0.5 rounded transition-colors"
                      >
                        + Cihaz Ekle / Yönet
                      </button>
                    </div>

                    {cariCihazlari.length > 0 ? (
                      <select
                        value={cihazSecimModu === 'KAYITLI_CIHAZ' ? secilenCihazId : ''}
                        onChange={e => {
                          setCihazSecimModu('KAYITLI_CIHAZ');
                          handleCihazSelectChange(e.target.value);
                        }}
                        className="w-full bg-white border border-indigo-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:border-indigo-500 focus:outline-none cursor-pointer"
                      >
                        <option value="" disabled={cihazSecimModu === 'KAYITLI_CIHAZ'}>
                          {cihazSecimModu === 'KAYITLI_CIHAZ' ? '-- Cihaz Seçiniz --' : '-- Kayıtlı Cihazlardan Birini Seç --'}
                        </option>
                        {cariCihazlari.map(d => (
                          <option key={d.id} value={d.id}>
                            {d.cihazAdi} {d.seriNo ? `(SN: ${d.seriNo})` : ''} — [{d.adresTipi || 'Merkez'}] ({d.il}/{d.ilce})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-xs text-slate-500 bg-slate-100 p-2.5 rounded-xl text-center italic">
                        Müşterinin kayıtlı cihazı bulunmuyor. Lütfen sağ üstteki "+ Cihaz Ekle / Yönet" butonu ile yeni cihaz kaydedin.
                      </div>
                    )}

                    {/* Seçili Cihaz Akıllı Bilgi Kartı (İç Kutu Kaldırıldı) */}
                    {cihazSecimModu === 'KAYITLI_CIHAZ' && secilenCihazId && (
                      <div className="flex items-center justify-between gap-3 pt-2">
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <Cpu className="w-3.5 h-3.5 text-slate-500" />
                            <span>{cihazAdi}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2">
                            <span>Marka: <strong className="text-slate-700">{markaModel}</strong></span>
                            {seriNo && <span>• SN: <strong className="text-slate-700 font-mono">{seriNo}</strong></span>}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] text-slate-500 block">Döngü</span>
                          <span className="text-xs font-bold text-indigo-700 font-mono">{bakimPeriyoduAy} Aylık</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* INLINE CİHAZ EKLEME VE MODEL YÖNETME PANELİ */}
                  {showAddDeviceForm && (
                    <div className="p-3 bg-amber-50/50 border border-amber-200/80 rounded-2xl space-y-3.5 shadow-2xs animate-in slide-in-from-top-2 duration-150">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs">
                          <Plus className="w-4 h-4" />
                          Müşteriye Yeni Cihaz Tanımla
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowAddDeviceForm(false)}
                          className="text-[10px] text-slate-400 hover:text-slate-600 bg-white rounded-full p-1 border border-slate-200/60 cursor-pointer"
                        >
                          Kapat
                        </button>
                      </div>

                      {/* CİHAZ MODELİ / ÜRÜN SEÇİMİ */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] text-slate-600 font-bold">Katalog Ürünü / Cihaz Modeli *</label>
                          <button
                            type="button"
                            onClick={() => setIsAddingNewProductInline(!isAddingNewProductInline)}
                            className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
                          >
                            {isAddingNewProductInline ? '← Listeden Seç' : '+ Yeni Ürün Ekle (Kataloğa)'}
                          </button>
                        </div>

                        {isAddingNewProductInline ? (
                          <div className="p-2.5 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2.5">
                            <div className="text-[10px] text-indigo-950 font-bold flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                              Kataloğa Yeni Cihaz Modeli Tanımla
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[9px] text-slate-500 block">Ürün / Model Adı *</label>
                                <input
                                  type="text"
                                  placeholder="Örn: Gold 5-Aşamalı RO"
                                  value={newProductName}
                                  onChange={e => setNewProductName(e.target.value)}
                                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800 focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] text-slate-500 block">Marka *</label>
                                <select
                                  value={newProductBrand}
                                  onChange={e => setNewProductBrand(e.target.value)}
                                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800 focus:outline-none cursor-pointer"
                                >
                                  {brandTypes.map(b => (
                                    <option key={b} value={b}>{b}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <select
                            value={newDeviceProductId}
                            onChange={e => {
                              if (e.target.value === 'NEW_PRODUCT_OPTION') {
                                setIsAddingNewProductInline(true);
                              } else {
                                setNewDeviceProductId(e.target.value);
                              }
                            }}
                            className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none cursor-pointer"
                          >
                            <option value="">-- Kataloktan Ürün Seçiniz --</option>
                            {localStoklar.map(s => (
                              <option key={s.id} value={s.id}>
                                {s.name} ({s.brand || 'Filtrex'})
                              </option>
                            ))}
                            <option value="NEW_PRODUCT_OPTION" className="text-amber-600 font-bold bg-amber-50">
                              + Ürünlerde Yoksa: Yeni Ürün Ekle (Kataloğa) ...
                            </option>
                          </select>
                        )}
                      </div>

                      {/* DETAY ALANLARI: SERİ NO & BAKIM DÖNGÜSÜ */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-600 font-bold block mb-0.5">Cihaz Seri No</label>
                          <input
                            type="text"
                            placeholder="SN-123456 (Boşsa Oto Üretilir)"
                            value={newDeviceSeriNo}
                            onChange={e => setNewDeviceSeriNo(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-600 font-bold block mb-0.5">Bakım Periyodu (Ay)</label>
                          <div className="relative flex items-center">
                            <input
                              type="number"
                              min={1}
                              max={120}
                              value={newDevicePeriod}
                              onChange={e => setNewDevicePeriod(Math.max(1, Number(e.target.value) || 1))}
                              placeholder="Örn: 6"
                              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-bold focus:outline-none focus:border-indigo-500 pr-10"
                            />
                            <span className="absolute right-2 text-[11px] font-semibold text-slate-400 pointer-events-none">
                              Ay
                            </span>
                          </div>
                        </div>
                      </div>



                      {/* ONALAYLAMA VE KAYDETME BUTONU */}
                      <button
                        type="button"
                        onClick={handleRegisterNewDeviceInline}
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Cihazı Müşteriye Kaydet ve Seç
                      </button>
                    </div>
                  )}
                </div>

              </div>
              {/* SOL KOLON BİTİŞİ */}

              {/* SAĞ KOLON: SERVİS TALEBİ & RANDEVU / SAHA TEKNİSYENİ */}
              <div className="space-y-4">
                
                {/* 3. BÖLÜM: SERVİS TALEBİ & ARIZA NOTU */}
                <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-3.5 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-100">
                        <Wrench className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-[12px] font-semibold text-slate-800 font-sans">
                          Servis Talebi & Arıza Notu
                        </h3>
                        <p className="text-[10px] text-slate-500">
                          Müşteri şikayeti veya talep edilen periyodik işlem
                        </p>
                      </div>
                    </div>

                    </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <label className="text-[11px] text-slate-700 font-bold sm:w-24 shrink-0">Servis Türü *</label>
                    <div className="flex-1 flex items-center gap-2">
                      <select
                        value={talepServisTuru}
                        onChange={e => setTalepServisTuru(e.target.value)}
                        className="flex-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:border-amber-500 focus:outline-none cursor-pointer"
                      >
                        {serviceTypes.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setIsManageServiceTypeOpen(true)}
                        className="text-[11px] text-amber-600 hover:text-amber-700 flex items-center gap-1 hover:underline cursor-pointer font-bold shrink-0 bg-amber-50 hover:bg-amber-100/80 border border-amber-200/60 px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        + Ekle / Yönet
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-700 font-bold block mb-1">
                      Bildirilen Arıza / Müşteri Şikayeti / Talep Notu *
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={bildirilenAriza}
                      onChange={e => setBildirilenAriza(e.target.value)}
                      placeholder="Müşterinin belirttiği arıza veya talep: Örn: Su tadı acılaştı, atık su kesilmiyor, 6 aylık periyodik filtre değişimi yapılacak..."
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* 4. BÖLÜM: SAHA TEKNİSYENİ & RANDEVU PLANI */}
                <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-3.5 shadow-xs">
                  <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2.5">
                    <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-[12px] font-semibold text-slate-800 font-sans">
                        Teknisyeni & Randevu Planı
                      </h3>
                      <p className="text-[10px] text-slate-500">
                        İş emri tarihi, randevu saati ve teknisyen ataması
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-700 font-bold block mb-1">Randevu Tarihi *</label>
                      <input
                        type="date"
                        required
                        value={randevuTarihi}
                        onChange={e => setRandevuTarihi(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none shadow-sm"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-700 font-bold block mb-1">Randevu Saati *</label>
                      <input
                        type="time"
                        required
                        value={randevuSaati}
                        onChange={e => setRandevuSaati(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none shadow-sm"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-700 font-bold block mb-1">Gidecek Teknisyen *</label>
                      <select
                        value={atananTeknisyenId}
                        onChange={e => setAtananTeknisyenId(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none cursor-pointer shadow-sm"
                        required
                      >
                        <option value="">Teknisyen Seçiniz...</option>
                        {teknisyenListesi.map(t => {
                          const tName = getPersonelName(t);
                          const isCaner = tName.toLowerCase().includes('caner');
                          return (
                            <option key={t.id} value={t.id}>
                              {tName} ({isCaner ? '35 FLT 101' : '35 FLT 202'})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>

                  {/* WhatsApp Bildirim Onayı */}
                  <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={whatsappBildirimiOlustur}
                        onChange={e => setWhatsappBildirimiOlustur(e.target.checked)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 bg-white cursor-pointer"
                      />
                      <span className="text-[11px] text-slate-700">
                        Müşteriye Randevu Bilgisi İçin <strong className="text-emerald-700">WhatsApp Bildirimi</strong> Gönderilsin
                      </span>
                    </label>
                  </div>
                </div>

                {/* 5. BÖLÜM: İŞ EMRİ HIZLI KONTROL ÖZETİ */}
                <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex items-center justify-between gap-3 text-[11px]">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shrink-0">
                      <Check className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">
                        {talepServisTuru.split('(')[0].trim()} • {randevuTarihi} ({randevuSaati})
                      </div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[280px]">
                        {cariUnvan ? `${cariUnvan}` : 'Cari Seçilmedi'} — Teknisyen: {getPersonelName(teknisyenListesi.find(t => t.id === atananTeknisyenId) || defaultTeknisyen)}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-700 bg-white border border-indigo-200 px-2 py-1 rounded-md shrink-0 shadow-2xs">
                    Otomatik İş Emri
                  </span>
                </div>

              </div>
              {/* SAĞ KOLON BİTİŞİ */}

            </div>
            {/* İKİ KOLONLU DÜZEN BİTİŞİ */}

          </div>

          {/* SABİT FOOTER BUTONLARI */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="text-xs text-slate-500 hidden md:block">
              * ile işaretli alanların doldurulması zorunludur.
            </div>
            <div className="flex flex-col-reverse sm:flex-row items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-3 sm:py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                className={`w-full sm:w-auto px-6 py-3 sm:py-2.5 rounded-xl text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${
                  editingServis
                    ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                    : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                {editingServis ? 'Değişiklikleri Güncelle & Kaydet' : 'Servis Kaydını Oluştur (Sahaya İlet)'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* MODALLAR (EKLE / YÖNET) */}
      <ManageAddressTypesModal
        isOpen={isManageAddressOpen}
        onClose={() => setIsManageAddressOpen(false)}
      />

      <ManageBrandTypesModal
        isOpen={isManageBrandOpen}
        onClose={() => setIsManageBrandOpen(false)}
      />

      <ManageServiceTypesModal
        isOpen={isManageServiceTypeOpen}
        onClose={() => setIsManageServiceTypeOpen(false)}
      />

      <ManageDeviceModelTypesModal
        isOpen={isManageDeviceModelOpen}
        onClose={() => setIsManageDeviceModelOpen(false)}
      />
    </div>
  );
};

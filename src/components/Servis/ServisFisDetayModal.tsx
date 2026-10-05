import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Minus,
  Trash2, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Phone, 
  User, 
  Wrench, 
  Calendar, 
  Truck, 
  DollarSign, 
  Building2, 
  Wallet, 
  CreditCard,
  FileText, 
  Send, 
  MessageCircle, 
  AlertTriangle, 
  Receipt, 
  FileCheck, 
  Edit2, 
  Printer, 
  ShieldCheck, 
  PhoneCall, 
  Share2, 
  Check, 
  Sparkles,
  ExternalLink,
  Navigation,
  Copy,
  Layers,
  CheckCircle,
  Award,
  ChevronRight
} from 'lucide-react';
import { 
  ServisFisi, 
  ServisFisKalemi, 
  ServisOdemeTuru, 
  Stok, 
  KasaBanka, 
  Cari, 
  Personel 
} from '../../types';
import { getServiceTypeLabel } from '../../lib/serviceUtils';
import { ServisFisiYazdirModal } from './ServisFisiYazdirModal';

interface ServisFisDetayModalProps {
  isOpen: boolean;
  onClose: () => void;
  servis: ServisFisi;
  stoklar: Stok[];
  kasalar: KasaBanka[];
  cariler: Cari[];
  personeller: Personel[];
  currentUser?: Personel | null;
  onKapatServis: (servisId: string, closingData: {
    kalemler: ServisFisKalemi[];
    odemeTuru: ServisOdemeTuru;
    tahsilatTutari: number;
    kasaId?: string;
    teknisyenNotu?: string;
    musteriImza?: boolean;
  }) => void;
  onOpenEditServis?: (servis: ServisFisi) => void;
  onGonderMesaj?: (telefon: string, mesaj: string) => void;
}

export const ServisFisDetayModal: React.FC<ServisFisDetayModalProps> = ({
  isOpen,
  onClose,
  servis,
  stoklar,
  kasalar,
  cariler,
  personeller,
  currentUser,
  onKapatServis,
  onOpenEditServis,
  onGonderMesaj
}) => {
  if (!isOpen || !servis) return null;

  const isAlreadyClosed = servis.durum === 'TAMAMLANDI_KAPATILDI' || servis.durum === 'FATURALANDI';

  // State
  const [kalemler, setKalemler] = useState<ServisFisKalemi[]>(
    servis.kalemler && servis.kalemler.length > 0 
      ? servis.kalemler 
      : [
          {
            id: 'k-1',
            stokId: 'stk-001',
            stokKodu: 'STK-001',
            stokAdi: 'Sediment Filtre 5 Mikron Spun 10"',
            birim: 'Adet',
            miktar: 1,
            birimFiyat: 350,
            kdvOrani: 20,
            toplamTutar: 420
          },
          {
            id: 'k-2',
            stokId: 'stk-002',
            stokKodu: 'STK-002',
            stokAdi: 'Blok Karbon Filtre (CTO) 10"',
            birim: 'Adet',
            miktar: 1,
            birimFiyat: 450,
            kdvOrani: 20,
            toplamTutar: 540
          },
          {
            id: 'k-3',
            stokId: 'stk-009',
            stokKodu: 'SRV-ISC-01',
            stokAdi: 'Saha Periyodik Bakım & Montaj İşçilik Bedeli',
            birim: 'Hizmet',
            miktar: 1,
            birimFiyat: 1500,
            kdvOrani: 20,
            toplamTutar: 1800
          }
        ]
  );

  const [odemeTuru, setOdemeTuru] = useState<ServisOdemeTuru>(servis.odemeTuru || 'NAKIT');
  const [selectedKasaId, setSelectedKasaId] = useState<string>(
    servis.kasaId || (kasalar.find(k => k.type === 'Nakit')?.id || '')
  );
  const [teknisyenNotu, setTeknisyenNotu] = useState(
    servis.teknisyenNotu || '5 mikron sediment ve blok karbon filtreler yenilendi. Su basıncı 4.2 bar ayarlandı, arıtılmış su TDS değeri 16 ppm ölçüldü.'
  );
  const [musteriImza, setMusteriImza] = useState(servis.musteriImza ?? true);
  const [isYazdirModalOpen, setIsYazdirModalOpen] = useState(false);

  // New item selector
  const [selectedStokId, setSelectedStokId] = useState('');
  const [miktarInput, setMiktarInput] = useState<number>(1);

  // Currency Formatter
  const formatTRY = (val: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 2
    }).format(val);
  };

  // Calculations
  const araToplam = kalemler.reduce((acc, k) => acc + (k.birimFiyat * k.miktar), 0);
  const kdvToplam = kalemler.reduce((acc, k) => acc + (k.birimFiyat * k.miktar * (k.kdvOrani / 100)), 0);
  const genelToplam = araToplam + kdvToplam;

  const handleAddItem = () => {
    if (!selectedStokId) return;
    const item = stoklar.find(s => s.id === selectedStokId);
    if (!item) return;

    const kdvRate = item.vatRate !== undefined ? item.vatRate : ((item as any).vatRatePercent !== undefined ? (item as any).vatRatePercent : 20);
    const price = item.sellPrice ?? item.sellingPrice ?? (item as any).salePriceExclVat ?? (item as any).salePrice ?? 0;
    const totalWithVat = (price * miktarInput) * (1 + kdvRate / 100);

    const newKalem: ServisFisKalemi = {
      id: `k-${Date.now()}`,
      stokId: item.id,
      stokKodu: item.code || (item as any).skuCode || '',
      stokAdi: item.name,
      birim: item.unit || (item as any).unitType || 'Adet',
      miktar: miktarInput,
      birimFiyat: price,
      kdvOrani: kdvRate,
      toplamTutar: Math.round(totalWithVat * 100) / 100
    };

    setKalemler(prev => [...prev, newKalem]);
    setSelectedStokId('');
    setMiktarInput(1);
  };

  const handleRemoveItem = (id: string) => {
    setKalemler(prev => prev.filter(k => k.id !== id));
  };

  const handleKapat = () => {
    if (kalemler.length === 0) {
      alert('Lütfen en az bir servis kalemi veya işçilik ekleyin.');
      return;
    }

    onKapatServis(servis.id, {
      kalemler,
      odemeTuru,
      tahsilatTutari: genelToplam,
      kasaId: odemeTuru === 'NAKIT' ? selectedKasaId : undefined,
      teknisyenNotu,
      musteriImza
    });

    onClose();
  };

  // WhatsApp quick message
  const handleWhatsAppSend = () => {
    const rawPhone = (servis.telefon || '').replace(/[^0-9]/g, '');
    const phoneWithCountry = rawPhone.startsWith('90') ? rawPhone : '90' + rawPhone.replace(/^0/, '');
    const waMesaj = `*FILTREX SU ARITMA - SAHA SERVİS VE BAKIM FİŞİ*\n\n` +
      `Sayın Yetkili (${servis.cariTitle}),\n` +
      `*Fiş No:* ${servis.servisNo}\n` +
      `*Cihaz:* ${servis.cihazAdi} (SN: ${servis.seriNo || 'Belirtilmedi'})\n` +
      `*Teknisyen:* ${servis.atananTeknisyenAdi}\n` +
      `*Servis Durumu:* ${isAlreadyClosed ? 'Tamamlandı & Onaylandı' : 'Saha İşlemi Yapıldı'}\n` +
      `*Toplam Tutar:* ${formatTRY(genelToplam)} (${odemeTuru === 'NAKIT' ? 'Nakit Tahsil Edildi' : 'Cari Açık Hesaba Borç Kaydedildi'})\n\n` +
      (teknisyenNotu ? `*Yapılan İşlemler:* ${teknisyenNotu}\n\n` : '') +
      `Teknik servis hizmetimizi tercih ettiğiniz için teşekkür eder, sağlıklı günler dileriz.\n` +
      `📞 Destek & İletişim: +90 (232) 450 00 00`;
    const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(waMesaj)}`;
    window.open(url, '_blank');
  };

  // Find technician's cash box
  const technicianCashBoxes = kasalar.filter(k => 
    k.type === 'Nakit' && (
      k.name.toLowerCase().includes('saha') || 
      k.name.toLowerCase().includes('teknisyen') ||
      k.name.toLowerCase().includes('caner') ||
      k.name.toLowerCase().includes('isa')
    )
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200/80 rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[94vh] ring-1 ring-slate-900/5">
        
        {/* ULTRA-MODERN MODAL HEADER */}
        <div className="px-6 py-4 border-b border-slate-150 bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-indigo-300 shadow-inner">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                  <span>Saha Servis Fişi:</span>
                  <span className="font-mono bg-white/15 px-2.5 py-0.5 rounded-lg border border-white/20 text-indigo-200 text-sm tracking-wide">
                    {servis.servisNo}
                  </span>
                </h3>
                
                <span className={`inline-flex items-center gap-1.5 text-[11px] px-3 py-0.5 rounded-full font-bold shadow-xs border ${
                  isAlreadyClosed 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' 
                    : 'bg-amber-500/20 text-amber-300 border-amber-400/30 animate-pulse'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isAlreadyClosed ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  {isAlreadyClosed ? 'Tamamlandı & Kapatıldı' : 'Saha / Randevu Aşamasında'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-2">
                <span className="font-medium text-white/90">{servis.cariTitle}</span>
                <span className="text-slate-400">&bull;</span>
                <span className="text-slate-300 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-300" />
                  Randevu: {servis.randevuTarihi || 'Tarih Belirtilmedi'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsYazdirModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-md shadow-xs active:scale-95"
              title="Resmi Servis Fişi / PDF Şablonu"
            >
              <Printer className="w-4 h-4 text-indigo-200" />
              <span className="hidden sm:inline">Yazdır / Müşteri Şablonu</span>
            </button>
            
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2'Lİ HIZLI BİLGİ PANELİ (MODERN EXECUTIVE KARTLAR) */}
        <div className="px-6 py-4 bg-slate-50/60 border-b border-slate-200 shrink-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* SOL KART: CARİ BİLGİLER */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />
              <div>
                <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Cari Bilgiler
                  </span>
                </div>

                {/* Alt Alta Düzenlenmiş Alanlar */}
                <div className="space-y-2.5">
                  {/* 1. Cari Unvanı */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                      Cari / Müşteri Adı
                    </span>
                    <h4 className="text-base font-extrabold text-slate-900 tracking-tight leading-snug">
                      {servis.cariTitle}
                    </h4>
                  </div>

                  {/* 2. Yetkili Kişi */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                      Yetkili
                    </span>
                    <div className="text-xs font-bold text-slate-850 flex items-center gap-1.5">
                      <span className="bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-800">
                        {servis.yetkili || 'Yetkili Belirtilmedi'}
                      </span>
                    </div>
                  </div>

                  {/* 3. Telefon Numarası */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                      Telefon
                    </span>
                    <a
                      href={`tel:${servis.telefon}`}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-all shadow-2xs active:scale-95"
                    >
                      <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="font-mono">{servis.telefon || 'Telefon Yok'}</span>
                    </a>
                  </div>

                  {/* 4. Tam Adres */}
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Adres
                    </span>
                    <div className="flex items-start gap-2 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                      <div className="leading-relaxed font-medium text-slate-800">
                        {servis.acikAdres ? (
                          <span>
                            {servis.acikAdres}
                            {servis.mahalle && !servis.acikAdres.includes(servis.mahalle) && ` ${servis.mahalle} Mah.`}
                            {servis.ilce && !servis.acikAdres.includes(servis.ilce) && ` ${servis.ilce}`}
                            {servis.il && !servis.acikAdres.includes(servis.il) && ` / ${servis.il}`}
                          </span>
                        ) : (
                          <span>
                            {servis.mahalle ? `${servis.mahalle} Mah. ` : ''}
                            {servis.ilce ? `${servis.ilce} / ` : ''}
                            {servis.il || 'Adres Belirtilmedi'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SAĞ KART: CİHAZ, GARANTİ, RANDEVU & OPERASYON */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-600" />
              <div>
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
                      <Wrench className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Cihaz, Garanti & Operasyon Planı
                    </span>
                  </div>
                  
                  {/* Garanti / Cihaz Kaynağı Rozeti */}
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border shadow-2xs ${
                    servis.cihazKaynagi === 'DIS_CIHAZ_BASKASI_SATMIS'
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  }`}>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    {servis.cihazKaynagi === 'DIS_CIHAZ_BASKASI_SATMIS' ? 'Dış Cihaz (Özel Servis)' : 'Filtrex Orijinal / Garantili'}
                  </span>
                </div>

                {/* Cihaz Modeli & Seri No */}
                <div className="space-y-1">
                  <h4 className="text-base font-extrabold text-slate-900 tracking-tight leading-snug">
                    {servis.cihazAdi}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
                    <span className="font-mono bg-slate-100 px-2.5 py-0.5 rounded-md text-[11px] font-bold text-slate-700 border border-slate-200">
                      SN: {servis.seriNo || 'Belirtilmedi'}
                    </span>
                    {(servis.servisTuru || servis.servisTipi) && (
                      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {getServiceTypeLabel(servis.servisTuru || servis.servisTipi)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Randevu Bilgisi */}
                <div className="mt-3 flex items-center gap-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-950 border border-amber-200/90 text-xs font-bold shadow-2xs">
                    <Calendar className="w-3.5 h-3.5 text-amber-600" />
                    <span>Planlanan Randevu: {servis.randevuTarihi || 'Tarih Girilmedi'}</span>
                  </div>
                </div>
              </div>

              {/* Teknisyen ve Mobil Depo Şeridi */}
              <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs bg-slate-50/70 p-2.5 rounded-xl flex-wrap gap-2">
                <div className="flex items-center gap-2 font-semibold text-slate-800">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    {servis.atananTeknisyenAdi.charAt(0)}
                  </div>
                  <span>Teknisyen: <strong className="text-slate-950 font-bold">{servis.atananTeknisyenAdi}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200 font-medium">
                  <Truck className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{servis.teknisyenDepoAdi}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Bildirilen Arıza / Servis Talebi Uyarısı */}
          {servis.bildirilenAriza && (
            <div className="mt-3.5 p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200 flex items-start gap-3 shadow-2xs">
              <div className="p-1.5 rounded-xl bg-amber-100 text-amber-800 shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="flex-1 text-xs">
                <div className="font-bold text-amber-900 flex items-center gap-2">
                  <span>Müşteri Şikayeti & Servis Talebi</span>
                  <span className="text-[10px] bg-amber-200/60 px-2 py-0.5 rounded-full text-amber-900 font-bold">Öncelikli</span>
                </div>
                <p className="text-slate-800 mt-1 leading-relaxed font-medium">
                  "{servis.bildirilenAriza}"
                </p>
              </div>
            </div>
          )}
        </div>

        {/* MODAL SCROLL CONTENT */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/30">
          
          {/* KULLANILAN PARÇALAR & İŞÇİLİK KARTI */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 space-y-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-150 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-inner">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                    Teknisyen Araç Deposundan Kullanılan Parçalar & İşçilik
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">
                    Çıkış Yapılacak Depo: <strong className="text-slate-800 font-semibold">{servis.teknisyenDepoAdi}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs px-3 py-1 rounded-full font-bold bg-indigo-50 border border-indigo-200 text-indigo-700 shadow-2xs">
                  {kalemler.length} Kalem Seçili
                </span>
              </div>
            </div>

            {/* Parça / Hizmet Ekleme Form Alanı (Açıkken) */}
            {!isAlreadyClosed && (
              <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[240px]">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Kullanılan Filtre / Yedek Parça / İşçilik Seç
                  </label>
                  <select
                    value={selectedStokId}
                    onChange={e => setSelectedStokId(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-850 text-xs font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none shadow-2xs"
                  >
                    <option value="">-- Depodan Malzeme / İşçilik Seçiniz --</option>
                    {stoklar.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.code} - {s.name} (Stok: {s.currentStock} {s.unit}) - {formatTRY(s.sellingPrice || 0)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-36">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Miktar
                  </label>
                  <div className="flex items-center rounded-xl bg-white border border-slate-300 overflow-hidden shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setMiktarInput(prev => Math.max(1, prev - 1))}
                      className="px-2.5 py-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer border-r border-slate-200"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={miktarInput}
                      onChange={e => setMiktarInput(Math.max(1, Number(e.target.value) || 1))}
                      className="w-full py-1.5 text-slate-850 text-xs font-bold text-center focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setMiktarInput(prev => prev + 1)}
                      className="px-2.5 py-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer border-l border-slate-200"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="pt-5">
                  <button
                    type="button"
                    onClick={handleAddItem}
                    disabled={!selectedStokId}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-40 shadow-sm hover:shadow active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Kalem Ekle
                  </button>
                </div>
              </div>
            )}

            {/* Kalemler Tablosu */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
              <table className="w-full text-xs text-left text-slate-700">
                <thead className="bg-slate-100/90 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 w-10 text-center">#</th>
                    <th className="py-3 px-4">Parça / İşçilik Açıklaması</th>
                    <th className="py-3 px-4 text-center w-24">Miktar</th>
                    <th className="py-3 px-4 text-right w-28">Birim Fiyat</th>
                    <th className="py-3 px-4 text-center w-20">KDV</th>
                    <th className="py-3 px-4 text-right w-32">Toplam (KDV Dahil)</th>
                    {!isAlreadyClosed && <th className="py-3 px-4 text-center w-14">İşlem</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {kalemler.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400 italic">
                        Henüz kullanılan parça eklenmedi. Lütfen yukarıdan malzeme seçip ekleyin.
                      </td>
                    </tr>
                  ) : (
                    kalemler.map((kalem, idx) => (
                      <tr key={kalem.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 text-center font-mono text-slate-400 text-[11px]">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 block text-xs">{kalem.stokAdi}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{kalem.stokKodu}</span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-800">
                          <span className="bg-slate-100 px-2 py-0.5 rounded-md">
                            {kalem.miktar} {kalem.birim}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-slate-700 font-mono font-medium">
                          {formatTRY(kalem.birimFiyat)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                            %{kalem.kdvOrani}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold font-mono text-slate-950">
                          {formatTRY(kalem.toplamTutar)}
                        </td>
                        {!isAlreadyClosed && (
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(kalem.id)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Kalemi Sil"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Fiş Altı Toplam & Hesaplama Kartı */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
              <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Fiş kapatıldığında teknisyenin aracındaki depodan <strong className="text-slate-800 font-bold">{kalemler.length} kalem malzeme</strong> otomatik düşülecektir.</span>
              </div>
              
              <div className="bg-gradient-to-br from-slate-50 to-indigo-50/40 p-4 rounded-2xl border border-slate-200/90 w-full sm:w-80 space-y-2 text-xs shadow-2xs">
                <div className="flex justify-between text-slate-600">
                  <span>Ara Toplam (Net):</span>
                  <span className="font-mono text-slate-800 font-semibold">{formatTRY(araToplam)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Hesaplanan KDV:</span>
                  <span className="font-mono text-slate-800 font-semibold">{formatTRY(kdvToplam)}</span>
                </div>
                <div className="flex justify-between font-extrabold text-slate-950 pt-2 border-t border-slate-200 text-sm items-baseline">
                  <span>Genel Toplam:</span>
                  <span className="text-emerald-700 font-mono text-lg font-black">{formatTRY(genelToplam)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* TAHSİLAT & ÖDEME TÜRÜ SEÇİMİ */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-150 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                  Tahsilat & Ödeme Yöntemi Seçimi
                </h4>
                <p className="text-xs text-slate-500">
                  Sahada nakit/kredi kartı tahsilatı veya müşterinin cari hesabına borç kaydı
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Seçenek 1: Nakit (Teknisyen Kasası) */}
              <div 
                onClick={() => !isAlreadyClosed && setOdemeTuru('NAKIT')}
                className={`p-4.5 rounded-2xl border-2 cursor-pointer transition-all ${
                  odemeTuru === 'NAKIT'
                    ? 'bg-gradient-to-br from-emerald-50/70 to-white border-emerald-500 shadow-md ring-4 ring-emerald-500/10'
                    : 'bg-white border-slate-200 opacity-75 hover:opacity-100 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5 font-bold text-sm text-slate-900">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <span>Nakit Tahsilat (Saha Teknisyen Kasası)</span>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    odemeTuru === 'NAKIT' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
                  }`}>
                    {odemeTuru === 'NAKIT' && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mb-3">
                  Teknisyen sahadan <strong className="text-emerald-700 font-bold">{formatTRY(genelToplam)}</strong> nakit tahsilatı yapar ve tutar doğrudan <strong>sadece kendi kasasına</strong> işlenir.
                </p>

                {odemeTuru === 'NAKIT' && (
                  <div className="pt-3 border-t border-emerald-200/60">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Hedef Teknisyen Kasası:
                    </label>
                    <select
                      value={selectedKasaId}
                      onChange={e => setSelectedKasaId(e.target.value)}
                      disabled={isAlreadyClosed}
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-emerald-300 text-slate-850 text-xs font-semibold focus:border-emerald-500 focus:outline-none shadow-2xs"
                    >
                      {technicianCashBoxes.map(k => (
                        <option key={k.id} value={k.id}>
                          {k.name} (Mevcut Bakiye: {formatTRY(k.balance)})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Seçenek 2: Açık Hesap (Cariye Borçlandırma) */}
              <div 
                onClick={() => !isAlreadyClosed && setOdemeTuru('ACIK_HESAP')}
                className={`p-4.5 rounded-2xl border-2 cursor-pointer transition-all ${
                  odemeTuru === 'ACIK_HESAP'
                    ? 'bg-gradient-to-br from-indigo-50/70 to-white border-indigo-500 shadow-md ring-4 ring-indigo-500/10'
                    : 'bg-white border-slate-200 opacity-75 hover:opacity-100 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5 font-bold text-sm text-slate-900">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <span>Cari Açık Hesap (Müşteri Borçlandırma)</span>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    odemeTuru === 'ACIK_HESAP' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
                  }`}>
                    {odemeTuru === 'ACIK_HESAP' && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Sahada nakit alınmadı. Toplam <strong className="text-indigo-700 font-bold">{formatTRY(genelToplam)}</strong> tutar müşterinin (<span className="font-semibold text-slate-800">{servis.cariTitle}</span>) cari hesabına <strong>servis borcu</strong> olarak kaydedilir.
                </p>

                <div className="mt-3 text-[11px] text-indigo-800 bg-indigo-50/80 p-2.5 rounded-xl border border-indigo-200 font-semibold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Cari bakiye ekstresine anında işlenir ve taslak faturaya bağlanır.</span>
                </div>
              </div>
            </div>
          </div>

          {/* TEKNİSYEN SERVİS AÇIKLAMASI & İMZA ALANI */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                Teknisyen Servis Açıklaması & Yapılan Testler
              </label>
              <span className="text-[11px] text-slate-400 font-medium">
                (Filtre değişimleri, TDS ölçümleri, basınç değerleri)
              </span>
            </div>
            
            <textarea
              rows={2}
              value={teknisyenNotu}
              onChange={e => setTeknisyenNotu(e.target.value)}
              disabled={isAlreadyClosed}
              placeholder="Örn: 5 mikron sediment ve blok karbon filtreler yenilendi, su basıncı 4 bar ayarlandı, arıtılmış su TDS değeri 16 ppm ölçüldü."
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-850 text-xs font-medium focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none resize-none placeholder:text-slate-400 transition-all shadow-2xs"
            />

            <div className="flex items-center gap-2.5 pt-1 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
              <input
                type="checkbox"
                id="musteriImza"
                checked={musteriImza}
                onChange={e => setMusteriImza(e.target.checked)}
                disabled={isAlreadyClosed}
                className="w-4.5 h-4.5 rounded-lg text-indigo-600 bg-white border-slate-300 focus:ring-indigo-500 cursor-pointer"
              />
              <label htmlFor="musteriImza" className="text-xs text-slate-800 font-semibold select-none cursor-pointer flex items-center gap-1.5">
                <Award className="w-4 h-4 text-emerald-600" />
                <span>Müşteri yetkilisi servisi sahada kontrol etti ve teslim/onay imzasını verdi.</span>
              </label>
            </div>
          </div>

          {/* FATURA & WHATSAPP ENTEGRASYON BİLGİ KARTLARI */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Fatura Kartı */}
            <div className="bg-gradient-to-br from-purple-50/80 to-white border border-purple-200/80 rounded-3xl p-4 flex items-start gap-3 shadow-2xs">
              <div className="w-9 h-9 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-0.5">
                <FileCheck className="w-5 h-5" />
              </div>
              <div className="text-xs flex-1">
                <div className="font-bold text-purple-950">
                  Otomatik Satış Faturası Entegrasyonu
                </div>
                <div className="text-purple-900 mt-1 leading-relaxed font-medium">
                  Fiş kapatıldığı anda <strong>Faturalar</strong> modülüne otomatik olarak <strong className="text-purple-950">"TASLAK"</strong> statüsünde Satış Faturası aktarılır.
                </div>
                {servis.faturaId && (
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-100 text-purple-950 font-mono text-[11px] font-bold border border-purple-300">
                    <Check className="w-3.5 h-3.5 text-purple-700" /> Bağlı Fatura: {servis.faturaId}
                  </div>
                )}
              </div>
            </div>

            {/* WhatsApp Kartı */}
            <div className="bg-gradient-to-br from-emerald-50/80 to-white border border-emerald-250/80 rounded-3xl p-4 flex items-start gap-3 shadow-2xs">
              <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div className="text-xs flex-1">
                <div className="font-bold text-emerald-950">
                  Müşteriye WhatsApp Fiş İletimi
                </div>
                <div className="text-emerald-900 mt-1 leading-relaxed font-medium">
                  Müşteri GSM numarasına ({servis.telefon}) servis detayları ve tahsilat tutarını tek tıkla gönderin.
                </div>
                <div className="mt-2.5">
                  <button
                    type="button"
                    onClick={handleWhatsAppSend}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 transition-all cursor-pointer text-xs shadow-xs active:scale-95"
                  >
                    <Send className="w-3.5 h-3.5" /> WhatsApp ile Gönder
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* ULTRA-MODERN MODAL FOOTER */}
        <div className="p-4 px-6 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              Kapat
            </button>

            {onOpenEditServis && (
              <button
                type="button"
                onClick={() => onOpenEditServis(servis)}
                className="px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Kaydı Düzenle</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsYazdirModalOpen(true)}
              className="px-4 py-2.5 text-xs font-bold rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-indigo-600" />
              <span>Resmi Fişi Görüntüle / Yazdır</span>
            </button>

            {!isAlreadyClosed ? (
              <button
                type="button"
                onClick={handleKapat}
                className="px-6 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md hover:shadow-lg flex items-center gap-2 transition-all cursor-pointer active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                Servis Fişini Kapat & Taslak Faturaya Aktar
              </button>
            ) : (
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200 shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Bu Servis Fişi Başarıyla Tamamlanmıştır</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* YAZDIRILABİLİR VE MÜŞTERİYE İLETİLEBİLİR RESMİ SERVİS FİŞİ ŞABLONU */}
      {isYazdirModalOpen && (
        <ServisFisiYazdirModal
          isOpen={isYazdirModalOpen}
          onClose={() => setIsYazdirModalOpen(false)}
          servis={servis}
          kalemler={kalemler}
          toplamTutar={genelToplam}
          teknisyenNotu={teknisyenNotu}
          odemeTuru={odemeTuru}
        />
      )}
    </div>
  );
};

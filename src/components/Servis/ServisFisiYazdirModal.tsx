import React from 'react';
import { 
  X, 
  Printer, 
  Download, 
  MessageCircle, 
  CheckCircle2, 
  Wrench, 
  Building2, 
  Phone, 
  MapPin, 
  User, 
  Calendar, 
  ShieldCheck, 
  FileText,
  Truck,
  Award,
  QrCode,
  Check,
  CheckCircle,
  Sparkles,
  PhoneCall,
  Mail,
  Globe
} from 'lucide-react';
import { ServisFisi, ServisFisKalemi } from '../../types';

interface ServisFisiYazdirModalProps {
  isOpen: boolean;
  onClose: () => void;
  servis: ServisFisi;
  kalemler?: ServisFisKalemi[];
  toplamTutar?: number;
  teknisyenNotu?: string;
  odemeTuru?: string;
}

export const ServisFisiYazdirModal: React.FC<ServisFisiYazdirModalProps> = ({
  isOpen,
  onClose,
  servis,
  kalemler = servis.kalemler,
  toplamTutar,
  teknisyenNotu = servis.teknisyenNotu,
  odemeTuru = servis.odemeTuru
}) => {
  if (!isOpen || !servis) return null;

  const effectiveKalemler = kalemler && kalemler.length > 0 ? kalemler : servis.kalemler;
  const araToplam = effectiveKalemler.reduce((acc, k) => acc + (k.birimFiyat * k.miktar), 0);
  const kdvToplam = effectiveKalemler.reduce((acc, k) => acc + (k.birimFiyat * k.miktar * (k.kdvOrani / 100)), 0);
  const genelToplam = toplamTutar ?? (araToplam + kdvToplam);

  const formatTRY = (val: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 2
    }).format(val);
  };

  const handlePrint = () => {
    window.print();
  };

  const waMesaj = `*FILTREX SU ARITMA - RESMİ TEKNİK SERVİS VE BAKIM FİŞİ*\n\n` +
    `Sayın Yetkili (${servis.cariTitle}),\n` +
    `*Fiş No:* ${servis.servisNo}\n` +
    `*Cihaz / Model:* ${servis.cihazAdi} (SN: ${servis.seriNo || 'Belirtilmedi'})\n` +
    `*Teknisyen:* ${servis.atananTeknisyenAdi}\n` +
    `*Tarih:* ${servis.randevuTarihi || new Date().toLocaleDateString('tr-TR')}\n` +
    `*Toplam Tutar:* ${formatTRY(genelToplam)} (${odemeTuru === 'NAKIT' ? 'Nakit Tahsil Edildi' : 'Cari Açık Hesaba Borç Kaydedildi'})\n\n` +
    (teknisyenNotu ? `*Yapılan İşlemler:* ${teknisyenNotu}\n\n` : '') +
    `*Garanti:* Değişen orijinal filtre ve parçalar 6 ay garantilidir.\n` +
    `Teknik servis hizmetimizi tercih ettiğiniz için teşekkür ederiz.\n` +
    `📞 Çağrı Merkezi: +90 (232) 450 00 00 | 🌐 www.filtrex.com.tr`;

  const handleWhatsAppSend = () => {
    const rawPhone = (servis.telefon || '').replace(/[^0-9]/g, '');
    const phoneWithCountry = rawPhone.startsWith('90') ? rawPhone : '90' + rawPhone.replace(/^0/, '');
    const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(waMesaj)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[96vh] ring-1 ring-slate-900/10">
        
        {/* ÜST BUTON BAR (Yazdır / WhatsApp / Kapat) - Print anında gizlenir */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950 text-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-indigo-300">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Resmi Saha Servis & Bakım Formu</span>
                <span className="font-mono bg-white/15 px-2.5 py-0.5 rounded-lg border border-white/20 text-indigo-200 text-xs">
                  {servis.servisNo}
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                A4 Yazdırma ve Müşteri Dijital Teslimat Şablonu
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleWhatsAppSend}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Müşteriye WhatsApp Gönder</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Yazdır / PDF İndir</span>
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

        {/* YAZDIRILABİLİR RESMİ SERVİS FİŞİ DÖKÜMAN GÖVDESİ */}
        <div className="p-6 sm:p-10 overflow-y-auto flex-1 bg-slate-100/50 print:bg-white print:p-0 print:overflow-visible">
          
          {/* A4 SAYFA TASARIMI */}
          <div className="max-w-3xl mx-auto border border-slate-300/80 rounded-3xl p-8 sm:p-10 bg-white shadow-xl print:border-none print:shadow-none print:p-0 print:rounded-none relative overflow-hidden">
            
            {/* ÜST KURUMSAL ANTET & HEADER */}
            <div className="flex flex-wrap items-start justify-between gap-6 pb-6 border-b-2 border-slate-900">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-md tracking-wider">
                    F
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight leading-tight">
                      FILTREX SU ARITMA SİSTEMLERİ
                    </h1>
                    <p className="text-[11px] text-slate-600 font-semibold tracking-wide uppercase">
                      Endüstriyel & Evsel Su Arıtma Teknolojileri San. Tic. Ltd. Şti.
                    </p>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 pt-2 space-y-0.5 leading-relaxed font-medium">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>Merkez: Atatürk Mah. 120 Sok. No:45/A Bornova / İZMİR</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" /> +90 (232) 450 00 00
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-400" /> servis@filtrex.com.tr
                    </span>
                    <span className="flex items-center gap-1">
                      <Globe className="w-3 h-3 text-slate-400" /> www.filtrex.com.tr
                    </span>
                  </div>
                </div>
              </div>

                {/* SAĞ FİŞ BARKOD VE DÖKÜMAN NO */}
              <div className="text-right flex flex-col items-end">
                <div className="inline-block bg-slate-950 text-white px-3.5 py-1.5 rounded-xl text-xs font-black tracking-widest uppercase mb-2 shadow-xs">
                  SAHA SERVİS & BAKIM FORMU
                </div>
                <div className="text-base font-black text-indigo-700 font-mono tracking-wide">
                  {servis.servisNo}
                </div>
                
                {/* Barcode Visual Representation */}
                <div className="my-1.5 flex flex-col items-end">
                  <svg className="w-36 h-9" viewBox="0 0 140 36">
                    <rect x="0" y="0" width="3" height="30" fill="#0f172a" />
                    <rect x="5" y="0" width="1" height="30" fill="#0f172a" />
                    <rect x="8" y="0" width="4" height="30" fill="#0f172a" />
                    <rect x="15" y="0" width="2" height="30" fill="#0f172a" />
                    <rect x="19" y="0" width="1" height="30" fill="#0f172a" />
                    <rect x="23" y="0" width="3" height="30" fill="#0f172a" />
                    <rect x="28" y="0" width="2" height="30" fill="#0f172a" />
                    <rect x="33" y="0" width="4" height="30" fill="#0f172a" />
                    <rect x="40" y="0" width="1" height="30" fill="#0f172a" />
                    <rect x="43" y="0" width="3" height="30" fill="#0f172a" />
                    <rect x="48" y="0" width="2" height="30" fill="#0f172a" />
                    <rect x="53" y="0" width="4" height="30" fill="#0f172a" />
                    <rect x="60" y="0" width="2" height="30" fill="#0f172a" />
                    <rect x="64" y="0" width="1" height="30" fill="#0f172a" />
                    <rect x="68" y="0" width="3" height="30" fill="#0f172a" />
                    <rect x="74" y="0" width="2" height="30" fill="#0f172a" />
                    <rect x="79" y="0" width="4" height="30" fill="#0f172a" />
                    <rect x="86" y="0" width="1" height="30" fill="#0f172a" />
                    <rect x="90" y="0" width="3" height="30" fill="#0f172a" />
                    <rect x="95" y="0" width="2" height="30" fill="#0f172a" />
                    <rect x="100" y="0" width="4" height="30" fill="#0f172a" />
                    <rect x="107" y="0" width="2" height="30" fill="#0f172a" />
                    <rect x="112" y="0" width="1" height="30" fill="#0f172a" />
                    <rect x="116" y="0" width="3" height="30" fill="#0f172a" />
                    <rect x="122" y="0" width="2" height="30" fill="#0f172a" />
                    <rect x="127" y="0" width="4" height="30" fill="#0f172a" />
                    <rect x="134" y="0" width="3" height="30" fill="#0f172a" />
                    <text x="70" y="35" fontSize="6" fontFamily="monospace" textAnchor="middle" fill="#64748b">
                      *{servis.servisNo}*
                    </text>
                  </svg>
                </div>

                <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
                  Düzenleme: <strong className="text-slate-900">{new Date().toLocaleDateString('tr-TR')}</strong>
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  Randevu: <strong className="text-slate-900">{servis.randevuTarihi || 'Belirtilmedi'}</strong>
                </div>
              </div>
            </div>

            {/* 2'Lİ HIZLI BİLGİ KUTULARI (MÜŞTERİ BİLGİLERİ VE CİHAZ & OPERASYON BİLGİLERİ) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
              
              {/* SOL KUTU: MÜŞTERİ BİLGİLERİ */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/70 shadow-2xs">
                <div className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2 mb-2.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-indigo-600" />
                    Müşteri (Cari) Bilgileri
                  </span>
                  {servis.adresTipi && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-slate-700 border border-slate-200">
                      {servis.adresTipi}
                    </span>
                  )}
                </div>
                <div className="text-xs space-y-1.5 text-slate-700">
                  <div>
                    <span className="text-slate-400 font-medium block text-[10px] uppercase">Müşteri / Firma Unvanı</span>
                    <strong className="text-slate-950 font-bold text-sm leading-tight block">{servis.cariTitle}</strong>
                  </div>
                  <div className="flex justify-between pt-1">
                    <div>
                      <span className="text-slate-400 font-medium text-[11px]">Yetkili Kişi: </span>
                      <strong className="text-slate-850 font-semibold">{servis.yetkili || 'Belirtilmedi'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium text-[11px]">Telefon: </span>
                      <strong className="text-slate-950 font-mono font-bold">{servis.telefon}</strong>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-200 mt-2 text-[11px]">
                    <span className="text-slate-400 font-medium block">Servis & Montaj Adresi:</span>
                    <div className="text-slate-800 font-medium mt-0.5 leading-snug">
                      {servis.acikAdres ? `${servis.acikAdres}, ` : ''}
                      {servis.mahalle ? `${servis.mahalle} Mah. ` : ''}
                      <strong>{servis.ilce} / {servis.il}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* SAĞ KUTU: CİHAZ VE OPERASYON BİLGİLERİ */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/70 shadow-2xs">
                <div className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2 mb-2.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-indigo-600" />
                    Cihaz ve Operasyon Detayları
                  </span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                    servis.cihazKaynagi === 'DIS_CIHAZ_BASKASI_SATMIS'
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  }`}>
                    {servis.cihazKaynagi === 'DIS_CIHAZ_BASKASI_SATMIS' ? 'Dış Cihaz' : 'Filtrex Orijinal / Garantili'}
                  </span>
                </div>
                <div className="text-xs space-y-1.5 text-slate-700">
                  <div>
                    <span className="text-slate-400 font-medium block text-[10px] uppercase">Cihaz Modeli</span>
                    <strong className="text-slate-950 font-bold text-sm leading-tight block">{servis.cihazAdi}</strong>
                  </div>
                  <div className="flex justify-between pt-1">
                    <div>
                      <span className="text-slate-400 font-medium text-[11px]">Seri No: </span>
                      <strong className="font-mono text-slate-900">{servis.seriNo || 'Belirtilmedi'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium text-[11px]">Servis Türü: </span>
                      <strong className="text-indigo-700">{servis.servisTipi?.replace(/_/g, ' ') || 'Periyodik Bakım'}</strong>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-200 mt-2 text-[11px]">
                    <span className="text-slate-400 font-medium block">Görevli Saha Teknisyeni:</span>
                    <div className="text-slate-800 font-medium mt-0.5">
                      <strong className="text-slate-950 font-bold">{servis.atananTeknisyenAdi}</strong>
                      <span className="text-slate-500"> ({servis.teknisyenDepoAdi})</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* MÜŞTERİ ŞİKAYETİ / ARIZA BİLDİRİMİ */}
            {servis.bildirilenAriza && (
              <div className="mb-5 p-3 rounded-2xl border border-amber-200 bg-amber-50/80 text-xs flex items-start gap-2.5">
                <div className="p-1 rounded-lg bg-amber-100 text-amber-800 shrink-0 mt-0.5">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-bold text-amber-950">Servis Talebi & Müşteri Şikayeti: </span>
                  <span className="text-slate-800 font-medium">"{servis.bildirilenAriza}"</span>
                </div>
              </div>
            )}

            {/* KULLANILAN MALZEMELER & SERVİS İŞÇİLİK TABLOSU */}
            <div className="my-5">
              <div className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                <span>Kullanılan Orijinal Filtreler, Parçalar ve Servis İşçiliği</span>
                <span className="text-[11px] text-slate-500 font-medium">{effectiveKalemler.length} Kalem</span>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-300">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 text-[11px]">
                      <th className="py-2.5 px-3 border-r border-slate-300 w-10 text-center">#</th>
                      <th className="py-2.5 px-3 border-r border-slate-300">Stok Kodu & Malzeme / Hizmet Açıklaması</th>
                      <th className="py-2.5 px-3 border-r border-slate-300 text-center w-20">Miktar</th>
                      <th className="py-2.5 px-3 border-r border-slate-300 text-right w-28">Birim Fiyat</th>
                      <th className="py-2.5 px-3 border-r border-slate-300 text-center w-16">KDV</th>
                      <th className="py-2.5 px-3 text-right w-32">Tutar (KDV Dahil)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {effectiveKalemler.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-6 text-slate-400 italic">
                          Kullanılan parça veya işçilik kalemi eklenmedi.
                        </td>
                      </tr>
                    ) : (
                      effectiveKalemler.map((kalem, idx) => (
                        <tr key={kalem.id || idx} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 border-r border-slate-300 text-center text-slate-500 font-mono text-[11px]">{idx + 1}</td>
                          <td className="py-2 px-3 border-r border-slate-300">
                            <span className="font-bold text-slate-950">{kalem.stokAdi}</span>
                            {kalem.stokKodu && <span className="text-[10px] text-slate-500 font-mono ml-2">({kalem.stokKodu})</span>}
                          </td>
                          <td className="py-2 px-3 border-r border-slate-300 text-center font-bold text-slate-900">
                            {kalem.miktar} {kalem.birim || 'Adet'}
                          </td>
                          <td className="py-2 px-3 border-r border-slate-300 text-right font-mono text-slate-700">
                            {formatTRY(kalem.birimFiyat)}
                          </td>
                          <td className="py-2 px-3 border-r border-slate-300 text-center text-slate-600 font-medium">
                            %{kalem.kdvOrani}
                          </td>
                          <td className="py-2 px-3 text-right font-bold font-mono text-slate-950">
                            {formatTRY(kalem.toplamTutar)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* TUTAR VE GENEL TOPLAM HESAPLAMA TABLOSU */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mt-4">
                <div className="text-[11px] text-slate-600 max-w-sm space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <div>
                    <strong>Tahsilat & Ödeme Türü: </strong>
                    <span className="text-slate-800 font-semibold">
                      {odemeTuru === 'NAKIT' ? 'Nakit Tahsil Edildi (Saha Kasası)' : 'Açık Hesap (Müşteri Cari Hesabına Borç Kaydedildi)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-800 font-bold">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Değiştirilen tüm orijinal filtre ve parçalar 6 (altı) ay garantilidir.</span>
                  </div>
                </div>

                <div className="w-full sm:w-64 border border-slate-300 rounded-2xl p-3.5 bg-slate-50/80 text-xs space-y-1.5 shadow-2xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Ara Toplam (Net):</span>
                    <span className="font-mono font-semibold text-slate-800">{formatTRY(araToplam)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Hesaplanan KDV:</span>
                    <span className="font-mono font-semibold text-slate-800">{formatTRY(kdvToplam)}</span>
                  </div>
                  <div className="flex justify-between text-slate-950 font-black pt-2 border-t border-slate-300 text-sm">
                    <span>YEKÜN TOPLAM:</span>
                    <span className="font-mono text-indigo-700 text-base">{formatTRY(genelToplam)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* TEKNİSYEN AÇIKLAMALARI VE TEST SONUÇLARI */}
            {teknisyenNotu && (
              <div className="my-4 border border-slate-200 rounded-2xl p-3.5 bg-slate-50 text-xs">
                <span className="font-bold text-slate-900 block mb-1">Teknisyen Notu & Yapılan Teknik Testler: </span>
                <span className="text-slate-700 font-medium leading-relaxed">{teknisyenNotu}</span>
              </div>
            )}

            {/* İMZA VE RESMİ TESLİMAT ALANLARI */}
            <div className="grid grid-cols-2 gap-8 pt-8 mt-6 border-t-2 border-slate-800 text-xs">
              <div className="text-center space-y-1">
                <div className="font-bold text-slate-950 uppercase tracking-wider">HİZMETİ VEREN SAHA TEKNİSYENİ</div>
                <div className="text-slate-700 font-bold">{servis.atananTeknisyenAdi}</div>
                <div className="text-[10px] text-slate-400">Teknik Servis Kaşe / İmza</div>
                <div className="h-16 border-b border-dashed border-slate-400 flex items-end justify-center pb-1">
                  <span className="text-[10px] text-slate-400 italic">Saha Personel İmzası</span>
                </div>
              </div>

              <div className="text-center space-y-1">
                <div className="font-bold text-slate-950 uppercase tracking-wider">HİZMETİ TESLİM ALAN MÜŞTERİ</div>
                <div className="text-slate-700 font-bold">{servis.yetkili || servis.cariTitle}</div>
                <div className="text-[10px] text-slate-400">Müşteri Onay & Islak/Dijital İmza</div>
                <div className="h-16 border-b border-dashed border-slate-400 flex items-end justify-center pb-1">
                  <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                    {servis.musteriImza ? '✓ Müşteri Teslim ve Kabul Onayı Alındı' : 'İmza'}
                  </span>
                </div>
              </div>
            </div>

            {/* FORM ALT DİPNOTU & TEŞEKKÜR */}
            <div className="mt-8 pt-4 border-t border-slate-200 text-[10px] text-slate-400 flex flex-wrap justify-between items-center gap-2">
              <div>Bu form Filtrex Teknik Servis Otomasyon Sistemi tarafından üretilmiştir.</div>
              <div className="font-mono text-slate-500">Doğrulama Kodu: FLX-{servis.servisNo}-{new Date().getFullYear()}</div>
            </div>

          </div>
        </div>

        {/* ALT BUTON BAR (Print anında gizlenir) */}
        <div className="p-4 px-6 border-t border-slate-200 bg-white flex items-center justify-between shrink-0 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          >
            Kapat
          </button>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" />
              Yazdır / PDF Olarak Kaydet
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

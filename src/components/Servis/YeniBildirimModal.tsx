import React, { useState, useEffect } from 'react';
import { 
  X, 
  Send, 
  MessageCircle, 
  Smartphone, 
  Sparkles, 
  User, 
  Cpu, 
  Wrench, 
  Copy, 
  Check, 
  Phone,
  FileText
} from 'lucide-react';
import { 
  Cari, 
  MusteriCihazi, 
  ServisFisi, 
  ServisBildirim, 
  Personel 
} from '../../types';

interface YeniBildirimModalProps {
  isOpen: boolean;
  onClose: () => void;
  cariler: Cari[];
  cihazlar: MusteriCihazi[];
  servisler: ServisFisi[];
  currentUser?: Personel | null;
  initialCariId?: string;
  initialCihazId?: string;
  initialServisId?: string;
  onKaydetBildirim: (bildirim: Omit<ServisBildirim, 'id'>, autoOpenWhatsApp?: boolean) => void;
}

export const YeniBildirimModal: React.FC<YeniBildirimModalProps> = ({
  isOpen,
  onClose,
  cariler,
  cihazlar,
  servisler,
  currentUser,
  initialCariId,
  initialCihazId,
  initialServisId,
  onKaydetBildirim
}) => {
  const [selectedCariId, setSelectedCariId] = useState<string>(initialCariId || cariler?.[0]?.id || '');
  const [selectedCihazId, setSelectedCihazId] = useState<string>(initialCihazId || '');
  const [selectedServisId, setSelectedServisId] = useState<string>(initialServisId || '');
  
  const [kanal, setKanal] = useState<'WHATSAPP' | 'SMS'>('WHATSAPP');
  const [templateKey, setTemplateKey] = useState<string>('BAKIM_HATIRLATMA');
  const [telefon, setTelefon] = useState<string>('');
  const [mesaj, setMesaj] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Selected entities
  const selectedCari = cariler.find(c => c.id === selectedCariId);
  const customerDevices = cihazlar.filter(c => c.cariId === selectedCariId);
  const customerServices = servisler.filter(s => s.cariId === selectedCariId);
  const selectedCihaz = cihazlar.find(c => c.id === selectedCihazId);
  const selectedServis = servisler.find(s => s.id === selectedServisId);

  // Update phone when Cari changes
  useEffect(() => {
    if (selectedCari) {
      const phone = selectedCari.phone || selectedCari.phone2 || '';
      setTelefon(phone);
    }
  }, [selectedCariId, selectedCari]);

  // Template message generator
  const getGeneratedTemplate = (tKey: string) => {
    const cariName = selectedCari?.title || 'Değerli Müşterimiz';
    const yetkiliName = selectedCari?.authorizedPerson || 'Yetkili';
    const cihazName = selectedCihaz?.cihazAdi || 'Su Arıtma / Filtrasyon Sisteminiz';
    const servisNo = selectedServis?.servisNo || 'SRV-2026';
    const servisTarih = selectedServis?.randevuTarihi || new Date().toISOString().slice(0, 10);
    const teknisyen = selectedServis?.atananTeknisyenAdi || 'Saha Teknik Ekibimiz';

    switch (tKey) {
      case 'BAKIM_HATIRLATMA':
        return `Sayın ${yetkiliName} (${cariName}),\n\n${cihazName} cihazınızın periyodik filtre değişim ve bakım zamanı gelmiştir. Sisteminizin yüksek verim ve su kalitesiyle çalışması için randevu oluşturmak ister misiniz?\n\nİletişim: 0850 300 45 45 / 0555 123 45 67\nFILTREX Su Teknolojileri A.Ş.`;

      case 'RANDEVU_BILGISI':
        return `Sayın Yetkili (${cariName}),\n\n${servisNo} nolu iş emri kapsamında ${cihazName} periyodik bakım randevunuz ${servisTarih} tarihi için planlanmıştır.\n\nAtanan Teknisyen: ${teknisyen}\nAcil durum ve teyit için bize bu hattan ulaşabilirsiniz.\nFILTREX Teknik Servis`;

      case 'SERVIS_TAMAMLANDI':
        return `Sayın ${yetkiliName} (${cariName}),\n\n${cihazName} cihazınızın periyodik bakımı ve filtre kontrolleri ${teknisyen} tarafından başarıyla tamamlanmıştır.\n\nSistem basınç ve su iletkenlik testleri normal değerlerdedir. Bizi tercih ettiğiniz için teşekkür ederiz.\nFILTREX A.Ş.`;

      case 'FIYAT_TEKLIFI':
        return `Sayın Yetkili (${cariName}),\n\n${cihazName} için talep etmiş olduğunuz periyodik bakım ve filtre değişim teklifimiz hazırlanmıştır. Detaylı bilgi ve onay için bize ulaşabilirsiniz.\nFILTREX Satış & Servis Departmanı`;

      case 'OZEL_BILDIRIM':
        return `Sayın ${yetkiliName} (${cariName}),\n\n`;

      default:
        return '';
    }
  };

  // Re-generate message when template or selected entity changes
  useEffect(() => {
    setMesaj(getGeneratedTemplate(templateKey));
  }, [templateKey, selectedCariId, selectedCihazId, selectedServisId]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!mesaj) return;
    navigator.clipboard.writeText(mesaj);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveAndSend = (autoOpen: boolean) => {
    if (!telefon.trim()) {
      alert('Lütfen geçerli bir telefon numarası giriniz.');
      return;
    }
    if (!mesaj.trim()) {
      alert('Lütfen bildirim mesajını doldurunuz.');
      return;
    }

    const now = new Date();
    const formattedNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Get current branch from active cari or system context
    const branchId = selectedCari?.branchId || selectedCihaz?.branchId || selectedServis?.branchId || undefined;

    const newBildirim: Omit<ServisBildirim, 'id'> = {
      cariId: selectedCariId,
      cariTitle: selectedCari?.title || 'Genel Müşteri',
      telefon: telefon.trim(),
      kanal,
      tip: templateKey,
      mesaj: mesaj.trim(),
      durum: autoOpen ? 'GONDERILDI' : 'ONAY_BEKLIYOR',
      olusturmaTarihi: formattedNow,
      gonderimTarihi: autoOpen ? formattedNow : undefined,
      gonderenKullanici: currentUser?.fullName || 'Servis & Müşteri Temsilcisi',
      cihazId: selectedCihazId || undefined,
      cihazAdi: selectedCihaz?.cihazAdi || undefined,
      servisId: selectedServisId || undefined,
      servisNo: selectedServis?.servisNo || undefined,
      branchId
    };

    onKaydetBildirim(newBildirim, autoOpen);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border-0 sm:border border-slate-200 rounded-none sm:rounded-2xl w-full h-full sm:h-auto sm:max-h-[95vh] sm:max-w-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className={`p-2 sm:p-2.5 rounded-xl border ${
              kanal === 'WHATSAPP' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                : 'bg-blue-50 border-blue-200 text-blue-600'
            }`}>
              {kanal === 'WHATSAPP' ? <MessageCircle className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm sm:text-lg font-bold text-slate-800 flex items-center gap-2 font-sans leading-tight">
                <span>Yeni {kanal === 'WHATSAPP' ? 'WhatsApp' : 'SMS'} Bildirimi</span>
                <span className="hidden xs:inline-block text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-normal">
                  Arşivli
                </span>
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">
                Şablonlu bildirim iletin ve kaydedin
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1 scrollbar-thin scrollbar-thumb-slate-300">
          {/* Kanal Seçimi (WhatsApp vs SMS) */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setKanal('WHATSAPP')}
              className={`p-3 rounded-xl border flex items-center justify-center gap-2.5 font-bold text-xs transition-all cursor-pointer ${
                kanal === 'WHATSAPP'
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800'
              }`}
            >
              <MessageCircle className="w-4 h-4 text-emerald-500" />
              <span>WhatsApp Mesajı</span>
            </button>

            <button
              type="button"
              onClick={() => setKanal('SMS')}
              className={`p-3 rounded-xl border flex items-center justify-center gap-2.5 font-bold text-xs transition-all cursor-pointer ${
                kanal === 'SMS'
                  ? 'bg-blue-50 border-blue-400 text-blue-800 shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800'
              }`}
            >
              <Smartphone className="w-4 h-4 text-blue-500" />
              <span>SMS Bildirimi</span>
            </button>
          </div>

          {/* Cari & Cihaz / Servis Seçimi */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cari Seçimi */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-500" />
                Müşteri / Cari Seçimi <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedCariId}
                onChange={e => {
                  setSelectedCariId(e.target.value);
                  setSelectedCihazId('');
                  setSelectedServisId('');
                }}
                className="w-full bg-white border border-slate-300 hover:border-slate-400 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                {cariler.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.authorizedPerson || c.city || 'Yetkili'})
                  </option>
                ))}
              </select>
            </div>

            {/* Telefon Numarası */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-500" />
                Gönderilecek Telefon <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={telefon}
                onChange={e => setTelefon(e.target.value)}
                placeholder="Örn: 0555 123 45 67"
                className="w-full bg-white border border-slate-300 hover:border-slate-400 rounded-xl px-3 py-2 text-xs font-mono text-emerald-700 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Opsiyonel Cihaz & Servis Fişi Bağlantısı */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 p-3 rounded-xl border border-slate-200">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1 flex items-center gap-1">
                <Cpu className="w-3 h-3 text-purple-500" />
                İlişkili Cihaz (Opsiyonel)
              </label>
              <select
                value={selectedCihazId}
                onChange={e => setSelectedCihazId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-850 focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                <option value="">-- Cihaz Seçiniz (Tümü) --</option>
                {customerDevices.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.cihazAdi} ({d.adresTipi || d.seriNo || 'Sistem'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1 flex items-center gap-1">
                <Wrench className="w-3 h-3 text-amber-500" />
                İlişkili Servis Fişi (Opsiyonel)
              </label>
              <select
                value={selectedServisId}
                onChange={e => setSelectedServisId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-850 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="">-- Servis Fişi Seçiniz --</option>
                {customerServices.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.servisNo} - {s.cihazAdi} ({s.randevuTarihi || s.createdAt})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Şablon Seçimi */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Hazır Mesaj Şablonu
              </span>
            </label>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {[
                { key: 'BAKIM_HATIRLATMA', label: 'Bakım Hatırlatma' },
                { key: 'RANDEVU_BILGISI', label: 'Randevu Onayı' },
                { key: 'SERVIS_TAMAMLANDI', label: 'Servis Tamamlandı' },
                { key: 'OZEL_BILDIRIM', label: 'Özel / Serbest' }
              ].map(tpl => (
                <button
                  key={tpl.key}
                  type="button"
                  onClick={() => setTemplateKey(tpl.key)}
                  className={`px-3 py-2.5 rounded-xl text-[11px] font-bold text-center border transition-all cursor-pointer leading-tight ${
                    templateKey === tpl.key
                      ? 'bg-blue-50 border-blue-400 text-blue-800 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mesaj İçeriği & Karakter Sayacı */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-500" />
                Mesaj Metni <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Kopyalandı' : 'Metni Kopyala'}
                </button>
                <span className="text-[10px] text-slate-400 font-mono">
                  {mesaj.length} karakter
                </span>
              </div>
            </div>
            <textarea
              rows={5}
              value={mesaj}
              onChange={e => setMesaj(e.target.value)}
              placeholder="Müşteriye gönderilecek mesaj içeriği..."
              className="w-full bg-white border border-slate-300 hover:border-slate-400 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-sans leading-relaxed"
            />
          </div>

          {/* Canlı Önizleme Kutusu */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span>{kanal === 'WHATSAPP' ? 'WhatsApp Önizleme' : 'SMS Ekranı'}</span>
              <span className="text-slate-500 font-mono">({telefon || 'Telefon belirtilmedi'})</span>
            </div>
            <div className={`p-3 rounded-xl max-w-lg ${
              kanal === 'WHATSAPP' 
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-950' 
                : 'bg-blue-50 border border-blue-200 text-blue-950'
            }`}>
              <p className="whitespace-pre-wrap leading-relaxed text-xs">
                {mesaj || 'Mesaj içeriği buraya yansıyacaktır...'}
              </p>
              <div className="text-[9px] text-slate-450 text-right mt-1.5">
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • İletildi
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Vazgeç
          </button>

          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleSaveAndSend(false)}
              className="w-full sm:w-auto px-5 py-3 sm:py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-350 text-xs font-bold transition-all cursor-pointer"
            >
              Kuyruğa Kaydet
            </button>

            <button
              type="button"
              onClick={() => handleSaveAndSend(true)}
              className="w-full sm:w-auto px-6 py-3 sm:py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{kanal === 'WHATSAPP' ? 'WhatsApp Aç' : 'Hemen Gönder'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

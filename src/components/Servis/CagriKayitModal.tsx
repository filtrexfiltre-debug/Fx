import React, { useState, useEffect } from 'react';
import { 
  X, 
  PhoneCall, 
  Calendar, 
  Clock, 
  User, 
  Wrench, 
  AlertCircle, 
  CheckCircle2, 
  Truck, 
  MessageSquare,
  Sparkles, 
  PhoneForwarded,
  Cpu
} from 'lucide-react';
import { 
  MusteriCihazi, 
  CagriAramaKaydi, 
  CagriGorusmeDurumu, 
  Personel, 
  ServisFisi, 
  ServisBildirim,
  Cari
} from '../../types';
import { fxApi, branchContext } from '../../services/api';
import { Branch } from '../../types/fx';

interface CagriKayitModalProps {
  isOpen: boolean;
  onClose: () => void;
  cihaz?: MusteriCihazi | null;
  cariler?: Cari[];
  cihazlar?: MusteriCihazi[];
  currentUser?: Personel | null;
  personeller: Personel[];
  aramaKayitlari: CagriAramaKaydi[];
  onKaydetArama: (
    arama: Omit<CagriAramaKaydi, 'id'>, 
    yeniServis?: Omit<ServisFisi, 'id'>,
    bildirim?: Omit<ServisBildirim, 'id'>
  ) => void;
}

export const CagriKayitModal: React.FC<CagriKayitModalProps> = ({
  isOpen,
  onClose,
  cihaz: initialCihaz,
  cariler = [],
  cihazlar = [],
  currentUser,
  personeller,
  aramaKayitlari,
  onKaydetArama
}) => {
  // Selected Cari / Device fallback when opened globally
  const [selectedCariId, setSelectedCariId] = useState<string>(
    initialCihaz?.cariId || (cariler && cariler.length > 0 ? cariler[0]?.id : '') || ''
  );
  const [selectedCihazId, setSelectedCihazId] = useState<string>(
    initialCihaz?.id || ''
  );

  const [branches, setBranches] = useState<Branch[]>([]);
  const activeBranchId = branchContext.getSelectedBranchId();
  const [selectedBranchId, setSelectedBranchId] = useState(
    activeBranchId === 'all' ? '' : activeBranchId
  );

  useEffect(() => {
    setBranches(fxApi.getBranches());
  }, []);

  const activeCari = cariler.find(c => c.id === selectedCariId);
  const availableDevices = cihazlar.filter(c => c.cariId === selectedCariId);
  const activeCihaz = initialCihaz || cihazlar.find(c => c.id === selectedCihazId) || (availableDevices && availableDevices.length > 0 ? availableDevices[0] : null);

  // Update device when cari changes if not pre-locked
  useEffect(() => {
    if (!initialCihaz && selectedCariId) {
      const match = cihazlar.find(c => c.cariId === selectedCariId);
      setSelectedCihazId(match?.id || '');
    }
  }, [selectedCariId, initialCihaz, cihazlar]);

  const targetCihazId = activeCihaz?.id || 'cihaz-genel';
  const targetCihazAdi = activeCihaz?.cihazAdi || 'Genel Su Arıtma & Filtrasyon Sistemi';
  const targetCariId = initialCihaz?.cariId || selectedCariId || activeCihaz?.cariId || 'c-genel';
  const targetCariTitle = initialCihaz?.cariTitle || activeCari?.title || activeCihaz?.cariTitle || 'Müşteri';
  const targetTelefon = initialCihaz?.yetkiliTelefon || activeCihaz?.yetkiliTelefon || activeCari?.phone || activeCari?.phone2 || '0555 123 45 67';
  const targetAdresTipi = initialCihaz?.adresTipi || activeCihaz?.adresTipi || activeCari?.city || 'Merkez Şube';
  const targetIl = initialCihaz?.il || activeCihaz?.il || activeCari?.city || 'İzmir';
  const targetIlce = initialCihaz?.ilce || activeCihaz?.ilce || activeCari?.district || 'Merkez';
  const targetMahalle = initialCihaz?.mahalle || activeCihaz?.mahalle || '';
  const targetAcikAdres = initialCihaz?.acikAdres || activeCihaz?.acikAdres || activeCari?.address || '';
  const targetYetkili = initialCihaz?.yetkiliKisi || activeCihaz?.yetkiliKisi || activeCari?.authorizedPerson || '';

  const previousCalls = aramaKayitlari.filter(a => 
    (activeCihaz && a.cihazId === activeCihaz.id) || 
    (targetCariId && a.cariId === targetCariId)
  );
  const nextCallNumber = previousCalls.length + 1;

  // Form State
  const [durum, setDurum] = useState<CagriGorusmeDurumu>('RANDEVU_ALINDI');
  const [gorusmeNotu, setGorusmeNotu] = useState('');
  const [tekrarAramaTarihi, setTekrarAramaTarihi] = useState('');
  const [otomatikGonder, setOtomatikGonder] = useState(false);
  
  // Appointment specific fields (when durum === 'RANDEVU_ALINDI')
  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 2);
  defaultDate.setHours(10, 0, 0, 0);
  const defaultDateStr = defaultDate.toISOString().slice(0, 16);

  const [randevuTarihi, setRandevuTarihi] = useState(defaultDateStr);
  const technicians = personeller.filter(p => 
    p.department?.toLowerCase().includes('servis') || 
    p.title?.toLowerCase().includes('teknisyen') ||
    p.title?.toLowerCase().includes('mühendis') ||
    p.fullName === 'Caner Yıldız' ||
    p.fullName === 'İsa Açar'
  );
  
  const [selectedTeknisyenId, setSelectedTeknisyenId] = useState(
    (technicians && technicians.length > 0) ? technicians[0].id : 'per-6'
  );

  const selectedTeknisyen = personeller.find(p => p.id === selectedTeknisyenId) || (technicians && technicians.length > 0 ? technicians[0] : null);

  // Map technician to vehicle warehouse and technician cash box
  const getTeknisyenDepo = (tekId: string, tekName?: string) => {
    if (tekName?.includes('Caner') || tekId === 'per-6') {
      return { id: 'd-arac-caner', name: 'Caner Yıldız - 35 FLT 101 Mobil Servis Deposu', kasaId: 'k-saha-caner', kasaName: 'Caner Yıldız Saha Teknisyen Kasası' };
    }
    if (tekName?.includes('İsa') || tekId === 'per-2') {
      return { id: 'd-arac-isa', name: 'İsa Açar - 35 FLT 102 Mobil Servis Deposu', kasaId: 'k-saha-isa', kasaName: 'İsa Açar Saha Teknisyen Kasası' };
    }
    return { id: 'd-arac-caner', name: `${tekName || 'Teknisyen'} Mobil Araç Deposu`, kasaId: 'k-saha-caner', kasaName: `${tekName || 'Teknisyen'} Saha Kasası` };
  };

  const activeTeknisyenInfo = getTeknisyenDepo(selectedTeknisyenId, selectedTeknisyen?.fullName);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const now = new Date();
    const formattedNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const branchToSave = selectedBranchId || (activeCari?.branchId || branches[0]?.id || 'b1111111-1111-1111-1111-111111111111');

    const aramaData: Omit<CagriAramaKaydi, 'id'> = {
      cihazId: targetCihazId,
      cihazAdi: targetCihazAdi,
      cariId: targetCariId,
      cariTitle: targetCariTitle,
      telefon: targetTelefon,
      personelId: currentUser?.id || 'per-5',
      personelAdi: currentUser?.fullName || 'Çağrı Merkezi Yetkilisi',
      aramaTarihi: formattedNow,
      durum,
      tekrarAramaTarihi: durum !== 'RANDEVU_ALINDI' ? tekrarAramaTarihi : undefined,
      gorusmeNotu: gorusmeNotu || (durum === 'RANDEVU_ALINDI' ? `${nextCallNumber}. arama sonrası randevu onaylandı.` : 'Görüşme yapıldı.'),
      branchId: branchToSave
    };

    let yeniServis: Omit<ServisFisi, 'id'> | undefined = undefined;
    let yeniBildirim: Omit<ServisBildirim, 'id'> | undefined = undefined;

    if (durum === 'RANDEVU_ALINDI') {
      const randomCode = Math.floor(1000 + Math.random() * 9000);
      const servisNo = `SRV-2026-${randomCode}`;

      yeniServis = {
        servisNo,
        cihazId: targetCihazId,
        cihazAdi: targetCihazAdi,
        seriNo: activeCihaz?.seriNo || 'SERI-YOK',
        cariId: targetCariId,
        cariTitle: targetCariTitle,
        adresTipi: targetAdresTipi,
        il: targetIl,
        ilce: targetIlce,
        mahalle: targetMahalle,
        acikAdres: targetAcikAdres,
        telefon: targetTelefon,
        yetkili: targetYetkili,
        randevuTarihi: randevuTarihi.replace('T', ' '),
        atananTeknisyenId: selectedTeknisyenId,
        atananTeknisyenAdi: selectedTeknisyen?.fullName || 'Caner Yıldız',
        teknisyenDepoId: activeTeknisyenInfo.id,
        teknisyenDepoAdi: activeTeknisyenInfo.name,
        durum: 'RANDEVU_PLANLANDI',
        odemeTuru: 'ACIK_HESAP',
        tahsilatTutari: 0,
        kasaId: activeTeknisyenInfo.kasaId,
        kasaAdi: activeTeknisyenInfo.kasaName,
        kalemler: [],
        createdAt: now.toISOString().slice(0, 10),
        branchId: branchToSave
      };

      yeniBildirim = {
        cariId: targetCariId,
        cariTitle: targetCariTitle,
        telefon: targetTelefon,
        kanal: 'WHATSAPP',
        tip: 'RANDEVU_BILGISI',
        mesaj: `Sayın ${targetYetkili || targetCariTitle}, ${targetCihazAdi} cihazınız için ${randevuTarihi.replace('T', ' ')} tarihinde bakım randevunuz oluşturulmuştur. Saha Teknisyenimiz: ${selectedTeknisyen?.fullName || 'Caner Yıldız'}.`,
        durum: 'ONAY_BEKLIYOR',
        olusturmaTarihi: formattedNow,
        gonderenKullanici: currentUser?.fullName || 'Çağrı Merkezi',
        branchId: branchToSave
      };
    } else if (durum === 'ULASILAMADI_MESGUL' && otomatikGonder) {
      yeniBildirim = {
        cariId: targetCariId,
        cariTitle: targetCariTitle,
        telefon: targetTelefon,
        kanal: 'WHATSAPP',
        tip: 'ULASILAMADI_BILGISI',
        mesaj: `Sayın ${targetYetkili || targetCariTitle}, Filtrex Su Teknolojileri olarak periyodik filtre değişim ve bakım zamanınız geldiği için sizi aradık ancak ulaşamadık. Müsait olduğunuzda geri dönüşünüzü rica ederiz. İyi günler dileriz.`,
        durum: 'GONDERILDI',
        olusturmaTarihi: formattedNow,
        gonderenKullanici: currentUser?.fullName || 'Çağrı Merkezi',
        branchId: branchToSave
      };
    }

    onKaydetArama(aramaData, yeniServis, yeniBildirim);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-600">
              <PhoneForwarded className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2 font-sans">
                Çağrı & Görüşme Kaydı Ekle
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 font-bold">
                  {nextCallNumber}. Arama
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                {targetCariTitle} &bull; {targetAdresTipi}
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

        {/* Global Cari/Cihaz Selectors if not locked */}
        {!initialCihaz && cariler.length > 0 && (
          <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-500 font-bold mb-1">Müşteri / Cari:</label>
              <select
                value={selectedCariId}
                onChange={e => setSelectedCariId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                {cariler.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-500 font-bold mb-1">İlgili Cihaz / Sistem:</label>
              <select
                value={selectedCihazId}
                onChange={e => setSelectedCihazId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="">-- Genel / Cihaz Belirtilmedi --</option>
                {availableDevices.map(d => (
                  <option key={d.id} value={d.id}>{d.cihazAdi} ({d.adresTipi})</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Previous Calls Alert / History Info */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 text-xs flex items-center justify-between gap-3 text-slate-600">
          <div className="flex items-center gap-2 font-medium">
            <PhoneCall className="w-4 h-4 text-blue-500 shrink-0" />
            <span>
              Önceki Görüşmeler:{' '}
              <strong className="text-slate-800">{previousCalls.length} kez arandı.</strong>{' '}
              {previousCalls.length > 0 && (
                <span className="text-slate-500">
                  (Son arama: {previousCalls?.[0]?.aramaTarihi} - {previousCalls?.[0]?.durum})
                </span>
              )}
            </span>
          </div>
          <div className="text-emerald-600 font-mono font-bold">
            {targetTelefon}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 scrollbar-thin">
          {/* Cihaz & Adres Bilgi Kartı */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <span className="text-slate-400 block font-medium">Cihaz:</span>
              <span className="font-bold text-slate-800">{targetCihazAdi}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Bölge & Konum:</span>
              <span className="font-bold text-slate-800">{targetIl} / {targetIlce}</span>
              <span className="text-slate-600 block text-[11px] truncate" title={targetAcikAdres || targetMahalle}>
                {targetAcikAdres || (targetMahalle ? `${targetMahalle} Mah.` : targetAdresTipi)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Gelecek Bakım:</span>
              <span className="font-bold text-amber-600">{activeCihaz?.gelecekBakimTarihi || 'Periyodik Takip'}</span>
            </div>
          </div>

          {/* Multi-branch selector */}
          {activeBranchId === 'all' && (
            <div className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2 text-xs">
              <label className="block text-indigo-900 font-bold">Aramanın İlişkili Olacağı Şube *</label>
              <select
                value={selectedBranchId}
                onChange={e => setSelectedBranchId(e.target.value)}
                required
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="">-- Şube Seçiniz --</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Görüşme Sonucu Seçimi */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Görüşme Sonucu & Durumu *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setDurum('RANDEVU_ALINDI')}
                className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                  durum === 'RANDEVU_ALINDI'
                    ? 'bg-emerald-50 border-emerald-400 text-slate-900 ring-2 ring-emerald-100'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 className={`w-5 h-5 shrink-0 mt-0.5 ${durum === 'RANDEVU_ALINDI' ? 'text-emerald-500' : 'text-slate-400'}`} />
                <div>
                  <div className="font-bold text-sm text-slate-800">Randevu Alındı</div>
                  <div className="text-xs text-slate-500 mt-0.5 font-medium">Müşteri onayladı, teknisyene iş emri açılacak.</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDurum('DUSUNECEK_TEKRAR_ARA')}
                className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                  durum === 'DUSUNECEK_TEKRAR_ARA'
                    ? 'bg-amber-50 border-amber-400 text-slate-900 ring-2 ring-amber-100'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <Clock className={`w-5 h-5 shrink-0 mt-0.5 ${durum === 'DUSUNECEK_TEKRAR_ARA' ? 'text-amber-500' : 'text-slate-400'}`} />
                <div>
                  <div className="font-bold text-sm text-slate-800">Düşünecek / Tekrar Ara</div>
                  <div className="text-xs text-slate-500 mt-0.5 font-medium">Teklif değerlendiriliyor, ileri tarihte aranacak.</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDurum('ULASILAMADI_MESGUL')}
                className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                  durum === 'ULASILAMADI_MESGUL'
                    ? 'bg-rose-50 border-rose-400 text-slate-900 ring-2 ring-rose-100'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 ${durum === 'ULASILAMADI_MESGUL' ? 'text-rose-500' : 'text-slate-400'}`} />
                <div>
                  <div className="font-bold text-sm text-slate-800">Ulaşılamadı / Meşgul</div>
                  <div className="text-xs text-slate-500 mt-0.5 font-medium">Telefon açılmadı veya meşgule attı.</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDurum('YETKILI_YOKTU')}
                className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                  durum === 'YETKILI_YOKTU'
                    ? 'bg-purple-50 border-purple-400 text-slate-900 ring-2 ring-purple-100'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <User className={`w-5 h-5 shrink-0 mt-0.5 ${durum === 'YETKILI_YOKTU' ? 'text-purple-500' : 'text-slate-400'}`} />
                <div>
                  <div className="font-bold text-sm text-slate-800">Yetkili Yoktu / Sahada</div>
                  <div className="text-xs text-slate-500 mt-0.5 font-medium">Sekreter/Santral çıktı, yetkili dışarıda.</div>
                </div>
              </button>
            </div>
          </div>

          {/* Conditional: Randevu Alındı ise Saha İş Emri Bilgileri */}
          {durum === 'RANDEVU_ALINDI' && (
            <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-250 space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold uppercase tracking-wider">
                <Wrench className="w-4 h-4 text-emerald-600" />
                Otomatik Oluşturulacak Servis İş Emri
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Randevu Tarihi & Saati *
                  </label>
                  <input
                    type="datetime-local"
                    value={randevuTarihi}
                    onChange={e => setRandevuTarihi(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Gidecek Personel / Teknisyen *
                  </label>
                  <select
                    value={selectedTeknisyenId}
                    onChange={e => setSelectedTeknisyenId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-sm focus:border-emerald-500 focus:outline-none cursor-pointer"
                  >
                    {technicians.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.fullName} ({t.title || 'Teknisyen'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Technician's vehicle depot & cash box mapping indicator */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs flex flex-col gap-1.5 text-slate-500 shadow-xs">
                <div className="flex items-center gap-2 text-slate-700 font-semibold">
                  <Truck className="w-3.5 h-3.5 text-blue-500" />
                  <span>Teknisyen Araç Deposu: <strong className="text-slate-900">{activeTeknisyenInfo.name}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-slate-700 font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Teknisyen Saha Kasası: <strong className="text-slate-900">{activeTeknisyenInfo.kasaName}</strong></span>
                </div>
                <span className="text-[11px] text-slate-400 font-medium mt-0.5">
                  * Parça çıkışları teknisyenin kendi araç deposundan düşecek, nakit tahsilat teknisyenin kendi kasasına girecektir.
                </span>
              </div>
            </div>
          )}

          {/* Conditional: Tekrar Arama Tarihi */}
          {durum !== 'RANDEVU_ALINDI' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Tekrar Aranacağı Tarih
                </label>
                <input
                  type="date"
                  value={tekrarAramaTarihi}
                  onChange={e => setTekrarAramaTarihi(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              {durum === 'ULASILAMADI_MESGUL' && (
                <label className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50/50 border border-emerald-200 cursor-pointer hover:bg-emerald-50 select-none">
                  <input
                    type="checkbox"
                    checked={otomatikGonder}
                    onChange={e => setOtomatikGonder(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-emerald-800 block">WhatsApp Bilgilendirmesi Gönder</span>
                    <span className="text-[11px] text-emerald-600 font-medium">Ulaşılamadı şablon mesajı otomatik hazırlanacak ve WhatsApp açılacaktır.</span>
                  </div>
                </label>
              )}
            </div>
          )}

          {/* Görüşme Notu */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Görüşme Notları / Müşteri Talebi *
            </label>
            <textarea
              rows={3}
              value={gorusmeNotu}
              onChange={e => setGorusmeNotu(e.target.value)}
              placeholder="Müşteri ne söyledi? Örnek: Fiyat yüksek dedi, müdürüne soracak veya perşembe 14:00 için onay verdi..."
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-sm focus:border-blue-500 focus:outline-none placeholder:text-slate-400 resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold rounded-xl bg-slate-200 text-slate-700 hover:bg-slate-350 transition-colors cursor-pointer"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              className={`px-6 py-2.5 text-xs font-bold rounded-xl text-white shadow-md transition-all flex items-center gap-2 cursor-pointer ${
                durum === 'RANDEVU_ALINDI'
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-100'
                  : 'bg-blue-600 hover:bg-blue-500 shadow-blue-100'
              }`}
            >
              {durum === 'RANDEVU_ALINDI' ? (
                <>
                  <Wrench className="w-4 h-4" />
                  Randevuyu Kaydet & Servis Fişi Aç
                </>
              ) : (
                <>
                  <PhoneCall className="w-4 h-4" />
                  Arama Kaydını Tamamla
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

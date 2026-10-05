import React, { useState, useEffect } from 'react';
import { X, Cpu, Trash2, CheckCircle2, Save, Calendar, RotateCw, Clock, AlertCircle } from 'lucide-react';
import { Cari, MusteriCihazi } from '../../types';
import { fxApi, branchContext } from '../../services/api';
import { Branch } from '../../types/fx';
import { getServiceTypeLabel } from '../../lib/serviceUtils';

interface CihazTanimModalProps {
  isOpen: boolean;
  onClose: () => void;
  cariler: Cari[];
  editingCihaz?: MusteriCihazi | null;
  onKaydetCihaz: (cihaz: Omit<MusteriCihazi, 'id'>, editId?: string) => void;
  onDeleteCihaz?: (cihazId: string) => void;
}

export const CihazTanimModal: React.FC<CihazTanimModalProps> = ({
  isOpen,
  onClose,
  cariler,
  editingCihaz,
  onKaydetCihaz,
  onDeleteCihaz,
}) => {
  const defaultCari = cariler?.[0];

  const [cariId, setCariId] = useState(defaultCari?.id || '');
  const selectedCari = cariler.find(c => c.id === cariId) || defaultCari;

  const [branches, setBranches] = useState<Branch[]>([]);
  const activeBranchId = branchContext.getSelectedBranchId();
  const [selectedBranchId, setSelectedBranchId] = useState(
    activeBranchId === 'all' ? '' : activeBranchId
  );

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

  const [adresTipi, setAdresTipi] = useState('Merkez Fabrika');
  const [il, setIl] = useState(selectedCari?.city || 'İzmir');
  const [ilce, setIlce] = useState(selectedCari?.district || 'Buca');
  const [mahalle, setMahalle] = useState(selectedCari?.neighborhood || 'Buca OSB Mah.');
  const [acikAdres, setAcikAdres] = useState(selectedCari?.address || '');
  const [yetkiliKisi, setYetkiliKisi] = useState(selectedCari?.authorizedPerson || '');
  const [yetkiliTelefon, setYetkiliTelefon] = useState(selectedCari?.phone ? (formatPhoneNumber(selectedCari.phone) || selectedCari.phone) : '+90');

  const [cihazAdi, setCihazAdi] = useState('');
  const [seriNo, setSeriNo] = useState('');
  const [montajTarihi, setMontajTarihi] = useState(new Date().toISOString().slice(0, 10));
  const [sonBakimTarihi, setSonBakimTarihi] = useState(new Date().toISOString().slice(0, 10));
  const [bakimPeriyoduAy, setBakimPeriyoduAy] = useState(6);
  const [gelecekBakimTarihi, setGelecekBakimTarihi] = useState('');
  const [autoRecalculate, setAutoRecalculate] = useState(true);
  const [servisTuru, setServisTuru] = useState('Periyodik Bakım & Filtre Değişimi');
  const [ozelNotlar, setOzelNotlar] = useState('');

  useEffect(() => {
    setBranches(fxApi.getBranches());
  }, []);

  const calculateGelecekBakim = (baseDate: string, periyotAy: number) => {
    if (!baseDate) return new Date().toISOString().slice(0, 10);
    const d = new Date(baseDate);
    if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
    d.setMonth(d.getMonth() + periyotAy);
    return d.toISOString().slice(0, 10);
  };

  // Sync state with editingCihaz or new device reset whenever modal opens or editingCihaz changes
  useEffect(() => {
    if (!isOpen) return;

    if (editingCihaz) {
      setCariId(editingCihaz.cariId || '');
      setSelectedBranchId(editingCihaz.branchId || '');
      setAdresTipi(editingCihaz.adresTipi || 'Merkez Fabrika');
      setIl(editingCihaz.il || '');
      setIlce(editingCihaz.ilce || '');
      setMahalle(editingCihaz.mahalle || '');
      setAcikAdres(editingCihaz.acikAdres || '');
      setYetkiliKisi(editingCihaz.yetkiliKisi || '');
      setYetkiliTelefon(editingCihaz.yetkiliTelefon ? formatPhoneNumber(editingCihaz.yetkiliTelefon) : '+90');
      setCihazAdi(editingCihaz.cihazAdi || '');
      setSeriNo(editingCihaz.seriNo || '');
      const mDate = editingCihaz.montajTarihi || new Date().toISOString().slice(0, 10);
      const sDate = editingCihaz.sonBakimTarihi || mDate;
      const pAy = editingCihaz.bakimPeriyoduAy || 6;
      setMontajTarihi(mDate);
      setSonBakimTarihi(sDate);
      setBakimPeriyoduAy(pAy);
      setGelecekBakimTarihi(editingCihaz.gelecekBakimTarihi || calculateGelecekBakim(sDate, pAy));
      setAutoRecalculate(true);
      setServisTuru(getServiceTypeLabel(editingCihaz.servisTuru || 'PERIYODIK_BAKIM'));
      setOzelNotlar(editingCihaz.ozelNotlar || '');
    } else {
      const initialCari = cariler?.[0];
      setCariId(initialCari?.id || '');
      const activeB = branchContext.getSelectedBranchId();
      setSelectedBranchId(activeB === 'all' ? '' : activeB);
      setAdresTipi('Merkez Fabrika');
      setIl(initialCari?.city || 'İzmir');
      setIlce(initialCari?.district || 'Buca');
      setMahalle(initialCari?.neighborhood || 'Buca OSB Mah.');
      setAcikAdres(initialCari?.address || '');
      setYetkiliKisi(initialCari?.authorizedPerson || '');
      setYetkiliTelefon(initialCari?.phone ? (formatPhoneNumber(initialCari.phone) || initialCari.phone) : '+90');
      setCihazAdi('');
      setSeriNo('');
      const todayStr = new Date().toISOString().slice(0, 10);
      setMontajTarihi(todayStr);
      setSonBakimTarihi(todayStr);
      setBakimPeriyoduAy(6);
      setGelecekBakimTarihi(calculateGelecekBakim(todayStr, 6));
      setAutoRecalculate(true);
      setServisTuru('Periyodik Bakım & Filtre Değişimi');
      setOzelNotlar('');
    }
  }, [isOpen, editingCihaz, cariler]);

  if (!isOpen) return null;

  // Handle Cari Change
  const handleCariChange = (newCariId: string) => {
    setCariId(newCariId);
    const c = cariler.find(item => item.id === newCariId);
    if (c) {
      setIl(c.city || 'İzmir');
      setIlce(c.district || '');
      setMahalle(c.neighborhood || '');
      setAcikAdres(c.address || '');
      setYetkiliKisi(c.authorizedPerson || '');
      setYetkiliTelefon(c.phone ? (formatPhoneNumber(c.phone) || c.phone) : '+90');
    }
  };

  const handleMontajDateChange = (val: string) => {
    setMontajTarihi(val);
    if (sonBakimTarihi === montajTarihi || !sonBakimTarihi) {
      setSonBakimTarihi(val);
      setGelecekBakimTarihi(calculateGelecekBakim(val, bakimPeriyoduAy));
      setAutoRecalculate(true);
    }
  };

  const handleSonBakimDateChange = (val: string) => {
    setSonBakimTarihi(val);
    setGelecekBakimTarihi(calculateGelecekBakim(val, bakimPeriyoduAy));
    setAutoRecalculate(true);
  };

  const handlePeriyotChange = (val: number) => {
    const validVal = Math.max(1, val);
    setBakimPeriyoduAy(validVal);
    const base = sonBakimTarihi || montajTarihi || new Date().toISOString().slice(0, 10);
    setGelecekBakimTarihi(calculateGelecekBakim(base, validVal));
    setAutoRecalculate(true);
  };

  const handleForceRecalculate = () => {
    const base = sonBakimTarihi || montajTarihi || new Date().toISOString().slice(0, 10);
    setGelecekBakimTarihi(calculateGelecekBakim(base, bakimPeriyoduAy));
    setAutoRecalculate(true);
  };

  const handleCompleteMaintenanceToday = () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    setSonBakimTarihi(todayStr);
    setGelecekBakimTarihi(calculateGelecekBakim(todayStr, bakimPeriyoduAy));
    setAutoRecalculate(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cihazAdi.trim()) {
      alert('Lütfen cihaz adını giriniz.');
      return;
    }

    const finalSonBakim = sonBakimTarihi || montajTarihi || new Date().toISOString().slice(0, 10);
    const finalGelecekBakim = (autoRecalculate || !gelecekBakimTarihi)
      ? calculateGelecekBakim(finalSonBakim, bakimPeriyoduAy)
      : gelecekBakimTarihi;
    const branchToSave = selectedBranchId || (selectedCari?.branchId || branches[0]?.id || 'b1111111-1111-1111-1111-111111111111');

    onKaydetCihaz({
      cariId: selectedCari?.id || cariId,
      cariTitle: selectedCari?.title || editingCihaz?.cariTitle || '',
      adresTipi,
      il,
      ilce,
      mahalle,
      acikAdres,
      yetkiliKisi,
      yetkiliTelefon,
      cihazAdi,
      seriNo: seriNo || (editingCihaz?.seriNo ? editingCihaz.seriNo : `SN-${Date.now().toString().slice(-6)}`),
      montajTarihi,
      bakimPeriyoduAy,
      sonBakimTarihi: finalSonBakim,
      gelecekBakimTarihi: finalGelecekBakim,
      durum: editingCihaz?.durum || 'AKTIF',
      ozelNotlar,
      branchId: branchToSave,
      servisTuru: getServiceTypeLabel(servisTuru)
    }, editingCihaz?.id);

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${editingCihaz ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-blue-50 border-blue-200 text-blue-600'}`}>
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-800 font-sans">
                {editingCihaz ? 'Müşteri Cihaz Kartını Düzenle / Güncelle' : 'Yeni Cihaz & Şube Tanımla'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                {editingCihaz
                  ? `${editingCihaz.cihazAdi} (S/N: ${editingCihaz.seriNo}) bilgilerini ve bakım döngüsünü güncelleyin.`
                  : 'Müşteriye ve şubesine ait filtre/arıtma cihazını periyodik bakım takibine ekleyin.'}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Müşteri Seçimi */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Müşteri (Cari Hesap) *
            </label>
            <select
              value={cariId}
              onChange={e => handleCariChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-sm focus:border-indigo-500 focus:outline-none cursor-pointer font-medium"
            >
              {cariler.map(c => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.title}
                </option>
              ))}
            </select>
          </div>

          {/* Multi-branch selector inside the form */}
          {activeBranchId === 'all' && (
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl space-y-1.5 text-xs text-indigo-950 font-medium">
              <label className="block text-[11px] font-bold text-indigo-900">Şube Ataması *</label>
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
              <span className="text-[10px] text-slate-400 font-normal">Bu cihazın ekleneceği ve takibinin yapılacağı şubeyi seçiniz.</span>
            </div>
          )}

          {/* Adres Tipi / Şube / Bayi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Şube / Adres Tipi *
              </label>
              <input
                type="text"
                value={adresTipi}
                onChange={e => setAdresTipi(e.target.value)}
                placeholder="Örn: Buca Fabrika, Tuzla Şube, Depo Kazan Dairesi"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                İl / Şehir *
              </label>
              <input
                type="text"
                value={il}
                onChange={e => setIl(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                İlçe *
              </label>
              <input
                type="text"
                value={ilce}
                onChange={e => setIlce(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Mahalle / Semt *
              </label>
              <input
                type="text"
                value={mahalle}
                onChange={e => setMahalle(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Açık Adres Detayı
            </label>
            <input
              type="text"
              value={acikAdres}
              onChange={e => setAcikAdres(e.target.value)}
              placeholder="Cadde, sokak, no, bina bilgisi"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Şube / Tesis Yetkili Kişi
              </label>
              <input
                type="text"
                value={yetkiliKisi}
                onChange={e => setYetkiliKisi(e.target.value)}
                placeholder="Örn: Ahmet Bey"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Yetkili Telefon
              </label>
              <input
                type="tel"
                inputMode="tel"
                maxLength={19}
                value={yetkiliTelefon}
                onFocus={() => {
                  if (!yetkiliTelefon || yetkiliTelefon.trim() === '') {
                    setYetkiliTelefon('+90');
                  }
                }}
                onChange={e => setYetkiliTelefon(formatPhoneNumber(e.target.value))}
                placeholder="+90 (5XX) XXX XX XX"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-sm focus:border-indigo-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Cihaz Özellikleri */}
          <div className="pt-2 border-t border-slate-200 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Cihaz / Sistem Adı *
                </label>
                <input
                  type="text"
                  value={cihazAdi}
                  onChange={e => setCihazAdi(e.target.value)}
                  placeholder="Örn: RO-500 Ters Ozmoz Sistemi"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-sm focus:border-indigo-500 focus:outline-none font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Seri Numarası
                </label>
                <input
                  type="text"
                  value={seriNo}
                  onChange={e => setSeriNo(e.target.value)}
                  placeholder="Örn: RO-2026-9901"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-sm focus:border-indigo-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Montaj / İlk Kurulum Tarihi *
                </label>
                <input
                  type="date"
                  value={montajTarihi}
                  onChange={e => handleMontajDateChange(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center justify-between">
                  <span>Son Yapılan Bakım Tarihi *</span>
                  <button
                    type="button"
                    onClick={handleCompleteMaintenanceToday}
                    className="text-[10px] text-indigo-600 hover:text-indigo-700 font-bold cursor-pointer bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-md border border-indigo-200 transition-colors"
                    title="Son bakımı bugünün tarihi olarak ayarlar ve bir sonraki bakım tarihini periyoda göre anında yeniler"
                  >
                    Bugün Yapıldı & Yenile
                  </button>
                </label>
                <input
                  type="date"
                  value={sonBakimTarihi}
                  onChange={e => handleSonBakimDateChange(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Periyodik Bakım Aralığı (Ay) *
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={bakimPeriyoduAy}
                    onChange={e => handlePeriyotChange(Number(e.target.value) || 1)}
                    required
                    placeholder="Örn: 6, 10, 12"
                    className="w-full pl-3.5 pr-20 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-sm focus:border-indigo-500 focus:outline-none font-bold"
                    title="Bakım periyodunu ay sayısı olarak giriniz (Örn: 10)"
                  />
                  <div className="absolute right-3 pointer-events-none text-xs text-slate-500 font-bold bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                    Ayda Bir
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-600">
                    Gelecek Bakım Tarihi *
                  </label>
                  <button
                    type="button"
                    onClick={handleForceRecalculate}
                    className="inline-flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-700 font-bold cursor-pointer"
                    title="Son bakım tarihi + periyoda göre yeniden hesapla"
                  >
                    <RotateCw className="w-3 h-3" />
                    <span>Yeniden Hesapla</span>
                  </button>
                </div>
                <input
                  type="date"
                  value={gelecekBakimTarihi}
                  onChange={e => {
                    setGelecekBakimTarihi(e.target.value);
                    setAutoRecalculate(false);
                  }}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-indigo-50/50 border border-indigo-200 text-indigo-950 text-sm font-bold focus:border-indigo-500 focus:outline-none"
                />
                <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500 font-medium">
                  <span>Hesaplanan: {calculateGelecekBakim(sonBakimTarihi || montajTarihi, bakimPeriyoduAy)}</span>
                  {!autoRecalculate && (
                    <button
                      type="button"
                      onClick={handleForceRecalculate}
                      className="text-indigo-600 hover:underline font-bold"
                    >
                      Otomatik Eşitle
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1">
                <span>Servis Türü</span>
                <span className="text-rose-500 font-bold">*</span>
              </label>
              <select
                value={servisTuru}
                onChange={e => setServisTuru(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-sm focus:border-indigo-500 focus:outline-none font-medium cursor-pointer"
              >
                <option value="Periyodik Bakım & Filtre Değişimi">Periyodik Bakım & Filtre Değişimi</option>
                <option value="Filtre Değişimi">Filtre Değişimi</option>
                <option value="Arıza & Onarım">Arıza & Onarım</option>
                <option value="Montaj & Yeni Kurulum">Montaj & Yeni Kurulum</option>
                <option value="Keşif & Su Analizi">Keşif & Su Analizi</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Özel Teknik Notlar (Filtre tipi, membran çapı, kovan basıncı vb.)
              </label>
              <textarea
                rows={2}
                value={ozelNotlar}
                onChange={e => setOzelNotlar(e.target.value)}
                placeholder="Giriş basıncı 4 bar, 4040 DOW Filmtec membran..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-sm focus:border-indigo-500 focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-bold rounded-xl bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors cursor-pointer"
              >
                İptal
              </button>
              {editingCihaz && onDeleteCihaz && (
                <button
                  type="button"
                  onClick={() => onDeleteCihaz(editingCihaz.id)}
                  className="px-3.5 py-2.5 text-xs font-bold rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Cihazı Sil
                </button>
              )}
            </div>
            <button
              type="submit"
              className="px-6 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100 transition-all flex items-center gap-2 cursor-pointer"
            >
              {editingCihaz ? (
                <>
                  <Save className="w-4 h-4" />
                  Değişiklikleri Güncelle
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Cihazı Kaydet & Periyodik Bakıma Ekle
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

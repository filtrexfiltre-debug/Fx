import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Wrench, 
  PhoneCall, 
  MessageCircle, 
  Search, 
  ArrowUpDown, 
  RotateCcw, 
  MapPin, 
  Cpu, 
  User, 
  Check, 
  TrendingUp, 
  AlertTriangle, 
  SlidersHorizontal,
  Table as TableIcon,
  Download,
  History,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Building,
  Home
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { MusteriCihazi, ServisFisi, CagriAramaKaydi, Cari } from '../../types';

interface BakimGanttChartProps {
  cihazlar: MusteriCihazi[];
  servisler: ServisFisi[];
  cagriAramalari: CagriAramaKaydi[];
  cariler: Cari[];
  todayDateStr?: string;
  onOpenYeniServis: (cihaz: MusteriCihazi) => void;
  onOpenCagriModal: (cihaz: MusteriCihazi) => void;
  onOpenGecmisModal: (cihaz: MusteriCihazi) => void;
  onOpenWhatsAppDirect: (cihaz: MusteriCihazi) => void;
  onOpenEditServis?: (servis: ServisFisi) => void;
  onUpdateCihazServisTuru?: (cihazId: string, servisTuru: string) => void;
  onViewCommunicationHistory?: (cariTitle: string) => void;
}

export type BakimUrgencyCategory = 'ALL' | 'GECIKTI' | 'COK_YAKIN' | 'YAKIN' | 'BU_AY' | 'GELECEK';
export type ViewMode = 'TABLE' | 'CARDS';

export const BakimGanttChart: React.FC<BakimGanttChartProps> = ({
  cihazlar,
  servisler,
  cagriAramalari,
  cariler,
  todayDateStr = '2026-03-01',
  onOpenYeniServis,
  onOpenCagriModal,
  onOpenGecmisModal,
  onOpenWhatsAppDirect,
  onOpenEditServis,
  onUpdateCihazServisTuru,
  onViewCommunicationHistory
}) => {
  const [filterCategory, setFilterCategory] = useState<BakimUrgencyCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIl, setSelectedIl] = useState<string>('ALL');
  const [selectedPeriyot, setSelectedPeriyot] = useState<string>('ALL');
  const [selectedServisTuru, setSelectedServisTuru] = useState<string>('ALL');
  const [selectedRandevuDurumu, setSelectedRandevuDurumu] = useState<'ALL' | 'HAS_APPOINTMENT' | 'NO_APPOINTMENT'>('ALL');
  const [sortBy, setSortBy] = useState<'URGENCY' | 'DATE_ASC' | 'DATE_DESC' | 'CLIENT' | 'PROGRESS'>('URGENCY');
  const [viewMode, setViewMode] = useState<ViewMode>('TABLE');
  
  // Selection state for batch operations
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Pagination for Table View
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  const today = useMemo(() => new Date(todayDateStr), [todayDateStr]);

  // Fast Cari lookup map
  const cariMap = useMemo(() => {
    const map = new Map<string, Cari>();
    (cariler || []).forEach(c => {
      if (c.id) map.set(c.id, c);
    });
    return map;
  }, [cariler]);

  // Distinct Iller
  const distinctIller = useMemo(() => {
    const set = new Set<string>();
    cihazlar.forEach(c => {
      if (c.il) set.add(c.il);
    });
    return Array.from(set).sort();
  }, [cihazlar]);

  // Process and enrich device data with maintenance calculations
  const enrichedCihazlar = useMemo(() => {
    return cihazlar.map(c => {
      const dueDate = new Date(c.gelecekBakimTarihi);
      const lastDate = new Date(c.sonBakimTarihi || c.montajTarihi);
      
      const diffMs = dueDate.getTime() - today.getTime();
      const diffDays = Math.round(diffMs / (1000 * 3600 * 24));
      
      let category: BakimUrgencyCategory = 'GELECEK';
      let urgencyScore = 0; // Higher = more urgent

      if (diffDays < 0) {
        category = 'GECIKTI';
        urgencyScore = 1000 + Math.abs(diffDays); // Most delayed first
      } else if (diffDays <= 7) {
        category = 'COK_YAKIN';
        urgencyScore = 500 + (7 - diffDays);
      } else if (diffDays <= 15) {
        category = 'YAKIN';
        urgencyScore = 300 + (15 - diffDays);
      } else if (diffDays <= 30) {
        category = 'BU_AY';
        urgencyScore = 100 + (30 - diffDays);
      } else {
        category = 'GELECEK';
        urgencyScore = 10;
      }

      // Check if an active open service slip exists for this device
      const activeSlip = servisler.find(s => 
        s.cihazId === c.id && 
        (s.durum === 'RANDEVU_PLANLANDI' || s.durum === 'YOLDA_SAHADA' || s.durum === 'BEKLEMEDE')
      );

      if (activeSlip) {
        urgencyScore += 2500; // Place active scheduled devices at the absolute top of the list!
      }

      // Total cycle days
      const totalCycleMs = Math.max(1000 * 3600 * 24 * 30, dueDate.getTime() - lastDate.getTime());
      const elapsedMs = today.getTime() - lastDate.getTime();
      const progressPercent = Math.min(100, Math.max(0, Math.round((elapsedMs / totalCycleMs) * 100)));

      // Calls count & last call note
      const calls = cagriAramalari.filter(a => a.cihazId === c.id);
      const lastCall = calls.length > 0 ? calls[calls.length - 1] : null;

      // Cari details
      const cari = cariMap.get(c.cariId);

      // Servis Türü belirleme
      const slipTipi = activeSlip?.servisTipi;
      let displayServisTuru = c.servisTuru;
      if (slipTipi) {
        if (slipTipi.toLowerCase().includes('arıza') || slipTipi.toLowerCase().includes('ariza')) {
          displayServisTuru = 'Arıza & Onarım';
        } else if (slipTipi.toLowerCase().includes('montaj') || slipTipi.toLowerCase().includes('kurulum')) {
          displayServisTuru = 'Montaj & Yeni Kurulum';
        } else if (slipTipi.toLowerCase().includes('keşif') || slipTipi.toLowerCase().includes('kesif')) {
          displayServisTuru = 'Keşif & Su Analizi';
        } else {
          displayServisTuru = 'Periyodik Bakım & Filtre Değişimi';
        }
      }
      if (!displayServisTuru) {
        displayServisTuru = 'Periyodik Bakım & Filtre Değişimi';
      }

      return {
        ...c,
        cari,
        dueDate,
        lastDate,
        diffDays,
        category,
        urgencyScore,
        activeSlip,
        progressPercent,
        callsCount: calls.length,
        lastCall,
        displayServisTuru
      };
    });
  }, [cihazlar, servisler, cagriAramalari, cariMap, today]);

  // Overall Statistics
  const stats = useMemo(() => {
    const total = enrichedCihazlar.length;
    const gecikenler = enrichedCihazlar.filter(c => c.category === 'GECIKTI');
    const cokYakinlar = enrichedCihazlar.filter(c => c.category === 'COK_YAKIN');
    const yakinlar = enrichedCihazlar.filter(c => c.category === 'YAKIN');
    const buAylar = enrichedCihazlar.filter(c => c.category === 'BU_AY');
    const gelecekler = enrichedCihazlar.filter(c => c.category === 'GELECEK');
    const withActiveSlips = enrichedCihazlar.filter(c => c.activeSlip);

    const maxGecikmeGunu = gecikenler.reduce((max, c) => Math.max(max, Math.abs(c.diffDays)), 0);

    return {
      total,
      gecikenlerCount: gecikenler.length,
      cokYakinCount: cokYakinlar.length,
      yakinCount: yakinlar.length,
      buAyCount: buAylar.length,
      gelecekCount: gelecekler.length,
      withActiveSlipsCount: withActiveSlips.length,
      maxGecikmeGunu
    };
  }, [enrichedCihazlar]);

  // Filter & Sort
  const filteredCihazlar = useMemo(() => {
    let result = enrichedCihazlar;

    // Filter by category
    if (filterCategory !== 'ALL') {
      result = result.filter(c => c.category === filterCategory);
    }

    // Filter by city
    if (selectedIl !== 'ALL') {
      result = result.filter(c => c.il === selectedIl);
    }

    // Filter by period
    if (selectedPeriyot !== 'ALL') {
      result = result.filter(c => String(c.bakimPeriyoduAy) === selectedPeriyot);
    }

    // Filter by service type
    if (selectedServisTuru !== 'ALL') {
      result = result.filter(c => c.displayServisTuru === selectedServisTuru);
    }

    // Filter by appointment status
    if (selectedRandevuDurumu === 'HAS_APPOINTMENT') {
      result = result.filter(c => Boolean(c.activeSlip));
    } else if (selectedRandevuDurumu === 'NO_APPOINTMENT') {
      result = result.filter(c => !c.activeSlip);
    }

    // Filter by text search
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(c => 
        (c.cariTitle && c.cariTitle.toLowerCase().includes(q)) ||
        (c.cihazAdi && c.cihazAdi.toLowerCase().includes(q)) ||
        (c.markaModel && c.markaModel.toLowerCase().includes(q)) ||
        (c.seriNo && c.seriNo.toLowerCase().includes(q)) ||
        (c.yetkiliTelefon && c.yetkiliTelefon.includes(q)) ||
        (c.ilce && c.ilce.toLowerCase().includes(q)) ||
        (c.il && c.il.toLowerCase().includes(q)) ||
        (c.mahalle && c.mahalle.toLowerCase().includes(q)) ||
        (c.acikAdres && c.acikAdres.toLowerCase().includes(q)) ||
        (c.adresTipi && c.adresTipi.toLowerCase().includes(q))
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      if (sortBy === 'URGENCY') {
        return b.urgencyScore - a.urgencyScore;
      }
      if (sortBy === 'DATE_ASC') {
        return a.dueDate.getTime() - b.dueDate.getTime();
      }
      if (sortBy === 'DATE_DESC') {
        return b.dueDate.getTime() - a.dueDate.getTime();
      }
      if (sortBy === 'PROGRESS') {
        return b.progressPercent - a.progressPercent;
      }
      if (sortBy === 'CLIENT') {
        return (a.cariTitle || '').localeCompare(b.cariTitle || '', 'tr');
      }
      return 0;
    });

    return result;
  }, [enrichedCihazlar, filterCategory, selectedIl, selectedPeriyot, selectedServisTuru, selectedRandevuDurumu, searchQuery, sortBy]);

  // Paginated list for Table view
  const paginatedCihazlar = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredCihazlar.slice(startIndex, startIndex + pageSize);
  }, [filteredCihazlar, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredCihazlar.length / pageSize) || 1;

  // Toggle selection
  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredCihazlar.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCihazlar.map(c => c.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Export to Excel
  const handleExportExcel = () => {
    const dataToExport = filteredCihazlar.map((c, index) => ({
      'Sıra': index + 1,
      'Müşteri Ünvanı': c.cariTitle || '',
      'Adres Tipi': c.adresTipi || 'Merkez Adres',
      'Telefon': c.yetkiliTelefon || (c.cari?.phone || ''),
      'İl / İlçe': `${c.il || ''} / ${c.ilce || ''}`,
      'Mahalle / Adres': c.acikAdres || c.mahalle || '',
      'Cihaz Adı': c.cihazAdi || '',
      'Marka / Model': c.markaModel || '',
      'Servis Türü': c.displayServisTuru,
      'Seri No': c.seriNo || '',
      'Bakım Periyodu (Ay)': c.bakimPeriyoduAy,
      'Son Bakım Tarihi': c.sonBakimTarihi || '-',
      'Gelecek Bakım Tarihi': c.gelecekBakimTarihi,
      'Kalan / Gecikme Günü': c.diffDays < 0 ? `${Math.abs(c.diffDays)} Gün Gecikti` : `${c.diffDays} Gün Kaldı`,
      'Bakım Durumu': c.category === 'GECIKTI' ? 'Gecikti' : c.category === 'COK_YAKIN' ? 'Acil (0-7 Gün)' : c.category === 'YAKIN' ? 'Yaklaşan' : 'Normal',
      'Saha Randevusu': c.activeSlip ? `Fiş: ${c.activeSlip.servisNo} (${c.activeSlip.durum})` : 'Açık Fiş Yok',
      'Arama Sayısı': c.callsCount
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Servisler ve Periyodik Bakım');
    XLSX.writeFile(wb, `Servisler_ve_Periyodik_Bakimlar_${todayDateStr}.xlsx`);
  };

  return (
    <div className="space-y-4 font-sans text-slate-800">
      
      {/* 1. Header & Title Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2 font-sans">
                <span>Servisler ve Periyodik Bakımlar</span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold font-mono">
                  {stats.total} Cihaz Takipte
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Müşteri arıtma sistemlerinin periyodik bakım takvimi, gecikme analizi, filtre değişim döngüsü ve saha servis yönetimi.
              </p>
            </div>
          </div>

          {/* View Mode & Actions Switcher */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                const target = selectedIds.length > 0 
                  ? enrichedCihazlar.find(c => c.id === selectedIds[0]) 
                  : enrichedCihazlar[0];
                if (target) onOpenYeniServis(target);
              }}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              title="Seçili veya listedeki ilk cihaza yeni servis / iş emri kaydı oluştur"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Yeni Servis Kaydı Oluştur</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              title="Listeyi Excel (.xlsx) olarak indir"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Excel'e Aktar</span>
            </button>

            <div className="bg-slate-100 border border-slate-200 rounded-xl p-1 flex items-center shadow-inner">
              <button
                type="button"
                onClick={() => setViewMode('TABLE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'TABLE'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                Tablo Görünümü
              </button>

              <button
                type="button"
                onClick={() => setViewMode('CARDS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'CARDS'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Detaylı Kartlar
              </button>
            </div>
          </div>
        </div>

        {/* 2. Interactive Urgency Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 pt-4">
          {/* Card: Tümü */}
          <button
            type="button"
            onClick={() => setFilterCategory('ALL')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
              filterCategory === 'ALL'
                ? 'bg-slate-50 border-indigo-500 ring-1 ring-indigo-200 shadow-sm'
                : 'bg-white border-slate-200 hover:border-slate-350'
            }`}
          >
            <div className="text-[11px] font-bold text-slate-500">Tüm Cihazlar</div>
            <div className="text-xl font-bold font-mono text-slate-800 mt-1">
              {stats.total}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Envanterdeki kayıtlı</div>
          </button>

          {/* Card: Gecikenler */}
          <button
            type="button"
            onClick={() => setFilterCategory('GECIKTI')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
              filterCategory === 'GECIKTI'
                ? 'bg-rose-50 border-rose-500 ring-1 ring-rose-200 shadow-sm'
                : 'bg-rose-50/30 border-rose-200 hover:border-rose-300'
            }`}
          >
            <div className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              Süresi Dolanlar
            </div>
            <div className="text-xl font-bold font-mono text-rose-700 mt-1">
              {stats.gecikenlerCount}
            </div>
            <div className="text-[10px] text-rose-500/90 font-semibold mt-0.5">
              {stats.maxGecikmeGunu > 0 ? `Maks. ${stats.maxGecikmeGunu} gün gecikme` : 'Vakti dolmuş'}
            </div>
          </button>

          {/* Card: Çok Yakın */}
          <button
            type="button"
            onClick={() => setFilterCategory('COK_YAKIN')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
              filterCategory === 'COK_YAKIN'
                ? 'bg-amber-50 border-amber-500 ring-1 ring-amber-200 shadow-sm'
                : 'bg-amber-50/30 border-amber-200 hover:border-amber-300'
            }`}
          >
            <div className="text-[11px] font-bold text-amber-600 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              Acil (0-7 Gün)
            </div>
            <div className="text-xl font-bold font-mono text-amber-700 mt-1">
              {stats.cokYakinCount}
            </div>
            <div className="text-[10px] text-amber-600 font-semibold mt-0.5">Bu hafta içinde</div>
          </button>

          {/* Card: Yaklaşan */}
          <button
            type="button"
            onClick={() => setFilterCategory('YAKIN')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
              filterCategory === 'YAKIN'
                ? 'bg-orange-50 border-orange-400 ring-1 ring-orange-200 shadow-sm'
                : 'bg-orange-50/30 border-orange-200 hover:border-orange-300'
            }`}
          >
            <div className="text-[11px] font-bold text-orange-600 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-orange-500 shrink-0" />
              8 - 15 Gün
            </div>
            <div className="text-xl font-bold font-mono text-orange-700 mt-1">
              {stats.yakinCount}
            </div>
            <div className="text-[10px] text-orange-600 font-semibold mt-0.5">Yaklaşan bakım</div>
          </button>

          {/* Card: Bu Ay */}
          <button
            type="button"
            onClick={() => setFilterCategory('BU_AY')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
              filterCategory === 'BU_AY'
                ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-200 shadow-sm'
                : 'bg-blue-50/30 border-blue-200 hover:border-blue-300'
            }`}
          >
            <div className="text-[11px] font-bold text-blue-600 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              16 - 30 Gün
            </div>
            <div className="text-xl font-bold font-mono text-blue-700 mt-1">
              {stats.buAyCount}
            </div>
            <div className="text-[10px] text-blue-500 font-semibold mt-0.5">Önümüzdeki ay</div>
          </button>

          {/* Card: Randevusu Açılanlar */}
          <button
            type="button"
            onClick={() => {
              setFilterCategory('ALL');
              setSelectedRandevuDurumu(selectedRandevuDurumu === 'HAS_APPOINTMENT' ? 'ALL' : 'HAS_APPOINTMENT');
            }}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
              selectedRandevuDurumu === 'HAS_APPOINTMENT'
                ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-200 shadow-sm'
                : 'bg-emerald-50/30 border-emerald-200 hover:border-emerald-300'
            }`}
          >
            <div className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
              <Wrench className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              Saha Fişi Açık
            </div>
            <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
              {stats.withActiveSlipsCount}
            </div>
            <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Randevu planlandı</div>
          </button>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 flex-wrap">
          {/* Search input */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari ünvan, cihaz adı, marka, seri no, telefon veya ilçe ara..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white border border-slate-300 hover:border-slate-400 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs w-5 h-5 flex items-center justify-center rounded-full hover:bg-slate-100"
              >
                ✕
              </button>
            )}
          </div>

          {/* City Filter */}
          <select
            value={selectedIl}
            onChange={e => {
              setSelectedIl(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-white border border-slate-300 hover:border-slate-400 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="ALL">Tüm İller</option>
            {distinctIller.map(il => (
              <option key={il} value={il}>{il}</option>
            ))}
          </select>

          {/* Period Filter */}
          <select
            value={selectedPeriyot}
            onChange={e => {
              setSelectedPeriyot(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-white border border-slate-300 hover:border-slate-400 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="ALL">Tüm Bakım Periyotları</option>
            <option value="3">3 Aylık Filtre Bakımı</option>
            <option value="6">6 Aylık Filtre Bakımı</option>
            <option value="12">12 Aylık Yıllık Bakım</option>
          </select>

          {/* Servis Türü Filter */}
          <select
            value={selectedServisTuru}
            onChange={e => {
              setSelectedServisTuru(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-white border border-slate-300 hover:border-slate-400 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer font-medium"
          >
            <option value="ALL">Tüm Servis Türleri</option>
            <option value="Periyodik Bakım & Filtre Değişimi">Periyodik Bakım & Filtre</option>
            <option value="Arıza & Onarım">Arıza & Onarım</option>
            <option value="Montaj & Yeni Kurulum">Montaj & Yeni Kurulum</option>
            <option value="Keşif & Su Analizi">Keşif & Su Analizi</option>
          </select>

          {/* Appointment Filter */}
          <select
            value={selectedRandevuDurumu}
            onChange={e => {
              setSelectedRandevuDurumu(e.target.value as any);
              setCurrentPage(1);
            }}
            className="bg-white border border-slate-300 hover:border-slate-400 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="ALL">Tüm Randevu Durumları</option>
            <option value="HAS_APPOINTMENT">Saha Fişi Açılmış Olanlar</option>
            <option value="NO_APPOINTMENT">Henüz Randevu Açılmamış</option>
          </select>
        </div>

        {/* Sort & Reset */}
        <div className="flex items-center gap-2 justify-end">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-white border border-slate-300 hover:border-slate-400 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="URGENCY">Gecikme Durumu (Önce Gecikenler)</option>
              <option value="DATE_ASC">Tarih: En Yakın / Önce Olan</option>
              <option value="DATE_DESC">Tarih: En Uzak</option>
              <option value="PROGRESS">Döngü İlerlemesi (% En Yüksek)</option>
              <option value="CLIENT">Müşteri Ünvanı (A-Z)</option>
            </select>
          </div>

          {(filterCategory !== 'ALL' || selectedIl !== 'ALL' || selectedPeriyot !== 'ALL' || selectedServisTuru !== 'ALL' || selectedRandevuDurumu !== 'ALL' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setFilterCategory('ALL');
                setSelectedIl('ALL');
                setSelectedPeriyot('ALL');
                setSelectedServisTuru('ALL');
                setSelectedRandevuDurumu('ALL');
                setSearchQuery('');
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              title="Filtreleri Sıfırla"
            >
              <RotateCcw className="w-3 h-3" />
              Sıfırla
            </button>
          )}
        </div>
      </div>

      {/* Selected Items Batch Floating Actions */}
      {selectedIds.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex items-center justify-between gap-3 text-xs text-indigo-900 animate-fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
              {selectedIds.length}
            </span>
            <span className="font-semibold">adet cihaz seçildi.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const firstSelected = enrichedCihazlar.find(c => c.id === selectedIds[0]);
                if (firstSelected) onOpenYeniServis({ ...firstSelected, servisTuru: firstSelected.displayServisTuru });
              }}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Wrench className="w-3.5 h-3.5" />
              İş Emri Aç ({selectedIds.length})
            </button>

            <button
              type="button"
              onClick={() => {
                const firstSelected = enrichedCihazlar.find(c => c.id === selectedIds[0]);
                if (firstSelected) onOpenWhatsAppDirect(firstSelected);
              }}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              WhatsApp Hatırlatması Gönder
            </button>

            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 rounded-lg bg-white border border-indigo-200 hover:bg-slate-50 text-indigo-700 text-xs font-bold cursor-pointer"
            >
              Seçimi Temizle
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. REDESIGNED PRIMARY TABLE VIEW: SERVİSLER VE PERİYODİK BAKIMLAR         */}
      {/* ========================================================================= */}
      {viewMode === 'TABLE' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto min-w-full">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-2.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={filteredCihazlar.length > 0 && selectedIds.length === filteredCihazlar.length}
                      onChange={handleToggleSelectAll}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-3.5 h-3.5"
                    />
                  </th>
                  <th className="py-2.5 px-2.5 min-w-[110px]">Bakım Durumu</th>
                  <th className="py-2.5 px-3 min-w-[190px]">Cari / Müşteri Bilgisi</th>
                  <th className="py-2.5 px-3 min-w-[150px]">Cihaz & Model</th>
                  <th className="py-2.5 px-2.5 min-w-[140px]">
                    <div className="flex items-center gap-1 text-slate-800 font-extrabold">
                      <span>Servis Türü</span>
                      <span className="text-rose-500 font-black text-xs">*</span>
                    </div>
                  </th>
                  <th className="py-2.5 px-2.5 min-w-[130px]">Lokasyon / Adres</th>
                  <th className="py-2.5 px-2.5 min-w-[100px]">Döngü & İlerleme</th>
                  <th className="py-2.5 px-2.5 min-w-[90px]">Son Bakım</th>
                  <th className="py-2.5 px-2.5 min-w-[100px]">Gelecek Bakım</th>
                  <th className="py-2.5 px-2.5 min-w-[125px]">Hatırlatma Tarihi</th>
                  <th className="py-2.5 px-2.5 min-w-[115px]">Saha / Servis Fişi</th>
                  <th className="py-2.5 px-2.5 min-w-[80px] text-center">İletişim</th>
                  <th className="py-2.5 px-3 min-w-[140px] text-right sticky right-0 bg-slate-50 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.04)]">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedCihazlar.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="py-16 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center">
                        <Calendar className="w-10 h-10 text-slate-300 mb-3" />
                        <p className="text-sm font-semibold text-slate-600">Filtre kriterlerine uygun servis ve bakım kaydı bulunamadı</p>
                        <p className="text-xs text-slate-400 mt-1">Arama terimini değiştirerek veya filtreleri sıfırlayarak tekrar deneyebilirsiniz.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedCihazlar.map((c) => {
                    const isOverdue = c.diffDays < 0;
                    const isDueSoon = c.diffDays >= 0 && c.diffDays <= 7;
                    const isAttention = c.diffDays > 7 && c.diffDays <= 15;
                    const isSelected = selectedIds.includes(c.id);

                    return (
                      <tr 
                        key={c.id} 
                        className={`hover:bg-slate-50/80 transition-colors group ${
                          isSelected ? 'bg-indigo-50/30' : isOverdue ? 'bg-rose-50/15' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-2 px-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(c.id)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-3.5 h-3.5"
                          />
                        </td>

                        {/* Bakım Durumu Pill */}
                        <td className="py-2 px-2.5 whitespace-nowrap">
                          {isOverdue ? (
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping shrink-0" />
                              <span>{Math.abs(c.diffDays)} Gün Gecikti</span>
                            </div>
                          ) : isDueSoon ? (
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>{c.diffDays === 0 ? 'Bugün Vakti!' : `${c.diffDays} Gün Kaldı`}</span>
                            </div>
                          ) : isAttention ? (
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                              <span>{c.diffDays} Gün Kaldı</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                              <span>{c.diffDays} Gün Kaldı</span>
                            </div>
                          )}
                        </td>

                        {/* Cari / Müşteri Bilgisi */}
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-xs truncate max-w-[170px]" title={c.cariTitle}>
                              {c.cariTitle}
                            </span>
                            {c.adresTipi && (
                              <span className="text-[9px] px-1 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-bold shrink-0">
                                {c.adresTipi}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-medium">
                            {c.yetkiliKisi && (
                              <span className="truncate max-w-[100px]" title={`Yetkili: ${c.yetkiliKisi}`}>
                                {c.yetkiliKisi}
                              </span>
                            )}
                            {(c.yetkiliTelefon || c.cari?.phone) && (
                              <span className="font-mono text-slate-600">
                                • {c.yetkiliTelefon || c.cari?.phone}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Cihaz & Model */}
                        <td className="py-2 px-3">
                          <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                            <Cpu className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span className="truncate max-w-[150px]" title={c.cihazAdi}>
                              {c.cihazAdi}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 font-mono">
                            {c.markaModel && <span className="font-semibold text-slate-600">{c.markaModel}</span>}
                            {c.seriNo && <span>SN: <span className="font-bold text-slate-700">{c.seriNo}</span></span>}
                          </div>
                        </td>

                        {/* Servis Türü * */}
                        <td className="py-2 px-2.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-col gap-0.5">
                            <div className="relative inline-block">
                              <select
                                value={c.displayServisTuru}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  if (onUpdateCihazServisTuru) {
                                    onUpdateCihazServisTuru(c.id, e.target.value);
                                  }
                                }}
                                className={`text-[10px] font-bold py-0.5 pl-2 pr-5 rounded-lg border cursor-pointer appearance-none transition-all focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs font-sans ${
                                  c.displayServisTuru.includes('Arıza') || c.displayServisTuru.includes('ARIZA')
                                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                                    : c.displayServisTuru.includes('Montaj') || c.displayServisTuru.includes('MONTAJ')
                                    ? 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-300'
                                    : c.displayServisTuru.includes('Keşif') || c.displayServisTuru.includes('KESIF')
                                    ? 'bg-teal-50 hover:bg-teal-100 text-teal-800 border-teal-300'
                                    : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                                }`}
                                title="Servis Türünü Değiştirin"
                              >
                                <option value="Periyodik Bakım & Filtre Değişimi">Periyodik Bakım & Filtre Değişimi</option>
                                <option value="Arıza & Onarım">Arıza & Onarım (Şikayet / Tamir)</option>
                                <option value="Montaj & Yeni Kurulum">Montaj & Yeni Kurulum</option>
                                <option value="Keşif & Su Analizi">Keşif & Su Analizi</option>
                              </select>
                              <div className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 text-[8px]">
                                ▼
                              </div>
                            </div>
                            
                            {c.activeSlip ? (
                              <div className="text-[9px] text-emerald-700 font-semibold flex items-center gap-1">
                                <Check className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                <span className="truncate max-w-[120px]">Açık Fiş: {c.activeSlip.servisNo}</span>
                              </div>
                            ) : (
                              <div className="text-[9px] text-slate-400 font-medium">
                                Planlanan Bakım Döngüsü
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Lokasyon / Adres */}
                        <td className="py-2 px-2.5">
                          <div className="flex items-center gap-1 text-slate-700 font-semibold text-xs">
                            <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                            <span className="truncate max-w-[110px]" title={`${c.il} / ${c.ilce}`}>
                              {c.il || '-'} / {c.ilce || '-'}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[110px] mt-0.5" title={c.acikAdres || c.mahalle}>
                            {c.acikAdres || c.mahalle || 'Adres detayı kayıtlı'}
                          </div>
                        </td>

                        {/* Döngü & İlerleme Barı */}
                        <td className="py-2 px-2.5">
                          <div className="flex items-center justify-between text-[10px] font-mono mb-0.5 font-bold">
                            <span className="text-slate-600">{c.bakimPeriyoduAy} Aylık</span>
                            <span className={isOverdue ? 'text-rose-600' : 'text-slate-600'}>
                              %{c.progressPercent}
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden border border-slate-200">
                            <div 
                              className={`h-full rounded-full transition-all ${
                                isOverdue ? 'bg-rose-500' : isDueSoon ? 'bg-amber-500' : 'bg-indigo-500'
                              }`}
                              style={{ width: `${c.progressPercent}%` }}
                            />
                          </div>
                        </td>

                        {/* Son Bakım */}
                        <td className="py-2 px-2.5 whitespace-nowrap">
                          <div className="font-mono text-xs text-slate-700 font-bold">
                            {c.sonBakimTarihi || '-'}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {c.sonBakimTarihi ? 'Periyodik bakım' : 'Montaj'}
                          </div>
                        </td>

                        {/* Gelecek Bakım */}
                        <td className="py-2 px-2.5 whitespace-nowrap">
                          <div className={`font-mono text-xs font-bold ${
                            isOverdue ? 'text-rose-600' : isDueSoon ? 'text-amber-700' : 'text-indigo-600'
                          }`}>
                            {c.gelecekBakimTarihi}
                          </div>
                          <div className="text-[10px] font-medium text-slate-500 mt-0.5">
                            {isOverdue ? `${Math.abs(c.diffDays)}g geçti` : `${c.diffDays}g sonra`}
                          </div>
                        </td>

                        {/* Hatırlatma Tarihi */}
                        <td className="py-2 px-2.5 whitespace-nowrap">
                          {c.lastCall && c.lastCall.tekrarAramaTarihi ? (
                            <div className="flex flex-col gap-0.5">
                              <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                <Clock className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                                <span>{c.lastCall.tekrarAramaTarihi}</span>
                              </div>
                              {c.lastCall.gorusmeNotu && (
                                <span 
                                  className="text-[9px] text-slate-400 truncate max-w-[110px] inline-block cursor-help font-medium"
                                  title={c.lastCall.gorusmeNotu}
                                >
                                  {c.lastCall.gorusmeNotu}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>

                        {/* Saha / Servis Fişi */}
                        <td className="py-2 px-2.5 whitespace-nowrap">
                          {c.activeSlip ? (
                            <div className="space-y-0.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onOpenEditServis && c.activeSlip) {
                                    onOpenEditServis(c.activeSlip);
                                  }
                                }}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-pointer transition-colors"
                                title="Açık servis fişini düzenle"
                              >
                                <Check className="w-2.5 h-2.5" />
                                {c.activeSlip.servisNo}
                              </button>
                              <div className="text-[9px] text-slate-500 truncate max-w-[110px]" title={c.activeSlip.atananTeknisyenAdi}>
                                Teknisyen: <span className="font-bold text-slate-700">{c.activeSlip.atananTeknisyenAdi}</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">
                              Bekliyor
                            </span>
                          )}
                        </td>

                        {/* İletişim / Çağrı Logu */}
                        <td className="py-2 px-2.5 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onOpenCagriModal(c)}
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                              c.callsCount > 0 
                                ? 'bg-amber-50 text-amber-700 border border-amber-250 hover:bg-amber-100'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                            title="Arama geçmişi ve yeni çağrı kaydı"
                          >
                            <PhoneCall className="w-2.5 h-2.5" />
                            <span>{c.callsCount} Ar.</span>
                          </button>
                        </td>

                        {/* Hızlı İşlemler */}
                        <td className="py-2 px-3 text-right whitespace-nowrap sticky right-0 bg-white group-hover:bg-slate-50/80 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.04)]">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* WhatsApp Direct */}
                            <button
                              type="button"
                              onClick={() => onOpenWhatsAppDirect(c)}
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-250 transition-colors cursor-pointer"
                              title="WhatsApp Bakım Hatırlatması Gönder"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>

                            {/* İletişim Geçmişi */}
                            <button
                              type="button"
                              onClick={() => onViewCommunicationHistory?.(c.cariTitle)}
                              className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer"
                              title="İletişim Geçmişi"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>

                            {/* Servis / İş Emri Aç veya Açık Fişi Düzenle */}
                            {c.activeSlip ? (
                              <button
                                type="button"
                                onClick={() => {
                                  if (onOpenEditServis && c.activeSlip) {
                                    onOpenEditServis(c.activeSlip);
                                  } else {
                                    onOpenYeniServis({ ...c, servisTuru: c.displayServisTuru });
                                  }
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                                title={`Bu cihaza ait açık servis fişi var (${c.activeSlip.servisNo}). Tıklayarak mevcut fişi açın ve mükerrer kaydı önleyin.`}
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Açık Fiş ({c.activeSlip.servisNo})</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onOpenYeniServis({ ...c, servisTuru: c.displayServisTuru })}
                                className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                                title="Bu cihaza hemen yeni servis / iş emri fişi aç"
                              >
                                <Wrench className="w-3 h-3" />
                                <span>İş Emri Aç</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer with Pagination */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span>Toplam <strong>{filteredCihazlar.length}</strong> kayıt içerisinden</span>
              <span>Sayfa başına:</span>
              <select
                value={pageSize}
                onChange={e => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-500">
                Sayfa {currentPage} / {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="p-1 rounded-lg border border-slate-300 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="p-1 rounded-lg border border-slate-300 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. CARDS GRID VIEW                                                        */}
      {/* ========================================================================= */}
      {viewMode === 'CARDS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCihazlar.map((c) => {
            const isOverdue = c.diffDays < 0;
            const isDueSoon = c.diffDays >= 0 && c.diffDays <= 7;

            return (
              <div 
                key={c.id}
                className={`bg-white rounded-2xl border p-4 shadow-xs flex flex-col justify-between transition-all hover:border-slate-350 hover:shadow-md ${
                  isOverdue 
                    ? 'border-rose-300 bg-rose-50/10' 
                    : isDueSoon
                    ? 'border-amber-300 bg-amber-50/10'
                    : 'border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-800 text-sm truncate max-w-[220px]" title={c.cariTitle}>
                        {c.cariTitle}
                      </div>
                      <div className="text-xs text-purple-700 font-semibold mt-0.5">
                        {c.adresTipi || 'Merkez Adres'}
                      </div>
                    </div>

                    {/* Status Pill */}
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                      isOverdue 
                        ? 'bg-rose-100 text-rose-800 border-rose-200 animate-pulse'
                        : isDueSoon
                        ? 'bg-amber-100 text-amber-800 border-amber-200'
                        : 'bg-blue-100 text-blue-800 border-blue-200'
                    }`}>
                      {isOverdue 
                        ? `${Math.abs(c.diffDays)} Gün Gecikti` 
                        : c.diffDays === 0 
                        ? 'Bugün Vakti' 
                        : `${c.diffDays} Gün Kaldı`}
                    </span>
                  </div>

                  <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="truncate">{c.cihazAdi}</span>
                    </div>
                    {c.seriNo && (
                      <div className="text-[10px] text-slate-400 font-mono">
                        Seri No: <span className="text-slate-600 font-bold">{c.seriNo}</span>
                      </div>
                    )}
                    <div className="text-[11px] text-slate-500 flex items-center gap-1 pt-1 font-semibold">
                      <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                      <span className="truncate">{c.il} / {c.ilce} - {c.mahalle}</span>
                    </div>
                  </div>

                  {/* Progress Bar of Cycle */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                      <span className="text-slate-400 font-medium">Döngü İlerlemesi</span>
                      <span className={isOverdue ? 'text-rose-600 font-bold' : 'text-slate-600 font-bold'}>
                        %{c.progressPercent}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          isOverdue ? 'bg-rose-500' : isDueSoon ? 'bg-amber-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${c.progressPercent}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono mt-1 font-bold">
                      <span>Son: {c.sonBakimTarihi || '-'}</span>
                      <span className="text-slate-600">Hedef: {c.gelecekBakimTarihi}</span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-4 border-t border-slate-100 mt-4 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onOpenWhatsAppDirect(c)}
                    className="flex-1 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    WhatsApp
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenCagriModal(c)}
                    className="flex-1 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-250 text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    Ara ({c.callsCount})
                  </button>

                  {c.activeSlip ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenEditServis && c.activeSlip) {
                          onOpenEditServis(c.activeSlip);
                        } else {
                          onOpenYeniServis({ ...c, servisTuru: c.displayServisTuru });
                        }
                      }}
                      className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-xs"
                      title={`Bu cihaz için açık iş emri mevcut (${c.activeSlip.servisNo}). Fişi açın.`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Açık Fiş ({c.activeSlip.servisNo})
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onOpenYeniServis({ ...c, servisTuru: c.displayServisTuru })}
                      className="flex-1 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-xs"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      İş Emri
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import {
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  Wrench,
  PhoneCall,
  MessageCircle,
  Search,
  RotateCcw,
  MapPin,
  Cpu,
  Check,
  TrendingUp,
  SlidersHorizontal,
  Table as TableIcon,
  Download,
  History,
  FilePieChart,
  FileSpreadsheet,
  Building,
  Edit,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MusteriCihazi, ServisFisi, CagriAramaKaydi, Cari } from '../../types';
import { AgGridColumnSidebar, AgGridSidebarToggleBtn } from '../common/AgGridColumnSidebar';
import {
  normalizeServiceType,
  getServiceTypeLabel,
  isServiceTypeMatch,
  SERVIS_TIPI_COLORS,
} from '../../lib/serviceUtils';

const GRID_STORAGE_KEY = 'fx_bakim_gantt_grid_state_v3';

interface BakimGanttChartProps {
  cihazlar: MusteriCihazi[];
  servisler: ServisFisi[];
  cagriAramalari: CagriAramaKaydi[];
  cariler: Cari[];
  todayDateStr?: string;
  onOpenYeniServis: (cihaz: MusteriCihazi) => void;
  onOpenYeniServisEmpty?: () => void;
  onOpenCagriModal: (cihaz: MusteriCihazi) => void;
  onOpenGecmisModal: (cihaz: MusteriCihazi) => void;
  onOpenWhatsAppDirect: (cihaz: MusteriCihazi) => void;
  onOpenEditServis?: (servis: ServisFisi) => void;
  onUpdateCihazServisTuru?: (cihazId: string, servisTuru: string) => void;
  onViewCommunicationHistory?: (cariTitle: string) => void;
  onEditCihaz?: (cihaz: MusteriCihazi) => void;
}

export type BakimUrgencyCategory = 'ALL' | 'GECIKTI' | 'COK_YAKIN' | 'YAKIN' | 'BU_AY' | 'GELECEK';
export type ViewMode = 'TABLE' | 'CARDS';

export type EnrichedCihaz = MusteriCihazi & {
  cari?: Cari;
  dueDate: Date;
  lastDate: Date;
  diffDays: number;
  category: BakimUrgencyCategory;
  urgencyScore: number;
  activeSlip?: ServisFisi;
  progressPercent: number;
  callsCount: number;
  lastCall: CagriAramaKaydi | null;
  displayServisTuru: string;
};

export const BakimGanttChart: React.FC<BakimGanttChartProps> = ({
  cihazlar,
  servisler,
  cagriAramalari,
  cariler,
  todayDateStr,
  onOpenYeniServis,
  onOpenYeniServisEmpty,
  onOpenCagriModal,
  onOpenGecmisModal,
  onOpenWhatsAppDirect,
  onOpenEditServis,
  onUpdateCihazServisTuru,
  onViewCommunicationHistory,
  onEditCihaz
}) => {
  const [currentReferenceDate, setCurrentReferenceDate] = useState<string>(() => {
    return todayDateStr || new Date().toISOString().slice(0, 10);
  });

  useEffect(() => {
    if (todayDateStr) {
      setCurrentReferenceDate(todayDateStr);
    }
  }, [todayDateStr]);

  const [filterCategory, setFilterCategory] = useState<BakimUrgencyCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIl, setSelectedIl] = useState<string>('ALL');
  const [selectedPeriyot, setSelectedPeriyot] = useState<string>('ALL');
  const [selectedServisTuru, setSelectedServisTuru] = useState<string>('ALL');
  const [selectedRandevuDurumu, setSelectedRandevuDurumu] = useState<'ALL' | 'HAS_APPOINTMENT' | 'NO_APPOINTMENT'>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('TABLE');

  // AG Grid States & Sidebar
  const [gridApi, setGridApi] = useState<GridApi<EnrichedCihaz> | null>(null);
  const gridRef = useRef<AgGridReact<EnrichedCihaz>>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const sidebarButtonRef = useRef<HTMLButtonElement>(null);

  const today = useMemo(() => new Date(currentReferenceDate), [currentReferenceDate]);

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
  const enrichedCihazlar = useMemo<EnrichedCihaz[]>(() => {
    return cihazlar.map(c => {
      let dueDate = new Date(c.gelecekBakimTarihi);
      const lastDate = new Date(c.sonBakimTarihi || c.montajTarihi || new Date());
      
      if (isNaN(dueDate.getTime())) {
        const fallbackDate = new Date(c.sonBakimTarihi || c.montajTarihi || new Date());
        fallbackDate.setMonth(fallbackDate.getMonth() + (c.bakimPeriyoduAy || 6));
        dueDate = fallbackDate;
      }
      
      const diffMs = dueDate.getTime() - today.getTime();
      const diffDays = Math.round(diffMs / (1000 * 3600 * 24));
      
      let category: BakimUrgencyCategory = 'GELECEK';
      let urgencyScore = 0;

      if (diffDays < 0) {
        category = 'GECIKTI';
        urgencyScore = 1000 + Math.abs(diffDays);
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

      // Active open service slip check
      const activeSlip = servisler.find(s => 
        s.cihazId === c.id && 
        (s.durum === 'RANDEVU_PLANLANDI' || s.durum === 'YOLDA_SAHADA' || s.durum === 'BEKLEMEDE')
      );

      if (activeSlip) {
        urgencyScore += 2500;
      }

      // Total cycle progress
      const totalCycleMs = Math.max(1000 * 3600 * 24 * 30, dueDate.getTime() - lastDate.getTime());
      const elapsedMs = today.getTime() - lastDate.getTime();
      const progressPercent = Math.min(100, Math.max(0, Math.round((elapsedMs / totalCycleMs) * 100)));

      // Calls count & last call note
      const calls = cagriAramalari.filter(a => a.cihazId === c.id);
      const lastCall = calls.length > 0 ? calls[calls.length - 1] : null;

      // Cari details
      const cari = cariMap.get(c.cariId);
      const effectiveCariTitle = activeSlip?.cariTitle || cari?.title || c.cariTitle || '';
      const effectiveYetkiliKisi = activeSlip?.yetkili || cari?.authorizedPerson || c.yetkiliKisi || '';
      const effectiveTelefon = activeSlip?.telefon || cari?.phone || c.yetkiliTelefon || '';

      // Servis Türü
      const rawSlip = activeSlip?.servisTuru || activeSlip?.servisTipi || c.servisTuru || 'PERIYODIK_BAKIM';
      const displayServisTuru = getServiceTypeLabel(rawSlip);

      return {
        ...c,
        cariTitle: effectiveCariTitle,
        yetkiliKisi: effectiveYetkiliKisi,
        yetkiliTelefon: effectiveTelefon,
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

    if (filterCategory !== 'ALL') {
      result = result.filter(c => c.category === filterCategory);
    }
    if (selectedIl !== 'ALL') {
      result = result.filter(c => c.il === selectedIl);
    }
    if (selectedPeriyot !== 'ALL') {
      result = result.filter(c => String(c.bakimPeriyoduAy) === selectedPeriyot);
    }
    if (selectedServisTuru !== 'ALL') {
      result = result.filter(c => isServiceTypeMatch(c.displayServisTuru || c.servisTuru, selectedServisTuru));
    }
    if (selectedRandevuDurumu === 'HAS_APPOINTMENT') {
      result = result.filter(c => Boolean(c.activeSlip));
    } else if (selectedRandevuDurumu === 'NO_APPOINTMENT') {
      result = result.filter(c => !c.activeSlip);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(c => 
        (c.cariTitle && c.cariTitle.toLowerCase().includes(q)) ||
        (c.cihazAdi && c.cihazAdi.toLowerCase().includes(q)) ||
        (c.markaModel && c.markaModel.toLowerCase().includes(q)) ||
        (c.seriNo && c.seriNo.toLowerCase().includes(q)) ||
        (c.ilce && c.ilce.toLowerCase().includes(q)) ||
        (c.yetkiliTelefon && c.yetkiliTelefon.includes(q)) ||
        (c.yetkiliKisi && c.yetkiliKisi.toLowerCase().includes(q))
      );
    }

    // Default sort by urgency
    return [...result].sort((a, b) => b.urgencyScore - a.urgencyScore);
  }, [enrichedCihazlar, filterCategory, selectedIl, selectedPeriyot, selectedServisTuru, selectedRandevuDurumu, searchQuery]);

  const handleOpenRowDetails = React.useCallback((c: EnrichedCihaz) => {
    if (c.activeSlip && onOpenEditServis) {
      onOpenEditServis(c.activeSlip);
    } else {
      const anySlip = servisler.find(s => s.cihazId === c.id);
      if (anySlip && onOpenEditServis) {
        onOpenEditServis(anySlip);
      } else {
        onOpenYeniServis({ ...c, servisTuru: c.displayServisTuru });
      }
    }
  }, [onOpenEditServis, onOpenYeniServis, servisler]);

  // Export to Excel
  const handleExportExcel = () => {
    const rowsToExport = filteredCihazlar;
    if (!rowsToExport.length) return;

    const dataToExport = rowsToExport.map((c, index) => ({
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
    XLSX.utils.book_append_sheet(wb, ws, 'Müşteri ve Bakım Takip');
    XLSX.writeFile(wb, `Musteri_ve_Bakim_Takip_${currentReferenceDate}.xlsx`);
  };

  // Export to PDF
  const handleExportPdf = () => {
    const rowsToExport = filteredCihazlar;
    if (!rowsToExport.length) return;

    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFillColor(79, 70, 229);
    doc.roundedRect(14, 10, 10, 10, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text('FX', 16, 17);

    doc.setTextColor(40, 40, 40);
    doc.setFontSize(18);
    doc.text('Müşteri & Periyodik Bakım Takip Listesi', 28, 17);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR')} | Referans Tarih: ${currentReferenceDate} | Toplam Cihaz: ${rowsToExport.length}`, 14, 26);

    const tableData = rowsToExport.map((c) => [
      c.category === 'GECIKTI' ? `${Math.abs(c.diffDays)}g Gecikti` : `${c.diffDays}g Kaldı`,
      c.cariTitle || '-',
      c.cihazAdi || '-',
      c.displayServisTuru || '-',
      `${c.bakimPeriyoduAy} Ay`,
      c.sonBakimTarihi || '-',
      c.gelecekBakimTarihi || '-',
      c.yetkiliTelefon || '-',
      c.activeSlip ? c.activeSlip.servisNo : 'Fiş Yok'
    ]);

    autoTable(doc, {
      head: [['Durum', 'Müşteri Ünvanı', 'Cihaz & Model', 'Servis Türü', 'Döngü', 'Son Bakım', 'Hedef Bakım', 'Telefon', 'Saha Durumu']],
      body: tableData,
      startY: 32,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8, font: 'helvetica' },
    });

    doc.save(`Musteri_Bakim_Takip_${currentReferenceDate}.pdf`);
  };

  // AG Grid Kolon Tanımları (ColDef)
  const columnDefs = useMemo<ColDef<EnrichedCihaz>[]>(() => [
    {
      field: 'category',
      headerName: 'Durum',
      minWidth: 155,
      width: 165,
      cellRenderer: (params: ICellRendererParams<EnrichedCihaz>) => {
        const data = params.data;
        if (!data) return null;
        const isOverdue = data.diffDays < 0;
        const isDueSoon = data.diffDays >= 0 && data.diffDays <= 7;
        const isMedium = data.diffDays > 7 && data.diffDays <= 15;
        const isThisMonth = data.diffDays > 15 && data.diffDays <= 30;

        return (
          <div className="flex items-center h-full">
            {isOverdue ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-50 text-rose-700 border border-rose-250 animate-pulse">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                {Math.abs(data.diffDays)}g Gecikti
              </span>
            ) : isDueSoon ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-250">
                <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                {data.diffDays === 0 ? 'Bugün Vakti' : `${data.diffDays}g Kaldı (Acil)`}
              </span>
            ) : isMedium ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-50 text-orange-800 border border-orange-200">
                <Calendar className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                {data.diffDays}g Kaldı
              </span>
            ) : isThisMonth ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                {data.diffDays}g Kaldı
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                <Check className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                {data.diffDays}g Sonra
              </span>
            )}
          </div>
        );
      }
    },
    {
      field: 'cariTitle',
      headerName: 'Cari Ünvan',
      minWidth: 220,
      flex: 1.5,
      cellRenderer: (params: ICellRendererParams<EnrichedCihaz>) => {
        const data = params.data;
        if (!data) return null;
        return (
          <div className="flex flex-col justify-center py-1">
            <span 
              onClick={() => params.context.handleOpenRowDetails(data)}
              className="font-bold text-slate-900 text-xs hover:text-indigo-600 transition-colors cursor-pointer truncate"
              title={data.cariTitle}
            >
              {data.cariTitle}
            </span>
            {data.yetkiliKisi && (
              <span className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                Yetkili: {data.yetkiliKisi}
              </span>
            )}
          </div>
        );
      }
    },
    {
      field: 'il',
      headerName: 'Adres / Lokasyon',
      minWidth: 180,
      width: 190,
      cellRenderer: (params: ICellRendererParams<EnrichedCihaz>) => {
        const data = params.data;
        if (!data) return null;
        return (
          <div className="flex flex-col justify-center py-1">
            <div className="flex items-center gap-1">
              <span className="px-1.5 py-0.2 bg-purple-50 text-purple-700 rounded border border-purple-100 text-[10px] font-semibold shrink-0">
                {data.adresTipi || 'Merkez'}
              </span>
              <span className="text-xs font-semibold text-slate-700 truncate">
                {data.il} / {data.ilce}
              </span>
            </div>
            {data.mahalle && (
              <span className="text-[10px] text-slate-400 truncate mt-0.5">
                {data.mahalle} {data.acikAdres ? `- ${data.acikAdres}` : ''}
              </span>
            )}
          </div>
        );
      }
    },
    {
      field: 'cihazAdi',
      headerName: 'Cihaz & Model',
      minWidth: 200,
      width: 210,
      cellRenderer: (params: ICellRendererParams<EnrichedCihaz>) => {
        const data = params.data;
        if (!data) return null;
        return (
          <div className="flex flex-col justify-center py-1">
            <span className="font-semibold text-slate-800 text-xs flex items-center gap-1 truncate">
              <Cpu className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              {data.cihazAdi}
            </span>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
              Model: <span className="text-slate-600 font-bold">{data.markaModel || 'Filtrex'}</span>
              {data.seriNo && <span> &bull; SN: <strong className="text-slate-700">{data.seriNo}</strong></span>}
            </div>
          </div>
        );
      }
    },
    {
      field: 'displayServisTuru',
      headerName: 'Servis Türü',
      minWidth: 170,
      width: 180,
      cellRenderer: (params: ICellRendererParams<EnrichedCihaz>) => {
        const data = params.data;
        if (!data) return null;
        const norm = normalizeServiceType(data.displayServisTuru);
        const colors = SERVIS_TIPI_COLORS[norm];
        return (
          <div className="flex items-center h-full">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold ${colors.bg} ${colors.text} border ${colors.border} truncate`}>
              <span className={`w-1.5 h-1.5 rounded-full ${colors.dot} shrink-0`} />
              {data.displayServisTuru}
            </span>
          </div>
        );
      }
    },
    {
      field: 'bakimPeriyoduAy',
      headerName: 'Periyot & Döngü',
      minWidth: 150,
      width: 160,
      cellRenderer: (params: ICellRendererParams<EnrichedCihaz>) => {
        const data = params.data;
        if (!data) return null;
        const isOverdue = data.diffDays < 0;
        return (
          <div className="flex flex-col justify-center py-1 w-full pr-2">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="font-bold text-slate-700">{data.bakimPeriyoduAy} Aylık</span>
              <span className={isOverdue ? 'text-rose-600 font-bold' : 'text-slate-500 font-bold'}>
                %{data.progressPercent}
              </span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200 mt-1">
              <div 
                className={`h-full rounded-full transition-all ${
                  isOverdue ? 'bg-rose-500' : data.diffDays <= 7 ? 'bg-amber-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${data.progressPercent}%` }}
              />
            </div>
          </div>
        );
      }
    },
    {
      field: 'sonBakimTarihi',
      headerName: 'Son Bakım',
      minWidth: 110,
      width: 120,
      cellRenderer: (params: ICellRendererParams<EnrichedCihaz>) => {
        const data = params.data;
        if (!data) return null;
        return (
          <div className="flex flex-col justify-center py-1">
            <span className="font-mono text-xs font-bold text-slate-700">
              {data.sonBakimTarihi || '-'}
            </span>
            <span className="text-[10px] text-slate-400">
              {data.sonBakimTarihi ? 'Periyodik bakım' : 'Montaj'}
            </span>
          </div>
        );
      }
    },
    {
      field: 'gelecekBakimTarihi',
      headerName: 'Gelecek Bakım',
      minWidth: 120,
      width: 130,
      cellRenderer: (params: ICellRendererParams<EnrichedCihaz>) => {
        const data = params.data;
        if (!data) return null;
        const isOverdue = data.diffDays < 0;
        const isDueSoon = data.diffDays >= 0 && data.diffDays <= 7;
        return (
          <div className="flex flex-col justify-center py-1">
            <span className={`font-mono text-xs font-bold ${
              isOverdue ? 'text-rose-600' : isDueSoon ? 'text-amber-700' : 'text-indigo-600'
            }`}>
              {data.gelecekBakimTarihi}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">
              {isOverdue ? `${Math.abs(data.diffDays)}g geçti` : `${data.diffDays}g sonra`}
            </span>
          </div>
        );
      }
    },
    {
      field: 'yetkiliTelefon',
      headerName: 'İletişim & Yetkili',
      minWidth: 170,
      width: 180,
      cellRenderer: (params: ICellRendererParams<EnrichedCihaz>) => {
        const data = params.data;
        if (!data) return null;
        return (
          <div className="flex flex-col justify-center py-1">
            <span className="text-xs font-semibold text-slate-800 truncate">
              {data.yetkiliKisi || '-'}
            </span>
            <span className="text-[10px] text-slate-500 font-mono mt-0.5">
              {data.yetkiliTelefon || '-'}
            </span>
          </div>
        );
      }
    },
    {
      field: 'activeSlip',
      headerName: 'Saha / Servis Fişi',
      minWidth: 160,
      width: 170,
      valueGetter: (params) => {
        return params.data?.activeSlip?.servisNo || '';
      },
      valueFormatter: (params) => {
        return params.value ? `Fiş: ${params.value}` : 'Açık Fiş Yok';
      },
      cellRenderer: (params: ICellRendererParams<EnrichedCihaz>) => {
        const data = params.data;
        if (!data) return null;
        if (data.activeSlip) {
          return (
            <div className="flex flex-col justify-center py-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (params.context.onOpenEditServis && data.activeSlip) {
                    params.context.onOpenEditServis(data.activeSlip);
                  }
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-pointer transition-colors w-fit"
                title="Açık servis fişini görüntüle"
              >
                <Check className="w-2.5 h-2.5" />
                {data.activeSlip.servisNo}
              </button>
              <span className="text-[9px] text-slate-500 truncate mt-0.5">
                Teknisyen: <strong className="text-slate-700">{data.activeSlip.atananTeknisyenAdi}</strong>
              </span>
            </div>
          );
        }
        return (
          <div className="flex items-center h-full">
            <span className="text-[10px] text-slate-400 italic">Açık Fiş Yok</span>
          </div>
        );
      }
    },
    {
      field: 'callsCount',
      headerName: 'Çağrı Geçmişi',
      minWidth: 130,
      width: 140,
      cellRenderer: (params: ICellRendererParams<EnrichedCihaz>) => {
        const data = params.data;
        if (!data) return null;
        return (
          <div className="flex items-center h-full" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => params.context.onOpenCagriModal(data)}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                data.callsCount > 0 
                  ? 'bg-amber-50 text-amber-800 border border-amber-250 hover:bg-amber-100'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              title="Arama geçmişi ve yeni çağrı kaydı"
            >
              <PhoneCall className="w-3 h-3 text-amber-600" />
              <span>{data.callsCount} Arama</span>
            </button>
          </div>
        );
      }
    },
    {
      colId: 'actions',
      headerName: 'İşlemler',
      minWidth: 230,
      width: 250,
      pinned: 'right',
      cellRenderer: (params: ICellRendererParams<EnrichedCihaz>) => {
        const data = params.data;
        if (!data) return null;
        return (
          <div className="flex items-center gap-1.5 h-full" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => params.context.onOpenWhatsAppDirect(data)}
              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer shadow-2xs"
              title="Müşteriye WhatsApp Bakım Hatırlatması Gönder"
            >
              <MessageCircle className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => params.context.onOpenCagriModal(data)}
              className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors cursor-pointer shadow-2xs"
              title="Çağrı / Görüşme Kaydet"
            >
              <PhoneCall className="w-3.5 h-3.5" />
            </button>
            {params.context.onEditCihaz && (
              <button
                type="button"
                onClick={() => params.context.onEditCihaz(data)}
                className="p-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 transition-colors cursor-pointer shadow-2xs"
                title="Cihaz Kartı & Bakım Tarihlerini Düzenle"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
            )}
            {data.activeSlip ? (
              <button
                type="button"
                onClick={() => {
                  if (params.context.onOpenEditServis && data.activeSlip) {
                    params.context.onOpenEditServis(data.activeSlip);
                  }
                }}
                className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                title={`Açık Servis Fişi (${data.activeSlip.servisNo})`}
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Fiş</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => params.context.onOpenYeniServis({ ...data, servisTuru: data.displayServisTuru })}
                className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                title="Yeni Servis / İş Emri Aç"
              >
                <Wrench className="w-3 h-3" />
                <span>Servis Aç</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => params.context.onOpenGecmisModal(data)}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
              title="Cihaz Servis Geçmişi"
            >
              <History className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      }
    }
  ], []);

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    floatingFilter: false,
  }), []);

  const rowSelection = useMemo<RowSelectionOptions>(() => ({
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
  }), []);

  const onGridReady = React.useCallback((params: GridReadyEvent<EnrichedCihaz>) => {
    setGridApi(params.api);
    const savedState = localStorage.getItem(GRID_STORAGE_KEY);
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        if (Array.isArray(state)) {
          const cleanState = state.map((col: any) => {
            if (col.colId === 'category') return { ...col, pinned: null };
            return col;
          });
          params.api.applyColumnState({ state: cleanState, applyOrder: true });
        }
      } catch (e) {
        console.error('Grid column state parse error:', e);
      }
    }
  }, []);

  const onSaveGridState = React.useCallback(() => {
    if (gridRef.current?.api) {
      try {
        const state = gridRef.current.api.getColumnState();
        if (Array.isArray(state)) {
          localStorage.setItem(GRID_STORAGE_KEY, JSON.stringify(state));
        }
      } catch (err) {
        console.error('Grid state kaydedilemedi:', err);
      }
    }
  }, []);

  const gridContext = useMemo(() => ({
    handleOpenRowDetails,
    onOpenWhatsAppDirect,
    onOpenCagriModal,
    onOpenYeniServis,
    onOpenEditServis,
    onOpenGecmisModal,
    onEditCihaz
  }), [handleOpenRowDetails, onOpenWhatsAppDirect, onOpenCagriModal, onOpenYeniServis, onOpenEditServis, onOpenGecmisModal, onEditCihaz]);

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
                <span>Müşteri & Bakım Takip</span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold font-mono">
                  {stats.total} Cihaz Takipte
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Müşteri arıtma sistemlerinin periyodik bakım takvimi, gecikme analizi, filtre değişim döngüsü ve çağrı merkezi takip yönetimi.
              </p>
            </div>
          </div>

          {/* View Mode & Actions Switcher */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                if (onOpenYeniServisEmpty) {
                  onOpenYeniServisEmpty();
                } else if (enrichedCihazlar.length > 0) {
                  onOpenYeniServis(enrichedCihazlar[0]);
                }
              }}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              title="Yeni temiz servis / iş emri kaydı oluştur"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Yeni Servis Kaydı Oluştur</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3 py-2 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              title="Listeyi Excel (.xlsx) olarak indir"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Excel</span>
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              className="px-3 py-2 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              title="Listeyi PDF olarak indir"
            >
              <FilePieChart className="w-3.5 h-3.5 text-rose-600" />
              <span>PDF</span>
            </button>

            {/* Referans Tarihi Seçici */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="text-[11px] font-semibold text-slate-500 hidden sm:inline">Referans Tarih:</span>
              <input
                type="date"
                value={currentReferenceDate}
                onChange={e => setCurrentReferenceDate(e.target.value || new Date().toISOString().slice(0, 10))}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                title="Gantt bakım hesaplama ve kalan gün referans tarihi"
              />
              {currentReferenceDate !== new Date().toISOString().slice(0, 10) && (
                <button
                  type="button"
                  onClick={() => setCurrentReferenceDate(new Date().toISOString().slice(0, 10))}
                  className="px-1.5 py-0.5 rounded bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-[10px] font-bold transition-colors cursor-pointer"
                  title="Gerçek bugünün tarihine dön"
                >
                  Bugün
                </button>
              )}
            </div>

            <AgGridSidebarToggleBtn
              isOpen={isSidebarOpen}
              onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
              gridApi={gridApi}
              buttonRef={sidebarButtonRef}
            />

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
                AG Grid Tablo
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
            <div className="text-xl font-bold font-mono text-slate-800 mt-1">{stats.total}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Envanterdeki kayıtlı</div>
          </button>

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
            <div className="text-xl font-bold font-mono text-rose-700 mt-1">{stats.gecikenlerCount}</div>
            <div className="text-[10px] text-rose-500/90 font-semibold mt-0.5">
              {stats.maxGecikmeGunu > 0 ? `Maks. ${stats.maxGecikmeGunu} gün gecikme` : 'Vakti dolmuş'}
            </div>
          </button>

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
            <div className="text-xl font-bold font-mono text-amber-700 mt-1">{stats.cokYakinCount}</div>
            <div className="text-[10px] text-amber-600 font-semibold mt-0.5">Bu hafta içinde</div>
          </button>

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
            <div className="text-xl font-bold font-mono text-orange-700 mt-1">{stats.yakinCount}</div>
            <div className="text-[10px] text-orange-600 font-semibold mt-0.5">Yaklaşan bakım</div>
          </button>

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
            <div className="text-xl font-bold font-mono text-blue-700 mt-1">{stats.buAyCount}</div>
            <div className="text-[10px] text-blue-500 font-semibold mt-0.5">Önümüzdeki ay</div>
          </button>

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
            <div className="text-xl font-bold font-mono text-emerald-700 mt-1">{stats.withActiveSlipsCount}</div>
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
              onChange={e => setSearchQuery(e.target.value)}
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
            onChange={e => setSelectedIl(e.target.value)}
            className="bg-white border border-slate-300 hover:border-slate-400 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="ALL">Tüm Şehirler ({distinctIller.length})</option>
            {distinctIller.map(il => (
              <option key={il} value={il}>{il}</option>
            ))}
          </select>

          {/* Period Filter */}
          <select
            value={selectedPeriyot}
            onChange={e => setSelectedPeriyot(e.target.value)}
            className="bg-white border border-slate-300 hover:border-slate-400 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="ALL">Tüm Bakım Döngüleri</option>
            <option value="1">1 Aylık</option>
            <option value="2">2 Aylık</option>
            <option value="3">3 Aylık</option>
            <option value="4">4 Aylık</option>
            <option value="6">6 Aylık</option>
            <option value="8">8 Aylık</option>
            <option value="12">12 Aylık (Yıllık)</option>
          </select>

          {/* Service Type Filter */}
          <select
            value={selectedServisTuru}
            onChange={e => setSelectedServisTuru(e.target.value)}
            className="bg-white border border-slate-300 hover:border-slate-400 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer font-medium"
          >
            <option value="ALL">Tüm Servis Türleri</option>
            <option value="PERIYODIK_BAKIM">Periyodik Bakım & Filtre Değişimi</option>
            <option value="FILTRE_DEGISIMI">Filtre Değişimi</option>
            <option value="ARIZA_ONARIM">Arıza & Onarım</option>
            <option value="MONTAJ_KURULUM">Montaj & Yeni Kurulum</option>
            <option value="KESIF_DURUM_TESPITI">Keşif & Su Analizi</option>
          </select>

          {/* Appointment Status */}
          <select
            value={selectedRandevuDurumu}
            onChange={e => setSelectedRandevuDurumu(e.target.value as any)}
            className="bg-white border border-slate-300 hover:border-slate-400 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="ALL">Randevu Durumu</option>
            <option value="HAS_APPOINTMENT">Açık Fişi Olanlar</option>
            <option value="NO_APPOINTMENT">Fişi Olmayanlar</option>
          </select>
        </div>

        <div className="flex items-center gap-2 self-end lg:self-auto">
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedIl('ALL');
              setSelectedPeriyot('ALL');
              setSelectedServisTuru('ALL');
              setFilterCategory('ALL');
              setSelectedRandevuDurumu('ALL');
            }}
            className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all cursor-pointer"
            title="Filtreleri Sıfırla"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4. Content Area: Table or Cards */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden min-h-[480px] relative">
        {viewMode === 'TABLE' ? (
          <div className="h-[600px] w-full ag-theme-alpine font-sans">
            <AgGridReact
              ref={gridRef}
              rowData={filteredCihazlar}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              rowSelection={rowSelection}
              onGridReady={onGridReady}
              onColumnMoved={onSaveGridState}
              onColumnResized={onSaveGridState}
              onColumnVisible={onSaveGridState}
              onColumnPinned={onSaveGridState}
              localeText={AG_GRID_LOCALE_TR}
              theme={appTheme}
              context={gridContext}
              animateRows={true}
              pagination={true}
              paginationPageSize={50}
              paginationPageSizeSelector={[20, 50, 100, 500]}
            />
            
            {/* Sidebar Overlay */}
            {isSidebarOpen && (
              <AgGridColumnSidebar
                onClose={() => setIsSidebarOpen(false)}
                gridApi={gridApi}
                sidebarRef={sidebarRef}
              />
            )}
          </div>
        ) : (
          <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredCihazlar.map(c => (
              <div 
                key={c.id} 
                className={`group rounded-2xl border transition-all p-4 relative flex flex-col justify-between ${
                  c.category === 'GECIKTI' 
                    ? 'bg-rose-50/20 border-rose-100 hover:border-rose-200' 
                    : c.category === 'COK_YAKIN' 
                    ? 'bg-amber-50/20 border-amber-100 hover:border-amber-200' 
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Card Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 
                      onClick={() => handleOpenRowDetails(c)}
                      className="font-bold text-slate-900 text-sm leading-tight truncate hover:text-indigo-600 transition-colors cursor-pointer"
                    >
                      {c.cariTitle}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="px-1.5 py-0.2 bg-slate-100 text-slate-500 rounded text-[9px] font-bold uppercase tracking-wider">
                        {c.adresTipi || 'Merkez'}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium truncate">
                        {c.il} / {c.ilce}
                      </span>
                    </div>
                  </div>
                  
                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    {c.category === 'GECIKTI' ? (
                      <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black animate-pulse">
                        Gecikti
                      </span>
                    ) : c.category === 'COK_YAKIN' ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black">
                        Acil
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                        Normal
                      </span>
                    )}
                  </div>
                </div>

                {/* Device Info */}
                <div className="bg-slate-50 rounded-xl p-3 mb-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-xs font-bold text-slate-800 truncate">{c.cihazAdi}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Building className="w-3 h-3" />
                      {c.markaModel || 'Filtrex'}
                    </span>
                    <span className="font-mono">{c.seriNo}</span>
                  </div>
                </div>

                {/* Maintenance Timeline */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-slate-500 uppercase tracking-widest">Bakım Döngüsü</span>
                    <span className={c.diffDays < 0 ? 'text-rose-600 font-black' : 'text-slate-700 font-bold'}>
                      %{c.progressPercent}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden border border-slate-200 shadow-inner">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        c.diffDays < 0 ? 'bg-rose-500' : c.diffDays <= 7 ? 'bg-amber-500' : 'bg-indigo-500'
                      }`}
                      style={{ width: `${c.progressPercent}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-400 font-bold uppercase">Son Bakım</span>
                      <span className="text-xs font-bold text-slate-600 font-mono">{c.sonBakimTarihi || '-'}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[9px] text-slate-400 font-bold uppercase">Gelecek Hedef</span>
                      <span className={`text-xs font-black font-mono ${
                        c.diffDays < 0 ? 'text-rose-600' : c.diffDays <= 7 ? 'text-amber-700' : 'text-indigo-600'
                      }`}>
                        {c.gelecekBakimTarihi}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-150 gap-2">
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={() => onOpenWhatsAppDirect(c)}
                      className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-all cursor-pointer shadow-2xs"
                      title="WhatsApp Hatırlatması"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => onOpenCagriModal(c)}
                      className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-all cursor-pointer shadow-2xs"
                      title="Çağrı Kaydı"
                    >
                      <PhoneCall className="w-4 h-4" />
                    </button>
                    {onEditCihaz && (
                      <button 
                        onClick={() => onEditCihaz(c)}
                        className="p-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 transition-all cursor-pointer shadow-2xs"
                        title="Cihaz Kartı & Bakım Tarihlerini Düzenle"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  {c.activeSlip ? (
                    <button 
                      onClick={() => onOpenEditServis && onOpenEditServis(c.activeSlip!)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Fiş: {c.activeSlip.servisNo}</span>
                    </button>
                  ) : (
                    <button 
                      onClick={() => onOpenYeniServis({ ...c, servisTuru: c.displayServisTuru })}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Servis Aç</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredCihazlar.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <Search className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-sm font-bold">Aranan kriterlere uygun cihaz bulunamadı.</p>
            <button 
              onClick={() => {
                setSearchQuery('');
                setSelectedIl('ALL');
                setSelectedPeriyot('ALL');
                setFilterCategory('ALL');
              }}
              className="text-indigo-600 text-xs font-bold mt-2 hover:underline cursor-pointer"
            >
              Tüm Filtreleri Temizle
            </button>
          </div>
        )}
      </div>

      <div className="bg-indigo-50/40 border border-indigo-100 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
          <Download className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h4 className="text-xs font-bold text-indigo-900">Periyodik Bakım Planlama & Saha Operasyon Entegrasyonu</h4>
          <p className="text-[11px] text-indigo-700 mt-0.5">
            Bu ekran, Filtrex ERP sistemindeki saha operasyonlarının ana kumanda merkezidir. Cihaz periyotları dolduğunda otomatik olarak "Acil" kategorisine düşer. Teknisyen ataması yapıldığında "Saha Fişi" butonu aktifleşir.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-indigo-400 font-mono">v3.8.2-stable</span>
        </div>
      </div>
    </div>
  );
};

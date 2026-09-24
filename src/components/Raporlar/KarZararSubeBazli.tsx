import React, { useState, useMemo } from 'react';
import {
  Building2,
  TrendingUp,
  TrendingDown,
  ArrowDownLeft,
  ArrowUpRight,
  PieChart,
  Percent,
  Download,
  Printer,
  Calendar,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ShieldAlert,
  Coins,
  Building,
  FileSpreadsheet,
  BarChart3,
  ExternalLink,
} from 'lucide-react';
import { downloadCsv } from '../../lib/exportUtils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RevenueExpenseItem, Branch } from '../../types/fx';
import { CURRENT_TENANT } from '../../data/mockData';
import { SubeKarZararDetayModal } from './SubeKarZararDetayModal';

interface KarZararSubeBazliProps {
  items: RevenueExpenseItem[];
  branches: Branch[];
  selectedBranchId: string;
  isGlobalUser: boolean;
  onSelectBranchFilter?: (branchId: string) => void;
  onGoToTransactions?: (branchId?: string, type?: 'GELIR' | 'GIDER') => void;
}

interface BranchPnL {
  branchId: string;
  branchName: string;
  branchCity: string;
  isHeadquarter: boolean;
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  profitMargin: number;
  incomeCount: number;
  expenseCount: number;
  calculatedVat: number; // Gelir KDV
  deductibleVat: number; // Gider KDV
  netVat: number;
  kkegTotal: number;
  stoppageTotal: number;
  topIncomeCategory: string;
  topExpenseCategory: string;
}

export const KarZararSubeBazli: React.FC<KarZararSubeBazliProps> = ({
  items,
  branches,
  selectedBranchId,
  isGlobalUser,
  onGoToTransactions,
}) => {
  const [periodFilter, setPeriodFilter] = useState<'ALL' | 'THIS_MONTH' | 'THIS_YEAR'>('ALL');
  const [activeBranchFilter, setActiveBranchFilter] = useState<string>('ALL');
  const [expandedBranchId, setExpandedBranchId] = useState<string | null>(null);
  const [selectedBranchForModal, setSelectedBranchForModal] = useState<Branch | null>(null);

  // Dönem Filtreli Veri
  const periodFilteredItems = useMemo(() => {
    let result = [...items];
    const now = new Date();

    if (periodFilter === 'THIS_MONTH') {
      const thisMonthStr = now.toISOString().slice(0, 7);
      result = result.filter(i => i.transactionDate.startsWith(thisMonthStr));
    } else if (periodFilter === 'THIS_YEAR') {
      const thisYearStr = now.toISOString().slice(0, 4);
      result = result.filter(i => i.transactionDate.startsWith(thisYearStr));
    }

    return result;
  }, [items, periodFilter]);

  // Şube Bazlı P&L Hesaplamaları
  const branchPnLList = useMemo<BranchPnL[]>(() => {
    return branches.map(branch => {
      const bItems = periodFilteredItems.filter(i => i.branchId === branch.id);

      let totalIncome = 0;
      let totalExpense = 0;
      let incomeCount = 0;
      let expenseCount = 0;
      let calculatedVat = 0;
      let deductibleVat = 0;
      let kkegTotal = 0;
      let stoppageTotal = 0;

      const incCategories: Record<string, number> = {};
      const expCategories: Record<string, number> = {};

      bItems.forEach(i => {
        if (i.type === 'GELIR') {
          totalIncome += i.grandTotal;
          calculatedVat += i.vatAmount || 0;
          incomeCount++;
          incCategories[i.category] = (incCategories[i.category] || 0) + i.grandTotal;
        } else {
          totalExpense += i.grandTotal;
          deductibleVat += i.vatAmount || 0;
          expenseCount++;
          if (i.isKKEG) kkegTotal += i.kkegAmount || i.grandTotal;
          if (i.stoppageAmount) stoppageTotal += i.stoppageAmount;
          expCategories[i.category] = (expCategories[i.category] || 0) + i.grandTotal;
        }
      });

      const netProfit = totalIncome - totalExpense;
      const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;
      const netVat = calculatedVat - deductibleVat;

      const topIncomeCategory = Object.entries(incCategories).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
      const topExpenseCategory = Object.entries(expCategories).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';

      return {
        branchId: branch.id,
        branchName: branch.name,
        branchCity: branch.city,
        isHeadquarter: branch.isHeadquarter || false,
        totalIncome,
        totalExpense,
        netProfit,
        profitMargin,
        incomeCount,
        expenseCount,
        calculatedVat,
        deductibleVat,
        netVat,
        kkegTotal,
        stoppageTotal,
        topIncomeCategory,
        topExpenseCategory,
      };
    });
  }, [branches, periodFilteredItems]);

  // Konsolide Toplamlar
  const consolidatedTotals = useMemo(() => {
    let income = 0;
    let expense = 0;
    let calcVat = 0;
    let dedVat = 0;
    let kkeg = 0;
    let stoppage = 0;

    branchPnLList.forEach(b => {
      income += b.totalIncome;
      expense += b.totalExpense;
      calcVat += b.calculatedVat;
      dedVat += b.deductibleVat;
      kkeg += b.kkegTotal;
      stoppage += b.stoppageTotal;
    });

    const net = income - expense;
    const margin = income > 0 ? (net / income) * 100 : 0;

    // En karlı şube
    const sortedByProfit = [...branchPnLList].sort((a, b) => b.netProfit - a.netProfit);
    const mostProfitableBranch = sortedByProfit[0];

    return {
      totalIncome: income,
      totalExpense: expense,
      netProfit: net,
      profitMargin: margin,
      totalCalcVat: calcVat,
      totalDedVat: dedVat,
      netVat: calcVat - dedVat,
      totalKkeg: kkeg,
      totalStoppage: stoppage,
      mostProfitableBranch,
    };
  }, [branchPnLList]);

  // Filtrelenmiş Şube Listesi (Kullanıcı dropdown'dan tek şube seçtiyse)
  const displayedBranches = useMemo(() => {
    if (activeBranchFilter === 'ALL') return branchPnLList;
    return branchPnLList.filter(b => b.branchId === activeBranchFilter);
  }, [branchPnLList, activeBranchFilter]);

  // Excel Raporu İndir
  const handleExportExcel = () => {
    try {
      const exportData = displayedBranches.map(b => ({
        'Şube Kodu / Adı': b.branchName,
        'Şehir': b.branchCity,
        'Toplam Gelir (TL)': b.totalIncome,
        'Toplam Gider (TL)': b.totalExpense,
        'Net Kâr / Zarar (TL)': b.netProfit,
        'Kârlılık Marjı (%)': `%${b.profitMargin.toFixed(1)}`,
        'Gelir İşlem Sayısı': b.incomeCount,
        'Gider İşlem Sayısı': b.expenseCount,
        'Hesaplanan KDV (TL)': b.calculatedVat,
        'İndirilecek KDV (TL)': b.deductibleVat,
        'Net KDV Pozisyonu': b.netVat >= 0 ? `₺${b.netVat.toFixed(2)} (Ödenecek)` : `-₺${Math.abs(b.netVat).toFixed(2)} (Devreden)`,
        'KKEG Yükü (TL)': b.kkegTotal,
        'En Yüksek Gelir Kalemi': b.topIncomeCategory,
        'En Yüksek Harcama Kalemi': b.topExpenseCategory,
      }));

      // Toplam satırı ekle
      exportData.push({
        'Şube Kodu / Adı': 'GENEL ŞİRKET KONSOLİDE TOPLAMI',
        'Şehir': 'TÜRKİYE',
        'Toplam Gelir (TL)': consolidatedTotals.totalIncome,
        'Toplam Gider (TL)': consolidatedTotals.totalExpense,
        'Net Kâr / Zarar (TL)': consolidatedTotals.netProfit,
        'Kârlılık Marjı (%)': `%${consolidatedTotals.profitMargin.toFixed(1)}`,
        'Gelir İşlem Sayısı': branchPnLList.reduce((acc, b) => acc + b.incomeCount, 0),
        'Gider İşlem Sayısı': branchPnLList.reduce((acc, b) => acc + b.expenseCount, 0),
        'Hesaplanan KDV (TL)': consolidatedTotals.totalCalcVat,
        'İndirilecek KDV (TL)': consolidatedTotals.totalDedVat,
        'Net KDV Pozisyonu': consolidatedTotals.netVat >= 0 ? `₺${consolidatedTotals.netVat.toFixed(2)} (Ödenecek)` : `-₺${Math.abs(consolidatedTotals.netVat).toFixed(2)} (Devreden)`,
        'KKEG Yükü (TL)': consolidatedTotals.totalKkeg,
        'En Yüksek Gelir Kalemi': '-',
        'En Yüksek Harcama Kalemi': '-',
      });

      downloadCsv(`FX_Sube_Kar_Zarar_Raporu_${new Date().toISOString().slice(0, 10)}.csv`, exportData);
    } catch (e) {
      console.error(e);
      alert('CSV raporu oluşturulurken hata meydana geldi.');
    }
  };

  // PDF Raporu İndir
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF('landscape');

      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text(`${CURRENT_TENANT.name} - Şube Bazlı Gelir Tablosu & Kâr-Zarar Mizanı`, 14, 15);

      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Dönem: ${periodFilter === 'ALL' ? 'Tüm Zamanlar' : periodFilter === 'THIS_MONTH' ? 'Bu Ay' : 'Bu Yıl'} | Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR')}`,
        14,
        22
      );

      const tableRows = displayedBranches.map(b => [
        b.branchName,
        b.branchCity,
        `₺${b.totalIncome.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`,
        `₺${b.totalExpense.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`,
        `${b.netProfit >= 0 ? '+' : ''}₺${b.netProfit.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`,
        `%${b.profitMargin.toFixed(1)}`,
        `₺${b.calculatedVat.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`,
        `₺${b.deductibleVat.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`,
        `₺${b.kkegTotal.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`,
        b.topExpenseCategory,
      ]);

      // Konsolide satırı
      tableRows.push([
        'GENEL ŞİRKET TOPLAMI',
        'TÜRKİYE',
        `₺${consolidatedTotals.totalIncome.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`,
        `₺${consolidatedTotals.totalExpense.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`,
        `${consolidatedTotals.netProfit >= 0 ? '+' : ''}₺${consolidatedTotals.netProfit.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`,
        `%${consolidatedTotals.profitMargin.toFixed(1)}`,
        `₺${consolidatedTotals.totalCalcVat.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`,
        `₺${consolidatedTotals.totalDedVat.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`,
        `₺${consolidatedTotals.totalKkeg.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`,
        'Konsolide',
      ]);

      autoTable(doc, {
        head: [['Şube', 'Şehir', 'Toplam Gelir', 'Toplam Gider', 'Net Kâr/Zarar', 'Marj (%)', 'Hesap. KDV', 'İnd. KDV', 'KKEG', 'En Yüksek Gider']],
        body: tableRows,
        startY: 28,
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      });

      doc.save(`FX_Sube_Kar_Zarar_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      console.error(e);
      alert('PDF raporu oluşturulurken hata meydana geldi.');
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* ÜST KPI ÖZET KARTLARI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* 1. Konsolide Gelir */}
        <div className="p-3.5 rounded-xl border bg-white border-stone-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span className="font-semibold text-stone-700">Konsolide Toplam Gelir</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowDownLeft className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 font-mono text-lg font-black text-emerald-600">
            ₺{consolidatedTotals.totalIncome.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-stone-400 mt-0.5">
            {branches.length} şube toplam cirosu
          </div>
        </div>

        {/* 2. Konsolide Gider */}
        <div className="p-3.5 rounded-xl border bg-white border-stone-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span className="font-semibold text-stone-700">Konsolide Toplam Gider</span>
            <div className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 font-mono text-lg font-black text-rose-600">
            ₺{consolidatedTotals.totalExpense.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-stone-400 mt-0.5">
            Tüm operasyonel harcamalar
          </div>
        </div>

        {/* 3. Net Faaliyet Kârı */}
        <div className="p-3.5 rounded-xl border bg-white border-stone-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span className="font-semibold text-stone-700">Net Faaliyet Kârı</span>
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                consolidatedTotals.netProfit >= 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
            </div>
          </div>
          <div
            className={`mt-2 font-mono text-lg font-black ${
              consolidatedTotals.netProfit >= 0 ? 'text-indigo-900' : 'text-rose-600'
            }`}
          >
            {consolidatedTotals.netProfit >= 0 ? '+' : ''}₺
            {consolidatedTotals.netProfit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center justify-between text-[10px] text-stone-400 mt-0.5">
            <span>Marj: %{consolidatedTotals.profitMargin.toFixed(1)}</span>
            <span className="text-emerald-700 font-semibold">
              {consolidatedTotals.netProfit >= 0 ? 'Pozitif Bilanço' : 'Zarar'}
            </span>
          </div>
        </div>

        {/* 4. En Yüksek Kârlı Şube */}
        <div
          onClick={() => {
            if (consolidatedTotals.mostProfitableBranch) {
              const bObj = branches.find(br => br.id === consolidatedTotals.mostProfitableBranch.branchId) || null;
              if (bObj) setSelectedBranchForModal(bObj);
            }
          }}
          className="p-3.5 rounded-xl border bg-white border-stone-200/90 shadow-xs flex flex-col justify-between cursor-pointer hover:border-amber-300 hover:bg-amber-50/20 transition-all group"
          title="En karlı şubenin detay analizini görmek için tıklayın"
        >
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span className="font-semibold text-stone-700 group-hover:text-amber-800 transition-colors">
              En Kârlı Şube
            </span>
            <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1 font-bold text-stone-900 text-sm truncate" title={consolidatedTotals.mostProfitableBranch?.branchName}>
            {consolidatedTotals.mostProfitableBranch?.branchName || '-'}
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono font-semibold text-emerald-700 mt-0.5">
            <span>
              +₺{consolidatedTotals.mostProfitableBranch?.netProfit.toLocaleString('tr-TR') || '0'} (Marj: %{consolidatedTotals.mostProfitableBranch?.profitMargin.toFixed(0)})
            </span>
            <span className="text-[10px] text-amber-700 font-sans font-normal opacity-0 group-hover:opacity-100 transition-opacity">
              İncele &rarr;
            </span>
          </div>
        </div>
      </div>

      {/* ARAÇ ÇUBUĞU VE FİLTRELER */}
      <div className="bg-white border border-stone-200/80 rounded-xl p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
            <PieChart className="w-4 h-4 text-indigo-700" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-900">Şube Bazlı Gelir Tablosu & Kâr / Zarar Analizi</h3>
            <p className="text-[11px] text-stone-500">
              Şubelerin ciro, gider, kâr marjı ve vergi yükü karşılaştırmalı mizanı
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Dönem Filtresi */}
          <select
            value={periodFilter}
            onChange={e => setPeriodFilter(e.target.value as any)}
            className="px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-semibold text-stone-700"
          >
            <option value="ALL">Tüm Zamanlar</option>
            <option value="THIS_MONTH">Bu Ay</option>
            <option value="THIS_YEAR">Bu Yıl</option>
          </select>

          {/* Şube Filtresi */}
          <select
            value={activeBranchFilter}
            onChange={e => setActiveBranchFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-semibold text-stone-700"
          >
            <option value="ALL">Tüm Şubeler (Karşılaştırmalı)</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          {/* Excel & PDF Butonları */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
            title="CSV olarak indir"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportPDF}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
            title="PDF Gelir Tablosu oluştur"
          >
            <Printer className="w-3.5 h-3.5 text-stone-600" />
            <span className="hidden sm:inline">PDF</span>
          </button>
        </div>
      </div>

      {/* ŞUBE KARŞILAŞTIRMA TABLOSU */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold">
              <tr>
                <th className="py-3 px-4">Şube & Lokasyon</th>
                <th className="py-3 px-3 text-right">Toplam Gelir (₺)</th>
                <th className="py-3 px-3 text-right">Toplam Gider (₺)</th>
                <th className="py-3 px-3 text-right">Net Kâr / Zarar (₺)</th>
                <th className="py-3 px-3 text-center">Kâr Marjı (%)</th>
                <th className="py-3 px-3 text-right">Net KDV Yükü (₺)</th>
                <th className="py-3 px-3 text-right">KKEG Yükü (₺)</th>
                <th className="py-3 px-4 text-center">Aksiyon</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {displayedBranches.map(b => {
                const isProfitable = b.netProfit >= 0;
                const isExpanded = expandedBranchId === b.branchId;

                // Gelir içindeki payı
                const incomeShare = consolidatedTotals.totalIncome > 0 ? (b.totalIncome / consolidatedTotals.totalIncome) * 100 : 0;

                return (
                  <React.Fragment key={b.branchId}>
                    <tr
                      onClick={() => {
                        const branchObj = branches.find(br => br.id === b.branchId) || null;
                        if (branchObj) setSelectedBranchForModal(branchObj);
                      }}
                      className="hover:bg-indigo-50/50 transition-colors cursor-pointer group"
                      title={`${b.branchName} detaylı kâr / zarar analizini açmak için tıklayın`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-transform group-hover:scale-110 ${
                              b.isHeadquarter ? 'bg-indigo-100 text-indigo-700' : 'bg-stone-100 text-stone-700'
                            }`}
                          >
                            <Building2 className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="font-bold text-stone-900 flex items-center gap-1.5 group-hover:text-indigo-900 transition-colors">
                              <span>{b.branchName}</span>
                              {b.isHeadquarter && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 font-semibold">
                                  Merkez
                                </span>
                              )}
                              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-indigo-600 font-semibold">
                                &bull; Detay Analiz &rarr;
                              </span>
                            </div>
                            <div className="text-[10px] text-stone-400">
                              {b.branchCity} &bull; {b.incomeCount} gelir, {b.expenseCount} gider kaydı
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                        ₺{b.totalIncome.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        <span className="block text-[9px] text-stone-400 font-sans font-normal">
                          Pay: %{incomeShare.toFixed(1)}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-rose-700">
                        ₺{b.totalExpense.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-black text-sm">
                        <span className={isProfitable ? 'text-indigo-900' : 'text-rose-600'}>
                          {isProfitable ? '+' : ''}₺{b.netProfit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                            b.profitMargin > 30
                              ? 'bg-emerald-100 text-emerald-800'
                              : b.profitMargin > 0
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          %{b.profitMargin.toFixed(1)}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-stone-700">
                        <span className={b.netVat >= 0 ? 'text-stone-800' : 'text-emerald-700 font-semibold'}>
                          {b.netVat >= 0 ? '₺' : '-₺'}{Math.abs(b.netVat).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="block text-[9px] text-stone-400 font-sans">
                          {b.netVat >= 0 ? 'Ödenecek' : 'Devreden'}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-amber-800">
                        {b.kkegTotal > 0 ? (
                          <span className="font-semibold">₺{b.kkegTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                        ) : (
                          <span className="text-stone-300">-</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const branchObj = branches.find(br => br.id === b.branchId) || null;
                              if (branchObj) setSelectedBranchForModal(branchObj);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-indigo-700 hover:text-white bg-indigo-50 hover:bg-indigo-600 rounded-lg transition-all cursor-pointer shadow-2xs"
                            title={`${b.branchName} Kâr / Zarar Detay Analizini Aç`}
                          >
                            <BarChart3 className="w-3.5 h-3.5" />
                            <span>Detaylı Analiz</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedBranchId(isExpanded ? null : b.branchId);
                            }}
                            className="px-2 py-1 text-[11px] font-medium text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                            title="Hızlı özet satırını aç/kapat"
                          >
                            {isExpanded ? 'Gizle' : 'Özet'}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* AÇILIR KIRILIM SATIRI */}
                    {isExpanded && (
                      <tr className="bg-stone-50/90 border-b border-stone-200 animate-in fade-in">
                        <td colSpan={8} className="p-4">
                          <div className="bg-white p-3.5 rounded-xl border border-stone-200 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <span className="text-[10px] text-stone-400 uppercase font-semibold block mb-1">
                                  En Yüksek Harcama Kalemi
                                </span>
                                <span className="text-xs font-bold text-rose-800">{b.topExpenseCategory}</span>
                              </div>

                              <div>
                                <span className="text-[10px] text-stone-400 uppercase font-semibold block mb-1">
                                  En Yüksek Gelir Kalemi
                                </span>
                                <span className="text-xs font-bold text-emerald-800">{b.topIncomeCategory}</span>
                              </div>

                              <div>
                                <span className="text-[10px] text-stone-400 uppercase font-semibold block mb-1">
                                  Stopaj & Muhtasar Kesintisi
                                </span>
                                <span className="text-xs font-mono font-bold text-amber-800">
                                  ₺{b.stoppageTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>

                            <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                              <span className="text-[11px] text-stone-500">
                                Tüm gelir-gider kalemlerini, muhasebe kodlarını ve vergi matrahlarını incelemek için:
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const branchObj = branches.find(br => br.id === b.branchId) || null;
                                  if (branchObj) setSelectedBranchForModal(branchObj);
                                }}
                                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline inline-flex items-center gap-1 cursor-pointer"
                              >
                                <span>{b.branchName} Detaylı Kâr / Zarar Analizini Aç</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>

            {/* KONSOLİDE TOPLAM SATIRI */}
            <tfoot className="bg-stone-100/90 border-t-2 border-stone-300 font-bold text-stone-900">
              <tr>
                <td className="py-3.5 px-4 text-xs font-black uppercase tracking-wider">
                  GENEL ŞİRKET KONSOLİDE TOPLAMI
                </td>
                <td className="py-3.5 px-3 text-right font-mono text-emerald-800 font-black">
                  ₺{consolidatedTotals.totalIncome.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </td>
                <td className="py-3.5 px-3 text-right font-mono text-rose-800 font-black">
                  ₺{consolidatedTotals.totalExpense.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </td>
                <td className="py-3.5 px-3 text-right font-mono text-indigo-950 font-black text-sm">
                  {consolidatedTotals.netProfit >= 0 ? '+' : ''}₺
                  {consolidatedTotals.netProfit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </td>
                <td className="py-3.5 px-3 text-center">
                  <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 font-black text-xs">
                    %{consolidatedTotals.profitMargin.toFixed(1)}
                  </span>
                </td>
                <td className="py-3.5 px-3 text-right font-mono">
                  {consolidatedTotals.netVat >= 0 ? '₺' : '-₺'}
                  {Math.abs(consolidatedTotals.netVat).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </td>
                <td className="py-3.5 px-3 text-right font-mono text-amber-900">
                  ₺{consolidatedTotals.totalKkeg.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </td>
                <td className="py-3.5 px-4 text-center text-[10px] text-stone-500">
                  {branches.length} Şube Konsolide
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ŞUBE KÂR / ZARAR & GELİR TABLOSU DETAY ANALİZİ MODALI */}
      {selectedBranchForModal && (
        <SubeKarZararDetayModal
          branch={selectedBranchForModal}
          items={items}
          initialPeriod={periodFilter}
          isOpen={!!selectedBranchForModal}
          onClose={() => setSelectedBranchForModal(null)}
          onGoToTransactions={onGoToTransactions}
        />
      )}
    </div>
  );
};

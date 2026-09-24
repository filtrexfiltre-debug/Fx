import React, { useState, useMemo } from 'react';
import {
  X,
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
  ExternalLink,
  CreditCard,
  Wallet,
  Receipt,
  Scale,
  DollarSign,
  HelpCircle,
  FileText,
} from 'lucide-react';
import { downloadCsvSections } from '../../lib/exportUtils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RevenueExpenseItem, Branch } from '../../types/fx';
import { CURRENT_TENANT } from '../../data/mockData';

interface SubeKarZararDetayModalProps {
  branch: Branch | null;
  items: RevenueExpenseItem[];
  initialPeriod?: 'ALL' | 'THIS_MONTH' | 'THIS_YEAR';
  isOpen: boolean;
  onClose: () => void;
  onGoToTransactions?: (branchId?: string, type?: 'GELIR' | 'GIDER') => void;
}

interface CategoryBreakdown {
  name: string;
  code?: string;
  totalAmount: number;
  baseAmount: number;
  vatAmount: number;
  count: number;
  percentage: number;
  kkegAmount?: number;
}

export const SubeKarZararDetayModal: React.FC<SubeKarZararDetayModalProps> = ({
  branch,
  items,
  initialPeriod = 'ALL',
  isOpen,
  onClose,
  onGoToTransactions,
}) => {
  const [period, setPeriod] = useState<'ALL' | 'THIS_MONTH' | 'THIS_YEAR'>(initialPeriod);
  const [activeTab, setActiveTab] = useState<'MIZAN' | 'VERGI' | 'ODEME' | 'HAREKETLER'>('MIZAN');

  // Dönem Filtresi
  const branchItems = useMemo(() => {
    if (!branch) return [];
    let list = items.filter(i => i.branchId === branch.id);
    const now = new Date();

    if (period === 'THIS_MONTH') {
      const monthStr = now.toISOString().slice(0, 7);
      list = list.filter(i => i.transactionDate.startsWith(monthStr));
    } else if (period === 'THIS_YEAR') {
      const yearStr = now.toISOString().slice(0, 4);
      list = list.filter(i => i.transactionDate.startsWith(yearStr));
    }

    return list;
  }, [items, branch, period]);

  // Finansal KPI Hesaplamaları
  const stats = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    let incomeBase = 0;
    let expenseBase = 0;
    let calculatedVat = 0;
    let deductibleVat = 0;
    let kkegTotal = 0;
    let stoppageTotal = 0;
    let withholdingTotal = 0;
    let incomeCount = 0;
    let expenseCount = 0;

    const incomeCatMap: Record<string, { amount: number; base: number; vat: number; count: number; code?: string }> = {};
    const expenseCatMap: Record<string, { amount: number; base: number; vat: number; count: number; kkeg: number; code?: string }> = {};
    const paymentMethods: Record<string, { income: number; expense: number; count: number }> = {};
    const cashBankMap: Record<string, { income: number; expense: number }> = {};

    branchItems.forEach(i => {
      const method = i.paymentMethod || 'DIGER';
      if (!paymentMethods[method]) {
        paymentMethods[method] = { income: 0, expense: 0, count: 0 };
      }
      paymentMethods[method].count++;

      const cb = i.cashBankName || 'Belirtilmemiş';
      if (!cashBankMap[cb]) {
        cashBankMap[cb] = { income: 0, expense: 0 };
      }

      if (i.type === 'GELIR') {
        totalIncome += i.grandTotal;
        incomeBase += i.baseAmount;
        calculatedVat += i.vatAmount || 0;
        incomeCount++;
        paymentMethods[method].income += i.grandTotal;
        cashBankMap[cb].income += i.grandTotal;

        if (!incomeCatMap[i.category]) {
          incomeCatMap[i.category] = { amount: 0, base: 0, vat: 0, count: 0, code: i.accountingCode };
        }
        incomeCatMap[i.category].amount += i.grandTotal;
        incomeCatMap[i.category].base += i.baseAmount;
        incomeCatMap[i.category].vat += i.vatAmount || 0;
        incomeCatMap[i.category].count++;
      } else {
        totalExpense += i.grandTotal;
        expenseBase += i.baseAmount;
        deductibleVat += i.vatAmount || 0;
        expenseCount++;
        paymentMethods[method].expense += i.grandTotal;
        cashBankMap[cb].expense += i.grandTotal;

        if (i.isKKEG) kkegTotal += i.kkegAmount || i.grandTotal;
        if (i.stoppageAmount) stoppageTotal += i.stoppageAmount;
        if (i.withholdingAmount) withholdingTotal += i.withholdingAmount;

        if (!expenseCatMap[i.category]) {
          expenseCatMap[i.category] = { amount: 0, base: 0, vat: 0, count: 0, kkeg: 0, code: i.accountingCode };
        }
        expenseCatMap[i.category].amount += i.grandTotal;
        expenseCatMap[i.category].base += i.baseAmount;
        expenseCatMap[i.category].vat += i.vatAmount || 0;
        expenseCatMap[i.category].count++;
        if (i.isKKEG) expenseCatMap[i.category].kkeg += i.kkegAmount || i.grandTotal;
      }
    });

    const netProfit = totalIncome - totalExpense;
    const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;
    const netVat = calculatedVat - deductibleVat;

    // Gelir kategorileri dizisi
    const incomeCategories: CategoryBreakdown[] = Object.entries(incomeCatMap)
      .map(([name, val]) => ({
        name,
        code: val.code || '600',
        totalAmount: val.amount,
        baseAmount: val.base,
        vatAmount: val.vat,
        count: val.count,
        percentage: totalIncome > 0 ? (val.amount / totalIncome) * 100 : 0,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    // Gider kategorileri dizisi
    const expenseCategories: CategoryBreakdown[] = Object.entries(expenseCatMap)
      .map(([name, val]) => ({
        name,
        code: val.code || '770',
        totalAmount: val.amount,
        baseAmount: val.base,
        vatAmount: val.vat,
        count: val.count,
        percentage: totalExpense > 0 ? (val.amount / totalExpense) * 100 : 0,
        kkegAmount: val.kkeg,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    return {
      totalIncome,
      totalExpense,
      incomeBase,
      expenseBase,
      netProfit,
      profitMargin,
      calculatedVat,
      deductibleVat,
      netVat,
      kkegTotal,
      stoppageTotal,
      withholdingTotal,
      incomeCount,
      expenseCount,
      incomeCategories,
      expenseCategories,
      paymentMethods,
      cashBankMap,
    };
  }, [branchItems]);

  if (!isOpen || !branch) return null;

  // Excel Raporu
  const handleExportExcel = () => {
    try {
      const pnlData = [
        { 'Metrik / Gösterge': 'Şube Adı', 'Değer': branch.name },
        { 'Metrik / Gösterge': 'Şube Lokasyonu', 'Değer': branch.city },
        { 'Metrik / Gösterge': 'Statü', 'Değer': branch.isHeadquarter ? 'Merkez Şube' : 'Şube' },
        { 'Metrik / Gösterge': 'Dönem', 'Değer': period === 'ALL' ? 'Tüm Zamanlar' : period === 'THIS_MONTH' ? 'Bu Ay' : 'Bu Yıl' },
        { 'Metrik / Gösterge': 'Toplam Gelir (TL)', 'Değer': stats.totalIncome },
        { 'Metrik / Gösterge': 'Toplam Gider (TL)', 'Değer': stats.totalExpense },
        { 'Metrik / Gösterge': 'Net Kâr / Zarar (TL)', 'Değer': stats.netProfit },
        { 'Metrik / Gösterge': 'Kârlılık Marjı (%)', 'Değer': `%${stats.profitMargin.toFixed(2)}` },
        { 'Metrik / Gösterge': 'Hesaplanan KDV (TL)', 'Değer': stats.calculatedVat },
        { 'Metrik / Gösterge': 'İndirilecek KDV (TL)', 'Değer': stats.deductibleVat },
        { 'Metrik / Gösterge': 'Net KDV Pozisyonu (TL)', 'Değer': stats.netVat },
        { 'Metrik / Gösterge': 'KKEG Yükü (TL)', 'Değer': stats.kkegTotal },
        { 'Metrik / Gösterge': 'Stopaj Kesintileri (TL)', 'Değer': stats.stoppageTotal },
      ];

      const incData = stats.incomeCategories.map(c => ({
        'Tür': 'GELİR',
        'Hesap Kodu': c.code || '600',
        'Kategori Adı': c.name,
        'İşlem Adedi': c.count,
        'Matrah (KDV Hariç)': c.baseAmount,
        'KDV Tutarı': c.vatAmount,
        'Genel Toplam (TL)': c.totalAmount,
        'Gelir Payı (%)': `%${c.percentage.toFixed(1)}`,
      }));

      const expData = stats.expenseCategories.map(c => ({
        'Tür': 'GİDER',
        'Hesap Kodu': c.code || '770',
        'Kategori Adı': c.name,
        'İşlem Adedi': c.count,
        'Matrah (KDV Hariç)': c.baseAmount,
        'KDV Tutarı': c.vatAmount,
        'Genel Toplam (TL)': c.totalAmount,
        'Gider Payı (%)': `%${c.percentage.toFixed(1)}`,
        'KKEG Tutarı': c.kkegAmount || 0,
      }));

      downloadCsvSections(
        `${branch.name.replace(/\s+/g, '_')}_Kar_Zarar_Detay_${new Date().toISOString().slice(0, 10)}.csv`,
        [
          { title: 'Ozet_Kar_Zarar', rows: pnlData },
          { title: 'Gelir_Kalemleri', rows: incData },
          { title: 'Gider_Kalemleri', rows: expData },
        ],
      );
    } catch (e) {
      console.error(e);
      alert('CSV raporu hazırlanırken bir hata oluştu.');
    }
  };

  // PDF Raporu
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text(`${CURRENT_TENANT.name} - ${branch.name} Gelir Tablosu ve Kâr/Zarar Analizi`, 14, 15);

      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Lokasyon: ${branch.city} | Dönem: ${period === 'ALL' ? 'Tüm Zamanlar' : period === 'THIS_MONTH' ? 'Bu Ay' : 'Bu Yıl'} | Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 14, 22);

      // Finansal özet tablosu
      const summaryRows = [
        ['Toplam Hasılat / Gelir', `₺${stats.totalIncome.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`, `${stats.incomeCount} İşlem`],
        ['Toplam Operasyonel Gider', `₺${stats.totalExpense.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`, `${stats.expenseCount} İşlem`],
        ['Net Faaliyet Kârı / Zararı', `${stats.netProfit >= 0 ? '+' : ''}₺${stats.netProfit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`, `Kâr Marjı: %${stats.profitMargin.toFixed(1)}`],
        ['Hesaplanan KDV (Gelir)', `₺${stats.calculatedVat.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`, 'Müşteri Tahsilatı'],
        ['İndirilecek KDV (Gider)', `₺${stats.deductibleVat.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`, 'Tedarikçi/Maliyet İndirimi'],
        ['Net KDV Pozisyonu', `₺${stats.netVat.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`, stats.netVat >= 0 ? 'Ödenecek Vergi' : 'Devreden KDV'],
        ['KKEG Yükü', `₺${stats.kkegTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`, 'Vergi Matrahına Eklenecek'],
      ];

      autoTable(doc, {
        head: [['Finansal Kalem / Gösterge', 'Tutar (TL)', 'Açıklama']],
        body: summaryRows,
        startY: 28,
        styles: { fontSize: 8.5 },
        headStyles: { fillColor: [79, 70, 229] },
      });

      // Gelir Kalemleri tablosu
      const incomeRows = stats.incomeCategories.map(c => [
        c.code || '600',
        c.name,
        `${c.count} Adet`,
        `₺${c.totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`,
        `%${c.percentage.toFixed(1)}`,
      ]);

      const finalY = (doc as any).lastAutoTable.finalY + 8;
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text('Gelir Kalemleri Kırılımı', 14, finalY);

      autoTable(doc, {
        head: [['TDHP', 'Kategori', 'İşlem', 'Toplam Tutar', 'Pay']],
        body: incomeRows.length > 0 ? incomeRows : [['-', 'Kayıt bulunamadı', '-', '₺0', '%0']],
        startY: finalY + 4,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [16, 185, 129] },
      });

      doc.save(`${branch.name.replace(/\s+/g, '_')}_Kar_Zarar_Raporu.pdf`);
    } catch (e) {
      console.error(e);
      alert('PDF raporu oluşturulurken hata meydana geldi.');
    }
  };

  const isProfitable = stats.netProfit >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* MODAL ÜST BAŞLIK */}
        <div className="px-5 py-4 border-b border-stone-200 bg-stone-50/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-xs ${
                branch.isHeadquarter ? 'bg-indigo-600 text-white' : 'bg-stone-800 text-white'
              }`}
            >
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-stone-900 tracking-tight">
                  {branch.name}
                </h2>
                {branch.isHeadquarter && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold">
                    Genel Merkez
                  </span>
                )}
                <span className="text-xs text-stone-500 font-medium hidden sm:inline">
                  &bull; {branch.city}
                </span>
              </div>
              <p className="text-xs text-stone-500">
                Şube Kâr / Zarar Mizanı, Gelir-Gider Kırılımları ve Vergi Dengesi
              </p>
            </div>
          </div>

          {/* ARAÇLAR: DÖNEM FİLTRESİ, EXCEL, PDF, KAPAT */}
          <div className="flex items-center gap-2">
            <select
              value={period}
              onChange={e => setPeriod(e.target.value as any)}
              className="px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-semibold text-stone-700 shadow-2xs cursor-pointer"
            >
              <option value="ALL">Tüm Zamanlar</option>
              <option value="THIS_MONTH">Bu Ay</option>
              <option value="THIS_YEAR">Bu Yıl</option>
            </select>

            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
              title="CSV raporu indir"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden md:inline">CSV</span>
            </button>

            <button
              type="button"
              onClick={handleExportPDF}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
              title="PDF Gelir Tablosu Oluştur"
            >
              <Printer className="w-3.5 h-3.5 text-stone-600" />
              <span className="hidden md:inline">PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL İÇERİK (SCROLL ALANI) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-stone-50/40">

          {/* 4 TEMEL KPI ÖZET KARTI */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. TOPLAM GELİR (HASILAT) */}
            <div className="p-3.5 rounded-xl border bg-white border-stone-200 shadow-xs">
              <div className="flex items-center justify-between text-xs text-stone-500">
                <span className="font-semibold text-stone-700">Toplam Hasılat (Gelir)</span>
                <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2 font-mono text-lg font-black text-emerald-700">
                ₺{stats.totalIncome.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </div>
              <div className="flex items-center justify-between text-[11px] text-stone-400 mt-1">
                <span>{stats.incomeCount} tahsilat kaydı</span>
                <span>Matrah: ₺{stats.incomeBase.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</span>
              </div>
            </div>

            {/* 2. TOPLAM GİDER (MALİYETLER) */}
            <div className="p-3.5 rounded-xl border bg-white border-stone-200 shadow-xs">
              <div className="flex items-center justify-between text-xs text-stone-500">
                <span className="font-semibold text-stone-700">Operasyonel Giderler</span>
                <div className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2 font-mono text-lg font-black text-rose-700">
                ₺{stats.totalExpense.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </div>
              <div className="flex items-center justify-between text-[11px] text-stone-400 mt-1">
                <span>{stats.expenseCount} harcama kaydı</span>
                <span>Matrah: ₺{stats.expenseBase.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</span>
              </div>
            </div>

            {/* 3. NET FAALİYET KÂRI / ZARARI */}
            <div className="p-3.5 rounded-xl border bg-white border-stone-200 shadow-xs">
              <div className="flex items-center justify-between text-xs text-stone-500">
                <span className="font-semibold text-stone-700">Net Faaliyet Kârı / Zararı</span>
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                    isProfitable ? 'bg-indigo-50 text-indigo-700' : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  <Coins className="w-3.5 h-3.5" />
                </div>
              </div>
              <div
                className={`mt-2 font-mono text-lg font-black ${
                  isProfitable ? 'text-indigo-950' : 'text-rose-600'
                }`}
              >
                {isProfitable ? '+' : ''}₺
                {stats.netProfit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </div>
              <div className="flex items-center justify-between text-[11px] mt-1 font-semibold">
                <span className={isProfitable ? 'text-emerald-700' : 'text-rose-600'}>
                  Marj: %{stats.profitMargin.toFixed(1)}
                </span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded ${isProfitable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {isProfitable ? 'Net Kâr' : 'Net Zarar'}
                </span>
              </div>
            </div>

            {/* 4. NET KDV POZİSYONU */}
            <div className="p-3.5 rounded-xl border bg-white border-stone-200 shadow-xs">
              <div className="flex items-center justify-between text-xs text-stone-500">
                <span className="font-semibold text-stone-700">Net KDV Dengesi</span>
                <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Scale className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2 font-mono text-lg font-black text-stone-900">
                {stats.netVat >= 0 ? '₺' : '-₺'}
                {Math.abs(stats.netVat).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </div>
              <div className="flex items-center justify-between text-[11px] text-stone-500 mt-1">
                <span>{stats.netVat >= 0 ? 'Devlete Ödenecek' : 'Sonraki Aya Devreden'}</span>
                {stats.kkegTotal > 0 && (
                  <span className="text-amber-800 font-bold" title="Kanunen Kabul Edilmeyen Gider">
                    KKEG: ₺{stats.kkegTotal.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* İÇ SEKME MENÜSÜ */}
          <div className="border-b border-stone-200 flex items-center gap-2 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('MIZAN')}
              className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'MIZAN'
                  ? 'border-indigo-600 text-indigo-600 font-bold'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <PieChart className="w-4 h-4" />
              <span>Gelir & Gider Kalemleri Mizanı</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('VERGI')}
              className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'VERGI'
                  ? 'border-indigo-600 text-indigo-600 font-bold'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <Scale className="w-4 h-4" />
              <span>Vergi & Mali Yük Analizi</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ODEME')}
              className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'ODEME'
                  ? 'border-indigo-600 text-indigo-600 font-bold'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <Wallet className="w-4 h-4" />
              <span>Kasa / Banka & Ödeme Kanalları</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('HAREKETLER')}
              className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'HAREKETLER'
                  ? 'border-indigo-600 text-indigo-600 font-bold'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>Son Hareketler ({branchItems.length})</span>
            </button>
          </div>

          {/* SEKME 1: GELİR & GİDER KALEMLERİ MİZANI */}
          {activeTab === 'MIZAN' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              
              {/* SOL SÜTUN: GELİR KALEMLERİ */}
              <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
                      600
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-stone-900">Gelir Kalemleri Dağılımı</h4>
                      <p className="text-[10px] text-stone-400">Hasılat ve faaliyet gelirleri</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-emerald-700">
                      ₺{stats.totalIncome.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="block text-[9px] text-stone-400">100% Ciro</span>
                  </div>
                </div>

                {stats.incomeCategories.length === 0 ? (
                  <div className="py-8 text-center text-xs text-stone-400">
                    Bu dönemde şubeye ait gelir kaydı bulunmamaktadır.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stats.incomeCategories.map(cat => (
                      <div key={cat.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 truncate max-w-[70%]">
                            <span className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 font-mono text-[10px]">
                              {cat.code}
                            </span>
                            <span className="font-semibold text-stone-800 truncate" title={cat.name}>
                              {cat.name}
                            </span>
                            <span className="text-[10px] text-stone-400">({cat.count} işlem)</span>
                          </div>
                          <div className="text-right font-mono font-bold text-emerald-800">
                            ₺{cat.totalAmount.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                            <span className="text-[10px] text-stone-400 ml-1 font-normal font-sans">
                              (%{cat.percentage.toFixed(1)})
                            </span>
                          </div>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all"
                            style={{ width: `${Math.min(100, Math.max(2, cat.percentage))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SAĞ SÜTUN: GİDER KALEMLERİ */}
              <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-rose-50 text-rose-700 flex items-center justify-center font-bold text-xs">
                      700
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-stone-900">Gider Kalemleri Dağılımı</h4>
                      <p className="text-[10px] text-stone-400">Maliyet, işletme ve operasyon giderleri</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-rose-700">
                      ₺{stats.totalExpense.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="block text-[9px] text-stone-400">100% Gider</span>
                  </div>
                </div>

                {stats.expenseCategories.length === 0 ? (
                  <div className="py-8 text-center text-xs text-stone-400">
                    Bu dönemde şubeye ait gider kaydı bulunmamaktadır.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stats.expenseCategories.map(cat => (
                      <div key={cat.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 truncate max-w-[70%]">
                            <span className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 font-mono text-[10px]">
                              {cat.code}
                            </span>
                            <span className="font-semibold text-stone-800 truncate" title={cat.name}>
                              {cat.name}
                            </span>
                            <span className="text-[10px] text-stone-400">({cat.count} işlem)</span>
                            {cat.kkegAmount && cat.kkegAmount > 0 && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold" title="KKEG">
                                KKEG
                              </span>
                            )}
                          </div>
                          <div className="text-right font-mono font-bold text-rose-800">
                            ₺{cat.totalAmount.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                            <span className="text-[10px] text-stone-400 ml-1 font-normal font-sans">
                              (%{cat.percentage.toFixed(1)})
                            </span>
                          </div>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-rose-500 h-full rounded-full transition-all"
                            style={{ width: `${Math.min(100, Math.max(2, cat.percentage))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SEKME 2: VERGİ & MALİ YÜK ANALİZİ */}
          {activeTab === 'VERGI' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* 1. KDV Dengesi */}
                <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between text-xs text-stone-500">
                    <span className="font-bold text-stone-800">KDV Hesabı (KDV Beyannamesi)</span>
                    <Scale className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="divide-y divide-stone-100 text-xs">
                    <div className="py-2 flex justify-between">
                      <span className="text-stone-600">391 Hesaplanan KDV (Gelir):</span>
                      <span className="font-mono font-bold text-stone-900">
                        ₺{stats.calculatedVat.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="py-2 flex justify-between">
                      <span className="text-stone-600">191 İndirilecek KDV (Gider):</span>
                      <span className="font-mono font-bold text-stone-900">
                        ₺{stats.deductibleVat.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="py-2 flex justify-between font-bold bg-stone-50 px-2 rounded-lg mt-1">
                      <span className={stats.netVat >= 0 ? 'text-indigo-900' : 'text-emerald-800'}>
                        {stats.netVat >= 0 ? '360 Ödenecek KDV:' : '190 Devreden KDV:'}
                      </span>
                      <span className="font-mono text-sm">
                        {stats.netVat >= 0 ? '₺' : '-₺'}
                        {Math.abs(stats.netVat).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. KKEG Yükü */}
                <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between text-xs text-stone-500">
                    <span className="font-bold text-stone-800">KKEG Analizi (GVK/KVK)</span>
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                  </div>
                  <p className="text-[11px] text-stone-500">
                    Kanunen kabul edilmeyen giderler şube kârını düşürmekle birlikte dönem sonunda kurumlar vergisi matrahına eklenir.
                  </p>
                  <div className="bg-amber-50/60 border border-amber-200/60 p-3 rounded-lg mt-2">
                    <div className="text-[11px] text-amber-800 font-medium">Toplam KKEG Yükü:</div>
                    <div className="text-lg font-mono font-black text-amber-900">
                      ₺{stats.kkegTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] text-amber-700 mt-0.5">
                      Vergi matrahına ilave edilecek tutar
                    </div>
                  </div>
                </div>

                {/* 3. Stopaj & Tevkifat */}
                <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between text-xs text-stone-500">
                    <span className="font-bold text-stone-800">Stopaj & Muhtasar Kesintileri</span>
                    <Coins className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="divide-y divide-stone-100 text-xs">
                    <div className="py-2 flex justify-between">
                      <span className="text-stone-600">Muhtasar Stopaj Kesintisi:</span>
                      <span className="font-mono font-bold text-stone-900">
                        ₺{stats.stoppageTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="py-2 flex justify-between">
                      <span className="text-stone-600">KDV Tevkifat Kesintisi:</span>
                      <span className="font-mono font-bold text-stone-900">
                        ₺{stats.withholdingTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="py-2 text-[11px] text-stone-500">
                      Kira, serbest meslek ve hizmet alımlarından doğan yasal tevkifatlar.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SEKME 3: KASA / BANKA & ÖDEME KANALLARI */}
          {activeTab === 'ODEME' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Ödeme Yöntemleri */}
              <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs space-y-3">
                <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-indigo-600" />
                  <span>Ödeme & Tahsilat Kanalları</span>
                </h4>
                <div className="divide-y divide-stone-100 text-xs">
                  {(Object.entries(stats.paymentMethods) as [string, { income: number; expense: number; count: number }][]).map(([m, data]) => {
                    const label =
                      m === 'NAKIT'
                        ? 'Nakit Kasa'
                        : m === 'HAVALE_EFT'
                        ? 'Banka Havale / EFT'
                        : m === 'KREDI_KARTI'
                        ? 'Kredi Kartı / POS'
                        : m === 'CEK_SENET'
                        ? 'Çek & Senet'
                        : m === 'ACIK_HESAP'
                        ? 'Açık Hesap (Cari)'
                        : m;
                    return (
                      <div key={m} className="py-2.5 flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-stone-800">{label}</span>
                          <span className="text-[10px] text-stone-400 block">{data.count} işlem</span>
                        </div>
                        <div className="text-right font-mono">
                          <div className="text-emerald-700 font-bold">
                            +₺{data.income.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                          </div>
                          <div className="text-rose-700 font-bold">
                            -₺{data.expense.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Kasa ve Banka Hesapları */}
              <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs space-y-3">
                <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                  <span>Kasa & Banka Hareket Dağılımı</span>
                </h4>
                <div className="divide-y divide-stone-100 text-xs">
                  {(Object.entries(stats.cashBankMap) as [string, { income: number; expense: number }][]).map(([name, data]) => (
                    <div key={name} className="py-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-stone-800">{name}</span>
                        <span className="text-[10px] text-stone-400 block">Şube İlişkili Hesap</span>
                      </div>
                      <div className="text-right font-mono">
                        <div className="text-emerald-700 font-bold">
                          +₺{data.income.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                        </div>
                        <div className="text-rose-700 font-bold">
                          -₺{data.expense.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SEKME 4: ŞUBENİN SON İŞLEM HAREKETLERİ */}
          {activeTab === 'HAREKETLER' && (
            <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="px-4 py-3 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-stone-900">
                    {branch.name} - Gelir & Gider Hareketleri ({branchItems.length})
                  </h4>
                  <p className="text-[10px] text-stone-500">
                    Seçili dönemde şubede gerçekleşen tüm tahsilat ve ödeme fişleri
                  </p>
                </div>
                {onGoToTransactions && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onGoToTransactions(branch.id);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors cursor-pointer shadow-xs"
                  >
                    <span>Tüm Hareketleri Listede Gör</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="overflow-x-auto max-h-[360px]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50/90 sticky top-0 border-b border-stone-200 text-stone-600 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Tarih & Belge No</th>
                      <th className="py-2.5 px-3">Tür</th>
                      <th className="py-2.5 px-3">Kategori</th>
                      <th className="py-2.5 px-3">Açıklama / Başlık</th>
                      <th className="py-2.5 px-3 text-right">KDV</th>
                      <th className="py-2.5 px-3 text-right">Toplam Tutar</th>
                      <th className="py-2.5 px-3 text-center">Durum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {branchItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-xs text-stone-400">
                          Bu dönemde kayıt bulunamadı.
                        </td>
                      </tr>
                    ) : (
                      branchItems.slice(0, 30).map(item => {
                        const isInc = item.type === 'GELIR';
                        return (
                          <tr key={item.id} className="hover:bg-stone-50 transition-colors">
                            <td className="py-2.5 px-3 font-mono">
                              <div className="font-semibold text-stone-800">{item.transactionDate}</div>
                              <div className="text-[10px] text-stone-400">{item.documentNumber || item.itemCode}</div>
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  isInc ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {isInc ? 'Gelir' : 'Gider'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-medium text-stone-800">
                              {item.category}
                            </td>
                            <td className="py-2.5 px-3 text-stone-700 max-w-[200px] truncate" title={item.title}>
                              {item.title}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-stone-500">
                              %{(item.vatRate || 0) * 100}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold">
                              <span className={isInc ? 'text-emerald-700' : 'text-rose-700'}>
                                {isInc ? '+' : '-'}₺{item.grandTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                  item.paymentStatus === 'PAID'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : item.paymentStatus === 'PENDING'
                                    ? 'bg-amber-50 text-amber-700'
                                    : 'bg-stone-100 text-stone-600'
                                }`}
                              >
                                {item.paymentStatus === 'PAID' ? 'Ödendi' : 'Beklemede'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* MODAL ALT ÇUBUK */}
        <div className="px-5 py-3 border-t border-stone-200 bg-stone-50 flex items-center justify-between text-xs">
          <div className="text-stone-500 flex items-center gap-2">
            <span className="font-semibold text-stone-700">{branch.name}</span>
            <span>&bull;</span>
            <span>Toplam {branchItems.length} işlem kaydı inceleniyor</span>
          </div>

          <div className="flex items-center gap-2">
            {onGoToTransactions && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onGoToTransactions(branch.id);
                }}
                className="px-3 py-1.5 font-semibold text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
              >
                Bu Şubenin Gelir/Gider Listesine Git &rarr;
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 font-semibold bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-lg transition-colors cursor-pointer"
            >
              Kapat
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

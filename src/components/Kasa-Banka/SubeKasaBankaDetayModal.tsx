import React, { useState, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { appTheme } from '../../lib/agGridTheme';
import {
  ColDef,
  ICellRendererParams,
  ModuleRegistry,
  AllCommunityModule,
  ValidationModule,
  
} from 'ag-grid-community';
import { AG_GRID_LOCALE_TR } from '../../lib/agGridLocaleTR';
import {
  Building2,
  Wallet,
  Landmark,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  X,
  CreditCard as CreditCardIcon,
  Smartphone,
  MapPin,
  Plus,
  Copy,
} from 'lucide-react';
import { Branch, CashBank, PaymentMovement, InterBranchTransfer } from '../../types/fx';

// Register AG Grid modules

interface SubeKasaBankaDetayModalProps {
  isOpen: boolean;
  onClose: () => void;
  branch: Branch | null;
  cashBanks: CashBank[];
  paymentMovements: PaymentMovement[];
  transfers: InterBranchTransfer[];
  onOpenNewAccountModal: (branchId: string) => void;
  onOpenQuickActionModal: (account: CashBank, type: 'IN' | 'OUT') => void;
}

export const SubeKasaBankaDetayModal: React.FC<SubeKasaBankaDetayModalProps> = ({
  isOpen,
  onClose,
  branch,
  cashBanks,
  paymentMovements,
  transfers,
  onOpenNewAccountModal,
  onOpenQuickActionModal,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'HESAPLAR' | 'HAREKETLER'>('HESAPLAR');
  const [copiedIban, setCopiedIban] = useState<string | null>(null);

  const movementColumnDefs = useMemo<ColDef<PaymentMovement>[]>(() => [
    {
      field: 'movementDate',
      headerName: 'Tarih',
      width: 110,
      valueGetter: (params) => {
        const pm = params.data;
        if (!pm) return '';
        return pm.movementDate ? pm.movementDate.slice(0, 10) : pm.createdAt?.slice(0, 10) || '';
      },
      cellRenderer: (params: ICellRendererParams<PaymentMovement>) => (
        <div className="flex items-center h-full font-mono text-stone-600 text-xs">{params.value}</div>
      ),
    },
    {
      field: 'movementType',
      headerName: 'Tür',
      width: 100,
      valueFormatter: (params) => params.value === 'TAHSILAT' ? 'TAHSİLAT' : 'ÖDEME',
      cellRenderer: (params: ICellRendererParams<PaymentMovement>) => {
        if (!params.data) return null;
        const isIn = params.data.movementType === 'TAHSILAT';
        return (
          <div className="flex items-center h-full">
            <span
              className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                isIn ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              }`}
            >
              {params.data.movementType}
            </span>
          </div>
        );
      },
    },
    {
      field: 'cashBankName',
      headerName: 'Hesap',
      flex: 1,
      minWidth: 120,
      cellRenderer: (params: ICellRendererParams<PaymentMovement>) => (
        <div className="flex items-center h-full font-semibold text-stone-800 text-xs truncate">{params.value}</div>
      ),
    },
    {
      field: 'contactTitle',
      headerName: 'Cari / Açıklama',
      flex: 1.5,
      minWidth: 180,
      valueGetter: (params) => {
        const pm = params.data;
        if (!pm) return '';
        return `${pm.contactTitle || ''} ${pm.description || ''}`.trim();
      },
      cellRenderer: (params: ICellRendererParams<PaymentMovement>) => (
        <div className="flex items-center h-full text-stone-600 text-xs truncate" title={params.value}>
          {params.value}
        </div>
      ),
    },
    {
      field: 'amount',
      headerName: 'Tutar',
      width: 120,
      cellRenderer: (params: ICellRendererParams<PaymentMovement>) => {
        if (!params.data) return null;
        const isIn = params.data.movementType === 'TAHSILAT';
        return (
          <div className={`flex items-center justify-end h-full font-mono font-bold text-xs ${isIn ? 'text-emerald-700' : 'text-rose-700'}`}>
            ₺{params.data.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          </div>
        );
      },
    },
  ], []);

  if (!isOpen || !branch) return null;

  // Bu şubeye ait hesaplar
  const branchAccounts = cashBanks.filter((cb) => cb.branchId === branch.id);
  const cashAccounts = branchAccounts.filter((cb) => cb.type === 'Cash');
  const bankAccounts = branchAccounts.filter((cb) => cb.type === 'Bank');
  const posAccounts = branchAccounts.filter((cb) => cb.type === 'POS');
  const creditCardAccounts = branchAccounts.filter((cb) => cb.type === 'CreditCard');

  const totalCashBalance = cashAccounts.reduce((acc, c) => acc + c.balance, 0);
  const totalBankBalance = bankAccounts.reduce((acc, c) => acc + c.balance, 0);
  const totalPosBalance = posAccounts.reduce((acc, c) => acc + c.balance, 0);
  const totalCardDebt = creditCardAccounts.reduce((acc, c) => acc + c.balance, 0);
  const totalBranchLiquidity = totalCashBalance + totalBankBalance;

  // Bu şubeye ait hareketler (tahsilat / ödeme)
  const branchMovements = paymentMovements.filter((pm) => pm.branchId === branch.id);

  const handleCopyIban = (iban: string) => {
    navigator.clipboard.writeText(iban);
    setCopiedIban(iban);
    setTimeout(() => setCopiedIban(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white border border-stone-200 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* ÜST HEADER */}
        <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-stone-900 leading-tight">
                  {branch.name} &bull; Kasa, Banka & Kart Detayı
                </h2>
                {branch.isHeadquarter && (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full">
                    Genel Merkez
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-stone-500 mt-0.5">
                <span className="flex items-center gap-1 font-mono">
                  <span className="font-semibold text-stone-700">Kod:</span> {branch.code}
                </span>
                <span>&bull;</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-stone-400" />
                  {branch.city}
                </span>
                {branch.address && (
                  <>
                    <span>&bull;</span>
                    <span className="truncate max-w-xs">{branch.address}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenNewAccountModal(branch.id)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Yeni Hesap / Kart Ekle</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-200/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ORTA GÖVDE (KAYDIRILABİLİR ALAN) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* KPI KARTLARI */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {/* Toplam Likidite */}
            <div className="p-3 rounded-xl border border-indigo-100 bg-indigo-50/50">
              <div className="text-[10px] font-semibold text-indigo-800 flex items-center justify-between">
                <span>Net Likidite</span>
                <Landmark className="w-3.5 h-3.5 text-indigo-600" />
              </div>
              <div className="text-base font-mono font-black text-indigo-950 mt-1 truncate">
                ₺{totalBranchLiquidity.toLocaleString('tr-TR', { minimumFractionDigits: 0 })}
              </div>
              <div className="text-[9px] text-indigo-600 mt-0.5">Nakit + Banka</div>
            </div>

            {/* Nakit Kasa Bakiyesi */}
            <div className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/40">
              <div className="text-[10px] font-semibold text-emerald-800 flex items-center justify-between">
                <span>Nakit Kasalar</span>
                <Wallet className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="text-base font-mono font-black text-emerald-950 mt-1 truncate">
                ₺{totalCashBalance.toLocaleString('tr-TR', { minimumFractionDigits: 0 })}
              </div>
              <div className="text-[9px] text-emerald-600 mt-0.5">{cashAccounts.length} kasa</div>
            </div>

            {/* Banka Hesapları Bakiyesi */}
            <div className="p-3 rounded-xl border border-cyan-100 bg-cyan-50/40">
              <div className="text-[10px] font-semibold text-cyan-800 flex items-center justify-between">
                <span>Banka Hesabı</span>
                <Landmark className="w-3.5 h-3.5 text-cyan-600" />
              </div>
              <div className="text-base font-mono font-black text-cyan-950 mt-1 truncate">
                ₺{totalBankBalance.toLocaleString('tr-TR', { minimumFractionDigits: 0 })}
              </div>
              <div className="text-[9px] text-cyan-600 mt-0.5">{bankAccounts.length} hesap</div>
            </div>

            {/* POS Bekleyen Ciro */}
            <div className="p-3 rounded-xl border border-amber-100 bg-amber-50/40">
              <div className="text-[10px] font-semibold text-amber-800 flex items-center justify-between">
                <span>POS Ciro</span>
                <Smartphone className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <div className="text-base font-mono font-black text-amber-950 mt-1 truncate">
                ₺{totalPosBalance.toLocaleString('tr-TR', { minimumFractionDigits: 0 })}
              </div>
              <div className="text-[9px] text-amber-600 mt-0.5">{posAccounts.length} terminal</div>
            </div>

            {/* Kredi Kartı Borcu */}
            <div className="p-3 rounded-xl border border-violet-100 bg-violet-50/40">
              <div className="text-[10px] font-semibold text-violet-800 flex items-center justify-between">
                <span>Kart Borcu</span>
                <CreditCardIcon className="w-3.5 h-3.5 text-violet-600" />
              </div>
              <div className="text-base font-mono font-black text-rose-700 mt-1 truncate">
                ₺{totalCardDebt.toLocaleString('tr-TR', { minimumFractionDigits: 0 })}
              </div>
              <div className="text-[9px] text-violet-600 mt-0.5">{creditCardAccounts.length} kart</div>
            </div>
          </div>

          {/* SEKME SEÇİCİ */}
          <div className="flex border-b border-stone-200 gap-4 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveSubTab('HESAPLAR')}
              className={`pb-2.5 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'HESAPLAR'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <CreditCardIcon className="w-4 h-4" />
              <span>Tüm Hesaplar, POS & Kartlar ({branchAccounts.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('HAREKETLER')}
              className={`pb-2.5 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'HAREKETLER'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Şube Hareketleri ({branchMovements.length})</span>
            </button>
          </div>

          {/* SEKME İÇERİĞİ: HESAPLAR */}
          {activeSubTab === 'HESAPLAR' && (
            <div className="space-y-3">
              {branchAccounts.length === 0 ? (
                <div className="p-8 text-center bg-stone-50 rounded-xl border border-dashed border-stone-200">
                  <Wallet className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-stone-600">Bu şubeye ait tanımlı hesap bulunmuyor.</p>
                  <button
                    type="button"
                    onClick={() => onOpenNewAccountModal(branch.id)}
                    className="mt-3 px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>İlk Hesabı Oluştur</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {branchAccounts.map((account) => {
                    const isBank = account.type === 'Bank';
                    const isCash = account.type === 'Cash';
                    const isPos = account.type === 'POS';
                    const isCard = account.type === 'CreditCard';

                    return (
                      <div
                        key={account.id}
                        className="p-4 rounded-xl border border-stone-200 bg-white hover:border-indigo-300 hover:shadow-xs transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                  isBank
                                    ? 'bg-indigo-50 text-indigo-700'
                                    : isCash
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : isPos
                                    ? 'bg-amber-50 text-amber-700'
                                    : 'bg-violet-50 text-violet-700'
                                }`}
                              >
                                {isBank && <Landmark className="w-4 h-4" />}
                                {isCash && <Wallet className="w-4 h-4" />}
                                {isPos && <Smartphone className="w-4 h-4" />}
                                {isCard && <CreditCardIcon className="w-4 h-4" />}
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-stone-900 leading-tight">
                                  {account.name}
                                </h4>
                                <span className="text-[10px] font-semibold text-stone-500 uppercase">
                                  {isBank
                                    ? 'Ticari Vadesiz Hesap'
                                    : isCash
                                    ? 'Nakit Şube Kasası'
                                    : isPos
                                    ? `POS Cihazı (${account.posTerminalId || 'Standart'})`
                                    : `Kredi Kartı (${account.cardHolderName || 'Şirket'})`}
                                </span>
                              </div>
                            </div>
                            <span
                              className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase ${
                                isBank
                                  ? 'bg-cyan-50 text-cyan-800 border border-cyan-200'
                                  : isCash
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : isPos
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : 'bg-violet-50 text-violet-800 border border-violet-200'
                              }`}
                            >
                              {isBank ? 'Banka' : isCash ? 'Kasa' : isPos ? 'POS' : 'Kredi Kartı'}
                            </span>
                          </div>

                          <div className="mt-3.5 pt-3 border-t border-stone-100 flex items-baseline justify-between">
                            <span className="text-xs text-stone-500">
                              {isCard ? 'Güncel Borç:' : isPos ? 'Bekleyen Ciro:' : 'Mevcut Bakiye:'}
                            </span>
                            <span
                              className={`text-lg font-mono font-black ${
                                isCard ? 'text-rose-700' : isPos ? 'text-amber-700' : 'text-stone-900'
                              }`}
                            >
                              ₺{account.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>

                          {isBank && account.iban && (
                            <div className="mt-2 p-2 bg-stone-50 rounded-lg flex items-center justify-between text-[11px] font-mono">
                              <span className="text-stone-700 font-bold truncate max-w-[200px]" title={account.iban}>
                                {account.iban}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyIban(account.iban!)}
                                className="inline-flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer shrink-0 ml-2"
                              >
                                <Copy className="w-3 h-3" />
                                <span>{copiedIban === account.iban ? 'Kopyalandı!' : 'Kopyala'}</span>
                              </button>
                            </div>
                          )}

                          {isCard && account.creditLimit && (
                            <div className="mt-2 text-[10px] text-stone-500 flex justify-between bg-violet-50/50 p-2 rounded-lg">
                              <span>Limit: ₺{account.creditLimit.toLocaleString('tr-TR')}</span>
                              <span>Kalan: ₺{(account.creditLimit - account.balance).toLocaleString('tr-TR')}</span>
                            </div>
                          )}
                        </div>

                        {/* Hızlı İşlem Butonları */}
                        <div className="mt-3 pt-3 border-t border-stone-100 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onOpenQuickActionModal(account, 'IN')}
                            className="flex-1 py-1.5 px-2 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                            <span>{isPos ? 'Tahsilat' : isCard ? 'Borç Öde' : 'Para Girişi'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenQuickActionModal(account, 'OUT')}
                            className="flex-1 py-1.5 px-2 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <ArrowUpRight className="w-3 h-3 text-rose-600" />
                            <span>{isCard ? 'Harcama' : 'Para Çıkışı'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SEKME İÇERİĞİ: HAREKETLER */}
          {activeSubTab === 'HAREKETLER' && (
            <div className="border border-stone-200 rounded-xl overflow-hidden h-[400px]">
              <AgGridReact<PaymentMovement> theme={appTheme}
                localeText={AG_GRID_LOCALE_TR}
                rowData={branchMovements}
                columnDefs={movementColumnDefs}
                pagination={true}
                paginationPageSize={10}
                paginationPageSizeSelector={[10, 20, 50]}
                rowHeight={40}
                headerHeight={38}
                animateRows={true}
                enableCellTextSelection={true}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

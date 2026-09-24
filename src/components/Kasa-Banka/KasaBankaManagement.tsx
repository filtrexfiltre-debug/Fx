import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AG_GRID_LOCALE_TR } from '../../lib/agGridLocaleTR';
import { appTheme } from '../../lib/agGridTheme';
import {
  ColDef,
  ICellRendererParams,
  ModuleRegistry,
  AllCommunityModule,
  ValidationModule,
  GridReadyEvent,
  GridApi,
} from 'ag-grid-community';
import {
  Landmark,
  Wallet,
  Building2,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Search,
  Download,
  Printer,
  Copy,
  Check,
  RefreshCw,
  Edit2,
  Trash2,
  CreditCard as CreditCardIcon,
  Building,
  Eye,
  FileSpreadsheet,
  Smartphone,
  Percent,
  Calendar,
  ShieldCheck,
  X,
  Clock,
} from 'lucide-react';
import { downloadCsv } from '../../lib/exportUtils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CashBank, Branch, PaymentMovement, InterBranchTransfer, CashBankType } from '../../types/fx';
import { fxApi, branchContext } from '../../services/api';
import { CURRENT_TENANT } from '../../data/mockData';
import { YeniKasaBankaModal } from './YeniKasaBankaModal';
import { KasaBankaIslemModal } from './KasaBankaIslemModal';
import { SubeKasaBankaDetayModal } from './SubeKasaBankaDetayModal';
import { PosAktarimModal } from './PosAktarimModal';
import { KrediKartiBorcOdemeModal } from './KrediKartiBorcOdemeModal';
import { AgGridColumnSidebar, AgGridSidebarToggleBtn } from '../common/AgGridColumnSidebar';


const STORAGE_GRID_KEY = 'fx_cash_banks_grid_state_v2';
const STORAGE_MOVEMENTS_GRID_KEY = 'fx_cash_bank_movements_grid_state_v2';

interface KasaBankaManagementProps {
  onNavigateToVirman?: () => void;
}

export const KasaBankaManagement: React.FC<KasaBankaManagementProps> = ({ onNavigateToVirman }) => {
  // 3 Ana Sekme: 'KASALAR_BANKALAR' | 'SUBE_BAZLI' | 'HAREKETLER'
  const [activeTab, setActiveTab] = useState<'KASALAR_BANKALAR' | 'SUBE_BAZLI' | 'HAREKETLER'>('HAREKETLER');

  const [cashBanks, setCashBanks] = useState<CashBank[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [paymentMovements, setPaymentMovements] = useState<PaymentMovement[]>([]);
  const [transfers, setTransfers] = useState<InterBranchTransfer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Aktif Şube & Global Durumu
  const [selectedBranchId, setSelectedBranchId] = useState<string>(branchContext.getSelectedBranchId());
  const [isGlobalUser, setIsGlobalUser] = useState<boolean>(branchContext.getIsGlobalUser());

  // Filtreler
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | CashBankType>('ALL');
  const [currencyFilter, setCurrencyFilter] = useState<'ALL' | 'TRY' | 'USD' | 'EUR'>('ALL');
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('TABLE');

  // AG Grid & Yan Panel Kolon Özelleştirme State (Cari Hesaplar Standardı)
  const [gridApi, setGridApi] = useState<GridApi<CashBank> | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const sidebarButtonRef = useRef<HTMLButtonElement>(null);

  // Hareketler AG Grid State
  const [movementsGridApi, setMovementsGridApi] = useState<GridApi<PaymentMovement> | null>(null);
  const [isMovementsSidebarOpen, setIsMovementsSidebarOpen] = useState<boolean>(false);
  const movementsSidebarRef = useRef<HTMLDivElement>(null);
  const movementsSidebarButtonRef = useRef<HTMLButtonElement>(null);

  // Modallar
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [editAccount, setEditAccount] = useState<CashBank | null>(null);
  const [isQuickActionModalOpen, setIsQuickActionModalOpen] = useState<boolean>(false);
  const [selectedAccountForAction, setSelectedAccountForAction] = useState<CashBank | null>(null);
  const [quickActionType, setQuickActionType] = useState<'IN' | 'OUT'>('IN');
  const [selectedBranchForModal, setSelectedBranchForModal] = useState<Branch | null>(null);

  // POS ve Kredi Kartı Özel Modalları
  const [posForSettlement, setPosForSettlement] = useState<CashBank | null>(null);
  const [cardForPayment, setCardForPayment] = useState<CashBank | null>(null);

  // Geribildirim
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [copiedIban, setCopiedIban] = useState<string | null>(null);

  // Verileri Yükle
  const loadData = async () => {
    setLoading(true);
    try {
      const branchesList = fxApi.getBranches();
      setBranches(branchesList);

      const [cbRes, pmRes, trRes] = await Promise.all([
        fxApi.getCashesAndBanks(),
        fxApi.getPaymentMovements(),
        fxApi.getTransfers(),
      ]);

      if (cbRes.success) setCashBanks(cbRes.data);
      if (pmRes.success) setPaymentMovements(pmRes.data);
      if (trRes.success) setTransfers(trRes.data);
    } catch (err) {
      console.error('Veriler yüklenirken hata:', err);
    } finally {
      setLoading(false);
    }
  };

  // Hareket Onaylama (Kabul Et)
  const handleApproveMovement = async (movementId: string) => {
    const isTransfer = movementId.startsWith('pm-tr-');
    try {
      if (isTransfer) {
        const transferId = movementId.replace('pm-', '');
        const res = await fxApi.approveTransfer(transferId);
        setFeedbackMessage(res.message || 'Virman başarıyla onaylandı.');
      } else {
        const res = await fxApi.updatePaymentMovement(movementId, { status: 'COMPLETED' });
        setFeedbackMessage(res.message || 'İşlem başarıyla onaylandı.');
      }
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Onaylama işlemi sırasında bir hata oluştu.');
    }
  };

  // Hareket Reddetme (İptal Et)
  const handleRejectMovement = async (movementId: string) => {
    const isTransfer = movementId.startsWith('pm-tr-');
    try {
      if (isTransfer) {
        const transferId = movementId.replace('pm-', '');
        const res = await fxApi.rejectTransfer(transferId);
        setFeedbackMessage(res.message || 'Virman başarıyla reddedildi.');
      } else {
        const res = await fxApi.updatePaymentMovement(movementId, { status: 'CANCELLED' });
        setFeedbackMessage(res.message || 'İşlem başarıyla reddedildi.');
      }
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Reddetme işlemi sırasında bir hata oluştu.');
    }
  };

  useEffect(() => {
    loadData();

    const unsubscribe = branchContext.subscribe(() => {
      setSelectedBranchId(branchContext.getSelectedBranchId());
      setIsGlobalUser(branchContext.getIsGlobalUser());
      loadData();
    });

    return () => unsubscribe();
  }, []);

  // Aktif Şube İsmi
  const currentBranchName = useMemo(() => {
    if (isGlobalUser || selectedBranchId === 'all') {
      return 'Tüm Şubeler (Konsolide)';
    }
    const b = branches.find((x) => x.id === selectedBranchId);
    return b ? b.name : 'Seçili Şube';
  }, [branches, selectedBranchId, isGlobalUser]);

  // Filtrelenmiş Kasa & Bankalar & POS & Kredi Kartları
  const filteredAccounts = useMemo(() => {
    return cashBanks.filter((cb) => {
      // Şube Filtresi (Konsolide değilse sadece aktif şubenin hesapları)
      if (selectedBranchId !== 'all' && cb.branchId !== selectedBranchId) {
        return false;
      }
      // Personel başkasının kasasını görmeyecek ve banka hesaplarını görmeyecek (sadece kendi Cash ve POS hesabı)
      if (!isGlobalUser) {
        if (cb.type !== 'Cash' && cb.type !== 'POS') {
          return false;
        }
      }
      // Tür Filtresi
      if (typeFilter !== 'ALL' && cb.type !== typeFilter) {
        return false;
      }
      // Para Birimi Filtresi
      if (currencyFilter !== 'ALL' && cb.currencyCode !== currencyFilter) {
        return false;
      }
      // Arama Metni
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const branch = branches.find((b) => b.id === cb.branchId);
        const matchName = cb.name.toLowerCase().includes(query);
        const matchIban = cb.iban?.toLowerCase().includes(query);
        const matchBranch = branch?.name.toLowerCase().includes(query);
        const matchPos = cb.posTerminalId?.toLowerCase().includes(query);
        const matchCard = cb.cardHolderName?.toLowerCase().includes(query) || cb.cardNumberLast4?.includes(query);
        const matchBankName = cb.bankName?.toLowerCase().includes(query) || cb.cardBankName?.toLowerCase().includes(query);
        if (!matchName && !matchIban && !matchBranch && !matchPos && !matchCard && !matchBankName) {
          return false;
        }
      }
      return true;
    });
  }, [cashBanks, isGlobalUser, selectedBranchId, typeFilter, currencyFilter, searchQuery, branches]);

  // Filtrelenmiş Finansal Hareketler (Ödeme & Tahsilat Listesi)
  const filteredPaymentMovements = useMemo(() => {
    return paymentMovements.filter((pm) => {
      // Şube Filtresi (Konsolide değilse sadece aktif şubenin hareketleri)
      if (selectedBranchId !== 'all' && pm.branchId !== selectedBranchId) {
        return false;
      }
      // Personel sadece kendi kasasının ve POS'unun hareketlerini görür (başkasını görmez)
      if (!isGlobalUser) {
        const cb = cashBanks.find((c) => c.id === pm.cashBankId);
        if (!cb || (cb.type !== 'Cash' && cb.type !== 'POS')) {
          return false;
        }
      }
      return true;
    });
  }, [paymentMovements, isGlobalUser, selectedBranchId, cashBanks]);

  // Konsolide / Şube KPI İstatistikleri (4 Hesap Türü İçin)
  const kpis = useMemo(() => {
    let totalCash = 0;
    let countCash = 0;
    let totalBank = 0;
    let countBank = 0;
    let totalPos = 0;
    let countPos = 0;
    let totalCreditCardDebt = 0;
    let totalCreditLimit = 0;
    let countCreditCard = 0;

    const baseList = cashBanks.filter((cb) => {
      if (selectedBranchId !== 'all' && cb.branchId !== selectedBranchId) {
        return false;
      }
      if (!isGlobalUser) {
        if (cb.type !== 'Cash' && cb.type !== 'POS') {
          return false;
        }
      }
      return true;
    });

    baseList.forEach((cb) => {
      if (cb.type === 'Cash') {
        totalCash += cb.balance;
        countCash++;
      } else if (cb.type === 'Bank') {
        totalBank += cb.balance;
        countBank++;
      } else if (cb.type === 'POS') {
        totalPos += cb.balance;
        countPos++;
      } else if (cb.type === 'CreditCard') {
        totalCreditCardDebt += cb.balance;
        totalCreditLimit += cb.creditLimit || 0;
        countCreditCard++;
      }
    });

    const totalLiquidity = totalCash + totalBank;
    const remainingCreditLimit = Math.max(0, totalCreditLimit - totalCreditCardDebt);

    // Şube bazlı para akış toplamları
    const branchMovementList = paymentMovements.filter((pm) => {
      if (selectedBranchId !== 'all' && pm.branchId !== selectedBranchId) {
        return false;
      }
      return true;
    });

    const totalInflow = branchMovementList
      .filter((pm) => pm.movementType === 'TAHSILAT')
      .reduce((acc, pm) => acc + pm.amount, 0);

    const totalOutflow = branchMovementList
      .filter((pm) => pm.movementType === 'ODEME' || pm.movementType === 'MASRAF')
      .reduce((acc, pm) => acc + pm.amount, 0);

    return {
      totalCash,
      countCash,
      totalBank,
      countBank,
      totalPos,
      countPos,
      totalCreditCardDebt,
      totalCreditLimit,
      remainingCreditLimit,
      countCreditCard,
      totalLiquidity,
      totalInflow,
      totalOutflow,
      netFlow: totalInflow - totalOutflow,
      totalAccounts: baseList.length,
    };
  }, [cashBanks, paymentMovements, isGlobalUser, selectedBranchId]);

  // Şube Bazlı Karşılaştırma Matrisi (Sekme 2 için)
  const branchComparison = useMemo(() => {
    const totalCompanyLiquidity = cashBanks
      .filter((cb) => cb.type === 'Cash' || cb.type === 'Bank')
      .reduce((acc, cb) => acc + cb.balance, 0);

    const filteredBranches = branches.filter((branch) => {
      if (selectedBranchId && selectedBranchId !== 'all') {
        return branch.id === selectedBranchId;
      }
      return true;
    });

    return filteredBranches.map((branch) => {
      const branchAccounts = cashBanks.filter((cb) => cb.branchId === branch.id);
      const cashList = branchAccounts.filter((cb) => cb.type === 'Cash');
      const bankList = branchAccounts.filter((cb) => cb.type === 'Bank');
      const posList = branchAccounts.filter((cb) => cb.type === 'POS');
      const cardList = branchAccounts.filter((cb) => cb.type === 'CreditCard');

      const cashBalance = cashList.reduce((acc, c) => acc + c.balance, 0);
      const bankBalance = bankList.reduce((acc, c) => acc + c.balance, 0);
      const posBalance = posList.reduce((acc, c) => acc + c.balance, 0);
      const cardDebt = cardList.reduce((acc, c) => acc + c.balance, 0);
      const branchLiquidity = cashBalance + bankBalance;

      const liquidityShare = totalCompanyLiquidity > 0 ? (branchLiquidity / totalCompanyLiquidity) * 100 : 0;

      const branchMovements = paymentMovements.filter((pm) => pm.branchId === branch.id);
      const inflow = branchMovements
        .filter((pm) => pm.movementType === 'TAHSILAT')
        .reduce((acc, pm) => acc + pm.amount, 0);
      const outflow = branchMovements
        .filter((pm) => pm.movementType === 'ODEME' || pm.movementType === 'MASRAF')
        .reduce((acc, pm) => acc + pm.amount, 0);

      return {
        branch,
        accountCount: branchAccounts.length,
        cashCount: cashList.length,
        cashBalance,
        bankCount: bankList.length,
        bankBalance,
        posCount: posList.length,
        posBalance,
        cardCount: cardList.length,
        cardDebt,
        branchLiquidity,
        liquidityShare,
        inflow,
        outflow,
        netFlow: inflow - outflow,
      };
    });
  }, [branches, cashBanks, paymentMovements, selectedBranchId, isGlobalUser]);

  // IBAN Kopyalama
  const handleCopyIban = (iban: string) => {
    navigator.clipboard.writeText(iban);
    setCopiedIban(iban);
    setTimeout(() => setCopiedIban(null), 2000);
  };

  // Yeni Hesap Kaydet / Güncelle
  const handleSaveAccount = async (accountData: Omit<CashBank, 'id' | 'tenantId'>, editId?: string) => {
    if (editId) {
      const res = await fxApi.updateCashBank(editId, accountData);
      if (res.success) {
        setFeedbackMessage('Hesap / Kart / POS kaydı başarıyla güncellendi.');
      }
    } else {
      const res = await fxApi.createCashBank(accountData);
      if (res.success) {
        setFeedbackMessage('Yeni finansal hesap / kart / POS başarıyla tanımlandı.');
      }
    }
    setTimeout(() => setFeedbackMessage(null), 3000);
    await loadData();
  };

  // Hesap Sil
  const handleDeleteAccount = async (account: CashBank) => {
    if (Math.abs(account.balance) > 0.01) {
      alert(
        `Bakiyesi 0 olmayan hesap silinemez! Mevcut Bakiye: ₺${account.balance.toLocaleString(
          'tr-TR'
        )}. Lütfen önce bakiyeyi virman ile başka hesaba aktarınız.`
      );
      return;
    }

    if (!window.confirm(`"${account.name}" kaydını kalıcı olarak silmek istediğinizden emin misiniz?`)) {
      return;
    }

    try {
      const res = await fxApi.deleteCashBank(account.id);
      if (res.success) {
        setFeedbackMessage('Hesap başarıyla silindi.');
        setTimeout(() => setFeedbackMessage(null), 3000);
        await loadData();
      }
    } catch (err: any) {
      alert(err.message || 'Hesap silinirken hata oluştu.');
    }
  };

  // POS Gün Sonu / Ciro Aktarımı
  const handlePosSettle = async (payload: {
    posId: string;
    amount: number;
    targetBankId: string;
    description?: string;
  }) => {
    try {
      const res = await fxApi.settlePosTurnover(payload);
      if (res.success) {
        setFeedbackMessage(res.message || 'POS cirosu net tutar olarak banka hesabına aktarıldı.');
        setTimeout(() => setFeedbackMessage(null), 4000);
        await loadData();
      }
    } catch (err: any) {
      alert(err.message || 'POS aktarımı sırasında hata oluştu.');
    }
  };

  // Kredi Kartı Borç Ödeme
  const handleCardPayDebt = async (payload: {
    cardId: string;
    sourceCashBankId: string;
    amount: number;
    description?: string;
  }) => {
    try {
      const res = await fxApi.payCreditCardDebt(payload);
      if (res.success) {
        setFeedbackMessage(res.message || 'Kredi kartı borç ödemesi başarıyla tamamlandı.');
        setTimeout(() => setFeedbackMessage(null), 4000);
        await loadData();
      }
    } catch (err: any) {
      alert(err.message || 'Kredi kartı ödemesi sırasında hata oluştu.');
    }
  };

  // Excel Raporu Dışa Aktar
  const handleExportExcel = () => {
    try {
      const exportData = filteredAccounts.map((cb) => {
        const branch = branches.find((b) => b.id === cb.branchId);
        return {
          'Hesap Adı': cb.name,
          'Hesap Türü':
            cb.type === 'Bank'
              ? 'Banka Hesabı'
              : cb.type === 'Cash'
              ? 'Nakit Kasa'
              : cb.type === 'POS'
              ? 'POS Cihazı'
              : 'Şirket Kredi Kartı',
          'Bağlı Şube': branch ? `${branch.name} (${branch.city})` : '-',
          'Para Birimi': cb.currencyCode,
          'Bakiye / Borç (TL)': cb.balance,
          'IBAN No': cb.iban || '-',
          'Hesap No': cb.accountNumber || '-',
          'Terminal No / Son 4 Hane': cb.posTerminalId || cb.cardNumberLast4 || '-',
          'Komisyon / Kart Limiti':
            cb.type === 'POS'
              ? `%${cb.commissionRate}`
              : cb.type === 'CreditCard'
              ? `₺${cb.creditLimit?.toLocaleString('tr-TR')}`
              : '-',
        };
      });

      downloadCsv(`FX_Finansal_Hesaplar_Raporu_${new Date().toISOString().slice(0, 10)}.csv`, exportData);

      setFeedbackMessage('CSV raporu başarıyla indirildi.');
      setTimeout(() => setFeedbackMessage(null), 3000);
    } catch (e) {
      console.error(e);
      alert('CSV dosyası oluşturulurken hata oluştu.');
    }
  };

  // PDF Raporu Dışa Aktar
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF('landscape');

      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text(`${CURRENT_TENANT.name} - Kasa, Banka, POS & Kredi Kartı Raporu`, 14, 15);

      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Kapsam: ${currentBranchName} | Rapor Tarihi: ${new Date().toLocaleDateString(
          'tr-TR'
        )} | Toplam Likidite: ₺${kpis.totalLiquidity.toLocaleString('tr-TR', {
          minimumFractionDigits: 2,
        })} | POS Bekleyen: ₺${kpis.totalPos.toLocaleString('tr-TR')} | Kart Borcu: ₺${kpis.totalCreditCardDebt.toLocaleString('tr-TR')}`,
        14,
        22
      );

      const tableRows = filteredAccounts.map((cb) => {
        const branch = branches.find((b) => b.id === cb.branchId);
        return [
          cb.name,
          cb.type === 'Bank'
            ? 'Banka'
            : cb.type === 'Cash'
            ? 'Kasa'
            : cb.type === 'POS'
            ? 'POS'
            : 'Kredi Kartı',
          branch ? branch.name : '-',
          cb.currencyCode,
          `₺${cb.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`,
          cb.iban || cb.posTerminalId || (cb.cardNumberLast4 ? `Son 4: ${cb.cardNumberLast4}` : '-'),
        ];
      });

      autoTable(doc, {
        head: [['Hesap / Cihaz Adı', 'Tür', 'Bağlı Şube', 'Para Birimi', 'Bakiye / Borç', 'Detay / IBAN']],
        body: tableRows,
        startY: 28,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 8 },
      });

      doc.save(`FX_Kasa_Banka_POS_Raporu_${new Date().toISOString().slice(0, 10)}.pdf`);
      setFeedbackMessage('PDF raporu başarıyla indirildi.');
      setTimeout(() => setFeedbackMessage(null), 3000);
    } catch (e) {
      console.error(e);
      alert('PDF oluşturulurken hata meydana geldi.');
    }
  };

  // AG Grid Kolon Tanımları (Cari Hesaplar Standardı)
  const accountColumnDefs = useMemo<ColDef<CashBank>[]>(() => [
    {
      field: 'name',
      headerName: 'Hesap / POS / Kart Tanımı',
      flex: 2,
      minWidth: 200,
      valueFormatter: (params) => {
        const cb = params.data;
        if (!cb) return '';
        const typeLabel = cb.type === 'Bank' ? 'Banka' : cb.type === 'Cash' ? 'Kasa' : cb.type === 'POS' ? 'POS' : 'Kredi Kartı';
        return `${cb.name} (${typeLabel})`;
      },
      cellRenderer: (params: ICellRendererParams<CashBank>) => {
        if (!params.data) return null;
        const cb = params.data;
        const isBank = cb.type === 'Bank';
        const isCash = cb.type === 'Cash';
        const isPos = cb.type === 'POS';
        const isCreditCard = cb.type === 'CreditCard';
        const typeLabel = isBank ? 'Banka' : isCash ? 'Kasa' : isPos ? 'POS' : 'Kredi Kartı';
        return (
          <div className="flex items-center gap-2.5 h-full">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
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
              {isCreditCard && <CreditCardIcon className="w-4 h-4" />}
            </div>
            <div className="truncate">
              <span className="font-bold text-stone-900 text-xs block truncate leading-tight">
                {cb.name}
              </span>
              <span className="text-[10px] text-stone-400 block truncate">
                {cb.currencyCode} &bull; {typeLabel}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      field: 'type',
      headerName: 'Tür',
      width: 120,
      valueFormatter: (params) => {
        const type = params.value;
        if (type === 'Bank') return 'Banka';
        if (type === 'Cash') return 'Kasa';
        if (type === 'POS') return 'POS';
        if (type === 'CreditCard') return 'Kredi Kartı';
        return type || '';
      },
      cellRenderer: (params: ICellRendererParams<CashBank>) => {
        if (!params.data) return null;
        const type = params.data.type;
        const styles: Record<string, { label: string; bg: string; text: string }> = {
          Bank: { label: 'Banka', bg: 'bg-cyan-50 border-cyan-200', text: 'text-cyan-800' },
          Cash: { label: 'Kasa', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800' },
          POS: { label: 'POS', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800' },
          CreditCard: { label: 'Kredi Kartı', bg: 'bg-violet-50 border-violet-200', text: 'text-violet-800' },
        };
        const conf = styles[type] || { label: type, bg: 'bg-stone-50 border-stone-200', text: 'text-stone-700' };
        return (
          <div className="flex items-center h-full">
            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase font-mono border ${conf.bg} ${conf.text}`}>
              {conf.label}
            </span>
          </div>
        );
      },
    },
    {
      field: 'branchId',
      headerName: 'Bağlı Şube',
      width: 160,
      cellRenderer: (params: ICellRendererParams<CashBank>) => {
        if (!params.data) return null;
        const branch = branches.find((b) => b.id === params.data?.branchId);
        return (
          <div className="flex items-center gap-1.5 h-full text-xs">
            <Building2 className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span className="font-semibold text-stone-700 truncate">{branch?.name || 'Şube'}</span>
            {branch?.isHeadquarter && (
              <span className="px-1 py-0.2 bg-amber-100 text-amber-800 text-[9px] font-bold rounded shrink-0">
                HQ
              </span>
            )}
          </div>
        );
      },
    },
    {
      field: 'currencyCode',
      headerName: 'Para Birimi',
      width: 110,
      cellRenderer: (params: ICellRendererParams<CashBank>) => {
        if (!params.data) return null;
        return (
          <div className="flex items-center h-full">
            <span className="px-2 py-0.5 text-[11px] font-bold font-mono bg-stone-100 text-stone-700 rounded-md">
              {params.data.currencyCode}
            </span>
          </div>
        );
      },
    },
    {
      colId: 'detailInfo',
      headerName: 'Iban / Terminal / Kart No',
      flex: 1.5,
      minWidth: 200,
      valueGetter: (params) => {
        const d = params.data;
        if (!d) return '';
        return d.iban || d.posTerminalId || (d.cardNumberLast4 ? `•••• ${d.cardNumberLast4}` : '-');
      },
      cellRenderer: (params: ICellRendererParams<CashBank>) => {
        if (!params.data) return null;
        const d = params.data;
        if (d.type === 'Bank' && d.iban) {
          return (
            <div className="flex items-center justify-between gap-1 h-full text-xs font-mono">
              <span className="text-stone-700 font-medium truncate" title={d.iban}>
                {d.iban}
              </span>
              <button
                type="button"
                onClick={() => handleCopyIban(d.iban!)}
                className="text-indigo-600 hover:text-indigo-800 p-1 cursor-pointer shrink-0"
                title="Kopyala"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        }
        if (d.type === 'POS') {
          return (
            <div className="flex items-center gap-1.5 h-full text-xs">
              <span className="font-mono font-bold text-amber-800">
                {d.posTerminalId || 'Standart'}
              </span>
              <span className="text-[10px] text-stone-400">
                (%{d.commissionRate || 1.75} &bull; {d.valorDays || 1}g)
              </span>
            </div>
          );
        }
        if (d.type === 'CreditCard') {
          return (
            <div className="flex items-center gap-1.5 h-full text-xs">
              <span className="font-mono font-bold text-violet-800">
                •••• {d.cardNumberLast4 || '8492'}
              </span>
              {d.cardHolderName && (
                <span className="text-[10px] text-stone-500 truncate">
                  ({d.cardHolderName})
                </span>
              )}
            </div>
          );
        }
        return <div className="flex items-center h-full text-stone-400 text-xs">Kasa Hesabı</div>;
      },
    },
    {
      field: 'balance',
      headerName: 'Bakiye / Borç',
      width: 170,
      cellRenderer: (params: ICellRendererParams<CashBank>) => {
        if (!params.data) return null;
        const isCreditCard = params.data.type === 'CreditCard';
        const isPos = params.data.type === 'POS';
        return (
          <div className="flex items-center justify-end h-full text-right">
            <span
              className={`font-mono font-bold text-xs ${
                isCreditCard ? 'text-rose-600' : isPos ? 'text-amber-700' : 'text-stone-900'
              }`}
            >
              ₺{params.data.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        );
      },
    },
    {
      colId: 'actions',
      headerName: 'İşlemler',
      width: 220,
      pinned: 'right',
      cellRenderer: (params: ICellRendererParams<CashBank>) => {
        if (!params.data) return null;
        const account = params.data;
        const isPos = account.type === 'POS';
        const isCreditCard = account.type === 'CreditCard';
        return (
          <div className="flex items-center justify-end gap-1 h-full">
            {isPos && (
              <button
                type="button"
                onClick={() => setPosForSettlement(account)}
                className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-bold inline-flex items-center gap-0.5 cursor-pointer"
                title="POS Aktar"
              >
                <ArrowRightLeft className="w-2.5 h-2.5" />
                <span>Aktar</span>
              </button>
            )}
            {isCreditCard && (
              <button
                type="button"
                onClick={() => setCardForPayment(account)}
                className="px-2 py-0.5 bg-violet-600 hover:bg-violet-700 text-white rounded text-[10px] font-bold inline-flex items-center gap-0.5 cursor-pointer"
                title="Borç Öde"
              >
                <CreditCardIcon className="w-2.5 h-2.5" />
                <span>Öde</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setSelectedAccountForAction(account);
                setQuickActionType('IN');
                setIsQuickActionModalOpen(true);
              }}
              className="px-1.5 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold inline-flex items-center gap-0.5 cursor-pointer"
              title={isPos ? 'Tahsilat' : 'Giriş'}
            >
              <ArrowDownLeft className="w-2.5 h-2.5 text-emerald-600" />
              <span>{isPos ? 'Tahsilat' : 'Giriş'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedAccountForAction(account);
                setQuickActionType('OUT');
                setIsQuickActionModalOpen(true);
              }}
              className="px-1.5 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded text-[10px] font-bold inline-flex items-center gap-0.5 cursor-pointer"
              title={isCreditCard ? 'Harcama' : 'Çıkış'}
            >
              <ArrowUpRight className="w-2.5 h-2.5 text-rose-600" />
              <span>{isCreditCard ? 'Harcama' : 'Çıkış'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEditAccount(account);
                setIsNewModalOpen(true);
              }}
              className="p-1 text-stone-400 hover:text-stone-700 rounded cursor-pointer"
              title="Düzenle"
            >
              <Edit2 className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => handleDeleteAccount(account)}
              className="p-1 text-stone-400 hover:text-rose-600 rounded cursor-pointer"
              title="Sil"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        );
      },
    },
  ], [branches]);

  // Hareketler Kolon Tanımları
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
      cellRenderer: (params: ICellRendererParams<PaymentMovement>) => {
        return <div className="flex items-center h-full font-mono text-stone-600 text-xs">{params.value}</div>;
      },
    },
    {
      field: 'branchName',
      headerName: 'Şube',
      width: 140,
      cellRenderer: (params: ICellRendererParams<PaymentMovement>) => {
        return <div className="flex items-center h-full font-semibold text-stone-700 text-xs">{params.value}</div>;
      },
    },
    {
      field: 'movementType',
      headerName: 'İşlem Türü',
      width: 130,
      valueFormatter: (params) => params.value === 'TAHSILAT' ? 'TAHSİLAT' : 'ÖDEME',
      cellRenderer: (params: ICellRendererParams<PaymentMovement>) => {
        if (!params.data) return null;
        const isIn = params.data.movementType === 'TAHSILAT';
        return (
          <div className="flex items-center h-full">
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${
                isIn
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {isIn ? (
                <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
              ) : (
                <ArrowUpRight className="w-3 h-3 text-rose-600" />
              )}
              {isIn ? 'TAHSİLAT' : 'ÖDEME'}
            </span>
          </div>
        );
      },
    },
    {
      field: 'cashBankName',
      headerName: 'Kasa / Banka / Kart',
      width: 160,
      cellRenderer: (params: ICellRendererParams<PaymentMovement>) => {
        return <div className="flex items-center h-full font-bold text-stone-900 text-xs">{params.value}</div>;
      },
    },
    {
      field: 'documentNumber',
      headerName: 'Belge / Dekont No',
      width: 140,
      cellRenderer: (params: ICellRendererParams<PaymentMovement>) => {
        return <div className="flex items-center h-full font-mono text-indigo-600 font-semibold text-xs">{params.value || '-'}</div>;
      },
    },
    {
      field: 'contactTitle',
      headerName: 'Cari / Karşı Taraf',
      flex: 1.2,
      minWidth: 150,
      cellRenderer: (params: ICellRendererParams<PaymentMovement>) => {
        return <div className="flex items-center h-full text-stone-800 font-medium text-xs truncate">{params.value || '-'}</div>;
      },
    },
    {
      field: 'description',
      headerName: 'Açıklama',
      flex: 1.5,
      minWidth: 180,
      cellRenderer: (params: ICellRendererParams<PaymentMovement>) => {
        return <div className="flex items-center h-full text-stone-500 text-xs truncate" title={params.value}>{params.value || '-'}</div>;
      },
    },
    {
      colId: 'inflow',
      headerName: 'Giriş / Tahsilat',
      width: 140,
      cellRenderer: (params: ICellRendererParams<PaymentMovement>) => {
        if (!params.data) return null;
        const isIn = params.data.movementType === 'TAHSILAT';
        return (
          <div className="flex items-center justify-end h-full font-mono font-bold text-emerald-700 text-xs">
            {isIn ? `₺${params.data.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` : '-'}
          </div>
        );
      },
    },
    {
      colId: 'outflow',
      headerName: 'Çıkış / Ödeme',
      width: 140,
      cellRenderer: (params: ICellRendererParams<PaymentMovement>) => {
        if (!params.data) return null;
        const isIn = params.data.movementType === 'TAHSILAT';
        return (
          <div className="flex items-center justify-end h-full font-mono font-bold text-rose-700 text-xs">
            {!isIn ? `₺${params.data.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` : '-'}
          </div>
        );
      },
    },
    {
      colId: 'status_and_actions',
      headerName: 'Durum & İşlem',
      width: 180,
      sortable: false,
      filter: false,
      cellRenderer: (params: ICellRendererParams<PaymentMovement>) => {
        if (!params.data) return null;
        const status = params.data.status || 'COMPLETED';
        const isPending = status === 'PENDING';
        const isCancelled = status === 'CANCELLED';
        const isCompleted = status === 'COMPLETED';

        return (
          <div className="flex items-center gap-2 h-full py-1">
            {isCompleted && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                <Check className="w-3 h-3 text-emerald-600" />
                Onaylandı
              </span>
            )}
            {isCancelled && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                <X className="w-3 h-3 text-rose-600" />
                Reddedildi
              </span>
            )}
            {isPending && (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md animate-pulse">
                  <Clock className="w-3 h-3 text-amber-500" />
                  Onay Bekliyor
                </span>
                
                {/* Muhasebe Sorumlusu (GlobalUser) ise Kabul/Red butonlarını göster */}
                {isGlobalUser && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleApproveMovement(params.data!.id)}
                      className="p-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md transition-colors"
                      title="Kabul Et (Al Gülüm)"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRejectMovement(params.data!.id)}
                      className="p-1 bg-rose-500 hover:bg-rose-600 text-white rounded-md transition-colors"
                      title="Reddet (Ver Gülüm)"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      },
    },
  ], [isGlobalUser, handleApproveMovement, handleRejectMovement]);

  // AG Grid Hazır ve State Yönetimi
  const onGridReady = (params: GridReadyEvent<CashBank>) => {
    setGridApi(params.api);
    try {
      const savedState = localStorage.getItem(STORAGE_GRID_KEY);
      if (savedState) {
        params.api.applyColumnState({
          state: JSON.parse(savedState),
          applyOrder: true,
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const saveGridState = () => {
    if (!gridApi) return;
    try {
      const state = gridApi.getColumnState().map(col => ({
        colId: col.colId,
        width: col.width,
        hide: col.hide,
        pinned: col.pinned,
        sort: col.sort,
        sortIndex: col.sortIndex,
      }));
      localStorage.setItem(STORAGE_GRID_KEY, JSON.stringify(state));
    } catch (e) {
      console.error(e);
    }
  };

  const onMovementsGridReady = (params: GridReadyEvent<PaymentMovement>) => {
    setMovementsGridApi(params.api);
    try {
      const savedState = localStorage.getItem(STORAGE_MOVEMENTS_GRID_KEY);
      if (savedState) {
        params.api.applyColumnState({
          state: JSON.parse(savedState),
          applyOrder: true,
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const saveMovementsGridState = () => {
    if (!movementsGridApi) return;
    try {
      const state = movementsGridApi.getColumnState().map(col => ({
        colId: col.colId,
        width: col.width,
        hide: col.hide,
        pinned: col.pinned,
        sort: col.sort,
        sortIndex: col.sortIndex,
      }));
      localStorage.setItem(STORAGE_MOVEMENTS_GRID_KEY, JSON.stringify(state));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-4">
      {/* GERİBİLDİRİM BİLDİRİMİ */}
      {feedbackMessage && (
        <div className="fixed top-16 right-6 z-50 bg-emerald-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Check className="w-4 h-4" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* ÜST HEADER & AKSİYON BARI */}
      <div className="bg-white border border-stone-200/90 rounded-xl p-4 shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-stone-900 leading-tight">
                  Kasa Banka Yönetimi
                </h1>
              </div>
            </div>
          </div>

          {/* Hızlı Aksiyon Butonları */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start lg:justify-end">
            <button
              type="button"
              onClick={() => {
                setEditAccount(null);
                setIsNewModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Hesap / POS / Kart Ekle</span>
            </button>

            {onNavigateToVirman && (
              <button
                type="button"
                onClick={onNavigateToVirman}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Şubeler Arası Virman</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
              title="CSV indir"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">CSV</span>
            </button>

            <button
              type="button"
              onClick={handleExportPDF}
              className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-semibold text-stone-700 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-lg transition-colors cursor-pointer"
              title="PDF Raporu İndir"
            >
              <Printer className="w-3.5 h-3.5 text-stone-600" />
              <span className="hidden sm:inline">PDF</span>
            </button>

            <button
              type="button"
              onClick={loadData}
              className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg border border-stone-200 transition-colors cursor-pointer"
              title="Yenile"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* 3 ANA SEKME SEÇİCİ */}
        <div className="mt-4 pt-3 border-t border-stone-100 flex flex-wrap items-center gap-2">
          {/* Sekme 1: Finansal Hareketler */}
          <button
            type="button"
            onClick={() => setActiveTab('HAREKETLER')}
            className={`inline-flex items-center gap-2 py-2 px-3.5 rounded-lg font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              activeTab === 'HAREKETLER'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Finansal Hareketler ({paymentMovements.length})</span>
          </button>

          {/* Sekme 2: Hesaplar & Kasalar */}
          <button
            type="button"
            onClick={() => setActiveTab('KASALAR_BANKALAR')}
            className={`inline-flex items-center gap-2 py-2 px-3.5 rounded-lg font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              activeTab === 'KASALAR_BANKALAR'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Hesaplar & Kasalar ({filteredAccounts.length})</span>
          </button>

          {/* Sekme 3: Şube Bazlı Analiz */}
          <button
            type="button"
            onClick={() => setActiveTab('SUBE_BAZLI')}
            className={`inline-flex items-center gap-2 py-2 px-3.5 rounded-lg font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              activeTab === 'SUBE_BAZLI'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Şube Bazlı Analiz</span>
          </button>
        </div>
      </div>

      {/* SEKME 1: KASALAR & BANKALAR & POS & KARTLAR */}
      {activeTab === 'KASALAR_BANKALAR' && (
        <div className="space-y-4">
          {/* KPI ÖZET KARTLARI: 5'li Şık Izgara */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* 1. Toplam Konsolide Likidite */}
            <div className="p-3.5 rounded-xl border border-indigo-200/80 bg-indigo-50/50 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-semibold text-indigo-900">
                <span>Net Likidite</span>
                <Landmark className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="mt-2 font-mono text-lg font-black text-indigo-950 truncate">
                ₺{kpis.totalLiquidity.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-indigo-600 mt-1">
                Kasa + Vadesiz Banka
              </div>
            </div>

            {/* 2. Toplam Nakit Kasa */}
            <button
              type="button"
              onClick={() => setTypeFilter(typeFilter === 'Cash' ? 'ALL' : 'Cash')}
              className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                typeFilter === 'Cash'
                  ? 'ring-2 ring-emerald-500 border-emerald-400 bg-emerald-50'
                  : 'bg-white border-stone-200/90 shadow-2xs hover:border-emerald-300 hover:bg-emerald-50/20'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold text-stone-700 w-full">
                <span>Nakit Kasalar</span>
                <Wallet className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2 font-mono text-lg font-black text-emerald-700 truncate">
                ₺{kpis.totalCash.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-stone-500 mt-1 flex items-center justify-between w-full">
                <span>{kpis.countCash} adet kasa</span>
                {typeFilter === 'Cash' && <span className="text-emerald-700 font-bold">Filtreli</span>}
              </div>
            </button>

            {/* 3. Toplam Banka Hesabı */}
            <button
              type="button"
              onClick={() => setTypeFilter(typeFilter === 'Bank' ? 'ALL' : 'Bank')}
              className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                typeFilter === 'Bank'
                  ? 'ring-2 ring-cyan-500 border-cyan-400 bg-cyan-50'
                  : 'bg-white border-stone-200/90 shadow-2xs hover:border-cyan-300 hover:bg-cyan-50/20'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold text-stone-700 w-full">
                <span>Banka Hesapları</span>
                <Landmark className="w-4 h-4 text-cyan-600" />
              </div>
              <div className="mt-2 font-mono text-lg font-black text-cyan-700 truncate">
                ₺{kpis.totalBank.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-stone-500 mt-1 flex items-center justify-between w-full">
                <span>{kpis.countBank} adet hesap</span>
                {typeFilter === 'Bank' && <span className="text-cyan-700 font-bold">Filtreli</span>}
              </div>
            </button>

            {/* 4. POS Terminal Ciro (Bekleyen / Valör) */}
            <button
              type="button"
              onClick={() => setTypeFilter(typeFilter === 'POS' ? 'ALL' : 'POS')}
              className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                typeFilter === 'POS'
                  ? 'ring-2 ring-amber-500 border-amber-400 bg-amber-50'
                  : 'bg-white border-stone-200/90 shadow-2xs hover:border-amber-300 hover:bg-amber-50/20'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold text-stone-700 w-full">
                <span>POS Cihazları</span>
                <Smartphone className="w-4 h-4 text-amber-600" />
              </div>
              <div className="mt-2 font-mono text-lg font-black text-amber-700 truncate">
                ₺{kpis.totalPos.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-stone-500 mt-1 flex items-center justify-between w-full">
                <span>{kpis.countPos} terminal (Bekleyen Ciro)</span>
                {typeFilter === 'POS' && <span className="text-amber-700 font-bold">Filtreli</span>}
              </div>
            </button>

            {/* 5. Kredi Kartları (Güncel Borç & Kalan Limit) */}
            <button
              type="button"
              onClick={() => setTypeFilter(typeFilter === 'CreditCard' ? 'ALL' : 'CreditCard')}
              className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer col-span-2 sm:col-span-1 ${
                typeFilter === 'CreditCard'
                  ? 'ring-2 ring-violet-500 border-violet-400 bg-violet-50'
                  : 'bg-white border-stone-200/90 shadow-2xs hover:border-violet-300 hover:bg-violet-50/20'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold text-stone-700 w-full">
                <span>Kredi Kartları</span>
                <CreditCardIcon className="w-4 h-4 text-violet-600" />
              </div>
              <div className="mt-2 font-mono text-lg font-black text-rose-600 truncate">
                ₺{kpis.totalCreditCardDebt.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-stone-500 mt-1 flex items-center justify-between w-full">
                <span>Kalan Limit: ₺{kpis.remainingCreditLimit.toLocaleString('tr-TR')}</span>
                {typeFilter === 'CreditCard' && <span className="text-violet-700 font-bold">Filtreli</span>}
              </div>
            </button>
          </div>

          {/* FİLTRELEME VE ARAMA BARI */}
          <div className="bg-white border border-stone-200/90 rounded-xl p-3 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex-1 flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Hesap adı, IBAN, POS terminali, kart hamili veya şube ara..."
                  className="w-full pl-9 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-800 placeholder-stone-400 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {/* Tür Filtresi */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="py-1.5 px-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-semibold text-stone-700 focus:bg-white cursor-pointer"
              >
                <option value="ALL">Tüm Finansal Varlıklar</option>
                <option value="Cash">💵 Sadece Nakit Kasalar</option>
                <option value="Bank">🏦 Sadece Banka Hesapları</option>
                <option value="POS">📱 Sadece POS Cihazları</option>
                <option value="CreditCard">💳 Sadece Kredi Kartları</option>
              </select>

              {/* Para Birimi Filtresi */}
              <select
                value={currencyFilter}
                onChange={(e) => setCurrencyFilter(e.target.value as any)}
                className="py-1.5 px-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-semibold text-stone-700 focus:bg-white cursor-pointer"
              >
                <option value="ALL">Tüm Para Birimleri</option>
                <option value="TRY">TRY (₺)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>

            {/* Kolon Özelleştirme Butonu */}
            <div className="flex items-center gap-2 self-end sm:self-center">
              <AgGridSidebarToggleBtn
                isOpen={isSidebarOpen}
                onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
                gridApi={gridApi}
                buttonRef={sidebarButtonRef}
              />
            </div>
          </div>

          {/* KARTLAR GÖRÜNÜMÜ */}
          {viewMode === 'CARDS' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {filteredAccounts.map((account) => {
                const branch = branches.find((b) => b.id === account.branchId);
                const isBank = account.type === 'Bank';
                const isCash = account.type === 'Cash';
                const isPos = account.type === 'POS';
                const isCreditCard = account.type === 'CreditCard';

                return (
                  <div
                    key={account.id}
                    className="bg-white border border-stone-200/90 hover:border-indigo-300 rounded-xl p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Üst Satır: İkon, Ad ve Şube Rozeti */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              isBank
                                ? 'bg-indigo-50 text-indigo-700'
                                : isCash
                                ? 'bg-emerald-50 text-emerald-700'
                                : isPos
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-violet-50 text-violet-700'
                            }`}
                          >
                            {isBank && <Landmark className="w-5 h-5" />}
                            {isCash && <Wallet className="w-5 h-5" />}
                            {isPos && <Smartphone className="w-5 h-5" />}
                            {isCreditCard && <CreditCardIcon className="w-5 h-5" />}
                          </div>
                          <div>
                            <h3 className="text-xs font-bold text-stone-900 group-hover:text-indigo-600 transition-colors leading-snug">
                              {account.name}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-stone-500">
                              <Building2 className="w-3 h-3 text-stone-400" />
                              <span className="font-semibold text-stone-700">
                                {branch?.name || 'Şube'}
                              </span>
                              {branch?.isHeadquarter && (
                                <span className="px-1 py-0.2 bg-amber-100 text-amber-800 text-[9px] font-bold rounded">
                                  HQ
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase font-mono ${
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
                          <span className="px-1.5 py-0.5 text-[10px] font-bold font-mono bg-stone-100 text-stone-700 rounded">
                            {account.currencyCode}
                          </span>
                        </div>
                      </div>

                      {/* Bakiye / Borç Göstergesi */}
                      <div className="mt-4 pt-3 border-t border-stone-100 flex items-baseline justify-between">
                        <span className="text-xs text-stone-500 font-medium">
                          {isCreditCard
                            ? 'Güncel Dönem Borcu:'
                            : isPos
                            ? 'Bekleyen POS Cirosu:'
                            : 'Kullanılabilir Bakiye:'}
                        </span>
                        <div className="text-right">
                          <span
                            className={`text-xl font-mono font-black tracking-tight ${
                              isCreditCard ? 'text-rose-600' : isPos ? 'text-amber-700' : 'text-stone-900'
                            }`}
                          >
                            ₺{account.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      {/* Banka IBAN Bilgisi */}
                      {isBank && account.iban && (
                        <div className="mt-2.5 p-2 bg-stone-50 rounded-lg flex items-center justify-between text-xs font-mono">
                          <span className="text-stone-700 font-semibold truncate max-w-[210px]" title={account.iban}>
                            {account.iban}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyIban(account.iban!)}
                            className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer shrink-0 ml-1"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{copiedIban === account.iban ? 'Kopyalandı' : 'Kopyala'}</span>
                          </button>
                        </div>
                      )}

                      {/* POS Cihazı Detayları */}
                      {isPos && (
                        <div className="mt-2.5 p-2 bg-amber-50/50 rounded-lg border border-amber-100/80 text-[11px] space-y-1">
                          <div className="flex items-center justify-between text-stone-700">
                            <span className="font-medium">Terminal / Tür:</span>
                            <span className="font-mono font-bold text-amber-900">
                              {account.posTerminalId || 'Standart'} ({account.posType === 'VIRTUAL' ? 'Sanal POS' : 'Fiziksel'})
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-stone-600">
                            <span className="flex items-center gap-1">
                              <Percent className="w-3 h-3 text-amber-600" /> Komisyon / Valör:
                            </span>
                            <span className="font-semibold text-stone-800">
                              %{account.commissionRate || 1.75} &bull; {account.valorDays || 1} Gün
                            </span>
                          </div>
                          {account.linkedBankAccountName && (
                            <div className="text-[10px] text-stone-500 truncate" title={account.linkedBankAccountName}>
                              Aktarım: {account.linkedBankAccountName}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Kredi Kartı Detayları & Limit Barı */}
                      {isCreditCard && (
                        <div className="mt-2.5 p-2.5 bg-violet-50/50 rounded-lg border border-violet-100/80 text-[11px] space-y-1.5">
                          <div className="flex items-center justify-between text-stone-800">
                            <span className="font-semibold truncate max-w-[170px]" title={account.cardHolderName}>
                              {account.cardHolderName || 'Şirket Yetkilisi'}
                            </span>
                            <span className="font-mono font-bold text-violet-800">
                              •••• {account.cardNumberLast4 || '8492'}
                            </span>
                          </div>

                          {/* Limit Barı */}
                          {account.creditLimit && (
                            <div>
                              <div className="flex items-center justify-between text-[10px] text-stone-500 mb-1">
                                <span>Toplam Limit: ₺{account.creditLimit.toLocaleString('tr-TR')}</span>
                                <span className="font-bold text-emerald-700">
                                  Kalan: ₺{Math.max(0, account.creditLimit - account.balance).toLocaleString('tr-TR')}
                                </span>
                              </div>
                              <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-violet-600 rounded-full transition-all"
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      account.creditLimit > 0 ? (account.balance / account.creditLimit) * 100 : 0
                                    )}%`,
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-between text-[10px] text-stone-500 pt-0.5">
                            <span>Kesim: {account.cutoffDay || 15}. gün</span>
                            <span>Son Ödeme: {account.paymentDueDay || 25}. gün</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Hızlı İşlem & Yönetim Butonları */}
                    <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* POS için Özel Gün Sonu / Aktar Butonu */}
                        {isPos && (
                          <button
                            type="button"
                            onClick={() => setPosForSettlement(account)}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition-all shadow-2xs cursor-pointer"
                            title="POS cirosunu komisyon düşerek hesaba aktar"
                          >
                            <ArrowRightLeft className="w-3 h-3" />
                            <span>Gün Sonu & Aktar</span>
                          </button>
                        )}

                        {/* Kredi Kartı için Özel Borç Öde Butonu */}
                        {isCreditCard && (
                          <button
                            type="button"
                            onClick={() => setCardForPayment(account)}
                            className="px-2.5 py-1 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition-all shadow-2xs cursor-pointer"
                            title="Vadesiz hesaptan kart borcunu öde"
                          >
                            <CreditCardIcon className="w-3 h-3" />
                            <span>Borç Öde</span>
                          </button>
                        )}

                        {/* Genel Giriş / Tahsilat */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAccountForAction(account);
                            setQuickActionType('IN');
                            setIsQuickActionModalOpen(true);
                          }}
                          className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                          title={isPos ? 'POS Tahsilat Girişi' : 'Hızlı para girişi / tahsilat'}
                        >
                          <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                          <span>{isPos ? 'Tahsilat' : 'Giriş'}</span>
                        </button>

                        {/* Genel Çıkış / Harcama */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAccountForAction(account);
                            setQuickActionType('OUT');
                            setIsQuickActionModalOpen(true);
                          }}
                          className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                          title={isCreditCard ? 'Kartla Masraf / Harcama' : 'Hızlı para çıkışı / ödeme'}
                        >
                          <ArrowUpRight className="w-3 h-3 text-rose-600" />
                          <span>{isCreditCard ? 'Harcama' : 'Çıkış'}</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditAccount(account);
                            setIsNewModalOpen(true);
                          }}
                          className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded transition-colors cursor-pointer"
                          title="Hesap bilgilerini düzenle"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteAccount(account)}
                          className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          title="Hesabı sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredAccounts.length === 0 && (
                <div className="col-span-full p-12 text-center bg-white rounded-xl border border-dashed border-stone-200">
                  <Wallet className="w-10 h-10 text-stone-300 mx-auto mb-3" />
                  <h3 className="text-sm font-bold text-stone-800">Hesap / Kart / POS Bulunamadı</h3>
                  <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                    Seçili filtrelere uygun hesap bulunamadı. Filtreleri sıfırlayabilir veya yeni bir finansal hesap tanımlayabilirsiniz.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setEditAccount(null);
                      setIsNewModalOpen(true);
                    }}
                    className="mt-4 px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Yeni Hesap Tanımla</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TABLO / LİSTE GÖRÜNÜMÜ - AG GRID & SIDEBAR (Cari Hesaplar Standardı) */}
          {viewMode === 'TABLE' && (
            <div className="space-y-2">
              <div className="flex gap-4 items-start relative h-[540px]">
                <div
                  className={`bg-white border border-stone-200/90 rounded-xl shadow-2xs overflow-hidden transition-all duration-300 ${
                    isSidebarOpen ? 'flex-1' : 'w-full'
                  }`}
                >
                  <div style={{ height: '540px', width: '100%' }}>
                    <AgGridReact<CashBank>
                      theme={appTheme}
                      localeText={AG_GRID_LOCALE_TR}
                      rowData={filteredAccounts}
                      columnDefs={accountColumnDefs}
                      pagination={true}
                      paginationPageSize={10}
                      paginationPageSizeSelector={[10, 25, 50]}
                      rowSelection={{
                        mode: 'singleRow',
                        checkboxes: false,
                      }}
                      onGridReady={onGridReady}
                      onColumnMoved={saveGridState}
                      onColumnVisible={saveGridState}
                      onColumnResized={saveGridState}
                      onSortChanged={saveGridState}
                      rowHeight={52}
                      headerHeight={42}
                      animateRows={true}
                      enableCellTextSelection={true}
                    />
                  </div>
                </div>

                {/* ÖZEL SIDEBAR (Gelişmiş Görünüm ve Kolon Özelleştirme Paneli) */}
                {isSidebarOpen && (
                  <AgGridColumnSidebar
                    gridApi={gridApi}
                    onSaveGridState={saveGridState}
                    onClose={() => setIsSidebarOpen(false)}
                    primaryColIds={['name', 'type', 'branchId', 'currencyCode', 'detailInfo', 'balance']}
                    sidebarRef={sidebarRef}
                  />
                )}
              </div>

              {/* Alt Konsolide Likidite Özeti */}
              <div className="p-3 bg-white border border-stone-200/90 rounded-xl flex items-center justify-between shadow-2xs text-xs">
                <span className="font-semibold text-stone-700">
                  TOPLAM KONSOLİDE LİKİDİTE (Nakit Kasalar + Banka Mevduatları):
                </span>
                <span className="font-mono text-indigo-950 font-black text-sm">
                  ₺{kpis.totalLiquidity.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SEKME 2: ŞUBE BAZLI KASA & BANKA ANALİZİ */}
      {activeTab === 'SUBE_BAZLI' && (
        <div className="space-y-4">
          <div className="bg-white border border-stone-200/90 rounded-xl p-4 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <h3 className="text-sm font-bold text-stone-900">
                  Şube Bazlı Nakit, Banka, POS & Kredi Kartı Dağılımı ve Likidite Analizi
                </h3>
                <p className="text-xs text-stone-500">
                  Her şubenin kendi kasaları, banka hesapları, POS cihazları, kredi kartları ve nakit akış performansı
                </p>
              </div>
              <span className="text-xs font-mono text-stone-500 bg-stone-100 px-2.5 py-1 rounded-lg">
                Toplam {branchComparison.length} Şube
              </span>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Şube Adı & Lokasyon</th>
                    <th className="py-3 px-3 text-right">Kasa Bakiyesi</th>
                    <th className="py-3 px-3 text-right">Banka Bakiyesi</th>
                    <th className="py-3 px-3 text-right text-amber-700">POS Ciro</th>
                    <th className="py-3 px-3 text-right text-rose-700">Kart Borcu</th>
                    <th className="py-3 px-4 text-right font-bold text-stone-900">Net Şube Likiditesi</th>
                    <th className="py-3 px-3 text-center">Likidite Payı</th>
                    <th className="py-3 px-3 text-right text-emerald-700">Toplam Giriş</th>
                    <th className="py-3 px-3 text-right text-rose-700">Toplam Çıkış</th>
                    <th className="py-3 px-4 text-center">Detay Analiz</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {branchComparison.map((item) => (
                    <tr
                      key={item.branch.id}
                      onClick={() => setSelectedBranchForModal(item.branch)}
                      className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
                          <div>
                            <div className="font-bold text-stone-900 group-hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                              <span>{item.branch.name}</span>
                              {item.branch.isHeadquarter && (
                                <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[9px] font-bold rounded">
                                  HQ
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-stone-400">
                              {item.branch.city} &bull; Kod: {item.branch.code}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-emerald-700 font-semibold">
                        ₺{item.cashBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-cyan-700 font-semibold">
                        ₺{item.bankBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-amber-700 font-semibold">
                        ₺{item.posBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-rose-600 font-semibold">
                        ₺{item.cardDebt.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-black text-stone-900 text-sm">
                        ₺{item.branchLiquidity.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-mono font-bold text-[11px] rounded-full border border-indigo-100">
                          %{item.liquidityShare.toFixed(1)}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-700">
                        ₺{item.inflow.toLocaleString('tr-TR')}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-semibold text-rose-700">
                        ₺{item.outflow.toLocaleString('tr-TR')}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBranchForModal(item.branch);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>İncele &rarr;</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-stone-50 border-t-2 border-stone-200 font-bold text-xs">
                  <tr>
                    <td className="py-3.5 px-4 text-stone-900">
                      GENEL ŞİRKET TOPLAMI
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-emerald-700">
                      ₺{branchComparison.reduce((a, b) => a + b.cashBalance, 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-cyan-700">
                      ₺{branchComparison.reduce((a, b) => a + b.bankBalance, 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-amber-700">
                      ₺{branchComparison.reduce((a, b) => a + b.posBalance, 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-rose-700">
                      ₺{branchComparison.reduce((a, b) => a + b.cardDebt, 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-indigo-950 font-black text-sm">
                      ₺{branchComparison.reduce((a, b) => a + b.branchLiquidity, 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-3 text-center font-mono font-bold text-indigo-700">
                      %100.0
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-emerald-700">
                      ₺{branchComparison.reduce((a, b) => a + b.inflow, 0).toLocaleString('tr-TR')}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-rose-700">
                      ₺{branchComparison.reduce((a, b) => a + b.outflow, 0).toLocaleString('tr-TR')}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SEKME 3: KASA & BANKA HAREKETLERİ */}
      {activeTab === 'HAREKETLER' && (
        <div className="space-y-4">
          <div className="bg-white border border-stone-200/90 rounded-xl p-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-stone-100 gap-2">
              <div>
                <h3 className="text-sm font-bold text-stone-900">
                  Finansal Hareketler (Kasa, Banka, POS & Kart Ekstresi)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <AgGridSidebarToggleBtn
                  isOpen={isMovementsSidebarOpen}
                  onToggle={() => setIsMovementsSidebarOpen(!isMovementsSidebarOpen)}
                  gridApi={movementsGridApi}
                  buttonRef={movementsSidebarButtonRef}
                />
              </div>
            </div>

            <div className="mt-4 flex gap-4 items-start relative h-[560px]">
              <div
                className={`bg-white border border-stone-200/90 rounded-xl shadow-2xs overflow-hidden transition-all duration-300 ${
                  isMovementsSidebarOpen ? 'flex-1' : 'w-full'
                }`}
              >
                <div style={{ height: '560px', width: '100%' }}>
                  <AgGridReact<PaymentMovement>
                    theme={appTheme}
                    localeText={AG_GRID_LOCALE_TR}
                    rowData={filteredPaymentMovements}
                    columnDefs={movementColumnDefs}
                    pagination={true}
                    paginationPageSize={15}
                    paginationPageSizeSelector={[15, 30, 50, 100]}
                    rowSelection={{
                      mode: 'singleRow',
                      checkboxes: false,
                    }}
                    onGridReady={onMovementsGridReady}
                    onColumnMoved={saveMovementsGridState}
                    onColumnVisible={saveMovementsGridState}
                    onColumnResized={saveMovementsGridState}
                    onSortChanged={saveMovementsGridState}
                    rowHeight={46}
                    headerHeight={42}
                    animateRows={true}
                    enableCellTextSelection={true}
                  />
                </div>
              </div>

              {/* ÖZEL SIDEBAR (Hareketler Kolon Özelleştirme) */}
              {isMovementsSidebarOpen && (
                <AgGridColumnSidebar
                  gridApi={movementsGridApi}
                  onSaveGridState={saveMovementsGridState}
                  onClose={() => setIsMovementsSidebarOpen(false)}
                  primaryColIds={['movementDate', 'branchName', 'movementType', 'cashBankName', 'documentNumber', 'inflow', 'outflow']}
                  sidebarRef={movementsSidebarRef}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* YENİ / DÜZENLEME HESAP MODALI */}
      <YeniKasaBankaModal
        isOpen={isNewModalOpen}
        onClose={() => {
          setIsNewModalOpen(false);
          setEditAccount(null);
        }}
        onSave={handleSaveAccount}
        branches={branches}
        currentBranchId={selectedBranchId}
        editAccount={editAccount}
        existingAccounts={cashBanks}
      />

      {/* HIZLI PARA GİRİŞ / ÇIKIŞ MODALI */}
      <KasaBankaIslemModal
        isOpen={isQuickActionModalOpen}
        onClose={() => {
          setIsQuickActionModalOpen(false);
          setSelectedAccountForAction(null);
        }}
        onSuccess={() => {
          setFeedbackMessage('İşlem başarıyla kaydedildi.');
          setTimeout(() => setFeedbackMessage(null), 3000);
          loadData();
        }}
        account={selectedAccountForAction}
        initialType={quickActionType}
      />

      {/* ŞUBE BAZLI DETAY ANALİZ MODALI */}
      <SubeKasaBankaDetayModal
        isOpen={!!selectedBranchForModal}
        onClose={() => setSelectedBranchForModal(null)}
        branch={selectedBranchForModal}
        cashBanks={cashBanks}
        paymentMovements={paymentMovements}
        transfers={transfers}
        onOpenNewAccountModal={(branchId) => {
          setSelectedBranchForModal(null);
          setEditAccount(null);
          setIsNewModalOpen(true);
        }}
        onOpenQuickActionModal={(account, type) => {
          setSelectedAccountForAction(account);
          setQuickActionType(type);
          setIsQuickActionModalOpen(true);
        }}
      />

      {/* POS GÜN SONU / HESABA AKTARIM MODALI */}
      {posForSettlement && (
        <PosAktarimModal
          isOpen={!!posForSettlement}
          onClose={() => setPosForSettlement(null)}
          posAccount={posForSettlement}
          bankAccounts={cashBanks.filter((a) => a.type === 'Bank')}
          onSettle={handlePosSettle}
        />
      )}

      {/* KREDİ KARTI BORÇ ÖDEME MODALI */}
      {cardForPayment && (
        <KrediKartiBorcOdemeModal
          isOpen={!!cardForPayment}
          onClose={() => setCardForPayment(null)}
          cardAccount={cardForPayment}
          availableFundingAccounts={cashBanks.filter((a) => a.type === 'Bank' || a.type === 'Cash')}
          onPayDebt={handleCardPayDebt}
        />
      )}
    </div>
  );
};

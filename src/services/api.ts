/**
 * FX Enterprise ERP - api.ts
 * .NET 9 Web API bağlantı servisi.
 * Navbar üzerinden seçilen aktif şube bilgisini 'X-Selected-Branch-Id' header'ı olarak
 * tüm giden isteklere otomatik enjekte eder.
 */

import { Contact, Branch, CashBank, InterBranchTransfer, TaxAllocation, Employee, Product, Warehouse, StockMovement, WarehouseStock, ShippingRate, PaymentMovement, RevenueExpenseItem, RevenueExpenseCategoryItem, RevenueExpenseType, DebtCreditItem, DebtCreditPaymentRecord, DebtCreditType, DebtCreditStatus, PaymentMethodType } from '../types/fx';
import { BRANCHES, CURRENT_TENANT, INITIAL_CONTACTS, INITIAL_CASH_BANKS, INITIAL_TRANSFERS, INITIAL_TAX_ALLOCATIONS, INITIAL_EMPLOYEES, INITIAL_WAREHOUSES, INITIAL_PRODUCTS, INITIAL_STOCK_MOVEMENTS, INITIAL_WAREHOUSE_STOCKS, INITIAL_SHIPPING_RATES, INITIAL_PAYMENT_MOVEMENTS, INITIAL_REVENUE_EXPENSES, INITIAL_REVENUE_EXPENSE_CATEGORIES, INITIAL_DEBT_CREDITS } from '../data/mockData';
import { geoService } from './geoService';

// Aktif şube ve kimlik yönetimi
const STORAGE_KEYS = {
  BRANCH_ID: 'fx_selected_branch_id',
  AUTH_TOKEN: 'fx_auth_token',
  USER_ROLE: 'fx_user_role',
  IS_GLOBAL_USER: 'fx_is_global_user',
  BRANCHES: 'fx_branches_list',
  EMPLOYEES: 'fx_employees_list',
  CONTACTS: 'fx_contacts_list',
  PRODUCTS: 'fx_products_list',
  WAREHOUSES: 'fx_warehouses_list',
  STOCK_MOVEMENTS: 'fx_stock_movements_list',
  WAREHOUSE_STOCKS: 'fx_warehouse_stocks_list',
  SHIPPING_RATES: 'fx_shipping_rates_list',
  PAYMENT_MOVEMENTS: 'fx_payment_movements_list',
  CASH_BANKS: 'fx_cash_banks_list',
  TRANSFERS: 'fx_transfers_list',
  REVENUE_EXPENSES: 'fx_revenue_expenses_list',
  REVENUE_EXPENSE_CATEGORIES: 'fx_revenue_expense_categories_list',
  DEBT_CREDITS: 'fx_debt_credits_list',
};

// Şube listesini localStorage'dan al veya varsayılanı yükle
const getStoredBranches = (): Branch[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.BRANCHES);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const existingIds = new Set(parsed.map((b: Branch) => b.id));
        const merged = [...parsed];
        for (const defaultBranch of BRANCHES) {
          if (!existingIds.has(defaultBranch.id)) {
            merged.push(defaultBranch);
          }
        }
        return merged;
      }
    }
  } catch (e) {
    console.error('Kayıtlı şubeler okunamadı:', e);
  }
  return [...BRANCHES];
};

let inMemoryBranches: Branch[] = getStoredBranches();

// Varsayılan olarak Merkez Şube seçilidir
const DEFAULT_BRANCH_ID = inMemoryBranches[0]?.id || BRANCHES[0].id;

class BranchContextManager {
  private selectedBranchId: string;
  private isGlobalUser: boolean;
  private listeners: Array<() => void> = [];

  constructor() {
    this.selectedBranchId = localStorage.getItem(STORAGE_KEYS.BRANCH_ID) || DEFAULT_BRANCH_ID;
    this.isGlobalUser = localStorage.getItem(STORAGE_KEYS.IS_GLOBAL_USER) === 'true';
  }

  public getSelectedBranchId(): string {
    return this.selectedBranchId;
  }

  public setSelectedBranchId(branchId: string): void {
    this.selectedBranchId = branchId;
    localStorage.setItem(STORAGE_KEYS.BRANCH_ID, branchId);
    this.notify();
  }

  public getIsGlobalUser(): boolean {
    return this.isGlobalUser;
  }

  public setIsGlobalUser(val: boolean): void {
    this.isGlobalUser = val;
    localStorage.setItem(STORAGE_KEYS.IS_GLOBAL_USER, String(val));
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  public notify() {
    this.listeners.forEach(l => l());
  }
}

export const branchContext = new BranchContextManager();

const getStoredContacts = (): Contact[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.CONTACTS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Kayıtlı cari listesi okunamadı:', e);
  }
  return [...INITIAL_CONTACTS];
};

// Canlı Mock Veri Havuzu (Local preview ve .NET API simülasyonu)
let inMemoryContacts: Contact[] = getStoredContacts();
let inMemoryCashBanks = [...INITIAL_CASH_BANKS];
let inMemoryTransfers = [...INITIAL_TRANSFERS];
let inMemoryTaxAllocations = [...INITIAL_TAX_ALLOCATIONS];

const getStoredEmployees = (): Employee[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Kayıtlı personel listesi okunamadı:', e);
  }
  return [...INITIAL_EMPLOYEES];
};

let inMemoryEmployees: Employee[] = getStoredEmployees();

const getStoredWarehouses = (): Warehouse[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.WAREHOUSES);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Kayıtlı depolar okunamadı:', e);
  }
  return [...INITIAL_WAREHOUSES];
};

let inMemoryWarehouses: Warehouse[] = getStoredWarehouses();

const getStoredProducts = (): Product[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Kayıtlı ürünler okunamadı:', e);
  }
  return [...INITIAL_PRODUCTS];
};

let inMemoryProducts: Product[] = getStoredProducts();

const getStoredWarehouseStocks = (): WarehouseStock[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.WAREHOUSE_STOCKS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Kayıtlı depo stokları okunamadı:', e);
  }
  return [...INITIAL_WAREHOUSE_STOCKS];
};

let inMemoryWarehouseStocks: WarehouseStock[] = getStoredWarehouseStocks();

const getStoredStockMovements = (): StockMovement[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.STOCK_MOVEMENTS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Kayıtlı stok hareketleri okunamadı:', e);
  }
  return [...INITIAL_STOCK_MOVEMENTS];
};

let inMemoryStockMovements: StockMovement[] = getStoredStockMovements();

const getStoredShippingRates = (): ShippingRate[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SHIPPING_RATES);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Kayıtlı kargo tarifeleri okunamadı:', e);
  }
  return [...INITIAL_SHIPPING_RATES];
};

let inMemoryShippingRates: ShippingRate[] = getStoredShippingRates();

const getStoredCashBanks = (): CashBank[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.CASH_BANKS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Kayıtlı kasa ve banka listesi okunamadı:', e);
  }
  return [...INITIAL_CASH_BANKS];
};

inMemoryCashBanks = getStoredCashBanks();

const getStoredPaymentMovements = (): PaymentMovement[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.PAYMENT_MOVEMENTS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Kayıtlı ödeme ve tahsilat hareketleri okunamadı:', e);
  }
  return [...INITIAL_PAYMENT_MOVEMENTS];
};

let inMemoryPaymentMovements: PaymentMovement[] = getStoredPaymentMovements();

const getStoredRevenueExpenses = (): RevenueExpenseItem[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.REVENUE_EXPENSES);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Kayıtlı gelir ve gider hareketleri okunamadı:', e);
  }
  return [...INITIAL_REVENUE_EXPENSES];
};

let inMemoryRevenueExpenses: RevenueExpenseItem[] = getStoredRevenueExpenses();

const getStoredRevenueExpenseCategories = (): RevenueExpenseCategoryItem[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.REVENUE_EXPENSE_CATEGORIES);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Kayıtlı gelir-gider kategorileri okunamadı:', e);
  }
  return [...INITIAL_REVENUE_EXPENSE_CATEGORIES];
};

let inMemoryRevenueExpenseCategories: RevenueExpenseCategoryItem[] = getStoredRevenueExpenseCategories();

const getStoredDebtCredits = (): DebtCreditItem[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.DEBT_CREDITS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Kayıtlı borç/alacak kayıtları okunamadı:', e);
  }
  return [...INITIAL_DEBT_CREDITS];
};

let inMemoryDebtCredits: DebtCreditItem[] = getStoredDebtCredits();

const getWarehouseBranchId = (warehouse: Warehouse): string | undefined => {
  if (warehouse.branchId) return warehouse.branchId;
  return BRANCHES.find((branch) => warehouse.warehouseCode.startsWith(branch.code))?.id;
};

const adjustRevenueExpenseEffects = (item: RevenueExpenseItem, multiplier: 1 | -1): void => {
  if (item.paymentStatus === 'PAID' && item.cashBankId) {
    const cashBank = inMemoryCashBanks.find((account) => account.id === item.cashBankId);
    if (cashBank) {
      const balanceDelta = item.type === 'GELIR' ? item.grandTotal : -item.grandTotal;
      cashBank.balance = Math.round((cashBank.balance + balanceDelta * multiplier) * 100) / 100;
    }
  }

  if (item.contactId) {
    const contact = inMemoryContacts.find((candidate) => candidate.id === item.contactId);
    if (contact) {
      const balanceDelta = item.type === 'GELIR' ? item.grandTotal : -item.grandTotal;
      contact.currentBalance = Math.round(((contact.currentBalance || 0) + balanceDelta * multiplier) * 100) / 100;
      contact.updatedAt = new Date().toISOString();
    }
  }
};

const buildRevenueExpenseMovement = (item: RevenueExpenseItem): PaymentMovement | null => {
  if (item.paymentStatus !== 'PAID' || !item.cashBankId) return null;
  const cashBank = inMemoryCashBanks.find((account) => account.id === item.cashBankId);
  if (!cashBank) return null;

  const paymentMethod: PaymentMethodType = item.paymentMethod === 'HAVALE_EFT'
    ? 'BANKA'
    : item.paymentMethod === 'ACIK_HESAP'
      ? 'CEK_SENET'
      : item.paymentMethod;

  return {
    id: `pm-re-${item.id}`,
    tenantId: CURRENT_TENANT.id,
    branchId: item.branchId,
    branchName: item.branchName,
    movementType: item.type === 'GELIR' ? 'TAHSILAT' : 'MASRAF',
    paymentMethod,
    contactId: item.contactId,
    contactTitle: item.contactTitle || item.title,
    cashBankId: cashBank.id,
    cashBankName: cashBank.name,
    amount: item.grandTotal,
    currency: item.currency,
    exchangeRate: item.exchangeRate,
    documentNumber: item.documentNumber,
    receiptNumber: item.itemCode,
    movementDate: item.transactionDate,
    dueDate: item.dueDate,
    status: 'COMPLETED',
    description: item.title,
    category: item.category,
    createdAt: item.createdAt || new Date().toISOString(),
    createdByUser: item.createdByUser,
  };
};



export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
  appliedBranchFilter: string | null;
  isConsolidatedReport: boolean;
}

export interface AuthenticatedUser {
  email: string;
  name: string;
  role: string;
  branchId: string;
}

/**
 * FX API Client
 * Hem gerçek .NET 9 backend'e ('/api/...') fetch isteği atabilir,
 * hem de offline/local test modunda %100 birebir HTTP pipeline davranışı sergiler.
 */
export const fxApi = {
  async login(email: string, password: string): Promise<{ user: AuthenticatedUser; token: string }> {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.message || 'E-posta veya şifre geçersiz.');
    }

    const token = payload.token || payload.accessToken;
    const user = payload.user;
    if (!token || !user) {
      throw new Error('Kimlik doğrulama yanıtı geçersiz.');
    }

    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    return { user, token };
  },

  /**
   * İstek öncesi ortak header'ları hazırlayan pipeline fonksiyonu
   */
  getHeaders(): HeadersInit {
    const branchId = branchContext.getSelectedBranchId();
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    const isGlobal = branchContext.getIsGlobalUser();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      // .NET 9 Middleware'in okuyacağı zorunlu başlıklar:
      'X-Tenant-Id': CURRENT_TENANT.id,
      'X-Selected-Branch-Id': branchId,
      'X-Is-Global-User': String(isGlobal),
    };

    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  },

  /**
   * CARİ HESAPLAR / MÜŞTERİ LİSTESİ GETİR (.NET camelCase DTO)
   * GlobalUser ise tüm şubeleri veya seçilen şubeyi getirir.
   * Şube kullanıcısı ise Global Query Filter gereği sadece kendi şubesini görür.
   */
  async getContacts(): Promise<ApiResponse<Contact[]>> {
    const selectedBranch = branchContext.getSelectedBranchId();
    const isGlobal = branchContext.getIsGlobalUser();

    // Konsolide mod: 'all' seçilmişse tüm şubeler, tekil şube seçilmişse sadece o şube
    let filtered = inMemoryContacts;
    let isConsolidated = false;

    if (selectedBranch === 'all') {
      filtered = inMemoryContacts;
      isConsolidated = true;
    } else {
      filtered = inMemoryContacts.filter(c => c.branchId === selectedBranch);
    }

    return {
      success: true,
      data: [...filtered],
      appliedBranchFilter: isConsolidated ? 'TÜM ŞUBELER (KONSOLİDE)' : selectedBranch,
      isConsolidatedReport: isConsolidated,
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * YENİ CARİ HESAP EKLE
   */
  async createContact(contactData: Omit<Contact, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Contact>> {
    const selectedBranch = branchContext.getSelectedBranchId();
    const branchToUse = contactData.branchId || (selectedBranch === 'all' ? BRANCHES[0].id : selectedBranch);

    const newContact: Contact = {
      ...contactData,
      id: `c1010101-0001-4000-8000-${String(Date.now()).slice(-12)}`,
      tenantId: CURRENT_TENANT.id,
      branchId: branchToUse,
      currentBalance: contactData.currentBalance !== undefined ? contactData.currentBalance : (Number(contactData.openingBalance) || 0),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    inMemoryContacts = [newContact, ...inMemoryContacts];
    try {
      localStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(inMemoryContacts));
    } catch (e) {
      console.error('Cari listesi kaydedilemedi:', e);
    }

    return {
      success: true,
      data: newContact,
      message: 'Cari hesap başarıyla kaydedildi.',
      appliedBranchFilter: branchToUse,
      isConsolidatedReport: false,
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * CARİ HESAP GÜNCELLE
   */
  async updateContact(id: string, contactData: Partial<Contact>): Promise<ApiResponse<Contact>> {
    const index = inMemoryContacts.findIndex(c => c.id === id);
    if (index === -1) {
      throw new Error('Güncellenecek cari hesap bulunamadı.');
    }

    const updatedContact: Contact = {
      ...inMemoryContacts[index],
      ...contactData,
      updatedAt: new Date().toISOString(),
    };

    inMemoryContacts[index] = updatedContact;
    try {
      localStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(inMemoryContacts));
    } catch (e) {
      console.error('Cari kartı güncellenip kaydedilemedi:', e);
    }

    return {
      success: true,
      data: updatedContact,
      message: 'Cari hesap başarıyla güncellendi.',
      appliedBranchFilter: updatedContact.branchId,
      isConsolidatedReport: false,
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * KASALAR & BANKALAR LİSTESİ
   */
  async getCashesAndBanks(branchId?: string): Promise<ApiResponse<CashBank[]>> {
    const targetBranch = branchId || branchContext.getSelectedBranchId();
    const isGlobal = branchContext.getIsGlobalUser();

    let list = inMemoryCashBanks;
    if (targetBranch && targetBranch !== 'all') {
      list = inMemoryCashBanks.filter(cb => cb.branchId === targetBranch);
    }

    return {
      success: true,
      data: list,
      appliedBranchFilter: targetBranch === 'all' ? 'TÜM ŞUBELER' : targetBranch,
      isConsolidatedReport: targetBranch === 'all',
      timestamp: new Date().toISOString(),
    };
  },

  async getCashBanks(branchId?: string): Promise<ApiResponse<CashBank[]>> {
    return this.getCashesAndBanks(branchId);
  },

  async createCashBank(accountData: Omit<CashBank, 'id' | 'tenantId'>): Promise<ApiResponse<CashBank>> {
    const newAccount: CashBank = {
      ...accountData,
      id: `cb-${Date.now()}`,
      tenantId: CURRENT_TENANT.id,
      balance: Number(accountData.balance) || 0,
    };
    inMemoryCashBanks = [newAccount, ...inMemoryCashBanks];
    localStorage.setItem(STORAGE_KEYS.CASH_BANKS, JSON.stringify(inMemoryCashBanks));
    return {
      success: true,
      data: newAccount,
      appliedBranchFilter: newAccount.branchId,
      isConsolidatedReport: false,
      timestamp: new Date().toISOString(),
    };
  },

  async updateCashBank(id: string, updates: Partial<CashBank>): Promise<ApiResponse<CashBank>> {
    const idx = inMemoryCashBanks.findIndex(cb => cb.id === id);
    if (idx === -1) {
      throw new Error('Kasa / Banka hesabı bulunamadı.');
    }
    const updated = {
      ...inMemoryCashBanks[idx],
      ...updates,
      id,
      tenantId: inMemoryCashBanks[idx].tenantId,
    };
    inMemoryCashBanks[idx] = updated;
    localStorage.setItem(STORAGE_KEYS.CASH_BANKS, JSON.stringify(inMemoryCashBanks));
    return {
      success: true,
      data: updated,
      appliedBranchFilter: updated.branchId,
      isConsolidatedReport: false,
      timestamp: new Date().toISOString(),
    };
  },

  async deleteCashBank(id: string): Promise<ApiResponse<boolean>> {
    const account = inMemoryCashBanks.find(cb => cb.id === id);
    if (!account) {
      throw new Error('Kasa / Banka hesabı bulunamadı.');
    }
    if (Math.abs(account.balance) > 0.01) {
      throw new Error('Bakiyesi 0 (sıfır) olmayan kasa veya banka hesabı silinemez! Lütfen önce bakiyeyi virman ile başka hesaba aktarınız.');
    }
    inMemoryCashBanks = inMemoryCashBanks.filter(cb => cb.id !== id);
    localStorage.setItem(STORAGE_KEYS.CASH_BANKS, JSON.stringify(inMemoryCashBanks));
    return {
      success: true,
      data: true,
      appliedBranchFilter: account.branchId,
      isConsolidatedReport: false,
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * POS GÜN SONU / HESABA AKTARIM (VALÖR KAPATMA & KOMİSYON KESİNTİSİ)
   * POS cihazındaki ciroyu komisyon kesintisi düşülerek vadesiz banka hesabına aktarır.
   */
  async settlePosTurnover(payload: {
    posId: string;
    amount: number;
    targetBankId?: string;
    description?: string;
  }): Promise<ApiResponse<{ netAmount: number; commissionAmount: number; targetBankName: string }>> {
    const posAccount = inMemoryCashBanks.find(cb => cb.id === payload.posId);
    if (!posAccount || posAccount.type !== 'POS') {
      throw new Error('İlgili POS hesabı bulunamadı.');
    }

    if (payload.amount <= 0) {
      throw new Error('Aktarım tutarı 0’dan büyük olmalıdır.');
    }

    if (posAccount.balance < payload.amount) {
      throw new Error(`POS hesabında yeterli ciro bakiyesi yok. Mevcut POS bakiyesi: ₺${posAccount.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}.`);
    }

    const targetBankId = payload.targetBankId || posAccount.linkedBankAccountId;
    const targetAccount = inMemoryCashBanks.find(cb => cb.id === targetBankId);
    if (!targetAccount || targetAccount.type !== 'Bank') {
      throw new Error('Aktarım yapılacak geçerli bir vadesiz banka hesabı bulunamadı. Lütfen hedef banka hesabını seçiniz.');
    }

    const commissionRate = posAccount.commissionRate || 0;
    const commissionAmount = Math.round(((payload.amount * commissionRate) / 100) * 100) / 100;
    const netAmount = Math.round((payload.amount - commissionAmount) * 100) / 100;

    // POS bakiyesini düşür
    posAccount.balance = Math.round((posAccount.balance - payload.amount) * 100) / 100;

    // Hedef vadesiz banka hesabına net tutarı yatır
    targetAccount.balance = Math.round((targetAccount.balance + netAmount) * 100) / 100;

    localStorage.setItem(STORAGE_KEYS.CASH_BANKS, JSON.stringify(inMemoryCashBanks));

    // Hareket kaydı ekle (Tahsilat/Aktarım)
    const newMovement: PaymentMovement = {
      id: `pm-${Date.now()}-pos-settle`,
      tenantId: CURRENT_TENANT.id,
      branchId: posAccount.branchId,
      branchName: inMemoryBranches.find(b => b.id === posAccount.branchId)?.name || 'Şube',
      movementType: 'TAHSILAT',
      paymentMethod: 'BANKA',
      contactTitle: `${posAccount.name} Gün Sonu & Net Ciro Aktarımı`,
      cashBankId: targetAccount.id,
      cashBankName: targetAccount.name,
      amount: netAmount,
      currency: targetAccount.currencyCode,
      documentNumber: `POS-AKTR-${Date.now().toString().slice(-6)}`,
      receiptNumber: `POS-${posAccount.posTerminalId || 'TERM'}`,
      movementDate: new Date().toISOString(),
      status: 'COMPLETED',
      description: payload.description || `${posAccount.name} cirosundan (%${commissionRate} Komisyon = ₺${commissionAmount.toLocaleString('tr-TR')}) düşüldükten sonra net ₺${netAmount.toLocaleString('tr-TR')} ${targetAccount.name} hesabına aktarıldı.`,
      createdAt: new Date().toISOString(),
      createdByUser: 'pos.otomasyon@fx.com.tr',
    };
    inMemoryPaymentMovements = [newMovement, ...inMemoryPaymentMovements];
    try {
      localStorage.setItem(STORAGE_KEYS.PAYMENT_MOVEMENTS, JSON.stringify(inMemoryPaymentMovements));
    } catch (e) {
      console.error(e);
    }

    return {
      success: true,
      data: {
        netAmount,
        commissionAmount,
        targetBankName: targetAccount.name,
      },
      message: `${posAccount.name} hesabından ₺${payload.amount.toLocaleString('tr-TR')} ciro aktarımı yapıldı. %${commissionRate} komisyon (₺${commissionAmount.toLocaleString('tr-TR')}) kesilerek net ₺${netAmount.toLocaleString('tr-TR')} "${targetAccount.name}" hesabına aktarıldı.`,
      appliedBranchFilter: posAccount.branchId,
      isConsolidatedReport: false,
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * KREDİ KARTI BORÇ ÖDEME (Vadesiz Banka / Kasa -> Kredi Kartı)
   * Seçilen hesaptan kart borcunu öder, kart limitini rahatlatır.
   */
  async payCreditCardDebt(payload: {
    cardId: string;
    sourceCashBankId: string;
    amount: number;
    description?: string;
  }): Promise<ApiResponse<{ paidAmount: number; remainingDebt: number; remainingLimit: number }>> {
    const cardAccount = inMemoryCashBanks.find(cb => cb.id === payload.cardId);
    if (!cardAccount || cardAccount.type !== 'CreditCard') {
      throw new Error('İlgili şirket kredi kartı bulunamadı.');
    }

    if (payload.amount <= 0) {
      throw new Error('Ödeme tutarı 0’dan büyük olmalıdır.');
    }

    const sourceAccount = inMemoryCashBanks.find(cb => cb.id === payload.sourceCashBankId);
    if (!sourceAccount) {
      throw new Error('Ödemenin yapılacağı kaynak kasa veya banka hesabı bulunamadı.');
    }

    if (sourceAccount.balance < payload.amount) {
      throw new Error(`Kaynak hesapta (${sourceAccount.name}) yeterli bakiye bulunmuyor. Mevcut Bakiye: ₺${sourceAccount.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}.`);
    }

    // Kaynak hesaptan parayı düş
    sourceAccount.balance = Math.round((sourceAccount.balance - payload.amount) * 100) / 100;

    // Kart borcunu düş
    cardAccount.balance = Math.max(0, Math.round((cardAccount.balance - payload.amount) * 100) / 100);

    localStorage.setItem(STORAGE_KEYS.CASH_BANKS, JSON.stringify(inMemoryCashBanks));

    const totalLimit = cardAccount.creditLimit || 0;
    const remainingDebt = cardAccount.balance;
    const remainingLimit = Math.max(0, totalLimit - remainingDebt);

    // Hareket kaydı ekle (Ödeme / Kart Borcu Kapatma)
    const newMovement: PaymentMovement = {
      id: `pm-${Date.now()}-cc-pay`,
      tenantId: CURRENT_TENANT.id,
      branchId: cardAccount.branchId,
      branchName: inMemoryBranches.find(b => b.id === cardAccount.branchId)?.name || 'Şube',
      movementType: 'ODEME',
      paymentMethod: sourceAccount.type === 'Cash' ? 'NAKIT' : 'BANKA',
      contactTitle: `${cardAccount.name} (${cardAccount.cardNumberLast4 ? 'Son 4 Hane: ' + cardAccount.cardNumberLast4 : ''}) Borç Ödemesi`,
      cashBankId: sourceAccount.id,
      cashBankName: sourceAccount.name,
      amount: payload.amount,
      currency: sourceAccount.currencyCode,
      documentNumber: `KK-ODEME-${Date.now().toString().slice(-6)}`,
      receiptNumber: `DEKONT-${Date.now().toString().slice(-6)}`,
      movementDate: new Date().toISOString(),
      status: 'COMPLETED',
      description: payload.description || `${cardAccount.name} kredi kartına ₺${payload.amount.toLocaleString('tr-TR')} borç ödemesi ${sourceAccount.name} üzerinden gerçekleştirildi. Güncel Kart Borcu: ₺${remainingDebt.toLocaleString('tr-TR')}, Kalan Kullanılabilir Limit: ₺${remainingLimit.toLocaleString('tr-TR')}.`,
      createdAt: new Date().toISOString(),
      createdByUser: 'kart.islemleri@fx.com.tr',
    };
    inMemoryPaymentMovements = [newMovement, ...inMemoryPaymentMovements];
    try {
      localStorage.setItem(STORAGE_KEYS.PAYMENT_MOVEMENTS, JSON.stringify(inMemoryPaymentMovements));
    } catch (e) {
      console.error(e);
    }

    return {
      success: true,
      data: {
        paidAmount: payload.amount,
        remainingDebt,
        remainingLimit,
      },
      message: `"${cardAccount.name}" kredi kartına ₺${payload.amount.toLocaleString('tr-TR')} borç ödemesi başarıyla tamamlandı. Kalan borç: ₺${remainingDebt.toLocaleString('tr-TR')}, Kullanılabilir limit: ₺${remainingLimit.toLocaleString('tr-TR')}.`,
      appliedBranchFilter: cardAccount.branchId,
      isConsolidatedReport: false,
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * 2 AŞAMALI ŞUBELER ARASI VİRMAN (TRANSFER BAŞLATMA - CQRS CreateTransferCommand)
   * Kaynak kasadan para ANINDA düşer, transfer 'WaitingApproval' (Askıda/Yolda) olur.
   * Atomic Transaction simülasyonu: Bakiye yetersizse Rollback fırlatır.
   */
  async initiateTransfer(command: {
    sourceBranchId: string;
    targetBranchId: string;
    sourceCashBankId: string;
    targetCashBankId: string;
    amount: number;
    description: string;
  }): Promise<ApiResponse<InterBranchTransfer>> {
    if (command.amount <= 0) {
      throw new Error('Transfer tutarı 0’dan büyük olmalıdır (Decimal(18,4)).');
    }

    if (command.sourceBranchId === command.targetBranchId) {
      throw new Error('Kaynak şube ile hedef şube aynı olamaz. Şube içi virman için standart kasa/banka transferi kullanınız.');
    }

    const sourceAccount = inMemoryCashBanks.find(cb => cb.id === command.sourceCashBankId);
    if (!sourceAccount) {
      throw new Error('Kaynak kasa/banka hesabı bulunamadı.');
    }

    if (sourceAccount.balance < command.amount) {
      // Atomic Rollback
      throw new Error(`[IDbContextTransaction ROLLBACK] Yetersiz bakiye! Kaynak hesap bakiyesi: ₺${sourceAccount.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}, İstenen virman: ₺${command.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}.`);
    }

    const targetAccount = inMemoryCashBanks.find(cb => cb.id === command.targetCashBankId);
    if (!targetAccount) {
      throw new Error('Hedef kasa/banka hesabı bulunamadı.');
    }

    const sourceBranch = inMemoryBranches.find(b => b.id === command.sourceBranchId);
    const targetBranch = inMemoryBranches.find(b => b.id === command.targetBranchId);

    // 1. AŞAMA: Kaynak hesap bakiyesi ANINDA düşer (Atomic Write)
    sourceAccount.balance = Number((sourceAccount.balance - command.amount).toFixed(4));

    // Transfer kaydı 'WaitingApproval' (Askıda) oluşturulur
    const transferId = `tr-${Date.now()}`;
    const transfer: InterBranchTransfer = {
      id: transferId,
      tenantId: CURRENT_TENANT.id,
      transferNumber: `VRM-2026-${String(inMemoryTransfers.length + 1).padStart(5, '0')}`,
      sourceBranchId: command.sourceBranchId,
      sourceBranchName: sourceBranch?.name || 'Kaynak Şube',
      targetBranchId: command.targetBranchId,
      targetBranchName: targetBranch?.name || 'Hedef Şube',
      sourceCashBankId: command.sourceCashBankId,
      sourceCashBankName: sourceAccount.name,
      targetCashBankId: command.targetCashBankId,
      targetCashBankName: targetAccount.name,
      amount: command.amount,
      currencyCode: sourceAccount.currencyCode,
      description: command.description,
      status: 'WaitingApproval', // Askıda / Yolda
      createdAt: new Date().toISOString(),
      createdByUser: 'aktif.kullanici@fx.com.tr',
    };

    inMemoryTransfers = [transfer, ...inMemoryTransfers];

    // Ödeme & Tahsilat (PaymentMovements) alanında otomatik "PENDING" virman kaydı oluştur
    const newMovement: PaymentMovement = {
      id: `pm-${transferId}`,
      tenantId: CURRENT_TENANT.id,
      branchId: command.sourceBranchId,
      branchName: sourceBranch?.name || 'Kaynak Şube',
      movementType: 'VIRMAN',
      paymentMethod: sourceAccount.type === 'Cash' ? 'NAKIT' : 'BANKA',
      contactTitle: `Virman -> ${targetBranch?.name || 'Hedef Şube'} (${targetAccount.name})`,
      cashBankId: command.sourceCashBankId,
      cashBankName: sourceAccount.name,
      amount: command.amount,
      currency: sourceAccount.currencyCode,
      documentNumber: transfer.transferNumber,
      movementDate: new Date().toISOString(),
      status: 'PENDING', // Beklemede (Al gülüm ver gülüm için)
      description: command.description || `${sourceAccount.name} kasasından ${targetAccount.name} kasasına virman talebi.`,
      createdAt: new Date().toISOString(),
      createdByUser: 'aktif.kullanici@fx.com.tr',
    };

    inMemoryPaymentMovements = [newMovement, ...inMemoryPaymentMovements];

    // LocalStorage Kayıtları
    try {
      localStorage.setItem(STORAGE_KEYS.CASH_BANKS, JSON.stringify(inMemoryCashBanks));
      localStorage.setItem(STORAGE_KEYS.TRANSFERS, JSON.stringify(inMemoryTransfers));
      localStorage.setItem(STORAGE_KEYS.PAYMENT_MOVEMENTS, JSON.stringify(inMemoryPaymentMovements));
    } catch (e) {
      console.error('LocalStorage kaydetme hatası:', e);
    }

    return {
      success: true,
      data: transfer,
      message: `Virman başarıyla başlatıldı. ₺${command.amount.toLocaleString('tr-TR')} kaynak kasadan düşüldü ve onay için askıya alındı (WaitingApproval).`,
      appliedBranchFilter: command.sourceBranchId,
      isConsolidatedReport: false,
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * 2. AŞAMA: VİRMAN ONAYI (Hedef Şube/Muhasebe Sorumlusu Onaylar -> Hedef Kasa Bakiyesi Artar)
   */
  async approveTransfer(transferId: string): Promise<ApiResponse<InterBranchTransfer>> {
    const transfer = inMemoryTransfers.find(t => t.id === transferId);
    if (!transfer) {
      throw new Error('Transfer kaydı bulunamadı.');
    }

    if (transfer.status !== 'WaitingApproval') {
      throw new Error(`Bu transfer zaten '${transfer.status}' durumundadır.`);
    }

    const targetAccount = inMemoryCashBanks.find(cb => cb.id === transfer.targetCashBankId);
    if (!targetAccount) {
      throw new Error('Hedef kasa hesabı bulunamadı.');
    }

    // Hedef hesap bakiyesi artırılır
    targetAccount.balance = Number((targetAccount.balance + transfer.amount).toFixed(4));
    transfer.status = 'Completed';
    transfer.approvedAt = new Date().toISOString();
    transfer.approvedByUser = 'hedef.sube.onaylayan@fx.com.tr';

    // Karşılık gelen PaymentMovement kaydını COMPLETED yap
    const movementIndex = inMemoryPaymentMovements.findIndex(m => m.id === `pm-${transferId}`);
    if (movementIndex !== -1) {
      inMemoryPaymentMovements[movementIndex].status = 'COMPLETED';
    }

    // LocalStorage Kayıtları
    try {
      localStorage.setItem(STORAGE_KEYS.CASH_BANKS, JSON.stringify(inMemoryCashBanks));
      localStorage.setItem(STORAGE_KEYS.TRANSFERS, JSON.stringify(inMemoryTransfers));
      localStorage.setItem(STORAGE_KEYS.PAYMENT_MOVEMENTS, JSON.stringify(inMemoryPaymentMovements));
    } catch (e) {
      console.error('LocalStorage kaydetme hatası:', e);
    }

    return {
      success: true,
      data: transfer,
      message: `Virman işlemi muhasebe sorumlusu tarafından onaylandı. ₺${transfer.amount.toLocaleString('tr-TR')} hedef hesaba aktarıldı.`,
      appliedBranchFilter: transfer.targetBranchId,
      isConsolidatedReport: false,
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * 2. AŞAMA: VİRMAN REDDİ (Muhasebe / Hedef Şube Reddediyor -> Kaynak Kasaya İade Edilir)
   */
  async rejectTransfer(transferId: string): Promise<ApiResponse<InterBranchTransfer>> {
    const transfer = inMemoryTransfers.find(t => t.id === transferId);
    if (!transfer) {
      throw new Error('Transfer kaydı bulunamadı.');
    }

    if (transfer.status !== 'WaitingApproval') {
      throw new Error(`Bu transfer zaten '${transfer.status}' durumundadır.`);
    }

    const sourceAccount = inMemoryCashBanks.find(cb => cb.id === transfer.sourceCashBankId);
    if (!sourceAccount) {
      throw new Error('Kaynak kasa/banka hesabı bulunamadı.');
    }

    // Geri İade: Kaynak hesap bakiyesi geri yüklenir
    sourceAccount.balance = Number((sourceAccount.balance + transfer.amount).toFixed(4));
    transfer.status = 'Rejected';
    transfer.approvedAt = new Date().toISOString();
    transfer.approvedByUser = 'hedef.sube.reddeden@fx.com.tr';

    // Karşılık gelen PaymentMovement kaydını CANCELLED yap
    const movementIndex = inMemoryPaymentMovements.findIndex(m => m.id === `pm-${transferId}`);
    if (movementIndex !== -1) {
      inMemoryPaymentMovements[movementIndex].status = 'CANCELLED';
    }

    // LocalStorage kaydet
    try {
      localStorage.setItem(STORAGE_KEYS.CASH_BANKS, JSON.stringify(inMemoryCashBanks));
      localStorage.setItem(STORAGE_KEYS.TRANSFERS, JSON.stringify(inMemoryTransfers));
      localStorage.setItem(STORAGE_KEYS.PAYMENT_MOVEMENTS, JSON.stringify(inMemoryPaymentMovements));
    } catch (e) {
      console.error(e);
    }

    return {
      success: true,
      data: transfer,
      message: `Virman işlemi reddedildi. ₺${transfer.amount.toLocaleString('tr-TR')} kaynak hesaba iade edildi.`,
      appliedBranchFilter: transfer.sourceBranchId,
      isConsolidatedReport: false,
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * VİRMANLARI LİSTELE
   */
  async getTransfers(): Promise<ApiResponse<InterBranchTransfer[]>> {
    const selectedBranch = branchContext.getSelectedBranchId();
    const isGlobal = branchContext.getIsGlobalUser();

    let list = inMemoryTransfers;
    if (selectedBranch !== 'all') {
      list = inMemoryTransfers.filter(
        t => t.sourceBranchId === selectedBranch || t.targetBranchId === selectedBranch
      );
    }

    return {
      success: true,
      data: list,
      appliedBranchFilter: selectedBranch,
      isConsolidatedReport: selectedBranch === 'all',
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * RESMİ VERGİ DAĞITIMI LİSTESİ (tax_allocations)
   */
  async getTaxAllocations(): Promise<ApiResponse<TaxAllocation[]>> {
    return {
      success: true,
      data: inMemoryTaxAllocations,
      appliedBranchFilter: null,
      isConsolidatedReport: true,
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * ŞUBELERİ GETİR
   */
  getBranches(): Branch[] {
    return inMemoryBranches;
  },

  /**
   * YENİ ŞUBE OLUŞTUR (createBranch)
   */
  async createBranch(branchData: Omit<Branch, 'id'>): Promise<ApiResponse<Branch>> {
    const trimmedCode = branchData.code ? branchData.code.trim().toUpperCase() : '';
    if (!trimmedCode || trimmedCode.length < 2 || trimmedCode.length > 8 || !/^[A-Z0-9_-]{2,8}$/.test(trimmedCode)) {
      throw new Error('Şube kodu 2 ile 8 karakter arasında olmalı ve yalnızca alfanümerik karakterler (A-Z, 0-9, -, _) içermelidir.');
    }

    if (!branchData.name || !branchData.name.trim()) {
      throw new Error('Şube adı boş bırakılamaz.');
    }

    const trimmedCity = branchData.city ? branchData.city.trim() : '';
    if (!trimmedCity || trimmedCity === 'Şehir Seçiniz') {
      throw new Error('Lütfen geçerli bir şehir seçiniz.');
    }

    const trimmedAddress = branchData.address ? branchData.address.trim() : '';
    if (!trimmedAddress) {
      throw new Error('Şube faaliyet adresi boş bırakılamaz.');
    }

    // Şube kodu benzersizlik kontrolü
    const exists = inMemoryBranches.some(
      b => b.code.trim().toUpperCase() === trimmedCode
    );
    if (exists) {
      throw new Error(`"${trimmedCode}" koduna sahip bir şube zaten mevcut! Lütfen farklı bir şube kodu giriniz.`);
    }

    // Merkez şube benzersizlik kontrolü
    if (branchData.isHeadquarter) {
      const existingHQ = inMemoryBranches.find(b => b.isHeadquarter);
      if (existingHQ) {
        throw new Error(
          `Sistemde zaten bir Merkez Şube (${existingHQ.name} - ${existingHQ.code}) mevcuttur! Bir şirkette yalnızca tek bir Genel Müdürlük / Merkez Şube tanımlanabilir.`
        );
      }
    }

    const branch: Branch = {
      id: `b${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      code: trimmedCode,
      name: branchData.name.trim(),
      city: trimmedCity,
      isHeadquarter: Boolean(branchData.isHeadquarter),
      address: trimmedAddress,
    };

    inMemoryBranches = [...inMemoryBranches, branch];
    try {
      localStorage.setItem(STORAGE_KEYS.BRANCHES, JSON.stringify(inMemoryBranches));
    } catch (e) {
      console.error(e);
    }

    // Otomatik olarak bu şube için bir Ana Kasa (TL) aç (Nakit akışları için hazır olur)
    const newCash: CashBank = {
      id: `cb-${Date.now()}`,
      tenantId: CURRENT_TENANT?.id || 'tenant-default',
      branchId: branch.id,
      type: 'Cash',
      name: `${branch.name} - Ana Kasa (TL)`,
      currencyCode: 'TRY',
      balance: 0,
    };
    inMemoryCashBanks = [...inMemoryCashBanks, newCash];

    branchContext.notify();

    return {
      success: true,
      data: branch,
      message: `"${branch.name}" şubesi sisteme başarıyla eklendi ve varsayılan kasası oluşturuldu.`,
      appliedBranchFilter: branch.id,
      isConsolidatedReport: false,
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * ŞUBE SİL / ÇIKAR (deleteBranch)
   */
  async deleteBranch(branchId: string): Promise<ApiResponse<boolean>> {
    const targetBranch = inMemoryBranches.find(b => b.id === branchId);
    if (!targetBranch) {
      throw new Error('Silinmek istenen şube bulunamadı.');
    }
    if (targetBranch.isHeadquarter) {
      throw new Error('Genel Müdürlük / Merkez Şube sistem ana merkezi olduğu için silinemez!');
    }

    // Aktif seçili şube doğrudan silinemez kontrolü
    if (branchContext.getSelectedBranchId() === branchId) {
      throw new Error('Aktif olarak seçili olan şube sistemden silinemez! Silme işlemi yapabilmek için lütfen önce başka bir şubeye geçiş yapınız.');
    }

    // Şubeye kayıtlı aktif cari kontrolü
    const relatedContacts = inMemoryContacts.filter(c => c.branchId === branchId);
    if (relatedContacts.length > 0) {
      throw new Error(
        `Bu şubeye kayıtlı ${relatedContacts.length} adet cari hesap/müşteri bulunmaktadır. Şubeyi silebilmek için önce bu carileri başka bir şubeye aktarmalı veya silmelisiniz.`
      );
    }

    // Şubeye bağlı kasa bakiye kontrolü
    const nonZeroCash = inMemoryCashBanks.find(cb => cb.branchId === branchId && Math.abs(cb.balance) > 0.01);
    if (nonZeroCash) {
      throw new Error(
        `Bu şubenin "${nonZeroCash.name}" hesabında ₺${nonZeroCash.balance.toLocaleString('tr-TR')} bakiye bulunmaktadır. Silmeden önce bakiyeyi şubeler arası virman ile aktarınız.`
      );
    }

    inMemoryBranches = inMemoryBranches.filter(b => b.id !== branchId);
    try {
      localStorage.setItem(STORAGE_KEYS.BRANCHES, JSON.stringify(inMemoryBranches));
    } catch (e) {
      console.error(e);
    }

    // Boş kasaları temizle
    inMemoryCashBanks = inMemoryCashBanks.filter(cb => cb.branchId !== branchId);

    branchContext.notify();

    return {
      success: true,
      data: true,
      message: `"${targetBranch.name}" şubesi sistemden başarıyla çıkarıldı.`,
      appliedBranchFilter: null,
      isConsolidatedReport: false,
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * ŞUBE GÜNCELLE (updateBranch - İsim, Adres, Şehir, Kod)
   */
  async updateBranch(branchId: string, updateData: Partial<Omit<Branch, 'id'>>): Promise<ApiResponse<Branch>> {
    const branchIndex = inMemoryBranches.findIndex(b => b.id === branchId);
    if (branchIndex === -1) {
      throw new Error('Güncellenmek istenen şube bulunamadı.');
    }

    const currentBranch = inMemoryBranches[branchIndex];

    // İsim doğrulaması
    if (updateData.name !== undefined && !updateData.name.trim()) {
      throw new Error('Şube adı boş bırakılamaz.');
    }

    // Şehir doğrulaması
    if (updateData.city !== undefined && (!updateData.city.trim() || updateData.city.trim() === 'Şehir Seçiniz')) {
      throw new Error('Lütfen geçerli bir şehir seçiniz.');
    }

    // Adres doğrulaması
    if (updateData.address !== undefined && !updateData.address.trim()) {
      throw new Error('Şube adresi boş bırakılamaz.');
    }

    // Eğer kod değiştiriliyorsa format ve çakışma kontrolü
    let newCode = currentBranch.code;
    if (updateData.code !== undefined) {
      const trimmedCode = updateData.code.trim().toUpperCase();
      if (!trimmedCode || trimmedCode.length < 2 || trimmedCode.length > 8 || !/^[A-Z0-9_-]{2,8}$/.test(trimmedCode)) {
        throw new Error('Şube kodu 2 ile 8 karakter arasında olmalı ve yalnızca alfanümerik karakterler (A-Z, 0-9, -, _) içermelidir.');
      }
      if (trimmedCode !== currentBranch.code) {
        const codeExists = inMemoryBranches.some(
          b => b.id !== branchId && b.code.trim().toUpperCase() === trimmedCode
        );
        if (codeExists) {
          throw new Error(`"${trimmedCode}" koduna sahip başka bir şube zaten mevcut!`);
        }
      }
      newCode = trimmedCode;
    }

    // Merkez şube benzersizlik kontrolü
    if (updateData.isHeadquarter !== undefined) {
      if (updateData.isHeadquarter && !currentBranch.isHeadquarter) {
        const existingHQ = inMemoryBranches.find(b => b.id !== branchId && b.isHeadquarter);
        if (existingHQ) {
          throw new Error(`Sistemde zaten bir Merkez Şube (${existingHQ.name} - ${existingHQ.code}) mevcuttur! Başka bir şube merkez yapılamaz.`);
        }
      } else if (!updateData.isHeadquarter && currentBranch.isHeadquarter) {
        const otherHQ = inMemoryBranches.some(b => b.id !== branchId && b.isHeadquarter);
        if (!otherHQ) {
          throw new Error('Sistemin en az bir Merkez Şubesi (Genel Müdürlük) bulunmalıdır. Bu şubenin merkez statüsü doğrudan kaldırılamaz.');
        }
      }
    }

    const updatedBranch: Branch = {
      ...currentBranch,
      code: newCode,
      name: updateData.name !== undefined ? updateData.name.trim() : currentBranch.name,
      city: updateData.city !== undefined ? updateData.city.trim() : currentBranch.city,
      address: updateData.address !== undefined ? updateData.address.trim() : currentBranch.address,
      isHeadquarter: updateData.isHeadquarter !== undefined ? updateData.isHeadquarter : currentBranch.isHeadquarter,
    };

    inMemoryBranches[branchIndex] = updatedBranch;
    try {
      localStorage.setItem(STORAGE_KEYS.BRANCHES, JSON.stringify(inMemoryBranches));
    } catch (e) {
      console.error(e);
    }

    branchContext.notify();

    return {
      success: true,
      data: updatedBranch,
      message: `"${updatedBranch.name}" şube bilgileri başarıyla güncellendi.`,
      appliedBranchFilter: updatedBranch.id,
      isConsolidatedReport: false,
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * ŞUBENİN İSTATİSTİKLERİNİ GETİR (Cari sayısı, Kasa sayısı)
   */
  getBranchDetails(branchId: string) {
    const contactsCount = inMemoryContacts.filter(c => c.branchId === branchId).length;
    const cashAccounts = inMemoryCashBanks.filter(cb => cb.branchId === branchId);
    const totalCashBalance = cashAccounts.reduce((sum, cb) => sum + (cb.balance || 0), 0);
    return {
      contactsCount,
      cashAccountsCount: cashAccounts.length,
      totalCashBalance,
    };
  },

  /**
   * KİRACI BİLGİSİ
   */
  getCurrentTenant(): typeof CURRENT_TENANT {
    return CURRENT_TENANT;
  },

  /**
   * COĞRAFİ VERİ TABANI KONTROLÜ VE DOĞRULAMASI (32.311+ Mahalle)
   */
  getGeoStats() {
    return geoService.getDatabaseStats();
  },

  /**
   * PERSONEL MODÜLÜ (EMPLOYEES)
   */
  async getEmployees(params?: { branchId?: string; department?: string; employmentType?: string; isActive?: boolean; search?: string }): Promise<ApiResponse<Employee[]>> {
    const branchParam = params?.branchId;
    const activeBranchId = branchContext.getSelectedBranchId();
    const isGlobal = branchContext.getIsGlobalUser();

    let filtered = [...inMemoryEmployees];

    // Şube bazlı filtreleme ('ALL' veya 'all' ise tüm şubeler gösterilir)
    if (branchParam && branchParam !== 'ALL' && branchParam !== 'all') {
      filtered = filtered.filter(e => e.branchId === branchParam);
    } else if (!branchParam && activeBranchId && activeBranchId !== 'all' && activeBranchId !== 'ALL') {
      filtered = filtered.filter(e => e.branchId === activeBranchId);
    }

    if (params?.department && params.department !== 'ALL' && params.department !== 'all') {
      filtered = filtered.filter(e => e.department === params.department);
    }

    if (params?.employmentType && params.employmentType !== 'ALL' && params.employmentType !== 'all') {
      filtered = filtered.filter(e => e.employmentType === params.employmentType);
    }

    if (params?.isActive !== undefined) {
      filtered = filtered.filter(e => e.isActive === params.isActive);
    }

    if (params?.search && params.search.trim()) {
      const q = params.search.trim().toLowerCase();
      filtered = filtered.filter(
        e =>
          `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
          (e.identityNumber && e.identityNumber.toLowerCase().includes(q)) ||
          (e.title && e.title.toLowerCase().includes(q)) ||
          (e.department && e.department.toLowerCase().includes(q)) ||
          (e.iban && e.iban.toLowerCase().includes(q))
      );
    }

    const isConsolidated = branchParam === 'ALL' || branchParam === 'all' || (!branchParam && activeBranchId === 'all');

    return {
      success: true,
      data: [...filtered],
      message: `${filtered.length} personel kaydı getirildi.`,
      appliedBranchFilter: isConsolidated ? 'TÜM ŞUBELER (KONSOLİDE)' : (branchParam || activeBranchId),
      isConsolidatedReport: isConsolidated,
      timestamp: new Date().toISOString(),
    };
  },

  async createEmployee(employeeData: Omit<Employee, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Employee>> {
    const newId = `emp-${Date.now()}`;
    const selectedBranchId = employeeData.branchId || branchContext.getSelectedBranchId();
    const branch = inMemoryBranches.find(b => b.id === selectedBranchId) || inMemoryBranches[0];

    const newEmployee: Employee = {
      ...employeeData,
      id: newId,
      tenantId: CURRENT_TENANT.id,
      branchId: selectedBranchId,
      branchName: branch.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      addresses: employeeData.addresses || [],
    };

    inMemoryEmployees.unshift(newEmployee);
    try {
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(inMemoryEmployees));
    } catch (e) {
      console.error('Personel kaydedilirken hata oluştu:', e);
    }

    return {
      success: true,
      data: newEmployee,
      message: `${newEmployee.firstName} ${newEmployee.lastName} başarıyla sisteme eklendi.`,
      appliedBranchFilter: selectedBranchId,
      isConsolidatedReport: false,
      timestamp: new Date().toISOString(),
    };
  },

  async updateEmployee(id: string, updateData: Partial<Employee>): Promise<ApiResponse<Employee>> {
    const index = inMemoryEmployees.findIndex(e => e.id === id);
    if (index === -1) {
      throw new Error('Güncellenecek personel bulunamadı.');
    }

    const current = inMemoryEmployees[index];
    const updatedEmployee: Employee = {
      ...current,
      ...updateData,
      updatedAt: new Date().toISOString(),
    };

    inMemoryEmployees[index] = updatedEmployee;
    try {
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(inMemoryEmployees));
    } catch (e) {
      console.error(e);
    }

    return {
      success: true,
      data: updatedEmployee,
      message: `${updatedEmployee.firstName} ${updatedEmployee.lastName} bilgileri güncellendi.`,
      appliedBranchFilter: updatedEmployee.branchId,
      isConsolidatedReport: false,
      timestamp: new Date().toISOString(),
    };
  },

  async deleteEmployee(id: string): Promise<ApiResponse<boolean>> {
    const index = inMemoryEmployees.findIndex(e => e.id === id);
    if (index === -1) {
      throw new Error('Silinecek personel bulunamadı.');
    }

    const deletedName = `${inMemoryEmployees[index].firstName} ${inMemoryEmployees[index].lastName}`;
    inMemoryEmployees.splice(index, 1);
    try {
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(inMemoryEmployees));
    } catch (e) {
      console.error(e);
    }

    return {
      success: true,
      data: true,
      message: `${deletedName} isimli personel kaydı silindi.`,
      appliedBranchFilter: 'ALL',
      isConsolidatedReport: false,
      timestamp: new Date().toISOString(),
    };
  },

  // =========================================================================
  // 1. ÜRÜNLER YÖNETİMİ (PRODUCTS)
  // =========================================================================
  async getProducts(): Promise<ApiResponse<Product[]>> {
    return {
      success: true,
      data: [...inMemoryProducts],
      appliedBranchFilter: branchContext.getSelectedBranchId(),
      isConsolidatedReport: branchContext.getIsGlobalUser(),
      timestamp: new Date().toISOString(),
    };
  },

  async createProduct(productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> & { defaultWarehouseId?: string }): Promise<ApiResponse<Product>> {
    const id = `prod-${Date.now()}`;
    const purchasePrice = Number(productData.purchasePrice) || 0;
    const purchaseDiscountPercent = Number(productData.purchaseDiscountPercent) || 0;
    const netPurchaseCost = Number(productData.netPurchaseCost) || (purchasePrice * (1 - purchaseDiscountPercent / 100));
    
    let salePriceExclVat = Number(productData.salePriceExclVat) || 0;
    let profitMarginPercent = Number(productData.profitMarginPercent) || 0;
    if (profitMarginPercent > 0 && !salePriceExclVat) {
      salePriceExclVat = netPurchaseCost * (1 + profitMarginPercent / 100);
    } else if (salePriceExclVat > 0 && netPurchaseCost > 0 && profitMarginPercent === 0) {
      profitMarginPercent = ((salePriceExclVat - netPurchaseCost) / netPurchaseCost) * 100;
    }

    const vatRatePercent = productData.vatRatePercent !== undefined ? Number(productData.vatRatePercent) : 20.0;
    const salePriceInclVat = Number(productData.salePriceInclVat) || (salePriceExclVat * (1 + vatRatePercent / 100));

    const volumeM3 = Number(productData.volumeM3) || 0;
    const calculatedDesi = productData.calculatedDesi !== undefined && productData.calculatedDesi !== null
      ? Number(productData.calculatedDesi)
      : (volumeM3 > 0 ? Math.round(volumeM3 * 333.33 * 100) / 100 : 0);
    const openingStockQuantity = Number(productData.openingStockQuantity) || 0;

    const newProduct: Product = {
      ...productData,
      id,
      tenantId: CURRENT_TENANT.id,
      purchasePrice,
      purchaseDiscountPercent,
      netPurchaseCost: Math.round(netPurchaseCost * 10000) / 10000,
      profitMarginPercent: Math.round(profitMarginPercent * 100) / 100,
      salePriceExclVat: Math.round(salePriceExclVat * 10000) / 10000,
      vatRatePercent,
      salePriceInclVat: Math.round(salePriceInclVat * 10000) / 10000,
      volumeM3,
      calculatedDesi,
      openingStockQuantity,
      code: productData.skuCode,
      barcode: productData.barcodeEan13 || '',
      unit: productData.unitType,
      vatRate: vatRatePercent,
      salePrice: salePriceExclVat,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    inMemoryProducts.unshift(newProduct);
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(inMemoryProducts));
    } catch (e) {
      console.error(e);
    }

    // Tam Otomasyon: Açılış Stok Miktarı > 0 ise otomatik depo stoğu ve hareket oluştur
    if (openingStockQuantity > 0) {
      const targetWhId = productData.defaultWarehouseId || inMemoryWarehouses[0]?.id || 'wh-1';
      const targetWh = inMemoryWarehouses.find(w => w.id === targetWhId);

      // 1. Stok hareketi ekle
      const openMove: StockMovement = {
        id: `sm-open-${Date.now()}`,
        tenantId: CURRENT_TENANT.id,
        movementDate: new Date().toISOString(),
        productId: newProduct.id,
        productSku: newProduct.skuCode,
        productName: newProduct.name,
        warehouseId: targetWhId,
        warehouseName: targetWh ? targetWh.name : 'Depo',
        movementType: 'IN',
        quantity: openingStockQuantity,
        unitPrice: newProduct.netPurchaseCost || newProduct.purchasePrice,
        totalAmount: openingStockQuantity * (newProduct.netPurchaseCost || newProduct.purchasePrice),
        documentNumber: `ACILIS-${newProduct.skuCode}`,
        contactTitle: newProduct.supplierTitle || 'Açılış Envanter Kaydı',
        notes: 'Ürün kartı oluşturulurken girilen açılış stoku',
        createdAt: new Date().toISOString(),
      };
      inMemoryStockMovements.unshift(openMove);
      try {
        localStorage.setItem(STORAGE_KEYS.STOCK_MOVEMENTS, JSON.stringify(inMemoryStockMovements));
      } catch (e) {
        console.error(e);
      }

      // 2. Depo stok kaydını güncelle / ekle
      const existingStock = inMemoryWarehouseStocks.find(
        ws => ws.warehouseId === targetWhId && ws.productId === newProduct.id
      );
      if (existingStock) {
        existingStock.totalQuantity += openingStockQuantity;
        existingStock.totalCostValue = existingStock.totalQuantity * newProduct.netPurchaseCost;
        existingStock.totalCurrentValue = existingStock.totalQuantity * newProduct.salePriceExclVat;
      } else {
        inMemoryWarehouseStocks.push({
          id: `ws-${Date.now()}`,
          tenantId: CURRENT_TENANT.id,
          warehouseId: targetWhId,
          warehouseName: targetWh ? targetWh.name : 'Depo',
          productId: newProduct.id,
          productSku: newProduct.skuCode,
          productName: newProduct.name,
          unitType: newProduct.unitType,
          criticalStockLevel: Math.round(openingStockQuantity * 0.2), // %20 varsayılan kritik
          totalQuantity: openingStockQuantity,
          totalCostValue: openingStockQuantity * newProduct.netPurchaseCost,
          totalCurrentValue: openingStockQuantity * newProduct.salePriceExclVat,
        });
      }
      try {
        localStorage.setItem(STORAGE_KEYS.WAREHOUSE_STOCKS, JSON.stringify(inMemoryWarehouseStocks));
      } catch (e) {
        console.error(e);
      }
    }

    return {
      success: true,
      data: newProduct,
      message: `${newProduct.name} (${newProduct.skuCode}) başarıyla kaydedildi.`,
      appliedBranchFilter: null,
      isConsolidatedReport: false,
      timestamp: new Date().toISOString(),
    };
  },

  async updateProduct(id: string, updateData: Partial<Product>): Promise<ApiResponse<Product>> {
    const index = inMemoryProducts.findIndex(p => p.id === id);
    if (index === -1) {
      throw new Error('Güncellenecek ürün bulunamadı.');
    }

    const current = inMemoryProducts[index];
    const purchasePrice = updateData.purchasePrice !== undefined ? Number(updateData.purchasePrice) : current.purchasePrice;
    const purchaseDiscountPercent = updateData.purchaseDiscountPercent !== undefined ? Number(updateData.purchaseDiscountPercent) : current.purchaseDiscountPercent;
    const netPurchaseCost = updateData.netPurchaseCost !== undefined ? Number(updateData.netPurchaseCost) : (purchasePrice * (1 - purchaseDiscountPercent / 100));
    
    let salePriceExclVat = updateData.salePriceExclVat !== undefined ? Number(updateData.salePriceExclVat) : current.salePriceExclVat;
    let profitMarginPercent = updateData.profitMarginPercent !== undefined ? Number(updateData.profitMarginPercent) : current.profitMarginPercent;
    if (profitMarginPercent > 0 && updateData.salePriceExclVat === undefined) {
      salePriceExclVat = netPurchaseCost * (1 + profitMarginPercent / 100);
    } else if (salePriceExclVat > 0 && netPurchaseCost > 0) {
      profitMarginPercent = ((salePriceExclVat - netPurchaseCost) / netPurchaseCost) * 100;
    }

    const vatRatePercent = updateData.vatRatePercent !== undefined ? Number(updateData.vatRatePercent) : current.vatRatePercent;
    const salePriceInclVat = salePriceExclVat * (1 + vatRatePercent / 100);

    const volumeM3 = updateData.volumeM3 !== undefined ? Number(updateData.volumeM3) : (current.volumeM3 || 0);
    const calculatedDesi = updateData.calculatedDesi !== undefined ? Number(updateData.calculatedDesi) : (volumeM3 > 0 ? Math.round(volumeM3 * 333.33 * 100) / 100 : 0);

    const updatedProduct: Product = {
      ...current,
      ...updateData,
      purchasePrice,
      purchaseDiscountPercent,
      netPurchaseCost: Math.round(netPurchaseCost * 10000) / 10000,
      profitMarginPercent: Math.round(profitMarginPercent * 100) / 100,
      salePriceExclVat: Math.round(salePriceExclVat * 10000) / 10000,
      vatRatePercent,
      salePriceInclVat: Math.round(salePriceInclVat * 10000) / 10000,
      volumeM3,
      calculatedDesi,
      code: updateData.skuCode || current.skuCode,
      barcode: updateData.barcodeEan13 || current.barcodeEan13 || '',
      unit: updateData.unitType || current.unitType,
      updatedAt: new Date().toISOString(),
    };

    inMemoryProducts[index] = updatedProduct;
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(inMemoryProducts));
    } catch (e) {
      console.error(e);
    }

    // Depo stoklarındaki değerleri de yeniden hesapla
    inMemoryWarehouseStocks.forEach(ws => {
      if (ws.productId === id) {
        ws.productSku = updatedProduct.skuCode;
        ws.productName = updatedProduct.name;
        ws.unitType = updatedProduct.unitType;
        ws.totalCostValue = ws.totalQuantity * updatedProduct.netPurchaseCost;
        ws.totalCurrentValue = ws.totalQuantity * updatedProduct.salePriceExclVat;
      }
    });
    try {
      localStorage.setItem(STORAGE_KEYS.WAREHOUSE_STOCKS, JSON.stringify(inMemoryWarehouseStocks));
    } catch (e) {
      console.error(e);
    }

    return {
      success: true,
      data: updatedProduct,
      message: `${updatedProduct.name} ürün bilgileri güncellendi.`,
      appliedBranchFilter: null,
      isConsolidatedReport: false,
      timestamp: new Date().toISOString(),
    };
  },

  async deleteProduct(id: string): Promise<ApiResponse<boolean>> {
    const index = inMemoryProducts.findIndex(p => p.id === id);
    if (index === -1) {
      throw new Error('Silinecek ürün bulunamadı.');
    }
    const name = inMemoryProducts[index].name;
    inMemoryProducts.splice(index, 1);
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(inMemoryProducts));
    } catch (e) {
      console.error(e);
    }

    // İlgili depo stoklarını temizle
    inMemoryWarehouseStocks = inMemoryWarehouseStocks.filter(ws => ws.productId !== id);
    try {
      localStorage.setItem(STORAGE_KEYS.WAREHOUSE_STOCKS, JSON.stringify(inMemoryWarehouseStocks));
    } catch (e) {
      console.error(e);
    }

    return {
      success: true,
      data: true,
      message: `${name} isimli ürün silindi.`,
      appliedBranchFilter: null,
      isConsolidatedReport: false,
      timestamp: new Date().toISOString(),
    };
  },

  // =========================================================================
  // 2. DEPOLAR YÖNETİMİ (WAREHOUSES)
  // =========================================================================
  async getWarehouses(): Promise<ApiResponse<Warehouse[]>> {
    const selectedBranch = branchContext.getSelectedBranchId();
    const filtered = selectedBranch === 'all'
      ? inMemoryWarehouses
      : inMemoryWarehouses.filter((warehouse) => getWarehouseBranchId(warehouse) === selectedBranch);

    return {
      success: true,
      data: filtered.map((warehouse) => ({
        ...warehouse,
        branchId: getWarehouseBranchId(warehouse),
      })),
      appliedBranchFilter: selectedBranch,
      isConsolidatedReport: selectedBranch === 'all',
      timestamp: new Date().toISOString(),
    };
  },

  async createWarehouse(whData: Omit<Warehouse, 'id' | 'createdAt'>): Promise<ApiResponse<Warehouse>> {
    const id = `wh-${Date.now()}`;
    const selectedBranch = branchContext.getSelectedBranchId();
    const newWh: Warehouse = {
      ...whData,
      id,
      tenantId: CURRENT_TENANT.id,
      branchId: whData.branchId || (selectedBranch === 'all' ? inMemoryBranches[0]?.id : selectedBranch),
      createdAt: new Date().toISOString(),
    };

    inMemoryWarehouses.push(newWh);
    try {
      localStorage.setItem(STORAGE_KEYS.WAREHOUSES, JSON.stringify(inMemoryWarehouses));
    } catch (e) {
      console.error(e);
    }

    return {
      success: true,
      data: newWh,
      message: `${newWh.name} (${newWh.warehouseCode}) deposu açıldı.`,
      appliedBranchFilter: null,
      isConsolidatedReport: false,
      timestamp: new Date().toISOString(),
    };
  },

  async updateWarehouse(id: string, updateData: Partial<Warehouse>): Promise<ApiResponse<Warehouse>> {
    const index = inMemoryWarehouses.findIndex(w => w.id === id);
    if (index === -1) {
      throw new Error('Güncellenecek depo bulunamadı.');
    }

    const updatedWh = {
      ...inMemoryWarehouses[index],
      ...updateData,
    };
    inMemoryWarehouses[index] = updatedWh;
    try {
      localStorage.setItem(STORAGE_KEYS.WAREHOUSES, JSON.stringify(inMemoryWarehouses));
    } catch (e) {
      console.error(e);
    }

    // Depo adını stok kayıtlarında senkronize et
    inMemoryWarehouseStocks.forEach(ws => {
      if (ws.warehouseId === id) {
        ws.warehouseName = updatedWh.name;
      }
    });
    try {
      localStorage.setItem(STORAGE_KEYS.WAREHOUSE_STOCKS, JSON.stringify(inMemoryWarehouseStocks));
    } catch (e) {
      console.error(e);
    }

    return {
      success: true,
      data: updatedWh,
      message: `${updatedWh.name} depo bilgileri güncellendi.`,
      appliedBranchFilter: null,
      isConsolidatedReport: false,
      timestamp: new Date().toISOString(),
    };
  },

  async deleteWarehouse(id: string): Promise<ApiResponse<boolean>> {
    const index = inMemoryWarehouses.findIndex(w => w.id === id);
    if (index === -1) {
      throw new Error('Silinecek depo bulunamadı.');
    }

    // Depoda mevcut stok var mı kontrol et
    const hasActiveStock = inMemoryWarehouseStocks.some(ws => ws.warehouseId === id && ws.totalQuantity > 0);
    if (hasActiveStock) {
      throw new Error('Bu depoda aktif stok bulunmaktadır. Depoyu silmeden önce stokları başka bir depoya transfer ediniz.');
    }

    const name = inMemoryWarehouses[index].name;
    inMemoryWarehouses.splice(index, 1);
    try {
      localStorage.setItem(STORAGE_KEYS.WAREHOUSES, JSON.stringify(inMemoryWarehouses));
    } catch (e) {
      console.error(e);
    }

    inMemoryWarehouseStocks = inMemoryWarehouseStocks.filter(ws => ws.warehouseId !== id);
    try {
      localStorage.setItem(STORAGE_KEYS.WAREHOUSE_STOCKS, JSON.stringify(inMemoryWarehouseStocks));
    } catch (e) {
      console.error(e);
    }

    return {
      success: true,
      data: true,
      message: `${name} deposu sistemden kaldırıldı.`,
      appliedBranchFilter: null,
      isConsolidatedReport: false,
      timestamp: new Date().toISOString(),
    };
  },

  // =========================================================================
  // 3. STOK HAREKETLERİ & GİRİŞ / ÇIKIŞ GÜNLÜĞÜ (STOCK MOVEMENTS)
  // =========================================================================
  async getStockMovements(): Promise<ApiResponse<StockMovement[]>> {
    const selectedBranch = branchContext.getSelectedBranchId();
    const visibleWarehouseIds = selectedBranch === 'all'
      ? null
      : new Set(
          inMemoryWarehouses
            .filter((warehouse) => getWarehouseBranchId(warehouse) === selectedBranch)
            .map((warehouse) => warehouse.id),
        );
    const filtered = visibleWarehouseIds
      ? inMemoryStockMovements.filter((movement) => visibleWarehouseIds.has(movement.warehouseId))
      : inMemoryStockMovements;

    return {
      success: true,
      data: [...filtered],
      appliedBranchFilter: selectedBranch,
      isConsolidatedReport: selectedBranch === 'all',
      timestamp: new Date().toISOString(),
    };
  },

  async createStockMovement(movementData: Omit<StockMovement, 'id' | 'createdAt' | 'tenantId'> & { tenantId?: string }): Promise<ApiResponse<StockMovement>> {
    const id = `sm-${Date.now()}`;
    const product = inMemoryProducts.find(p => p.id === movementData.productId);
    const warehouse = inMemoryWarehouses.find(w => w.id === movementData.warehouseId);
    const selectedBranch = branchContext.getSelectedBranchId();
    if (warehouse && selectedBranch !== 'all' && getWarehouseBranchId(warehouse) !== selectedBranch) {
      throw new Error('Seçili şubeye ait olmayan depoya stok hareketi eklenemez.');
    }

    const quantity = Number(movementData.quantity) || 0;
    const unitPrice = Number(movementData.unitPrice) || (product ? product.netPurchaseCost : 0);
    const totalAmount = Number(movementData.totalAmount) || (quantity * unitPrice);

    const newMovement: StockMovement = {
      ...movementData,
      id,
      tenantId: CURRENT_TENANT.id,
      productSku: product ? product.skuCode : (movementData.productSku || ''),
      productName: product ? product.name : (movementData.productName || ''),
      warehouseName: warehouse ? warehouse.name : (movementData.warehouseName || ''),
      quantity,
      unitPrice,
      totalAmount,
      movementDate: movementData.movementDate || new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    inMemoryStockMovements.unshift(newMovement);
    try {
      localStorage.setItem(STORAGE_KEYS.STOCK_MOVEMENTS, JSON.stringify(inMemoryStockMovements));
    } catch (e) {
      console.error(e);
    }

    // Tam Otomasyon: Depo Bazında Stok Dağılımını anında güncelle
    let wsRecord = inMemoryWarehouseStocks.find(
      ws => ws.warehouseId === movementData.warehouseId && ws.productId === movementData.productId
    );

    if (!wsRecord) {
      wsRecord = {
        id: `ws-${Date.now()}`,
        tenantId: CURRENT_TENANT.id,
        warehouseId: movementData.warehouseId,
        warehouseName: warehouse ? warehouse.name : '',
        productId: movementData.productId,
        productSku: product ? product.skuCode : '',
        productName: product ? product.name : '',
        unitType: product ? product.unitType : 'Adet',
        criticalStockLevel: 20.0,
        totalQuantity: 0,
        totalCostValue: 0,
        totalCurrentValue: 0,
      };
      inMemoryWarehouseStocks.push(wsRecord);
    }

    if (movementData.movementType === 'IN' || movementData.movementType === 'TRANSFER_IN') {
      wsRecord.totalQuantity += quantity;
    } else if (movementData.movementType === 'OUT' || movementData.movementType === 'TRANSFER_OUT') {
      wsRecord.totalQuantity = Math.max(0, wsRecord.totalQuantity - quantity);
    }

    const netCost = product ? product.netPurchaseCost : unitPrice;
    const saleVal = product ? product.salePriceExclVat : (unitPrice * 1.3);
    wsRecord.totalCostValue = wsRecord.totalQuantity * netCost;
    wsRecord.totalCurrentValue = wsRecord.totalQuantity * saleVal;

    try {
      localStorage.setItem(STORAGE_KEYS.WAREHOUSE_STOCKS, JSON.stringify(inMemoryWarehouseStocks));
    } catch (e) {
      console.error(e);
    }

    return {
      success: true,
      data: newMovement,
      message: `Stok hareketi başarıyla işlendi (${newMovement.movementType} ${newMovement.quantity} ${product?.unitType || 'Adet'}).`,
      appliedBranchFilter: null,
      isConsolidatedReport: false,
      timestamp: new Date().toISOString(),
    };
  },

  // İki Depo Arası Otomatik Transfer
  async transferBetweenWarehouses(
    sourceWhId: string,
    targetWhId: string,
    productId: string,
    quantity: number,
    unitPrice: number,
    documentNumber: string,
    contactTitle?: string,
    notes?: string
  ): Promise<ApiResponse<{ outMovement: StockMovement; inMovement: StockMovement }>> {
    if (sourceWhId === targetWhId) {
      throw new Error('Kaynak ve hedef depo aynı olamaz.');
    }
    const product = inMemoryProducts.find(p => p.id === productId);
    const sourceWh = inMemoryWarehouses.find(w => w.id === sourceWhId);
    const targetWh = inMemoryWarehouses.find(w => w.id === targetWhId);

    if (!product || !sourceWh || !targetWh) {
      throw new Error('Ürün veya depolar sistemde bulunamadı.');
    }

    const selectedBranch = branchContext.getSelectedBranchId();
    if (selectedBranch !== 'all' && (
      getWarehouseBranchId(sourceWh) !== selectedBranch ||
      getWarehouseBranchId(targetWh) !== selectedBranch
    )) {
      throw new Error('Seçili şubeye ait olmayan depolar arasında transfer yapılamaz.');
    }

    const sourceStock = inMemoryWarehouseStocks.find(
      ws => ws.warehouseId === sourceWhId && ws.productId === productId
    );
    if (!sourceStock || sourceStock.totalQuantity < quantity) {
      throw new Error(`Kaynak depoda (${sourceWh.name}) yeterli stok bulunmuyor. Mevcut Stok: ${sourceStock?.totalQuantity || 0}`);
    }

    const effectiveUnitPrice = unitPrice > 0 ? unitPrice : product.netPurchaseCost;
    const totalAmount = quantity * effectiveUnitPrice;
    const now = new Date().toISOString();

    // 1. Kaynaktan Çıkış Hareketi
    const outMovement: StockMovement = {
      id: `sm-trf-out-${Date.now()}`,
      tenantId: CURRENT_TENANT.id,
      movementDate: now,
      productId: product.id,
      productSku: product.skuCode,
      productName: product.name,
      warehouseId: sourceWh.id,
      warehouseName: sourceWh.name,
      movementType: 'TRANSFER_OUT',
      quantity,
      unitPrice: effectiveUnitPrice,
      totalAmount,
      documentNumber: documentNumber || `TRF-${Date.now().toString().slice(-6)}`,
      contactTitle: contactTitle || `Transfer: -> ${targetWh.name}`,
      notes: notes || `Depolar arası transfer çıkışı`,
      createdAt: now,
    };

    // 2. Hedefe Giriş Hareketi
    const inMovement: StockMovement = {
      id: `sm-trf-in-${Date.now() + 1}`,
      tenantId: CURRENT_TENANT.id,
      movementDate: now,
      productId: product.id,
      productSku: product.skuCode,
      productName: product.name,
      warehouseId: targetWh.id,
      warehouseName: targetWh.name,
      movementType: 'TRANSFER_IN',
      quantity,
      unitPrice: effectiveUnitPrice,
      totalAmount,
      documentNumber: outMovement.documentNumber,
      contactTitle: contactTitle || `Transfer: <- ${sourceWh.name}`,
      notes: notes || `Depolar arası transfer girişi`,
      createdAt: now,
    };

    inMemoryStockMovements.unshift(inMovement, outMovement);
    try {
      localStorage.setItem(STORAGE_KEYS.STOCK_MOVEMENTS, JSON.stringify(inMemoryStockMovements));
    } catch (e) {
      console.error(e);
    }

    // 3. Stok miktarlarını güncelle
    sourceStock.totalQuantity = Math.max(0, sourceStock.totalQuantity - quantity);
    sourceStock.totalCostValue = sourceStock.totalQuantity * product.netPurchaseCost;
    sourceStock.totalCurrentValue = sourceStock.totalQuantity * product.salePriceExclVat;

    let targetStock = inMemoryWarehouseStocks.find(
      ws => ws.warehouseId === targetWhId && ws.productId === productId
    );
    if (!targetStock) {
      targetStock = {
        id: `ws-${Date.now() + 2}`,
        tenantId: CURRENT_TENANT.id,
        warehouseId: targetWh.id,
        warehouseName: targetWh.name,
        productId: product.id,
        productSku: product.skuCode,
        productName: product.name,
        unitType: product.unitType,
        criticalStockLevel: 15.0,
        totalQuantity: 0,
        totalCostValue: 0,
        totalCurrentValue: 0,
      };
      inMemoryWarehouseStocks.push(targetStock);
    }
    targetStock.totalQuantity += quantity;
    targetStock.totalCostValue = targetStock.totalQuantity * product.netPurchaseCost;
    targetStock.totalCurrentValue = targetStock.totalQuantity * product.salePriceExclVat;

    try {
      localStorage.setItem(STORAGE_KEYS.WAREHOUSE_STOCKS, JSON.stringify(inMemoryWarehouseStocks));
    } catch (e) {
      console.error(e);
    }

    return {
      success: true,
      data: { outMovement, inMovement },
      message: `${quantity} ${product.unitType} ${product.name}, ${sourceWh.name} deposundan ${targetWh.name} deposuna başarıyla transfer edildi.`,
      appliedBranchFilter: null,
      isConsolidatedReport: false,
      timestamp: new Date().toISOString(),
    };
  },

  // =========================================================================
  // 4. DEPO BAZINDA STOK DAĞILIMI (WAREHOUSE STOCKS)
  // =========================================================================
  async getWarehouseStocks(): Promise<ApiResponse<WarehouseStock[]>> {
    const selectedBranch = branchContext.getSelectedBranchId();
    const visibleWarehouseIds = selectedBranch === 'all'
      ? null
      : new Set(
          inMemoryWarehouses
            .filter((warehouse) => getWarehouseBranchId(warehouse) === selectedBranch)
            .map((warehouse) => warehouse.id),
        );
    const filtered = visibleWarehouseIds
      ? inMemoryWarehouseStocks.filter((stock) => visibleWarehouseIds.has(stock.warehouseId))
      : inMemoryWarehouseStocks;

    return {
      success: true,
      data: [...filtered],
      appliedBranchFilter: selectedBranch,
      isConsolidatedReport: selectedBranch === 'all',
      timestamp: new Date().toISOString(),
    };
  },

  async updateWarehouseStockCriticalLevel(id: string, criticalStockLevel: number): Promise<ApiResponse<WarehouseStock>> {
    const index = inMemoryWarehouseStocks.findIndex(ws => ws.id === id);
    if (index === -1) {
      throw new Error('Stok kartı bulunamadı.');
    }

    inMemoryWarehouseStocks[index].criticalStockLevel = Number(criticalStockLevel) || 0;
    try {
      localStorage.setItem(STORAGE_KEYS.WAREHOUSE_STOCKS, JSON.stringify(inMemoryWarehouseStocks));
    } catch (e) {
      console.error(e);
    }

    return {
      success: true,
      data: inMemoryWarehouseStocks[index],
      message: `Kritik stok seviyesi ${criticalStockLevel} olarak güncellendi.`,
      appliedBranchFilter: null,
      isConsolidatedReport: false,
      timestamp: new Date().toISOString(),
    };
  },

  // =========================================================================
  // 5. KARGO FİYAT BAREMLERİ & HESAPLAMA (SHIPPING RATES)
  // =========================================================================
  async getShippingRates(): Promise<ApiResponse<ShippingRate[]>> {
    return {
      success: true,
      data: [...inMemoryShippingRates],
      appliedBranchFilter: null,
      isConsolidatedReport: false,
      timestamp: new Date().toISOString(),
    };
  },

  calculateShippingCost(companyName: string, desi: number): {
    companyName: string;
    rateTitle: string;
    desi: number;
    basePrice: number;
    extraPrice: number;
    totalPrice: number;
    currency: string;
    matched: boolean;
  } {
    const activeRates = inMemoryShippingRates.filter(
      r => r.shippingCompanyName.toLowerCase() === companyName.toLowerCase() && r.isActive
    );

    const safeDesi = Math.max(0.1, desi);
    // Bareme uyan kuralı bul
    const matchedRate = activeRates.find(r => safeDesi >= r.minDesi && safeDesi <= r.maxDesi);

    if (matchedRate) {
      return {
        companyName: matchedRate.shippingCompanyName,
        rateTitle: matchedRate.rateTitle,
        desi: safeDesi,
        basePrice: matchedRate.fixedPrice,
        extraPrice: 0,
        totalPrice: matchedRate.fixedPrice,
        currency: matchedRate.currency,
        matched: true,
      };
    }

    // Eğer üst limit aşılmışsa en yüksek baremi bul ve fark desi ücreti ekle
    if (activeRates.length > 0) {
      const highestRate = [...activeRates].sort((a, b) => b.maxDesi - a.maxDesi)[0];
      const extraDesi = Math.max(0, safeDesi - highestRate.maxDesi);
      const extraFee = extraDesi * highestRate.extraPerDesiPrice;
      const total = highestRate.fixedPrice + extraFee;
      return {
        companyName: highestRate.shippingCompanyName,
        rateTitle: `${highestRate.rateTitle} (Ek Desi Aşımı)`,
        desi: safeDesi,
        basePrice: highestRate.fixedPrice,
        extraPrice: Math.round(extraFee * 100) / 100,
        totalPrice: Math.round(total * 100) / 100,
        currency: highestRate.currency,
        matched: true,
      };
    }

    // Varsayılan hesap
    return {
      companyName,
      rateTitle: 'Standart Baremsiz Hesap',
      desi: safeDesi,
      basePrice: 100.0,
      extraPrice: 0,
      totalPrice: 100.0 + (safeDesi * 12.5),
      currency: 'TRY',
      matched: false,
    };
  },

  // =========================================================================
  // 6. ÖDEME & TAHSİLAT YÖNETİMİ (PAYMENT & COLLECTION MOVEMENTS)
  // =========================================================================
  async getPaymentMovements(branchId?: string, isGlobalOverride?: boolean): Promise<ApiResponse<PaymentMovement[]>> {
    const selectedBranch = branchId !== undefined ? branchId : branchContext.getSelectedBranchId();
    const isConsolidated = selectedBranch === 'all' || !selectedBranch;

    let filtered = [...inMemoryPaymentMovements];
    if (!isConsolidated) {
      filtered = filtered.filter(m => m.branchId === selectedBranch);
    }

    // Tarihe göre yeniden eskiye sırala
    filtered.sort((a, b) => new Date(b.movementDate).getTime() - new Date(a.movementDate).getTime());

    return {
      success: true,
      data: filtered,
      appliedBranchFilter: isConsolidated ? 'TÜM ŞUBELER (KONSOLİDE)' : selectedBranch,
      isConsolidatedReport: isConsolidated,
      timestamp: new Date().toISOString(),
    };
  },

  async createPaymentMovement(
    payload: Omit<PaymentMovement, 'id' | 'createdAt' | 'tenantId'>
  ): Promise<ApiResponse<PaymentMovement>> {
    let branchId = payload.branchId || branchContext.getSelectedBranchId();
    if (!branchId || branchId === 'all') {
      // Eğer Kasa/Banka seçilmişse onun bağlı olduğu şubeyi al, yoksa ilk şubeyi al
      const selectedCashBank = inMemoryCashBanks.find(cb => cb.id === payload.cashBankId);
      branchId = selectedCashBank?.branchId || inMemoryBranches[0]?.id || BRANCHES[0].id;
    }
    const branch = inMemoryBranches.find(b => b.id === branchId);

    const count = inMemoryPaymentMovements.length + 1;
    let docPrefix = 'THS';
    if (payload.movementType === 'ODEME') docPrefix = 'ODM';
    else if (payload.movementType === 'MASRAF') docPrefix = 'MAS';
    else if (payload.movementType === 'VIRMAN') docPrefix = 'VRM';

    const documentNumber = payload.documentNumber || `${docPrefix}-2026-${String(count).padStart(5, '0')}`;
    const receiptNumber = payload.receiptNumber || `MK-${new Date().getFullYear()}/${String(1000 + count)}`;

    const newMovement: PaymentMovement = {
      ...payload,
      id: `pm-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tenantId: CURRENT_TENANT.id,
      branchId,
      branchName: branch?.name || 'Şube',
      documentNumber,
      receiptNumber,
      createdAt: new Date().toISOString(),
      createdByUser: payload.createdByUser || 'aktif.muhasebe@fx.com.tr',
    };

    inMemoryPaymentMovements = [newMovement, ...inMemoryPaymentMovements];

    // 1. Kasa / Banka Bakiyesini Güncelle
    const cashBankIndex = inMemoryCashBanks.findIndex(cb => cb.id === payload.cashBankId);
    if (cashBankIndex !== -1) {
      const currentAcc = inMemoryCashBanks[cashBankIndex];
      let newBalance = currentAcc.balance;
      if (payload.movementType === 'TAHSILAT') {
        newBalance += Number(payload.amount);
      } else if (payload.movementType === 'ODEME' || payload.movementType === 'MASRAF') {
        newBalance -= Number(payload.amount);
      }
      inMemoryCashBanks[cashBankIndex] = {
        ...currentAcc,
        balance: Math.round(newBalance * 100) / 100,
      };

      try {
        localStorage.setItem(STORAGE_KEYS.CASH_BANKS, JSON.stringify(inMemoryCashBanks));
      } catch (e) {
        console.error(e);
      }
    }

    // 2. Cari Bakiye Güncellemesi (Eğer Cari seçildiyse)
    if (payload.contactId) {
      const contactIndex = inMemoryContacts.findIndex(c => c.id === payload.contactId);
      if (contactIndex !== -1) {
        const contact = inMemoryContacts[contactIndex];
        let newCurrentBal = contact.currentBalance || 0;
        // Tahsilat: Cari borcunu öder, cari bakiyesi düşer (alacak kaydı)
        // Ödeme: Biz cariye öderiz, cari bakiyesi artar (veya borcumuz azalır)
        if (payload.movementType === 'TAHSILAT') {
          newCurrentBal -= Number(payload.amount);
        } else if (payload.movementType === 'ODEME') {
          newCurrentBal += Number(payload.amount);
        }
        inMemoryContacts[contactIndex] = {
          ...contact,
          currentBalance: Math.round(newCurrentBal * 100) / 100,
          updatedAt: new Date().toISOString(),
        };

        try {
          localStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(inMemoryContacts));
        } catch (e) {
          console.error(e);
        }
      }
    }

    // LocalStorage kaydet
    try {
      localStorage.setItem(STORAGE_KEYS.PAYMENT_MOVEMENTS, JSON.stringify(inMemoryPaymentMovements));
    } catch (e) {
      console.error(e);
    }

    return {
      success: true,
      data: newMovement,
      message: `${newMovement.documentNumber} numaralı ${newMovement.movementType === 'TAHSILAT' ? 'Tahsilat' : newMovement.movementType === 'ODEME' ? 'Ödeme' : 'Masraf'} hareketi başarıyla kaydedildi.`,
      appliedBranchFilter: branchId,
      isConsolidatedReport: false,
      timestamp: new Date().toISOString(),
    };
  },

  async updatePaymentMovement(id: string, updates: Partial<PaymentMovement>): Promise<ApiResponse<PaymentMovement>> {
    const index = inMemoryPaymentMovements.findIndex(m => m.id === id);
    if (index === -1) {
      throw new Error('Ödeme/Tahsilat hareketi bulunamadı.');
    }

    inMemoryPaymentMovements[index] = {
      ...inMemoryPaymentMovements[index],
      ...updates,
    };

    try {
      localStorage.setItem(STORAGE_KEYS.PAYMENT_MOVEMENTS, JSON.stringify(inMemoryPaymentMovements));
    } catch (e) {
      console.error(e);
    }

    return {
      success: true,
      data: inMemoryPaymentMovements[index],
      message: 'İşlem kaydı güncellendi.',
      appliedBranchFilter: inMemoryPaymentMovements[index].branchId,
      isConsolidatedReport: false,
      timestamp: new Date().toISOString(),
    };
  },

  async deletePaymentMovement(id: string): Promise<ApiResponse<boolean>> {
    const item = inMemoryPaymentMovements.find(m => m.id === id);
    if (!item) {
      throw new Error('Silinecek işlem kaydı bulunamadı.');
    }

    // Bakiye Geri Alma (Rollback)
    const cashBankIndex = inMemoryCashBanks.findIndex(cb => cb.id === item.cashBankId);
    if (cashBankIndex !== -1) {
      const currentAcc = inMemoryCashBanks[cashBankIndex];
      let newBalance = currentAcc.balance;
      if (item.movementType === 'TAHSILAT') {
        newBalance -= Number(item.amount);
      } else if (item.movementType === 'ODEME' || item.movementType === 'MASRAF') {
        newBalance += Number(item.amount);
      }
      inMemoryCashBanks[cashBankIndex] = {
        ...currentAcc,
        balance: Math.round(newBalance * 100) / 100,
      };
      try {
        localStorage.setItem(STORAGE_KEYS.CASH_BANKS, JSON.stringify(inMemoryCashBanks));
      } catch (e) {
        console.error(e);
      }
    }

    // Cari Bakiye Geri Alma
    if (item.contactId) {
      const contactIndex = inMemoryContacts.findIndex(c => c.id === item.contactId);
      if (contactIndex !== -1) {
        const contact = inMemoryContacts[contactIndex];
        let newCurrentBal = contact.currentBalance || 0;
        if (item.movementType === 'TAHSILAT') {
          newCurrentBal += Number(item.amount);
        } else if (item.movementType === 'ODEME') {
          newCurrentBal -= Number(item.amount);
        }
        inMemoryContacts[contactIndex] = {
          ...contact,
          currentBalance: Math.round(newCurrentBal * 100) / 100,
          updatedAt: new Date().toISOString(),
        };
        try {
          localStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(inMemoryContacts));
        } catch (e) {
          console.error(e);
        }
      }
    }

    inMemoryPaymentMovements = inMemoryPaymentMovements.filter(m => m.id !== id);

    try {
      localStorage.setItem(STORAGE_KEYS.PAYMENT_MOVEMENTS, JSON.stringify(inMemoryPaymentMovements));
    } catch (e) {
      console.error(e);
    }

    return {
      success: true,
      data: true,
      message: `${item.documentNumber} numaralı hareket silindi ve bakiyeler dengelendi.`,
      appliedBranchFilter: item.branchId,
      isConsolidatedReport: false,
      timestamp: new Date().toISOString(),
    };
  },

  // =========================================================================
  // 7. GELİRLER & GİDERLER YÖNETİMİ (REVENUE & EXPENSE MANAGEMENT)
  // =========================================================================
  async getRevenueExpenses(branchId?: string, isGlobalOverride?: boolean): Promise<ApiResponse<RevenueExpenseItem[]>> {
    const selectedBranch = branchId !== undefined ? branchId : branchContext.getSelectedBranchId();
    const isConsolidated = selectedBranch === 'all' || !selectedBranch;

    let filtered = [...inMemoryRevenueExpenses];
    if (!isConsolidated) {
      filtered = filtered.filter(item => item.branchId === selectedBranch);
    }

    // Tarihe göre yeniden eskiye doğru sırala
    filtered.sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());

    return {
      success: true,
      data: filtered,
      appliedBranchFilter: isConsolidated ? 'TÜM ŞUBELER (KONSOLİDE)' : selectedBranch,
      isConsolidatedReport: isConsolidated,
      timestamp: new Date().toISOString(),
    };
  },

  async createRevenueExpense(
    payload: Omit<RevenueExpenseItem, 'id' | 'createdAt' | 'tenantId'>
  ): Promise<ApiResponse<RevenueExpenseItem>> {
    let branchId = payload.branchId || branchContext.getSelectedBranchId();
    if (!branchId || branchId === 'all') {
      const selectedCashBank = inMemoryCashBanks.find(cb => cb.id === payload.cashBankId);
      branchId = selectedCashBank?.branchId || inMemoryBranches[0]?.id || BRANCHES[0].id;
    }
    const branch = inMemoryBranches.find(b => b.id === branchId);

    const prefix = payload.type === 'GELIR' ? 'GLR' : 'GDR';
    const count = inMemoryRevenueExpenses.filter(i => i.type === payload.type).length + 1;
    const itemCode = payload.itemCode || `${prefix}-2026-${String(count).padStart(5, '0')}`;
    const documentNumber = payload.documentNumber || `GIB${new Date().getFullYear()}${String(count + 100).padStart(8, '0')}`;

    const newItem: RevenueExpenseItem = {
      ...payload,
      id: `re-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tenantId: CURRENT_TENANT.id,
      branchId,
      branchName: branch?.name || 'Şube',
      itemCode,
      documentNumber,
      createdAt: new Date().toISOString(),
      createdByUser: payload.createdByUser || 'muhasebe@fx.com.tr',
    };

    inMemoryRevenueExpenses = [newItem, ...inMemoryRevenueExpenses];
    adjustRevenueExpenseEffects(newItem, 1);
    const newMovement = buildRevenueExpenseMovement(newItem);
    if (newMovement) inMemoryPaymentMovements = [newMovement, ...inMemoryPaymentMovements];

    // LocalStorage kaydet
    try {
      localStorage.setItem(STORAGE_KEYS.REVENUE_EXPENSES, JSON.stringify(inMemoryRevenueExpenses));
      localStorage.setItem(STORAGE_KEYS.CASH_BANKS, JSON.stringify(inMemoryCashBanks));
      localStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(inMemoryContacts));
      localStorage.setItem(STORAGE_KEYS.PAYMENT_MOVEMENTS, JSON.stringify(inMemoryPaymentMovements));
    } catch (e) {
      console.error(e);
    }

    return {
      success: true,
      data: newItem,
      message: `${newItem.itemCode} numaralı ${newItem.type === 'GELIR' ? 'Gelir' : 'Gider'} kaydı başarıyla oluşturuldu.`,
      appliedBranchFilter: branchId,
      isConsolidatedReport: false,
      timestamp: new Date().toISOString(),
    };
  },

  async updateRevenueExpense(id: string, updates: Partial<RevenueExpenseItem>): Promise<ApiResponse<RevenueExpenseItem>> {
    const index = inMemoryRevenueExpenses.findIndex(item => item.id === id);
    if (index === -1) {
      throw new Error('Gelir/Gider kaydı bulunamadı.');
    }

    const previousItem = inMemoryRevenueExpenses[index];
    adjustRevenueExpenseEffects(previousItem, -1);
    inMemoryPaymentMovements = inMemoryPaymentMovements.filter((movement) => movement.id !== `pm-re-${id}`);

    const updatedItem = {
      ...inMemoryRevenueExpenses[index],
      ...updates,
    };
    inMemoryRevenueExpenses[index] = updatedItem;
    adjustRevenueExpenseEffects(updatedItem, 1);
    const updatedMovement = buildRevenueExpenseMovement(updatedItem);
    if (updatedMovement) inMemoryPaymentMovements = [updatedMovement, ...inMemoryPaymentMovements];

    try {
      localStorage.setItem(STORAGE_KEYS.REVENUE_EXPENSES, JSON.stringify(inMemoryRevenueExpenses));
      localStorage.setItem(STORAGE_KEYS.CASH_BANKS, JSON.stringify(inMemoryCashBanks));
      localStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(inMemoryContacts));
      localStorage.setItem(STORAGE_KEYS.PAYMENT_MOVEMENTS, JSON.stringify(inMemoryPaymentMovements));
    } catch (e) {
      console.error(e);
    }

    return {
      success: true,
      data: updatedItem,
      message: 'Gelir/Gider kaydı güncellendi.',
      appliedBranchFilter: inMemoryRevenueExpenses[index].branchId,
      isConsolidatedReport: false,
      timestamp: new Date().toISOString(),
    };
  },

  async deleteRevenueExpense(id: string): Promise<ApiResponse<boolean>> {
    const item = inMemoryRevenueExpenses.find(i => i.id === id);
    if (!item) {
      throw new Error('Silinecek gelir/gider kaydı bulunamadı.');
    }

    adjustRevenueExpenseEffects(item, -1);
    inMemoryPaymentMovements = inMemoryPaymentMovements.filter((movement) => movement.id !== `pm-re-${id}`);

    inMemoryRevenueExpenses = inMemoryRevenueExpenses.filter(i => i.id !== id);

    try {
      localStorage.setItem(STORAGE_KEYS.REVENUE_EXPENSES, JSON.stringify(inMemoryRevenueExpenses));
      localStorage.setItem(STORAGE_KEYS.CASH_BANKS, JSON.stringify(inMemoryCashBanks));
      localStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(inMemoryContacts));
      localStorage.setItem(STORAGE_KEYS.PAYMENT_MOVEMENTS, JSON.stringify(inMemoryPaymentMovements));
    } catch (e) {
      console.error(e);
    }

    return {
      success: true,
      data: true,
      message: `${item.itemCode} numaralı işlem silindi ve bakiyeler dengelendi.`,
      appliedBranchFilter: item.branchId,
      isConsolidatedReport: false,
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Gelir ve Gider Kategorilerini Getir (TDHP ve KDV esaslı)
   */
  async getRevenueExpenseCategories(type?: RevenueExpenseType): Promise<ApiResponse<RevenueExpenseCategoryItem[]>> {
    let result = [...inMemoryRevenueExpenseCategories];
    if (type) {
      result = result.filter(c => c.type === type);
    }
    return {
      success: true,
      data: result,
      message: 'Kategoriler listelendi.',
      appliedBranchFilter: null,
      isConsolidatedReport: true,
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Yeni Gelir veya Gider Kategorisi Ekle
   */
  async createRevenueExpenseCategory(category: Omit<RevenueExpenseCategoryItem, 'id'>): Promise<ApiResponse<RevenueExpenseCategoryItem>> {
    const newCategory: RevenueExpenseCategoryItem = {
      ...category,
      id: `cat-${category.type.toLowerCase()}-${Date.now()}`,
    };
    inMemoryRevenueExpenseCategories.push(newCategory);
    try {
      localStorage.setItem(STORAGE_KEYS.REVENUE_EXPENSE_CATEGORIES, JSON.stringify(inMemoryRevenueExpenseCategories));
    } catch (e) {
      console.error(e);
    }
    return {
      success: true,
      data: newCategory,
      message: `${newCategory.name} kategorisi başarıyla eklendi.`,
      appliedBranchFilter: null,
      isConsolidatedReport: true,
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Kategori Güncelle
   */
  async updateRevenueExpenseCategory(id: string, updates: Partial<RevenueExpenseCategoryItem>): Promise<ApiResponse<RevenueExpenseCategoryItem>> {
    const index = inMemoryRevenueExpenseCategories.findIndex(c => c.id === id);
    if (index === -1) {
      throw new Error('Kategori bulunamadı.');
    }
    const updated = {
      ...inMemoryRevenueExpenseCategories[index],
      ...updates,
    };
    inMemoryRevenueExpenseCategories[index] = updated;
    try {
      localStorage.setItem(STORAGE_KEYS.REVENUE_EXPENSE_CATEGORIES, JSON.stringify(inMemoryRevenueExpenseCategories));
    } catch (e) {
      console.error(e);
    }
    return {
      success: true,
      data: updated,
      message: `${updated.name} kategorisi güncellendi.`,
      appliedBranchFilter: null,
      isConsolidatedReport: true,
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Kategori Sil
   */
  async deleteRevenueExpenseCategory(id: string): Promise<ApiResponse<boolean>> {
    const index = inMemoryRevenueExpenseCategories.findIndex(c => c.id === id);
    if (index === -1) {
      throw new Error('Kategori bulunamadı.');
    }
    const removed = inMemoryRevenueExpenseCategories[index];
    inMemoryRevenueExpenseCategories = inMemoryRevenueExpenseCategories.filter(c => c.id !== id);
    try {
      localStorage.setItem(STORAGE_KEYS.REVENUE_EXPENSE_CATEGORIES, JSON.stringify(inMemoryRevenueExpenseCategories));
    } catch (e) {
      console.error(e);
    }
    return {
      success: true,
      data: true,
      message: `${removed.name} kategorisi silindi.`,
      appliedBranchFilter: null,
      isConsolidatedReport: true,
      timestamp: new Date().toISOString(),
    };
  },

  // =========================================================================
  // BORÇLAR & ALACAKLAR (DEBT & CREDIT) SERVİSLERİ
  // =========================================================================
  async getDebtCredits(branchId?: string, isGlobalOverride?: boolean): Promise<ApiResponse<DebtCreditItem[]>> {
    const selectedBranch = branchId !== undefined ? branchId : branchContext.getSelectedBranchId();
    const isConsolidated = selectedBranch === 'all' || !selectedBranch;

    let filtered = [...inMemoryDebtCredits];
    if (!isConsolidated) {
      filtered = filtered.filter(item => item.branchId === selectedBranch);
    }

    const todayStr = new Date().toISOString().slice(0, 10);

    // Vadesi geçmiş durumları güncelle
    filtered = filtered.map(item => {
      let status = item.status;
      if (item.remainingAmount <= 0) {
        status = 'PAID';
      } else if (item.dueDate && item.dueDate < todayStr && status !== 'CANCELLED') {
        status = 'OVERDUE';
      } else if (item.paidAmount > 0 && item.remainingAmount > 0) {
        status = 'PARTIAL';
      }
      return { ...item, status };
    });

    // En yeni işlemler en üstte
    filtered.sort((a, b) => new Date(b.issueDate || b.createdAt).getTime() - new Date(a.issueDate || a.createdAt).getTime());

    return {
      success: true,
      data: filtered,
      appliedBranchFilter: isConsolidated ? null : selectedBranch,
      isConsolidatedReport: isConsolidated,
      timestamp: new Date().toISOString(),
    };
  },

  async createDebtCredit(payload: {
    type: DebtCreditType;
    contactId: string;
    contactTitle: string;
    totalAmount: number;
    paidAmount?: number;
    issueDate: string;
    dueDate: string;
    documentNumber: string;
    documentType?: any;
    vatRate?: number;
    description: string;
    category?: string;
    notes?: string;
    branchId?: string;
    cashBankId?: string;
    paymentMethod?: PaymentMethodType;
  }): Promise<ApiResponse<DebtCreditItem>> {
    let branchId = payload.branchId;
    if (!branchId || branchId === 'all') {
      branchId = inMemoryBranches[0]?.id || BRANCHES[0].id;
    }
    const branch = inMemoryBranches.find(b => b.id === branchId);

    const isAlacak = payload.type === 'ALACAK';
    const count = inMemoryDebtCredits.filter(i => i.type === payload.type).length + 1;
    const prefix = isAlacak ? 'ALC' : 'BRC';
    const itemCode = `${prefix}-2026-${String(count).padStart(4, '0')}`;

    const paid = Number(payload.paidAmount) || 0;
    const total = Number(payload.totalAmount) || 0;
    const remaining = Math.max(0, total - paid);

    const todayStr = new Date().toISOString().slice(0, 10);
    let status: DebtCreditStatus = 'PENDING';
    if (remaining <= 0) {
      status = 'PAID';
    } else if (payload.dueDate && payload.dueDate < todayStr) {
      status = 'OVERDUE';
    } else if (paid > 0) {
      status = 'PARTIAL';
    }

    const initialPayments: DebtCreditPaymentRecord[] = [];

    // Peşin ödeme/tahsilat yapıldıysa
    if (paid > 0 && payload.cashBankId) {
      const selectedCashBank = inMemoryCashBanks.find(cb => cb.id === payload.cashBankId);
      const paymentRec: DebtCreditPaymentRecord = {
        id: `pay-${Date.now()}`,
        debtCreditId: `dc-${Date.now()}`,
        amount: paid,
        paymentDate: payload.issueDate || todayStr,
        cashBankId: payload.cashBankId,
        cashBankName: selectedCashBank?.name || 'Kasa/Banka',
        paymentMethod: payload.paymentMethod || 'NAKIT',
        receiptNumber: `PEŞ-${payload.documentNumber}`,
        description: 'İlk peşinat tahsilatı/ödemesi',
        createdAt: new Date().toISOString(),
        createdByUser: 'Sistem Yöneticisi',
      };
      initialPayments.push(paymentRec);

      // Kasa/Banka bakiyesini güncelle
      const cbIndex = inMemoryCashBanks.findIndex(cb => cb.id === payload.cashBankId);
      if (cbIndex !== -1) {
        const cur = inMemoryCashBanks[cbIndex];
        const updatedBalance = isAlacak ? cur.balance + paid : cur.balance - paid;
        inMemoryCashBanks[cbIndex] = { ...cur, balance: updatedBalance };
        try {
          localStorage.setItem(STORAGE_KEYS.CASH_BANKS, JSON.stringify(inMemoryCashBanks));
        } catch (e) {
          console.error(e);
        }
      }

      // Kasa/Banka hareket günlüğüne de otomatik hareket yaz
      const newMovement: PaymentMovement = {
        id: `pm-dc-${Date.now()}`,
        tenantId: CURRENT_TENANT.id,
        branchId,
        branchName: branch?.name,
        movementType: isAlacak ? 'TAHSILAT' : 'ODEME',
        paymentMethod: payload.paymentMethod || 'NAKIT',
        contactId: payload.contactId,
        contactTitle: payload.contactTitle,
        cashBankId: payload.cashBankId,
        cashBankName: selectedCashBank?.name || 'Kasa/Banka',
        amount: paid,
        currency: 'TRY',
        documentNumber: `PEŞ-${payload.documentNumber}`,
        receiptNumber: `PEŞ-${payload.documentNumber}`,
        movementDate: payload.issueDate || todayStr,
        status: 'COMPLETED',
        description: `${payload.type === 'ALACAK' ? 'Alacak Tahsilatı' : 'Borç Ödemesi'}: ${payload.contactTitle}`,
        category: payload.category,
        createdAt: new Date().toISOString(),
        createdByUser: 'Sistem Yöneticisi',
      };
      inMemoryPaymentMovements = [newMovement, ...inMemoryPaymentMovements];
      try {
        localStorage.setItem(STORAGE_KEYS.PAYMENT_MOVEMENTS, JSON.stringify(inMemoryPaymentMovements));
      } catch (e) {
        console.error(e);
      }
    }

    // Cari bakiyesini güncelle
    if (payload.contactId) {
      const contactIndex = inMemoryContacts.findIndex(c => c.id === payload.contactId);
      if (contactIndex !== -1) {
        const contact = inMemoryContacts[contactIndex];
        const currentBal = Number(contact.currentBalance) || 0;
        // Alacak ise müşteriden alacağımız arttı (+remaining), Borç ise tedarikçiye borcumuz arttı (-remaining)
        const newBalance = isAlacak ? currentBal + remaining : currentBal - remaining;
        inMemoryContacts[contactIndex] = {
          ...contact,
          currentBalance: newBalance,
          updatedAt: new Date().toISOString(),
        };
        try {
          localStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(inMemoryContacts));
        } catch (e) {
          console.error(e);
        }
      }
    }

    const contactObj = inMemoryContacts.find(c => c.id === payload.contactId);

    const newItem: DebtCreditItem = {
      id: `dc-${Date.now()}`,
      tenantId: CURRENT_TENANT.id,
      branchId,
      branchName: branch?.name || 'Merkez Şube',
      itemCode,
      type: payload.type,
      contactId: payload.contactId,
      contactTitle: payload.contactTitle || contactObj?.title || 'Cari',
      contactCode: contactObj?.code,
      contactTaxNumber: contactObj?.taxNumber || contactObj?.tcNumber,
      contactPhone: contactObj?.mobilePhone1 || contactObj?.workPhone,
      totalAmount: total,
      paidAmount: paid,
      remainingAmount: remaining,
      issueDate: payload.issueDate,
      dueDate: payload.dueDate,
      status,
      documentNumber: payload.documentNumber,
      documentType: payload.documentType || 'E_FATURA',
      vatRate: payload.vatRate ?? 20,
      vatAmount: payload.vatRate ? (total * payload.vatRate) / (100 + payload.vatRate) : 0,
      description: payload.description,
      category: payload.category,
      notes: payload.notes,
      payments: initialPayments,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    inMemoryDebtCredits = [newItem, ...inMemoryDebtCredits];
    try {
      localStorage.setItem(STORAGE_KEYS.DEBT_CREDITS, JSON.stringify(inMemoryDebtCredits));
    } catch (e) {
      console.error(e);
    }

    return {
      success: true,
      data: newItem,
      message: `${isAlacak ? 'Alacak' : 'Borç'} kaydı başarıyla oluşturuldu.`,
      appliedBranchFilter: branchId,
      isConsolidatedReport: false,
      timestamp: new Date().toISOString(),
    };
  },

  async addDebtCreditPayment(
    debtCreditId: string,
    paymentData: {
      amount: number;
      cashBankId: string;
      paymentMethod: PaymentMethodType;
      receiptNumber?: string;
      description?: string;
      paymentDate?: string;
    }
  ): Promise<ApiResponse<DebtCreditItem>> {
    const itemIndex = inMemoryDebtCredits.findIndex(i => i.id === debtCreditId);
    if (itemIndex === -1) {
      throw new Error('Borç/Alacak kaydı bulunamadı.');
    }

    const item = inMemoryDebtCredits[itemIndex];
    const isAlacak = item.type === 'ALACAK';
    const amount = Number(paymentData.amount) || 0;
    if (amount <= 0) {
      throw new Error('Geçerli bir ödeme tutarı giriniz.');
    }
    if (amount > item.remainingAmount + 0.01) {
      throw new Error(`Ödeme tutarı kalan borç/alacak tutarını aşamaz. Kalan tutar: ₺${item.remainingAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}.`);
    }

    const selectedCashBank = inMemoryCashBanks.find(cb => cb.id === paymentData.cashBankId);
    if (!selectedCashBank) {
      throw new Error('Geçerli bir Kasa/Banka hesabı seçiniz.');
    }

    const paymentDate = paymentData.paymentDate || new Date().toISOString().slice(0, 10);
    const receiptNumber = paymentData.receiptNumber || `MKZ-${Date.now().toString().slice(-6)}`;

    const newPaymentRecord: DebtCreditPaymentRecord = {
      id: `pay-${Date.now()}`,
      debtCreditId: item.id,
      amount,
      paymentDate,
      cashBankId: selectedCashBank.id,
      cashBankName: selectedCashBank.name,
      paymentMethod: paymentData.paymentMethod,
      receiptNumber,
      description: paymentData.description || (isAlacak ? 'Alacak Tahsilatı' : 'Borç Ödemesi'),
      createdAt: new Date().toISOString(),
      createdByUser: 'Sistem Yöneticisi',
    };

    const newPaidAmount = item.paidAmount + amount;
    const newRemaining = Math.max(0, item.totalAmount - newPaidAmount);
    let newStatus: DebtCreditStatus = 'PARTIAL';
    if (newRemaining <= 0.01) {
      newStatus = 'PAID';
    }

    const updatedItem: DebtCreditItem = {
      ...item,
      paidAmount: newPaidAmount,
      remainingAmount: newRemaining,
      status: newStatus,
      payments: [...item.payments, newPaymentRecord],
      updatedAt: new Date().toISOString(),
    };

    inMemoryDebtCredits[itemIndex] = updatedItem;
    try {
      localStorage.setItem(STORAGE_KEYS.DEBT_CREDITS, JSON.stringify(inMemoryDebtCredits));
    } catch (e) {
      console.error(e);
    }

    // 1. Kasa/Banka Bakiyesi Güncelle
    const cbIndex = inMemoryCashBanks.findIndex(cb => cb.id === selectedCashBank.id);
    if (cbIndex !== -1) {
      const cur = inMemoryCashBanks[cbIndex];
      const updatedBalance = isAlacak ? cur.balance + amount : cur.balance - amount;
      inMemoryCashBanks[cbIndex] = { ...cur, balance: updatedBalance };
      try {
        localStorage.setItem(STORAGE_KEYS.CASH_BANKS, JSON.stringify(inMemoryCashBanks));
      } catch (e) {
        console.error(e);
      }
    }

    // 2. Kasa/Banka Günlüğüne Hareket Ekle
    const newMovement: PaymentMovement = {
      id: `pm-dc-${Date.now()}`,
      tenantId: CURRENT_TENANT.id,
      branchId: item.branchId,
      branchName: item.branchName,
      movementType: isAlacak ? 'TAHSILAT' : 'ODEME',
      paymentMethod: paymentData.paymentMethod,
      contactId: item.contactId,
      contactTitle: item.contactTitle,
      cashBankId: selectedCashBank.id,
      cashBankName: selectedCashBank.name,
      amount,
      currency: 'TRY',
      documentNumber: receiptNumber,
      receiptNumber: receiptNumber,
      movementDate: paymentDate,
      status: 'COMPLETED',
      description: `${item.documentNumber} no'lu ${isAlacak ? 'fatura tahsilatı' : 'fatura ödemesi'} (${item.contactTitle})`,
      category: item.category,
      createdAt: new Date().toISOString(),
      createdByUser: 'Sistem Yöneticisi',
    };
    inMemoryPaymentMovements = [newMovement, ...inMemoryPaymentMovements];
    try {
      localStorage.setItem(STORAGE_KEYS.PAYMENT_MOVEMENTS, JSON.stringify(inMemoryPaymentMovements));
    } catch (e) {
      console.error(e);
    }

    // 3. Cari Bakiyesini Güncelle
    if (item.contactId) {
      const contactIndex = inMemoryContacts.findIndex(c => c.id === item.contactId);
      if (contactIndex !== -1) {
        const contact = inMemoryContacts[contactIndex];
        const currentBal = Number(contact.currentBalance) || 0;
        // Alacak tahsil edilince bakiye azalır (-), Borç ödenince bakiye düzelir (+)
        const newBal = isAlacak ? currentBal - amount : currentBal + amount;
        inMemoryContacts[contactIndex] = {
          ...contact,
          currentBalance: newBal,
          updatedAt: new Date().toISOString(),
        };
        try {
          localStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(inMemoryContacts));
        } catch (e) {
          console.error(e);
        }
      }
    }

    return {
      success: true,
      data: updatedItem,
      message: `₺${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} tutarında ${isAlacak ? 'tahsilat' : 'ödeme'} başarıyla kaydedildi.`,
      appliedBranchFilter: item.branchId,
      isConsolidatedReport: false,
      timestamp: new Date().toISOString(),
    };
  },

  async deleteDebtCredit(id: string): Promise<ApiResponse<boolean>> {
    const item = inMemoryDebtCredits.find(i => i.id === id);
    if (!item) {
      throw new Error('Kayıt bulunamadı.');
    }

    const isAlacak = item.type === 'ALACAK';

    // Oluşturma ve sonradan yapılan ödemelerin cari etkisini geri al.
    if (item.contactId) {
      const contactIndex = inMemoryContacts.findIndex(c => c.id === item.contactId);
      if (contactIndex !== -1) {
        const contact = inMemoryContacts[contactIndex];
        const restoredBalance = (contact.currentBalance || 0) + (isAlacak ? -item.remainingAmount : item.remainingAmount);
        inMemoryContacts[contactIndex] = {
          ...contact,
          currentBalance: restoredBalance,
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(inMemoryContacts));
      }
    }

    // Bu kayda bağlı tüm ödeme hareketlerini ve kasa etkisini geri al.
    const paymentReceipts = new Set(item.payments.map(payment => payment.receiptNumber));
    const relatedMovements = inMemoryPaymentMovements.filter((movement) =>
      paymentReceipts.has(movement.documentNumber) || paymentReceipts.has(movement.receiptNumber)
    );
    for (const movement of relatedMovements) {
      const cashBankIndex = inMemoryCashBanks.findIndex(cb => cb.id === movement.cashBankId);
      if (cashBankIndex !== -1) {
        const cashBank = inMemoryCashBanks[cashBankIndex];
        inMemoryCashBanks[cashBankIndex] = {
          ...cashBank,
          balance: cashBank.balance + (isAlacak ? -movement.amount : movement.amount),
        };
      }
    }
    inMemoryPaymentMovements = inMemoryPaymentMovements.filter((movement) => !relatedMovements.includes(movement));
    localStorage.setItem(STORAGE_KEYS.CASH_BANKS, JSON.stringify(inMemoryCashBanks));
    localStorage.setItem(STORAGE_KEYS.PAYMENT_MOVEMENTS, JSON.stringify(inMemoryPaymentMovements));

    inMemoryDebtCredits = inMemoryDebtCredits.filter(i => i.id !== id);
    try {
      localStorage.setItem(STORAGE_KEYS.DEBT_CREDITS, JSON.stringify(inMemoryDebtCredits));
    } catch (e) {
      console.error(e);
    }

    return {
      success: true,
      data: true,
      message: `${item.itemCode} numaralı kayıt başarıyla silindi.`,
      appliedBranchFilter: item.branchId,
      isConsolidatedReport: false,
      timestamp: new Date().toISOString(),
    };
  },
};


export const api = fxApi;

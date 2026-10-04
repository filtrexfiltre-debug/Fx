import { safeLocalStorage } from '../lib/storage';

export interface LedgerEntry {
  id: string;
  tenantId?: string;
  branchId: string;
  type: string;
  amount: number;
  currency: string;
  description: string;
  transactionDate: string;
  userId: string;
  userName: string;
  reversesTransactionId?: string | null;
  createdAt: string;
}

function currentClaims(): { sub: string; name: string; tenantId: string; branchId: string; isGlobal: boolean } | null {
  try {
    const token = safeLocalStorage.getItem('fx_auth_token');
    const encoded = token?.split('.')[0];
    if (!encoded) return null;
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')), (character) => character.charCodeAt(0));
    const claims = JSON.parse(new TextDecoder().decode(bytes));
    if (typeof claims.sub !== 'string' || typeof claims.tenantId !== 'string' ||
        typeof claims.branchId !== 'string' || typeof claims.isGlobal !== 'boolean') return null;
    return {
      sub: claims.sub,
      name: typeof claims.name === 'string' ? claims.name : claims.email,
      tenantId: claims.tenantId,
      branchId: claims.branchId,
      isGlobal: claims.isGlobal,
    };
  } catch {
    return null;
  }
}

function csvBlob(rows: Record<string, unknown>[]): Blob {
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const cell = (value: unknown) => {
    let text = value && typeof value === 'object' ? JSON.stringify(value) : String(value ?? '');
    if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  return new Blob([`\uFEFF${[headers, ...rows.map((row) => headers.map((header) => row[header]))]
    .map((row) => row.map(cell).join(';')).join('\r\n')}`], { type: 'text/csv;charset=utf-8;' });
}

export interface LedgerFilters {
  from?: string;
  to?: string;
  branchId?: string;
  userId?: string;
  type?: string;
  limit?: number;
  offset?: number;
}

export interface AuditEntry {
  id: string;
  tenantId?: string;
  branchId: string;
  userId: string;
  userName: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details?: unknown;
  createdAt: string;
}

const ledgerKey = 'fx_ledger_entries';
const auditKey = 'fx_audit_entries';
const localData = new Map<string, unknown[]>();

function readLocal<T>(key: string): T[] {
  const saved = safeLocalStorage.getItem(key);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        localData.set(key, parsed);
        return parsed as T[];
      }
    } catch {
      safeLocalStorage.removeItem(key);
    }
  }
  return (localData.get(key) || []) as T[];
}

function writeLocal<T>(key: string, entries: T[]): void {
  localData.set(key, entries);
  safeLocalStorage.setItem(key, JSON.stringify(entries));
}

function queryString(filters: LedgerFilters): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') query.set(key, String(value));
  }
  return query.toString();
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const token = safeLocalStorage.getItem('fx_auth_token');
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: ['Bearer ', token].join('') } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw Object.assign(new Error(body.message || 'İstek tamamlanamadı.'), { status: response.status });
  }
  return response.json() as Promise<T>;
}

function isNetworkError(error: unknown): boolean {
  return !(error && typeof error === 'object' && 'status' in error);
}

export const ledgerService = {
  async list(filters: LedgerFilters = {}) {
    try {
      const result = await request<{ rows: LedgerEntry[]; total: number; limit: number; offset: number }>(
        `/api/ledger?${queryString(filters)}`,
      );
      return result;
    } catch (error) {
      if (!isNetworkError(error)) throw error;
      const claims = currentClaims();
      const all = readLocal<LedgerEntry>(ledgerKey).filter((entry) =>
        Boolean(claims && entry.tenantId === claims.tenantId &&
          (claims.isGlobal || entry.branchId === claims.branchId)) &&
        (!filters.from || entry.transactionDate >= filters.from) &&
        (!filters.to || entry.transactionDate <= `${filters.to}T23:59:59.999Z`) &&
        (!filters.branchId || entry.branchId === filters.branchId) &&
        (!filters.userId || entry.userId === filters.userId) &&
        (!filters.type || entry.type === filters.type),
      );
      const limit = Math.min(200, Math.max(1, filters.limit || 50));
      const offset = Math.max(0, filters.offset || 0);
      return { rows: all.slice(offset, offset + limit), total: all.length, limit, offset };
    }
  },

  async create(entry: Omit<LedgerEntry, 'id' | 'createdAt' | 'userId' | 'userName'> & { reversesTransactionId?: string }) {
    try {
      const result = await request<{ data: LedgerEntry }>('/api/ledger', {
        method: 'POST',
        body: JSON.stringify(entry),
      });
      return result.data;
    } catch (error) {
      if (!isNetworkError(error)) throw error;
      const claims = currentClaims();
      const stored: LedgerEntry = {
        ...entry,
        tenantId: claims?.tenantId,
        branchId: claims ? (claims.isGlobal ? entry.branchId || claims.branchId : claims.branchId) : '',
        id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
        transactionDate: entry.transactionDate || new Date().toISOString(),
        userId: claims?.sub || 'offline',
        userName: claims?.name || 'Çevrimdışı kullanıcı',
        createdAt: new Date().toISOString(),
      };
      writeLocal(ledgerKey, [stored, ...readLocal<LedgerEntry>(ledgerKey)]);
      return stored;
    }
  },

  async listAudit(filters: LedgerFilters = {}) {
    try {
      return await request<{ rows: AuditEntry[]; total: number; limit: number; offset: number }>(
        `/api/audit-logs?${queryString(filters)}`,
      );
    } catch (error) {
      if (!isNetworkError(error)) throw error;
      const claims = currentClaims();
      const all = readLocal<AuditEntry>(auditKey).filter((entry) =>
        Boolean(claims && entry.tenantId === claims.tenantId &&
          (claims.isGlobal || entry.branchId === claims.branchId)) &&
        (!filters.from || entry.createdAt >= filters.from) &&
        (!filters.to || entry.createdAt <= `${filters.to}T23:59:59.999Z`) &&
        (!filters.branchId || entry.branchId === filters.branchId) &&
        (!filters.userId || entry.userId === filters.userId) &&
        (!filters.type || entry.action === filters.type),
      );
      const limit = Math.min(200, Math.max(1, filters.limit || 50));
      const offset = Math.max(0, filters.offset || 0);
      return { rows: all.slice(offset, offset + limit), total: all.length, limit, offset };
    }
  },

  async createAudit(entry: Pick<AuditEntry, 'action' | 'resourceType' | 'resourceId' | 'details'>) {
    try {
      const result = await request<{ data: AuditEntry }>('/api/audit-logs', {
        method: 'POST',
        body: JSON.stringify(entry),
      });
      return result.data;
    } catch (error) {
      if (!isNetworkError(error)) throw error;
      const claims = currentClaims();
      const stored: AuditEntry = {
        ...entry,
        tenantId: claims?.tenantId,
        id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
        branchId: claims
          ? (claims.isGlobal ? safeLocalStorage.getItem('fx_selected_branch_id') || claims.branchId : claims.branchId)
          : '',
        userId: claims?.sub || 'offline',
        userName: claims?.name || 'Çevrimdışı kullanıcı',
        resourceType: entry.resourceType || '',
        resourceId: entry.resourceId || '',
        createdAt: new Date().toISOString(),
      };
      writeLocal(auditKey, [stored, ...readLocal<AuditEntry>(auditKey)]);
      return stored;
    }
  },

  async exportAudit(filters: LedgerFilters = {}) {
    const token = safeLocalStorage.getItem('fx_auth_token');
    const query = new URLSearchParams(queryString(filters));
    query.set('format', 'csv');
    let response: Response;
    try {
      response = await fetch(`/api/audit-logs?${query}`, {
        headers: token ? { Authorization: ['Bearer ', token].join('') } : {},
      });
    } catch {
      const claims = currentClaims();
      const entries = readLocal<AuditEntry>(auditKey).filter((entry) =>
        Boolean(claims && entry.tenantId === claims.tenantId &&
          (claims.isGlobal || entry.branchId === claims.branchId)) &&
        (!filters.from || entry.createdAt >= filters.from) &&
        (!filters.to || entry.createdAt <= `${filters.to}T23:59:59.999Z`) &&
        (!filters.branchId || entry.branchId === filters.branchId) &&
        (!filters.userId || entry.userId === filters.userId) &&
        (!filters.type || entry.action === filters.type),
      );
      return csvBlob(entries as unknown as Record<string, unknown>[]);
    }
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.message || 'Dışa aktarma başarısız.');
    }
    return response.blob();
  },

  async exportLedger(filters: LedgerFilters = {}) {
    const token = safeLocalStorage.getItem('fx_auth_token');
    const query = new URLSearchParams(queryString(filters));
    query.set('format', 'csv');
    let response: Response;
    try {
      response = await fetch(`/api/ledger?${query}`, {
        headers: token ? { Authorization: ['Bearer ', token].join('') } : {},
      });
    } catch {
      const claims = currentClaims();
      const entries = readLocal<LedgerEntry>(ledgerKey).filter((entry) =>
        Boolean(claims && entry.tenantId === claims.tenantId &&
          (claims.isGlobal || entry.branchId === claims.branchId)) &&
        (!filters.from || entry.transactionDate >= filters.from) &&
        (!filters.to || entry.transactionDate <= `${filters.to}T23:59:59.999Z`) &&
        (!filters.branchId || entry.branchId === filters.branchId) &&
        (!filters.userId || entry.userId === filters.userId) &&
        (!filters.type || entry.type === filters.type),
      );
      return csvBlob(entries as unknown as Record<string, unknown>[]);
    }
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.message || 'Dışa aktarma başarısız.');
    }
    return response.blob();
  },

  clearCache() {
    localData.clear();
    safeLocalStorage.removeItem(ledgerKey);
    safeLocalStorage.removeItem(auditKey);
  },
};

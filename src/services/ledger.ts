/**
 * Append-only financial ledger + audit log (local/dev store).
 *
 * Mirrors schema.sql `financial_transactions` and `audit_logs`: rows are only
 * ever appended. Corrections are made with `reverseTransaction`, never by
 * editing. Swap the two persistence helpers for API calls when the DB-backed
 * backend is available; callers do not need to change.
 */
import type { AuditLog, FinancialTransaction } from '../types/fx';
import { CURRENT_TENANT } from '../data/mockData';
import { readStoredJson, safeLocalStorage, STORAGE_KEYS } from '../lib/storage';

const newId = (prefix: string) =>
  `${prefix}-${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`}`;

const load = <T>(key: string): T[] => {
  const rows = readStoredJson<T[]>(key, []);
  return Array.isArray(rows) ? rows : [];
};
const append = <T>(key: string, row: T): void => {
  safeLocalStorage.setItem(key, JSON.stringify([...load<T>(key), row]));
};

const currentActor = (): { userId?: string } => {
  const user = readStoredJson<{ id?: string } | null>(STORAGE_KEYS.CURRENT_USER, null);
  return { userId: user?.id };
};

export const recordAudit = (entry: Omit<AuditLog, 'id' | 'tenantId' | 'createdAt' | 'userId'> & { userId?: string | null }): AuditLog => {
  const row: AuditLog = {
    ...entry,
    id: newId('al'),
    tenantId: CURRENT_TENANT.id,
    userId: entry.userId ?? currentActor().userId ?? null,
    createdAt: new Date().toISOString(),
  };
  append(STORAGE_KEYS.AUDIT_LOGS, row);
  return row;
};

type NewTransaction = Omit<FinancialTransaction, 'id' | 'tenantId' | 'createdAt' | 'createdBy' | 'currencyCode'> & { currencyCode?: string };

/** Appends a ledger row and its matching audit row. */
export const recordTransaction = (input: NewTransaction): FinancialTransaction => {
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Defter kaydı tutarı 0’dan büyük olmalıdır.');
  }
  const row: FinancialTransaction = {
    ...input,
    id: newId('ft'),
    tenantId: CURRENT_TENANT.id,
    amount,
    currencyCode: input.currencyCode || 'TRY',
    createdBy: currentActor().userId,
    createdAt: new Date().toISOString(),
  };
  append(STORAGE_KEYS.LEDGER, row);
  recordAudit({
    branchId: row.branchId,
    action: 'finance.transaction.create',
    entityType: 'financial_transaction',
    entityId: row.id,
    afterData: row,
  });
  return row;
};

/** Cancels a ledger row by appending an opposite-direction REVERSAL row. */
export const reverseTransaction = (original: FinancialTransaction, reason?: string): FinancialTransaction =>
  recordTransaction({
    branchId: original.branchId,
    cashAccountId: original.cashAccountId,
    contactId: original.contactId,
    transactionType: 'REVERSAL',
    direction: original.direction === 'D' ? 'C' : 'D',
    amount: original.amount,
    currencyCode: original.currencyCode,
    referenceType: original.referenceType,
    referenceId: original.referenceId,
    reversalOf: original.id,
    description: reason || `Ters kayıt: ${original.id}`,
  });

export const getLedger = (): FinancialTransaction[] => load<FinancialTransaction>(STORAGE_KEYS.LEDGER);
export const getAuditLogs = (): AuditLog[] => load<AuditLog>(STORAGE_KEYS.AUDIT_LOGS);

/** Reverses every not-yet-reversed ledger row that references the given business document. */
export const reverseByReference = (referenceId: string, reason?: string): FinancialTransaction[] => {
  const rows = getLedger();
  const reversed = new Set(rows.filter((r) => r.reversalOf).map((r) => r.reversalOf));
  return rows
    .filter((r) => r.referenceId === referenceId && r.transactionType !== 'REVERSAL' && !reversed.has(r.id))
    .map((r) => reverseTransaction(r, reason));
};

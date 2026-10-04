import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { AgDataGrid } from '../common/AgDataGrid';
import type { GridColumnDef } from '../../types';
import type { Branch } from '../../types/fx';
import { ledgerService, type LedgerEntry, type LedgerFilters } from '../../services/ledger';

interface LedgerScreenProps {
  branches: Branch[];
  showBranchFilter: boolean;
  canExport: boolean;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function LedgerScreen({ branches, showBranchFilter, canExport }: LedgerScreenProps) {
  const [filters, setFilters] = useState<LedgerFilters>({ limit: 200 });
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await ledgerService.list({ ...filters, limit: 200, offset: 0 });
      setEntries(result.rows);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Defter kayıtları yüklenemedi.');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { void loadEntries(); }, [loadEntries]);

  const columns = useMemo<GridColumnDef<LedgerEntry>[]>(() => [
    { field: 'transactionDate', headerName: 'Tarih', width: 160, renderCell: (row) => new Date(row.transactionDate).toLocaleString('tr-TR') },
    { field: 'type', headerName: 'İşlem Türü', width: 150 },
    { field: 'description', headerName: 'Açıklama', minWidth: 220 },
    { field: 'amount', headerName: 'Tutar', align: 'right', renderCell: (row) => `${row.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ${row.currency}` },
    { field: 'branchId', headerName: 'Şube', width: 180, renderCell: (row) => branches.find((branch) => branch.id === row.branchId)?.name || row.branchId },
    { field: 'userName', headerName: 'Kullanıcı', width: 180 },
    { field: 'reversesTransactionId', headerName: 'Ters Kayıt', minWidth: 150 },
  ], [branches]);

  const setFilter = (key: keyof LedgerFilters, value: string) => {
    setFilters((previous) => ({ ...previous, [key]: value || undefined }));
  };

  const exportCsv = async () => {
    try {
      downloadBlob(await ledgerService.exportLedger(filters), 'defter-hareketleri.csv');
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Dışa aktarma başarısız.');
    }
  };

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Defter Hareketleri</h1>
        <p className="mt-1 text-sm text-slate-500">Finansal kayıtlar ve ters kayıtlar.</p>
      </div>
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <label className="text-xs font-semibold text-slate-600">Başlangıç
          <input type="date" value={filters.from || ''} onChange={(event) => setFilter('from', event.target.value)} className="mt-1 block rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        </label>
        <label className="text-xs font-semibold text-slate-600">Bitiş
          <input type="date" value={filters.to || ''} onChange={(event) => setFilter('to', event.target.value)} className="mt-1 block rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        </label>
        {showBranchFilter && <label className="text-xs font-semibold text-slate-600">Şube
          <select value={filters.branchId || ''} onChange={(event) => setFilter('branchId', event.target.value)} className="mt-1 block min-w-40 rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">Tüm şubeler</option>
            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
        </label>}
        <label className="text-xs font-semibold text-slate-600">Kullanıcı
          <input value={filters.userId || ''} onChange={(event) => setFilter('userId', event.target.value)} placeholder="Kullanıcı ID" className="mt-1 block rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        </label>
        <label className="text-xs font-semibold text-slate-600">İşlem türü
          <input value={filters.type || ''} onChange={(event) => setFilter('type', event.target.value)} placeholder="İşlem türü" className="mt-1 block rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        </label>
        {canExport && <button type="button" onClick={() => void exportCsv()} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
          <Download className="h-4 w-4" /> CSV dışa aktar
        </button>}
      </div>
      {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {loading ? <div className="rounded-xl bg-white p-8 text-center text-sm text-slate-500">Kayıtlar yükleniyor...</div> :
        entries.length === 0 && !error ? <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">Filtrelerle eşleşen defter hareketi bulunamadı.</div> :
          <AgDataGrid id="ledger" data={entries} columns={columns} showSearch />}
    </section>
  );
}

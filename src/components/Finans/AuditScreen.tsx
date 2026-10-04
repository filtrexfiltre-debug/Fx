import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { AgDataGrid } from '../common/AgDataGrid';
import type { GridColumnDef } from '../../types';
import type { Branch } from '../../types/fx';
import { ledgerService, type AuditEntry, type LedgerFilters } from '../../services/ledger';

interface AuditScreenProps {
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

export function AuditScreen({ branches, showBranchFilter, canExport }: AuditScreenProps) {
  const [filters, setFilters] = useState<LedgerFilters>({ limit: 200 });
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await ledgerService.listAudit({ ...filters, limit: 200, offset: 0 });
      setEntries(result.rows);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Denetim kayıtları yüklenemedi.');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { void loadEntries(); }, [loadEntries]);

  const columns = useMemo<GridColumnDef<AuditEntry>[]>(() => [
    { field: 'createdAt', headerName: 'Tarih', width: 170, renderCell: (row) => new Date(row.createdAt).toLocaleString('tr-TR') },
    { field: 'action', headerName: 'İşlem', width: 160 },
    { field: 'resourceType', headerName: 'Kaynak', width: 150 },
    { field: 'resourceId', headerName: 'Kayıt ID', minWidth: 150 },
    { field: 'userName', headerName: 'Kullanıcı', width: 180 },
    { field: 'branchId', headerName: 'Şube', width: 180, renderCell: (row) => branches.find((branch) => branch.id === row.branchId)?.name || row.branchId || '-' },
    { field: 'details', headerName: 'Detay', minWidth: 200, renderCell: (row) => typeof row.details === 'string' ? row.details : JSON.stringify(row.details || '') },
  ], [branches]);

  const setFilter = (key: keyof LedgerFilters, value: string) => {
    setFilters((previous) => ({ ...previous, [key]: value || undefined }));
  };

  const exportCsv = async () => {
    try {
      downloadBlob(await ledgerService.exportAudit(filters), 'denetim-kayitlari.csv');
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Dışa aktarma başarısız.');
    }
  };

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Denetim Kayıtları</h1>
        <p className="mt-1 text-sm text-slate-500">Kullanıcı ve sistem işlemlerinin denetim izi.</p>
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
        entries.length === 0 && !error ? <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">Filtrelerle eşleşen denetim kaydı bulunamadı.</div> :
          <AgDataGrid id="audit" data={entries} columns={columns} showSearch />}
    </section>
  );
}

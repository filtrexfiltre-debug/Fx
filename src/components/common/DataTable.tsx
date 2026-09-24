import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface Column<T> {
  headerName: string;
  field?: keyof T;
  cellRenderer?: (params: { data: T; value: any }) => React.ReactNode;
  width?: number;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rowData: T[];
  pagination?: boolean;
  paginationPageSize?: number;
  onRowClick?: (data: T) => void;
  rowSelection?: {
    mode: 'single' | 'multiRow';
    checkboxes?: boolean;
    onSelectionChanged?: (selectedRows: T[]) => void;
  };
}

export function DataTable<T extends { id?: string | number }>({
  columns,
  rowData,
  pagination = true,
  paginationPageSize = 10,
  onRowClick,
  rowSelection,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof T; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());

  // Search/Filter
  const filteredData = useMemo(() => {
    return rowData.filter((row) => {
      return Object.values(row).some(
        (val) => val && val.toString().toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [rowData, searchTerm]);

  // Sort
  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / paginationPageSize);
  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;
    const start = (currentPage - 1) * paginationPageSize;
    return sortedData.slice(start, start + paginationPageSize);
  }, [sortedData, pagination, currentPage, paginationPageSize]);

  const handleSort = (field?: keyof T) => {
    if (!field) return;
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === field && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key: field, direction });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedData.length) {
      setSelectedIds(new Set());
      rowSelection?.onSelectionChanged?.([]);
    } else {
      const newSelected = new Set(sortedData.map((d) => d.id).filter((id): id is string | number => id !== undefined));
      setSelectedIds(newSelected);
      rowSelection?.onSelectionChanged?.(sortedData);
    }
  };

  const toggleSelectRow = (id: string | number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      if (rowSelection?.mode === 'single') {
        newSelected.clear();
      }
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
    const selectedRows = sortedData.filter((d) => d.id !== undefined && newSelected.has(d.id));
    rowSelection?.onSelectionChanged?.(selectedRows);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4 px-1">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Ara..."
            className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-400/20"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <div className="text-xs text-stone-500 font-medium">
          Toplam {filteredData.length} kayıt
        </div>
      </div>

      <div className="overflow-x-auto border border-stone-200 rounded-xl">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-stone-50 border-bottom border-stone-200">
              {rowSelection?.checkboxes && (
                <th className="px-4 py-3 w-10">
                  {rowSelection.mode === 'multiRow' && (
                    <input
                      type="checkbox"
                      className="rounded border-stone-300 text-stone-600 focus:ring-stone-500"
                      checked={selectedIds.size > 0 && selectedIds.size === sortedData.length}
                      onChange={toggleSelectAll}
                    />
                  )}
                </th>
              )}
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className="px-4 py-3 text-xs font-semibold text-stone-600 uppercase tracking-wider cursor-pointer hover:bg-stone-100 transition-colors"
                  style={{ width: col.width }}
                  onClick={() => handleSort(col.field)}
                >
                  <div className="flex items-center gap-2">
                    {col.headerName}
                    {col.sortable !== false && col.field && (
                      <span className="text-stone-400">
                        {sortConfig?.key === col.field ? (
                          sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 bg-white">
            {paginatedData.map((row, rowIdx) => (
              <tr
                key={row.id || rowIdx}
                className={`hover:bg-stone-50 transition-colors cursor-pointer ${onRowClick ? 'active:bg-stone-100' : ''}`}
                onClick={() => onRowClick?.(row)}
              >
                {rowSelection?.checkboxes && (
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="rounded border-stone-300 text-stone-600 focus:ring-stone-500"
                      checked={row.id !== undefined && selectedIds.has(row.id)}
                      onChange={() => row.id !== undefined && toggleSelectRow(row.id)}
                    />
                  </td>
                )}
                {columns.map((col, colIdx) => (
                  <td key={colIdx} className="px-4 py-3 text-sm text-stone-700 whitespace-nowrap">
                    {col.cellRenderer 
                      ? col.cellRenderer({ data: row, value: col.field ? row[col.field] : undefined })
                      : col.field ? (row[col.field] as any)?.toString() : ''}
                  </td>
                ))}
              </tr>
            ))}
            {paginatedData.length === 0 && (
              <tr>
                <td colSpan={columns.length + (rowSelection?.checkboxes ? 1 : 0)} className="px-4 py-12 text-center text-stone-400 text-sm">
                  Kayıt bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <div className="text-xs text-stone-500">
            Sayfa {currentPage} / {totalPages}
          </div>
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
              className="p-2 hover:bg-stone-100 rounded-lg disabled:opacity-30 transition-colors"
            >
              <ChevronsLeft className="w-4 h-4 text-stone-600" />
            </button>
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="p-2 hover:bg-stone-100 rounded-lg disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-stone-600" />
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="p-2 hover:bg-stone-100 rounded-lg disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-stone-600" />
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(totalPages)}
              className="p-2 hover:bg-stone-100 rounded-lg disabled:opacity-30 transition-colors"
            >
              <ChevronsRight className="w-4 h-4 text-stone-600" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

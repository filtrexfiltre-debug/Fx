import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { GridColumnDef } from '../../types';

interface AgDataGridProps<T> {
  id: string;
  data: T[];
  columns: GridColumnDef<T>[];
  keyField?: keyof T | string;
  showSearch?: boolean;
  toolbarLeftContent?: React.ReactNode;
  searchTerm?: string;
  onSearchChange?: (val: string) => void;
  onRowClick?: (row: T) => void;
}

export function AgDataGrid<T extends { id?: string | number; [key: string]: any }>({
  id,
  data,
  columns,
  keyField = 'id',
  showSearch = false,
  toolbarLeftContent,
  searchTerm: propSearchTerm,
  onSearchChange: propOnSearchChange,
  onRowClick,
}: AgDataGridProps<T>) {
  const [localSearch, setLocalSearch] = useState('');
  const isControlled = propSearchTerm !== undefined;
  const searchTerm = isControlled ? propSearchTerm : localSearch;
  const setSearchTerm = (val: string) => {
    if (isControlled) {
      propOnSearchChange?.(val);
    } else {
      setLocalSearch(val);
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Local filtering if search is enabled
  const filteredData = useMemo(() => {
    if (!showSearch || !searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase();
    return data.filter((row) =>
      Object.values(row).some(
        (val) => val && val.toString().toLowerCase().includes(term)
      )
    );
  }, [data, searchTerm, showSearch]);

  // Pagination calculations
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const activePage = Math.min(currentPage, totalPages);

  const paginatedData = useMemo(() => {
    const start = (activePage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, activePage, pageSize]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col">
      {/* Top Toolbar */}
      {(showSearch || toolbarLeftContent) && (
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 flex items-center gap-3">
            {toolbarLeftContent}
          </div>

          {showSearch && (
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Ara..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          )}
        </div>
      )}

      {/* Table Container */}
      <div className="overflow-x-auto min-w-full">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`py-3.5 px-4 font-bold ${
                    col.align === 'center'
                      ? 'text-center'
                      : col.align === 'right'
                      ? 'text-right'
                      : 'text-left'
                  }`}
                  style={{
                    width: col.width ? `${col.width}px` : undefined,
                    minWidth: col.minWidth ? `${col.minWidth}px` : undefined,
                  }}
                >
                  {col.headerName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-8 text-slate-400 italic">
                  Kayıt bulunamadı.
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIdx) => {
                const rowKey = row[keyField as string] || rowIdx;
                return (
                  <tr
                    key={rowKey}
                    onClick={() => onRowClick?.(row)}
                    className={`transition-colors ${
                      onRowClick
                        ? 'cursor-pointer hover:bg-indigo-50/60 active:bg-indigo-100/50'
                        : 'hover:bg-slate-50/50'
                    }`}
                  >
                    {columns.map((col, colIdx) => {
                      const value = row[col.field as string];
                      return (
                        <td
                          key={colIdx}
                          className={`py-3 px-4 text-slate-700 ${
                            col.align === 'center'
                              ? 'text-center'
                              : col.align === 'right'
                              ? 'text-right'
                              : 'text-left'
                          }`}
                        >
                          {col.renderCell ? col.renderCell(row) : value !== undefined && value !== null ? String(value) : '-'}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
        <div>
          Toplam <strong className="text-slate-800">{totalItems}</strong> kayıttan{' '}
          <strong className="text-slate-800">
            {totalItems > 0 ? (activePage - 1) * pageSize + 1 : 0}
          </strong>{' '}
          -{' '}
          <strong className="text-slate-800">
            {Math.min(activePage * pageSize, totalItems)}
          </strong>{' '}
          arası gösteriliyor.
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span>Satır Sayısı:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {[5, 10, 20, 25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={activePage === 1}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-white text-slate-600 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer transition-colors"
              title="İlk Sayfa"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={activePage === 1}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-white text-slate-600 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer transition-colors"
              title="Önceki Sayfa"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-2 font-semibold text-slate-700">
              {activePage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={activePage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-white text-slate-600 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer transition-colors"
              title="Sonraki Sayfa"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={activePage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-white text-slate-600 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer transition-colors"
              title="Son Sayfa"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

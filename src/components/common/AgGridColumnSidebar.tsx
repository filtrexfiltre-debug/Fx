import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import { GridApi } from 'ag-grid-community';
import {
  SlidersHorizontal,
  X,
  Eye,
  EyeOff,
  RotateCcw,
  Search,
  Maximize2,
  Save,
  Check,
  Pin,
  Lock,
} from 'lucide-react';

export interface AgGridSidebarToggleBtnProps {
  isOpen?: boolean;
  onClick?: () => void;
  onToggle?: () => void;
  gridApi?: GridApi | null;
  buttonRef?: React.RefObject<HTMLButtonElement | null>;
  className?: string;
}

export const AgGridSidebarToggleBtn: React.FC<AgGridSidebarToggleBtnProps> = ({
  isOpen = false,
  onClick,
  onToggle,
  buttonRef,
  className = '',
}) => {
  const handleClick = () => {
    if (onToggle) onToggle();
    else if (onClick) onClick();
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={handleClick}
      title="Sütunları Göster/Gizle & Görünüm Ayarları"
      aria-label="Sütunları Göster/Gizle"
      className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer shadow-2xs ${
        isOpen
          ? 'bg-indigo-600 text-white border-indigo-700 ring-2 ring-indigo-200'
          : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-200 hover:text-stone-900'
      } ${className}`}
    >
      <SlidersHorizontal className={`w-3.5 h-3.5 ${isOpen ? 'text-white' : 'text-stone-500'}`} />
      <span className="hidden sm:inline">Sütunlar</span>
    </button>
  );
};

export interface AgGridColumnSidebarProps<TData = unknown> {
  gridApi: GridApi<TData> | null | undefined;
  onClose: () => void;
  onSaveGridState?: () => void;
  primaryColIds?: string[];
  sidebarRef?: React.RefObject<HTMLDivElement | null>;
  columnsRevision?: number;
}

interface ColumnItem {
  colId: string;
  headerName: string;
  isVisible: boolean;
  pinned: 'left' | 'right' | null;
  isPrimary: boolean;
  canPin: boolean;
}

export const AgGridColumnSidebar = <TData,>({
  gridApi,
  onClose,
  onSaveGridState,
  primaryColIds = [],
  sidebarRef,
  columnsRevision = 0,
}: AgGridColumnSidebarProps<TData>) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [columns, setColumns] = useState<ColumnItem[]>([]);
  const [isSavedRecently, setIsSavedRecently] = useState(false);
  const saveTimerRef = useRef<number | null>(null);

  const persistGridState = useCallback(() => {
    onSaveGridState?.();
  }, [onSaveGridState]);

  const refreshColumns = useCallback(() => {
    if (!gridApi) return;

    try {
      const allCols = gridApi.getColumns() || [];
      const colItems: ColumnItem[] = allCols
        .map((col) => {
          const colId = col.getColId();
          const colDef = col.getColDef();
          const headerName =
            (typeof colDef.headerName === 'string' && colDef.headerName) ||
            colId;

          const rawPinned = col.isPinned() as any;
          const pinned: 'left' | 'right' | null =
            rawPinned === 'right' ? 'right' : (rawPinned ? 'left' : null);

          const isPrimary = primaryColIds.includes(colId);

          return {
            colId,
            headerName,
            isVisible: isPrimary ? true : col.isVisible(),
            pinned,
            isPrimary,
            canPin: !['ag-Grid-AutoColumn', 'ag-Grid-SelectionColumn'].includes(colId),
          };
        })
        .filter((col) => col.colId && col.colId !== 'ag-Grid-AutoColumn');

      setColumns(colItems);
    } catch (e) {
      console.error('Error refreshing columns in AgGridColumnSidebar:', e);
    }
  }, [gridApi, primaryColIds]);

  useEffect(() => {
    refreshColumns();
  }, [refreshColumns, columnsRevision]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const toggleColumnVisibility = useCallback(
    (colId: string, currentVisible: boolean) => {
      if (!gridApi) return;

      const targetColumn = columns.find((item) => item.colId === colId);
      if (targetColumn?.isPrimary) {
        return; // Primary columns cannot be hidden
      }

      const newVisible = !currentVisible;

      gridApi.setColumnsVisible([colId], newVisible);
      setColumns((prev) =>
        prev.map((item) =>
          item.colId === colId ? { ...item, isVisible: newVisible } : item
        )
      );
      persistGridState();
    },
    [columns, gridApi, persistGridState]
  );

  const showAllColumns = useCallback(() => {
    if (!gridApi) return;

    const allIds = columns.map((column) => column.colId);
    gridApi.setColumnsVisible(allIds, true);

    setColumns((prev) =>
      prev.map((column) => ({
        ...column,
        isVisible: true,
      }))
    );

    persistGridState();
  }, [columns, gridApi, persistGridState]);

  const hideNonPrimaryColumns = useCallback(() => {
    if (!gridApi) return;

    const primaryIds = columns
      .filter((column) => column.isPrimary)
      .map((column) => column.colId);

    const nonPrimaryIds = columns
      .filter((column) => !column.isPrimary)
      .map((column) => column.colId);

    if (primaryIds.length > 0) {
      gridApi.setColumnsVisible(primaryIds, true);
    }

    if (nonPrimaryIds.length > 0) {
      gridApi.setColumnsVisible(nonPrimaryIds, false);
    }

    setColumns((prev) =>
      prev.map((column) => ({
        ...column,
        isVisible: column.isPrimary ? true : false,
      }))
    );

    persistGridState();
  }, [columns, gridApi, persistGridState]);

  const resetColumns = useCallback(() => {
    if (!gridApi) return;

    gridApi.resetColumnState();
    requestAnimationFrame(() => {
      gridApi.sizeColumnsToFit();
    });

    refreshColumns();
    persistGridState();
  }, [gridApi, persistGridState, refreshColumns]);

  const fitColumns = useCallback(() => {
    if (!gridApi) return;

    requestAnimationFrame(() => {
      gridApi.sizeColumnsToFit();
    });
  }, [gridApi]);

  const togglePin = useCallback(
    (colId: string, currentPin: 'left' | 'right' | null) => {
      if (!gridApi) return;

      const normalizedCurrentPin =
        currentPin === 'left' || currentPin === 'right' ? currentPin : null;

      const nextPin: 'left' | null =
        normalizedCurrentPin === 'left' ? null : 'left';

      gridApi.setColumnsPinned([colId], nextPin);
      setColumns((prev) =>
        prev.map((item) =>
          item.colId === colId
            ? { ...item, pinned: nextPin }
            : item
        )
      );

      persistGridState();
    },
    [gridApi, persistGridState]
  );

  const handleSave = useCallback(() => {
    persistGridState();

    setIsSavedRecently(true);

    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      setIsSavedRecently(false);
    }, 2000);
  }, [persistGridState]);

  const filteredColumns = useMemo(() => {
    if (!searchTerm.trim()) return columns;

    const query = searchTerm.toLowerCase();
    return columns.filter(
      (column) =>
        column.headerName.toLowerCase().includes(query) ||
        column.colId.toLowerCase().includes(query)
    );
  }, [columns, searchTerm]);

  const visibleCount = columns.filter((column) => column.isVisible).length;

  return (
    <aside
      ref={sidebarRef}
      aria-label="Sütun Özelleştirme"
      className="w-72 sm:w-80 bg-white border-l border-stone-200 flex flex-col h-full shrink-0 shadow-lg z-20 animate-in slide-in-from-right-2 duration-150 select-none"
    >
      <div className="p-3.5 bg-stone-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
          <h3 className="font-bold text-xs tracking-wide">Sütunları Özelleştir</h3>
        </div>

        <div className="flex items-center gap-1.5">
          {onSaveGridState && (
            <button
              type="button"
              onClick={handleSave}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                isSavedRecently
                  ? 'bg-emerald-600 text-white'
                  : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
              }`}
              title="Görünümü Varsayılan Olarak Kaydet"
            >
              {isSavedRecently ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              <span className="text-[10px]">{isSavedRecently ? 'Kaydedildi' : 'Kaydet'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="p-1 text-stone-400 hover:text-white rounded-md hover:bg-stone-800 transition-colors cursor-pointer"
            title="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-3 border-b border-stone-200 bg-stone-50/70 space-y-2.5">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Sütun adı veya alan kodu ile ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-stone-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-stone-400"
            aria-label="Sütun ara"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs"
              aria-label="Aramayı temizle"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center justify-between text-[11px] gap-1 flex-wrap">
          <button
            type="button"
            onClick={showAllColumns}
            className="px-2 py-1 bg-white hover:bg-stone-100 text-stone-700 rounded border border-stone-200 transition-colors font-medium cursor-pointer"
          >
            Tümünü Aç
          </button>

          <button
            type="button"
            onClick={hideNonPrimaryColumns}
            className="px-2 py-1 bg-white hover:bg-stone-100 text-stone-700 rounded border border-stone-200 transition-colors font-medium cursor-pointer"
          >
            Sadece Temel
          </button>

          <button
            type="button"
            onClick={fitColumns}
            className="px-2 py-1 bg-white hover:bg-stone-100 text-stone-700 rounded border border-stone-200 transition-colors font-medium cursor-pointer inline-flex items-center gap-1"
            title="Sütunları Tablo Genişliğine Sığdır"
          >
            <Maximize2 className="w-3 h-3 text-stone-500" />
            <span>Sığdır</span>
          </button>

          <button
            type="button"
            onClick={resetColumns}
            className="px-2 py-1 bg-white hover:bg-stone-100 text-stone-700 rounded border border-stone-200 transition-colors font-medium cursor-pointer inline-flex items-center gap-1"
            title="Sütun Düzenini Sıfırla"
          >
            <RotateCcw className="w-3 h-3 text-stone-500" />
            <span>Sıfırla</span>
          </button>
        </div>

        <div className="flex items-center justify-between text-[10px] text-stone-500 font-medium">
          <span>Görünür Sütun: {visibleCount} / {columns.length}</span>
          <span>{filteredColumns.length} listelendi</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-stone-100">
        {filteredColumns.map((col) => {
          const isLeftPinned = col.pinned === 'left';

          return (
            <div
              key={col.colId}
              className={`flex items-center justify-between p-2 rounded-lg text-xs transition-colors group ${
                col.isVisible
                  ? 'hover:bg-indigo-50/50 bg-white'
                  : 'bg-stone-50/70 text-stone-400'
              }`}
            >
              <label className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={col.isVisible}
                  disabled={col.isPrimary}
                  onChange={() => toggleColumnVisibility(col.colId, col.isVisible)}
                  className="rounded border-stone-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label={`${col.headerName} görünürlüğü`}
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`truncate font-medium text-xs ${
                        col.isVisible ? 'text-stone-900' : 'text-stone-400 line-through'
                      }`}
                    >
                      {col.headerName}
                    </span>

                    {col.isPrimary && (
                      <span className="px-1 py-0.2 text-[9px] font-semibold bg-amber-100 text-amber-800 rounded shrink-0">
                        Zorunlu
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] font-mono text-stone-400 block truncate">
                    {col.colId}
                  </span>
                </div>
              </label>

              <div className="flex items-center gap-1 shrink-0 ml-1">
                <button
                  type="button"
                  onClick={() => {
                    if (col.canPin) {
                      togglePin(col.colId, col.pinned);
                    }
                  }}
                  title={isLeftPinned ? 'Sabitlemeyi Kaldır' : 'Sola Sabitle'}
                  aria-label={isLeftPinned ? 'Sabitlemeyi Kaldır' : 'Sola Sabitle'}
                  disabled={!col.canPin}
                  className={`p-1 rounded transition-colors cursor-pointer ${
                    isLeftPinned
                      ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
                      : 'text-stone-300 hover:text-stone-600 opacity-0 group-hover:opacity-100'
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <Pin className="w-3.5 h-3.5" />
                </button>

                <div
                  className="p-1 rounded text-stone-400 select-none"
                  title={col.isVisible ? 'Görünür' : 'Gizli'}
                >
                  {col.isVisible ? (
                    <Eye className="w-3.5 h-3.5 text-stone-600" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5 text-stone-400" />
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredColumns.length === 0 && (
          <div className="p-4 text-center text-xs text-stone-400">
            Aramaya uygun sütun bulunamadı.
          </div>
        )}
      </div>

      <div className="p-2.5 bg-stone-100 border-t border-stone-200 text-[10px] text-stone-500 flex items-center justify-between">
        <span className="flex items-center gap-1">
          <Lock className="w-3 h-3 text-stone-400" /> Otomatik senkronize
        </span>

        <button
          type="button"
          onClick={onClose}
          className="text-stone-600 hover:text-stone-900 font-semibold cursor-pointer"
        >
          Kapat
        </button>
      </div>
    </aside>
  );
};

export default AgGridColumnSidebar;

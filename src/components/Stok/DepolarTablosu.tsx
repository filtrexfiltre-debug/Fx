import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus,
  Search,
  Warehouse as WarehouseIcon,
  MapPin,
  User,
  Building,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Edit2,
  Trash2,
  X,
  Check,
  Download,
  Boxes,
  ShieldCheck,
} from 'lucide-react';
import { downloadCsv } from '../../lib/exportUtils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Warehouse, WarehouseStock } from '../../types/fx';
import { GridApi } from 'ag-grid-community';
import { api, branchContext } from '../../services/api';
import { DataTable } from '../common/DataTable';


const STORAGE_GRID_KEY = 'fx_warehouses_grid_state_v1';

interface DepolarTablosuProps {
  onRefreshStats?: () => void;
}

export const DepolarTablosu: React.FC<DepolarTablosuProps> = ({ onRefreshStats }) => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseStocks, setWarehouseStocks] = useState<WarehouseStock[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [quickFilterText, setQuickFilterText] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [gridApi, setGridApi] = useState<GridApi<Warehouse> | null>(null);

  // Yan Panel Kolon Özelleştirme State (Cari Hesaplar Standardı)
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const sidebarButtonRef = useRef<HTMLButtonElement>(null);

  // Modal Durumu
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form State (Kullanıcının talep ettiği tüm alanlar)
  const [formData, setFormData] = useState({
    warehouseCode: '',
    warehouseType: 'Merkez Depo',
    name: '',
    managerName: '',
    branchRegion: 'Marmara / İstanbul',
    status: 'ACTIVE' as 'ACTIVE' | 'PASSIVE' | 'MAINTENANCE',
    addressLine: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const whRes = await api.getWarehouses();
      const wsRes = await api.getWarehouseStocks();
      if (whRes.success) setWarehouses(whRes.data);
      if (wsRes.success) setWarehouseStocks(wsRes.data);
      if (onRefreshStats) onRefreshStats();
    } catch (e) {
      console.error('Depolar yüklenirken hata:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    return branchContext.subscribe(loadData);
  }, []);

  const handleOpenCreateModal = () => {
    setEditingWarehouse(null);
    setFormData({
      warehouseCode: `DEP-${Math.floor(100 + Math.random() * 900)}`,
      warehouseType: 'Bölge Ana Depo',
      name: '',
      managerName: '',
      branchRegion: 'Marmara / İstanbul',
      status: 'ACTIVE',
      addressLine: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (wh: Warehouse) => {
    setEditingWarehouse(wh);
    setFormData({
      warehouseCode: wh.warehouseCode,
      warehouseType: wh.warehouseType,
      name: wh.name,
      managerName: wh.managerName || '',
      branchRegion: wh.branchRegion || '',
      status: wh.status,
      addressLine: wh.addressLine || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`"${name}" deposunu sistemden silmek istediğinize emin misiniz?`)) return;
    try {
      const res = await api.deleteWarehouse(id);
      if (res.success) {
        setFeedback({ type: 'success', message: res.message || 'Depo silindi.' });
        loadData();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Depo silinemedi.' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.warehouseCode || !formData.warehouseType || !formData.name) {
      alert('Lütfen Depo Kodu, Depo Türü ve Depo Adı alanlarını doldurunuz.');
      return;
    }

    try {
      if (editingWarehouse) {
        const res = await api.updateWarehouse(editingWarehouse.id, formData);
        if (res.success) {
          setFeedback({ type: 'success', message: res.message || 'Depo güncellendi.' });
        }
      } else {
        const res = await api.createWarehouse({ ...formData, tenantId: 'tenant-1' });
        if (res.success) {
          setFeedback({ type: 'success', message: res.message || 'Yeni depo açıldı.' });
        }
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Kayıt sırasında bir sorun oluştu.');
    }
  };

  // Kolon Tanımları
  const columns = useMemo(() => [
    {
      field: 'warehouseCode' as keyof Warehouse,
      headerName: 'Depo Kodu',
      width: 150,
      cellRenderer: (params: { data: Warehouse; value: any }) => {
        return (
          <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded">
            {params.value}
          </span>
        );
      },
    },
    {
      field: 'name' as keyof Warehouse,
      headerName: 'Depo Adı & Lokasyon',
      width: 240,
      cellRenderer: (params: { data: Warehouse; value: any }) => {
        const d = params.data;
        return (
          <div className="flex flex-col justify-center h-full py-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900">
              <WarehouseIcon className="w-3.5 h-3.5 text-indigo-600" />
              <span>{d.name}</span>
            </div>
            {d.addressLine && (
              <div className="text-[11px] text-stone-500 truncate flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                <span className="truncate">{d.addressLine}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      field: 'warehouseType' as keyof Warehouse,
      headerName: 'Depo Türü',
      width: 160,
      cellRenderer: (params: { data: Warehouse; value: any }) => (
        <span className="inline-flex items-center text-xs font-medium text-stone-700 bg-stone-100 px-2 py-0.5 rounded">
          {params.value}
        </span>
      ),
    },
    {
      field: 'managerName' as keyof Warehouse,
      headerName: 'Depo Sorumlusu',
      width: 170,
      cellRenderer: (params: { data: Warehouse; value: any }) => {
        const val = params.value;
        return (
          <div className="flex items-center gap-1.5 text-xs text-stone-800">
            <User className="w-3.5 h-3.5 text-stone-400" />
            <span>{val || 'Atanmadı'}</span>
          </div>
        );
      },
    },
    {
      field: 'branchRegion' as keyof Warehouse,
      headerName: 'Şube Bölge',
      width: 160,
      cellRenderer: (params: { data: Warehouse; value: any }) => (
        <div className="flex items-center gap-1 text-xs text-stone-700">
          <Building className="w-3.5 h-3.5 text-stone-400" />
          <span>{params.value || '-'}</span>
        </div>
      ),
    },
    {
      field: 'status' as keyof Warehouse,
      headerName: 'Durum',
      width: 130,
      cellRenderer: (params: { data: Warehouse; value: any }) => {
        const st = params.value;
        if (st === 'ACTIVE') {
          return (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Aktif
            </span>
          );
        }
        if (st === 'MAINTENANCE') {
          return (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              Bakımda
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-stone-600 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded">
            <XCircle className="w-3 h-3 text-stone-400" />
            Pasif
          </span>
        );
      },
    },
    {
      headerName: 'İşlemler',
      width: 110,
      cellRenderer: (params: { data: Warehouse; value: any }) => {
        const wh = params.data;
        return (
          <div className="flex items-center gap-1 h-full">
            <button
              onClick={(e) => { e.stopPropagation(); handleOpenEditModal(wh); }}
              className="p-1.5 text-stone-500 hover:text-indigo-600 hover:bg-stone-100 rounded transition-colors"
              title="Depo Düzenle"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(wh.id, wh.name); }}
              className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
              title="Depo Sil"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      },
    },
  ], []);

  const filteredWarehouses = useMemo(() => {
    return warehouses.filter(w => {
      const matchStatus = statusFilter === 'ALL' || w.status === statusFilter;
      const matchQuick = !quickFilterText ||
        w.name.toLowerCase().includes(quickFilterText.toLowerCase()) ||
        w.warehouseCode.toLowerCase().includes(quickFilterText.toLowerCase()) ||
        (w.managerName && w.managerName.toLowerCase().includes(quickFilterText.toLowerCase())) ||
        (w.branchRegion && w.branchRegion.toLowerCase().includes(quickFilterText.toLowerCase()));
      return matchStatus && matchQuick;
    });
  }, [warehouses, statusFilter, quickFilterText]);

  const exportToExcel = () => {
    const data = filteredWarehouses.map(w => ({
      'Depo Kodu': w.warehouseCode,
      'Depo Türü': w.warehouseType,
      'Depo Adı': w.name,
      'Depo Sorumlusu': w.managerName || '',
      'Şube Bölge': w.branchRegion || '',
      'Durum': w.status === 'ACTIVE' ? 'Aktif' : w.status === 'MAINTENANCE' ? 'Bakımda' : 'Pasif',
      'Adres': w.addressLine || '',
    }));
    downloadCsv(`Depolar_Listesi_${new Date().toISOString().slice(0, 10)}.csv`, data);
  };

  const exportToPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('FX Enterprise ERP - Depolar Listesi', 14, 15);
    doc.setFontSize(9);
    doc.text(`Tarih: ${new Date().toLocaleString('tr-TR')} | Depo Sayısı: ${filteredWarehouses.length}`, 14, 22);

    const body = filteredWarehouses.map(w => [
      w.warehouseCode,
      w.warehouseType,
      w.name,
      w.managerName || '-',
      w.branchRegion || '-',
      w.status === 'ACTIVE' ? 'Aktif' : w.status === 'MAINTENANCE' ? 'Bakımda' : 'Pasif',
    ]);

    autoTable(doc, {
      head: [['Depo Kodu', 'Depo Türü', 'Depo Adı', 'Sorumlu', 'Şube Bölge', 'Durum']],
      body,
      startY: 26,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [49, 46, 129] },
    });

    doc.save(`Depolar_Listesi_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="space-y-3">
      {/* Feedback Bildirimi */}
      {feedback && (
        <div
          className={`p-3 rounded-lg text-xs font-medium flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <X className="w-4 h-4 text-rose-600" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-stone-400 hover:text-stone-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Kontrol ve Filtre Çubuğu */}
      <div className="bg-white border border-stone-200/90 rounded-lg p-3 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="relative min-w-[220px] max-w-xs">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={quickFilterText}
                onChange={(e) => setQuickFilterText(e.target.value)}
                placeholder="Depo adı, kodu, bölge veya sorumlu ara..."
                className="w-full pl-9 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-stone-800"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-md text-xs text-stone-700 cursor-pointer"
            >
              <option value="ALL">Tüm Durumlar ({warehouses.length})</option>
              <option value="ACTIVE">Yalnızca Aktif Depolar</option>
              <option value="MAINTENANCE">Bakımdaki Depolar</option>
              <option value="PASSIVE">Pasif Depolar</option>
            </select>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={exportToExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-md transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>CSV</span>
            </button>

            <button
              onClick={exportToPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-md transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-rose-600" />
              <span>PDF</span>
            </button>

            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Depo Tanımla</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-stone-200/90 rounded-lg shadow-xs overflow-hidden w-full p-4">
        <DataTable
          columns={columns}
          rowData={filteredWarehouses}
          pagination={true}
          paginationPageSize={10}
        />
      </div>

      {/* ========================================================================= */}
      {/* 2. DEPOLAR LİSTESİ FORMU MODALI (Tam Kullanıcı Alanları)                   */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-stone-200 rounded-xl max-w-lg w-full p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
                  <WarehouseIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">
                    {editingWarehouse ? 'Depo Kartını Düzenle' : 'Yeni Depo Lokasyonu Tanımla'}
                  </h3>
                  <p className="text-xs text-stone-400">
                    Depo kodu, türü, yetkilisi, bölgesi ve adres bilgileri
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Depo Kodu <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.warehouseCode}
                    onChange={(e) => setFormData({ ...formData, warehouseCode: e.target.value })}
                    placeholder="Örn: DEP-001"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-md font-mono font-bold uppercase focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Depo Türü <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={formData.warehouseType}
                    onChange={(e) => setFormData({ ...formData, warehouseType: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-md font-medium"
                  >
                    <option value="Merkez Depo">Merkez Depo</option>
                    <option value="Bölge Ana Depo">Bölge Ana Depo</option>
                    <option value="Soğuk Hava Deposu">Soğuk Hava Deposu</option>
                    <option value="E-Ticaret / Hızlı Dağıtım">E-Ticaret / Hızlı Dağıtım</option>
                    <option value="Sanal Depo / Konsinye">Sanal Depo / Konsinye</option>
                    <option value="Yedek Parça Deposu">Yedek Parça Deposu</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Depo Adı <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Örn: İstanbul Ana Lojistik Merkezi"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-md font-medium focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Depo Sorumlusu
                  </label>
                  <input
                    type="text"
                    value={formData.managerName}
                    onChange={(e) => setFormData({ ...formData, managerName: e.target.value })}
                    placeholder="Örn: Hasan Yılmaz"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-md focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Şube Bölge
                  </label>
                  <input
                    type="text"
                    value={formData.branchRegion}
                    onChange={(e) => setFormData({ ...formData, branchRegion: e.target.value })}
                    placeholder="Örn: Marmara / İstanbul"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-md focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Durum
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-md font-medium"
                >
                  <option value="ACTIVE">Aktif (Kullanıma Açık)</option>
                  <option value="MAINTENANCE">Bakımda / Sayım Yapılıyor</option>
                  <option value="PASSIVE">Pasif (Giriş / Çıkışa Kapalı)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Adres
                </label>
                <textarea
                  rows={2}
                  value={formData.addressLine}
                  onChange={(e) => setFormData({ ...formData, addressLine: e.target.value })}
                  placeholder="Depo açık adresi, antrepo no, il/ilçe..."
                  className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-md focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all shadow-xs cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingWarehouse ? 'Değişiklikleri Kaydet' : 'Depoyu Sisteme Ekle'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

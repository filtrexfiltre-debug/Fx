import React, { useState, useMemo } from 'react';
import {
  Tag,
  Plus,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileText,
  SlidersHorizontal,
  X,
  Save,
  HelpCircle,
} from 'lucide-react';
import { RevenueExpenseCategoryItem, RevenueExpenseType, RevenueExpenseItem } from '../../types/fx';
import { fxApi } from '../../services/api';

interface GelirGiderKategorilerProps {
  categories: RevenueExpenseCategoryItem[];
  items: RevenueExpenseItem[];
  onCategoriesChange: () => void;
}

export const GelirGiderKategoriler: React.FC<GelirGiderKategorilerProps> = ({
  categories,
  items,
  onCategoriesChange,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'ALL' | 'GELIR' | 'GIDER'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<RevenueExpenseCategoryItem | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    type: RevenueExpenseType;
    code: string;
    defaultVat: number;
    description: string;
    isKkegLikely: boolean;
  }>({
    name: '',
    type: 'GELIR',
    code: '',
    defaultVat: 20,
    description: '',
    isKkegLikely: false,
  });

  // Kategori bazlı işlem adetleri ve toplam hacim
  const categoryStats = useMemo(() => {
    const stats: Record<string, { count: number; total: number }> = {};
    items.forEach(item => {
      if (!stats[item.category]) {
        stats[item.category] = { count: 0, total: 0 };
      }
      stats[item.category].count += 1;
      stats[item.category].total += item.grandTotal;
    });
    return stats;
  }, [items]);

  // Sayımlar
  const gelirCount = useMemo(() => categories.filter(c => c.type === 'GELIR').length, [categories]);
  const giderCount = useMemo(() => categories.filter(c => c.type === 'GIDER').length, [categories]);
  const totalCount = categories.length;

  // Filtrelenmiş liste
  const filteredCategories = useMemo(() => {
    let result = [...categories];

    if (activeSubTab !== 'ALL') {
      result = result.filter(c => c.type === activeSubTab);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        c =>
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          (c.description && c.description.toLowerCase().includes(q))
      );
    }

    return result;
  }, [categories, activeSubTab, searchQuery]);

  const handleOpenAdd = (type: RevenueExpenseType = 'GELIR') => {
    setEditingCategory(null);
    setFormData({
      name: '',
      type,
      code: type === 'GELIR' ? '600.01.001' : '770.01.001',
      defaultVat: 20,
      description: '',
      isKkegLikely: false,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (category: RevenueExpenseCategoryItem) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      type: category.type,
      code: category.code,
      defaultVat: category.defaultVat,
      description: category.description || '',
      isKkegLikely: category.isKkegLikely || false,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (category: RevenueExpenseCategoryItem) => {
    if (confirm(`"${category.name}" kategorisini silmek istediğinizden emin misiniz?`)) {
      try {
        await fxApi.deleteRevenueExpenseCategory(category.id);
        setFeedback(`"${category.name}" kategorisi başarıyla silindi.`);
        setTimeout(() => setFeedback(null), 3000);
        onCategoriesChange();
      } catch (err: any) {
        alert(err.message || 'Kategori silinirken hata oluştu.');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Kategori adı zorunludur.');
      return;
    }

    try {
      if (editingCategory) {
        await fxApi.updateRevenueExpenseCategory(editingCategory.id, {
          name: formData.name.trim(),
          type: formData.type,
          code: formData.code.trim(),
          defaultVat: Number(formData.defaultVat),
          description: formData.description.trim(),
          isKkegLikely: formData.isKkegLikely,
        });
        setFeedback(`"${formData.name}" kategorisi güncellendi.`);
      } else {
        await fxApi.createRevenueExpenseCategory({
          name: formData.name.trim(),
          type: formData.type,
          code: formData.code.trim(),
          defaultVat: Number(formData.defaultVat),
          description: formData.description.trim(),
          isKkegLikely: formData.isKkegLikely,
          order: categories.length + 1,
        });
        setFeedback(`"${formData.name}" kategorisi başarıyla eklendi.`);
      }

      setTimeout(() => setFeedback(null), 3000);
      setIsModalOpen(false);
      onCategoriesChange();
    } catch (err: any) {
      alert(err.message || 'Kayıt sırasında hata oluştu.');
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* GERİ BİLDİRİM MESAJI */}
      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{feedback}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ÜST SUB-TABS (KULLANICI TALEBİNE UYGUN GELİR VE GİDER KATEGORİLERİ) */}
      <div className="bg-white border border-stone-200/90 rounded-xl p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Alt Sekmeler */}
        <div className="inline-flex p-1 bg-stone-100 rounded-xl border border-stone-200 text-xs">
          <button
            type="button"
            onClick={() => setActiveSubTab('ALL')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'ALL'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <span>Tüm Kategoriler</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-stone-200 text-stone-700 font-mono">
              {totalCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('GELIR')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'GELIR'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-700 hover:text-emerald-900'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Gelir Kategorileri</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              activeSubTab === 'GELIR' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {gelirCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('GIDER')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'GIDER'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-rose-700 hover:text-rose-900'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Gider Kategorileri</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              activeSubTab === 'GIDER' ? 'bg-rose-700 text-white' : 'bg-rose-100 text-rose-800'
            }`}>
              {giderCount}
            </span>
          </button>
        </div>

        {/* Arama ve Yeni Kategori Ekle */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Kategori veya hesap kodu ara..."
              className="w-full pl-8 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <button
            type="button"
            onClick={() => handleOpenAdd(activeSubTab === 'GIDER' ? 'GIDER' : 'GELIR')}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Yeni Kategori Ekle</span>
          </button>
        </div>
      </div>

      {/* KATEGORİ TABLOSU */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold">
              <tr>
                <th className="py-3 px-4">Kategori Adı & Açıklama</th>
                <th className="py-3 px-3">Türü</th>
                <th className="py-3 px-3">TDHP Hesap Kodu</th>
                <th className="py-3 px-3 text-center">Varsayılan KDV</th>
                <th className="py-3 px-3 text-right">İşlem Adedi</th>
                <th className="py-3 px-3 text-right">Toplam Hacim (₺)</th>
                <th className="py-3 px-3 text-center">Özellik</th>
                <th className="py-3 px-4 text-center">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredCategories.map(cat => {
                const isIncome = cat.type === 'GELIR';
                const stat = categoryStats[cat.name] || { count: 0, total: 0 };

                return (
                  <tr key={cat.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-stone-900 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-stone-400" />
                        <span>{cat.name}</span>
                      </div>
                      {cat.description && (
                        <div className="text-[11px] text-stone-400 mt-0.5 max-w-md truncate">
                          {cat.description}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      {isIncome ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                          <span>GELİR</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                          <ArrowUpRight className="w-3 h-3 text-rose-600" />
                          <span>GİDER</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 font-mono font-bold text-indigo-700">
                      {cat.code}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-700 font-mono text-[11px] font-semibold">
                        %{cat.defaultVat}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-stone-600">
                      {stat.count} kayıt
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold">
                      {stat.total > 0 ? (
                        <span className={isIncome ? 'text-emerald-700' : 'text-rose-700'}>
                          ₺{stat.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-stone-300">-</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-center">
                      {cat.isKkegLikely ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                          KKEG (Vergiden Düşülemez)
                        </span>
                      ) : (
                        <span className="text-[11px] text-stone-400">Standart</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(cat)}
                          className="p-1.5 text-stone-500 hover:text-indigo-600 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                          title="Kategoriyi Düzenle"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(cat)}
                          className="p-1.5 text-stone-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Kategoriyi Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredCategories.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-stone-400 text-xs">
                    Aranan kriterlere uygun kategori bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* YENİ / DÜZENLE MODALI */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-stone-900 text-sm">
                  {editingCategory ? 'Kategoriyi Düzenle' : 'Yeni Kategori Tanımla'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              {/* Kategori Türü */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1.5">İşlem Türü</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData(prev => ({
                        ...prev,
                        type: 'GELIR',
                        code: prev.code.startsWith('7') ? '600.01.001' : prev.code,
                      }))
                    }
                    className={`py-2 px-3 rounded-lg border font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      formData.type === 'GELIR'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                    <span>GELİR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setFormData(prev => ({
                        ...prev,
                        type: 'GIDER',
                        code: prev.code.startsWith('6') ? '770.01.001' : prev.code,
                      }))
                    }
                    className={`py-2 px-3 rounded-lg border font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      formData.type === 'GIDER'
                        ? 'bg-rose-50 border-rose-300 text-rose-800'
                        : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4 text-rose-600" />
                    <span>GİDER</span>
                  </button>
                </div>
              </div>

              {/* Kategori Adı */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Kategori Adı <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Örn: Fabrika Elektrik & Doğalgaz Gideri"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* TDHP Hesap Kodu ve KDV Oranı */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    TDHP Hesap Kodu
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                    placeholder="Örn: 770.02.001"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Varsayılan KDV Oranı
                  </label>
                  <select
                    value={formData.defaultVat}
                    onChange={e => setFormData({ ...formData, defaultVat: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value={0}>%0 (İstisna / KDV'siz)</option>
                    <option value={1}>%1</option>
                    <option value={10}>%10</option>
                    <option value={20}>%20 (Standart)</option>
                  </select>
                </div>
              </div>

              {/* KKEG Durumu */}
              {formData.type === 'GIDER' && (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="font-bold text-amber-900 block">KKEG Kalemi (Vergiden İndirilemez)</span>
                    <span className="text-[10px] text-amber-700">Trafik cezası, gecikme zammı veya kanunen gider yazılamayan harcamalar</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.isKkegLikely}
                    onChange={e => setFormData({ ...formData, isKkegLikely: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                  />
                </div>
              )}

              {/* Açıklama */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Açıklama / Rehber Not</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Kategoriye ait mevzuat veya kullanım notu..."
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 resize-none"
                />
              </div>

              {/* Aksiyon Butonları */}
              <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-stone-200 text-stone-700 rounded-lg hover:bg-stone-50 font-semibold cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{editingCategory ? 'Değişiklikleri Kaydet' : 'Kategoriyi Oluştur'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

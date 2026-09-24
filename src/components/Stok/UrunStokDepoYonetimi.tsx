import React, { useState, useEffect } from 'react';
import {
  Package,
  Warehouse as WarehouseIcon,
  ArrowRightLeft,
  PieChart,
} from 'lucide-react';
import { UrunlerTablosu } from './UrunlerTablosu';
import { DepolarTablosu } from './DepolarTablosu';
import { StokHareketleriTablosu } from './StokHareketleriTablosu';
import { DepoStokDagitimiTablosu } from './DepoStokDagitimiTablosu';
import { api } from '../../services/api';

export type StockSubTab = 'urunler' | 'hareketler' | 'depolar' | 'dagilim';

export const UrunStokDepoYonetimi: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<StockSubTab>('urunler');
  const [stats, setStats] = useState({
    productCount: 0,
    warehouseCount: 0,
    totalStockQty: 0,
    criticalCount: 0,
    totalCost: 0,
  });

  const fetchStats = async () => {
    try {
      const [pRes, wRes, sRes] = await Promise.all([
        api.getProducts(),
        api.getWarehouses(),
        api.getWarehouseStocks(),
      ]);

      const productCount = pRes.success ? pRes.data.length : 0;
      const warehouseCount = wRes.success ? wRes.data.length : 0;
      let totalStockQty = 0;
      let criticalCount = 0;
      let totalCost = 0;

      if (sRes.success) {
        sRes.data.forEach((s) => {
          totalStockQty += s.totalQuantity;
          totalCost += s.totalCostValue;
          if (s.totalQuantity <= s.criticalStockLevel) {
            criticalCount += 1;
          }
        });
      }

      setStats({
        productCount,
        warehouseCount,
        totalStockQty,
        criticalCount,
        totalCost,
      });
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const subTabs: {
    id: StockSubTab;
    title: string;
    badge: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      id: 'urunler',
      title: 'Ürünler',
      badge: `${stats.productCount} Ürün`,
      icon: Package,
    },
    {
      id: 'hareketler',
      title: 'Stok Hareketleri',
      badge: 'Giriş / Çıkış',
      icon: ArrowRightLeft,
    },
    {
      id: 'depolar',
      title: 'Depolar',
      badge: `${stats.warehouseCount} Depo`,
      icon: WarehouseIcon,
    },
    {
      id: 'dagilim',
      title: 'Depo Stok Dağılımı',
      badge: stats.criticalCount > 0 ? `${stats.criticalCount} Kritik` : 'Envanter',
      icon: PieChart,
    },
  ];

  return (
    <div className="space-y-3 max-w-full">
      {/* 4 TABLO GEÇİŞ SEKMELERİ (SUB-TABS) */}
      <div className="bg-white border border-stone-200/90 rounded-xl p-1.5 shadow-xs">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5">
          {subTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-lg text-left transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-stone-50/70 text-stone-700 hover:bg-stone-100/90 border border-stone-200/60'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-white text-stone-600 border border-stone-200/80 shadow-2xs'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold truncate tracking-tight">{tab.title}</span>
                </div>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-md shrink-0 ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : tab.id === 'dagilim' && stats.criticalCount > 0
                      ? 'bg-rose-100 text-rose-700 border border-rose-200'
                      : 'bg-white text-stone-600 border border-stone-200 shadow-2xs'
                  }`}
                >
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SEÇİLİ TABLO İÇERİĞİ */}
      <div className="transition-all duration-200">
        {activeSubTab === 'urunler' && <UrunlerTablosu onRefreshStats={fetchStats} />}
        {activeSubTab === 'hareketler' && <StokHareketleriTablosu onRefreshStats={fetchStats} />}
        {activeSubTab === 'depolar' && <DepolarTablosu onRefreshStats={fetchStats} />}
        {activeSubTab === 'dagilim' && <DepoStokDagitimiTablosu onRefreshStats={fetchStats} />}
      </div>
    </div>
  );
};

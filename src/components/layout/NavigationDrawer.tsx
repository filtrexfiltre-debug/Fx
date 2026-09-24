import React, { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  ArrowRightLeft,
  PieChart,
  ShieldCheck,
  FileCode2,
  ChevronLeft,
  ChevronRight,
  X,
  Boxes,
  Banknote,
  ReceiptText,
  Building2,
  Sparkles,
  Landmark,
  ShoppingBag,
  FileCheck2,
} from 'lucide-react';

export type AppTabType =
  | 'musteri'
  | 'personel'
  | 'stok'
  | 'alis-satis'
  | 'efatura-gib'
  | 'kasa-banka'
  | 'odeme-tahsilat'
  | 'gelir-gider'
  | 'virman'
  | 'vergi'
  | 'moduller'
  | 'kodlar';

interface NavigationDrawerProps {
  activeTab: AppTabType;
  onSelectTab: (tab: AppTabType) => void;
  // Mobil drawer kontrolü
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  // Rail (daraltılmış) durumu
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  currentBranchName?: string;
  isConsolidated?: boolean;
}

interface NavItem {
  id: AppTabType;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  isSystem?: boolean;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  activeTab,
  onSelectTab,
  isMobileOpen,
  setIsMobileOpen,
  isCollapsed,
  setIsCollapsed,
  currentBranchName,
  isConsolidated,
}) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Klavye Escape ile mobil menüyü kapatma desteği
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileOpen) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen, setIsMobileOpen]);

  const navItems: NavItem[] = [
    {
      id: 'musteri',
      label: 'Cari hesaplar & müşteri',
      shortLabel: 'Cariler',
      icon: Users,
    },
    {
      id: 'stok',
      label: 'Ürün & Stok & Depo',
      shortLabel: 'Ürün & Stok & Depo',
      icon: Boxes,
    },
    {
      id: 'alis-satis',
      label: 'Alışlar & satışlar',
      shortLabel: 'Alış/satış',
      icon: ShoppingBag,
    },
    {
      id: 'efatura-gib',
      label: 'E-fatura & GİB merkezi',
      shortLabel: 'GİB e-fatura',
      icon: FileCheck2,
    },
    {
      id: 'personel',
      label: 'Personel yönetimi',
      shortLabel: 'Personel',
      icon: UserCheck,
    },
    {
      id: 'kasa-banka',
      label: 'Kasalar & bankalar',
      shortLabel: 'Kasa/banka',
      icon: Landmark,
    },
    {
      id: 'odeme-tahsilat',
      label: 'Ödemeler & tahsilatlar',
      shortLabel: 'Ödeme/tahsilat',
      icon: Banknote,
    },
    {
      id: 'gelir-gider',
      label: 'Gelirler & giderler',
      shortLabel: 'Gelir/gider',
      icon: ReceiptText,
    },
    {
      id: 'virman',
      label: 'Şubeler arası virman',
      shortLabel: 'Virman',
      icon: ArrowRightLeft,
    },
    {
      id: 'vergi',
      label: 'Resmi vergi dağıtımı',
      shortLabel: 'Vergi P&L',
      icon: PieChart,
    },
    {
      id: 'moduller',
      label: '9 temel modül mimarisi',
      shortLabel: 'Modüller',
      icon: ShieldCheck,
      isSystem: true,
    },
    {
      id: 'kodlar',
      label: 'Kaynak kodlar & API',
      shortLabel: 'Kodlar',
      icon: FileCode2,
      isSystem: true,
    },
  ];

  const handleItemClick = (tabId: AppTabType) => {
    onSelectTab(tabId);
    if (isMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  const drawerContent = (isMobile: boolean = false) => {
    const collapsed = isMobile ? false : isCollapsed;

    return (
      <div className="flex flex-col h-full bg-[#0a101f] text-slate-200 select-none border-r border-slate-800/80 shadow-2xl relative">
        {/* Üst Kısım: Marka Başlığı & Daraltma Aksiyonu */}
        <div
          className={`h-16 flex items-center border-b border-slate-850 px-3.5 transition-all shrink-0 ${
            collapsed ? 'justify-center' : 'justify-between'
          }`}
        >
          {/* Logo & Marka (Geniş Mod veya Mobil) */}
          {(!collapsed || isMobile) && (
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white font-black text-sm flex items-center justify-center shadow-lg shadow-indigo-600/25 shrink-0 ring-1 ring-white/20">
                FX
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-white text-[13px] tracking-tight truncate">
                    FX ENTERPRISE
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 bg-blue-500/15 text-blue-400 rounded-md font-mono font-bold border border-blue-500/25">
                    v9.2
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="truncate font-medium">
                    {isConsolidated ? 'Konsolide Rapor' : currentBranchName || 'Merkez Şube'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Daraltılmış Modda Mini İkon Butonu */}
          {collapsed && !isMobile && (
            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-md shadow-indigo-600/30 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
              title="Menüyü Genişlet"
            >
              FX
            </button>
          )}

          {/* Desktop Daraltma / Genişletme İkonu */}
          {!isMobile && !collapsed && (
            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
              title="Menüyü Daralt"
              aria-label="Menüyü Daralt"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          {/* Mobil Kapatma Butonu */}
          {isMobile && (
            <button
              type="button"
              onClick={() => setIsMobileOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Menüyü Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Orta Navigasyon Listesi (Temiz, Başlıksız, Modern & Ergonomik) */}
        <div className="flex-1 overflow-y-auto py-3 px-2.5 space-y-1 scrollbar-thin scrollbar-thumb-slate-700">
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const showDivider = item.isSystem && idx > 0 && !navItems[idx - 1].isSystem;

            return (
              <React.Fragment key={item.id}>
                {showDivider && (
                  <div className="pt-2">
                    <div className="border-t border-slate-800/60 mb-2" />
                    {(!collapsed || isMobile) && (
                      <div className="px-2.5 pb-1 text-[10px] font-bold text-slate-500/90">
                        Mimari & API
                      </div>
                    )}
                  </div>
                )}

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => handleItemClick(item.id)}
                    onMouseEnter={() => setHoveredItem(item.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                    className={`w-full flex items-center rounded-xl text-left transition-all duration-150 group relative cursor-pointer ${
                      collapsed && !isMobile
                        ? 'justify-center h-10 w-10 mx-auto p-0'
                        : 'h-10 px-3 gap-2.5'
                    } ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-md shadow-blue-600/30'
                        : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                    }`}
                    title={collapsed && !isMobile ? item.label : undefined}
                  >
                    {/* Aktiflik sol çubuğu (rail modunda şık gösterge) */}
                    {isActive && collapsed && !isMobile && (
                      <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-blue-400 rounded-r-md"></span>
                    )}

                    {/* İkon */}
                    <div
                      className={`shrink-0 flex items-center justify-center transition-transform duration-150 ${
                        isActive
                          ? 'scale-105 text-white'
                          : 'text-slate-400 group-hover:text-blue-400 group-hover:scale-105'
                      }`}
                    >
                      <Icon className="w-4.5 h-4.5" />
                    </div>

                    {/* Modül Başlığı (Temiz & Rozetsiz) */}
                    {(!collapsed || isMobile) && (
                      <div className="min-w-0 flex-1 flex items-center">
                        <span className="text-[12.5px] truncate font-medium tracking-tight">
                          {item.label}
                        </span>
                      </div>
                    )}
                  </button>

                  {/* Collapsed Rail Modunda Kayan Modern Tooltip */}
                  {collapsed && !isMobile && hoveredItem === item.id && (
                    <div className="fixed left-[78px] z-50 px-3 py-1.5 bg-[#0f172a] text-white rounded-lg shadow-2xl border border-slate-700/80 text-xs font-semibold whitespace-nowrap pointer-events-none flex items-center gap-2 animate-in fade-in duration-100">
                      <span>{item.label}</span>
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Alt Kısım: Sistem Durumu & Rail Toggle Butonu */}
        <div className="p-2.5 border-t border-slate-850 bg-slate-950/50 shrink-0 space-y-1">
          {(!collapsed || isMobile) && (
            <div className="px-2 py-1 text-[10px] text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                <span>.NET 9 API Aktif</span>
              </span>
              <span className="font-mono text-slate-400 font-semibold">200 OK</span>
            </div>
          )}

          {!isMobile && (
            <button
              type="button"
              onClick={() => setIsCollapsed((prev) => !prev)}
              className="w-full py-1.5 px-2 rounded-lg flex items-center justify-center text-[11px] text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer gap-1.5 font-medium"
              title={collapsed ? 'Menüyü Genişlet' : 'Menüyü Daralt (Rail Görünümü)'}
            >
              {collapsed ? (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              ) : (
                <>
                  <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
                  <span>Menüyü Daralt</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* 1. MASAÜSTÜ: Mini Variant Rail & Drawer (Collapsible) */}
      <aside
        className={`hidden md:block shrink-0 sticky top-0 h-screen transition-[width] duration-300 ease-in-out z-30 ${
          isCollapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        {drawerContent(false)}
      </aside>

      {/* 2. MOBİL: Off-Canvas / Overlay Çekmece Menüsü */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Karartılmış Arka Plan (Backdrop) */}
          <div
            className="fixed inset-0 bg-stone-950/70 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileOpen(false)}
            aria-hidden="true"
          />

          {/* Soldan Kayarak Gelen Çekmece Panel */}
          <div className="fixed inset-y-0 left-0 max-w-xs w-72 bg-[#0a101f] shadow-2xl z-50 transform transition-transform duration-300 ease-out">
            {drawerContent(true)}
          </div>
        </div>
      )}
    </>
  );
};

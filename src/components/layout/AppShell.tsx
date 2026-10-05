import React, { Suspense, useRef, useState } from 'react';
import {
  Building2,
  Lock,
  Unlock,
  Menu,
  ChevronDown,
  Check,
  Search,
  Store,
  MapPin,
} from 'lucide-react';
import { SubeYonetimiModal } from '../ayarlar/SubeYonetimiModal';
import { NavigationDrawer } from './NavigationDrawer';
import type { AppTabType } from './NavigationDrawer';
import type { AuthenticatedUser } from '../../services/api';
import type { Branch } from '../../types/fx';

import { MusteriListesi } from '../Cari/MusteriListesi';
import { PersonelListesi } from '../Personel/PersonelListesi';
import { UrunStokDepoYonetimi } from '../Stok/UrunStokDepoYonetimi';
import { KasaBankaManagement } from '../Kasa-Banka/KasaBankaManagement';
import { OdemeTahsilatManagement } from '../Finans/OdemeTahsilatManagement';
import { GelirGiderManagement } from '../Gelir-Gider/GelirGiderManagement';
import { VirmanTransfer } from '../Kasa-Banka/VirmanTransfer';
import { VergiDagitim } from '../Raporlar/VergiDagitim';
import { AlisSatisManagement } from '../Ticaret/AlisSatisManagement';
import { EfaturaGibManagement } from '../E-fatura/EfaturaGibManagement';
import { ServisManagement } from '../Servis/ServisManagement';
import { ModulesOverview } from './ModulesOverview';
import { CodeExplorer } from './CodeExplorer';

type AppShellProps = {
  activeTab: AppTabType;
  setActiveTab: (tab: AppTabType) => void;
  branches: Branch[];
  selectedBranchId: string;
  currentBranch?: Branch;
  isGlobalUser: boolean;
  onBranchChange: (branchId: string) => void;
  onGlobalUserToggle: () => void;
  currentUser: AuthenticatedUser | null;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onLogout: () => void;
};

export function AppShell({
  activeTab,
  setActiveTab,
  branches,
  selectedBranchId,
  currentBranch,
  isGlobalUser,
  onBranchChange,
  onGlobalUserToggle,
  currentUser,
  isSidebarCollapsed,
  onToggleSidebar,
  onLogout,
}: AppShellProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [branchSearchTerm, setBranchSearchTerm] = useState('');
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const filteredBranches = branches.filter((b) => {
    if (!b.name) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 flex font-sans selection:bg-indigo-100 selection:text-indigo-900 w-full overflow-x-hidden">
      <NavigationDrawer
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={onToggleSidebar}
        currentBranchName={currentBranch?.name}
        isConsolidated={selectedBranchId === 'all'}
      />

      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        <header className="bg-white border-b border-stone-200/90 sticky top-0 z-20 shadow-2xs w-full">
          <div className="w-full px-3 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (window.innerWidth < 768) {
                      setIsMobileOpen(true);
                    } else {
                      onToggleSidebar();
                    }
                  }}
                  className="p-2 rounded-lg text-stone-600 hover:text-indigo-700 hover:bg-stone-100 transition-colors cursor-pointer border border-stone-200/80 shadow-2xs"
                  title={isSidebarCollapsed ? 'Çekmece Menüyü Genişlet' : 'Mini Rail Moduna Daralt'}
                  aria-label="Yan Menü / Hamburger Menü"
                >
                  <Menu className="w-5 h-5" />
                </button>

                <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-lg tracking-wider shadow-xs shrink-0">
                  FX
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-stone-900 tracking-tight">FX ENTERPRISE</span>
                    <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded">
                      .NET 9 + React 19
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                {!isGlobalUser ? (
                  <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-stone-50 text-stone-600 shadow-2xs select-none">
                    <div className="flex items-center justify-center w-7 h-7 rounded-md bg-stone-100 text-stone-500 shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0 pr-1">
                      <span className="text-[9px] font-bold text-stone-400 leading-none mb-0.5">Aktif çalışma şubesi</span>
                      <span className="text-xs font-bold text-stone-800 truncate max-w-[140px] sm:max-w-[210px]">{currentBranch?.name || 'Şube Seçiniz'}</span>
                    </div>
                    <span className="px-1.5 py-0.5 bg-stone-200 text-stone-700 text-[9px] font-bold rounded-md flex items-center gap-0.5 select-none shrink-0">
                      <Lock className="w-2.5 h-2.5" /> KİLİTLİ
                    </span>
                  </div>
                ) : (
                  <div className="relative" ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsBranchDropdownOpen((prev) => !prev)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-left transition-all cursor-pointer shadow-2xs ${
                        isBranchDropdownOpen
                          ? 'bg-indigo-50/90 border-indigo-400 ring-2 ring-indigo-200'
                          : 'bg-white hover:bg-stone-50 border-stone-300 text-stone-900'
                      }`}
                    >
                      <div className="flex items-center justify-center w-7 h-7 rounded-md bg-indigo-100/80 text-indigo-700 shrink-0">
                        {selectedBranchId === 'all' ? (
                          <span className="text-sm">🌐</span>
                        ) : (
                          <Building2 className="w-4 h-4 text-indigo-700" />
                        )}
                      </div>

                      <div className="flex flex-col min-w-0 pr-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-bold text-stone-400">Aktif çalışma şubesi</span>
                          {selectedBranchId === 'all' ? (
                            <span className="px-1 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded">KONSOLİDE</span>
                          ) : currentBranch?.isHeadquarter ? (
                            <span className="px-1 py-0.2 bg-amber-100 text-amber-800 text-[9px] font-bold rounded">HQ</span>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-stone-900 truncate max-w-[140px] sm:max-w-[210px]">
                            {selectedBranchId === 'all'
                              ? '🌐 TÜM ŞUBELER'
                              : `${currentBranch?.name || 'Şube Seçiniz'}`}
                          </span>
                          {selectedBranchId !== 'all' && currentBranch && (
                            <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 px-1 py-0.2 rounded font-semibold shrink-0">
                              {currentBranch.code}
                            </span>
                          )}
                        </div>
                      </div>

                      <ChevronDown
                        className={`w-4 h-4 text-stone-400 transition-transform duration-200 shrink-0 ml-1 ${
                          isBranchDropdownOpen ? 'rotate-180 text-indigo-600' : ''
                        }`}
                      />
                    </button>

                    {isBranchDropdownOpen && (
                      <div className="absolute right-0 top-full mt-2 w-84 sm:w-96 bg-white border border-stone-200 rounded-xl shadow-2xl z-50 overflow-hidden animate-scale-in">
                        <div className="p-3 bg-stone-900 text-white">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5">
                              <Store className="w-4 h-4 text-indigo-400" />
                              <span className="font-bold text-xs tracking-wide">Çalışma Şubesini Seçin</span>
                            </div>
                            <span className="text-[10px] font-mono text-indigo-200 bg-stone-800 px-2 py-0.5 rounded">
                              {branches.length} Şube Kayıtlı
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-300">
                            Cari kartlar, kasa bakiyeleri ve hareketler seçilen şube bazında filtrelenir.
                          </p>

                          <div className="relative mt-2.5">
                            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={branchSearchTerm}
                              onChange={(e) => setBranchSearchTerm(e.target.value)}
                              placeholder="Şube adı, kodu veya şehre göre ara..."
                              className="w-full pl-8 pr-3 py-1.5 text-xs bg-stone-800 text-white placeholder-stone-400 border border-stone-700 rounded-md focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                        </div>

                        <div className="p-2 max-h-72 overflow-y-auto space-y-1 bg-stone-50/50">
                          <button
                            type="button"
                            onClick={() => {
                              onBranchChange('all');
                              setIsBranchDropdownOpen(false);
                            }}
                            className={`w-full text-left p-2.5 rounded-lg flex items-center justify-between text-xs transition-all cursor-pointer border ${
                              selectedBranchId === 'all'
                                ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                                : 'bg-white hover:bg-indigo-50/60 text-stone-900 border-stone-200'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`w-7 h-7 rounded-md flex items-center justify-center text-sm shrink-0 ${
                                  selectedBranchId === 'all' ? 'bg-indigo-700 text-white' : 'bg-stone-100'
                                }`}
                              >
                                🌐
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`font-bold ${
                                      selectedBranchId === 'all' ? 'text-white' : 'text-stone-900'
                                    }`}
                                  >
                                    TÜM ŞUBELER (KONSOLİDE RAPOR)
                                  </span>
                                  <span
                                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                      selectedBranchId === 'all'
                                        ? 'bg-indigo-800 text-indigo-100'
                                        : 'bg-indigo-100 text-indigo-800'
                                    }`}
                                  >
                                    TÜM VERİLER
                                  </span>
                                </div>
                                <p
                                  className={`text-[11px] truncate mt-0.5 ${
                                    selectedBranchId === 'all' ? 'text-indigo-100' : 'text-stone-500'
                                  }`}
                                >
                                  Filtre yok; tüm şubelerin kayıtları birleşik listelenir
                                </p>
                              </div>
                            </div>

                            {selectedBranchId === 'all' && (
                              <Check className="w-4 h-4 text-white shrink-0 ml-2" />
                            )}
                          </button>

                          {filteredBranches
                            .filter((branch) => {
                              const term = branchSearchTerm.toLowerCase();
                              if (!term) return true;
                              return (
                                branch.name.toLowerCase().includes(term) ||
                                branch.code.toLowerCase().includes(term) ||
                                (branch.city && branch.city.toLowerCase().includes(term))
                              );
                            })
                            .map((branch) => {
                              const isSelected = selectedBranchId === branch.id;
                              return (
                                <div
                                  key={branch.id}
                                  onClick={() => {
                                    onBranchChange(branch.id);
                                    setIsBranchDropdownOpen(false);
                                  }}
                                  className={`group w-full p-2.5 rounded-lg flex items-center justify-between text-xs transition-all cursor-pointer border ${
                                    isSelected
                                      ? 'bg-indigo-50 border-indigo-300 text-indigo-950 shadow-2xs'
                                      : 'bg-white hover:bg-stone-100/80 border-stone-200 text-stone-800'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div
                                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                        isSelected ? 'bg-indigo-600 ring-4 ring-indigo-100' : 'bg-stone-300 group-hover:bg-stone-400'
                                      }`}
                                    />
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span
                                          className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                            isSelected
                                              ? 'bg-indigo-600 text-white'
                                              : 'bg-stone-100 text-stone-700'
                                          }`}
                                        >
                                          {branch.code}
                                        </span>
                                        <span
                                          className={`truncate ${
                                            isSelected ? 'font-bold text-indigo-950' : 'font-semibold text-stone-900'
                                          }`}
                                        >
                                          {branch.name}
                                        </span>
                                        {branch.isHeadquarter && (
                                          <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[9px] font-bold rounded">
                                            Merkez / HQ
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-2 text-[10px] text-stone-500 mt-1">
                                        <span className="flex items-center gap-0.5">
                                          <MapPin className="w-3 h-3 text-stone-400" />
                                          {branch.city}
                                        </span>
                                        {branch.address && (
                                          <span className="truncate max-w-[180px] text-stone-400">
                                            &bull; {branch.address}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0 ml-2">
                                    {isSelected ? (
                                      <span className="flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">
                                        <Check className="w-3.5 h-3.5" />
                                        <span>Aktif</span>
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-medium text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                        Seç &rarr;
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {currentUser?.role === 'Patron' && (
                  <button
                    onClick={onGlobalUserToggle}
                    className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                      isGlobalUser
                        ? 'bg-amber-50 text-amber-900 border-amber-300 shadow-2xs'
                        : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                    }`}
                    title="GlobalUser: Şube kilidini kaldırır ve konsolide raporlama sunar"
                  >
                    {isGlobalUser ? (
                      <>
                        <Unlock className="w-3.5 h-3.5 text-amber-600" />
                        <span>Rol: GlobalUser</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5 text-stone-500" />
                        <span>Rol: Şube Yöneticisi</span>
                      </>
                    )}
                  </button>
                )}

                {currentUser && (
                  <div className="flex items-center gap-2.5 pl-3 border-l border-stone-200 shrink-0 animate-fade-in">
                    <div className="hidden sm:flex flex-col text-right">
                      <span className="text-xs font-bold text-stone-800 leading-none mb-1">{currentUser.name}</span>
                      <span className="text-[9px] text-stone-500 font-extrabold uppercase tracking-wider leading-none">
                        {currentUser.role === 'Patron' ? 'Patron' : `Şube Çalışanı (${currentBranch?.code})`}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={onLogout}
                      className="p-1.5 hover:bg-rose-50 text-stone-500 hover:text-rose-600 border border-stone-200 hover:border-rose-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                      title="Sistemden Güvenli Çıkış Yap"
                    >
                      <Lock className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 w-full px-3 sm:px-6 lg:px-8 py-4">
          <Suspense fallback={<div className="flex min-h-64 items-center justify-center text-sm text-stone-500">Modül yükleniyor...</div>}>
            {activeTab === 'musteri' && <MusteriListesi />}
            {activeTab === 'personel' && <PersonelListesi />}
            {activeTab === 'stok' && <UrunStokDepoYonetimi />}
            {activeTab === 'alis-satis' && (
              <AlisSatisManagement currentBranchId={selectedBranchId} branches={branches} />
            )}
            {activeTab === 'efatura-gib' && <EfaturaGibManagement />}
            {activeTab === 'kasa-banka' && (
              <KasaBankaManagement onNavigateToVirman={() => setActiveTab('virman')} />
            )}
            {activeTab === 'odeme-tahsilat' && <OdemeTahsilatManagement />}
            {activeTab === 'gelir-gider' && <GelirGiderManagement />}
            {activeTab === 'virman' && <VirmanTransfer />}
            {activeTab === 'vergi' && <VergiDagitim />}
            {activeTab === 'servis' && <ServisManagement />}
            {activeTab === 'moduller' && <ModulesOverview onSelectTab={setActiveTab} />}
            {activeTab === 'kodlar' && <CodeExplorer />}
          </Suspense>
        </main>

        <footer className="bg-white border-t border-stone-200 text-xs py-3 px-3 sm:px-6 lg:px-8 text-stone-500 w-full">
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px]">
            <div>
              <strong>FX Enterprise Çözüm Mimarisi</strong> &bull; Türk Ticaret Kanunu (TTK) ve VUK Mevzuatına Uyumlu
            </div>
            <div className="font-mono text-stone-400">
              PostgreSQL DDL &bull; .NET 9 (C# 13) Primary Constructors &bull; React 19 AG Grid &bull; Clean Architecture
            </div>
          </div>
        </footer>
      </div>

      <SubeYonetimiModal
        isOpen={false}
        initialTab="list"
        onClose={() => {}}
        onBranchSelect={() => {}}
        onNavigateToKasaBanka={() => {}}
      />
    </div>
  );
}

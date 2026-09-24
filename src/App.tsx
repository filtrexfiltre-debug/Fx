import React, { lazy, Suspense, useState, useEffect, useRef } from 'react';
import {
  Building2,
  Users,
  ArrowRightLeft,
  PieChart,
  ShieldCheck,
  FileCode2,
  Lock,
  Unlock,
  Building,
  Terminal,
  Settings,
  PlusCircle,
  Store,
  ChevronDown,
  Check,
  Plus,
  Pencil,
  MapPin,
  Sparkles,
  SlidersHorizontal,
  Search,
  Menu,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { AuthenticatedUser, fxApi, branchContext } from './services/api';
import { SubeYonetimiModal } from './components/ayarlar/SubeYonetimiModal';
import { NavigationDrawer, AppTabType } from './components/layout/NavigationDrawer';
import { Branch } from './types/fx';

const MusteriListesi = lazy(() => import('./components/Cari/MusteriListesi').then((module) => ({ default: module.MusteriListesi })));
const PersonelListesi = lazy(() => import('./components/Personel/PersonelListesi').then((module) => ({ default: module.PersonelListesi })));
const UrunStokDepoYonetimi = lazy(() => import('./components/Stok/UrunStokDepoYonetimi').then((module) => ({ default: module.UrunStokDepoYonetimi })));
const KasaBankaManagement = lazy(() => import('./components/Kasa-Banka/KasaBankaManagement').then((module) => ({ default: module.KasaBankaManagement })));
const OdemeTahsilatManagement = lazy(() => import('./components/Finans/OdemeTahsilatManagement').then((module) => ({ default: module.OdemeTahsilatManagement })));
const GelirGiderManagement = lazy(() => import('./components/Gelir-Gider/GelirGiderManagement').then((module) => ({ default: module.GelirGiderManagement })));
const VirmanTransfer = lazy(() => import('./components/Kasa-Banka/VirmanTransfer').then((module) => ({ default: module.VirmanTransfer })));
const VergiDagitim = lazy(() => import('./components/Raporlar/VergiDagitim').then((module) => ({ default: module.VergiDagitim })));
const AlisSatisManagement = lazy(() => import('./components/Ticaret/AlisSatisManagement').then((module) => ({ default: module.AlisSatisManagement })));
const EfaturaGibManagement = lazy(() => import('./components/E-fatura/EfaturaGibManagement').then((module) => ({ default: module.EfaturaGibManagement })));
const ModulesOverview = lazy(() => import('./components/layout/ModulesOverview').then((module) => ({ default: module.ModulesOverview })));
const CodeExplorer = lazy(() => import('./components/layout/CodeExplorer').then((module) => ({ default: module.CodeExplorer })));

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTabType>('musteri');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(branchContext.getSelectedBranchId());
  const [isGlobalUser, setIsGlobalUser] = useState<boolean>(branchContext.getIsGlobalUser());
  const [isBranchModalOpen, setIsBranchModalOpen] = useState<boolean>(false);
  const [branchModalInitialTab, setBranchModalInitialTab] = useState<'list' | 'create' | 'edit'>('list');
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState<boolean>(false);
  const [branchSearchTerm, setBranchSearchTerm] = useState<string>('');

  // Çekmece / Navigation Drawer Durumları (Rail & Mobil Çekmece)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('fx_drawer_collapsed') === 'true';
  });
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);

  // Yan menü açık/kapalı durumunu yerel depolamada sakla
  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('fx_drawer_collapsed', String(next));
      return next;
    });
  };
  
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('fx_is_logged_in') === 'true' && Boolean(localStorage.getItem('fx_auth_token'));
  });
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(() => {
    const saved = localStorage.getItem('fx_current_user');
    if (!saved) return null;
    try {
      const parsed = JSON.parse(saved);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      localStorage.removeItem('fx_current_user');
      return null;
    }
  });

  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleLogin = async (email: string, pass: string) => {
    setLoginError(null);
    if (!email || !pass) {
      setLoginError('Lütfen e-posta ve şifrenizi giriniz.');
      return;
    }

    try {
      const { user } = await fxApi.login(email, pass);
      setCurrentUser(user);
      setIsLoggedIn(true);
      const globalUser = user.branchId === 'all';
      setIsGlobalUser(globalUser);
      setSelectedBranchId(user.branchId);
      branchContext.setIsGlobalUser(globalUser);
      branchContext.setSelectedBranchId(user.branchId);
      localStorage.setItem('fx_is_logged_in', 'true');
      localStorage.setItem('fx_current_user', JSON.stringify(user));
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Giriş yapılamadı.');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setLoginEmail('');
    setLoginPassword('');
    localStorage.removeItem('fx_is_logged_in');
    localStorage.removeItem('fx_current_user');
    localStorage.removeItem('fx_auth_token');
  };

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const allBranches = fxApi.getBranches();
    setBranches(allBranches);

    const unsubscribe = branchContext.subscribe(() => {
      setBranches(fxApi.getBranches());
      setSelectedBranchId(branchContext.getSelectedBranchId());
      setIsGlobalUser(branchContext.getIsGlobalUser());
    });

    return () => unsubscribe();
  }, []);

  // Dropdown dışına tıklandığında menüyü kapat
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsBranchDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleBranchChange = (branchId: string) => {
    branchContext.setSelectedBranchId(branchId);
    setSelectedBranchId(branchId);
    setIsBranchDropdownOpen(false);
  };

  const handleGlobalUserToggle = () => {
    const nextVal = !isGlobalUser;
    branchContext.setIsGlobalUser(nextVal);
    setIsGlobalUser(nextVal);
    if (!nextVal && selectedBranchId === 'all') {
      branchContext.setSelectedBranchId(branches[0]?.id || '');
    }
  };

  const openBranchManagementModal = (tab: 'list' | 'create' = 'list') => {
    setBranchModalInitialTab(tab);
    setIsBranchModalOpen(true);
    setIsBranchDropdownOpen(false);
  };

  const currentBranch = branches.find((b) => b.id === selectedBranchId);
  const tenant = fxApi.getCurrentTenant();

  const filteredBranches = branches.filter((b) => {
    if (!branchSearchTerm.trim()) return true;
    const term = branchSearchTerm.toLowerCase();
    return (
      b.name.toLowerCase().includes(term) ||
      b.code.toLowerCase().includes(term) ||
      (b.city && b.city.toLowerCase().includes(term))
    );
  });

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4 sm:p-6 font-sans">
        <div className="w-full max-w-md bg-white border border-stone-200 shadow-xl rounded-2xl overflow-hidden flex flex-col">
          {/* Top Logo / Design */}
          <div className="p-6 sm:p-8 bg-stone-900 text-white flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-2xl tracking-wider shadow-md mb-4 animate-pulse">
              FX
            </div>
            <h1 className="text-xl font-extrabold tracking-tight">FX ENTERPRISE ERP</h1>
            <p className="text-xs text-stone-300 mt-1">{tenant.name}</p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin(loginEmail, loginPassword);
            }}
            className="p-6 sm:p-8 flex flex-col gap-4"
          >
            <h2 className="text-stone-800 text-sm font-bold text-center">Güvenli giriş</h2>
            
            {loginError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-lg">
                {loginError}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-stone-600">E-posta Adresi</label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="ornek@enterprise.com"
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-stone-600">Şifre</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="•••••"
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-sm rounded-lg transition-colors cursor-pointer shadow-md mt-2"
            >
              Giriş Yap
            </button>

          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 flex font-sans selection:bg-indigo-100 selection:text-indigo-900 w-full overflow-x-hidden">
      {/* 1. YAN MENÜ (COLLAPSIBLE RAIL & DRAWER NAVIGATION) */}
      <NavigationDrawer
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isMobileOpen={isMobileDrawerOpen}
        setIsMobileOpen={setIsMobileDrawerOpen}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={handleToggleSidebar}
        currentBranchName={currentBranch?.name}
        isConsolidated={selectedBranchId === 'all'}
      />

      {/* 2. SAĞ ANA KAPSAYICI (HEADER, İÇERİK & FOOTER) */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        {/* ÜST KURUMSAL HEADER (NAVBAR & BRANCH SELECTOR) */}
        <header className="bg-white border-b border-stone-200/90 sticky top-0 z-20 shadow-2xs w-full">
          <div className="w-full px-3 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Sol: Hamburger İkonu & Logo & Marka */}
              <div className="flex items-center gap-2.5 sm:gap-3">
                {/* Hamburger Butonu (Mobilde Çekmeceyi Açar, Masaüstünde Rail Daralt/Genişlet) */}
                <button
                  type="button"
                  onClick={() => {
                    if (window.innerWidth < 768) {
                      setIsMobileDrawerOpen(true);
                    } else {
                      handleToggleSidebar();
                    }
                  }}
                  className="p-2 rounded-lg text-stone-600 hover:text-indigo-700 hover:bg-stone-100 transition-colors cursor-pointer border border-stone-200/80 shadow-2xs"
                  title={
                    isSidebarCollapsed
                      ? 'Çekmece Menüyü Genişlet'
                      : 'Mini Rail Moduna Daralt'
                  }
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

              {/* Orta/Sağ: Aktif Şube Seçici, Şube Yönetimi & Yetki Araçları */}
              <div className="flex items-center gap-2 sm:gap-3">
                {/* 1. AKTİF ÇALIŞMA ŞUBESİ SEÇİCİ */}
                {!isGlobalUser ? (
                  <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-stone-50 text-stone-600 shadow-2xs select-none">
                    <div className="flex items-center justify-center w-7 h-7 rounded-md bg-stone-100 text-stone-500 shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0 pr-1">
                      <span className="text-[9px] font-bold text-stone-400 leading-none mb-0.5">
                        Aktif çalışma şubesi
                      </span>
                      <span className="text-xs font-bold text-stone-800 truncate max-w-[140px] sm:max-w-[210px]">
                        {currentBranch?.name || 'Şube Seçiniz'}
                      </span>
                    </div>
                    <span className="px-1.5 py-0.5 bg-stone-200 text-stone-700 text-[9px] font-bold rounded-md flex items-center gap-0.5 select-none shrink-0">
                      <Lock className="w-2.5 h-2.5" /> KİLİTLİ
                    </span>
                  </div>
                ) : (
                  <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-left transition-all cursor-pointer shadow-2xs ${
                      isBranchDropdownOpen
                        ? 'bg-indigo-50/90 border-indigo-400 ring-2 ring-indigo-200'
                        : 'bg-white hover:bg-stone-50 border-stone-300 text-stone-900'
                    }`}
                    title="Aktif çalışma şubesini değiştirin veya Konsolide Görünüme geçin"
                  >
                    {/* Sol İkon / Aktiflik Göstergesi */}
                    <div className="flex items-center justify-center w-7 h-7 rounded-md bg-indigo-100/80 text-indigo-700 shrink-0">
                      {selectedBranchId === 'all' ? (
                        <span className="text-sm">🌐</span>
                      ) : (
                        <Building2 className="w-4 h-4 text-indigo-700" />
                      )}
                    </div>

                    {/* Şube Bilgisi */}
                    <div className="flex flex-col min-w-0 pr-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-bold text-stone-400">
                          Aktif çalışma şubesi
                        </span>
                        {selectedBranchId === 'all' ? (
                          <span className="px-1 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded">
                            KONSOLİDE
                          </span>
                        ) : currentBranch?.isHeadquarter ? (
                          <span className="px-1 py-0.2 bg-amber-100 text-amber-800 text-[9px] font-bold rounded">
                            HQ
                          </span>
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

                    {/* Açılır Ok İkonu */}
                    <ChevronDown
                      className={`w-4 h-4 text-stone-400 transition-transform duration-200 shrink-0 ml-1 ${
                        isBranchDropdownOpen ? 'rotate-180 text-indigo-600' : ''
                      }`}
                    />
                  </button>

                  {/* AÇILIR ŞUBE SEÇİM LİSTESİ (DROPDOWN) */}
                  {isBranchDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-84 sm:w-96 bg-white border border-stone-200 rounded-xl shadow-2xl z-50 overflow-hidden animate-scale-in">
                      {/* Üst Başlık & Arama */}
                      <div className="p-3 bg-stone-900 text-white">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <Store className="w-4 h-4 text-indigo-400" />
                            <span className="font-bold text-xs tracking-wide">
                              Çalışma Şubesini Seçin
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-indigo-200 bg-stone-800 px-2 py-0.5 rounded">
                            {branches.length} Şube Kayıtlı
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-300">
                          Cari kartlar, kasa bakiyeleri ve hareketler seçilen şube bazında filtrelenir.
                        </p>

                        {/* Arama Kutusu */}
                        <div className="relative mt-2.5">
                          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={branchSearchTerm}
                            onChange={(e) => setBranchSearchTerm(e.target.value)}
                            placeholder="Şube adı, kodu veya şehre göre ara..."
                            className="w-full pl-8 pr-3 py-1.5 text-xs bg-stone-800 text-white placeholder-stone-400 border border-stone-700 rounded-md focus:outline-hidden focus:ring-1 focus:ring-indigo-400"
                          />
                        </div>
                      </div>

                      {/* ŞUBE VE KONSOLİDE SEÇİM ALANI */}
                      <div className="p-2 max-h-72 overflow-y-auto space-y-1 bg-stone-50/50">
                        {/* 1. TÜM ŞUBELER (KONSOLİDE RAPOR) - HER ZAMAN VE HERKESE GÖRÜNÜR! */}
                        <button
                          type="button"
                          onClick={() => handleBranchChange('all')}
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
                                }}}`}
                              >
                                Filtre yok; tüm şubelerin kayıtları birleşik listelenir
                              </p>
                            </div>
                          </div>

                          {selectedBranchId === 'all' && (
                            <Check className="w-4 h-4 text-white shrink-0 ml-2" />
                          )}
                        </button>

                        {/* Ayırıcı Başlık */}
                        <div className="px-2 pt-2 pb-1 flex items-center justify-between text-[10px] font-bold text-stone-400">
                          <span>Tekil şubeler ({filteredBranches.length})</span>
                          <span className="font-mono text-[9px]">X-Selected-Branch-Id</span>
                        </div>

                        {/* ŞUBE KARTLARI */}
                        {filteredBranches.map((b) => {
                          const isSelected = selectedBranchId === b.id;
                          return (
                            <div
                              key={b.id}
                              onClick={() => handleBranchChange(b.id)}
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
                                      {b.code}
                                    </span>
                                    <span
                                      className={`truncate ${
                                        isSelected ? 'font-bold text-indigo-950' : 'font-semibold text-stone-900'
                                      }`}
                                    >
                                      {b.name}
                                    </span>
                                    {b.isHeadquarter && (
                                      <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[9px] font-bold rounded">
                                        Merkez / HQ
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2 text-[10px] text-stone-500 mt-1">
                                    <span className="flex items-center gap-0.5">
                                      <MapPin className="w-3 h-3 text-stone-400" />
                                      {b.city}
                                    </span>
                                    {b.address && (
                                      <span className="truncate max-w-[180px] text-stone-400">
                                        &bull; {b.address}
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

                        {filteredBranches.length === 0 && (
                          <div className="p-4 text-center text-xs text-stone-400 bg-white rounded-lg border border-dashed border-stone-200">
                            Aramaya uygun şube bulunamadı.
                          </div>
                        )}
                      </div>

                      {/* DROPDOWN ALT FOOTER */}
                      <div className="p-2.5 bg-stone-100 border-t border-stone-200 flex items-center justify-between text-xs">
                        <button
                          type="button"
                          onClick={() => openBranchManagementModal('create')}
                          className="inline-flex items-center gap-1 text-indigo-700 hover:text-indigo-900 font-semibold cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Yeni Şube Ekle</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openBranchManagementModal('list')}
                          className="inline-flex items-center gap-1 text-stone-700 hover:text-stone-900 font-semibold cursor-pointer"
                        >
                          <Building className="w-3.5 h-3.5 text-stone-500" />
                          <span>Şube Yönetimi & Mimarisi &rarr;</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                )}



                {/* 4. GlobalUser / Patron Rol Switcher (Sadece Giriş Yapan Patron ise Simüle Edebilmesi İçin) */}
                {currentUser?.role === 'Patron' && (
                  <button
                    onClick={handleGlobalUserToggle}
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

                {/* 6. GÜVENLİ ÇIKIŞ & PROFİL ALANI */}
                {isLoggedIn && currentUser && (
                  <div className="flex items-center gap-2.5 pl-3 border-l border-stone-200 shrink-0 animate-fade-in">
                    <div className="hidden sm:flex flex-col text-right">
                      <span className="text-xs font-bold text-stone-800 leading-none mb-1">{currentUser.name}</span>
                      <span className="text-[9px] text-stone-500 font-extrabold uppercase tracking-wider leading-none">
                        {currentUser.role === 'Patron' ? 'Patron' : `Şube Çalışanı (${currentBranch?.code})`}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleLogout}
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

        {/* ANA İÇERİK ALANI (EKRANA TAM OTURAN TAM GENİŞLİK / FULL-WIDTH) */}
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
            {activeTab === 'moduller' && <ModulesOverview onSelectTab={setActiveTab} />}
            {activeTab === 'kodlar' && <CodeExplorer />}
          </Suspense>
        </main>

        {/* FOOTER */}
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

      {/* ŞUBE YÖNETİMİ (EKLEME / ÇIKARMA / GÖRÜNTÜLEME) MODALI */}
      <SubeYonetimiModal
        isOpen={isBranchModalOpen}
        initialTab={branchModalInitialTab}
        onClose={() => setIsBranchModalOpen(false)}
        onBranchSelect={(branchId) => {
          setSelectedBranchId(branchId);
        }}
        onNavigateToKasaBanka={(branchId) => {
          branchContext.setSelectedBranchId(branchId);
          setSelectedBranchId(branchId);
          setActiveTab('kasa-banka');
        }}
      />
    </div>
  );
}

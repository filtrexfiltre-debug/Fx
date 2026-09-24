import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import {
  Building2,
  Plus,
  Trash2,
  X,
  Check,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Building,
  Users,
  Wallet,
  ShieldCheck,
  Info,
  ArrowRight,
  ShieldAlert,
  Edit2,
  Pencil,
} from 'lucide-react';
import { Branch } from '../../types/fx';
import { fxApi, branchContext } from '../../services/api';
import { TURKEY_CITIES } from '../../data/mockData';

interface SubeYonetimiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBranchSelect?: (branchId: string) => void;
  onNavigateToKasaBanka?: (branchId: string) => void;
  initialTab?: 'list' | 'create' | 'edit';
  initialBranchId?: string;
}

export const SubeYonetimiModal: React.FC<SubeYonetimiModalProps> = ({
  isOpen,
  onClose,
  onBranchSelect,
  onNavigateToKasaBanka,
  initialTab = 'list',
  initialBranchId,
}) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentSelectedBranchId, setCurrentSelectedBranchId] = useState<string>(
    branchContext.getSelectedBranchId()
  );
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'edit'>(initialTab);

  // Yeni & Düzenlenen Şube Form State
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [isHeadquarter, setIsHeadquarter] = useState(false);

  // Geri Bildirim ve Onay State'leri
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [deleteConfirmBranch, setDeleteConfirmBranch] = useState<Branch | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Timeout cleanup ref
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const isMountedRef = useRef(true);

  const setSafeTimeout = useCallback((handler: () => void, timeout?: number) => {
    const id = setTimeout(() => {
      handler();
      timeoutsRef.current = timeoutsRef.current.filter((t) => t !== id);
    }, timeout);

    timeoutsRef.current.push(id);
    return id;
  }, []);

  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach((id) => clearTimeout(id));
    timeoutsRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      clearAllTimeouts();
    };
  }, [clearAllTimeouts]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isSubmitting, onClose]);

  // Tenant bilgisi null kontrolü
  const tenant = fxApi.getCurrentTenant();
  const tenantName = tenant?.name || 'FX Finansal Teknolojiler A.Ş.';
  const tenantTaxNumber = tenant?.taxNumber || '-';
  const tenantShortName = tenant?.name ? tenant.name.split(' ')[0] : 'Sistem';

  const refreshData = useCallback(() => {
    const nextBranches = fxApi.getBranches();
    setBranches(nextBranches);
    setCurrentSelectedBranchId(branchContext.getSelectedBranchId());
  }, []);

  const existingHQ = branches.find((b) => b.isHeadquarter);

  const resetForm = useCallback(() => {
    setEditingBranchId(null);
    setCode('');
    setName('');
    setCity('');
    setAddress('');
    setIsHeadquarter(false);
    setErrorMsg(null);
    setSuccessMsg(null);
  }, []);

  const validateBranchForm = useCallback(
    (excludeBranchId?: string): string | null => {
      const trimmedCode = code.trim().toUpperCase();

      if (!trimmedCode) {
        return 'Lütfen 2-8 karakter uzunluğunda benzersiz bir şube kodu giriniz.';
      }

      if (trimmedCode.length < 2 || trimmedCode.length > 8) {
        return 'Şube kodu 2 ile 8 karakter arasında olmalıdır.';
      }

      if (!/^[A-Z0-9_-]{2,8}$/.test(trimmedCode)) {
        return 'Şube kodu yalnızca büyük harf, rakam, tire (-) veya alt çizgi (_) içerebilir.';
      }

      const duplicateCode = branches.some(
        (branch) =>
          branch.id !== excludeBranchId &&
          branch.code.toUpperCase() === trimmedCode
      );

      if (duplicateCode) {
        return 'Bu şube kodu başka bir şube tarafından kullanılmaktadır.';
      }

      if (!name.trim()) {
        return 'Lütfen şube adını belirtiniz (Örn: Bursa Nilüfer Şubesi).';
      }

      if (!city.trim()) {
        return 'Lütfen şubenin bulunduğu geçerli bir şehri seçiniz.';
      }

      if (!address.trim()) {
        return 'Lütfen şubenin tebligat ve faaliyet adresini giriniz.';
      }

      if (isHeadquarter && existingHQ && existingHQ.id !== excludeBranchId) {
        return `Sistemde zaten aktif bir merkez şube bulunmaktadır: ${existingHQ.name} (${existingHQ.code}).`;
      }

      return null;
    },
    [address, branches, city, code, existingHQ, isHeadquarter, name]
  );

  useEffect(() => {
    isMountedRef.current = true;

    if (isOpen) {
      refreshData();

      if (initialTab === 'edit' && initialBranchId) {
        const branch = fxApi.getBranches().find((b) => b.id === initialBranchId);

        if (branch) {
          setEditingBranchId(branch.id);
          setCode(branch.code);
          setName(branch.name);
          setCity(branch.city || '');
          setAddress(branch.address || '');
          setIsHeadquarter(Boolean(branch.isHeadquarter));
          setErrorMsg(null);
          setSuccessMsg(null);
          setActiveTab('edit');
          return;
        }

        setErrorMsg('Düzenlenecek şube bulunamadı.');
        setActiveTab('list');
        resetForm();
        return;
      }

      setActiveTab(initialTab);
      resetForm();
      setSuccessMsg(null);
      setDeleteConfirmBranch(null);
      return;
    }

    clearAllTimeouts();
  }, [isOpen, initialTab, initialBranchId, refreshData, resetForm, clearAllTimeouts]);

  // Düzenleme Modunu Başlatma
  const handleStartEdit = (branch: Branch) => {
    setEditingBranchId(branch.id);
    setCode(branch.code);
    setName(branch.name);
    setCity(branch.city || '');
    setAddress(branch.address || '');
    setIsHeadquarter(Boolean(branch.isHeadquarter));
    setErrorMsg(null);
    setSuccessMsg(null);
    setActiveTab('edit');
  };

  // Yeni Şube Ekleme İşlemi
  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const validationError = validateBranchForm();

    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    try {
      setIsSubmitting(true);

      const res = await fxApi.createBranch({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        city: city.trim(),
        address: address.trim(),
        isHeadquarter,
      });

      if (!isMountedRef.current) return;

      setSuccessMsg(res.message || 'Yeni şube başarıyla oluşturuldu.');
      refreshData();
      resetForm();

      setSafeTimeout(() => {
        if (isMountedRef.current) {
          setActiveTab('list');
        }
      }, 1200);
    } catch (err: unknown) {
      if (!isMountedRef.current) return;

      const msg =
        err instanceof Error
          ? err.message
          : 'Şube eklenirken bir hata meydana geldi.';
      setErrorMsg(msg);
    } finally {
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  };

  // Şube Güncelleme / İsim Değiştirme İşlemi
  const handleUpdateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBranchId) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    const validationError = validateBranchForm(editingBranchId);

    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    try {
      setIsSubmitting(true);

      const res = await fxApi.updateBranch(editingBranchId, {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        city: city.trim(),
        address: address.trim(),
        isHeadquarter,
      });

      if (!isMountedRef.current) return;

      setSuccessMsg(res.message || 'Şube bilgileri başarıyla güncellendi.');
      refreshData();

      setSafeTimeout(() => {
        if (isMountedRef.current) {
          setActiveTab('list');
          resetForm();
        }
      }, 1000);
    } catch (err: unknown) {
      if (!isMountedRef.current) return;

      const msg =
        err instanceof Error
          ? err.message
          : 'Şube güncellenirken bir hata meydana geldi.';
      setErrorMsg(msg);
    } finally {
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  };

  // Şube Silme / Çıkarma İşlemi
  const handleDeleteBranch = async (branch: Branch) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    // Aktif şubenin silinmesini engelle
    const currentActiveId = branchContext.getSelectedBranchId();
    if (branch.id === currentActiveId || branch.id === currentSelectedBranchId) {
      setErrorMsg(
        'Aktif olarak seçili olan şube sistemden silinemez! Silme işlemi yapabilmek için lütfen önce başka bir şubeye geçiş yapınız.'
      );
      setDeleteConfirmBranch(null);
      return;
    }

    try {
      setIsSubmitting(true);

      const res = await fxApi.deleteBranch(branch.id);

      if (!isMountedRef.current) return;

      setSuccessMsg(res.message || 'Şube başarıyla sistemden çıkarıldı.');
      setDeleteConfirmBranch(null);
      refreshData();
    } catch (err: unknown) {
      if (!isMountedRef.current) return;

      const msg =
        err instanceof Error ? err.message : 'Şube silinemedi.';
      setErrorMsg(msg);
      setDeleteConfirmBranch(null);
    } finally {
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  };

  // Aktif Şubeye Geçiş Yapma
  const handleSwitchBranch = (branchId: string) => {
    branchContext.setSelectedBranchId(branchId);
    setCurrentSelectedBranchId(branchId);

    if (onBranchSelect) {
      onBranchSelect(branchId);
    }

    setSuccessMsg('Aktif şube değiştirildi.');

    setSafeTimeout(() => {
      if (isMountedRef.current) {
        onClose();
      }
    }, 400);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="branch-management-title"
        className="bg-white border border-stone-200 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* MODAL ÜST BAŞLIK */}
        <div className="px-5 sm:px-6 py-4 bg-stone-900 text-white flex items-center justify-between shrink-0 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3
                  id="branch-management-title"
                  className="text-base font-bold text-white tracking-tight"
                >
                  Şube Yönetimi & Organizasyon Mimarisi
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                  {branches.length} Aktif Şube
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                {tenantName} &bull; VKN: {tenantTaxNumber} (TTK Çok Şubeli Konsolide Yapı)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
            title="Kapat"
            aria-label="Modal kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BİLDİRİM VE UYARI MESAJLARI */}
        {errorMsg && (
          <div
            role="alert"
            className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2.5 animate-shake"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{errorMsg}</div>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="text-rose-400 hover:text-rose-700 cursor-pointer"
              aria-label="Hatayı kapat"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {successMsg && (
          <div
            role="status"
            className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2.5"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="flex-1 font-medium">{successMsg}</div>
            <button
              type="button"
              onClick={() => setSuccessMsg(null)}
              className="text-emerald-400 hover:text-emerald-700 cursor-pointer"
              aria-label="Başarı mesajını kapat"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* MODAL İÇERİK SEKMELERİ */}
        <div className="px-6 pt-3 border-b border-stone-200 flex items-center justify-between bg-stone-50/70">
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('list');
                resetForm();
              }}
              className={`pb-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'list'
                  ? 'border-indigo-600 text-indigo-900'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <Building className="w-4 h-4" />
              Mevcut Şubeler ({branches.length})
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('create');
                resetForm();
              }}
              className={`pb-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'create'
                  ? 'border-indigo-600 text-indigo-900'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <Plus className="w-4 h-4 text-indigo-600" />
              Yeni Şube Ekle
            </button>

            {activeTab === 'edit' && (
              <button
                type="button"
                className="pb-3 px-3 text-xs font-semibold border-b-2 border-amber-600 text-amber-900 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Pencil className="w-4 h-4 text-amber-600" />
                Şube Düzenle ({code || '...'})
              </button>
            )}
          </div>

          <div className="text-[11px] text-stone-400 hidden sm:flex items-center gap-1.5 pb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Merkez VKN & Dağıtık Şube Defterleri</span>
          </div>
        </div>

        {/* MODAL GÖVDE */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* TAB 1: MEVCUT ŞUBELER LİSTESİ */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
                <div>
                  <h4 className="text-sm font-bold text-stone-900">
                    Kayıtlı Faal Şubeler
                  </h4>
                  <p className="text-xs text-stone-500">
                    Sistemdeki tüm şubelerin adını güncelleyebilir, cari/kasa durumlarını inceleyebilir ve gerektiğinde şube çıkarabilirsiniz.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('create');
                    resetForm();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Yeni Şube Tanımla
                </button>
              </div>

              {/* ŞUBE KARTLARI LİSTESİ */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {branches.map((b) => {
                  const details = fxApi.getBranchDetails(b.id);
                  const isCurrent = b.id === currentSelectedBranchId;

                  return (
                    <div
                      key={b.id}
                      className={`relative border rounded-xl p-4 transition-all flex flex-col justify-between ${
                        isCurrent
                          ? 'border-indigo-500 bg-indigo-50/40 shadow-xs ring-2 ring-indigo-200/50'
                          : 'border-stone-200/90 bg-white hover:border-stone-300 hover:shadow-xs'
                      }`}
                    >
                      {/* Üst Kısım: Başlık, Kod, Rozet */}
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-800 border border-stone-200">
                              {b.code}
                            </span>
                            {b.isHeadquarter && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-900 border border-amber-300 rounded-full">
                                ★ Merkez Şube (HQ)
                              </span>
                            )}
                            {isCurrent && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-full">
                                <Check className="w-3 h-3 text-indigo-600" />
                                Aktif Seçili
                              </span>
                            )}
                          </div>

                          {/* Aksiyonlar: Düzenle (Kalem) & Sil (Çöp Kutusu) */}
                          <div className="flex items-center gap-1">
                            {/* DÜZENLEME BUTONU */}
                            <button
                              type="button"
                              onClick={() => handleStartEdit(b)}
                              className="text-stone-400 hover:text-amber-600 p-1.5 rounded-md hover:bg-amber-50 transition-colors cursor-pointer"
                              title={`${b.name} bilgilerini ve ismini düzenle`}
                              aria-label={`${b.name} bilgilerini düzenle`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            {/* Sil / Çıkar Butonu: Merkez şube ve aktif kullanımda olan şube silinemez */}
                            {!b.isHeadquarter && (
                              isCurrent ? (
                                <span
                                  className="text-stone-300 p-1.5 cursor-not-allowed"
                                  title="Aktif olarak kullanımda olan şube silinemez. Silmek için önce başka bir şubeye geçiş yapınız."
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmBranch(b)}
                                  className="text-stone-400 hover:text-rose-600 p-1.5 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                                  title={`${b.name} şubesini sistemden çıkar`}
                                  aria-label={`${b.name} şubesini sil`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <h5 className="font-bold text-stone-900 text-sm">{b.name}</h5>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(b)}
                            className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>İsmi Değiştir</span>
                            <Edit2 className="w-2.5 h-2.5" />
                          </button>
                        </div>

                        <div className="flex items-start gap-1.5 mt-1.5 text-xs text-stone-500">
                          <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{b.address || `${b.city} Merkez`}</span>
                        </div>
                      </div>

                      {/* İstatistikler & Aksiyonlar */}
                      <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3 text-stone-600 font-mono text-[11px]">
                          <span className="flex items-center gap-1" title="Kayıtlı Cari Hesap Sayısı">
                            <Users className="w-3.5 h-3.5 text-indigo-500" />
                            <strong>{details.contactsCount}</strong> Cari
                          </span>
                          <span>&bull;</span>
                          <span className="flex items-center gap-1" title="Şube Kasa ve Banka Sayısı">
                            <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                            <strong>{details.cashAccountsCount}</strong> Kasa / Banka
                            {onNavigateToKasaBanka && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onNavigateToKasaBanka(b.id);
                                  onClose();
                                }}
                                className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer ml-1"
                                title="Bu şubenin kasalarını ve bankalarını görüntüle"
                              >
                                (İncele)
                              </button>
                            )}
                          </span>
                        </div>

                        {!isCurrent ? (
                          <button
                            type="button"
                            onClick={() => handleSwitchBranch(b.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-white hover:bg-stone-50 text-indigo-700 border border-indigo-200 rounded-md transition-colors cursor-pointer"
                          >
                            <span>Bu Şubeye Geç</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Kullanımda
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* SİLME ONAY MODALI (CONFIRM DIALOG) */}
              {deleteConfirmBranch && (
                <div
                  role="alertdialog"
                  aria-modal="true"
                  aria-labelledby="delete-branch-title"
                  className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3 animate-scale-in"
                >
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <h5
                        id="delete-branch-title"
                        className="text-sm font-bold text-rose-900"
                      >
                        "{deleteConfirmBranch.name}" Şubesini Çıkarmak İstediğinize Emin misiniz?
                      </h5>
                      <p className="text-xs text-rose-700 mt-1">
                        Şube sistemden çıkarıldığında bu şubeye ait varsayılan kasalar kapatılır. Şubeye bağlı aktif cari veya nakit bakiye varsa mevzuat gereği silme engellenir.
                      </p>
                      {deleteConfirmBranch.id === currentSelectedBranchId && (
                        <p className="text-xs font-bold text-rose-800 mt-1.5 bg-rose-100/70 p-1.5 rounded-md border border-rose-300">
                          Dikkat: Bu şube şu anda aktif seçili şubenizdir ve silinemez. Lütfen önce başka bir şubeye geçiniz.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmBranch(null)}
                      className="px-3 py-1.5 text-xs font-medium text-stone-700 bg-white border border-stone-200 hover:bg-stone-50 rounded-lg cursor-pointer transition-colors"
                    >
                      Vazgeç
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting || deleteConfirmBranch.id === currentSelectedBranchId}
                      onClick={() => handleDeleteBranch(deleteConfirmBranch)}
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs cursor-pointer transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Evet, Şubeyi Çıkar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: YENİ ŞUBE EKLEME FORMU */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreateBranch} className="space-y-5">
              <div className="border-b border-stone-200 pb-3">
                <h4 className="text-sm font-bold text-stone-900">Yeni Şube Tanımlama Formu</h4>
                <p className="text-xs text-stone-500">
                  Şirket bünyesinde yeni açılan mağaza, depo veya satış şubesini sisteme dahil edin.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Şube Kodu */}
                <div>
                  <label
                    htmlFor="create-branch-code"
                    className="block text-xs font-semibold text-stone-700 mb-1"
                  >
                    Şube Kodu <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="create-branch-code"
                    type="text"
                    required
                    maxLength={8}
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="Örn: BURSA, ANTL, KOCL"
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 uppercase"
                  />
                  <span className="text-[10px] text-stone-400 mt-1 block">
                    2-8 karakter alfanümerik kısa kod (fatura serilerinde ve raporlarda kullanılır).
                  </span>
                </div>

                {/* Şube Adı */}
                <div>
                  <label
                    htmlFor="create-branch-name"
                    className="block text-xs font-semibold text-stone-700 mb-1"
                  >
                    Şube Ünvanı / Adı <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="create-branch-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Örn: Bursa Nilüfer Şubesi"
                    className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Şehir Seçimi */}
                <div>
                  <label
                    htmlFor="create-branch-city"
                    className="block text-xs font-semibold text-stone-700 mb-1"
                  >
                    Bulunduğu Şehir (İl) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="create-branch-city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="" disabled>
                      Şehir Seçiniz
                    </option>
                    {TURKEY_CITIES.filter((c) => c.id > 0).map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Merkez Şube mi? */}
                <div className="flex flex-col justify-center">
                  <label className="text-xs font-semibold text-stone-700 mb-1">
                    Şube Statüsü
                  </label>
                  <label
                    htmlFor="create-branch-hq"
                    className="flex items-center gap-2 text-xs text-stone-700 cursor-pointer mt-1"
                  >
                    <input
                      id="create-branch-hq"
                      type="checkbox"
                      checked={isHeadquarter}
                      disabled={Boolean(existingHQ)}
                      onChange={(e) => setIsHeadquarter(e.target.checked)}
                      className="rounded border-stone-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer disabled:opacity-50"
                    />
                    <span>Bu şube Genel Müdürlük / Merkez Şube olarak tanımlansın</span>
                  </label>
                  <span className="text-[10px] text-stone-400 mt-1 block">
                    {existingHQ
                      ? `(Sistemde zaten aktif bir Merkez Şube mevcuttur: ${existingHQ.name} - ${existingHQ.code})`
                      : '(Normalde şirketinizde sadece tek bir Merkez Şube bulunur)'}
                  </span>
                </div>

                {/* Açık Adres */}
                <div className="sm:col-span-2">
                  <label
                    htmlFor="create-branch-address"
                    className="block text-xs font-semibold text-stone-700 mb-1"
                  >
                    Şube Açık Adresi (İlçe, Cadde, No) <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    id="create-branch-address"
                    rows={3}
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Örn: Fethiye Mah. Sanayi Caddesi Kanyon Plaza No:14 Nilüfer / Bursa"
                    className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Otomatik Oluşturulacak Kaynaklar Bilgisi */}
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-600 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-stone-800">Otomatik Kasa Entegrasyonu:</strong>
                  <p className="mt-0.5 text-stone-500 text-[11px]">
                    Şube kaydedildiğinde sistem otomatik olarak bu şubeye ait <strong>"{name || 'Yeni Şube'} - Ana Kasa (TL)"</strong> nakit hesabını 0 ₺ bakiye ile oluşturur. Böylece şube cari tahsilatları ve virman transferleri hemen başlayabilir.
                  </p>
                </div>
              </div>

              {/* Form Butonları */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('list');
                    resetForm();
                  }}
                  className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  {isSubmitting ? 'Kaydediliyor...' : 'Şubeyi Sisteme Kaydet'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: ŞUBE BİLGİLERİNİ / İSMİNİ DÜZENLEME FORMU */}
          {activeTab === 'edit' && (
            <form onSubmit={handleUpdateBranch} className="space-y-5">
              <div className="border-b border-amber-200 pb-3 bg-amber-50/60 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                    <Pencil className="w-4 h-4 text-amber-700" />
                    Şube İsmi & Bilgilerini Güncelle
                  </h4>
                  <p className="text-xs text-amber-800/90 mt-0.5">
                    Şube ünvanı, kodu, şehri veya adresini güncelleyebilirsiniz. Yapılan değişiklikler sistem genelinde anında geçerli olur.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('list');
                    resetForm();
                  }}
                  className="text-xs font-semibold text-stone-600 hover:text-stone-900 bg-white border border-stone-200 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                >
                  Vazgeç
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Şube Adı (İsmi) */}
                <div className="sm:col-span-2">
                  <label
                    htmlFor="edit-branch-name"
                    className="block text-xs font-bold text-stone-800 mb-1"
                  >
                    Şube Ünvanı / Adı <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="edit-branch-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Örn: Bursa Nilüfer Şubesi"
                      className="w-full px-3 py-2.5 text-xs font-semibold text-stone-900 bg-white border-2 border-indigo-400 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      autoFocus
                    />
                  </div>
                  <span className="text-[10px] text-stone-500 mt-1 block">
                    Bu isim navbar'da, cari hesap listelerinde, virman transferlerinde ve e-belgelerde görüntülenir.
                  </span>
                </div>

                {/* Şube Kodu */}
                <div>
                  <label
                    htmlFor="edit-branch-code"
                    className="block text-xs font-semibold text-stone-700 mb-1"
                  >
                    Şube Kodu <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="edit-branch-code"
                    type="text"
                    required
                    maxLength={8}
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="Örn: BURSA, ANTL"
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 uppercase"
                  />
                  <span className="text-[10px] text-stone-400 mt-1 block">
                    2-8 karakter alfanümerik şube kodu.
                  </span>
                </div>

                {/* Şehir Seçimi */}
                <div>
                  <label
                    htmlFor="edit-branch-city"
                    className="block text-xs font-semibold text-stone-700 mb-1"
                  >
                    Bulunduğu Şehir (İl) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="edit-branch-city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="" disabled>
                      Şehir Seçiniz
                    </option>
                    {TURKEY_CITIES.filter((c) => c.id > 0).map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Açık Adres */}
                <div className="sm:col-span-2">
                  <label
                    htmlFor="edit-branch-address"
                    className="block text-xs font-semibold text-stone-700 mb-1"
                  >
                    Şube Açık Adresi (İlçe, Cadde, No) <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    id="edit-branch-address"
                    rows={3}
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Şube açık adresi..."
                    className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Form Butonları */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('list');
                    resetForm();
                  }}
                  className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  {isSubmitting ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                </button>
              </div>
            </form>
          )}

          {/* MEVZUAT VE TEKNİK AÇIKLAMA BİLGİLENDİRME KUTUSU */}
          <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-xl text-xs text-indigo-950 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-indigo-900">
              <ShieldCheck className="w-4 h-4 text-indigo-700" />
              <span>Türk Ticaret Kanunu (TTK) ve VUK Çok Şubeli Konsolide Mimarisi</span>
            </div>
            <p className="text-[11px] text-indigo-800/90 leading-relaxed">
              Tüm şubeler tek bir kurumsal tüzel kişilik ve VKN (<strong>{tenantTaxNumber}</strong>) altında çalışır. Her şube kendi e-Fatura / e-Arşiv serisine ve şube kasa defterine sahiptir. Şubeler arası para ve bakiye transferleri <strong>Virman (CQRS)</strong> modülü üzerinden çift taraflı onay mekanizmasıyla gerçekleşir.
            </p>
          </div>
        </div>

        {/* MODAL ALT ÇUBUĞU */}
        <div className="px-6 py-3 bg-stone-50 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500">
          <span className="font-mono text-[11px]">
            Tenant: {tenantShortName} &bull; {branches.length} Şube Aktif
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-800 hover:bg-stone-900 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
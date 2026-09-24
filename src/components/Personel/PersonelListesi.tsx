import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { appTheme } from '../../lib/agGridTheme';
import { AG_GRID_LOCALE_TR } from '../../lib/agGridLocaleTR';
import {
  ColDef,
  ICellRendererParams,
  GridReadyEvent,
  GridApi,
  RowSelectionOptions,
} from 'ag-grid-community';
import {
  Users,
  UserPlus,
  Search,
  Building2,
  Briefcase,
  Heart,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  GraduationCap,
  Trash2,
  X,
  UserCheck,
  Building,
  ShieldAlert,
  Download,
  RotateCw,
  RefreshCw,
  SlidersHorizontal,
  Check,
  FileText,
  MessageSquare,
  FilePieChart,
  Columns3,
  PanelRightClose,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  Eye,
  Pencil,
  Copy,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Employee, EmployeeAddress, Branch } from '../../types/fx';
import { api, fxApi, branchContext } from '../../services/api';
import { geoService } from '../../services/geoService';
import { TURKEY_CITIES } from '../../data/mockData';
import { AgGridColumnSidebar, AgGridSidebarToggleBtn } from '../common/AgGridColumnSidebar';

const GRID_STORAGE_KEY = 'fx_personel_list_grid_state';

// T.C. Kimlik Numarası Algoritması Doğrulaması (GS1/NVI Standardı)
export const isValidTCKN = (tckn: string): boolean => {
  if (!tckn || tckn.length !== 11) return false;
  if (!/^\d{11}$/.test(tckn)) return false;
  if (tckn[0] === '0') return false;

  const digits = tckn.split('').map(Number);

  // 1, 3, 5, 7, 9. hanelerin toplamı
  const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  // 2, 4, 6, 8. hanelerin toplamı
  const evenSum = digits[1] + digits[3] + digits[5] + digits[7];

  // 10. hane kontrolü: ((oddSum * 7) - evenSum) % 10
  const tenth = ((oddSum * 7) - evenSum) % 10;
  const normalizedTenth = (tenth + 10) % 10;
  if (normalizedTenth !== digits[9]) return false;

  // 11. hane kontrolü: ilk 10 hanenin toplamının mod 10'u
  const first10Sum = digits.slice(0, 10).reduce((acc, curr) => acc + curr, 0);
  if (first10Sum % 10 !== digits[10]) return false;

  return true;
};

// IBAN Doğrulama Yardımcısı
export const isValidIBAN = (iban: string): boolean => {
  const clean = iban.replace(/\s+/g, '').toUpperCase();
  if (!clean) return true; // Opsiyonel ise boş geçilebilir
  if (!clean.startsWith('TR')) return false;
  if (clean.length !== 26) return false;
  return /^TR\d{24}$/.test(clean);
};

// Telefon Numarası Doğrulama Yardımcısı
export const isValidPhone = (phone?: string): boolean => {
  if (!phone || !phone.trim()) return true; // Opsiyonel
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 13;
};

export const PersonelListesi: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filtreleme State'leri
  const [searchInput, setSearchInput] = useState<string>('');
  const [quickFilterText, setQuickFilterText] = useState<string>('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('ALL');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');
  const [selectedEmpTypeFilter, setSelectedEmpTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Geri Bildirim ve Bildirimler (Hata/Başarı)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showFeedback = useCallback((type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  }, []);

  // Arama metni için 300ms Debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setQuickFilterText(searchInput);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // AG Grid & Sidebar States
  const [gridApi, setGridApi] = useState<GridApi<Employee> | null>(null);
  const gridRef = useRef<AgGridReact<Employee>>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [panelSearchTerm, setPanelSearchTerm] = useState<string>('');
  const sidebarRef = useRef<HTMLDivElement>(null);
  const sidebarButtonRef = useRef<HTMLButtonElement>(null);

  // Silme Onay Modalı State
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; data: Employee } | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleCellContextMenu = (event: any) => {
    event.event?.preventDefault();
    if (event.data) {
      setContextMenu({
        x: event.event.clientX,
        y: event.event.clientY,
        data: event.data,
      });
    }
  };

  const handleCopyText = (text: string, label: string) => {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showFeedback('success', `${label} panoya kopyalandı.`);
      }).catch(() => {
        showFeedback('success', `${label} kopyalandı.`);
      });
    } else {
      showFeedback('success', `${label} kopyalandı.`);
    }
  };

  // Adres Tipleri Yönetimi
  const [addressTypes, setAddressTypes] = useState<string[]>([
    'İkametgah Adresi',
    'Tebligat Adresi',
    'Acil Durum Ulaşım Adresi',
    'İş Yeri Adresi',
    'Fatura Adresi',
    'Teslimat Adresi',
    'Depo Adresi',
    'Diğer',
  ]);
  const [isAddressTypeModalOpen, setIsAddressTypeModalOpen] = useState<boolean>(false);
  const [newAddressTypeInput, setNewAddressTypeInput] = useState<string>('');

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [detailEmployee, setDetailEmployee] = useState<Employee | null>(null);
  const [activeTab, setActiveTab] = useState<'personal' | 'job' | 'emergency' | 'address'>('personal');

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    identityNumber: '',
    phoneNumber: '',
    email: '',
    branchId: '',
    department: '',
    title: '',
    bloodGroup: '0 Rh(+)',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: 'Eşi',
    birthDate: '1990-01-01',
    educationLevel: 'Lisans',
    employmentType: 'Tam Zamanlı',
    salary: 0,
    iban: '',
    hireDate: new Date().toISOString().split('T')[0],
    isActive: true,
    addressType: 'İkametgah Adresi',
    isDefaultAddress: true,
    cityId: 34,
    districtName: 'Kadıköy',
    neighborhoodId: '',
    streetLine: '',
    doorNumber: '',
    apartmentNumber: '',
    buildingName: '',
    blockName: '',
    siteName: '',
    formattedAddress: '',
  });

  const [formError, setFormError] = useState<string | null>(null);

  // Telefon Formatlayıcılar
  const formatPhoneDisplay = (raw?: string): string => {
    if (!raw) return '';
    const trimmed = raw.trim();
    let digits = trimmed.replace(/\D/g, '');
    if (digits.startsWith('90')) digits = digits.slice(2);
    else if (digits.startsWith('0')) digits = digits.slice(1);

    if (digits.length === 10) {
      return `+90 (${digits.slice(0, 3)}) ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`;
    }
    return raw;
  };

  const toE164 = (raw?: string): string => {
    if (!raw) return '';
    let digits = raw.replace(/\D/g, '');
    if (digits.startsWith('90')) return `+${digits}`;
    if (digits.startsWith('0')) return `+90${digits.slice(1)}`;
    if (digits.length === 10) return `+90${digits}`;
    return `+${digits}`;
  };

  // Verileri Yükle
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const branchesList = fxApi.getBranches();
      setBranches(branchesList);

      const res = await api.getEmployees({
        branchId: selectedBranchFilter,
        department: selectedDeptFilter,
        employmentType: selectedEmpTypeFilter,
        isActive: statusFilter === 'ACTIVE' ? true : statusFilter === 'PASSIVE' ? false : undefined,
        search: quickFilterText,
      });

      if (res.success && res.data) {
        setEmployees(res.data);
      } else {
        showFeedback('error', res.message || 'Personel listesi yüklenemedi.');
      }
    } catch (err: any) {
      console.error('Personel listesi yüklenemedi:', err);
      showFeedback('error', err?.message || 'Veriler yüklenirken bağlantı hatası oluştu.');
    } finally {
      setLoading(false);
    }
  }, [selectedBranchFilter, selectedDeptFilter, selectedEmpTypeFilter, statusFilter, quickFilterText, showFeedback]);

  useEffect(() => {
    loadData();
    const unsubscribe = branchContext.subscribe(() => {
      loadData();
    });
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [loadData]);

  // Şube Adı Çözücü
  const getBranchName = useCallback(
    (branchId: string) => {
      const found = branches.find((b) => b.id === branchId);
      return found ? found.name : 'Bilinmeyen Şube';
    },
    [branches]
  );

  // Otomatik Adres Metni Oluşturucu
  const computeAddress = useCallback((data: typeof formData | EmployeeAddress) => {
    const parts: string[] = [];
    if ('neighborhoodId' in data && data.neighborhoodId) {
      parts.push(data.neighborhoodId.endsWith('Mah.') || data.neighborhoodId.endsWith('Mahallesi') ? data.neighborhoodId : `${data.neighborhoodId} Mah.`);
    }
    if (data.streetLine) parts.push(data.streetLine);
    if (data.siteName) parts.push(data.siteName);
    if (data.buildingName) parts.push(data.buildingName);
    if (data.blockName) parts.push(data.blockName);

    const doorParts: string[] = [];
    if (data.doorNumber) doorParts.push(`No:${data.doorNumber}`);
    if (data.apartmentNumber) doorParts.push(`D:${data.apartmentNumber}`);
    if (doorParts.length > 0) parts.push(doorParts.join(' '));

    const cityId = 'cityId' in data ? Number(data.cityId) : 34;
    const cityName = TURKEY_CITIES.find((city) => city.id === cityId)?.name || '';
    const district = 'districtName' in data ? data.districtName : ('districtId' in data ? (data as any).districtId : '');
    if (district && cityName) {
      parts.push(`${district} / ${cityName}`);
    } else if (cityName) {
      parts.push(cityName);
    } else if (district) {
      parts.push(district);
    }

    return parts.join(' ');
  }, []);

  const handleOpenGoogleMaps = () => {
    const addr = formData.formattedAddress || computeAddress(formData);
    if (!addr.trim()) {
      showFeedback('error', 'Lütfen haritada aramak için adres bilgilerini doldurunuz.');
      return;
    }
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Coğrafi Veriler (geoService)
  const sortedCities = useMemo(() => {
    return geoService.getCities();
  }, []);

  const currentDistricts = useMemo(() => {
    return geoService.getDistricts(formData.cityId);
  }, [formData.cityId]);

  const currentNeighborhoods = useMemo(() => {
    if (!formData.districtName || formData.cityId === 0) return [];
    return geoService.getNeighborhoods(formData.cityId, formData.districtName);
  }, [formData.cityId, formData.districtName]);

  // Departman Listesi
  const departmentsList = useMemo(() => {
    const depts = new Set<string>();
    employees.forEach((e) => {
      if (e.department) depts.add(e.department);
    });
    return Array.from(depts);
  }, [employees]);

  // İstatistik Hesaplamaları
  const stats = useMemo(() => {
    const total = employees.length;
    const activeCount = employees.filter((e) => e.isActive).length;
    const totalSalary = employees.reduce((sum, e) => sum + (e.salary || 0), 0);
    const avgSalary = total > 0 ? totalSalary / total : 0;
    return { total, activeCount, totalSalary, avgSalary };
  }, [employees]);

  // Yeni Personel Açılışı
  const handleOpenNew = () => {
    setEditingEmployee(null);
    setFormData({
      firstName: '',
      lastName: '',
      identityNumber: '',
      phoneNumber: '',
      email: '',
      branchId: branches[0]?.id || '',
      department: '',
      title: '',
      bloodGroup: '0 Rh(+)',
      emergencyContactName: '',
      emergencyContactPhone: '',
      emergencyContactRelation: 'Eşi',
      birthDate: '1995-01-01',
      educationLevel: 'Lisans',
      employmentType: 'Tam Zamanlı',
      salary: 0,
      iban: '',
      hireDate: new Date().toISOString().split('T')[0],
      isActive: true,
      addressType: 'İkametgah Adresi',
      isDefaultAddress: true,
      cityId: 34,
      districtName: 'Kadıköy',
      neighborhoodId: '',
      streetLine: '',
      doorNumber: '',
      apartmentNumber: '',
      buildingName: '',
      blockName: '',
      siteName: '',
      formattedAddress: '',
    });
    setActiveTab('personal');
    setFormError(null);
    setIsFormOpen(true);
  };

  // Personel Düzenleme Açılışı
  const handleOpenEdit = useCallback((emp: Employee) => {
    setEditingEmployee(emp);
    const firstAddr = emp.addresses && emp.addresses.length > 0 ? emp.addresses[0] : null;
    setFormData({
      firstName: emp.firstName || '',
      lastName: emp.lastName || '',
      identityNumber: emp.identityNumber || '',
      phoneNumber: emp.phoneNumber || '',
      email: emp.email || '',
      branchId: emp.branchId || '',
      department: emp.department || '',
      title: emp.title || '',
      bloodGroup: emp.bloodGroup || '0 Rh(+)',
      emergencyContactName: emp.emergencyContactName || '',
      emergencyContactPhone: emp.emergencyContactPhone || '',
      emergencyContactRelation: emp.emergencyContactRelation || 'Eşi',
      birthDate: emp.birthDate ? emp.birthDate.split('T')[0] : '1990-01-01',
      educationLevel: emp.educationLevel || 'Lisans',
      employmentType: emp.employmentType || 'Tam Zamanlı',
      salary: emp.salary || 0,
      iban: emp.iban || '',
      hireDate: emp.hireDate ? emp.hireDate.split('T')[0] : new Date().toISOString().split('T')[0],
      isActive: emp.isActive ?? true,
      addressType: firstAddr?.addressType || 'İkametgah Adresi',
      isDefaultAddress: firstAddr?.isDefault ?? true,
      cityId: firstAddr?.cityId || 34,
      districtName: firstAddr?.districtName || firstAddr?.districtId || 'Kadıköy',
      neighborhoodId: firstAddr?.neighborhoodId || '',
      streetLine: firstAddr?.streetLine || '',
      doorNumber: firstAddr?.doorNumber || '',
      apartmentNumber: firstAddr?.apartmentNumber || '',
      buildingName: firstAddr?.buildingName || '',
      blockName: firstAddr?.blockName || '',
      siteName: firstAddr?.siteName || '',
      formattedAddress: firstAddr?.formattedAddress || '',
    });
    setActiveTab('personal');
    setFormError(null);
    setIsFormOpen(true);
  }, []);

  // Silme Onaylama ve Yürütme
  const confirmDelete = async () => {
    if (!employeeToDelete) return;
    const emp = employeeToDelete;
    setEmployeeToDelete(null);

    try {
      const res = await api.deleteEmployee(emp.id);
      if (res && res.success) {
        showFeedback('success', `${emp.firstName} ${emp.lastName} isimli personel kaydı başarıyla silindi.`);
        await loadData();
      } else {
        showFeedback('error', res?.message || 'Silme işlemi başarısız oldu.');
      }
    } catch (err: any) {
      showFeedback('error', err?.message || 'Silme işlemi sırasında hata oluştu.');
    }
  };

  // Form Kaydetme / Güncelleme İşlemi
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // 1. İsim / Soyisim Normalizasyonu ve Kontrolü
    const cleanFirstName = formData.firstName.trim();
    const cleanLastName = formData.lastName.trim();

    if (!cleanFirstName || !cleanLastName) {
      setFormError('Lütfen ad ve soyad alanlarını doldurunuz.');
      setActiveTab('personal');
      return;
    }

    // 2. T.C. Kimlik Numarası Algoritma ve Tekillik Kontrolü
    const cleanTckn = formData.identityNumber.trim().replace(/\D/g, '');
    if (!isValidTCKN(cleanTckn)) {
      setFormError('Geçersiz T.C. Kimlik Numarası! Lütfen 11 haneli ve resmi algoritmayı sağlayan bir numara giriniz.');
      setActiveTab('personal');
      return;
    }

    // Başka bir personelde aynı TCKN var mı kontrolü
    const isDuplicate = employees.some(
      (emp) => emp.identityNumber === cleanTckn && (!editingEmployee || emp.id !== editingEmployee.id)
    );
    if (isDuplicate) {
      setFormError('Bu T.C. Kimlik Numarasına sahip başka bir personel zaten kayıtlıdır.');
      setActiveTab('personal');
      return;
    }

    // 3. Şube Kontrolü
    if (!formData.branchId) {
      setFormError('Lütfen personelin görev yapacağı şubeyi seçiniz.');
      setActiveTab('job');
      return;
    }

    // 4. Maaş Kontrolü
    if (formData.salary < 0) {
      setFormError('Net maaş tutarı negatif olamaz.');
      setActiveTab('job');
      return;
    }

    // 5. IBAN Kontrolü ve Normalizasyonu
    const cleanIban = formData.iban.replace(/\s+/g, '').toUpperCase();
    if (cleanIban && !isValidIBAN(cleanIban)) {
      setFormError('Geçersiz IBAN! Türkiye IBAN formatı "TR" ile başlamalı ve toplam 26 karakterden oluşmalıdır.');
      setActiveTab('job');
      return;
    }

    // 6. Telefon Kontrolleri
    if (formData.phoneNumber && !isValidPhone(formData.phoneNumber)) {
      setFormError('Lütfen geçerli bir cep telefonu numarası giriniz.');
      setActiveTab('personal');
      return;
    }
    if (formData.emergencyContactPhone && !isValidPhone(formData.emergencyContactPhone)) {
      setFormError('Lütfen acil durum kişisi için geçerli bir telefon numarası giriniz.');
      setActiveTab('emergency');
      return;
    }

    // 7. Adres Yapılandırması
    const selectedCity = TURKEY_CITIES.find((c) => c.id === Number(formData.cityId));
    const cityName = selectedCity ? selectedCity.name : '';
    const formattedAddress = formData.formattedAddress.trim() || computeAddress(formData);

    const employeeAddress: EmployeeAddress = {
      id: `addr-${Date.now()}`,
      tenantId: api.getCurrentTenant().id,
      employeeId: editingEmployee ? editingEmployee.id : '',
      addressType: formData.addressType,
      cityId: Number(formData.cityId),
      cityName: cityName,
      districtId: formData.districtName,
      districtName: formData.districtName,
      neighborhoodId: formData.neighborhoodId,
      streetLine: formData.streetLine.trim(),
      doorNumber: formData.doorNumber.trim(),
      apartmentNumber: formData.apartmentNumber.trim(),
      buildingName: formData.buildingName.trim(),
      blockName: formData.blockName.trim(),
      siteName: formData.siteName.trim(),
      formattedAddress: formattedAddress,
      isDefault: formData.isDefaultAddress,
    };

    // Mevcut adres listesi koruma (Çoklu adres yönetimi desteği)
    let finalAddresses: EmployeeAddress[] = [];
    if (editingEmployee && editingEmployee.addresses && editingEmployee.addresses.length > 0) {
      const remaining = editingEmployee.addresses.slice(1);
      finalAddresses = [employeeAddress, ...remaining];
    } else {
      finalAddresses = [employeeAddress];
    }

    const payload = {
      firstName: cleanFirstName,
      lastName: cleanLastName,
      identityNumber: cleanTckn,
      phoneNumber: formData.phoneNumber.trim(),
      email: formData.email.trim(),
      branchId: formData.branchId,
      department: formData.department.trim(),
      title: formData.title.trim(),
      bloodGroup: formData.bloodGroup,
      emergencyContactName: formData.emergencyContactName.trim(),
      emergencyContactPhone: formData.emergencyContactPhone.trim(),
      emergencyContactRelation: formData.emergencyContactRelation.trim(),
      birthDate: formData.birthDate,
      educationLevel: formData.educationLevel,
      employmentType: formData.employmentType,
      salary: Number(formData.salary) || 0,
      iban: cleanIban,
      hireDate: formData.hireDate,
      isActive: formData.isActive,
      addresses: finalAddresses,
    };

    try {
      if (editingEmployee) {
        const res = await api.updateEmployee(editingEmployee.id, payload);
        if (res && res.success) {
          showFeedback('success', `${cleanFirstName} ${cleanLastName} bilgileri başarıyla güncellendi.`);
          setIsFormOpen(false);
          setFormError(null);
          await loadData();
        } else {
          setFormError(res?.message || 'Güncelleme işlemi başarısız oldu.');
        }
      } else {
        const res = await api.createEmployee(payload);
        if (res && res.success) {
          showFeedback('success', `${cleanFirstName} ${cleanLastName} yeni personel olarak kaydedildi.`);
          setIsFormOpen(false);
          setFormError(null);
          await loadData();
        } else {
          setFormError(res?.message || 'Personel kaydı oluşturulamadı.');
        }
      }
    } catch (err: any) {
      setFormError(err?.message || 'Personel kaydedilirken bir hata oluştu.');
    }
  };

  // AG Grid Kolon Tanımları
  const columnDefs = useMemo<ColDef<Employee>[]>(
    () => [
      {
        field: 'identityNumber',
        headerName: 'Personel / Tckn',
        minWidth: 140,
        width: 150,
        cellRenderer: (params: ICellRendererParams<Employee>) => {
          const data = params.data;
          if (!data) return null;
          const tckn = data.identityNumber || '-';
          return (
            <div className="flex flex-col justify-center items-start py-0.5 gap-0 px-1">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 w-fit">
                {tckn}
              </span>
              {data.isActive ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 ml-0.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Aktif
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-500 ml-0.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                  Pasif
                </span>
              )}
            </div>
          );
        },
      },
      {
        field: 'firstName',
        headerName: 'Ad Soyad & Unvan',
        minWidth: 220,
        flex: 1.5,
        cellRenderer: (params: ICellRendererParams<Employee>) => {
          const data = params.data;
          if (!data) return null;
          return (
            <div className="flex flex-col justify-center py-1">
              <span
                onClick={() => params.context.handleOpenEdit(data)}
                title="Personel kartını düzenlemek için tıklayın"
                className="font-semibold text-stone-900 text-sm tracking-tight leading-tight hover:text-indigo-600 transition-colors cursor-pointer"
              >
                {data.firstName} {data.lastName}
              </span>
              {data.title && (
                <span className="text-xs text-stone-500 truncate max-w-xs mt-0.5 flex items-center gap-1">
                  <Briefcase className="w-3 h-3 text-stone-400" />
                  {data.title}
                </span>
              )}
            </div>
          );
        },
      },
      {
        field: 'department',
        headerName: 'Görev & Departman',
        minWidth: 170,
        width: 180,
        cellRenderer: (params: ICellRendererParams<Employee>) => {
          const data = params.data;
          if (!data) return null;
          return (
            <div className="flex items-center gap-2 h-full py-1">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                <Building2 className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-stone-800 truncate">{data.department || 'Genel'}</span>
                <span className="text-[10px] text-stone-400 truncate">{data.title || 'Çalışan'}</span>
              </div>
            </div>
          );
        },
      },
      {
        field: 'branchId',
        headerName: 'Şube',
        minWidth: 160,
        width: 170,
        cellRenderer: (params: ICellRendererParams<Employee>) => {
          const branchName = params.data?.branchName || params.context.getBranchName(params.value);
          const isHQ = branchName.includes('Merkez') || branchName.includes('Levent');
          return (
            <div className="flex items-center gap-1.5 py-1 text-xs">
              <Building className={`w-3.5 h-3.5 shrink-0 ${isHQ ? 'text-indigo-600' : 'text-stone-400'}`} />
              <span className="font-medium text-stone-700 truncate">{branchName.split('(')[0]}</span>
            </div>
          );
        },
      },
      {
        field: 'phoneNumber',
        headerName: 'Telefon & İletişim',
        minWidth: 220,
        width: 240,
        cellRenderer: (params: ICellRendererParams<Employee>) => {
          const data = params.data;
          if (!data) return null;
          const formattedPhone = formatPhoneDisplay(data.phoneNumber);
          const e164 = toE164(data.phoneNumber);

          return (
            <div className="flex flex-col justify-center h-full py-1">
              {data.phoneNumber ? (
                <a
                  href={`tel:${e164}`}
                  title={`Aramak için tıklayın: ${e164}`}
                  className="text-xs font-semibold text-stone-900 hover:text-indigo-600 hover:underline flex items-center gap-1.5 leading-tight transition-colors group"
                >
                  <Phone className="w-3.5 h-3.5 text-stone-400 group-hover:text-indigo-600 shrink-0 transition-colors" />
                  <span className="font-mono">{formattedPhone}</span>
                </a>
              ) : (
                <span className="text-xs text-stone-400 italic leading-tight">Telefon Yok</span>
              )}
              {data.email ? (
                <a
                  href={`mailto:${data.email}`}
                  title={`E-posta gönder: ${data.email}`}
                  className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline truncate flex items-center gap-1.5 transition-colors font-medium max-w-[210px] mt-0.5 leading-tight"
                >
                  <Mail className="w-3 h-3 text-indigo-500 shrink-0" />
                  <span className="truncate">{data.email}</span>
                </a>
              ) : (
                <span className="text-xs text-stone-400 italic truncate mt-0.5 leading-tight">E-posta Yok</span>
              )}
            </div>
          );
        },
      },
      {
        field: 'bloodGroup',
        headerName: 'Kan Grubu & Öğrenim',
        minWidth: 160,
        width: 170,
        cellRenderer: (params: ICellRendererParams<Employee>) => {
          const data = params.data;
          if (!data) return null;
          return (
            <div className="flex flex-col justify-center py-1 gap-1">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 w-fit">
                <Heart className="w-3 h-3 text-rose-500" />
                {data.bloodGroup || 'A Rh(+)'}
              </span>
              <span className="text-[10px] text-stone-500 flex items-center gap-1 truncate">
                <GraduationCap className="w-3 h-3 text-stone-400 shrink-0" />
                {data.educationLevel || 'Lisans'}
              </span>
            </div>
          );
        },
      },
      {
        field: 'emergencyContactName',
        headerName: 'Acil Durum İletişim',
        minWidth: 190,
        width: 200,
        cellRenderer: (params: ICellRendererParams<Employee>) => {
          const data = params.data;
          if (!data || !data.emergencyContactName) {
            return <span className="text-stone-400 text-xs italic">Tanımlanmadı</span>;
          }
          return (
            <div className="flex flex-col justify-center py-1">
              <span className="text-xs font-semibold text-amber-900 truncate">
                {data.emergencyContactName} ({data.emergencyContactRelation || 'Yakını'})
              </span>
              <span className="text-[11px] font-mono text-amber-700">
                {formatPhoneDisplay(data.emergencyContactPhone)}
              </span>
            </div>
          );
        },
      },
      {
        field: 'employmentType',
        headerName: 'Çalışma Şekli',
        minWidth: 130,
        width: 135,
        cellRenderer: (params: ICellRendererParams<Employee>) => {
          const type = params.value || 'Tam Zamanlı';
          return (
            <div className="flex items-center h-full">
              <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-full">
                {type}
              </span>
            </div>
          );
        },
      },
      {
        field: 'addresses',
        headerName: 'Tam Adres',
        minWidth: 260,
        width: 300,
        valueGetter: (params) => {
          const emp = params.data;
          if (!emp || !emp.addresses || emp.addresses.length === 0) return '';
          return emp.addresses[0].formattedAddress || params.context.computeAddress(emp.addresses[0]);
        },
        cellRenderer: (params: ICellRendererParams<Employee>) => {
          const data = params.data;
          if (!data || !data.addresses || data.addresses.length === 0) {
            return <span className="text-stone-400 text-xs italic">Adres girilmedi</span>;
          }
          const addr = data.addresses[0];
          const addressText = addr.formattedAddress || params.context.computeAddress(addr);
          return (
            <div className="flex flex-col justify-center py-1.5 min-w-0" title={addressText}>
              <div className="flex items-start gap-2 overflow-hidden">
                <div className="mt-1 bg-indigo-50 p-1 rounded-md shrink-0">
                  <MapPin className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-medium text-stone-500 truncate leading-tight">
                    {addressText}
                  </span>
                  <span className="text-xs font-semibold text-stone-900 leading-tight mt-0.5 tracking-tight">
                    {addr.districtName || addr.districtId} / {addr.cityName || 'İstanbul'}
                  </span>
                </div>
              </div>
            </div>
          );
        },
      },
      {
        field: 'salary',
        headerName: 'Net Maaş (₺)',
        minWidth: 140,
        width: 145,
        sortable: true,
        cellClass: 'text-right font-mono',
        cellRenderer: (params: ICellRendererParams<Employee>) => {
          const val = Number(params.value || 0);
          return (
            <div className="py-1 text-right">
              <span className="font-bold text-xs tracking-tight text-emerald-700">
                ₺{val.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              {params.data?.iban && (
                <p className="text-[10px] text-stone-400 font-mono truncate" title={params.data.iban}>
                  {params.data.iban}
                </p>
              )}
            </div>
          );
        },
      },
      {
        colId: 'actions',
        headerName: 'İşlemler',
        minWidth: 230,
        width: 240,
        pinned: 'right',
        cellRenderer: (params: ICellRendererParams<Employee>) => {
          const data = params.data;
          if (!data) return null;
          const phone = data.phoneNumber || '';
          const cleanPhone = phone.replace(/\D/g, '');

          return (
            <div className="flex items-center gap-1.5 py-1">
              <button
                type="button"
                onClick={() => setDetailEmployee(data)}
                title="Personel Kart Detayını İncele"
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded transition-colors cursor-pointer"
              >
                <FileText className="w-3 h-3" />
                Kartı Aç
              </button>
              <button
                type="button"
                onClick={() => params.context.handleOpenEdit(data)}
                title="Personeli Düzenle"
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 rounded transition-colors cursor-pointer"
              >
                <Pencil className="w-3 h-3 text-stone-500" />
                Düzenle
              </button>
              {cleanPhone ? (
                <a
                  href={`https://wa.me/${cleanPhone}`}
                  target="_blank"
                  rel="noreferrer"
                  title="WhatsApp Mesajı Gönder"
                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors shadow-xs"
                >
                  <MessageSquare className="w-3 h-3" />
                  WhatsApp
                </a>
              ) : null}
              <button
                type="button"
                onClick={() => setEmployeeToDelete(data)}
                title="Personeli Sil"
                className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded border border-transparent hover:border-rose-200 transition-colors cursor-pointer ml-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        },
      },
    ],
    []
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
    }),
    []
  );

  // AG Grid rowSelection ayarları
  const rowSelection = useMemo<RowSelectionOptions<Employee>>(
    () => ({
      mode: 'singleRow',
      checkboxes: false,
      enableClickSelection: true,
    }),
    []
  );

  const onGridReady = (params: GridReadyEvent<Employee>) => {
    setGridApi(params.api);
    const savedState = localStorage.getItem(GRID_STORAGE_KEY);
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        if (Array.isArray(state)) {
          const sanitizedState = state.map((col: any) => {
            const cleanCol = { ...col };
            delete cleanCol.checkboxSelection;
            delete cleanCol.headerCheckboxSelection;
            return cleanCol;
          });
          params.api.applyColumnState({
            state: sanitizedState,
            applyOrder: true,
          });
        }
      } catch (e) {
        console.error('Kolon durumu yüklenirken hata oluştu:', e);
      }
    }
  };

  const [gridColumnsRevision, setGridColumnsRevision] = useState<number>(0);

  const onSaveGridState = useCallback(() => {
    if (gridRef.current?.api) {
      try {
        const state = gridRef.current.api.getColumnState();
        if (Array.isArray(state)) {
          localStorage.setItem(GRID_STORAGE_KEY, JSON.stringify(state));
          setGridColumnsRevision(prev => prev + 1);
        }
      } catch (err) {
        console.error('Grid state kaydedilemedi:', err);
      }
    }
  }, []);

  const handleExportExcel = () => {
    const rowsToExport: Employee[] = [];
    if (gridApi) {
      gridApi.forEachNodeAfterFilterAndSort((node) => {
        if (node.data) rowsToExport.push(node.data);
      });
    } else {
      rowsToExport.push(...employees);
    }

    if (!rowsToExport.length) {
      showFeedback('error', 'Dışa aktarılacak veri bulunamadı.');
      return;
    }

    const exportData = rowsToExport.map((e) => ({
      'Adı Soyadı': `${e.firstName} ${e.lastName}`,
      'TCKN': e.identityNumber,
      'Durum': e.isActive ? 'Aktif' : 'Pasif',
      'Görev / Unvan': e.title || '-',
      'Departman': e.department || '-',
      'Şube': e.branchName || getBranchName(e.branchId),
      'Telefon': e.phoneNumber || '-',
      'E-posta': e.email || '-',
      'Kan Grubu': e.bloodGroup || '-',
      'Öğrenim Durumu': e.educationLevel || '-',
      'Net Maaş': e.salary,
      'IBAN': e.iban || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Personel Listesi');
    XLSX.writeFile(wb, `FX_Personel_Listesi_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showFeedback('success', 'Excel dosyası başarıyla indirildi.');
  };

  const handleExportPdf = () => {
    const rowsToExport: Employee[] = [];
    if (gridApi) {
      gridApi.forEachNodeAfterFilterAndSort((node) => {
        if (node.data) rowsToExport.push(node.data);
      });
    } else {
      rowsToExport.push(...employees);
    }

    if (!rowsToExport.length) {
      showFeedback('error', 'Dışa aktarılacak veri bulunamadı.');
      return;
    }

    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFillColor(79, 70, 229);
    doc.roundedRect(14, 10, 10, 10, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text('FX', 16, 17);

    doc.setTextColor(40, 40, 40);
    doc.setFontSize(18);
    doc.text('Personel Özlük Listesi', 28, 17);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 14, 25);
    doc.text(`Toplam Kayıt: ${rowsToExport.length}`, 14, 30);

    const tableData = rowsToExport.map((e) => [
      e.identityNumber,
      `${e.firstName} ${e.lastName}`,
      e.isActive ? 'Aktif' : 'Pasif',
      e.department || '-',
      e.title || '-',
      e.phoneNumber || '-',
      `₺${(e.salary || 0).toLocaleString('tr-TR')}`,
    ]);

    autoTable(doc, {
      head: [['TCKN', 'Ad Soyad', 'Durum', 'Departman', 'Unvan', 'Telefon', 'Net Maaş']],
      body: tableData,
      startY: 35,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: 255 },
      styles: { fontSize: 8, font: 'helvetica' },
    });

    doc.save(`FX_Personel_Listesi_${new Date().toISOString().slice(0, 10)}.pdf`);
    showFeedback('success', 'PDF raporu başarıyla indirildi.');
  };

  const gridContext = useMemo(
    () => ({
      getBranchName,
      computeAddress,
      handleOpenEdit,
      setEmployeeToDelete,
    }),
    [getBranchName, computeAddress, handleOpenEdit]
  );

  return (
    <div className="space-y-4">
      {/* Üst İstatistik Şeridi */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-stone-200/90 rounded-lg p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Toplam Çalışan</span>
            <Users className="w-4 h-4 text-stone-400" />
          </div>
          <p className="mt-1 text-xl font-bold text-stone-900 tracking-tight font-mono">{stats.total}</p>
          <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
            <UserCheck className="w-3.5 h-3.5" /> {stats.activeCount} Aktif Personel
          </span>
        </div>

        <div className="bg-white border border-stone-200/90 rounded-lg p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-700">Aylık Maaş Bütçesi</span>
            <CreditCard className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="mt-1 text-xl font-bold text-emerald-950 tracking-tight font-mono">
            ₺{stats.totalSalary.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-stone-400">Net Toplam Ödeme</span>
        </div>

        <div className="bg-white border border-stone-200/90 rounded-lg p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-indigo-700">Ortalama Maaş</span>
            <Briefcase className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="mt-1 text-xl font-bold text-indigo-950 tracking-tight font-mono">
            ₺{stats.avgSalary.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-indigo-600 font-medium">Birim başı ortalama</span>
        </div>

        <div className="bg-white border border-stone-200/90 rounded-lg p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-purple-700">Departman Sayısı</span>
            <Building2 className="w-4 h-4 text-purple-600" />
          </div>
          <p className="mt-1 text-xl font-bold text-purple-950 tracking-tight font-mono">{departmentsList.length}</p>
          <span className="text-[11px] text-stone-400">Aktif birim kategorisi</span>
        </div>
      </div>

      {/* Global Geri Bildirim Banner */}
      {feedback && (
        <div
          className={`p-3 rounded-lg text-xs font-medium flex items-center justify-between animate-fade-in border shadow-xs ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-stone-400 hover:text-stone-700 p-0.5 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Kontrol Çubuğu (Arama, Filtreler, Dışa Aktar, Kolon Özelleştirme) */}
      <div className="bg-white border border-stone-200/90 rounded-lg p-3 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Sol: Hızlı Arama ve Seçmeli Filtreler */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="relative min-w-[220px] max-w-xs">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Ad, TCKN, unvan veya departman ara..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-50/70 border border-stone-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white text-stone-800 placeholder-stone-400"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Durum Filtresi (Aktif / Pasif) */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-1.5 px-2.5 bg-stone-50 border border-stone-200 rounded-md text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ALL">Çalışma Durumu (Tümü)</option>
              <option value="ACTIVE">Sadece Aktif Personel</option>
              <option value="PASSIVE">Sadece Pasif Personel</option>
            </select>

            {/* Şube Filtresi */}
            <select
              value={selectedBranchFilter}
              onChange={(e) => setSelectedBranchFilter(e.target.value)}
              className="py-1.5 px-2.5 bg-stone-50 border border-stone-200 rounded-md text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ALL">Tüm Şubeler</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            {/* Departman Filtresi */}
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="py-1.5 px-2.5 bg-stone-50 border border-stone-200 rounded-md text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ALL">Tüm Departmanlar</option>
              {departmentsList.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            {/* Çalışma Şekli Filtresi */}
            <select
              value={selectedEmpTypeFilter}
              onChange={(e) => setSelectedEmpTypeFilter(e.target.value)}
              className="py-1.5 px-2.5 bg-stone-50 border border-stone-200 rounded-md text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ALL">Çalışma Şekli (Tümü)</option>
              <option value="Tam Zamanlı">Tam Zamanlı</option>
              <option value="Yarı Zamanlı">Yarı Zamanlı</option>
              <option value="Hibrit">Hibrit</option>
              <option value="Uzaktan">Uzaktan</option>
              <option value="Sözleşmeli">Sözleşmeli</option>
            </select>
          </div>

          {/* Sağ: Dışa Aktar, Paneli Aç/Kapat, Yeni Personel Ekle */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:text-stone-900 hover:bg-stone-50 border border-stone-200 rounded-md transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              Excel
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:text-stone-900 hover:bg-stone-50 border border-stone-200 rounded-md transition-colors cursor-pointer"
            >
              <FilePieChart className="w-3.5 h-3.5 text-red-600" />
              PDF
            </button>

            <AgGridSidebarToggleBtn
              isOpen={isSidebarOpen}
              onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
              gridApi={gridApi}
              buttonRef={sidebarButtonRef}
            />

            <button
              type="button"
              onClick={handleOpenNew}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors shadow-xs cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Yeni Personel Ekle
            </button>
          </div>
        </div>
      </div>

      {/* AG Grid Alanı & Yan Özelleştirme Paneli */}
      <div className="flex gap-4 items-start relative h-[580px]">
        <div
          className={`bg-white border border-stone-200/90 rounded-lg shadow-xs overflow-hidden transition-all duration-300 ${
            isSidebarOpen ? 'flex-1' : 'w-full'
          }`}
        >
          <div style={{ height: '580px', width: '100%' }}>
            <AgGridReact<Employee>
              theme={appTheme}
              ref={gridRef}
              localeText={AG_GRID_LOCALE_TR}
              context={gridContext}
              loading={loading}
              rowData={employees}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              rowSelection={rowSelection}
              pagination={true}
              paginationPageSize={10}
              paginationPageSizeSelector={[10, 25, 50]}
              onGridReady={onGridReady}
              onColumnMoved={onSaveGridState}
              onColumnVisible={onSaveGridState}
              onColumnPinned={onSaveGridState}
              onDragStopped={onSaveGridState}
              onColumnResized={onSaveGridState}
              onSortChanged={onSaveGridState}
              onCellContextMenu={handleCellContextMenu}
              getRowStyle={(params) => {
                if (params.data?.isActive === false) {
                  return { backgroundColor: '#fdfcfb', color: '#78716c' };
                }
                return undefined;
              }}
              rowHeight={68}
              headerHeight={42}
              animateRows={true}
              enableCellTextSelection={true}
              suppressCellFocus={false}
            />
          </div>
        </div>

        {/* ÖZEL SIDEBAR (Kolon Özelleştirme Paneli) */}
        {isSidebarOpen && (
          <AgGridColumnSidebar
            gridApi={gridApi}
            onSaveGridState={onSaveGridState}
            onClose={() => setIsSidebarOpen(false)}
            primaryColIds={['identityNumber', 'firstName', 'lastName', 'department', 'title', 'phone', 'actions']}
            sidebarRef={sidebarRef}
            columnsRevision={gridColumnsRevision}
          />
        )}
      </div>

      {/* SİLME ONAY MODALI */}
      {employeeToDelete && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-stone-200 rounded-xl max-w-sm w-full p-5 shadow-2xl space-y-4 text-stone-900 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-stone-900">Personeli Sil</h4>
                <p className="text-xs text-stone-500">Bu işlem geri alınamaz.</p>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              <strong className="text-stone-800">
                {employeeToDelete.firstName} {employeeToDelete.lastName}
              </strong>{' '}
              (TCKN: <span className="font-mono">{employeeToDelete.identityNumber}</span>) isimli personelin kaydını kalıcı olarak silmek istediğinizden emin misiniz?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setEmployeeToDelete(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-md transition-colors cursor-pointer"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-md transition-colors cursor-pointer shadow-xs"
              >
                Evet, Kalıcı Olarak Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* YENİ / DÜZENLEME PERSONEL KARTI MODALI */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-stone-900">
                    {editingEmployee ? 'Personel Kartını Düzenle' : 'Yeni Personel Kartı Oluştur'}
                  </h3>
                  <p className="text-xs text-stone-500">
                    Özlük, Görev, İletişim ve Adres Verilerini Eksiksiz Doldurunuz
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsFormOpen(false);
                  setFormError(null);
                }}
                className="p-1.5 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            {/* Modal Sekme Gezintisi */}
            <div className="flex border-b border-stone-200 gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('personal')}
                className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'personal'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                Kişisel Bilgiler
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('job')}
                className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'job'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                Görev & Maaş
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('emergency')}
                className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'emergency'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                Acil Durum & İletişim
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('address')}
                className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'address'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                Adres Bilgileri
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Sekme 1: Kişisel Bilgiler */}
              {activeTab === 'personal' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Ad *</label>
                    <input
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      placeholder="Ahmet"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Soyad *</label>
                    <input
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      placeholder="Yılmaz"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      T.C. Kimlik No *
                      <span className="text-[10px] text-stone-400 font-normal ml-1">(11 Haneli Resmi Algoritma)</span>
                    </label>
                    <input
                      type="text"
                      maxLength={11}
                      required
                      value={formData.identityNumber}
                      onChange={(e) => setFormData({ ...formData, identityNumber: e.target.value.replace(/\D/g, '') })}
                      className={`w-full px-3 py-2 border rounded-lg text-xs font-mono text-stone-800 focus:outline-none focus:ring-2 ${
                        formData.identityNumber && !isValidTCKN(formData.identityNumber)
                          ? 'border-rose-300 focus:ring-rose-500/20'
                          : 'border-stone-200 focus:ring-indigo-500/30'
                      }`}
                      placeholder="11122233344"
                    />
                    {formData.identityNumber && !isValidTCKN(formData.identityNumber) && (
                      <p className="text-[10px] text-rose-500 mt-1">Geçerli bir T.C. Kimlik Numarası girilmelidir.</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Cep Telefonu</label>
                    <input
                      type="text"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      placeholder="+90 (555) 000 00 00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">E-Posta Adresi</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      placeholder="ahmet.yilmaz@fx.com.tr"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Kan Grubu</label>
                    <select
                      value={formData.bloodGroup}
                      onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
                    >
                      {['0 Rh(-)', '0 Rh(+)', 'A Rh(-)', 'A Rh(+)', 'B Rh(-)', 'B Rh(+)', 'AB Rh(-)', 'AB Rh(+)'].map((bg) => (
                        <option key={bg} value={bg}>
                          {bg}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Öğrenim Durumu</label>
                    <select
                      value={formData.educationLevel}
                      onChange={(e) => setFormData({ ...formData, educationLevel: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
                    >
                      {['İlkokul', 'Ortaokul', 'Lise', 'Ön Lisans', 'Lisans', 'Yüksek Lisans', 'Doktora'].map((ed) => (
                        <option key={ed} value={ed}>
                          {ed}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Doğum Tarihi</label>
                    <input
                      type="date"
                      value={formData.birthDate}
                      onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                  </div>
                </div>
              )}

              {/* Sekme 2: Görev & Maaş */}
              {activeTab === 'job' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Çalışacağı Şube *</label>
                    <select
                      value={formData.branchId}
                      onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
                    >
                      <option value="">Şube Seçiniz...</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Departman</label>
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      placeholder="Yazılım ve Teknoloji"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Unvan / Görev</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      placeholder="Senior Developer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Çalışma Şekli</label>
                    <select
                      value={formData.employmentType}
                      onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
                    >
                      {['Tam Zamanlı', 'Yarı Zamanlı', 'Hibrit', 'Uzaktan', 'Sözleşmeli'].map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Net Maaş (₺)</label>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={formData.salary}
                      onChange={(e) => setFormData({ ...formData, salary: Math.max(0, Number(e.target.value) || 0) })}
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg text-xs font-mono text-emerald-700 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">İşe Giriş Tarihi</label>
                    <input
                      type="date"
                      value={formData.hireDate}
                      onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Maaş Hesabı IBAN
                      <span className="text-[10px] text-stone-400 font-normal ml-1">(TR ile başlayan 26 karakter)</span>
                    </label>
                    <input
                      type="text"
                      maxLength={32}
                      value={formData.iban}
                      onChange={(e) => setFormData({ ...formData, iban: e.target.value.toUpperCase() })}
                      className={`w-full px-3 py-2 border rounded-lg text-xs font-mono text-stone-800 focus:outline-none focus:ring-2 ${
                        formData.iban && !isValidIBAN(formData.iban)
                          ? 'border-rose-300 focus:ring-rose-500/20'
                          : 'border-stone-200 focus:ring-indigo-500/30'
                      }`}
                      placeholder="TR00 0000 0000 0000 0000 0000 00"
                    />
                  </div>
                  <div className="sm:col-span-2 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-stone-700">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span>Personel Aktif Olarak Çalışıyor</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Sekme 3: Acil Durum & İletişim */}
              {activeTab === 'emergency' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-amber-800 mb-3 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-amber-600" />
                      Acil Durumda Ulaşılacak Kişi
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-amber-50/50 p-3.5 rounded-xl border border-amber-200">
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-700 mb-1">Ad Soyad</label>
                        <input
                          type="text"
                          value={formData.emergencyContactName}
                          onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                          className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                          placeholder="Ayşe Yılmaz"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-700 mb-1">Telefon</label>
                        <input
                          type="text"
                          value={formData.emergencyContactPhone}
                          onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                          className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                          placeholder="+90 532 000 00 00"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-700 mb-1">Yakınlık Derecesi</label>
                        <input
                          type="text"
                          value={formData.emergencyContactRelation}
                          onChange={(e) => setFormData({ ...formData, emergencyContactRelation: e.target.value })}
                          className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                          placeholder="Eşi / Babası"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sekme 4: Adres Bilgileri */}
              {activeTab === 'address' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-stone-50 p-3 rounded-xl border border-stone-200">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-semibold text-stone-700">Adres Tipi:</label>
                      <select
                        value={formData.addressType}
                        onChange={(e) => setFormData({ ...formData, addressType: e.target.value })}
                        className="px-3 py-1 bg-white border border-stone-200 rounded-lg text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
                      >
                        {addressTypes.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setIsAddressTypeModalOpen(true)}
                        className="text-[11px] text-indigo-600 hover:underline font-semibold cursor-pointer"
                      >
                        + Yönet
                      </button>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-stone-700">
                      <input
                        type="checkbox"
                        checked={formData.isDefaultAddress}
                        onChange={(e) => setFormData({ ...formData, isDefaultAddress: e.target.checked })}
                        className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      Varsayılan Adres Yap
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 mb-1">İl (Şehir)</label>
                      <select
                        value={formData.cityId}
                        onChange={(e) => {
                          const newCityId = Number(e.target.value);
                          const districts = geoService.getDistricts(newCityId);
                          setFormData({
                            ...formData,
                            cityId: newCityId,
                            districtName: districts[0] || '',
                            neighborhoodId: '',
                          });
                        }}
                        className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
                      >
                        {sortedCities.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 mb-1">İlçe</label>
                      <select
                        value={formData.districtName}
                        onChange={(e) => setFormData({ ...formData, districtName: e.target.value, neighborhoodId: '' })}
                        className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
                      >
                        {currentDistricts.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 mb-1">Mahalle</label>
                      <select
                        value={formData.neighborhoodId}
                        onChange={(e) => setFormData({ ...formData, neighborhoodId: e.target.value })}
                        className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
                      >
                        <option value="">Mahalle Seçiniz...</option>
                        {currentNeighborhoods.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-stone-700 mb-1">Sokak / Cadde / Bulvar</label>
                      <input
                        type="text"
                        value={formData.streetLine}
                        onChange={(e) => setFormData({ ...formData, streetLine: e.target.value })}
                        className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                        placeholder="Atatürk Cad. No:15"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 mb-1">Kapı No</label>
                      <input
                        type="text"
                        value={formData.doorNumber}
                        onChange={(e) => setFormData({ ...formData, doorNumber: e.target.value })}
                        className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                        placeholder="12"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 mb-1">Daire No</label>
                      <input
                        type="text"
                        value={formData.apartmentNumber}
                        onChange={(e) => setFormData({ ...formData, apartmentNumber: e.target.value })}
                        className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                        placeholder="4"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-stone-700">Açık / Otomatik Adres Metni</label>
                      <button
                        type="button"
                        onClick={handleOpenGoogleMaps}
                        className="text-[11px] text-indigo-600 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                      >
                        <MapPin className="w-3 h-3" /> Haritada Aç
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      value={formData.formattedAddress || computeAddress(formData)}
                      onChange={(e) => setFormData({ ...formData, formattedAddress: e.target.value })}
                      className="w-full p-2.5 border border-stone-200 rounded-lg text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                  </div>
                </div>
              )}

              {/* Modal Alt Gezinti ve Kaydet */}
              <div className="flex items-center justify-between pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsFormOpen(false);
                    setFormError(null);
                  }}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  İptal
                </button>

                <div className="flex items-center gap-2">
                  {activeTab !== 'personal' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (activeTab === 'job') setActiveTab('personal');
                        else if (activeTab === 'emergency') setActiveTab('job');
                        else if (activeTab === 'address') setActiveTab('emergency');
                      }}
                      className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" /> Önceki
                    </button>
                  )}

                  {activeTab !== 'address' ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (activeTab === 'personal') setActiveTab('job');
                        else if (activeTab === 'job') setActiveTab('emergency');
                        else if (activeTab === 'emergency') setActiveTab('address');
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                    >
                      Sonraki <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                    >
                      {editingEmployee ? 'Değişiklikleri Kaydet' : 'Personeli Kaydet'}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SAĞ TIK ÖZEL MENÜ (ContextMenu) */}
      {contextMenu && (
        <div
          className="fixed z-100 w-56 bg-white border border-stone-200 rounded-lg shadow-xl py-1.5 animate-in fade-in zoom-in duration-100"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <div className="px-3 py-2 border-b border-stone-100">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Hızlı İşlemler</p>
            <p className="text-xs font-bold text-stone-800 truncate">
              {contextMenu.data.firstName} {contextMenu.data.lastName}
            </p>
          </div>
          <div className="py-1">
            <button
              type="button"
              onClick={() => {
                setDetailEmployee(contextMenu.data);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-stone-700 hover:bg-stone-50 hover:text-indigo-600 transition-colors cursor-pointer"
            >
              <Eye className="w-4 h-4 text-stone-400" />
              Personel Kartını Aç
            </button>
            <button
              type="button"
              onClick={() => {
                handleOpenEdit(contextMenu.data);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-stone-700 hover:bg-stone-50 hover:text-indigo-600 transition-colors cursor-pointer"
            >
              <Pencil className="w-4 h-4 text-stone-400" />
              Personeli Düzenle
            </button>
            {contextMenu.data.phoneNumber && (
              <button
                type="button"
                onClick={() => {
                  const cleanPhone = (contextMenu.data.phoneNumber || '').replace(/\D/g, '');
                  window.open(`https://wa.me/${cleanPhone}`, '_blank');
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-stone-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 text-emerald-500" />
                WhatsApp Mesajı
              </button>
            )}
            {contextMenu.data.email && (
              <a
                href={`mailto:${contextMenu.data.email}`}
                onClick={() => setContextMenu(null)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-stone-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors cursor-pointer"
              >
                <Mail className="w-4 h-4 text-indigo-500" />
                E-posta Gönder
              </a>
            )}
          </div>
          <div className="border-t border-stone-100 py-1">
            <button
              type="button"
              onClick={() => {
                handleCopyText(contextMenu.data.identityNumber, 'T.C. Kimlik No');
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-stone-400" />
              T.C. Kimlik No Kopyala
            </button>
            {contextMenu.data.phoneNumber && (
              <button
                type="button"
                onClick={() => {
                  handleCopyText(contextMenu.data.phoneNumber || '', 'Telefon numarası');
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-stone-400" />
                Telefon No Kopyala
              </button>
            )}
            {contextMenu.data.iban && (
              <button
                type="button"
                onClick={() => {
                  handleCopyText(contextMenu.data.iban || '', 'IBAN');
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-stone-400" />
                IBAN Kopyala
              </button>
            )}
          </div>
          <div className="border-t border-stone-100 pt-1 mt-1">
            <button
              type="button"
              onClick={() => {
                setEmployeeToDelete(contextMenu.data);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 font-medium transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-rose-500" />
              Personeli Sil
            </button>
          </div>
        </div>
      )}

      {/* PERSONEL DETAY MODALI */}
      {detailEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl animate-in fade-in duration-200">
            <div className="bg-gradient-to-r from-stone-900 via-indigo-950 to-stone-900 p-6 text-white relative">
              <button
                type="button"
                onClick={() => setDetailEmployee(null)}
                className="absolute right-4 top-4 p-1.5 hover:bg-white/10 rounded-lg text-stone-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white font-bold text-xl flex items-center justify-center shadow-lg border border-indigo-400/30">
                  {detailEmployee.firstName.charAt(0)}
                  {detailEmployee.lastName.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {detailEmployee.firstName} {detailEmployee.lastName}
                  </h2>
                  <p className="text-xs text-indigo-200 mt-0.5">
                    {detailEmployee.title || 'Belirtilmedi'} • {detailEmployee.department || 'Genel'}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/10 text-white border border-white/20">
                      TCKN: {detailEmployee.identityNumber}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      {detailEmployee.branchName || getBranchName(detailEmployee.branchId)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <div>
                <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2.5">
                  İstihdam & Özlük Bilgileri
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-stone-50 p-4 rounded-xl border border-stone-200 text-xs">
                  <div>
                    <span className="text-stone-400 block text-[10px]">Çalışma Şekli</span>
                    <span className="font-semibold text-stone-800">{detailEmployee.employmentType || 'Tam Zamanlı'}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[10px]">İşe Giriş Tarihi</span>
                    <span className="font-semibold text-stone-800">{detailEmployee.hireDate || '-'}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[10px]">Net Maaş</span>
                    <span className="font-bold text-emerald-700 font-mono">
                      ₺{(detailEmployee.salary || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[10px]">Kan Grubu</span>
                    <span className="font-bold text-rose-700">{detailEmployee.bloodGroup || '-'}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[10px]">Öğrenim Durumu</span>
                    <span className="font-semibold text-stone-800">{detailEmployee.educationLevel || '-'}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[10px]">Doğum Tarihi</span>
                    <span className="font-semibold text-stone-800">{detailEmployee.birthDate || '-'}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2.5">
                  Banka & İletişim Bilgileri
                </h4>
                <div className="space-y-2 bg-stone-50 p-4 rounded-xl border border-stone-200 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">Maaş Hesabı IBAN:</span>
                    <span className="font-mono font-bold text-stone-800 select-all">{detailEmployee.iban || 'Belirtilmedi'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">Cep Telefonu:</span>
                    <span className="font-medium text-stone-800">{detailEmployee.phoneNumber || 'Belirtilmedi'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">E-Posta:</span>
                    <span className="font-medium text-stone-800">{detailEmployee.email || 'Belirtilmedi'}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" /> Acil Durum İletişim
                </h4>
                <div className="bg-amber-50/70 border border-amber-200/80 p-4 rounded-xl text-xs space-y-1">
                  <div className="font-bold text-amber-950">
                    {detailEmployee.emergencyContactName || 'Tanımlanmadı'} ({detailEmployee.emergencyContactRelation || '-'})
                  </div>
                  <div className="text-amber-800 font-mono font-semibold">
                    Telefon: {detailEmployee.emergencyContactPhone || 'Yok'}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600" /> Kayıtlı Adresleri
                </h4>
                {detailEmployee.addresses && detailEmployee.addresses.length > 0 ? (
                  <div className="space-y-2">
                    {detailEmployee.addresses.map((addr) => (
                      <div key={addr.id} className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-stone-800 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                            {addr.addressType || 'İkametgah Adresi'}
                          </span>
                          {addr.isDefault && (
                            <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded font-semibold">
                              Varsayılan
                            </span>
                          )}
                        </div>
                        <p className="text-stone-600 leading-relaxed mt-1">{addr.formattedAddress || addr.streetLine}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-stone-400 text-xs italic">Personelin henüz kaydedilmiş adresi bulunmuyor.</p>
                )}
              </div>
            </div>

            <div className="p-4 bg-stone-50 border-t border-stone-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDetailEmployee(null)}
                className="px-4 py-2 text-xs font-semibold bg-stone-800 hover:bg-stone-900 text-white rounded-lg transition-colors cursor-pointer"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADRES TİPLERİ YÖNETİM MODALI */}
      {isAddressTypeModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white border border-stone-200 rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h4 className="font-bold text-sm text-stone-800 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                Adres Tiplerini Yönet & Ekle
              </h4>
              <button
                type="button"
                onClick={() => setIsAddressTypeModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-stone-700">Mevcut Adres Tipleri</label>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {addressTypes.map((type) => (
                  <div
                    key={type}
                    className={`flex items-center justify-between p-2 rounded-lg border text-xs transition-colors ${
                      formData.addressType === type
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-900 font-semibold'
                        : 'bg-stone-50 border-stone-200 text-stone-700'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {formData.addressType === type && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                      {type}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, addressType: type });
                          setIsAddressTypeModalOpen(false);
                        }}
                        className="text-[11px] text-indigo-600 hover:underline font-medium cursor-pointer"
                      >
                        Seç
                      </button>
                      {!['İkametgah Adresi', 'Tebligat Adresi', 'Acil Durum Ulaşım Adresi'].includes(type) && (
                        <button
                          type="button"
                          onClick={() => {
                            setAddressTypes((prev) => prev.filter((t) => t !== type));
                            if (formData.addressType === type) {
                              setFormData({ ...formData, addressType: 'İkametgah Adresi' });
                            }
                          }}
                          className="text-stone-400 hover:text-rose-600 p-0.5 cursor-pointer"
                          title="Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-stone-200 space-y-2">
              <label className="text-xs font-semibold text-stone-700">Yeni Adres Tipi Ekle</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newAddressTypeInput}
                  onChange={(e) => setNewAddressTypeInput(e.target.value)}
                  placeholder="Örn: Yazlık İkametgah..."
                  className="flex-1 px-3 py-1.5 border border-stone-200 rounded-lg text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
                <button
                  type="button"
                  onClick={() => {
                    const trimmed = newAddressTypeInput.trim();
                    if (trimmed && !addressTypes.includes(trimmed)) {
                      setAddressTypes((prev) => [...prev, trimmed]);
                      setFormData({ ...formData, addressType: trimmed });
                      setNewAddressTypeInput('');
                    }
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  Ekle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonelListesi;

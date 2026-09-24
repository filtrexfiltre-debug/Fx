import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from 'react';
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
  Search,
  UserPlus,
  Building2,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  UserCheck,
  AlertCircle,
  X,
  CreditCard,
  Building,
  Save,
  ChevronRight,
  ChevronLeft,
  Check,
  MapPin,
  RotateCw,
  User,
  Users,
  Plus,
  Trash2,
  FileText,
  Mail,
  FileCheck,
  Phone,
  Layout,
  Copy,
  Eye,
  Info,
  Download,
  FilePieChart,
  Columns3,
} from 'lucide-react';
import { downloadCsv } from '../../lib/exportUtils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Contact, Branch, ContactType, Employee } from '../../types/fx';
import { fxApi, branchContext } from '../../services/api';
import { geoService } from '../../services/geoService';
import {
  CONTACT_TYPES,
  TURKEY_CITIES,
} from '../../data/mockData';
import { AgGridColumnSidebar, AgGridSidebarToggleBtn } from '../common/AgGridColumnSidebar';

type ContactStatus = 'ACTIVE' | 'PASSIVE' | 'LEAD';
const GRID_STORAGE_KEY = 'fx_customer_list_column_state';

export const MusteriListesi: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [quickFilterText, setQuickFilterText] = useState<string>('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    branchContext.getSelectedBranchId()
  );
  const [isGlobalUser, setIsGlobalUser] = useState<boolean>(
    branchContext.getIsGlobalUser()
  );
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    data: Contact;
  } | null>(null);
  const [detailContact, setDetailContact] = useState<Contact | null>(null);

  const gridRef = useRef<AgGridReact<Contact>>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const sidebarButtonRef = useRef<HTMLButtonElement>(null);
  const [gridApi, setGridApi] = useState<GridApi<Contact> | null>(null);
  const [gridColumnsRevision, setGridColumnsRevision] = useState<number>(0);
  const timerRef = useRef<number[]>([]);

  const clearFeedbackTimers = useCallback(() => {
    timerRef.current.forEach((id) => window.clearTimeout(id));
    timerRef.current = [];
  }, []);

  const scheduleFeedback = useCallback((message: string, duration = 4000) => {
    setFeedbackMessage(message);
    const id = window.setTimeout(() => {
      setFeedbackMessage(null);
      timerRef.current = timerRef.current.filter((timerId) => timerId !== id);
    }, duration);
    timerRef.current.push(id);
  }, []);

  useEffect(() => {
    return () => clearFeedbackTimers();
  }, [clearFeedbackTimers]);

  const [activeFormTab, setActiveFormTab] = useState<'genel' | 'adres' | 'finans'>('genel');
  const [addressTypes, setAddressTypes] = useState<string[]>([
    'Fatura Adresi',
    'Sevkiyat Adresi',
    'Depo Adresi',
    'Şube Adresi',
    'Diğer',
  ]);
  const [isAddressTypeModalOpen, setIsAddressTypeModalOpen] = useState<boolean>(false);
  const [newAddressTypeInput, setNewAddressTypeInput] = useState<string>('');

  const [contactTypes, setContactTypes] = useState<ContactType[]>([
    ...CONTACT_TYPES,
    {
      id: 'ct-4',
      tenantId: 't-1',
      code: 'PERSONEL',
      name: 'Personel',
      isSystem: false,
      isActive: true,
    },
  ]);
  const [isContactTypeModalOpen, setIsContactTypeModalOpen] = useState<boolean>(false);
  const [newContactTypeInput, setNewContactTypeInput] = useState<string>('');

  const [newContact, setNewContact] = useState<{
    code: string;
    branchId: string;
    contactTypeId: string;
    status: ContactStatus;
    title: string;
    authorizedPerson: string;
    accountRepresentative: string;
    referenceInfo: string;
    mobilePhone1: string;
    mobilePhone2: string;
    homePhone: string;
    workPhone: string;
    email: string;
    website: string;
    addressType: string;
    isDefaultAddress: boolean;
    cityId: number;
    districtId: string;
    neighborhoodId: string;
    streetLine: string;
    doorNumber: string;
    apartmentNumber: string;
    buildingName: string;
    blockName: string;
    siteName: string;
    formattedAddress: string;
    taxNumber: string;
    taxOffice: string;
    tcNumber: string;
    isEinvoiceTaxpayer: boolean;
    openingBalance: number;
    currency: string;
    creditRiskLimit: number;
    defaultPaymentTermsDays: number;
    defaultDiscountAmount: number;
    notes: string;
  }>({
    code: 'CAR-1001',
    branchId: '',
    contactTypeId: 'ct-1',
    status: 'ACTIVE',
    title: '',
    authorizedPerson: '',
    accountRepresentative: '',
    referenceInfo: '',
    mobilePhone1: '+90',
    mobilePhone2: '',
    homePhone: '',
    workPhone: '',
    email: '',
    website: '',
    addressType: 'Fatura Adresi',
    isDefaultAddress: true,
    cityId: 34,
    districtId: '',
    neighborhoodId: '',
    streetLine: '',
    doorNumber: '',
    apartmentNumber: '',
    buildingName: '',
    blockName: '',
    siteName: '',
    formattedAddress: '',
    taxNumber: '',
    taxOffice: '',
    tcNumber: '',
    isEinvoiceTaxpayer: false,
    openingBalance: 0,
    currency: 'TRY',
    creditRiskLimit: 0,
    defaultPaymentTermsDays: 0,
    defaultDiscountAmount: 0,
    notes: '',
  });

  const getBranchName = useCallback(
    (branchId: string) => {
      const found = branches.find((b) => b.id === branchId);
      return found ? found.name : 'Bilinmeyen Şube';
    },
    [branches]
  );

  const toE164 = (raw?: string): string => {
    if (!raw) return '';
    const trimmed = raw.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('+') && !trimmed.startsWith('+90')) {
      return `+${trimmed.replace(/\D/g, '')}`;
    }
    let digits = trimmed.replace(/\D/g, '');
    if (digits.startsWith('90')) return `+${digits}`;
    if (digits.startsWith('0')) return `+90${digits.slice(1)}`;
    if (digits.length === 10) return `+90${digits}`;
    return `+${digits}`;
  };

  const formatPhoneDisplay = (raw?: string): string => {
    if (!raw) return '';
    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    let clean = digits;
    if (clean.startsWith('90')) clean = clean.slice(2);
    if (clean.startsWith('0')) clean = clean.slice(1);
    if (clean.length === 10) {
      return `+90 (${clean.slice(0, 3)}) ${clean.slice(3, 6)} ${clean.slice(6, 8)} ${clean.slice(8, 10)}`;
    }
    return `+${clean}`;
  };

  const normalizePhoneInput = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (!digits) return '';
    let clean = digits;
    if (clean.startsWith('90')) clean = clean.slice(2);
    if (clean.startsWith('0')) clean = clean.slice(1);
    if (!clean) return '+90';
    if (clean.length <= 3) return `+90 (${clean}`;
    if (clean.length <= 6) return `+90 (${clean.slice(0, 3)}) ${clean.slice(3)}`;
    if (clean.length <= 8) return `+90 (${clean.slice(0, 3)}) ${clean.slice(3, 6)} ${clean.slice(6)}`;
    return `+90 (${clean.slice(0, 3)}) ${clean.slice(3, 6)} ${clean.slice(6, 8)} ${clean.slice(8, 10)}`;
  };

  const formatPhoneNumber = (val: string): string => {
    if (!val) return '';
    const trimmed = val.trim();
    if (!trimmed || trimmed === '+') return '';
    if (trimmed.startsWith('+') && !trimmed.startsWith('+90')) {
      return trimmed;
    }
    return normalizePhoneInput(trimmed);
  };

  const computeAddress = useCallback((c: Partial<Contact> | typeof newContact) => {
    const parts: string[] = [];
    if (c.neighborhoodId) {
      const hood = String(c.neighborhoodId).trim();
      if (hood && !hood.startsWith('n-') && !hood.startsWith('uuid-')) {
        parts.push(hood.toLowerCase().includes('mah') ? hood : `${hood} Mah.`);
      }
    }
    if (c.streetLine) parts.push(String(c.streetLine).trim());
    if (c.siteName) parts.push(String(c.siteName).trim());
    if (c.buildingName) parts.push(String(c.buildingName).trim());
    if (c.blockName) parts.push(String(c.blockName).trim());

    const doorParts: string[] = [];
    if (c.doorNumber) doorParts.push(`No:${c.doorNumber}`);
    if (c.apartmentNumber) doorParts.push(`D:${c.apartmentNumber}`);
    if (doorParts.length) parts.push(doorParts.join(' '));

    const cityName = TURKEY_CITIES.find((city) => city.id === c.cityId)?.name || '';
    let districtName = String(c.districtId || '').trim();
    if (districtName.startsWith('d-') || districtName.startsWith('dist-')) districtName = '';

    if (districtName && cityName) parts.push(`${districtName} / ${cityName}`);
    else if (cityName) parts.push(cityName);
    else if (districtName) parts.push(districtName);

    return parts.filter(Boolean).join(' ');
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fxApi.getContacts();
      const empResponse = await fxApi.getEmployees({ isActive: true });
      setContacts([...response.data]);
      setEmployees(empResponse.data);
      setBranches(fxApi.getBranches());
    } catch (err) {
      console.error('Cari verisi yüklenirken hata:', err);
      scheduleFeedback('Cari verisi yüklenirken bir hata oluştu.', 4000);
    } finally {
      setLoading(false);
    }
  }, [scheduleFeedback]);

  useEffect(() => {
    loadData();
    const unsubscribe = branchContext.subscribe(() => {
      setSelectedBranchId(branchContext.getSelectedBranchId());
      setIsGlobalUser(branchContext.getIsGlobalUser());
      loadData();
    });
    return () => unsubscribe();
  }, [loadData]);

  const handleCellContextMenu = (event: any) => {
    event.event.preventDefault();
    if (event.data) {
      setContextMenu({
        x: event.event.clientX,
        y: event.event.clientY,
        data: event.data,
      });
    }
  };

  const onSaveGridState = useCallback(() => {
    if (gridRef.current?.api) {
      const columnState = gridRef.current.api.getColumnState();
      localStorage.setItem(GRID_STORAGE_KEY, JSON.stringify(columnState));
      setGridColumnsRevision((prev) => prev + 1);
    }
  }, []);

  const handleOutsideClick = (event: MouseEvent) => {
    if (!isSidebarOpen) return;
    const target = event.target as Node;
    if (
      sidebarRef.current &&
      !sidebarRef.current.contains(target) &&
      sidebarButtonRef.current &&
      !sidebarButtonRef.current.contains(target)
    ) {
      setIsSidebarOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isSidebarOpen]);

  const filteredData = useMemo(() => {
    let list = contacts;
    if (selectedBranchId !== 'all') {
      list = list.filter((c) => c.branchId === selectedBranchId);
    }
    const q = quickFilterText.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) => {
      const code = (c.code || '').toLowerCase();
      const title = (c.title || '').toLowerCase();
      const auth = (c.authorizedPerson || '').toLowerCase();
      const rep = (c.accountRepresentative || '').toLowerCase();
      const tax = (c.taxNumber || c.tcNumber || '').toLowerCase();
      const phone1 = (c.mobilePhone1 || '').toLowerCase();
      const phone2 = (c.mobilePhone2 || '').toLowerCase();
      const email = (c.email || '').toLowerCase();
      const taxOffice = (c.taxOffice || '').toLowerCase();
      const addr = (c.formattedAddress || '').toLowerCase();
      const cityName = (TURKEY_CITIES.find((ci) => ci.id === c.cityId)?.name || '').toLowerCase();
      const typeName = (contactTypes.find((t) => t.id === c.contactTypeId)?.name || '').toLowerCase();
      const statusText =
        c.status === 'ACTIVE'
          ? 'aktif'
          : c.status === 'LEAD'
            ? 'potansiyel'
            : 'pasif';

      return (
        code.includes(q) ||
        title.includes(q) ||
        auth.includes(q) ||
        rep.includes(q) ||
        tax.includes(q) ||
        phone1.includes(q) ||
        phone2.includes(q) ||
        email.includes(q) ||
        taxOffice.includes(q) ||
        addr.includes(q) ||
        cityName.includes(q) ||
        typeName.includes(q) ||
        statusText.includes(q)
      );
    });
  }, [contacts, selectedBranchId, quickFilterText, contactTypes]);

  const validateContactForm = useCallback(
    (excludeId?: string): string | null => {
      if (!newContact.title.trim()) {
        return 'Lütfen Cari Ünvan (Firma/Şahıs Adı) alanını doldurunuz.';
      }

      const candidateCode = newContact.code.trim();
      if (!candidateCode) return 'Cari kodu boş olamaz.';

      const duplicateCode = contacts.some(
        (c) =>
          c.id !== excludeId &&
          (c.code || '').trim().toLowerCase() === candidateCode.toLowerCase()
      );
      if (duplicateCode) return 'Bu cari kodu başka bir kayıt tarafından kullanılmaktadır.';

      const taxCandidate = newContact.taxNumber.trim();
      if (taxCandidate && taxCandidate.length !== 10) return 'Vergi numarası 10 hane olmalıdır.';
      const tcCandidate = newContact.tcNumber.trim();
      if (tcCandidate && tcCandidate.length !== 11) return 'T.C. kimlik numarası 11 hane olmalıdır.';

      const duplicateTax = contacts.some(
        (c) =>
          c.id !== excludeId &&
          (c.taxNumber || '').trim() === taxCandidate &&
          !!taxCandidate
      );
      if (duplicateTax) return 'Bu vergi numarası başka bir cari kart ile eşleşiyor.';

      const phone1 = newContact.mobilePhone1.trim();
      if (!phone1 || phone1 === '+90' || phone1.replace(/\D/g, '').length < 10) {
        return 'Lütfen geçerli bir Cep Telefonu 1 numarası giriniz.';
      }

      const emailCandidate = newContact.email.trim();
      if (emailCandidate) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(emailCandidate)) {
          return 'Lütfen geçerli bir e-posta adresi giriniz.';
        }
      }

      if (!newContact.branchId) return 'Kayıt için şube seçimi zorunludur.';

      return null;
    },
    [contacts, newContact]
  );

  const handleOpenCreateModal = useCallback(() => {
    setEditingContactId(null);
    const defaultBranch =
      selectedBranchId !== 'all'
        ? selectedBranchId
        : branches.find((b) => b.isHeadquarter)?.id || branches[0]?.id || '';

    setNewContact({
      code: `CAR-${Math.floor(1000 + Math.random() * 9000)}`,
      branchId: defaultBranch,
      contactTypeId: 'ct-1',
      status: 'ACTIVE',
      title: '',
      authorizedPerson: '',
      accountRepresentative: '',
      referenceInfo: '',
      mobilePhone1: '+90',
      mobilePhone2: '',
      homePhone: '',
      workPhone: '',
      email: '',
      website: '',
      addressType: 'Fatura Adresi',
      isDefaultAddress: true,
      cityId: 34,
      districtId: '',
      neighborhoodId: '',
      streetLine: '',
      doorNumber: '',
      apartmentNumber: '',
      buildingName: '',
      blockName: '',
      siteName: '',
      formattedAddress: '',
      taxNumber: '',
      taxOffice: '',
      tcNumber: '',
      isEinvoiceTaxpayer: false,
      openingBalance: 0,
      currency: 'TRY',
      creditRiskLimit: 0,
      defaultPaymentTermsDays: 0,
      defaultDiscountAmount: 0,
      notes: '',
    });

    setActiveFormTab('genel');
    setIsModalOpen(true);
  }, [branches, selectedBranchId]);

  const handleOpenEditModal = useCallback((contact: Contact) => {
    setEditingContactId(contact.id);
    setNewContact({
      code: contact.code || '',
      branchId: contact.branchId || '',
      contactTypeId: contact.contactTypeId || 'ct-1',
      status: (contact.status as ContactStatus) || 'ACTIVE',
      title: contact.title || '',
      authorizedPerson: contact.authorizedPerson || '',
      accountRepresentative: contact.accountRepresentative || '',
      referenceInfo: contact.referenceInfo || '',
      mobilePhone1: contact.mobilePhone1 || '+90',
      mobilePhone2: contact.mobilePhone2 || '',
      homePhone: contact.homePhone || '',
      workPhone: contact.workPhone || '',
      email: contact.email || '',
      website: contact.website || '',
      addressType: contact.addressType || 'Fatura Adresi',
      isDefaultAddress: contact.isDefaultAddress ?? true,
      cityId: contact.cityId || 0,
      districtId: contact.districtId || '',
      neighborhoodId: contact.neighborhoodId || '',
      streetLine: contact.streetLine || '',
      doorNumber: contact.doorNumber || '',
      apartmentNumber: contact.apartmentNumber || '',
      buildingName: contact.buildingName || '',
      blockName: contact.blockName || '',
      siteName: contact.siteName || '',
      formattedAddress: contact.formattedAddress || '',
      taxNumber: contact.taxNumber || '',
      taxOffice: contact.taxOffice || '',
      tcNumber: contact.tcNumber || '',
      isEinvoiceTaxpayer: contact.isEinvoiceTaxpayer ?? false,
      openingBalance: contact.openingBalance ?? Number(contact.currentBalance ?? 0),
      currency: contact.currency || 'TRY',
      creditRiskLimit: contact.creditRiskLimit ?? 0,
      defaultPaymentTermsDays: contact.defaultPaymentTermsDays ?? 0,
      defaultDiscountAmount: contact.defaultDiscountAmount ?? 0,
      notes: contact.notes || '',
    });
    setActiveFormTab('genel');
    setIsModalOpen(true);
  }, []);

  const handleWhatsApp = (phone?: string) => {
    if (!phone) {
      scheduleFeedback('Geçerli bir telefon numarası bulunamadı.', 3000);
      return;
    }
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = `90${cleanPhone.slice(1)}`;
    } else if (cleanPhone.length === 10) {
      cleanPhone = `90${cleanPhone}`;
    }
    if (cleanPhone.length < 10 || cleanPhone === '90') {
      scheduleFeedback('Geçerli bir cep telefonu numarası girilmemiş.', 3000);
      return;
    }
    window.open(`https://wa.me/${cleanPhone}`, '_blank', 'noopener,noreferrer');
  };

  const handleCopyCode = async (code: string) => {
    if (!code) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(code);
      } else {
        const txt = document.createElement('textarea');
        txt.value = code;
        txt.style.position = 'fixed';
        txt.style.left = '-999999px';
        txt.style.top = '-999999px';
        document.body.appendChild(txt);
        txt.focus();
        txt.select();
        document.execCommand('copy');
        txt.remove();
      }
      scheduleFeedback(`Cari kodu panoya kopyalandı: ${code}`, 2500);
    } catch (err) {
      console.warn('Panoya kopyalama başarısız:', err);
      scheduleFeedback(`Cari kodu kopyalanamadı: ${code}`, 3500);
    }
  };

  const handleOpenGoogleMaps = () => {
    const addr = newContact.formattedAddress || computeAddress(newContact);
    if (!addr.trim()) {
      scheduleFeedback('Lütfen haritada aramak için adres bilgilerini doldurunuz.', 3000);
      return;
    }
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const columnDefs = useMemo<ColDef<Contact>[]>(
    () => [
      {
        field: 'code',
        headerName: 'Cari Kodu',
        minWidth: 125,
        width: 135,
        pinned: 'left',
        cellRenderer: (params: ICellRendererParams<Contact>) => {
          const data = params.data;
          const code = data?.code || '-';
          return (
            <div className="flex flex-col justify-center items-start py-0.5 gap-0 px-2">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 w-fit">
                {code}
              </span>
              {data?.status === 'ACTIVE' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 ml-0.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Aktif
                </span>
              )}
              {data?.status === 'LEAD' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 ml-0.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Potansiyel
                </span>
              )}
              {data?.status === 'PASSIVE' && (
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
        field: 'title',
        headerName: 'Cari Ünvan & Yetkili',
        minWidth: 260,
        flex: 1.5,
        pinned: 'left',
        cellRenderer: (params: ICellRendererParams<Contact>) => {
          const data = params.data;
          if (!data) return null;
          return (
            <div className="flex flex-col justify-center py-1">
              <span
                onClick={() => handleOpenEditModal(data)}
                title="Kartı incelemek veya düzenlemek için tıklayın"
                className="font-semibold text-stone-900 text-sm tracking-tight leading-tight hover:text-indigo-600 transition-colors cursor-pointer"
              >
                {data.title}
              </span>
              {data.authorizedPerson && (
                <span className="text-xs text-stone-500 truncate max-w-xs mt-0.5 flex items-center gap-1">
                  <User className="w-3 h-3 text-stone-400" />
                  {data.authorizedPerson}
                </span>
              )}
            </div>
          );
        },
      },
      {
        field: 'contactTypeId',
        headerName: 'Cari Türü',
        minWidth: 125,
        width: 130,
        cellRenderer: (params: ICellRendererParams<Contact>) => {
          const data = params.data;
          if (!data) return null;
          const typeName =
            contactTypes.find((t) => t.id === data.contactTypeId)?.name || 'Müşteri';
          const isSupplier = typeName.toLowerCase().includes('tedarik');
          const isDealer = typeName.toLowerCase().includes('bayi');

          let textStyle = 'text-blue-600';
          if (isSupplier) textStyle = 'text-purple-600';
          else if (isDealer) textStyle = 'text-amber-600';

          return (
            <div className="flex items-center h-full">
              <span className={`inline-flex items-center text-[11px] font-semibold ${textStyle}`}>
                {typeName}
              </span>
            </div>
          );
        },
      },
      {
        field: 'accountRepresentative',
        headerName: 'Müşteri Temsilcisi',
        minWidth: 155,
        width: 165,
        cellRenderer: (params: ICellRendererParams<Contact>) => {
          const rep = params.value;
          if (!rep) return <span className="text-stone-400 text-xs italic">Atanmadı</span>;
          return (
            <div className="flex items-center gap-1.5 h-full text-xs text-stone-700 font-medium">
              <UserCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span className="truncate">{rep}</span>
            </div>
          );
        },
      },
      {
        field: 'mobilePhone1',
        headerName: 'Telefon & İletişim',
        minWidth: 230,
        width: 250,
        cellRenderer: (params: ICellRendererParams<Contact>) => {
          const data = params.data;
          if (!data) return null;

          const phoneList: { label: string; number: string; e164: string }[] = [];
          if (data.mobilePhone1 && data.mobilePhone1.replace(/\D/g, '').length >= 7) {
            phoneList.push({
              label: 'Cep 1',
              number: formatPhoneDisplay(data.mobilePhone1),
              e164: toE164(data.mobilePhone1),
            });
          }
          if (data.mobilePhone2 && data.mobilePhone2.replace(/\D/g, '').length >= 7) {
            phoneList.push({
              label: 'Cep 2',
              number: formatPhoneDisplay(data.mobilePhone2),
              e164: toE164(data.mobilePhone2),
            });
          }

          return (
            <div className="flex flex-col justify-center h-full py-1">
              {phoneList.map((p, idx) => (
                <div key={idx} className="flex items-center leading-tight">
                  <a
                    href={`tel:${p.e164}`}
                    title={`${p.label}: ${p.e164} (Aramak için tıklayın)`}
                    className="text-xs font-semibold text-stone-900 hover:text-indigo-600 hover:underline flex items-center gap-1.5 transition-colors group"
                  >
                    <Phone className="w-3.5 h-3.5 text-stone-400 group-hover:text-indigo-600 shrink-0 transition-colors" />
                    <span className="font-mono">{p.number}</span>
                  </a>
                </div>
              ))}

              {data.email && (
                <div className="flex items-center leading-tight mt-0.5">
                  <a
                    href={`mailto:${data.email}`}
                    title={`E-posta Gönder: ${data.email}`}
                    className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline truncate flex items-center gap-1.5 transition-colors font-medium max-w-[210px]"
                  >
                    <Mail className="w-3 h-3 text-indigo-500 shrink-0" />
                    <span className="truncate">{data.email}</span>
                  </a>
                </div>
              )}

              {phoneList.length === 0 && !data.email && (
                <span className="text-stone-400 text-xs italic leading-tight">İletişim bilgisi yok</span>
              )}
            </div>
          );
        },
      },
      {
        field: 'formattedAddress',
        headerName: 'Tam Adres',
        minWidth: 280,
        width: 320,
        valueGetter: (params) => {
          const c = params.data;
          if (!c) return '';
          return c.formattedAddress || computeAddress(c);
        },
        cellRenderer: (params: ICellRendererParams<Contact>) => {
          const data = params.data;
          if (!data) return null;
          const cityName = TURKEY_CITIES.find((c) => c.id === data.cityId)?.name || '';
          const locationText =
            cityName && data.districtId
              ? `${data.districtId} / ${cityName}`
              : data.districtId || cityName || '';
          const addressBody = data.formattedAddress || computeAddress(data);

          return (
            <div className="flex flex-col justify-center py-1.5 min-w-0" title={addressBody}>
              <div className="flex items-start gap-2 overflow-hidden">
                <div className="mt-1 bg-indigo-50 p-1 rounded-md shrink-0">
                  <MapPin className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-medium text-stone-500 truncate leading-tight">
                    {addressBody}
                  </span>
                  {locationText && (
                    <span className="text-sm font-semibold text-stone-900 leading-tight mt-0.5 tracking-tight">
                      {locationText}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        field: 'taxNumber',
        headerName: 'Vkn / Tckn',
        minWidth: 145,
        width: 155,
        cellRenderer: (params: ICellRendererParams<Contact>) => {
          const data = params.data;
          if (!data) return null;
          const tax = data.taxNumber || data.tcNumber || '-';
          return (
            <div className="flex flex-col justify-center py-1">
              <span className="font-mono text-xs text-stone-800 font-semibold">{tax}</span>
              {data.taxOffice && (
                <span className="text-[10px] text-stone-500 truncate" title={data.taxOffice}>
                  {data.taxOffice}
                </span>
              )}
            </div>
          );
        },
      },
      {
        field: 'isEinvoiceTaxpayer',
        headerName: 'E-Fatura',
        minWidth: 115,
        width: 120,
        cellRenderer: (params: ICellRendererParams<Contact>) => {
          const isE = Boolean(params.value);
          return (
            <div className="flex items-center h-full">
              {isE ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full">
                  <FileCheck className="w-3 h-3 text-emerald-600" />
                  E-Fatura
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium bg-stone-100 text-stone-600 border border-stone-200 rounded-full">
                  E-Arşiv
                </span>
              )}
            </div>
          );
        },
      },
      {
        field: 'currentBalance',
        headerName: 'Cari Bakiye',
        minWidth: 145,
        width: 150,
        sortable: true,
        cellClass: 'text-right font-mono',
        cellRenderer: (params: ICellRendererParams<Contact>) => {
          const val = Number(params.value || 0);
          const curr = params.data?.currency || 'TRY';
          const symbol = curr === 'USD' ? '$' : curr === 'EUR' ? '€' : curr === 'GBP' ? '£' : '₺';
          return (
            <div className="py-1 text-right">
              <span className={`font-semibold text-xs tracking-tight ${val > 0 ? 'text-stone-900' : val < 0 ? 'text-rose-600 font-bold' : 'text-stone-400'}`}>
                {symbol}{val.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          );
        },
      },
      {
        field: 'creditRiskLimit',
        headerName: 'Risk & Vade',
        minWidth: 140,
        width: 150,
        cellRenderer: (params: ICellRendererParams<Contact>) => {
          const data = params.data;
          if (!data) return null;
          const limit = Number(data.creditRiskLimit || 0);
          const days = Number(data.defaultPaymentTermsDays || 0);
          return (
            <div className="flex flex-col justify-center py-1">
              <span className="text-xs font-mono font-medium text-stone-800">
                {limit > 0 ? `₺${limit.toLocaleString('tr-TR')}` : 'Limitsiz'}
              </span>
              <span className="text-[10px] text-stone-500">
                {days > 0 ? `${days} Gün Vade` : 'Peşin'}
              </span>
            </div>
          );
        },
      },
      {
        field: 'branchId',
        headerName: 'Kayıtlı Şube',
        minWidth: 170,
        width: 180,
        cellRenderer: (params: ICellRendererParams<Contact>) => {
          const branchName = getBranchName(params.value);
          const isHQ = branchName.includes('Merkez') || branchName.includes('Levent');
          return (
            <div className="flex items-center gap-1.5 py-1 text-xs">
              <Building2 className={`w-3.5 h-3.5 shrink-0 ${isHQ ? 'text-indigo-600' : 'text-stone-400'}`} />
              <span className="font-medium text-stone-700 truncate">{branchName.split('(')[0]}</span>
            </div>
          );
        },
      },
      {
        headerName: 'İşlemler',
        minWidth: 205,
        width: 210,
        pinned: 'right',
        cellRenderer: (params: ICellRendererParams<Contact>) => {
          const data = params.data;
          if (!data) return null;
          return (
            <div className="flex items-center gap-1.5 py-1">
              <button
                type="button"
                onClick={() => handleOpenEditModal(data)}
                title="Cari Kartını İncele & Düzenle"
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded transition-colors cursor-pointer"
              >
                <FileText className="w-3 h-3" />
                Kartı Aç
              </button>
              <button
                type="button"
                onClick={() => handleWhatsApp(data.mobilePhone1)}
                title="WhatsApp Sohbeti Başlat"
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors shadow-xs cursor-pointer"
              >
                <MessageSquare className="w-3 h-3" />
                WhatsApp
              </button>
              <button
                type="button"
                onClick={() => scheduleFeedback(`${data.title} için cari hesap ekstresi açılıyor...`, 3500)}
                className="px-2 py-1 text-[11px] text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded border border-stone-200 transition-colors cursor-pointer"
              >
                Ekstre
              </button>
            </div>
          );
        },
      },
    ],
    [getBranchName, contactTypes, computeAddress, handleOpenEditModal, scheduleFeedback]
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
    }),
    []
  );

  const rowSelection = useMemo<RowSelectionOptions<Contact>>(
    () => ({
      mode: 'singleRow',
      checkboxes: false,
      enableClickSelection: true,
    }),
    []
  );

  const onGridReady = (params: GridReadyEvent<Contact>) => {
    setGridApi(params.api);
    const savedState = localStorage.getItem(GRID_STORAGE_KEY);
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        const sanitizedState = state.map((col: any) => {
          const cleanCol = { ...col };
          delete cleanCol.checkboxSelection;
          delete cleanCol.headerCheckboxSelection;
          return cleanCol;
        });
        params.api.applyColumnState({ state: sanitizedState, applyOrder: true });
      } catch (e) {
        console.error('Kolon durumu yüklenirken hata oluştu:', e);
      }
    }
  };

  const handleQuickFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuickFilterText(e.target.value);
  };

  const handleExportExcel = () => {
    if (!contacts.length) return;
    const exportData = filteredData.map((c) => ({
      'Cari Kod': c.code,
      'Cari Ünvan': c.title,
      'Yetkili': c.authorizedPerson || '-',
      'Cari Türü': contactTypes.find((t) => t.id === c.contactTypeId)?.name || 'Müşteri',
      'Telefon': c.mobilePhone1 || '-',
      'E-posta': c.email || '-',
      'Şehir': TURKEY_CITIES.find((ci) => ci.id === c.cityId)?.name || '-',
      'Bakiye': c.currentBalance,
      'Döviz': c.currency || 'TRY',
    }));
    downloadCsv(`FX_Cari_Listesi_${new Date().toISOString().slice(0, 10)}.csv`, exportData);
  };

  const handleExportPdf = () => {
    if (!contacts.length) return;
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFillColor(79, 70, 229);
    doc.roundedRect(14, 10, 10, 10, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text('FX', 16, 17);

    doc.setTextColor(40, 40, 40);
    doc.setFontSize(18);
    doc.text('Cari Hesap Listesi', 28, 17);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 14, 25);
    doc.text(`Toplam Kayıt: ${filteredData.length}`, 14, 30);

    const tableData = filteredData.map((c) => [
      c.code,
      c.title,
      contactTypes.find((t) => t.id === c.contactTypeId)?.name || 'Müşteri',
      c.mobilePhone1 || '-',
      TURKEY_CITIES.find((ci) => ci.id === c.cityId)?.name || '-',
      `${(c.currentBalance || 0).toLocaleString('tr-TR')} ${c.currency || 'TRY'}`,
    ]);

    autoTable(doc, {
      head: [['Kod', 'Ünvan', 'Tür', 'Telefon', 'Şehir', 'Bakiye']],
      body: tableData,
      startY: 35,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: 255 },
      styles: { fontSize: 8, font: 'helvetica' },
    });
    doc.save(`FX_Cari_Listesi_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handleDownloadCariCode = async () => {
    try {
      scheduleFeedback('Cari modülü kaynak kodları hazırlanıyor...', 2000);
      const sourceUrl = `${window.location.origin}/src/components/Cari/MusteriListesi.tsx`;
      const response = await fetch(sourceUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error('Kaynak dosyası erişilemedi');

      const text = await response.text();
      const header = `// ==========================================================================\n// FX CARİ & MÜŞTERİ YÖNETİMİ MODÜLÜ KAYNAK KODU (MusteriListesi.tsx)\n// İndirilme Tarihi: ${new Date().toLocaleString('tr-TR')}\n// ==========================================================================\n\n`;
      const fullContent = header + text;
      const blob = new Blob([fullContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Cari_Yonetimi_MusteriListesi_${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      scheduleFeedback('Cari kodları başarıyla .txt dosyası olarak indirildi.', 3500);
    } catch (err) {
      console.warn('Kaynak kodu indirilemedi:', err);
      scheduleFeedback(
        'Kaynak dosyası çalışma ortamında mevcut değil. Lütfen geliştirme ortamında dosya yolunu kontrol edin.',
        5000
      );
    }
  };

  const handleSaveContact = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const validationError = validateContactForm(editingContactId || undefined);
    if (validationError) {
      setActiveFormTab('genel');
      scheduleFeedback(validationError, 5000);
      return;
    }

    try {
      const existingContact = editingContactId
        ? contacts.find((c) => c.id === editingContactId)
        : null;

      const defaultBranchId =
        branches.find((b) => b.isHeadquarter)?.id ||
        branches[0]?.id ||
        '';

      const targetBranchId =
        newContact.branchId ||
        existingContact?.branchId ||
        (selectedBranchId !== 'all' ? selectedBranchId : defaultBranchId);

      if (!targetBranchId) {
        scheduleFeedback('Kayıt için geçerli bir şube seçimi gerekli.', 4000);
        return;
      }

      const payload = {
        branchId: targetBranchId,
        contactTypeId: newContact.contactTypeId,
        code: newContact.code || `CAR-${Math.floor(1000 + Math.random() * 9000)}`,
        status: newContact.status,
        title: newContact.title,
        authorizedPerson: newContact.authorizedPerson,
        accountRepresentative: newContact.accountRepresentative,
        referenceInfo: newContact.referenceInfo,
        mobilePhone1: newContact.mobilePhone1,
        mobilePhone2:
          !newContact.mobilePhone2 || newContact.mobilePhone2.trim() === '+90'
            ? ''
            : newContact.mobilePhone2,
        homePhone:
          !newContact.homePhone || newContact.homePhone.trim() === '+90'
            ? ''
            : newContact.homePhone,
        workPhone:
          !newContact.workPhone || newContact.workPhone.trim() === '+90'
            ? ''
            : newContact.workPhone,
        email: newContact.email,
        website: newContact.website,
        addressType: newContact.addressType,
        isDefaultAddress: newContact.isDefaultAddress,
        cityId: newContact.cityId,
        districtId: newContact.districtId,
        neighborhoodId: newContact.neighborhoodId,
        streetLine: newContact.streetLine,
        doorNumber: newContact.doorNumber,
        apartmentNumber: newContact.apartmentNumber,
        buildingName: newContact.buildingName,
        blockName: newContact.blockName,
        siteName: newContact.siteName,
        formattedAddress: newContact.formattedAddress || computeAddress(newContact),
        taxNumber: newContact.taxNumber,
        taxOffice: newContact.taxOffice,
        tcNumber: newContact.tcNumber,
        isEinvoiceTaxpayer: newContact.isEinvoiceTaxpayer,
        openingBalance: Number(newContact.openingBalance) || 0,
        currentBalance:
          existingContact
            ? (existingContact.currentBalance ?? (Number(newContact.openingBalance) || 0))
            : Number(newContact.openingBalance) || 0,
        currency: newContact.currency,
        creditRiskLimit: Number(newContact.creditRiskLimit) || 0,
        defaultPaymentTermsDays: Number(newContact.defaultPaymentTermsDays) || 0,
        defaultDiscountAmount: Number(newContact.defaultDiscountAmount) || 0,
        notes: newContact.notes,
      };

      if (editingContactId) {
        await fxApi.updateContact(editingContactId, payload);
        scheduleFeedback(`"${payload.title}" cari kartı ve tüm bağlı alanlar başarıyla güncellendi.`, 4000);
      } else {
        await fxApi.createContact(payload);
        scheduleFeedback(`"${payload.title}" yeni cari kartı başarıyla oluşturuldu ve listeye eklendi.`, 4000);
      }

      setIsModalOpen(false);
      setEditingContactId(null);

      const res = await fxApi.getContacts();
      setContacts([...res.data]);
    } catch (err: any) {
      const message = err?.message || 'Cari kart kaydedilemedi.';
      scheduleFeedback(`Hata oluştu: ${message}`, 5000);
    }
  };

  const totalBalance = useMemo(
    () => filteredData.reduce((acc, c) => acc + (c.currentBalance || 0), 0),
    [filteredData]
  );
  const leadsCount = useMemo(
    () => filteredData.filter((c) => c.status === 'LEAD').length,
    [filteredData]
  );
  const customersCount = useMemo(
    () => filteredData.filter((c) => c.status === 'ACTIVE').length,
    [filteredData]
  );

  const sortedCities = useMemo(() => geoService.getCities(), []);

  const currentDistricts = useMemo(() => {
    return geoService.getDistricts(newContact.cityId);
  }, [newContact.cityId]);

  const currentNeighborhoods = useMemo(() => {
    if (!newContact.districtId || newContact.cityId === 0) return [];
    return geoService.getNeighborhoods(newContact.cityId, newContact.districtId);
  }, [newContact.cityId, newContact.districtId]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-stone-200/90 rounded-lg p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Kayıtlı Cari Sayısı</span>
            <Building className="w-4 h-4 text-stone-400" />
          </div>
          <p className="mt-1 text-xl font-bold text-stone-900 tracking-tight">{filteredData.length}</p>
          <span className="text-[11px] text-stone-400">
            {selectedBranchId === 'all' ? 'Tüm Şubeler Konsolide' : getBranchName(selectedBranchId)}
          </span>
        </div>

        <div className="bg-white border border-stone-200/90 rounded-lg p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-700">Muhasebe Müşterileri</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="mt-1 text-xl font-bold text-emerald-950 tracking-tight">{customersCount}</p>
          <span className="text-[11px] text-stone-400">Fatura kesilebilir cari hesap</span>
        </div>

        <div className="bg-white border border-stone-200/90 rounded-lg p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-700">CRM Adayları (Leads)</span>
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="mt-1 text-xl font-bold text-amber-950 tracking-tight">{leadsCount}</p>
          <span className="text-[11px] text-stone-400">Teklif aşamasındaki potansiyel</span>
        </div>

        <div className="bg-white border border-stone-200/90 rounded-lg p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Toplam Cari Bakiye</span>
            <CreditCard className="w-4 h-4 text-stone-400" />
          </div>
          <p className="mt-1 text-xl font-bold text-stone-900 tracking-tight">
            ₺{totalBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-emerald-600 font-medium">Vadesi gelen alacak toplamı</span>
        </div>
      </div>

      {feedbackMessage && (
        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-medium text-indigo-900 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>{feedbackMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-indigo-400 hover:text-indigo-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="bg-white border border-stone-200/90 rounded-lg p-3 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[240px] max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={quickFilterText}
                onChange={handleQuickFilterChange}
                placeholder="İsim, şirket, telefon veya VKN ara..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-50/70 border border-stone-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white text-stone-800 placeholder-stone-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:text-stone-900 hover:bg-stone-50 border border-stone-200 rounded-md transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              CSV
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:text-stone-900 hover:bg-stone-50 border border-stone-200 rounded-md transition-colors"
            >
              <FilePieChart className="w-3.5 h-3.5 text-red-600" />
              PDF
            </button>

            <button
              type="button"
              onClick={handleDownloadCariCode}
              title="Cari modülü kaynak kodunu .txt dosyası olarak bilgisayarınıza indirin"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:text-stone-900 hover:bg-stone-50 border border-stone-200 rounded-md transition-colors cursor-pointer"
            >
              <FilePieChart className="w-3.5 h-3.5 text-emerald-600" />
              Kodları İndir (.txt)
            </button>

            <AgGridSidebarToggleBtn
              isOpen={isSidebarOpen}
              onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
              gridApi={gridApi}
              buttonRef={sidebarButtonRef}
            />

            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors shadow-xs cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Yeni Cari / Müşteri Ekle
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-4 items-start relative h-[560px]">
        <div className={`bg-white border border-stone-200/90 rounded-lg shadow-xs overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'flex-1' : 'w-full'}`}>
          <div className="w-full" style={{ height: '560px', width: '100%' }}>
            <AgGridReact<Contact>
              theme={appTheme}
              ref={gridRef}
              localeText={AG_GRID_LOCALE_TR}
              rowData={filteredData}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              rowSelection={rowSelection}
              pagination={true}
              paginationPageSize={10}
              paginationPageSizeSelector={[10, 25, 50]}
              onGridReady={onGridReady}
              onColumnMoved={onSaveGridState}
              onColumnVisible={onSaveGridState}
              onColumnResized={onSaveGridState}
              onSortChanged={onSaveGridState}
              onCellContextMenu={handleCellContextMenu}
              getRowStyle={(params) => {
                if (params.data?.status === 'PASSIVE') {
                  return { backgroundColor: '#fdfcfb', color: '#78716c' };
                }
                return undefined;
              }}
              rowHeight={70}
              headerHeight={42}
              animateRows={true}
              enableCellTextSelection={true}
              suppressCellFocus={false}
            />
          </div>
        </div>

        {isSidebarOpen && (
          <AgGridColumnSidebar
            gridApi={gridApi}
            onSaveGridState={onSaveGridState}
            onClose={() => setIsSidebarOpen(false)}
            primaryColIds={['code', 'title', 'contactTypeId', 'formattedAddress', 'mobilePhone1', 'actions']}
            sidebarRef={sidebarRef}
            columnsRevision={gridColumnsRevision}
          />
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#0B132B] border border-slate-800 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scale-in">
            <div className="bg-[#0B132B] border-b border-slate-800/90 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    {editingContactId ? 'Cari Kartını İncele & Düzenle' : 'Yeni Cari Kartı Oluştur'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {editingContactId
                      ? `${newContact.code} • ${newContact.title || 'Seçili Cari'}`
                      : 'AG Grid tablosu ve veritabanı ile tam uyumlu veri girişi'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleSaveContact()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  {editingContactId ? 'Güncellemeleri Kaydet' : 'Kaydet'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingContactId(null);
                  }}
                  className="text-slate-400 hover:text-white p-1.5 hover:bg-slate-800/60 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex items-center px-6 border-b border-slate-800/80 bg-[#0B132B]">
              <button
                type="button"
                onClick={() => setActiveFormTab('genel')}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold transition-all border-b-2 -mb-px cursor-pointer ${
                  activeFormTab === 'genel'
                    ? 'border-blue-500 text-blue-400 bg-blue-950/30'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <User className="w-4 h-4" />
                Genel Bilgiler & İletişim
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('adres')}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold transition-all border-b-2 -mb-px cursor-pointer ${
                  activeFormTab === 'adres'
                    ? 'border-blue-500 text-blue-400 bg-blue-950/30'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <MapPin className="w-4 h-4" />
                Adres Bilgileri
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('finans')}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold transition-all border-b-2 -mb-px cursor-pointer ${
                  activeFormTab === 'finans'
                    ? 'border-blue-500 text-blue-400 bg-blue-950/30'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                Fatura Ve Finansal Bilgiler
              </button>
            </div>

            <form onSubmit={handleSaveContact} className="p-6 overflow-y-auto max-h-[75vh] space-y-4 bg-[#0B132B] text-white">
              {activeFormTab === 'genel' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">Cari Kodu *</label>
                      <input
                        type="text"
                        required
                        value={newContact.code}
                        onChange={(e) => setNewContact({ ...newContact, code: e.target.value })}
                        className="w-full bg-[#0B132B] border border-slate-700/80 rounded-lg px-3 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                        placeholder="Örn: CAR-001"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-slate-300">Cari Türü *</label>
                        <button
                          type="button"
                          onClick={() => setIsContactTypeModalOpen(true)}
                          className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          + Ekle
                        </button>
                      </div>
                      <select
                        value={newContact.contactTypeId}
                        onChange={(e) => setNewContact({ ...newContact, contactTypeId: e.target.value })}
                        className="w-full bg-[#0B132B] border border-slate-700/80 rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
                      >
                        {contactTypes.map((type) => (
                          <option key={type.id} value={type.id} className="bg-slate-900 text-white">
                            {type.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">Kayıtlı Şube *</label>
                      <select
                        value={newContact.branchId}
                        onChange={(e) => setNewContact({ ...newContact, branchId: e.target.value })}
                        className="w-full bg-[#0B132B] border border-slate-700/80 rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
                      >
                        {branches.map((b) => (
                          <option key={b.id} value={b.id} className="bg-slate-900 text-white">
                            {b.name} {b.isHeadquarter ? '(Merkez)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Cari Ünvan (Firma/Şahıs Adı) *</label>
                    <input
                      type="text"
                      required
                      value={newContact.title}
                      onChange={(e) => setNewContact({ ...newContact, title: e.target.value })}
                      className="w-full bg-[#0B132B] border border-slate-700/80 rounded-lg px-3 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors font-semibold"
                      placeholder="Resmi Ünvan"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">Yetkili Kişi Adı Soyadı</label>
                      <input
                        type="text"
                        value={newContact.authorizedPerson}
                        onChange={(e) => setNewContact({ ...newContact, authorizedPerson: e.target.value })}
                        className="w-full bg-[#0B132B] border border-slate-700/80 rounded-lg px-3 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">Referans</label>
                      <input
                        type="text"
                        value={newContact.referenceInfo}
                        onChange={(e) => setNewContact({ ...newContact, referenceInfo: e.target.value })}
                        className="w-full bg-[#0B132B] border border-slate-700/80 rounded-lg px-3 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">Cep Telefonu 1 *</label>
                      <input
                        type="tel"
                        required
                        value={newContact.mobilePhone1}
                        onChange={(e) => setNewContact({ ...newContact, mobilePhone1: formatPhoneNumber(e.target.value) })}
                        className="w-full bg-[#0B132B] border border-slate-700/80 rounded-lg px-3 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors font-mono"
                        placeholder="+90 (5XX) XXX XX XX"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">Cep Telefonu 2</label>
                      <input
                        type="tel"
                        value={newContact.mobilePhone2}
                        onChange={(e) => setNewContact({ ...newContact, mobilePhone2: formatPhoneNumber(e.target.value) })}
                        className="w-full bg-[#0B132B] border border-slate-700/80 rounded-lg px-3 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors font-mono"
                        placeholder="+90 (5XX) XXX XX XX"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">Ev Telefonu</label>
                      <input
                        type="tel"
                        value={newContact.homePhone}
                        onChange={(e) => setNewContact({ ...newContact, homePhone: formatPhoneNumber(e.target.value) })}
                        className="w-full bg-[#0B132B] border border-slate-700/80 rounded-lg px-3 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">İş Telefonu</label>
                      <input
                        type="tel"
                        value={newContact.workPhone}
                        onChange={(e) => setNewContact({ ...newContact, workPhone: formatPhoneNumber(e.target.value) })}
                        className="w-full bg-[#0B132B] border border-slate-700/80 rounded-lg px-3 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">E-Posta Adresi</label>
                      <input
                        type="email"
                        value={newContact.email}
                        onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                        className="w-full bg-[#0B132B] border border-slate-700/80 rounded-lg px-3 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                        placeholder="ornek@firma.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">Web Sitesi</label>
                      <input
                        type="text"
                        value={newContact.website}
                        onChange={(e) => setNewContact({ ...newContact, website: e.target.value })}
                        className="w-full bg-[#0B132B] border border-slate-700/80 rounded-lg px-3 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                        placeholder="www.firma.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-800/80">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">Cari Durumu</label>
                      <select
                        value={newContact.status}
                        onChange={(e) => setNewContact({ ...newContact, status: e.target.value as ContactStatus })}
                        className="w-full bg-[#0B132B] border border-slate-700/80 rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
                      >
                        <option value="ACTIVE" className="bg-slate-900 text-white">Aktif</option>
                        <option value="PASSIVE" className="bg-slate-900 text-white">Pasif</option>
                        <option value="LEAD" className="bg-slate-900 text-white">Potansiyel (Lead)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">Müşteri Temsilcisi</label>
                      <select
                        value={newContact.accountRepresentative}
                        onChange={(e) => setNewContact({ ...newContact, accountRepresentative: e.target.value })}
                        className="w-full bg-[#0B132B] border border-slate-700/80 rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
                      >
                        <option value="" className="bg-slate-900 text-slate-400">Seçiniz...</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={`${emp.firstName} ${emp.lastName}`} className="bg-slate-900 text-white">
                            {emp.firstName} {emp.lastName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeFormTab === 'adres' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-slate-300">Adres Tipi *</label>
                        <button
                          type="button"
                          onClick={() => setIsAddressTypeModalOpen(true)}
                          className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          + Ekle / Yönet
                        </button>
                      </div>
                      <select
                        value={newContact.addressType}
                        onChange={(e) => setNewContact({ ...newContact, addressType: e.target.value })}
                        className="w-full bg-[#0B132B] border border-slate-700/80 rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
                      >
                        {addressTypes.map((type) => (
                          <option key={type} value={type} className="bg-slate-900 text-white">
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center md:pt-6">
                      <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-200 select-none">
                        <input
                          type="checkbox"
                          checked={newContact.isDefaultAddress}
                          onChange={(e) => setNewContact({ ...newContact, isDefaultAddress: e.target.checked })}
                          className="w-4 h-4 rounded text-blue-600 bg-slate-900 border-slate-700 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                        />
                        <span>Bu Adresi Birincil / Varsayılan Adres Yap</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">Şehir *</label>
                      <select
                        value={newContact.cityId}
                        onChange={(e) => {
                          const cid = Number(e.target.value);
                          const dists = geoService.getDistricts(cid);
                          const firstDist = dists.length > 0 ? dists[0] : '';
                          setNewContact((prev) => {
                            const updated = { ...prev, cityId: cid, districtId: firstDist, neighborhoodId: '' };
                            return { ...updated, formattedAddress: computeAddress(updated) };
                          });
                        }}
                        className="w-full bg-[#0B132B] border border-slate-700/80 rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
                      >
                        {sortedCities.map((city) => (
                          <option key={city.id} value={city.id} className="bg-slate-900 text-white">
                            {city.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">İlçe *</label>
                      <select
                        value={newContact.districtId}
                        onChange={(e) => {
                          const dist = e.target.value;
                          setNewContact((prev) => {
                            const updated = { ...prev, districtId: dist, neighborhoodId: '' };
                            return { ...updated, formattedAddress: computeAddress(updated) };
                          });
                        }}
                        disabled={!newContact.cityId}
                        className="w-full bg-[#0B132B] border border-slate-700/80 rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 disabled:opacity-40 transition-colors cursor-pointer"
                      >
                        <option value="" className="bg-slate-900 text-white">İlçe Seçiniz...</option>
                        {currentDistricts.map((d) => (
                          <option key={d} value={d} className="bg-slate-900 text-white">{d}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">Mahalle *</label>
                      <select
                        value={newContact.neighborhoodId}
                        onChange={(e) => {
                          const hood = e.target.value;
                          setNewContact((prev) => {
                            const updated = { ...prev, neighborhoodId: hood };
                            return { ...updated, formattedAddress: computeAddress(updated) };
                          });
                        }}
                        disabled={!newContact.districtId}
                        className="w-full bg-[#0B132B] border border-slate-700/80 rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 disabled:opacity-40 transition-colors cursor-pointer"
                      >
                        <option value="" className="bg-slate-900 text-white">Mahalle Seçiniz...</option>
                        {currentNeighborhoods.map((n) => (
                          <option key={n} value={n} className="bg-slate-900 text-white">{n}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-12 md:col-span-7">
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">Sokak / Cadde / Bulvar *</label>
                      <input
                        type="text"
                        value={newContact.streetLine}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewContact((prev) => {
                            const updated = { ...prev, streetLine: val };
                            return { ...updated, formattedAddress: computeAddress(updated) };
                          });
                        }}
                        placeholder="1024 Sokak"
                        className="w-full bg-[#0B132B] border border-slate-700/80 rounded-lg px-3 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>

                    <div className="col-span-6 md:col-span-2">
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">Kapı No *</label>
                      <input
                        type="text"
                        value={newContact.doorNumber}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewContact((prev) => {
                            const updated = { ...prev, doorNumber: val };
                            return { ...updated, formattedAddress: computeAddress(updated) };
                          });
                        }}
                        placeholder="12"
                        className="w-full bg-[#0B132B] border border-slate-700/80 rounded-lg px-3 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>

                    <div className="col-span-6 md:col-span-3">
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">Daire No</label>
                      <input
                        type="text"
                        value={newContact.apartmentNumber}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewContact((prev) => {
                            const updated = { ...prev, apartmentNumber: val };
                            return { ...updated, formattedAddress: computeAddress(updated) };
                          });
                        }}
                        placeholder="4"
                        className="w-full bg-[#0B132B] border border-slate-700/80 rounded-lg px-3 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">Apartman Adı</label>
                      <input
                        type="text"
                        value={newContact.buildingName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewContact((prev) => {
                            const updated = { ...prev, buildingName: val };
                            return { ...updated, formattedAddress: computeAddress(updated) };
                          });
                        }}
                        placeholder="Filtrex Plaza"
                        className="w-full bg-[#0B132B] border border-slate-700/80 rounded-lg px-3 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">Blok Adı</label>
                      <input
                        type="text"
                        value={newContact.blockName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewContact((prev) => {
                            const updated = { ...prev, blockName: val };
                            return { ...updated, formattedAddress: computeAddress(updated) };
                          });
                        }}
                        placeholder="A Blok"
                        className="w-full bg-[#0B132B] border border-slate-700/80 rounded-lg px-3 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">Site Adı</label>
                      <input
                        type="text"
                        value={newContact.siteName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewContact((prev) => {
                            const updated = { ...prev, siteName: val };
                            return { ...updated, formattedAddress: computeAddress(updated) };
                          });
                        }}
                        placeholder="Buca Organize Sanayi Sitesi"
                        className="w-full bg-[#0B132B] border border-slate-700/80 rounded-lg px-3 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <label className="text-xs font-medium text-slate-300">Birleştirilmiş Resmi Adres (Google Haritalar Uyumlu)</label>
                        <button
                          type="button"
                          onClick={handleOpenGoogleMaps}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium px-3 py-1 rounded-full flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          Haritada Aç
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNewContact((prev) => ({ ...prev, formattedAddress: computeAddress(prev) }))}
                        className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        Otomatik Yenile
                      </button>
                    </div>

                    <textarea
                      rows={3}
                      value={newContact.formattedAddress}
                      onChange={(e) => setNewContact({ ...newContact, formattedAddress: e.target.value })}
                      placeholder="Buca OSB Mah. 1024 Sokak Buca Organize Sanayi Sitesi No:12 Buca / İzmir"
                      className="w-full bg-[#070B19] border border-slate-700/80 rounded-lg p-3 text-xs font-mono text-slate-200 resize-none min-h-[72px] focus:outline-none focus:border-blue-500 leading-relaxed"
                    />
                  </div>
                </div>
              )}

              {activeFormTab === 'finans' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">Vergi Numarası</label>
                      <input
                        type="text"
                        maxLength={10}
                        value={newContact.taxNumber}
                        onChange={(e) => setNewContact({ ...newContact, taxNumber: e.target.value })}
                        className="w-full bg-[#0B132B] border border-slate-700/80 rounded-lg px-3 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors font-mono"
                        placeholder="10 hane"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">Vergi Dairesi</label>
                      <input
                        type="text"
                        value={newContact.taxOffice}
                        onChange={(e) => setNewContact({ ...newContact, taxOffice: e.target.value })}
                        className="w-full bg-[#0B132B] border border-slate-700/80 rounded-lg px-3 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">T.C. Kimlik No</label>
                      <input
                        type="text"
                        maxLength={11}
                        value={newContact.tcNumber}
                        onChange={(e) => setNewContact({ ...newContact, tcNumber: e.target.value })}
                        className="w-full bg-[#0B132B] border border-slate-700/80 rounded-lg px-3 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors font-mono"
                        placeholder="11 hane"
                      />
                    </div>
                    <div className="flex items-center md:pt-6">
                      <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-200 select-none">
                        <input
                          type="checkbox"
                          checked={newContact.isEinvoiceTaxpayer}
                          onChange={(e) => setNewContact({ ...newContact, isEinvoiceTaxpayer: e.target.checked })}
                          className="w-4 h-4 rounded text-blue-600 bg-slate-900 border-slate-700 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                        />
                        <span>E-Fatura Mükellefi</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">Açılış Bakiyesi</label>
                      <input
                        type="number"
                        value={newContact.openingBalance}
                        onChange={(e) => setNewContact({ ...newContact, openingBalance: Number(e.target.value) })}
                        className="w-full bg-[#0B132B] border border-slate-700/80 rounded-lg px-3 py-2.5 text-xs text-blue-400 font-mono focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">Para Birimi</label>
                      <select
                        value={newContact.currency}
                        onChange={(e) => setNewContact({ ...newContact, currency: e.target.value })}
                        className="w-full bg-[#0B132B] border border-slate-700/80 rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
                      >
                        <option value="TRY" className="bg-slate-900 text-white">₺ TRY</option>
                        <option value="USD" className="bg-slate-900 text-white">$ USD</option>
                        <option value="EUR" className="bg-slate-900 text-white">€ EUR</option>
                        <option value="GBP" className="bg-slate-900 text-white">£ GBP</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">Kredi Risk Limiti (₺)</label>
                      <input
                        type="number"
                        value={newContact.creditRiskLimit}
                        onChange={(e) => setNewContact({ ...newContact, creditRiskLimit: Number(e.target.value) })}
                        className="w-full bg-[#0B132B] border border-slate-700/80 rounded-lg px-3 py-2.5 text-xs text-red-400 font-mono font-semibold focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">Varsayılan Vade Gün</label>
                      <input
                        type="number"
                        value={newContact.defaultPaymentTermsDays}
                        onChange={(e) => setNewContact({ ...newContact, defaultPaymentTermsDays: Number(e.target.value) })}
                        className="w-full bg-[#0B132B] border border-slate-700/80 rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">İskonto Tutarı (₺ veya %)</label>
                    <input
                      type="number"
                      value={newContact.defaultDiscountAmount}
                      onChange={(e) => setNewContact({ ...newContact, defaultDiscountAmount: Number(e.target.value) })}
                      className="w-full bg-[#0B132B] border border-slate-700/80 rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Cari Açıklama / Notlar</label>
                    <textarea
                      rows={2}
                      value={newContact.notes}
                      onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })}
                      className="w-full bg-[#0B132B] border border-slate-700/80 rounded-lg p-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                      placeholder="Cari hakkında özel notlar..."
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-slate-800/80 mt-2">
                <div>
                  {activeFormTab === 'adres' && (
                    <button
                      type="button"
                      onClick={() => setActiveFormTab('genel')}
                      className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Önceki: Genel Bilgiler
                    </button>
                  )}
                  {activeFormTab === 'finans' && (
                    <button
                      type="button"
                      onClick={() => setActiveFormTab('adres')}
                      className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Önceki: Adres Bilgileri
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingContactId(null);
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  >
                    İptal
                  </button>

                  {activeFormTab === 'genel' && (
                    <button
                      type="button"
                      onClick={() => setActiveFormTab('adres')}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
                    >
                      Sonraki: Adres Bilgileri
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}

                  {activeFormTab === 'adres' && (
                    <button
                      type="button"
                      onClick={() => setActiveFormTab('finans')}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
                    >
                      Sonraki: Finansal Bilgiler
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}

                  {activeFormTab === 'finans' && (
                    <button
                      type="submit"
                      className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      {editingContactId ? 'Güncellemeleri Kaydet' : 'Cariyi Kaydet'}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAddressTypeModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#0B132B] border border-slate-700 rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-scale-in text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-400" />
                Adres Tiplerini Yönet & Ekle
              </h4>
              <button
                type="button"
                onClick={() => setIsAddressTypeModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">Mevcut Adres Tipleri</label>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {addressTypes.map((type) => (
                  <div
                    key={type}
                    className={`flex items-center justify-between p-2 rounded-lg border text-xs transition-colors ${
                      newContact.addressType === type
                        ? 'bg-blue-600/20 border-blue-500/50 text-blue-300 font-semibold'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {newContact.addressType === type && <Check className="w-3.5 h-3.5 text-blue-400" />}
                      {type}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setNewContact({ ...newContact, addressType: type });
                          setIsAddressTypeModalOpen(false);
                        }}
                        className="text-[11px] text-blue-400 hover:text-blue-300 px-2 py-0.5 rounded bg-blue-950/50 hover:bg-blue-900/50 transition-colors cursor-pointer"
                      >
                        Seç
                      </button>
                      {!['Fatura Adresi', 'Sevkiyat Adresi', 'Depo Adresi'].includes(type) && (
                        <button
                          type="button"
                          onClick={() => {
                            setAddressTypes((prev) => prev.filter((t) => t !== type));
                            if (newContact.addressType === type) setNewContact({ ...newContact, addressType: 'Fatura Adresi' });
                          }}
                          className="text-red-400 hover:text-red-300 p-1 transition-colors cursor-pointer"
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

            <div className="pt-2 border-t border-slate-800 space-y-2">
              <label className="text-xs font-medium text-slate-300">Yeni Adres Tipi Ekle</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newAddressTypeInput}
                  onChange={(e) => setNewAddressTypeInput(e.target.value)}
                  placeholder="Örn: Fabrika, Üretim Tesisi, Mağaza..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newAddressTypeInput.trim()) {
                        const trimmed = newAddressTypeInput.trim();
                        if (!addressTypes.includes(trimmed)) {
                          setAddressTypes([...addressTypes, trimmed]);
                          setNewContact({ ...newContact, addressType: trimmed });
                        }
                        setNewAddressTypeInput('');
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newAddressTypeInput.trim()) {
                      const trimmed = newAddressTypeInput.trim();
                      if (!addressTypes.includes(trimmed)) {
                        setAddressTypes([...addressTypes, trimmed]);
                        setNewContact({ ...newContact, addressType: trimmed });
                      }
                      setNewAddressTypeInput('');
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium px-4 py-2 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Ekle
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsAddressTypeModalOpen(false)}
                className="px-4 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {isContactTypeModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#0B132B] border border-slate-700 rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-scale-in text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                Cari Türlerini Yönet & Ekle
              </h4>
              <button
                type="button"
                onClick={() => setIsContactTypeModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">Mevcut Cari Türleri</label>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {contactTypes.map((type) => (
                  <div
                    key={type.id}
                    className={`flex items-center justify-between p-2 rounded-lg border text-xs transition-colors ${
                      newContact.contactTypeId === type.id
                        ? 'bg-blue-600/20 border-blue-500/50 text-blue-300 font-semibold'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {newContact.contactTypeId === type.id && <Check className="w-3.5 h-3.5 text-blue-400" />}
                      {type.name}
                      {type.isSystem && (
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">Sistem</span>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setNewContact({ ...newContact, contactTypeId: type.id });
                          setIsContactTypeModalOpen(false);
                        }}
                        className="text-[11px] text-blue-400 hover:text-blue-300 px-2 py-0.5 rounded bg-blue-950/50 hover:bg-blue-900/50 transition-colors cursor-pointer"
                      >
                        Seç
                      </button>
                      {!type.isSystem && (
                        <button
                          type="button"
                          onClick={() => {
                            setContactTypes((prev) => prev.filter((t) => t.id !== type.id));
                            if (newContact.contactTypeId === type.id) setNewContact({ ...newContact, contactTypeId: 'ct-1' });
                          }}
                          className="text-red-400 hover:text-red-300 p-1 transition-colors cursor-pointer"
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

            <div className="pt-2 border-t border-slate-800 space-y-2">
              <label className="text-xs font-medium text-slate-300">Yeni Cari Türü Ekle</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newContactTypeInput}
                  onChange={(e) => setNewContactTypeInput(e.target.value)}
                  placeholder="Örn: Distribütör, Fason Üretici, Şube, Acente..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newContactTypeInput.trim()) {
                        const trimmed = newContactTypeInput.trim();
                        const exists = contactTypes.some((t) => t.name.toLowerCase() === trimmed.toLowerCase());
                        if (!exists) {
                          const newId = `ct-${Date.now()}`;
                          const newType: ContactType = {
                            id: newId,
                            tenantId: 't-1',
                            code: trimmed.toUpperCase().replace(/\s+/g, '_'),
                            name: trimmed,
                            isSystem: false,
                            isActive: true,
                          };
                          setContactTypes((prev) => [...prev, newType]);
                          setNewContact({ ...newContact, contactTypeId: newId });
                        }
                        setNewContactTypeInput('');
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newContactTypeInput.trim()) {
                      const trimmed = newContactTypeInput.trim();
                      const exists = contactTypes.some((t) => t.name.toLowerCase() === trimmed.toLowerCase());
                      if (!exists) {
                        const newId = `ct-${Date.now()}`;
                        const newType: ContactType = {
                          id: newId,
                          tenantId: 't-1',
                          code: trimmed.toUpperCase().replace(/\s+/g, '_'),
                          name: trimmed,
                          isSystem: false,
                          isActive: true,
                        };
                        setContactTypes((prev) => [...prev, newType]);
                        setNewContact({ ...newContact, contactTypeId: newId });
                      }
                      setNewContactTypeInput('');
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium px-4 py-2 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Ekle
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsContactTypeModalOpen(false)}
                className="px-4 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {contextMenu && (
        <div
          className="fixed z-100 w-52 bg-white border border-stone-200 rounded-lg shadow-xl py-1.5 animate-in fade-in zoom-in duration-100"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <div className="px-3 py-2 border-b border-stone-100">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Hızlı İşlemler</p>
            <p className="text-xs font-bold text-stone-800 truncate">{contextMenu.data.title}</p>
          </div>
          <div className="py-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenEditModal(contextMenu.data);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-stone-700 hover:bg-stone-50 hover:text-indigo-600 transition-colors"
            >
              <Eye className="w-4 h-4 text-stone-400" />
              Kartı İncele
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleCopyCode(contextMenu.data.code);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-stone-700 hover:bg-stone-50 hover:text-indigo-600 transition-colors"
            >
              <Copy className="w-4 h-4 text-stone-400" />
              Cari Kodu Kopyala
            </button>
            {contextMenu.data.mobilePhone1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleWhatsApp(contextMenu.data.mobilePhone1);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-stone-700 hover:bg-stone-50 hover:text-emerald-600 transition-colors"
              >
                <MessageSquare className="w-4 h-4 text-emerald-500" />
                WhatsApp Mesajı
              </button>
            )}
            {contextMenu.data.email && (
              <a
                href={`mailto:${contextMenu.data.email}`}
                onClick={() => setContextMenu(null)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-stone-700 hover:bg-stone-50 hover:text-blue-600 transition-colors"
              >
                <Mail className="w-4 h-4 text-blue-500" />
                E-posta Gönder
              </a>
            )}
          </div>
          <div className="border-t border-stone-100 pt-1 mt-1">
            <button
              type="button"
              onClick={() => {
                setDetailContact(contextMenu.data);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-stone-700 hover:bg-stone-50 transition-colors"
            >
              <Info className="w-4 h-4 text-stone-400" />
              Gelişmiş Detaylar
            </button>
          </div>
        </div>
      )}

      {detailContact && (
        <div className="fixed inset-0 z-100 overflow-hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDetailContact(null)} />
          <div className="absolute inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 leading-none mb-1">{detailContact.title}</h3>
                  <p className="text-xs text-stone-500 flex items-center gap-1.5 font-mono">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {detailContact.code}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailContact(null)}
                className="p-2 hover:bg-stone-200 rounded-full text-stone-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Güncel Bakiye</p>
                  <p className="text-lg font-bold text-emerald-900 font-mono">
                    ₺{(detailContact.currentBalance || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                  <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1">Kredi / Risk Limiti</p>
                  <p className="text-lg font-bold text-indigo-900 font-mono">
                    ₺{(detailContact.creditRiskLimit || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                  <Info className="w-3.5 h-3.5" />
                  İletişim & Konum
                </h4>
                <div className="grid grid-cols-1 gap-3 bg-stone-50 p-4 rounded-xl border border-stone-100">
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="w-4 h-4 text-stone-400" />
                    <span className="text-stone-700">{detailContact.mobilePhone1 || 'Belirtilmemiş'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="w-4 h-4 text-stone-400" />
                    <span className="text-stone-700">{detailContact.email || 'Belirtilmemiş'}</span>
                  </div>
                  <div className="flex items-start gap-3 text-sm">
                    <MapPin className="w-4 h-4 text-stone-400 mt-0.5" />
                    <span className="text-stone-700 leading-relaxed">
                      {detailContact.formattedAddress || 'Adres bilgisi girilmemiş.'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                  <RotateCw className="w-3.5 h-3.5" />
                  Hesap Hareketleri Özeti
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-white border border-stone-100 rounded-lg hover:border-indigo-200 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-50 text-indigo-600">
                        <FileCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-stone-800">Açılış Bakiyesi</p>
                        <p className="text-[10px] text-stone-500">Kayıt Tarihi</p>
                      </div>
                    </div>
                    <p className="text-xs font-bold font-mono text-indigo-700">
                      ₺{(detailContact.openingBalance || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white border border-stone-100 rounded-lg hover:border-indigo-200 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-600">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-stone-800">Net Cari Bakiye Durumu</p>
                        <p className="text-[10px] text-stone-500">{detailContact.status === 'ACTIVE' ? 'Aktif Hesap' : 'Pasif/Potansiyel'}</p>
                      </div>
                    </div>
                    <p className={`text-xs font-bold font-mono ${(detailContact.currentBalance || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {(detailContact.currentBalance || 0) >= 0 ? '+' : ''}₺{(detailContact.currentBalance || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-stone-50 border-t border-stone-100 flex gap-3">
              <button
                type="button"
                onClick={() => handleOpenEditModal(detailContact)}
                className="flex-1 bg-white border border-stone-200 text-stone-700 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-stone-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <Save className="w-4 h-4" />
                Kartı Düzenle
              </button>
              <button
                type="button"
                onClick={() => setDetailContact(null)}
                className="flex-1 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Tamam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
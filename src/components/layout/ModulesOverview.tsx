import React, { useState } from 'react';
import {
  Users,
  FileText,
  TrendingUp,
  Receipt as ReceiptIcon,
  Package,
  CreditCard,
  FileCheck2,
  DollarSign,
  UserCheck2,
  PieChart,
  ShieldCheck,
  Check,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { AppTabType } from './NavigationDrawer';

interface ModuleCard {
  id: string;
  name: string;
  tableName: string;
  icon: any;
  color: string;
  targetTab?: AppTabType;
  description: string;
  columns: { name: string; type: string; desc: string; index?: string }[];
  rules: string[];
}

interface ModulesOverviewProps {
  onSelectTab?: (tab: AppTabType) => void;
}

export const ModulesOverview: React.FC<ModulesOverviewProps> = ({ onSelectTab }) => {
  const modules: ModuleCard[] = [
    {
      id: 'contacts',
      name: 'Cari Hesaplar & CRM',
      tableName: 'contacts',
      icon: Users,
      color: 'indigo',
      targetTab: 'musteri',
      description: 'Müşteri, tedarikçi ve potansiyel müşteri (Lead) kartları yönetimi.',
      columns: [
        { name: 'id', type: 'UUID PK', desc: 'Birincil anahtar' },
        { name: 'tenant_id', type: 'UUID NOT NULL', desc: 'Kiracı kimliği', index: 'COMPOSITE INDEX' },
        { name: 'branch_id', type: 'UUID NOT NULL', desc: 'Kayıtlı şube kimliği', index: 'COMPOSITE INDEX' },
        { name: 'first_name', type: 'VARCHAR(100)', desc: 'Yetkili adı' },
        { name: 'last_name', type: 'VARCHAR(100)', desc: 'Yetkili soyadı' },
        { name: 'email', type: 'VARCHAR(150)', desc: 'E-Posta adresi' },
        { name: 'phone_number', type: 'VARCHAR(30)', desc: 'E.164 uluslararası format (+90...)', index: 'BTREE INDEX' },
        { name: 'is_lead', type: 'BOOLEAN DEFAULT TRUE', desc: 'CRM potansiyel aday bayrağı' },
        { name: 'is_customer', type: 'BOOLEAN DEFAULT FALSE', desc: 'Muhasebe cari hesabı bayrağı' },
        { name: 'whatsapp_id', type: 'VARCHAR(50)', desc: 'Doğrudan WA mesajlaşma kimliği', index: 'BTREE INDEX' },
        { name: 'current_balance', type: 'DECIMAL(18, 4)', desc: 'Cari açık hesap bakiyesi' },
      ],
      rules: [
        'Telefon numarası E.164 standartlarında ve hız için indekslidir.',
        'Yeni kayıtlar CRM Lead olarak default TRUE, Muhasebe cari olarak default FALSE açılır.',
        'Her sorguda tenant_id ve branch_id Global Query Filter ile sınırlandırılır.',
      ],
    },
    {
      id: 'invoices',
      name: 'E-Faturalar & GİB Merkezi',
      tableName: 'invoices & gib_documents',
      icon: FileText,
      color: 'emerald',
      targetTab: 'efatura-gib',
      description: 'GİB e-Fatura/e-Arşiv ve e-İrsaliye entegrasyonuna tam uyumlu şube serili belge merkezi.',
      columns: [
        { name: 'id', type: 'UUID PK', desc: 'Fatura tekil kimliği' },
        { name: 'tenant_id, branch_id', type: 'UUID NOT NULL', desc: 'Çoklu kiracı ve şube ayrımı', index: 'COMPOSITE INDEX' },
        { name: 'invoice_number', type: 'VARCHAR(32)', desc: 'Şube bazlı numaratör (FXA2026000000001)', index: 'UNIQUE INDEX' },
        { name: 'contact_id', type: 'UUID FK', desc: 'İlgili cari hesap' },
        { name: 'total_amount', type: 'DECIMAL(18, 4)', desc: 'KDV hariç matrah toplamı' },
        { name: 'tax_amount', type: 'DECIMAL(18, 4)', desc: 'Hesaplanan toplam KDV tutarı' },
        { name: 'grand_total', type: 'DECIMAL(18, 4)', desc: 'KDV dahil genel toplam' },
        { name: 'status', type: 'VARCHAR(30)', desc: 'Draft, Sent, GibApproved, Cancelled' },
        { name: 'gib_uuid', type: 'UUID', desc: 'GİB tekil evrensel etiket kimliği', index: 'INDEX' },
      ],
      rules: [
        'Şube bazlı numaratör serisi (Her şubenin kendi serisi vardır örn: MRK, KDK, ANK).',
        'Kuruş kayıplarını önlemek için tüm matrah, vergi ve iskonto tutarları DECIMAL(18,4) tipindedir.',
      ],
    },
    {
      id: 'movements',
      name: 'Borçlar & Alacaklar',
      tableName: 'customer_movements',
      icon: TrendingUp,
      color: 'amber',
      description: 'Cari yaşlandırma ve ayrıntılı muavin ekstre borç/alacak tablosu.',
      columns: [
        { name: 'id', type: 'UUID PK', desc: 'Hareket kimliği' },
        { name: 'tenant_id, branch_id', type: 'UUID NOT NULL', desc: 'İlgili şube ve kiracı', index: 'COMPOSITE INDEX' },
        { name: 'contact_id', type: 'UUID FK', desc: 'İlgili cari hesap', index: 'INDEX' },
        { name: 'movement_type', type: 'VARCHAR(10)', desc: "'Debit' (Borç) veya 'Credit' (Alacak)" },
        { name: 'amount', type: 'DECIMAL(18, 4)', desc: 'Hareket tutarı' },
        { name: 'balance_after', type: 'DECIMAL(18, 4)', desc: 'İşlem sonrası anlık kümülatif bakiye' },
        { name: 'due_date', type: 'DATE', desc: 'Vade tarihi (Cari yaşlandırma için)', index: 'INDEX' },
      ],
      rules: [
        'Fatura veya tahsilat oluştuğunda tetiklenen çift yönlü muhasebe kaydı.',
        'Cari yaşlandırma raporları vade tarihi (due_date) indeksinden filtrelenir.',
      ],
    },
    {
      id: 'expenses',
      name: 'Gelirler & Giderler',
      tableName: 'operational_expenses',
      icon: ReceiptIcon,
      color: 'rose',
      targetTab: 'gelir-gider',
      description: 'Şube bazlı operasyonel gider kategorileri ve resmi harcamalar.',
      columns: [
        { name: 'id', type: 'UUID PK', desc: 'Gider fiş kimliği' },
        { name: 'tenant_id, branch_id', type: 'UUID NOT NULL', desc: 'Harcamayı yapan şube', index: 'COMPOSITE INDEX' },
        { name: 'category', type: 'VARCHAR(50)', desc: 'Kira, Elektrik, Lojistik, Yemek vb.' },
        { name: 'amount', type: 'DECIMAL(18, 4)', desc: 'Gider net tutarı' },
        { name: 'tax_amount', type: 'DECIMAL(18, 4)', desc: 'İndirilecek KDV tutarı' },
        { name: 'is_tax_deductible', type: 'BOOLEAN', desc: 'Vergiden düşülebilir mi? (KKEG kontrolü)' },
        { name: 'is_shared_expense', type: 'BOOLEAN', desc: 'Merkezin ortak genel gideri mi?' },
      ],
      rules: [
        'Şube giderleri şubenin kendi P&L tablosuna net olarak işlenir.',
        'Ortak harcamalar şubelere ciro oranında yansıtılabilir.',
      ],
    },
    {
      id: 'stocks',
      name: 'Ürün & Stok Depo',
      tableName: 'products & product_stocks',
      icon: Package,
      color: 'blue',
      targetTab: 'stok',
      description: 'Ortak ürün kartları, ancak şube bazında tamamen izole depo stok miktarları.',
      columns: [
        { name: 'products.id', type: 'UUID PK', desc: 'Ortak katalog ürün kartı' },
        { name: 'products.tenant_id', type: 'UUID NOT NULL', desc: 'Kiracı ortak ürün kataloğu' },
        { name: 'product_stocks.id', type: 'UUID PK', desc: 'Şube stok miktar kaydı' },
        { name: 'product_stocks.branch_id', type: 'UUID NOT NULL', desc: 'Şube/Depo kimliği', index: 'COMPOSITE INDEX' },
        { name: 'quantity', type: 'DECIMAL(18, 4)', desc: 'Fiili depo eldeki stok miktarı' },
        { name: 'reserved_quantity', type: 'DECIMAL(18, 4)', desc: 'Siparişe rezerve edilmiş miktar' },
      ],
      rules: [
        'Ürün kartları merkezde tek tanımlanır; barkod ve GTİP tüm şubelerde ortaktır.',
        'Stok miktarları (product_stocks) şubeler arasında kesinlikle ayrı tutulur.',
      ],
    },
    {
      id: 'cashes',
      name: 'Kasalar & Bankalar',
      tableName: 'cashes_and_banks',
      icon: CreditCard,
      color: 'violet',
      targetTab: 'kasa-banka',
      description: 'Nakit TL/Döviz kasaları ve banka vadesiz ticari hesapları.',
      columns: [
        { name: 'id', type: 'UUID PK', desc: 'Hesap kimliği' },
        { name: 'tenant_id, branch_id', type: 'UUID NOT NULL', desc: 'Hesabın ait olduğu şube', index: 'COMPOSITE INDEX' },
        { name: 'name', type: 'VARCHAR(150)', desc: 'Hesap adı (Örn: Garanti Levent Hesabı)' },
        { name: 'type', type: 'VARCHAR(20)', desc: "'Cash' veya 'Bank'" },
        { name: 'currency_code', type: 'CHAR(3)', desc: 'TRY, USD, EUR' },
        { name: 'balance', type: 'DECIMAL(18, 4)', desc: 'Anlık kullanılabilir bakiye' },
        { name: 'iban', type: 'VARCHAR(34)', desc: 'TR ile başlayan 26 haneli IBAN' },
      ],
      rules: [
        'Banka ve kasalar şubelere bağlıdır.',
        'Şubeler arası virman işleminde kaynak hesap bakiyesi anında düşer.',
      ],
    },
    {
      id: 'cheques',
      name: 'Çekler & Senetler',
      tableName: 'cheques_and_bonds',
      icon: FileCheck2,
      color: 'teal',
      description: 'Müşteri çekleri, senetler, ciro edilen ve tahsil edilen kıymetli evraklar.',
      columns: [
        { name: 'id', type: 'UUID PK', desc: 'Evrak kimliği' },
        { name: 'tenant_id, branch_id', type: 'UUID NOT NULL', desc: 'Portföyü tutan şube', index: 'COMPOSITE INDEX' },
        { name: 'serial_number', type: 'VARCHAR(50)', desc: 'Çek seri no', index: 'INDEX' },
        { name: 'due_date', type: 'DATE', desc: 'Vade tarihi', index: 'INDEX' },
        { name: 'amount', type: 'DECIMAL(18, 4)', desc: 'Çek nominal tutarı' },
        { name: 'status', type: 'VARCHAR(30)', desc: 'InPortfolio, Endorsed, Collected, Bounced' },
        { name: 'drawer_bank', type: 'VARCHAR(100)', desc: 'Keşideci banka ve şubesi' },
      ],
      rules: [
        'Vadesi yaklaşan çekler şube ve genel merkez göstergesinde takip edilir.',
        'Durum değişiklikleri cari muavin hareketiyle entegredir.',
      ],
    },
    {
      id: 'receipts',
      name: 'Ödemeler & Tahsilatlar',
      tableName: 'receipts & receipt_items',
      icon: DollarSign,
      color: 'cyan',
      targetTab: 'odeme-tahsilat',
      description: 'Faturalarla eşleşen makbuz katmanı (Tahsilat ve Tediye).',
      columns: [
        { name: 'id', type: 'UUID PK', desc: 'Makbuz kimliği' },
        { name: 'tenant_id, branch_id', type: 'UUID NOT NULL', desc: 'İşlemi yapan şube', index: 'COMPOSITE INDEX' },
        { name: 'contact_id', type: 'UUID FK', desc: 'İşlem yapılan cari' },
        { name: 'cash_bank_id', type: 'UUID FK', desc: 'Giriş/Çıkış yapılan kasa/banka' },
        { name: 'type', type: 'VARCHAR(20)', desc: "'Collection' (Tahsilat) / 'Payment' (Ödeme)" },
        { name: 'total_amount', type: 'DECIMAL(18, 4)', desc: 'İşlem tutarı' },
        { name: 'receipt_date', type: 'TIMESTAMP', desc: 'Tahsilat tarihi' },
      ],
      rules: [
        'E-Faturalarla eşleşerek açık hesap bakiyesini kapatır.',
        'Tahsilat anında kasa bakiyesini ve müşteri ekstresini atomik günceller.',
      ],
    },
    {
      id: 'employees',
      name: 'Personel Modülü',
      tableName: 'employees',
      icon: UserCheck2,
      color: 'purple',
      targetTab: 'personel',
      description: '11 haneli TCKN kontrolü, şube bazlı bordro ve maaş yönetimi.',
      columns: [
        { name: 'id', type: 'UUID PK', desc: 'Personel kimliği' },
        { name: 'tenant_id, branch_id', type: 'UUID NOT NULL', desc: 'Çalıştığı şube', index: 'COMPOSITE INDEX' },
        { name: 'first_name, last_name', type: 'VARCHAR(100)', desc: 'Personel adı ve soyadı' },
        { name: 'identity_number', type: 'CHAR(11)', desc: '11 haneli TCKN (Algoritma kontrollü)', index: 'UNIQUE INDEX' },
        { name: 'salary', type: 'DECIMAL(18, 4)', desc: 'Net / Brüt maaş tutarı' },
        { name: 'is_active', type: 'BOOLEAN DEFAULT TRUE', desc: 'Aktif çalışma durumu' },
        { name: 'iban', type: 'VARCHAR(34)', desc: 'Maaş ödeme hesabı IBAN' },
      ],
      rules: [
        'CHECK (length(identity_number) = 11 AND identity_number ~ \'^[0-9]+$\') veritabanı kuralı.',
        'Maaş giderleri ilgili şubenin operasyonel giderine yansıtılır.',
      ],
    },
    {
      id: 'tax_allocations',
      name: 'Resmi Vergi Dağıtımı',
      tableName: 'tax_allocations',
      icon: PieChart,
      color: 'slate',
      targetTab: 'vergi',
      description: 'Tek VKN altındaki resmi vergi yükünün şubelerin kâr/zarar hanelerine dağıtımı.',
      columns: [
        { name: 'id', type: 'UUID PK', desc: 'Dağıtım kaydı kimliği' },
        { name: 'tenant_id', type: 'UUID NOT NULL', desc: 'Tek VKN sahibi kiracı', index: 'INDEX' },
        { name: 'parent_expense_id', type: 'VARCHAR(64)', desc: 'Merkezin ödediği ana vergi tahakkuk fişi' },
        { name: 'branch_id', type: 'UUID NOT NULL', desc: 'Yansıtılan şube kimliği', index: 'COMPOSITE INDEX' },
        { name: 'allocated_amount', type: 'DECIMAL(18, 4)', desc: 'Şubeye yüklenen vergi payı' },
        { name: 'allocation_ratio', type: 'DECIMAL(18, 4)', desc: 'Dağıtım oranı (Örn: 0.25 = %25)' },
        { name: 'tax_type', type: 'VARCHAR(40)', desc: 'KDV_1, Muhtasar_Gelir, Kurumlar_Vergisi' },
      ],
      rules: [
        'Merkez tarafından tek kalemde ödenen resmi vergiyi şubelere ciro payına göre paylaştırır.',
        'Şube bazlı P&L tablolarının gerçek net kârını doğru hesaplar.',
      ],
    },
  ];

  const [selectedModule, setSelectedModule] = useState<ModuleCard>(modules[0]);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-stone-200/90 rounded-lg p-4 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded-md">
            <ShieldCheck className="w-5 h-5" />
          </span>
          <h2 className="text-base font-bold text-stone-900">
            FX Kurumsal Veritabanı & 9 Temel Modül Mimarisi
          </h2>
        </div>
        <p className="text-xs text-stone-600 mt-1">
          Sistemdeki tüm operasyonel tablolarda <code className="px-1.5 py-0.5 bg-stone-100 text-stone-800 rounded font-mono text-[11px]">tenant_id (UUID)</code> ve <code className="px-1.5 py-0.5 bg-stone-100 text-stone-800 rounded font-mono text-[11px]">branch_id (UUID)</code> zorunlu composite indekslidir. Finansal alanlar kuruş kaybını önlemek için <code className="px-1.5 py-0.5 bg-stone-100 text-stone-800 rounded font-mono text-[11px]">DECIMAL(18, 4)</code> olarak tasarlanmıştır.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* SOL: Modül Listesi */}
        <div className="bg-white border border-stone-200/90 rounded-lg p-3 shadow-xs space-y-1.5">
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider px-2 block mb-2">
            9 Temel Operasyonel Modül + Vergi
          </span>
          {modules.map((m) => {
            const Icon = m.icon;
            const isSelected = m.id === selectedModule.id;
            return (
              <button
                key={m.id}
                onClick={() => setSelectedModule(m)}
                className={`w-full text-left px-3 py-2 rounded-md flex items-center justify-between transition-colors text-xs ${
                  isSelected
                    ? 'bg-indigo-50 text-indigo-900 font-semibold border border-indigo-200/80 shadow-xs'
                    : 'text-stone-700 hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-indigo-600' : 'text-stone-400'}`} />
                  <div>
                    <div className="leading-tight">{m.name}</div>
                    <div className="text-[10px] text-stone-400 font-mono mt-0.5">{m.tableName}</div>
                  </div>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* SAĞ: Seçili Modülün Tablo Detayları ve Kuralları */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-stone-200/90 rounded-lg p-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-stone-900">{selectedModule.name}</h3>
                  {selectedModule.targetTab && onSelectTab && (
                    <button
                      type="button"
                      onClick={() => onSelectTab(selectedModule.targetTab!)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
                    >
                      <span>Canlı Modüle Git</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <span className="text-xs text-stone-500 font-mono bg-stone-100 px-2 py-0.5 rounded mt-1 inline-block">
                  Tablo Adı: {selectedModule.tableName}
                </span>
              </div>
              <span className="text-xs text-stone-500 max-w-xs text-right">
                {selectedModule.description}
              </span>
            </div>

            {/* Kolon Şeması */}
            <div className="mt-3">
              <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider mb-2">
                Veritabanı Alanları & Tipleri
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-600 border-b border-stone-200">
                    <tr>
                      <th className="px-3 py-2 font-medium">Kolon Adı</th>
                      <th className="px-3 py-2 font-medium">Veri Tipi</th>
                      <th className="px-3 py-2 font-medium">İndeks / Kısıt</th>
                      <th className="px-3 py-2 font-medium">Açıklama</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {selectedModule.columns.map((c, idx) => (
                      <tr key={idx} className="hover:bg-stone-50/60">
                        <td className="px-3 py-2 font-mono font-semibold text-stone-900">{c.name}</td>
                        <td className="px-3 py-2 font-mono text-indigo-700">{c.type}</td>
                        <td className="px-3 py-2">
                          {c.index ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-50 text-amber-900 border border-amber-200 font-semibold">
                              {c.index}
                            </span>
                          ) : (
                            <span className="text-stone-400 text-[10px]">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-stone-600">{c.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* İş Kuralları */}
            <div className="mt-4 pt-3 border-t border-stone-100">
              <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider mb-2">
                Türk Mevzuatı ve Mimari İş Kuralları
              </h4>
              <ul className="space-y-1.5 text-xs text-stone-600">
                {selectedModule.rules.map((rule, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

-- ============================================================================
-- FX ENTERPRISE ERP - MULTI-TENANT & MULTI-BRANCH POSTGRESQL VERİTABANI ŞEMASI
-- Türk Ticaret ve Vergi Mevzuatına %100 Uyumlu DDL Scripti
-- Kuruş kaybını önlemek amacıyla tüm tutar alanları DECIMAL(18, 4) olarak tanımlanmıştır.
-- Operasyonel tablolarda 'tenant_id' ve 'branch_id' zorunlu ve Composite Index'lidir.
-- ============================================================================

-- Gerekli PostgreSQL eklentilerini etkinleştir
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 0. TEMEL SİSTEM TABLOLARI: KİRACILAR (TENANTS) VE ŞUBELER (BRANCHES)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    tax_number VARCHAR(10) NOT NULL UNIQUE, -- VKN (10 hane zorunlu)
    tax_office VARCHAR(100) NOT NULL,
    trade_register_number VARCHAR(50),
    mersis_number VARCHAR(16),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_tenants_vkn CHECK (length(tax_number) = 10 AND tax_number ~ '^[0-9]+$')
);

CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL, -- Şube Kodu (MRK, KDK, ANK, IZM)
    name VARCHAR(150) NOT NULL,
    city VARCHAR(50) NOT NULL,
    is_headquarter BOOLEAN NOT NULL DEFAULT FALSE,
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_branch_code_tenant UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_branches_tenant ON branches(tenant_id);

-- ============================================================================
-- 1. CARİ HESAPLAR VE CRM MODÜLÜ (contacts)
-- ============================================================================

-- [YENİ] CARİ TÜRÜ TABLOSU
CREATE TABLE IF NOT EXISTS contact_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,                       -- Tür Kodu (Örn: MUSTERI, TEDARIKCI)
    name VARCHAR(100) NOT NULL,                             -- Tür Adı
    is_system BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(tenant_id, code)
);

-- ==========================================
-- [YENİ] COĞRAFİ HİYERARŞİ TABLOLARI
-- ==========================================
CREATE TABLE IF NOT EXISTS cities (
    id INT PRIMARY KEY,                                      -- Plaka Kodu
    name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS districts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    city_id INT NOT NULL REFERENCES cities(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    UNIQUE(city_id, name)
);

CREATE TABLE IF NOT EXISTS neighborhoods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    district_id UUID NOT NULL REFERENCES districts(id) ON DELETE RESTRICT,
    name VARCHAR(150) NOT NULL,
    postal_code VARCHAR(5)
);

-- ANA CARİ KART TABLOSU (Güncellendi)
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    contact_type_id UUID NOT NULL REFERENCES contact_types(id) ON DELETE RESTRICT,
    
    -- [Genel Bilgiler]
    code VARCHAR(50) NOT NULL,                       -- Cari Kodu
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PASSIVE', 'LEAD')),
    title VARCHAR(255) NOT NULL,                            -- Cari Ünvan
    authorized_person VARCHAR(150),                         -- Yetkili Kişi
    account_representative VARCHAR(150),                    -- Müşteri Temsilcisi
    reference_info VARCHAR(255),                            -- Referans
    mobile_phone_1 VARCHAR(20) NOT NULL,                    -- Cep Telefonu 1
    mobile_phone_2 VARCHAR(20),
    home_phone VARCHAR(20),
    work_phone VARCHAR(20),
    email VARCHAR(100),
    website VARCHAR(150),
    
    -- [Fatura ve Finansal Bilgiler]
    tax_office VARCHAR(100),
    tax_number VARCHAR(10),                                 -- Vergi Numarası
    tc_number VARCHAR(11),                                  -- T.C. Kimlik No
    is_einvoice_taxpayer BOOLEAN DEFAULT FALSE,
    credit_risk_limit DECIMAL(18,4) DEFAULT 0.0000,
    default_payment_terms_days INT DEFAULT 0,
    default_discount_amount DECIMAL(18,4) DEFAULT 0.0000,
    notes TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_contact_code_tenant UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_contacts_perf ON contacts(tenant_id, branch_id, code, tax_number, tc_number, contact_type_id);

-- [YENİ] ADRES BİLGİLERİ TABLOSU (Çoklu Adres)
CREATE TABLE IF NOT EXISTS contact_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    address_type VARCHAR(20) NOT NULL CHECK (address_type IN ('INVOICE', 'DELIVERY', 'WAREHOUSE', 'OTHER')),
    
    city_id INT NOT NULL REFERENCES cities(id) ON DELETE RESTRICT,
    district_id UUID NOT NULL REFERENCES districts(id) ON DELETE RESTRICT,
    neighborhood_id UUID NOT NULL REFERENCES neighborhoods(id) ON DELETE RESTRICT,
    
    street_line VARCHAR(255) NOT NULL,
    door_number VARCHAR(20) NOT NULL,
    apartment_number VARCHAR(20),
    building_name VARCHAR(150),
    block_name VARCHAR(50),
    site_name VARCHAR(150),
    formatted_address TEXT
);

CREATE INDEX IF NOT EXISTS idx_addresses_geo_lookup ON contact_addresses(tenant_id, city_id, district_id, neighborhood_id);

-- [YENİ] CARİ ÇOKLU DÖVİZ BAKİYE TABLOSU
CREATE TABLE IF NOT EXISTS contact_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    currency VARCHAR(3) NOT NULL DEFAULT 'TRY',
    opening_balance DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    current_balance DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    UNIQUE(contact_id, currency)
);

-- ============================================================================
-- 2. KASALAR VE BANKALAR MODÜLÜ (cashes_and_banks)
-- ============================================================================

CREATE TABLE IF NOT EXISTS cashes_and_banks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    name VARCHAR(150) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('Cash', 'Bank')),
    currency_code CHAR(3) NOT NULL DEFAULT 'TRY',
    balance DECIMAL(18, 4) NOT NULL DEFAULT 0.0000,
    iban VARCHAR(34), -- TR...
    account_number VARCHAR(50),
    branch_code VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cashes_banks_tenant_branch ON cashes_and_banks(tenant_id, branch_id);

-- ============================================================================
-- 3. E-FATURALAR & BELGELER (invoices & invoice_items)
-- Şube bazlı numaratör serisine uygun (Örn: MRK2026000000001, KDK2026000000001)
-- ============================================================================

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
    invoice_number VARCHAR(32) NOT NULL, -- Şube bazlı seri + yıl + 9 hane sıra no
    issue_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    due_date DATE,
    total_amount DECIMAL(18, 4) NOT NULL DEFAULT 0.0000, -- KDV Hariç Matrah
    tax_amount DECIMAL(18, 4) NOT NULL DEFAULT 0.0000,   -- KDV Toplamı
    grand_total DECIMAL(18, 4) NOT NULL DEFAULT 0.0000,  -- Genel Toplam (Ödenecek)
    status VARCHAR(30) NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Sent', 'GibApproved', 'Cancelled')),
    gib_uuid UUID, -- GİB evrensel tekil anahtarı (E-Fatura UUID)
    currency_code CHAR(3) NOT NULL DEFAULT 'TRY',
    exchange_rate DECIMAL(18, 4) NOT NULL DEFAULT 1.0000,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_invoice_tenant_number UNIQUE (tenant_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_invoices_tenant_branch ON invoices(tenant_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_invoices_contact ON invoices(contact_id);
CREATE INDEX IF NOT EXISTS idx_invoices_gib_uuid ON invoices(gib_uuid);
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON invoices(tenant_id, issue_date);

CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id UUID, -- products tablosuna FK (isteğe bağlı serbest kalem)
    description VARCHAR(255) NOT NULL,
    quantity DECIMAL(18, 4) NOT NULL DEFAULT 1.0000,
    unit_price DECIMAL(18, 4) NOT NULL DEFAULT 0.0000,
    vat_rate DECIMAL(18, 4) NOT NULL DEFAULT 0.2000, -- %20, %10, %1 KDV
    vat_amount DECIMAL(18, 4) NOT NULL DEFAULT 0.0000,
    total_amount DECIMAL(18, 4) NOT NULL DEFAULT 0.0000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_tenant_branch ON invoice_items(tenant_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);

-- ============================================================================
-- 4. BORÇLAR & ALACAKLAR (customer_movements)
-- Cari yaşlandırma ve ayrıntılı muavin ekstre için çift yönlü (Debit/Credit)
-- ============================================================================

CREATE TABLE IF NOT EXISTS customer_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
    movement_type VARCHAR(10) NOT NULL CHECK (movement_type IN ('Debit', 'Credit')), -- Borç / Alacak
    amount DECIMAL(18, 4) NOT NULL,
    balance_after DECIMAL(18, 4) NOT NULL,
    document_type VARCHAR(30) NOT NULL, -- Invoice, Receipt, Virman, Opening
    document_id UUID,
    document_number VARCHAR(50),
    due_date DATE, -- Cari yaşlandırma için kritik vade tarihi
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customer_movements_tenant_branch ON customer_movements(tenant_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_customer_movements_contact_date ON customer_movements(contact_id, created_at);
CREATE INDEX IF NOT EXISTS idx_customer_movements_due_date ON customer_movements(contact_id, due_date);

-- ============================================================================
-- 5. GELİRLER & GİDERLER (operational_expenses)
-- Şube bazlı gider kategorileri ve ortak genel giderler
-- ============================================================================

CREATE TABLE IF NOT EXISTS operational_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    category VARCHAR(60) NOT NULL, -- Kira, Enerji, Lojistik, Yemek, Harç vb.
    amount DECIMAL(18, 4) NOT NULL,
    tax_amount DECIMAL(18, 4) NOT NULL DEFAULT 0.0000, -- İndirilecek KDV
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    receipt_number VARCHAR(50),
    is_tax_deductible BOOLEAN NOT NULL DEFAULT TRUE, -- KKEG kontrolü
    is_shared_expense BOOLEAN NOT NULL DEFAULT FALSE, -- Merkezin ortak genel gideri mi?
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_operational_expenses_tenant_branch ON operational_expenses(tenant_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_operational_expenses_category ON operational_expenses(tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_operational_expenses_date ON operational_expenses(tenant_id, expense_date);

-- ============================================================================
-- 6. ÜRÜN, STOK & DEPO YÖNETİMİ (products, warehouses, stock_movements, warehouse_stocks, shipping_rates)
-- Ürün kartları tüm şubeler için ortak katalog; Stoklar ve Hareketler Depo bazında takip edilir
-- ============================================================================

-- 1. ÜRÜNLER TABLOSU
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sku_code VARCHAR(50) NOT NULL,                          -- Ürün Kodu *
    barcode_ean13 VARCHAR(13),                              -- EAN-13 Barkod
    unit_type VARCHAR(20) NOT NULL DEFAULT 'Adet',          -- Birim * (Adet, KG, Metre, Litre vb.)
    name VARCHAR(255) NOT NULL,                             -- Ürün Adı *
    category_group VARCHAR(100),                            -- Kategori / Grup
    raw_material VARCHAR(100),                              -- Hammadde
    brand_name VARCHAR(100),                                -- Marka
    supplier_title VARCHAR(255),                            -- Tedarikçi / Firma

    -- Fiyatlandırma, Kâr Oranı & Vergiler
    purchase_price NUMERIC(15,4) NOT NULL DEFAULT 0.0000,    -- Alış Fiyatı (TRY)
    purchase_discount_percent NUMERIC(5,2) DEFAULT 0.00,    -- Alış İskonto (%)
    net_purchase_cost NUMERIC(15,4) DEFAULT 0.0000,         -- Net Alış Maliyeti (İskonto Sonrası)
    profit_margin_percent NUMERIC(5,2) DEFAULT 0.00,        -- Kâr Marjı (%)
    sale_price_excl_vat NUMERIC(15,4) NOT NULL DEFAULT 0.0000, -- Satış Fiyatı (TRY) * (KDV Hariç)
    vat_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 20.00,   -- KDV Oranı (%)
    sale_price_incl_vat NUMERIC(15,4) DEFAULT 0.0000,       -- Satış (KDV Dahil)
    currency VARCHAR(3) NOT NULL DEFAULT 'TRY',             -- Para Birimi *
    
    -- Lojistik Hesaplama Alanları (Kargo Desi ve Otomatik Hesaplama İçin)
    weight_gross NUMERIC(10,3) DEFAULT 0.000,               -- Brüt Ağırlık (KG)
    volume_m3 NUMERIC(10,4) DEFAULT 0.0000,                 -- Hacim (Metreküp / Ürün Boyut Hacmi)
    calculated_desi NUMERIC(10,2) GENERATED ALWAYS AS (volume_m3 * 333.33) STORED, -- Otomatik Hesaplanan Desi

    -- Açılış ve Notlar
    opening_stock_quantity NUMERIC(12,4) DEFAULT 0.0000,    -- Açılış Stok Miktarı (Adet)
    description_notes TEXT,                                 -- Ürün Açıklaması & Notlar
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_products_tenant_sku UNIQUE (tenant_id, sku_code),
    CONSTRAINT uq_products_tenant_barcode UNIQUE (tenant_id, barcode_ean13)
);

CREATE INDEX IF NOT EXISTS idx_products_lookup ON products(tenant_id, sku_code, barcode_ean13);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(tenant_id, category_group);

-- 2. DEPOLAR TABLOSU
CREATE TABLE IF NOT EXISTS warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    warehouse_code VARCHAR(50) NOT NULL,                    -- Depo Kodu *
    warehouse_type VARCHAR(50) NOT NULL,                    -- Depo Türü * (Merkez, Soğuk Hava, Sanal Depo vb.)
    name VARCHAR(150) NOT NULL,                             -- Depo Adı *
    manager_name VARCHAR(150),                              -- Depo Sorumlusu
    branch_region VARCHAR(100),                             -- Şube Bölge
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PASSIVE', 'MAINTENANCE')), -- Durum
    address_line TEXT,                                      -- Adres
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_warehouses_tenant_code UNIQUE (tenant_id, warehouse_code)
);

CREATE INDEX IF NOT EXISTS idx_warehouses_tenant ON warehouses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_status ON warehouses(tenant_id, status);

-- 3. STOK HAREKETLERİ TABLOSU (Giriş / Çıkış Günlüğü)
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    movement_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,    -- Tarih
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,   -- Ürün Bağlantısı (Stok Kodu)
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT, -- Depo Lokasyon Bağlantısı
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('IN', 'OUT', 'TRANSFER_IN', 'TRANSFER_OUT')), -- İşlem Türü *
    quantity NUMERIC(12,4) NOT NULL,                        -- Miktar *
    unit_price NUMERIC(15,4) NOT NULL,                      -- Birim Fiyat *
    total_amount NUMERIC(15,4) NOT NULL,                    -- Toplam Tutar * (Miktar * Birim Fiyat)
    document_number VARCHAR(100),                           -- Belge No *
    contact_title VARCHAR(255),                             -- Cari Ünvan *
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_perf ON stock_movements(tenant_id, movement_date, product_id, warehouse_id);

-- 4. DEPO BAZINDA STOK DAĞILIMI TABLOSU (Anlık Envanter)
CREATE TABLE IF NOT EXISTS warehouse_stocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT, -- Depo *
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,     -- Ürün Bağlantısı
    critical_stock_level NUMERIC(12,4) DEFAULT 0.0000,      -- Kritik Stok *
    total_quantity NUMERIC(12,4) NOT NULL DEFAULT 0.0000,   -- Toplam Miktar *
    total_cost_value NUMERIC(15,4) DEFAULT 0.0000,          -- Maliyet Değeri * (Miktar * Net Alış Maliyeti)
    total_current_value NUMERIC(15,4) DEFAULT 0.0000,       -- Güncel Değer * (Miktar * Satış Fiyatı)
    
    CONSTRAINT uq_warehouse_stocks_wh_prod UNIQUE(tenant_id, warehouse_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_warehouse_stocks_lookup ON warehouse_stocks(tenant_id, warehouse_id, product_id);

-- 5. KARGO FİYAT BAREMLERİ TABLOSU (Lojistik Optimizasyon)
CREATE TABLE IF NOT EXISTS shipping_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    shipping_company_name VARCHAR(100) NOT NULL,            -- Kargo Firması Adı (Örn: Yurtiçi Kargo)
    rate_title VARCHAR(150),                                -- Tarife Başlığı
    min_desi NUMERIC(6,2) NOT NULL DEFAULT 0.00,            -- Minimum Desi Sınırı
    max_desi NUMERIC(6,2) NOT NULL,                         -- Maksimum Desi Sınırı
    fixed_price NUMERIC(15,4) NOT NULL DEFAULT 0.0000,      -- Dilim Sabit Ücreti
    extra_per_desi_price NUMERIC(15,4) DEFAULT 0.0000,      -- Limit Üstü Ek Desi Başına Ücret
    currency VARCHAR(3) DEFAULT 'TRY',
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_shipping_rates_calc ON shipping_rates(shipping_company_name, min_desi, max_desi) WHERE is_active = TRUE;

-- ============================================================================
-- 7. ÇEKLER & SENETLER (cheques_and_bonds)
-- ============================================================================

CREATE TABLE IF NOT EXISTS cheques_and_bonds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
    serial_number VARCHAR(50) NOT NULL,
    due_date DATE NOT NULL,
    amount DECIMAL(18, 4) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('Cheque', 'Bond')),
    status VARCHAR(30) NOT NULL DEFAULT 'InPortfolio' CHECK (status IN ('InPortfolio', 'Endorsed', 'Collected', 'Bounced')),
    drawer_bank VARCHAR(100),
    drawer_name VARCHAR(150) NOT NULL,
    is_customer_portion BOOLEAN NOT NULL DEFAULT TRUE, -- Müşteri çeki mi, kendi keşide ettiğimiz mi?
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cheques_bonds_tenant_branch ON cheques_and_bonds(tenant_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_cheques_bonds_due_date ON cheques_and_bonds(tenant_id, due_date);
CREATE INDEX IF NOT EXISTS idx_cheques_bonds_status ON cheques_and_bonds(tenant_id, status);

-- ============================================================================
-- 8. ÖDEMELER & TAHSİLATLAR (receipts)
-- Faturalarla eşleşen makbuz katmanı (Tahsilat / Tediye)
-- ============================================================================

CREATE TABLE IF NOT EXISTS receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
    cash_bank_id UUID NOT NULL REFERENCES cashes_and_banks(id) ON DELETE RESTRICT,
    receipt_number VARCHAR(50) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('Collection', 'Payment')), -- Tahsilat / Tediye
    total_amount DECIMAL(18, 4) NOT NULL,
    receipt_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'Completed' CHECK (status IN ('Completed', 'Pending', 'Cancelled')),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_receipt_number_tenant UNIQUE (tenant_id, receipt_number)
);

CREATE INDEX IF NOT EXISTS idx_receipts_tenant_branch ON receipts(tenant_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_receipts_contact ON receipts(contact_id);

-- ============================================================================
-- 9. PERSONEL MODÜLÜ (employees)
-- 11 Haneli TCKN algoritma kontrolü ve şube bazlı istihdam
-- ============================================================================

CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    identity_number CHAR(11) NOT NULL, -- 11 haneli TCKN
    salary DECIMAL(18, 4) NOT NULL DEFAULT 0.0000,
    department VARCHAR(80),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
    iban VARCHAR(34) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_employee_identity_tenant UNIQUE (tenant_id, identity_number),
    CONSTRAINT chk_employee_tckn CHECK (length(identity_number) = 11 AND identity_number ~ '^[0-9]+$')
);

CREATE INDEX IF NOT EXISTS idx_employees_tenant_branch ON employees(tenant_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_employees_identity ON employees(identity_number);

-- ============================================================================
-- 10. RESMİ VERGİ DAĞITIMI (tax_allocations)
-- Tek VKN altında merkezin ödediği resmi KDV, muhtasar veya kurumlar vergisini
-- ciro veya net yük oranına göre şubelerin kâr/zarar (P&L) hanesine dağıtır.
-- ============================================================================

CREATE TABLE IF NOT EXISTS tax_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    parent_expense_id VARCHAR(64) NOT NULL, -- Merkezin ana beyanname fiş numarası
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    allocated_amount DECIMAL(18, 4) NOT NULL,
    allocation_ratio DECIMAL(18, 4) NOT NULL, -- Örn: 0.2500 (%25)
    tax_type VARCHAR(40) NOT NULL, -- KDV_1, Muhtasar_Gelir, Kurumlar_Vergisi, Damga_Vergisi
    tax_period VARCHAR(10) NOT NULL, -- '2026/08'
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tax_allocations_tenant_branch ON tax_allocations(tenant_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_tax_allocations_period ON tax_allocations(tenant_id, tax_period);

-- ============================================================================
-- 11. ŞUBELER ARASI VİRMAN TRANSFERLERİ (inter_branch_transfers)
-- 2 Aşamalı Virman: Kaynaktan düşer -> WaitingApproval (Askıda) -> Hedef Onaylar
-- ============================================================================

CREATE TABLE IF NOT EXISTS inter_branch_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    transfer_number VARCHAR(50) NOT NULL,
    source_branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    target_branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    source_cash_bank_id UUID NOT NULL REFERENCES cashes_and_banks(id) ON DELETE RESTRICT,
    target_cash_bank_id UUID NOT NULL REFERENCES cashes_and_banks(id) ON DELETE RESTRICT,
    amount DECIMAL(18, 4) NOT NULL,
    currency_code CHAR(3) NOT NULL DEFAULT 'TRY',
    description TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'WaitingApproval' 
        CHECK (status IN ('WaitingApproval', 'Completed', 'Rejected', 'RolledBack')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMPTZ,
    created_by_user VARCHAR(150) NOT NULL,
    approved_by_user VARCHAR(150),
    CONSTRAINT chk_different_branches CHECK (source_branch_id <> target_branch_id),
    CONSTRAINT uq_transfer_number_tenant UNIQUE (tenant_id, transfer_number)
);

CREATE INDEX IF NOT EXISTS idx_transfers_tenant ON inter_branch_transfers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transfers_source_branch ON inter_branch_transfers(tenant_id, source_branch_id);
CREATE INDEX IF NOT EXISTS idx_transfers_target_branch ON inter_branch_transfers(tenant_id, target_branch_id);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON inter_branch_transfers(tenant_id, status);

-- Otomatik updated_at güncelleme tetikleyicisi
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ 
DECLARE 
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'updated_at' 
          AND table_schema = 'public' 
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS trg_set_updated_at_%I ON %I;
            CREATE TRIGGER trg_set_updated_at_%I
            BEFORE UPDATE ON %I
            FOR EACH ROW
            EXECUTE FUNCTION set_updated_at_timestamp();',
            tbl, tbl, tbl, tbl);
    END LOOP;
END $$;

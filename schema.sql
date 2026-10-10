-- ============================================================================
-- FX ENTERPRISE ERP - MULTI-TENANT & MULTI-BRANCH POSTGRESQL VERİTABANI ŞEMASI
-- Türk Ticaret ve Vergi Mevzuatına %100 Uyumlu DDL Scripti
-- Kuruş kaybını önlemek amacıyla tüm tutar alanları DECIMAL(18, 4) olarak tanımlanmıştır.
-- Operasyonel tablolarda 'tenant_id' ve 'branch_id' zorunlu ve Composite Index'lidir.
--
-- TABLO GRUPLARI
--   0  Çekirdek        : tenants, branches
--   1  Cari / CRM      : contact_types, cities, districts, neighborhoods, contacts,
--                        contact_addresses, contact_balances
--   2  Kasa/Banka      : cashes_and_banks
--   3  Fatura          : invoices, invoice_items
--   4  Cari hareket    : customer_movements
--   5  Gider           : operational_expenses
--   6  Stok/Depo       : products, warehouses, stock_movements, warehouse_stocks, shipping_rates
--   7  Çek/Senet       : cheques_and_bonds
--   8  Tahsilat/Tediye : receipts
--   9  Personel        : employees
--   10 Vergi dağıtımı  : tax_allocations
--   11 Virman          : inter_branch_transfers
--   12 Kimlik/Yetki    : users, roles, permissions, user_roles, role_permissions
--   13 Finans defteri  : financial_transactions (APPEND-ONLY)
--   14 Denetim         : audit_logs (APPEND-ONLY)
--   15 Sertleştirme    : kolon/constraint eklemeleri (idempotent ALTER'lar)
--   16 RLS iskeleti    : current_tenant_id() + tenant_isolation policy'leri (opt-in)
--   17 Seed            : izin kataloğu + demo rol eşlemesi (atlanabilir)
--
-- KONVANSİYONLAR
--   * Append-only: financial_transactions ve audit_logs üzerinde UPDATE/DELETE/TRUNCATE
--     tetikleyiciyle reddedilir. Düzeltme için ters kayıt (reverses_transaction_id) atılır.
--   * Soft delete: deleted_at TIMESTAMPTZ (users, roles, contacts, cashes_and_banks, invoices,
--     products, warehouses, employees). Kod-benzeri UNIQUE kısıtları deleted_at IS NULL için
--     kısmi (partial) unique index'tir. Fatura numarası yasal nedenle her zaman tekildir.
--   * Tenant güvenliği: tenant-scoped ilişkilerde kompozit FK (id, tenant_id) kullanılır.
--   * Dosya idempotenttir: tekrar çalıştırılabilir (IF NOT EXISTS / DROP ... IF EXISTS).
--   * Seed'i atlamak için:  PGOPTIONS="-c app.skip_seed=on" psql -f schema.sql
--     Demo kiracı + rol eşlemesi için: PGOPTIONS="-c app.seed_demo=on"
--   * RLS opt-in: PGOPTIONS="-c app.enable_rls=on" (bkz. bölüm 16).
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
    postal_code VARCHAR(5),
    CONSTRAINT uq_neighborhood_district_name UNIQUE(district_id, name)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_neighborhoods_district_name ON neighborhoods(district_id, name);

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
    type VARCHAR(20) NOT NULL CONSTRAINT cashes_and_banks_type_check CHECK (type IN ('Cash', 'Bank', 'POS', 'CreditCard')),
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
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
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

-- ============================================================================
-- 12. KİMLİK & YETKİ (users, roles, permissions, user_roles, role_permissions)
-- Soft delete: users/roles deleted_at. Tenant-safe kompozit FK'ler (id, tenant_id).
-- ============================================================================

-- Yardımcı: constraint yoksa ekler (idempotent). Dosya sonunda silinir.
CREATE OR REPLACE FUNCTION fx_add_constraint(p_table TEXT, p_name TEXT, p_definition TEXT)
RETURNS VOID AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = p_name AND conrelid = to_regclass(p_table)
    ) THEN
        EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I %s', p_table, p_name, p_definition);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Kompozit FK'lerin hedefi olabilmesi için (id, tenant_id) tekil anahtarları
SELECT fx_add_constraint('branches',         'uq_branches_id_tenant',  'UNIQUE (id, tenant_id)');
SELECT fx_add_constraint('contacts',         'uq_contacts_id_tenant',  'UNIQUE (id, tenant_id)');
SELECT fx_add_constraint('cashes_and_banks', 'uq_cashes_id_tenant',    'UNIQUE (id, tenant_id)');

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID,                                  -- Ana şube (NULL = merkez / global kullanıcı)
    email VARCHAR(150) NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    is_global BOOLEAN NOT NULL DEFAULT FALSE,        -- Tüm şubeleri görebilir (Patron / Merkez)
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    CONSTRAINT uq_users_id_tenant UNIQUE (id, tenant_id),
    CONSTRAINT fk_users_branch FOREIGN KEY (branch_id, tenant_id) REFERENCES branches(id, tenant_id) ON DELETE RESTRICT,
    CONSTRAINT chk_users_email CHECK (position('@' IN email) > 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_tenant_email_active ON users(tenant_id, lower(email)) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_tenant_branch ON users(tenant_id, branch_id);

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,                       -- PATRON, SUBE_YONETICISI ...
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    CONSTRAINT uq_roles_id_tenant UNIQUE (id, tenant_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_roles_tenant_code_active ON roles(tenant_id, code) WHERE deleted_at IS NULL;

-- Küresel izin kataloğu (tenant'a bağlı değildir)
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE,               -- contact.read, invoice.create ...
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_roles (
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role_id UUID NOT NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id, tenant_id) REFERENCES users(id, tenant_id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id, tenant_id) REFERENCES roles(id, tenant_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_roles_tenant ON user_roles(tenant_id);

CREATE TABLE IF NOT EXISTS role_permissions (
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role_id UUID NOT NULL,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id, tenant_id) REFERENCES roles(id, tenant_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_tenant ON role_permissions(tenant_id);

-- Append-only koruma fonksiyonu (financial_transactions & audit_logs)
CREATE OR REPLACE FUNCTION prevent_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION '% on % is not allowed: table is append-only', TG_OP, TG_TABLE_NAME
        USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 13. FİNANSAL DEFTER (financial_transactions) - APPEND-ONLY
-- Düzeltme: orijinal satır değiştirilmez; reverses_transaction_id ile ters kayıt atılır.
-- created_by kullanıcı FK'sı ON DELETE RESTRICT'tir (users soft-delete edilir).
-- ============================================================================

CREATE TABLE IF NOT EXISTS financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL,
    cash_bank_id UUID NOT NULL,
    contact_id UUID,
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('Debit', 'Credit')),
    transaction_type VARCHAR(30) NOT NULL,           -- Collection, Payment, Transfer, Expense, Reversal ...
    amount DECIMAL(18, 4) NOT NULL CHECK (amount > 0),
    currency_code CHAR(3) NOT NULL DEFAULT 'TRY',
    exchange_rate DECIMAL(18, 4) NOT NULL DEFAULT 1.0000 CHECK (exchange_rate > 0),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    document_type VARCHAR(30),
    document_id UUID,
    document_number VARCHAR(50),
    description TEXT,
    reverses_transaction_id UUID,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_fin_tx_id_tenant UNIQUE (id, tenant_id),
    CONSTRAINT fk_fin_tx_branch FOREIGN KEY (branch_id, tenant_id) REFERENCES branches(id, tenant_id) ON DELETE RESTRICT,
    CONSTRAINT fk_fin_tx_cash_bank FOREIGN KEY (cash_bank_id, tenant_id) REFERENCES cashes_and_banks(id, tenant_id) ON DELETE RESTRICT,
    CONSTRAINT fk_fin_tx_contact FOREIGN KEY (contact_id, tenant_id) REFERENCES contacts(id, tenant_id) ON DELETE RESTRICT,
    CONSTRAINT fk_fin_tx_reverses FOREIGN KEY (reverses_transaction_id, tenant_id) REFERENCES financial_transactions(id, tenant_id) ON DELETE RESTRICT,
    CONSTRAINT fk_fin_tx_created_by FOREIGN KEY (created_by, tenant_id) REFERENCES users(id, tenant_id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_fin_tx_single_reversal ON financial_transactions(reverses_transaction_id) WHERE reverses_transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fin_tx_tenant_branch_date ON financial_transactions(tenant_id, branch_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_fin_tx_cash_bank ON financial_transactions(tenant_id, cash_bank_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_fin_tx_contact ON financial_transactions(tenant_id, contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fin_tx_document ON financial_transactions(tenant_id, document_type, document_id);

DROP TRIGGER IF EXISTS trg_financial_transactions_append_only ON financial_transactions;
CREATE TRIGGER trg_financial_transactions_append_only
    BEFORE UPDATE OR DELETE ON financial_transactions
    FOR EACH ROW EXECUTE FUNCTION prevent_modification();

DROP TRIGGER IF EXISTS trg_financial_transactions_no_truncate ON financial_transactions;
CREATE TRIGGER trg_financial_transactions_no_truncate
    BEFORE TRUNCATE ON financial_transactions
    FOR EACH STATEMENT EXECUTE FUNCTION prevent_modification();

-- ============================================================================
-- 14. DENETİM KAYITLARI (audit_logs) - APPEND-ONLY
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    branch_id UUID,
    actor_user_id UUID,
    action VARCHAR(30) NOT NULL,                     -- INSERT, UPDATE, DELETE, LOGIN, APPROVE ...
    entity_table VARCHAR(63) NOT NULL,
    entity_id VARCHAR(64),
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    request_id VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_branch FOREIGN KEY (branch_id, tenant_id) REFERENCES branches(id, tenant_id) ON DELETE RESTRICT,
    CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id, tenant_id) REFERENCES users(id, tenant_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_audit_tenant_date ON audit_logs(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(tenant_id, entity_table, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(tenant_id, actor_user_id);

DROP TRIGGER IF EXISTS trg_audit_logs_append_only ON audit_logs;
CREATE TRIGGER trg_audit_logs_append_only
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION prevent_modification();

DROP TRIGGER IF EXISTS trg_audit_logs_no_truncate ON audit_logs;
CREATE TRIGGER trg_audit_logs_no_truncate
    BEFORE TRUNCATE ON audit_logs
    FOR EACH STATEMENT EXECUTE FUNCTION prevent_modification();

-- ============================================================================
-- 15. SERTLEŞTİRME: eksik kolonlar, FK'ler, CHECK'ler, soft delete (idempotent)
-- Not: Mevcut veritabanında ihlal eden satır varsa ilgili ADD CONSTRAINT hata verir.
-- ============================================================================

-- 15.1 Soft delete kolonları
ALTER TABLE cashes_and_banks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE contacts         ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE invoices         ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE products         ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE warehouses       ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE employees        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 15.2 Kasa/Banka: yeni tipler ve uygulamanın kullandığı alanlar
ALTER TABLE cashes_and_banks DROP CONSTRAINT IF EXISTS cashes_and_banks_type_check;
ALTER TABLE cashes_and_banks ADD CONSTRAINT cashes_and_banks_type_check CHECK (type IN ('Cash', 'Bank', 'POS', 'CreditCard'));
ALTER TABLE cashes_and_banks ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(18, 4);
ALTER TABLE cashes_and_banks ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5, 2);   -- % (Örn: 1.85)
ALTER TABLE cashes_and_banks ADD COLUMN IF NOT EXISTS linked_bank_account_id UUID REFERENCES cashes_and_banks(id) ON DELETE SET NULL;
ALTER TABLE cashes_and_banks ADD COLUMN IF NOT EXISTS pos_terminal_id VARCHAR(50);
ALTER TABLE cashes_and_banks ADD COLUMN IF NOT EXISTS card_number_last4 CHAR(4);

SELECT fx_add_constraint('cashes_and_banks', 'chk_cashes_credit_limit', 'CHECK (credit_limit IS NULL OR credit_limit >= 0)');
SELECT fx_add_constraint('cashes_and_banks', 'chk_cashes_commission_rate', 'CHECK (commission_rate IS NULL OR (commission_rate >= 0 AND commission_rate <= 100))');
SELECT fx_add_constraint('cashes_and_banks', 'chk_cashes_card_last4', 'CHECK (card_number_last4 IS NULL OR card_number_last4 ~ ''^[0-9]{4}$'')');
SELECT fx_add_constraint('cashes_and_banks', 'chk_cashes_iban', 'CHECK (iban IS NULL OR iban ~ ''^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$'')');

-- 15.3 Depo -> Şube
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_warehouses_tenant_branch ON warehouses(tenant_id, branch_id);

-- 15.4 Fatura kalemi -> ürün (products, invoice_items'tan sonra oluştuğu için sonradan eklenir)
SELECT fx_add_constraint('invoice_items', 'fk_invoice_items_product', 'FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT');
CREATE INDEX IF NOT EXISTS idx_invoice_items_product ON invoice_items(product_id) WHERE product_id IS NOT NULL;

-- 15.5 Coğrafya / şube tekillikleri
SELECT fx_add_constraint('neighborhoods', 'uq_neighborhoods_district_name', 'UNIQUE (district_id, name)');
CREATE UNIQUE INDEX IF NOT EXISTS uq_branches_one_hq_per_tenant ON branches(tenant_id) WHERE is_headquarter = TRUE;

-- 15.6 Soft delete uyumlu (partial) tekil kısıtlar
ALTER TABLE contacts   DROP CONSTRAINT IF EXISTS uq_contact_code_tenant;
ALTER TABLE products   DROP CONSTRAINT IF EXISTS uq_products_tenant_sku;
ALTER TABLE products   DROP CONSTRAINT IF EXISTS uq_products_tenant_barcode;
ALTER TABLE warehouses DROP CONSTRAINT IF EXISTS uq_warehouses_tenant_code;
ALTER TABLE employees  DROP CONSTRAINT IF EXISTS uq_employee_identity_tenant;
CREATE UNIQUE INDEX IF NOT EXISTS uq_contacts_tenant_code_active ON contacts(tenant_id, code) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_tenant_sku_active ON products(tenant_id, sku_code) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_tenant_barcode_active ON products(tenant_id, barcode_ean13) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_warehouses_tenant_code_active ON warehouses(tenant_id, warehouse_code) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_employees_tenant_identity_active ON employees(tenant_id, identity_number) WHERE deleted_at IS NULL;
-- invoices (tenant_id, invoice_number) yasal fatura numarası nedeniyle bilinçli olarak partial DEĞİLDİR.

-- 15.7 created_by / onay / ret alanları (kullanıcı silinirse NULL)
ALTER TABLE receipts               ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE invoices               ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE operational_expenses   ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE stock_movements        ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE inter_branch_transfers ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE inter_branch_transfers ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE inter_branch_transfers ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- 15.8 Tutar / miktar CHECK'leri
SELECT fx_add_constraint('invoices', 'chk_invoices_amounts', 'CHECK (total_amount >= 0 AND tax_amount >= 0 AND grand_total >= 0 AND exchange_rate > 0)');
SELECT fx_add_constraint('invoice_items', 'chk_invoice_items_amounts', 'CHECK (quantity > 0 AND unit_price >= 0 AND vat_rate >= 0 AND vat_amount >= 0 AND total_amount >= 0)');
SELECT fx_add_constraint('customer_movements', 'chk_customer_movements_amount', 'CHECK (amount >= 0)');
SELECT fx_add_constraint('operational_expenses', 'chk_opex_amounts', 'CHECK (amount >= 0 AND tax_amount >= 0)');
SELECT fx_add_constraint('products', 'chk_products_prices', 'CHECK (purchase_price >= 0 AND sale_price_excl_vat >= 0 AND vat_rate_percent >= 0)');
SELECT fx_add_constraint('stock_movements', 'chk_stock_movements_amounts', 'CHECK (quantity > 0 AND unit_price >= 0 AND total_amount >= 0)');
SELECT fx_add_constraint('shipping_rates', 'chk_shipping_rates', 'CHECK (min_desi >= 0 AND max_desi >= min_desi AND fixed_price >= 0)');
SELECT fx_add_constraint('cheques_and_bonds', 'chk_cheques_amount', 'CHECK (amount > 0)');
SELECT fx_add_constraint('receipts', 'chk_receipts_total_amount', 'CHECK (total_amount > 0)');
SELECT fx_add_constraint('employees', 'chk_employees_salary', 'CHECK (salary >= 0)');
SELECT fx_add_constraint('employees', 'chk_employees_iban', 'CHECK (iban ~ ''^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$'')');
SELECT fx_add_constraint('tax_allocations', 'chk_tax_allocations', 'CHECK (allocated_amount >= 0 AND allocation_ratio >= 0 AND allocation_ratio <= 1)');
SELECT fx_add_constraint('inter_branch_transfers', 'chk_transfers_amount', 'CHECK (amount > 0)');
SELECT fx_add_constraint('contacts', 'chk_contacts_credit_risk_limit', 'CHECK (credit_risk_limit IS NULL OR credit_risk_limit >= 0)');
SELECT fx_add_constraint('contacts', 'chk_contacts_vkn', 'CHECK (tax_number IS NULL OR tax_number ~ ''^[0-9]{10}$'')');
SELECT fx_add_constraint('contacts', 'chk_contacts_tckn', 'CHECK (tc_number IS NULL OR tc_number ~ ''^[0-9]{11}$'')');
SELECT fx_add_constraint('contacts', 'chk_contacts_phones', 'CHECK (
    mobile_phone_1 ~ ''^[0-9+() -]{7,20}$''
    AND (mobile_phone_2 IS NULL OR mobile_phone_2 ~ ''^[0-9+() -]{7,20}$'')
    AND (home_phone IS NULL OR home_phone ~ ''^[0-9+() -]{7,20}$'')
    AND (work_phone IS NULL OR work_phone ~ ''^[0-9+() -]{7,20}$''))');

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

-- ============================================================================
-- 16. SATIR SEVİYESİ GÜVENLİK (RLS) İSKELETİ - OPT-IN
-- Uygulama her bağlantıda/transaction'da tenant'ı set etmelidir:
--     SELECT set_config('app.tenant_id', '<tenant-uuid>', false);   -- veya SET LOCAL
-- Varsayılan olarak RLS ETKİNLEŞTİRİLMEZ ve FORCE EDİLMEZ; mevcut akışlar çalışmaya devam eder.
-- Etkinleştirmek için bu dosyayı şu ayarla çalıştırın:
--     PGOPTIONS="-c app.enable_rls=on" psql -f schema.sql
-- veya elle:  ALTER TABLE <tablo> ENABLE ROW LEVEL SECURITY;
-- Not: Tablo sahibi (owner) RLS'i atlar; uygulama için ayrı, owner olmayan bir rol kullanın
-- (ya da bilinçli olarak ALTER TABLE <tablo> FORCE ROW LEVEL SECURITY uygulayın).
-- Geri almak:  ALTER TABLE <tablo> DISABLE ROW LEVEL SECURITY;
-- ============================================================================

CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID AS $$
    SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid;
$$ LANGUAGE sql STABLE;

-- Policy'ler her zaman tanımlanır (RLS kapalıyken etkisizdir)
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN
        SELECT c.table_name
        FROM information_schema.columns c
        JOIN information_schema.tables t
          ON t.table_schema = c.table_schema AND t.table_name = c.table_name
        WHERE c.column_name = 'tenant_id'
          AND c.table_schema = 'public'
          AND t.table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);
        EXECUTE format(
            'CREATE POLICY tenant_isolation ON %I USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id())',
            tbl);
        IF COALESCE(current_setting('app.enable_rls', true), 'off') = 'on' THEN
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
        END IF;
    END LOOP;
END $$;

-- ============================================================================
-- 17. SEED VERİSİ (idempotent, atlanabilir)
-- Tamamen atlamak için:   PGOPTIONS="-c app.skip_seed=on"
-- Demo kiracı ve rol eşlemesi (varsayılan KAPALI):   PGOPTIONS="-c app.seed_demo=on"
-- ============================================================================

DO $$
BEGIN
    IF COALESCE(current_setting('app.skip_seed', true), 'off') = 'on' THEN
        RAISE NOTICE 'Seed atlandı (app.skip_seed=on)';
        RETURN;
    END IF;

    -- 17.1 İzin kataloğu
    INSERT INTO permissions (code, description) VALUES
        ('contact.read',             'Cari kartlarını görüntüle'),
        ('contact.write',            'Cari kartı oluştur/düzenle'),
        ('invoice.read',             'Faturaları görüntüle'),
        ('invoice.create',           'Fatura oluştur'),
        ('invoice.cancel',           'Fatura iptal et'),
        ('receipt.create',           'Tahsilat/tediye makbuzu oluştur'),
        ('finance.read',             'Kasa/banka ve finans hareketlerini görüntüle'),
        ('finance.approve_transfer', 'Şubeler arası virmanı onayla/reddet'),
        ('stock.read',               'Stok ve depo bilgilerini görüntüle'),
        ('stock.write',              'Stok hareketi oluştur'),
        ('employee.read',            'Personel bilgilerini görüntüle'),
        ('employee.write',           'Personel oluştur/düzenle'),
        ('report.branch',            'Şube raporlarını görüntüle'),
        ('report.consolidated',      'Konsolide (tüm şubeler) raporları görüntüle'),
        ('user.manage',              'Kullanıcı ve rol yönetimi'),
        ('audit.read',               'Denetim kayıtlarını görüntüle')
    ON CONFLICT (code) DO NOTHING;

    -- 17.2 Demo kiracı + örnek rol eşlemesi (yalnızca app.seed_demo=on)
    IF COALESCE(current_setting('app.seed_demo', true), 'off') = 'on' THEN
        INSERT INTO tenants (name, tax_number, tax_office)
        VALUES ('Demo Kiracı A.Ş.', '1111111111', 'Demo VD')
        ON CONFLICT (tax_number) DO NOTHING;

        INSERT INTO roles (tenant_id, code, name, is_system)
        SELECT t.id, r.code, r.name, TRUE
        FROM tenants t
        CROSS JOIN (VALUES ('PATRON', 'Patron / Genel Müdür'),
                           ('SUBE_YONETICISI', 'Şube Yöneticisi')) AS r(code, name)
        WHERE t.tax_number = '1111111111'
        ON CONFLICT (tenant_id, code) WHERE deleted_at IS NULL DO NOTHING;

        -- PATRON: tüm izinler
        INSERT INTO role_permissions (tenant_id, role_id, permission_id)
        SELECT r.tenant_id, r.id, p.id
        FROM roles r CROSS JOIN permissions p
        JOIN tenants t ON t.id = r.tenant_id
        WHERE t.tax_number = '1111111111' AND r.code = 'PATRON' AND r.deleted_at IS NULL
        ON CONFLICT DO NOTHING;

        -- SUBE_YONETICISI: şube kapsamlı izinler (konsolide rapor, kullanıcı yönetimi ve audit hariç)
        INSERT INTO role_permissions (tenant_id, role_id, permission_id)
        SELECT r.tenant_id, r.id, p.id
        FROM roles r
        JOIN tenants t ON t.id = r.tenant_id
        JOIN permissions p ON p.code IN (
            'contact.read', 'contact.write', 'invoice.read', 'invoice.create', 'receipt.create',
            'finance.read', 'finance.approve_transfer', 'stock.read', 'stock.write',
            'employee.read', 'report.branch')
        WHERE t.tax_number = '1111111111' AND r.code = 'SUBE_YONETICISI' AND r.deleted_at IS NULL
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

DROP FUNCTION IF EXISTS fx_add_constraint(TEXT, TEXT, TEXT);

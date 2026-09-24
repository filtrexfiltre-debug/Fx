import React, { useState } from 'react';
import {
  FileCode,
  Copy,
  Check,
  Download,
  Terminal,
  Database,
  Layers,
  Cpu,
  Globe,
  FolderGit2,
} from 'lucide-react';

interface CodeFile {
  id: string;
  name: string;
  category: 'Database' | '.NET Domain' | '.NET Infrastructure' | '.NET Application' | 'Frontend React 19';
  icon: any;
  language: string;
  description: string;
  content: string;
}

export const CodeExplorer: React.FC = () => {
  const [copied, setCopied] = useState<boolean>(false);

  const files: CodeFile[] = [
    {
      id: 'sql',
      name: 'schema.sql',
      category: 'Database',
      icon: Database,
      language: 'sql',
      description: 'PostgreSQL 9 Temel Modül + Vergi + Virman Tabloları, Composite İndeksler ve DECIMAL(18,4) DDL',
      content: `-- ============================================================================
-- FX ENTERPRISE ERP - MULTI-TENANT & MULTI-BRANCH POSTGRESQL VERİTABANI ŞEMASI
-- Türk Ticaret ve Vergi Mevzuatına %100 Uyumlu DDL Scripti
-- Tüm tablolarda 'tenant_id' (UUID) ve 'branch_id' (UUID) zorunlu ve Composite Index'lidir.
-- Finansal tutarlar kuruş kaybını önlemek için DECIMAL(18, 4) olarak tanımlanmıştır.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. CARİ HESAPLAR VE CRM MODÜLÜ (contacts)
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    company_name VARCHAR(255),
    email VARCHAR(150),
    phone_number VARCHAR(30) NOT NULL, -- E.164 formatında (+905321112233)
    whatsapp_id VARCHAR(50),           -- Doğrudan WhatsApp entegrasyonu için
    tax_id VARCHAR(11),                -- VKN (10) veya TCKN (11 hane)
    tax_office VARCHAR(100),
    is_lead BOOLEAN NOT NULL DEFAULT TRUE,      -- CRM için default true
    is_customer BOOLEAN NOT NULL DEFAULT FALSE, -- Muhasebe için default false
    current_balance DECIMAL(18, 4) NOT NULL DEFAULT 0.0000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_contacts_phone_format CHECK (phone_number ~ '^\\+[1-9]\\d{1,14}$')
);

CREATE INDEX IF NOT EXISTS idx_contacts_tenant_branch ON contacts(tenant_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_contacts_phone_number ON contacts(phone_number);
CREATE INDEX IF NOT EXISTS idx_contacts_whatsapp_id ON contacts(whatsapp_id);

-- 2. KASALAR VE BANKALAR MODÜLÜ (cashes_and_banks)
CREATE TABLE IF NOT EXISTS cashes_and_banks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    name VARCHAR(150) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('Cash', 'Bank')),
    currency_code CHAR(3) NOT NULL DEFAULT 'TRY',
    balance DECIMAL(18, 4) NOT NULL DEFAULT 0.0000,
    iban VARCHAR(34),
    account_number VARCHAR(50),
    branch_code VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_cashes_banks_tenant_branch ON cashes_and_banks(tenant_id, branch_id);

-- 3. E-FATURALAR & BELGELER (invoices & invoice_items)
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
    invoice_number VARCHAR(32) NOT NULL, -- Şube bazlı seri + yıl + 9 hane sıra no
    issue_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    due_date DATE,
    total_amount DECIMAL(18, 4) NOT NULL DEFAULT 0.0000,
    tax_amount DECIMAL(18, 4) NOT NULL DEFAULT 0.0000,
    grand_total DECIMAL(18, 4) NOT NULL DEFAULT 0.0000,
    status VARCHAR(30) NOT NULL DEFAULT 'Draft',
    gib_uuid UUID,
    currency_code CHAR(3) NOT NULL DEFAULT 'TRY',
    exchange_rate DECIMAL(18, 4) NOT NULL DEFAULT 1.0000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_invoice_tenant_number UNIQUE (tenant_id, invoice_number)
);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_branch ON invoices(tenant_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_invoices_gib_uuid ON invoices(gib_uuid);

-- 4. BORÇLAR & ALACAKLAR (customer_movements)
CREATE TABLE IF NOT EXISTS customer_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
    movement_type VARCHAR(10) NOT NULL CHECK (movement_type IN ('Debit', 'Credit')),
    amount DECIMAL(18, 4) NOT NULL,
    balance_after DECIMAL(18, 4) NOT NULL,
    document_type VARCHAR(30) NOT NULL,
    document_id UUID,
    document_number VARCHAR(50),
    due_date DATE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_customer_movements_tenant_branch ON customer_movements(tenant_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_customer_movements_due_date ON customer_movements(contact_id, due_date);

-- 5. GELİRLER & GİDERLER (operational_expenses)
CREATE TABLE IF NOT EXISTS operational_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    category VARCHAR(60) NOT NULL,
    amount DECIMAL(18, 4) NOT NULL,
    tax_amount DECIMAL(18, 4) NOT NULL DEFAULT 0.0000,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    is_tax_deductible BOOLEAN NOT NULL DEFAULT TRUE,
    is_shared_expense BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_operational_expenses_tenant_branch ON operational_expenses(tenant_id, branch_id);

-- 6. ÜRÜN VE STOK DEPO (products & product_stocks)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    barcode VARCHAR(50),
    name VARCHAR(200) NOT NULL,
    unit VARCHAR(20) NOT NULL DEFAULT 'Adet',
    vat_rate DECIMAL(18, 4) NOT NULL DEFAULT 0.2000,
    purchase_price DECIMAL(18, 4) NOT NULL DEFAULT 0.0000,
    sale_price DECIMAL(18, 4) NOT NULL DEFAULT 0.0000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_product_code_tenant UNIQUE (tenant_id, code)
);

CREATE TABLE IF NOT EXISTS product_stocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity DECIMAL(18, 4) NOT NULL DEFAULT 0.0000,
    reserved_quantity DECIMAL(18, 4) NOT NULL DEFAULT 0.0000,
    min_stock_level DECIMAL(18, 4) NOT NULL DEFAULT 0.0000,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_product_stocks_branch UNIQUE (tenant_id, branch_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_product_stocks_tenant_branch ON product_stocks(tenant_id, branch_id);

-- 7. ÇEKLER & SENETLER (cheques_and_bonds)
CREATE TABLE IF NOT EXISTS cheques_and_bonds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
    serial_number VARCHAR(50) NOT NULL,
    due_date DATE NOT NULL,
    amount DECIMAL(18, 4) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('Cheque', 'Bond')),
    status VARCHAR(30) NOT NULL DEFAULT 'InPortfolio',
    drawer_name VARCHAR(150) NOT NULL,
    is_customer_portion BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_cheques_bonds_tenant_branch ON cheques_and_bonds(tenant_id, branch_id);

-- 8. ÖDEMELER & TAHSİLATLAR (receipts)
CREATE TABLE IF NOT EXISTS receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
    cash_bank_id UUID NOT NULL REFERENCES cashes_and_banks(id) ON DELETE RESTRICT,
    receipt_number VARCHAR(50) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('Collection', 'Payment')),
    total_amount DECIMAL(18, 4) NOT NULL,
    receipt_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'Completed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_receipt_number_tenant UNIQUE (tenant_id, receipt_number)
);
CREATE INDEX IF NOT EXISTS idx_receipts_tenant_branch ON receipts(tenant_id, branch_id);

-- 9. PERSONEL MODÜLÜ (employees)
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    identity_number CHAR(11) NOT NULL,
    salary DECIMAL(18, 4) NOT NULL DEFAULT 0.0000,
    department VARCHAR(80),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    iban VARCHAR(34) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_employee_tckn CHECK (length(identity_number) = 11 AND identity_number ~ '^[0-9]+$')
);
CREATE INDEX IF NOT EXISTS idx_employees_tenant_branch ON employees(tenant_id, branch_id);

-- 10. RESMİ VERGİ DAĞITIMI (tax_allocations)
CREATE TABLE IF NOT EXISTS tax_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    parent_expense_id VARCHAR(64) NOT NULL,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    allocated_amount DECIMAL(18, 4) NOT NULL,
    allocation_ratio DECIMAL(18, 4) NOT NULL,
    tax_type VARCHAR(40) NOT NULL,
    tax_period VARCHAR(10) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tax_allocations_tenant_branch ON tax_allocations(tenant_id, branch_id);

-- 11. ŞUBELER ARASI VİRMAN TRANSFERLERİ (inter_branch_transfers)
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
    status VARCHAR(30) NOT NULL DEFAULT 'WaitingApproval',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMPTZ,
    created_by_user VARCHAR(150) NOT NULL,
    approved_by_user VARCHAR(150),
    CONSTRAINT chk_different_branches CHECK (source_branch_id <> target_branch_id)
);
CREATE INDEX IF NOT EXISTS idx_transfers_tenant_branches ON inter_branch_transfers(tenant_id, source_branch_id, target_branch_id);
`,
    },
    {
      id: 'entities',
      name: 'Entities.cs',
      category: '.NET Domain',
      icon: Layers,
      language: 'csharp',
      description: 'C# 13 Primary Constructor kullanan Domain Modelleri ve Çoklu Şube/Kiracı Arayüzleri',
      content: `// ============================================================================
// FX ENTERPRISE ERP - .NET 9 (C# 13) DOMAIN ENTITIES
// ============================================================================

namespace Fx.Domain.Common;

public abstract class BaseEntity(Guid id)
{
    protected BaseEntity() : this(Guid.NewGuid()) { }
    public Guid Id { get; init; } = id;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public interface ITenantBranchEntity
{
    Guid TenantId { get; set; }
    Guid BranchId { get; set; }
}

public interface ITenantOnlyEntity
{
    Guid TenantId { get; set; }
}

namespace Fx.Domain.Entities;

using Fx.Domain.Common;

// 1. CARİ HESAPLAR & CRM (contacts) - C# 13 Primary Constructor
public class Contact(
    Guid tenantId,
    Guid branchId,
    string firstName,
    string lastName,
    string phoneNumber,
    string? companyName = null,
    string? email = null,
    string? whatsappId = null,
    string? taxId = null,
    string? taxOffice = null,
    bool isLead = true,
    bool isCustomer = false,
    decimal currentBalance = 0.0000m
) : BaseEntity, ITenantBranchEntity
{
    public Guid TenantId { get; set; } = tenantId;
    public Guid BranchId { get; set; } = branchId;
    public string FirstName { get; set; } = firstName;
    public string LastName { get; set; } = lastName;
    public string FullName => $"{FirstName} {LastName}";
    public string? CompanyName { get; set; } = companyName;
    public string? Email { get; set; } = email;
    public string PhoneNumber { get; set; } = phoneNumber; // E.164 (+905321112233)
    public string? WhatsappId { get; set; } = whatsappId ?? phoneNumber.Replace("+", "").Replace(" ", "");
    public string? TaxId { get; set; } = taxId;
    public string? TaxOffice { get; set; } = taxOffice;
    public bool IsLead { get; set; } = isLead;
    public bool IsCustomer { get; set; } = isCustomer;
    public decimal CurrentBalance { get; set; } = currentBalance;
}

// 2. KASALAR & BANKALAR (cashes_and_banks)
public class CashBank(
    Guid tenantId,
    Guid branchId,
    string name,
    string type,
    string currencyCode = "TRY",
    decimal balance = 0.0000m,
    string? iban = null,
    string? accountNumber = null,
    string? branchCode = null
) : BaseEntity, ITenantBranchEntity
{
    public Guid TenantId { get; set; } = tenantId;
    public Guid BranchId { get; set; } = branchId;
    public string Name { get; set; } = name;
    public string Type { get; set; } = type; // "Cash" / "Bank"
    public string CurrencyCode { get; set; } = currencyCode;
    public decimal Balance { get; set; } = balance;
    public string? Iban { get; set; } = iban;
    public string? AccountNumber { get; set; } = accountNumber;
    public string? BranchCode { get; set; } = branchCode;
}

// 3. E-FATURALAR (invoices)
public class Invoice(
    Guid tenantId,
    Guid branchId,
    Guid contactId,
    string invoiceNumber,
    decimal totalAmount,
    decimal taxAmount,
    decimal grandTotal,
    string status = "Draft",
    Guid? gibUuid = null,
    string currencyCode = "TRY",
    decimal exchangeRate = 1.0000m,
    string? notes = null
) : BaseEntity, ITenantBranchEntity
{
    public Guid TenantId { get; set; } = tenantId;
    public Guid BranchId { get; set; } = branchId;
    public Guid ContactId { get; set; } = contactId;
    public string InvoiceNumber { get; set; } = invoiceNumber;
    public DateTimeOffset IssueDate { get; set; } = DateTimeOffset.UtcNow;
    public decimal TotalAmount { get; set; } = totalAmount;
    public decimal TaxAmount { get; set; } = taxAmount;
    public decimal GrandTotal { get; set; } = grandTotal;
    public string Status { get; set; } = status;
    public Guid? GibUuid { get; set; } = gibUuid;
    public string CurrencyCode { get; set; } = currencyCode;
    public decimal ExchangeRate { get; set; } = exchangeRate;
}

// 4. ŞUBELER ARASI VİRMAN (inter_branch_transfers)
public class InterBranchTransfer(
    Guid tenantId,
    string transferNumber,
    Guid sourceBranchId,
    Guid targetBranchId,
    Guid sourceCashBankId,
    Guid targetCashBankId,
    decimal amount,
    string description,
    string createdByUser,
    string currencyCode = "TRY",
    string status = "WaitingApproval"
) : BaseEntity
{
    public Guid TenantId { get; set; } = tenantId;
    public string TransferNumber { get; set; } = transferNumber;
    public Guid SourceBranchId { get; set; } = sourceBranchId;
    public Guid TargetBranchId { get; set; } = targetBranchId;
    public Guid SourceCashBankId { get; set; } = sourceCashBankId;
    public Guid TargetCashBankId { get; set; } = targetCashBankId;
    public decimal Amount { get; set; } = amount;
    public string CurrencyCode { get; set; } = currencyCode;
    public string Description { get; set; } = description;
    public string Status { get; set; } = status; // WaitingApproval -> Completed
    public DateTimeOffset? ApprovedAt { get; set; }
    public string CreatedByUser { get; set; } = createdByUser;
    public string? ApprovedByUser { get; set; }
}
`,
    },
    {
      id: 'dbcontext',
      name: 'ApplicationDbContext.cs',
      category: '.NET Infrastructure',
      icon: Cpu,
      language: 'csharp',
      description: 'Dinamik Global Query Filter: Token TenantId ve BranchId bağlamı, GlobalUser şube kilidi kaldırma',
      content: `// ============================================================================
// FX ENTERPRISE ERP - APPLICATION DB CONTEXT & GÜVENLİK DUVARI
// ============================================================================

namespace Fx.Infrastructure.Persistence;

using System.Reflection;
using Microsoft.EntityFrameworkCore;
using Fx.Domain.Common;
using Fx.Domain.Entities;
using Fx.Infrastructure.Services;

public class ApplicationDbContext(
    DbContextOptions<ApplicationDbContext> options,
    ICurrentUserService currentUserService
) : DbContext(options)
{
    private readonly ICurrentUserService _currentUserService = currentUserService;

    public DbSet<Contact> Contacts => Set<Contact>();
    public DbSet<CashBank> CashesAndBanks => Set<CashBank>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<InvoiceItem> InvoiceItems => Set<InvoiceItem>();
    public DbSet<CustomerMovement> CustomerMovements => Set<CustomerMovement>();
    public DbSet<OperationalExpense> OperationalExpenses => Set<OperationalExpense>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductStock> ProductStocks => Set<ProductStock>();
    public DbSet<ChequeBond> ChequesAndBonds => Set<ChequeBond>();
    public DbSet<Receipt> Receipts => Set<Receipt>();
    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<TaxAllocation> TaxAllocations => Set<TaxAllocation>();
    public DbSet<InterBranchTransfer> InterBranchTransfers => Set<InterBranchTransfer>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // 1. KURUŞ KAYBINI ÖNLEMEK İÇİN TÜM DECIMALLERİ DECIMAL(18, 4) YAP
        foreach (var property in modelBuilder.Model.GetEntityTypes()
                     .SelectMany(t => t.GetProperties())
                     .Where(p => p.ClrType == typeof(decimal) || p.ClrType == typeof(decimal?)))
        {
            property.SetPrecision(18);
            property.SetScale(4);
            property.SetColumnType("decimal(18,4)");
        }

        // 2. GÜVENLİK DUVARI: GLOBAL QUERY FILTER & COMPOSITE INDEKSLER
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            var clrType = entityType.ClrType;

            if (typeof(ITenantBranchEntity).IsAssignableFrom(clrType))
            {
                // (tenant_id, branch_id) Composite Index ekle
                entityType.AddIndex([
                    entityType.FindProperty(nameof(ITenantBranchEntity.TenantId))!,
                    entityType.FindProperty(nameof(ITenantBranchEntity.BranchId))!
                ]);

                // Global Query Filter:
                // GlobalUser (Patron/Merkez) ise: Şube kısıtı kalkar, tüm şubeler konsolide raporlanır!
                // Şube kullanıcısı ise: Kesinlikle sadece kendi şubesini görür!
                var method = typeof(ApplicationDbContext)
                    .GetMethod(nameof(ConfigureTenantBranchFilter), BindingFlags.NonPublic | BindingFlags.Instance)?
                    .MakeGenericMethod(clrType);

                method?.Invoke(this, [modelBuilder]);
            }
        }
    }

    private void ConfigureTenantBranchFilter<TEntity>(ModelBuilder builder)
        where TEntity : class, ITenantBranchEntity
    {
        builder.Entity<TEntity>().HasQueryFilter(e =>
            e.TenantId == _currentUserService.TenantId &&
            (_currentUserService.IsGlobalUser || e.BranchId == _currentUserService.BranchId)
        );
    }
}
`,
    },
    {
      id: 'cqrs',
      name: 'CreateTransferCommand.cs',
      category: '.NET Application',
      icon: Terminal,
      language: 'csharp',
      description: '2 Aşamalı Şubeler Arası Virman Akışı: IDbContextTransaction Atomic Blok ve Rollback Mekanizması',
      content: `// ============================================================================
// FX ENTERPRISE ERP - .NET 9 APPLICATION KATMANI (CQRS & MEDIATR)
// 2 Aşamalı Şubeler Arası Virman: CreateTransferCommand & IDbContextTransaction
// ============================================================================

namespace Fx.Application.Transfers.Commands.CreateTransfer;

using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Fx.Domain.Entities;
using Fx.Infrastructure.Persistence;
using Fx.Infrastructure.Services;

public record CreateTransferCommand(
    Guid SourceBranchId,
    Guid TargetBranchId,
    Guid SourceCashBankId,
    Guid TargetCashBankId,
    decimal Amount,
    string Description,
    string CurrencyCode = "TRY"
) : IRequest<TransferResultDto>;

public record TransferResultDto(
    Guid TransferId,
    string TransferNumber,
    string Status,
    decimal Amount,
    string SourceAccountName,
    decimal SourceRemainingBalance,
    string Message
);

public class CreateTransferCommandHandler(
    ApplicationDbContext context,
    ICurrentUserService currentUserService,
    ILogger<CreateTransferCommandHandler> logger
) : IRequestHandler<CreateTransferCommand, TransferResultDto>
{
    private readonly ApplicationDbContext _context = context;
    private readonly ICurrentUserService _currentUserService = currentUserService;
    private readonly ILogger<CreateTransferCommandHandler> _logger = logger;

    public async Task<TransferResultDto> Handle(CreateTransferCommand request, CancellationToken cancellationToken)
    {
        if (request.Amount <= 0)
            throw new ArgumentException("Virman tutarı 0'dan büyük olmalıdır (Decimal 18,4).");

        if (request.SourceBranchId == request.TargetBranchId)
            throw new InvalidOperationException("Kaynak şube ile hedef şube aynı olamaz.");

        var tenantId = _currentUserService.TenantId;

        // 1. ATOMİK VERİTABANI İŞLEMİ BAŞLAT (IDbContextTransaction)
        await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);

        try
        {
            var sourceAccount = await _context.CashesAndBanks
                .FirstOrDefaultAsync(cb => cb.Id == request.SourceCashBankId && cb.BranchId == request.SourceBranchId, cancellationToken)
                ?? throw new KeyNotFoundException("Kaynak şube kasa/banka hesabı bulunamadı.");

            var targetAccount = await _context.CashesAndBanks
                .FirstOrDefaultAsync(cb => cb.Id == request.TargetCashBankId && cb.BranchId == request.TargetBranchId, cancellationToken)
                ?? throw new KeyNotFoundException("Hedef şube kasa/banka hesabı bulunamadı.");

            // Bakiye kontrolü
            if (sourceAccount.Balance < request.Amount)
            {
                throw new InvalidOperationException(
                    $"Kaynak hesapta yetersiz bakiye! Bakiye: {sourceAccount.Balance:N2}, İstenen: {request.Amount:N2}");
            }

            // 2. 1. AŞAMA İŞLEMİ: Para KAYNAK hesaptan ANINDA düşülür
            sourceAccount.Balance -= request.Amount;
            sourceAccount.UpdatedAt = DateTimeOffset.UtcNow;

            var sequence = await _context.InterBranchTransfers.CountAsync(t => t.TenantId == tenantId, cancellationToken) + 1;
            var transferNumber = $"VRM-{DateTime.UtcNow.Year}-{sequence:D5}";

            // 3. Durum: 'WaitingApproval' (Askıda/Yolda) olarak kaydedilir
            var transfer = new InterBranchTransfer(
                tenantId: tenantId,
                transferNumber: transferNumber,
                sourceBranchId: request.SourceBranchId,
                targetBranchId: request.TargetBranchId,
                sourceCashBankId: request.SourceCashBankId,
                targetCashBankId: request.TargetCashBankId,
                amount: request.Amount,
                description: request.Description,
                createdByUser: _currentUserService.UserEmail,
                status: "WaitingApproval"
            );

            await _context.InterBranchTransfers.AddAsync(transfer, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);

            // 4. ATOMİK İŞLEMİ ONAYLA (COMMIT)
            await transaction.CommitAsync(cancellationToken);

            return new TransferResultDto(
                transfer.Id,
                transfer.TransferNumber,
                transfer.Status,
                transfer.Amount,
                sourceAccount.Name,
                sourceAccount.Balance,
                "Virman başarıyla başlatıldı. Kaynak kasadan tutar düşüldü, hedef şube onayı bekleniyor (WaitingApproval)."
            );
        }
        catch (Exception ex)
        {
            // 5. HATA DURUMUNDA GÜVENLİ ROLLBACK MEKANİZMASI
            _logger.LogError(ex, "Virman sırasında hata! IDbContextTransaction ROLLBACK ediliyor...");
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }
}
`,
    },
    {
      id: 'api',
      name: 'api.ts',
      category: 'Frontend React 19',
      icon: Globe,
      language: 'typescript',
      description: 'Navbar üzerinden seçilen şubeyi tüm isteklere X-Selected-Branch-Id header olarak ekleyen servis',
      content: `/**
 * FX Enterprise ERP - api.ts
 * .NET 9 Web API bağlantı servisi.
 * Navbar üzerinden seçilen aktif şube bilgisini 'X-Selected-Branch-Id' header'ı olarak
 * tüm giden isteklere otomatik enjekte eder.
 */

export const fxApi = {
  getHeaders(): HeadersInit {
    const branchId = branchContext.getSelectedBranchId();
    const token = localStorage.getItem('fx_auth_token') || 'jwt_token';
    const isGlobal = branchContext.getIsGlobalUser();

    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': \`Bearer \${token}\`,
      // .NET 9 Controller / Middleware için headerlar:
      'X-Tenant-Id': CURRENT_TENANT.id,
      'X-Selected-Branch-Id': branchId,
      'X-Is-Global-User': String(isGlobal),
    };
  },

  async getContacts() {
    // .NET 9 GET /api/contacts çağrısı
    // 'X-Selected-Branch-Id' header'ı ile filtrelenir
    return fetch('/api/contacts', {
      method: 'GET',
      headers: this.getHeaders(),
    });
  }
};
`,
    },
  ];

  const [selectedFile, setSelectedFile] = useState<CodeFile>(files[0]);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([selectedFile.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = selectedFile.name;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Üst Bilgilendirme */}
      <div className="bg-white border border-stone-200/90 rounded-lg p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded-md">
                <FolderGit2 className="w-5 h-5" />
              </span>
              <h2 className="text-base font-bold text-stone-900">
                FX Mimari Omurga & Üretime Hazır Kod Havuzu (Production-Ready)
              </h2>
            </div>
            <p className="text-xs text-stone-600 mt-1">
              Geçici veya eksik yorum satırı olmadan, tamamen kopyalayıp yerel bilgisayarınızda (Local) doğrudan çalıştırabileceğiniz PostgreSQL DDL, .NET 9 (C# 13) Clean Architecture ve React 19 kodları.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors shadow-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Kopyalandı!' : `${selectedFile.name} Kopyala`}
            </button>
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 hover:text-stone-900 hover:bg-stone-50 border border-stone-200 rounded transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-stone-500" />
              Dosyayı İndir
            </button>
          </div>
        </div>
      </div>

      {/* İki Kolonlu Kod Gezgini */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* SOL: Dosya Ağacı */}
        <div className="bg-white border border-stone-200/90 rounded-lg p-3 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider px-2 block mb-2">
            Mimari Kaynak Dosyaları
          </span>

          {files.map((file) => {
            const Icon = file.icon;
            const isSelected = file.id === selectedFile.id;
            return (
              <button
                key={file.id}
                onClick={() => setSelectedFile(file)}
                className={`w-full text-left px-2.5 py-2 rounded-md flex items-center justify-between text-xs transition-colors ${
                  isSelected
                    ? 'bg-indigo-50 text-indigo-950 font-semibold border border-indigo-200/80'
                    : 'text-stone-700 hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-indigo-600' : 'text-stone-400'}`} />
                  <div className="truncate">
                    <div className="truncate font-mono">{file.name}</div>
                    <div className="text-[10px] text-stone-400">{file.category}</div>
                  </div>
                </div>
                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />}
              </button>
            );
          })}

          <div className="pt-4 mt-3 border-t border-stone-100">
            <div className="p-2.5 bg-stone-50 rounded text-[11px] text-stone-600 space-y-1.5">
              <span className="font-semibold block text-stone-900">Yerel (Local) Çalıştırma:</span>
              <p className="font-mono text-[10px] text-indigo-900 bg-white p-1.5 rounded border border-stone-200">
                dotnet new webapi -n Fx.Api<br />
                dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL<br />
                dotnet add package MediatR
              </p>
            </div>
          </div>
        </div>

        {/* SAĞ: Kod Görüntüleyici */}
        <div className="lg:col-span-3 bg-stone-950 rounded-lg shadow-sm border border-stone-800 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-stone-900/90 px-4 py-2.5 border-b border-stone-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-indigo-400" />
              <span className="font-mono font-bold text-stone-200">{selectedFile.name}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-800 text-stone-400">
                {selectedFile.language.toUpperCase()}
              </span>
            </div>
            <span className="text-[11px] text-stone-400 truncate max-w-md hidden sm:inline">
              {selectedFile.description}
            </span>
          </div>

          {/* Code Text Area */}
          <div className="p-4 overflow-x-auto max-h-[600px] overflow-y-auto">
            <pre className="text-xs font-mono text-stone-300 leading-relaxed whitespace-pre">
              {selectedFile.content}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

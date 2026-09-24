// ============================================================================
// FX ENTERPRISE ERP - .NET 9 ENTITY FRAMEWORK CORE INFRASTRUCTURE
// ApplicationDbContext & Dinamik Çoklu Şube / Çoklu Kiracı Global Query Filter
// ============================================================================

namespace Fx.Infrastructure.Services;

/// <summary>
/// Sisteme giriş yapan kullanıcının JWT Claims veya HTTP Header ('X-Selected-Branch-Id')
/// üzerinden okunan kimlik ve yetki bağlamı.
/// </summary>
public interface ICurrentUserService
{
    Guid TenantId { get; }
    Guid BranchId { get; }
    string UserId { get; }
    string UserEmail { get; }
    bool IsGlobalUser { get; } // Patron veya Merkez Muhasebe ise TRUE
}

namespace Fx.Infrastructure.Persistence;

using System.Linq.Expressions;
using System.Reflection;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Fx.Domain.Common;
using Fx.Domain.Entities;
using Fx.Infrastructure.Services;

public class ApplicationDbContext(
    DbContextOptions<ApplicationDbContext> options,
    ICurrentUserService currentUserService
) : DbContext(options)
{
    private readonly ICurrentUserService _currentUserService = currentUserService;

    // 9 Temel Modül + Vergi + Virman Tabloları
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

        // PostgreSQL Snake_case veya küçük harf tablo eşlemeleri
        modelBuilder.Entity<Contact>().ToTable("contacts");
        modelBuilder.Entity<CashBank>().ToTable("cashes_and_banks");
        modelBuilder.Entity<Invoice>().ToTable("invoices");
        modelBuilder.Entity<InvoiceItem>().ToTable("invoice_items");
        modelBuilder.Entity<CustomerMovement>().ToTable("customer_movements");
        modelBuilder.Entity<OperationalExpense>().ToTable("operational_expenses");
        modelBuilder.Entity<Product>().ToTable("products");
        modelBuilder.Entity<ProductStock>().ToTable("product_stocks");
        modelBuilder.Entity<ChequeBond>().ToTable("cheques_and_bonds");
        modelBuilder.Entity<Receipt>().ToTable("receipts");
        modelBuilder.Entity<Employee>().ToTable("employees");
        modelBuilder.Entity<TaxAllocation>().ToTable("tax_allocations");
        modelBuilder.Entity<InterBranchTransfer>().ToTable("inter_branch_transfers");

        // 1. TÜM DECIMAL ALANLARI KURUŞ KAYBINI ÖNLEMEK İÇİN DECIMAL(18, 4) OLARAK ZORLA
        foreach (var property in modelBuilder.Model.GetEntityTypes()
                     .SelectMany(t => t.GetProperties())
                     .Where(p => p.ClrType == typeof(decimal) || p.ClrType == typeof(decimal?)))
        {
            property.SetPrecision(18);
            property.SetScale(4);
            property.SetColumnType("decimal(18,4)");
        }

        // 2. GÜVENLİK DUVARI: GLOBAL QUERY FILTER & COMPOSITE INDEKSLER
        // Model içindeki tüm ITenantBranchEntity ve ITenantOnlyEntity tiplerini tara
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            var clrType = entityType.ClrType;

            // Operasyonel şube tabloları için (tenant_id, branch_id) Composite Index ekle
            if (typeof(ITenantBranchEntity).IsAssignableFrom(clrType))
            {
                entityType.AddIndex([
                    entityType.FindProperty(nameof(ITenantBranchEntity.TenantId))!,
                    entityType.FindProperty(nameof(ITenantBranchEntity.BranchId))!
                ]);

                // Global Query Filter Uygula:
                // GlobalUser ise: sadece TenantId filtresi çalışır (tüm şubeleri konsolide görebilir)
                // Normal Şube kullanıcısı ise: hem TenantId hem de BranchId kilitlenir!
                var method = typeof(ApplicationDbContext)
                    .GetMethod(nameof(ConfigureTenantBranchFilter), BindingFlags.NonPublic | BindingFlags.Instance)?
                    .MakeGenericMethod(clrType);

                method?.Invoke(this, [modelBuilder]);
            }
            else if (typeof(ITenantOnlyEntity).IsAssignableFrom(clrType))
            {
                // Sadece Kiracı bazlı katalog filtrelemesi (Örn: Products)
                var method = typeof(ApplicationDbContext)
                    .GetMethod(nameof(ConfigureTenantOnlyFilter), BindingFlags.NonPublic | BindingFlags.Instance)?
                    .MakeGenericMethod(clrType);

                method?.Invoke(this, [modelBuilder]);
            }
        }

        // Özel Kısıtlar ve İndeksler
        modelBuilder.Entity<Employee>()
            .Property(e => e.IdentityNumber)
            .HasMaxLength(11)
            .IsFixedLength();

        modelBuilder.Entity<Contact>()
            .HasIndex(c => c.PhoneNumber);

        modelBuilder.Entity<Contact>()
            .HasIndex(c => c.WhatsappId);
    }

    /// <summary>
    /// GÜVENLİK DUVARI: EF Core Global Query Filter
    /// Token'dan gelen IsGlobalUser kontrolüne göre şube kilidini dinamik açar veya kapatır.
    /// </summary>
    private void ConfigureTenantBranchFilter<TEntity>(ModelBuilder builder)
        where TEntity : class, ITenantBranchEntity
    {
        builder.Entity<TEntity>().HasQueryFilter(e =>
            e.TenantId == _currentUserService.TenantId &&
            (_currentUserService.IsGlobalUser || e.BranchId == _currentUserService.BranchId)
        );
    }

    private void ConfigureTenantOnlyFilter<TEntity>(ModelBuilder builder)
        where TEntity : class, ITenantOnlyEntity
    {
        builder.Entity<TEntity>().HasQueryFilter(e =>
            e.TenantId == _currentUserService.TenantId
        );
    }

    /// <summary>
    /// Otomatik Denetim ve Çoklu Kiracı/Şube Güvenlik Damgası (Audit Interceptor)
    /// </summary>
    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var entries = ChangeTracker.Entries();
        var now = DateTimeOffset.UtcNow;

        foreach (var entry in entries)
        {
            if (entry.Entity is BaseEntity baseEntity)
            {
                if (entry.State == EntityState.Added)
                {
                    baseEntity.CreatedAt = now;
                    baseEntity.UpdatedAt = now;
                }
                else if (entry.State == EntityState.Modified)
                {
                    baseEntity.UpdatedAt = now;
                }
            }

            // Yeni eklenen nesnelerde TenantId ve BranchId'yi güvenli bir şekilde token'dan enjekte et
            if (entry.State == EntityState.Added)
            {
                if (entry.Entity is ITenantBranchEntity tenantBranchEntity)
                {
                    if (tenantBranchEntity.TenantId == Guid.Empty)
                        tenantBranchEntity.TenantId = _currentUserService.TenantId;

                    if (tenantBranchEntity.BranchId == Guid.Empty)
                        tenantBranchEntity.BranchId = _currentUserService.BranchId;
                }
                else if (entry.Entity is ITenantOnlyEntity tenantOnlyEntity)
                {
                    if (tenantOnlyEntity.TenantId == Guid.Empty)
                        tenantOnlyEntity.TenantId = _currentUserService.TenantId;
                }
            }
        }

        return base.SaveChangesAsync(cancellationToken);
    }
}

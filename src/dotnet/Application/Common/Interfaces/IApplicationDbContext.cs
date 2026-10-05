namespace Fx.Application.Common.Interfaces;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Fx.Domain.Entities;

public interface IApplicationDbContext
{
    DbSet<Contact> Contacts { get; }
    DbSet<CashBank> CashesAndBanks { get; }
    DbSet<Invoice> Invoices { get; }
    DbSet<InvoiceItem> InvoiceItems { get; }
    DbSet<CustomerMovement> CustomerMovements { get; }
    DbSet<OperationalExpense> OperationalExpenses { get; }
    DbSet<Product> Products { get; }
    DbSet<ProductStock> ProductStocks { get; }
    DbSet<ChequeBond> ChequesAndBonds { get; }
    DbSet<Receipt> Receipts { get; }
    DbSet<Employee> Employees { get; }
    DbSet<TaxAllocation> TaxAllocations { get; }
    DbSet<InterBranchTransfer> InterBranchTransfers { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    Task<IDbContextTransaction> BeginTransactionAsync(CancellationToken cancellationToken = default);
}

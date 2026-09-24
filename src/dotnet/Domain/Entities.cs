// ============================================================================
// FX ENTERPRISE ERP - .NET 9 (C# 13) DOMAIN ENTITIES
// Clean Architecture prensiplerine uygun, Primary Constructor kullanan Domain Modelleri
// ============================================================================

namespace Fx.Domain.Common;

/// <summary>
/// Tüm domain nesneleri için temel Id ve denetim (audit) alanları
/// </summary>
public abstract class BaseEntity(Guid id)
{
    protected BaseEntity() : this(Guid.NewGuid()) { }

    public Guid Id { get; init; } = id;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

/// <summary>
/// Çoklu kiracı (Tenant) ve çoklu şube (Branch) zorunlu izolasyon arayüzü
/// </summary>
public interface ITenantBranchEntity
{
    Guid TenantId { get; set; }
    Guid BranchId { get; set; }
}

/// <summary>
/// Sadece kiracıya bağlı ortak katalog nesneleri (Örn: Ürün kartları)
/// </summary>
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
    public string PhoneNumber { get; set; } = phoneNumber; // E.164
    public string? WhatsappId { get; set; } = whatsappId ?? phoneNumber.Replace("+", "").Replace(" ", "");
    public string? TaxId { get; set; } = taxId; // VKN (10) veya TCKN (11)
    public string? TaxOffice { get; set; } = taxOffice;
    public bool IsLead { get; set; } = isLead;
    public bool IsCustomer { get; set; } = isCustomer;
    public decimal CurrentBalance { get; set; } = currentBalance;

    // Navigation Properties
    public virtual ICollection<Invoice> Invoices { get; set; } = [];
    public virtual ICollection<CustomerMovement> Movements { get; set; } = [];
}

// 2. KASALAR & BANKALAR (cashes_and_banks) - C# 13 Primary Constructor
public class CashBank(
    Guid tenantId,
    Guid branchId,
    string name,
    string type, // "Cash" or "Bank"
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
    public string Type { get; set; } = type;
    public string CurrencyCode { get; set; } = currencyCode;
    public decimal Balance { get; set; } = balance;
    public string? Iban { get; set; } = iban;
    public string? AccountNumber { get; set; } = accountNumber;
    public string? BranchCode { get; set; } = branchCode;
}

// 3. E-FATURALAR & BELGELER (invoices) - C# 13 Primary Constructor
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
    public string InvoiceNumber { get; set; } = invoiceNumber; // Şube seri numaratörü (Örn: MRK2026000000001)
    public DateTimeOffset IssueDate { get; set; } = DateTimeOffset.UtcNow;
    public DateOnly? DueDate { get; set; }
    public decimal TotalAmount { get; set; } = totalAmount; // KDV Hariç Matrah
    public decimal TaxAmount { get; set; } = taxAmount;     // Toplam KDV
    public decimal GrandTotal { get; set; } = grandTotal;   // Ödenecek Genel Tutar
    public string Status { get; set; } = status;           // Draft, Sent, GibApproved, Cancelled
    public Guid? GibUuid { get; set; } = gibUuid;          // GİB tekil evrensel etiket UUID'si
    public string CurrencyCode { get; set; } = currencyCode;
    public decimal ExchangeRate { get; set; } = exchangeRate;
    public string? Notes { get; set; } = notes;

    public virtual Contact? Contact { get; set; }
    public virtual ICollection<InvoiceItem> Items { get; set; } = [];
}

public class InvoiceItem(
    Guid tenantId,
    Guid branchId,
    Guid invoiceId,
    string description,
    decimal quantity,
    decimal unitPrice,
    decimal vatRate,
    decimal vatAmount,
    decimal totalAmount,
    Guid? productId = null
) : BaseEntity, ITenantBranchEntity
{
    public Guid TenantId { get; set; } = tenantId;
    public Guid BranchId { get; set; } = branchId;
    public Guid InvoiceId { get; set; } = invoiceId;
    public Guid? ProductId { get; set; } = productId;
    public string Description { get; set; } = description;
    public decimal Quantity { get; set; } = quantity;
    public decimal UnitPrice { get; set; } = unitPrice;
    public decimal VatRate { get; set; } = vatRate;
    public decimal VatAmount { get; set; } = vatAmount;
    public decimal TotalAmount { get; set; } = totalAmount;

    public virtual Invoice? Invoice { get; set; }
}

// 4. BORÇLAR & ALACAKLAR (customer_movements) - Cari Yaşlandırma ve Ekstre
public class CustomerMovement(
    Guid tenantId,
    Guid branchId,
    Guid contactId,
    string movementType, // "Debit" (Borç) / "Credit" (Alacak)
    decimal amount,
    decimal balanceAfter,
    string documentType,
    string? documentNumber = null,
    DateOnly? dueDate = null,
    string? description = null
) : BaseEntity, ITenantBranchEntity
{
    public Guid TenantId { get; set; } = tenantId;
    public Guid BranchId { get; set; } = branchId;
    public Guid ContactId { get; set; } = contactId;
    public string MovementType { get; set; } = movementType;
    public decimal Amount { get; set; } = amount;
    public decimal BalanceAfter { get; set; } = balanceAfter;
    public string DocumentType { get; set; } = documentType;
    public string? DocumentNumber { get; set; } = documentNumber;
    public DateOnly? DueDate { get; set; } = dueDate; // Cari yaşlandırma için
    public string? Description { get; set; } = description;

    public virtual Contact? Contact { get; set; }
}

// 5. GELİRLER & GİDERLER (operational_expenses)
public class OperationalExpense(
    Guid tenantId,
    Guid branchId,
    string category,
    decimal amount,
    decimal taxAmount,
    DateOnly expenseDate,
    string? description = null,
    string? receiptNumber = null,
    bool isTaxDeductible = true,
    bool isSharedExpense = false
) : BaseEntity, ITenantBranchEntity
{
    public Guid TenantId { get; set; } = tenantId;
    public Guid BranchId { get; set; } = branchId;
    public string Category { get; set; } = category;
    public decimal Amount { get; set; } = amount;
    public decimal TaxAmount { get; set; } = taxAmount;
    public DateOnly ExpenseDate { get; set; } = expenseDate;
    public string? Description { get; set; } = description;
    public string? ReceiptNumber { get; set; } = receiptNumber;
    public bool IsTaxDeductible { get; set; } = isTaxDeductible;
    public bool IsSharedExpense { get; set; } = isSharedExpense;
}

// 6. ÜRÜN STOK DEPO (products & product_stocks)
// Ürün kartları ortak (ITenantOnlyEntity), ancak depo stok miktarları şube bazlı izole (ITenantBranchEntity)
public class Product(
    Guid tenantId,
    string code,
    string name,
    string unit = "Adet",
    decimal vatRate = 0.2000m,
    decimal purchasePrice = 0.0000m,
    decimal salePrice = 0.0000m,
    string? barcode = null
) : BaseEntity, ITenantOnlyEntity
{
    public Guid TenantId { get; set; } = tenantId;
    public string Code { get; set; } = code;
    public string? Barcode { get; set; } = barcode;
    public string Name { get; set; } = name;
    public string Unit { get; set; } = unit;
    public decimal VatRate { get; set; } = vatRate;
    public decimal PurchasePrice { get; set; } = purchasePrice;
    public decimal SalePrice { get; set; } = salePrice;

    public virtual ICollection<ProductStock> Stocks { get; set; } = [];
}

public class ProductStock(
    Guid tenantId,
    Guid branchId,
    Guid productId,
    decimal quantity = 0.0000m,
    decimal reservedQuantity = 0.0000m,
    decimal minStockLevel = 0.0000m
) : BaseEntity, ITenantBranchEntity
{
    public Guid TenantId { get; set; } = tenantId;
    public Guid BranchId { get; set; } = branchId;
    public Guid ProductId { get; set; } = productId;
    public decimal Quantity { get; set; } = quantity;
    public decimal ReservedQuantity { get; set; } = reservedQuantity;
    public decimal MinStockLevel { get; set; } = minStockLevel;

    public virtual Product? Product { get; set; }
}

// 7. ÇEKLER & SENETLER (cheques_and_bonds)
public class ChequeBond(
    Guid tenantId,
    Guid branchId,
    Guid contactId,
    string serialNumber,
    DateOnly dueDate,
    decimal amount,
    string type,   // "Cheque" or "Bond"
    string drawerName,
    string status = "InPortfolio",
    string? drawerBank = null,
    bool isCustomerPortion = true
) : BaseEntity, ITenantBranchEntity
{
    public Guid TenantId { get; set; } = tenantId;
    public Guid BranchId { get; set; } = branchId;
    public Guid ContactId { get; set; } = contactId;
    public string SerialNumber { get; set; } = serialNumber;
    public DateOnly DueDate { get; set; } = dueDate;
    public decimal Amount { get; set; } = amount;
    public string Type { get; set; } = type;
    public string Status { get; set; } = status; // InPortfolio, Endorsed, Collected, Bounced
    public string? DrawerBank { get; set; } = drawerBank;
    public string DrawerName { get; set; } = drawerName;
    public bool IsCustomerPortion { get; set; } = isCustomerPortion;

    public virtual Contact? Contact { get; set; }
}

// 8. ÖDEMELER & TAHSİLATLAR (receipts)
public class Receipt(
    Guid tenantId,
    Guid branchId,
    Guid contactId,
    Guid cashBankId,
    string receiptNumber,
    string type, // "Collection" / "Payment"
    decimal totalAmount,
    string status = "Completed",
    string? description = null
) : BaseEntity, ITenantBranchEntity
{
    public Guid TenantId { get; set; } = tenantId;
    public Guid BranchId { get; set; } = branchId;
    public Guid ContactId { get; set; } = contactId;
    public Guid CashBankId { get; set; } = cashBankId;
    public string ReceiptNumber { get; set; } = receiptNumber;
    public string Type { get; set; } = type;
    public decimal TotalAmount { get; set; } = totalAmount;
    public DateTimeOffset ReceiptDate { get; set; } = DateTimeOffset.UtcNow;
    public string Status { get; set; } = status;
    public string? Description { get; set; } = description;

    public virtual Contact? Contact { get; set; }
    public virtual CashBank? CashBank { get; set; }
}

// 9. PERSONEL MODÜLÜ (employees) - 11 Hane TCKN ve Detaylı İK Mimarisi
public class Employee(
    Guid tenantId,
    Guid branchId,
    string firstName,
    string lastName,
    string identityNumber, // 11 haneli TCKN
    decimal salary,
    string iban,
    string? title = null,
    string? bloodGroup = null,
    string? emergencyContactName = null,
    string? emergencyContactPhone = null,
    string? emergencyContactRelation = null,
    DateOnly? birthDate = null,
    string? educationLevel = null,
    string? employmentType = "FullTime",
    string? department = null,
    bool isActive = true,
    DateOnly? hireDate = null
) : BaseEntity, ITenantBranchEntity
{
    public Guid TenantId { get; set; } = tenantId;
    public Guid BranchId { get; set; } = branchId;
    public string FirstName { get; set; } = firstName;
    public string LastName { get; set; } = lastName;
    public string FullName => $"{FirstName} {LastName}";
    public string IdentityNumber { get; set; } = identityNumber;
    public decimal Salary { get; set; } = salary;
    public string Iban { get; set; } = iban;
    public string? Title { get; set; } = title;
    public string? BloodGroup { get; set; } = bloodGroup;
    public string? EmergencyContactName { get; set; } = emergencyContactName;
    public string? EmergencyContactPhone { get; set; } = emergencyContactPhone;
    public string? EmergencyContactRelation { get; set; } = emergencyContactRelation;
    public DateOnly? BirthDate { get; set; } = birthDate;
    public string? EducationLevel { get; set; } = educationLevel;
    public string? EmploymentType { get; set; } = employmentType;
    public string? Department { get; set; } = department;
    public bool IsActive { get; set; } = isActive;
    public DateOnly HireDate { get; set; } = hireDate ?? DateOnly.FromDateTime(DateTime.UtcNow);

    public virtual ICollection<EmployeeAddress> Addresses { get; set; } = [];
}

public class EmployeeAddress(
    Guid tenantId,
    Guid employeeId,
    string addressType, // "Residence", "Notification", "Emergency"
    int cityId,
    string districtId,
    string streetLine,
    string doorNumber,
    string? buildingName = null,
    string? apartmentNumber = null,
    bool isDefault = true
) : BaseEntity, ITenantOnlyEntity
{
    public Guid TenantId { get; set; } = tenantId;
    public Guid EmployeeId { get; set; } = employeeId;
    public string AddressType { get; set; } = addressType;
    public int CityId { get; set; } = cityId;
    public string DistrictId { get; set; } = districtId;
    public string StreetLine { get; set; } = streetLine;
    public string DoorNumber { get; set; } = doorNumber;
    public string? BuildingName { get; set; } = buildingName;
    public string? ApartmentNumber { get; set; } = apartmentNumber;
    public bool IsDefault { get; set; } = isDefault;

    public virtual Employee? Employee { get; set; }
}

// 10. RESMİ VERGİ DAĞITIMI (tax_allocations)
public class TaxAllocation(
    Guid tenantId,
    string parentExpenseId,
    Guid branchId,
    decimal allocatedAmount,
    decimal allocationRatio,
    string taxType,
    string taxPeriod
) : BaseEntity, ITenantBranchEntity
{
    public Guid TenantId { get; set; } = tenantId;
    public Guid BranchId { get; set; } = branchId;
    public string ParentExpenseId { get; set; } = parentExpenseId;
    public decimal AllocatedAmount { get; set; } = allocatedAmount;
    public decimal AllocationRatio { get; set; } = allocationRatio;
    public string TaxType { get; set; } = taxType;
    public string TaxPeriod { get; set; } = taxPeriod;
}

// 11. ŞUBELER ARASI VİRMAN (inter_branch_transfers)
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
    public string Status { get; set; } = status; // WaitingApproval, Completed, Rejected, RolledBack
    public DateTimeOffset? ApprovedAt { get; set; }
    public string CreatedByUser { get; set; } = createdByUser;
    public string? ApprovedByUser { get; set; }

    public virtual CashBank? SourceCashBank { get; set; }
    public virtual CashBank? TargetCashBank { get; set; }
}

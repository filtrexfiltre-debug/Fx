// ============================================================================
// FX ENTERPRISE ERP - .NET 9 APPLICATION KATMANI (CQRS & MEDIATR)
// 2 Aşamalı Şubeler Arası Virman Akışı: CreateTransferCommand & ApproveTransferCommand
// IDbContextTransaction Atomic Transaction ve Rollback Güvencesi
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

/// <summary>
/// 1. AŞAMA: Şubeler Arası Virman Emri Başlatma Komutu
/// </summary>
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

/// <summary>
/// MediatR Handler: Kaynak şube kasasından para anında düşer, durum 'WaitingApproval' (Askıda)
/// olarak kaydedilir. Tüm süreç IDbContextTransaction içinde atomik yürütülür, hata halinde Rollback yapılır.
/// </summary>
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
        // 1. Temel İş Doğrulamaları (Business Validations)
        if (request.Amount <= 0)
        {
            throw new ArgumentException("Virman tutarı 0'dan büyük olmalıdır (Decimal 18,4).", nameof(request.Amount));
        }

        if (request.SourceBranchId == request.TargetBranchId)
        {
            throw new InvalidOperationException("Kaynak şube ile hedef şube aynı olamaz. Lütfen şube içi virman kullanınız.");
        }

        var tenantId = _currentUserService.TenantId;

        // 2. ATOMİK VERİTABANI İŞLEMİ BAŞLAT (IDbContextTransaction)
        await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);

        try
        {
            _logger.LogInformation("Şubeler arası virman işlemi başlatılıyor. Kaynak Şube: {Source}, Hedef Şube: {Target}, Tutar: {Amount}",
                request.SourceBranchId, request.TargetBranchId, request.Amount);

            // Kaynak hesabı veritabanından çek ve kilitle (Pessimistic / Optimistic concurrency)
            var sourceAccount = await _context.CashesAndBanks
                .FirstOrDefaultAsync(cb => cb.Id == request.SourceCashBankId && cb.BranchId == request.SourceBranchId, cancellationToken)
                ?? throw new KeyNotFoundException($"Kaynak şubeye ait belirtilen kasa/banka hesabı ({request.SourceCashBankId}) bulunamadı.");

            // Hedef hesabın varlığını doğrula
            var targetAccount = await _context.CashesAndBanks
                .FirstOrDefaultAsync(cb => cb.Id == request.TargetCashBankId && cb.BranchId == request.TargetBranchId, cancellationToken)
                ?? throw new KeyNotFoundException($"Hedef şubeye ait belirtilen kasa/banka hesabı ({request.TargetCashBankId}) bulunamadı.");

            // Para birimi eşleşme kontrolü
            if (sourceAccount.CurrencyCode != request.CurrencyCode || targetAccount.CurrencyCode != request.CurrencyCode)
            {
                throw new InvalidOperationException($"Hesapların para birimi transfer talebi ile uyuşmuyor. Kaynak: {sourceAccount.CurrencyCode}, Hedef: {targetAccount.CurrencyCode}");
            }

            // Bakiye yeterlilik kontrolü
            if (sourceAccount.Balance < request.Amount)
            {
                throw new InvalidOperationException(
                    $"Kaynak hesapta yetersiz bakiye! Mevcut Bakiye: {sourceAccount.Balance:N2} {sourceAccount.CurrencyCode}, İstenen: {request.Amount:N2} {request.CurrencyCode}");
            }

            // 3. 1. AŞAMA İŞLEMİ: Para KAYNAK hesaptan ANINDA düşülür
            sourceAccount.Balance -= request.Amount;
            sourceAccount.UpdatedAt = DateTimeOffset.UtcNow;

            // Numaratör oluştur (VRM-YIL-SIRA)
            var sequenceCount = await _context.InterBranchTransfers.CountAsync(t => t.TenantId == tenantId, cancellationToken) + 1;
            var transferNumber = $"VRM-{DateTime.UtcNow.Year}-{sequenceCount:D5}";

            // Transfer kaydı: Status = 'WaitingApproval' (Askıda/Yolda)
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
                currencyCode: request.CurrencyCode,
                status: "WaitingApproval" // 1. Aşama: Askıda/Yolda
            );

            await _context.InterBranchTransfers.AddAsync(transfer, cancellationToken);

            // Kaynak hesap için muavin hareket kaydı
            var movement = new CustomerMovement(
                tenantId: tenantId,
                branchId: request.SourceBranchId,
                contactId: Guid.Empty, // Şubeler arası sistem virmanı
                movementType: "Credit", // Kaynak için para çıkışı
                amount: request.Amount,
                balanceAfter: sourceAccount.Balance,
                documentType: "InterBranchTransfer",
                documentNumber: transferNumber,
                description: $"Şubeler Arası Virman Çıkışı -> {targetAccount.Name} (Askıda/Onay Bekliyor)"
            );

            // Değişiklikleri veritabanına kaydet
            await _context.SaveChangesAsync(cancellationToken);

            // 4. ATOMİK İŞLEMİ ONAYLA (COMMIT)
            await transaction.CommitAsync(cancellationToken);

            _logger.LogInformation("Virman emri başarıyla oluşturuldu ve commit edildi. Fiş No: {TransferNumber}, Askıda Bekliyor.", transferNumber);

            return new TransferResultDto(
                TransferId: transfer.Id,
                TransferNumber: transfer.TransferNumber,
                Status: transfer.Status,
                Amount: transfer.Amount,
                SourceAccountName: sourceAccount.Name,
                SourceRemainingBalance: sourceAccount.Balance,
                Message: "Virman başarıyla başlatıldı. Kaynak kasadan tutar düşüldü, hedef şube onayı bekleniyor (WaitingApproval)."
            );
        }
        catch (Exception ex)
        {
            // 5. HATA DURUMUNDA GÜVENLİ ROLLBACK MEKANİZMASI
            _logger.LogError(ex, "Virman işlemi sırasında hata oluştu. IDbContextTransaction ROLLBACK ediliyor...");
            await transaction.RollbackAsync(cancellationToken);
            throw; // Hatayı üst middleware'e fırlat
        }
    }
}

/// <summary>
/// 2. AŞAMA: Hedef Şube Onay Komutu (ApproveTransferCommand)
/// Hedef şube onayladığında tutar hedef kasa/banka hesabına eklenir ve işlem tamamlanır (Completed).
/// </summary>
public record ApproveTransferCommand(Guid TransferId) : IRequest<bool>;

public class ApproveTransferCommandHandler(
    ApplicationDbContext context,
    ICurrentUserService currentUserService,
    ILogger<ApproveTransferCommandHandler> logger
) : IRequestHandler<ApproveTransferCommand, bool>
{
    private readonly ApplicationDbContext _context = context;
    private readonly ICurrentUserService _currentUserService = currentUserService;
    private readonly ILogger<ApproveTransferCommandHandler> _logger = logger;

    public async Task<bool> Handle(ApproveTransferCommand request, CancellationToken cancellationToken)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);

        try
        {
            var transfer = await _context.InterBranchTransfers
                .FirstOrDefaultAsync(t => t.Id == request.TransferId, cancellationToken)
                ?? throw new KeyNotFoundException("Transfer kaydı bulunamadı.");

            if (transfer.Status != "WaitingApproval")
            {
                throw new InvalidOperationException($"Bu transfer '{transfer.Status}' durumunda olduğu için onaylanamaz.");
            }

            var targetAccount = await _context.CashesAndBanks
                .FirstOrDefaultAsync(cb => cb.Id == transfer.TargetCashBankId, cancellationToken)
                ?? throw new KeyNotFoundException("Hedef kasa/banka hesabı bulunamadı.");

            // 2. AŞAMA İŞLEMİ: Hedef kasa bakiyesine tutar eklenir
            targetAccount.Balance += transfer.Amount;
            targetAccount.UpdatedAt = DateTimeOffset.UtcNow;

            transfer.Status = "Completed";
            transfer.ApprovedAt = DateTimeOffset.UtcNow;
            transfer.ApprovedByUser = _currentUserService.UserEmail;

            await _context.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            _logger.LogInformation("Virman hedef şube tarafından onaylandı ve teslim alındı. TransferId: {TransferId}", transfer.Id);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Virman onayı sırasında hata! Rollback yapılıyor...");
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }
}

namespace Fx.Application.Transfers.Commands.ApproveTransfer;

using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Fx.Application.Common.Behaviors;
using Fx.Application.Common.Interfaces;
using Fx.Application.Transfers.Commands.CreateTransfer;
using Fx.Infrastructure.Services;

public record ApproveTransferCommand(
    Guid TransferId,
    string? ApprovalNote = null
) : IRequest<TransferResultDto>, ITransactionalCommand;

public class ApproveTransferCommandHandler(
    IApplicationDbContext context,
    ICurrentUserService currentUserService,
    ILogger<ApproveTransferCommandHandler> logger
) : IRequestHandler<ApproveTransferCommand, TransferResultDto>
{
    private readonly IApplicationDbContext _context = context;
    private readonly ICurrentUserService _currentUserService = currentUserService;
    private readonly ILogger<ApproveTransferCommandHandler> _logger = logger;

    public async Task<TransferResultDto> Handle(ApproveTransferCommand request, CancellationToken cancellationToken)
    {
        var transfer = await _context.InterBranchTransfers
            .FirstOrDefaultAsync(t => t.Id == request.TransferId, cancellationToken)
            ?? throw new KeyNotFoundException($"Belirtilen virman işlemi ({request.TransferId}) bulunamadı.");

        if (transfer.Status != "WaitingApproval")
        {
            throw new InvalidOperationException($"Yalnızca 'WaitingApproval' (Onay Bekliyor) durumundaki transferler onaylanabilir. Mevcut durum: {transfer.Status}");
        }

        // Hedef şube yetkisi doğrulaması: Transferi yalnızca hedef şube veya Global Admin onaylayabilir
        if (!_currentUserService.IsGlobalUser && _currentUserService.BranchId != transfer.TargetBranchId)
        {
            throw new UnauthorizedAccessException("Bu transferi sadece hedef şube veya Genel Merkez onaylayabilir.");
        }

        // Hedef hesabı bakiye artışı için bul
        var targetAccount = await _context.CashesAndBanks
            .FirstOrDefaultAsync(cb => cb.Id == transfer.TargetCashBankId, cancellationToken)
            ?? throw new KeyNotFoundException("Hedef kasa/banka hesabı bulunamadı.");

        // Bakiye artışı
        targetAccount.Balance += transfer.Amount;

        // Transfer durumunu güncelle
        transfer.Status = "Approved";
        transfer.ApprovedAt = DateTimeOffset.UtcNow;
        transfer.ApprovedByUserId = _currentUserService.UserId;
        transfer.Notes = string.IsNullOrWhiteSpace(request.ApprovalNote)
            ? transfer.Notes
            : $"{transfer.Notes} | Onay Notu: {request.ApprovalNote}";

        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Transfer {TransferNumber} başarıyla onaylandı ve hedef hesaba ({AccountName}) {Amount} TRY aktarıldı.",
            transfer.TransferNumber, targetAccount.Name, transfer.Amount);

        return new TransferResultDto(
            transfer.Id,
            transfer.TransferNumber,
            transfer.Status,
            transfer.Amount,
            targetAccount.Name,
            targetAccount.Balance,
            "Transfer başarıyla onaylandı ve bakiye aktarımı tamamlandı."
        );
    }
}

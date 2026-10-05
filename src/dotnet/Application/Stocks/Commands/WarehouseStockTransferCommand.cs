namespace Fx.Application.Stocks.Commands;

using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Fx.Application.Common.Behaviors;
using Fx.Application.Common.Interfaces;
using Fx.Domain.Entities;
using Fx.Infrastructure.Services;

public record WarehouseStockTransferCommand(
    Guid SourceWarehouseId,
    Guid TargetWarehouseId,
    Guid ProductId,
    decimal Quantity,
    decimal UnitPrice,
    string DocumentNumber,
    string? Notes = null
) : IRequest<StockTransferResultDto>, ITransactionalCommand;

public record StockTransferResultDto(
    Guid SourceWarehouseId,
    Guid TargetWarehouseId,
    Guid ProductId,
    decimal TransferredQuantity,
    decimal SourceRemainingQuantity,
    decimal TargetTotalQuantity,
    string Message
);

public class WarehouseStockTransferCommandValidator : AbstractValidator<WarehouseStockTransferCommand>
{
    public WarehouseStockTransferCommandValidator()
    {
        RuleFor(x => x.SourceWarehouseId).NotEmpty().WithMessage("Kaynak depo seçimi zorunludur.");
        RuleFor(x => x.TargetWarehouseId).NotEmpty().WithMessage("Hedef depo seçimi zorunludur.");
        RuleFor(x => x.ProductId).NotEmpty().WithMessage("Ürün seçimi zorunludur.");
        RuleFor(x => x.Quantity).GreaterThan(0).WithMessage("Transfer miktarı sıfırdan büyük pozitif bir sayı olmalıdır.");
        RuleFor(x => x).Must(x => x.SourceWarehouseId != x.TargetWarehouseId)
            .WithMessage("Kaynak depo ve hedef depo aynı olamaz.");
    }
}

public class WarehouseStockTransferCommandHandler(
    IApplicationDbContext context,
    ICurrentUserService currentUserService
) : IRequestHandler<WarehouseStockTransferCommand, StockTransferResultDto>
{
    private readonly IApplicationDbContext _context = context;
    private readonly ICurrentUserService _currentUserService = currentUserService;

    public async Task<StockTransferResultDto> Handle(WarehouseStockTransferCommand request, CancellationToken cancellationToken)
    {
        // 1. Kaynak depo stok kontrolü
        var sourceStock = await _context.ProductStocks
            .FirstOrDefaultAsync(ps => ps.BranchId == request.SourceWarehouseId && ps.ProductId == request.ProductId, cancellationToken)
            ?? throw new InvalidOperationException("Kaynak depoda bu ürüne ait stok kaydı bulunamadı.");

        if (sourceStock.Quantity < request.Quantity)
        {
            throw new InvalidOperationException(
                $"Kaynak depoda yetersiz stok! Mevcut Stok: {sourceStock.Quantity:N2}, Transfer Edilmek İstenen: {request.Quantity:N2}. Çıkış miktarı mevcut stoğu aşamaz."
            );
        }

        // 2. Hedef depo stok kaydı bul veya oluştur
        var targetStock = await _context.ProductStocks
            .FirstOrDefaultAsync(ps => ps.BranchId == request.TargetWarehouseId && ps.ProductId == request.ProductId, cancellationToken);

        if (targetStock == null)
        {
            targetStock = new ProductStock(
                tenantId: _currentUserService.TenantId,
                branchId: request.TargetWarehouseId,
                productId: request.ProductId,
                quantity: 0
            );
            _context.ProductStocks.Add(targetStock);
        }

        // 3. Atomik stok düşümü ve artırımı (asla sessizce sıfıra sabitleme yapılmaz)
        sourceStock.Quantity -= request.Quantity;
        targetStock.Quantity += request.Quantity;

        await _context.SaveChangesAsync(cancellationToken);

        return new StockTransferResultDto(
            request.SourceWarehouseId,
            request.TargetWarehouseId,
            request.ProductId,
            request.Quantity,
            sourceStock.Quantity,
            targetStock.Quantity,
            $"{request.Quantity:N2} miktarındaki ürün başarıyla transfer edildi."
        );
    }
}

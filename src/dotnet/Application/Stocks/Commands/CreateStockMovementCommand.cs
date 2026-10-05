namespace Fx.Application.Stocks.Commands;

using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Fx.Application.Common.Behaviors;
using Fx.Application.Common.Interfaces;
using Fx.Domain.Entities;
using Fx.Infrastructure.Services;

public record CreateStockMovementCommand(
    Guid WarehouseId,
    Guid ProductId,
    string MovementType, // IN, OUT
    decimal Quantity,
    decimal UnitPrice,
    string DocumentNumber,
    string? Notes = null
) : IRequest<StockMovementResultDto>, ITransactionalCommand;

public record StockMovementResultDto(
    Guid WarehouseId,
    Guid ProductId,
    string MovementType,
    decimal Quantity,
    decimal RemainingStockQuantity,
    string Message
);

public class CreateStockMovementCommandValidator : AbstractValidator<CreateStockMovementCommand>
{
    public CreateStockMovementCommandValidator()
    {
        RuleFor(x => x.WarehouseId).NotEmpty().WithMessage("Depo seçimi zorunludur.");
        RuleFor(x => x.ProductId).NotEmpty().WithMessage("Ürün seçimi zorunludur.");
        RuleFor(x => x.Quantity).GreaterThan(0).WithMessage("Stok hareket miktarı sıfırdan büyük pozitif bir sayı olmalıdır.");
        RuleFor(x => x.MovementType).Must(t => t == "IN" || t == "OUT")
            .WithMessage("İşlem türü 'IN' (Giriş) veya 'OUT' (Çıkış) olmalıdır.");
    }
}

public class CreateStockMovementCommandHandler(
    IApplicationDbContext context,
    ICurrentUserService currentUserService
) : IRequestHandler<CreateStockMovementCommand, StockMovementResultDto>
{
    private readonly IApplicationDbContext _context = context;
    private readonly ICurrentUserService _currentUserService = currentUserService;

    public async Task<StockMovementResultDto> Handle(CreateStockMovementCommand request, CancellationToken cancellationToken)
    {
        var stock = await _context.ProductStocks
            .FirstOrDefaultAsync(ps => ps.BranchId == request.WarehouseId && ps.ProductId == request.ProductId, cancellationToken);

        var currentQty = stock?.Quantity ?? 0;

        // Çıkış durumunda yetersiz stok kontrolü: Reddet, sıfıra sabitleme yapma!
        if (request.MovementType == "OUT")
        {
            if (stock == null || currentQty < request.Quantity)
            {
                throw new InvalidOperationException(
                    $"Yetersiz stok! Mevcut stok: {currentQty:N2}, çıkış yapılmak istenen: {request.Quantity:N2}. Çıkış miktarı mevcut stoğu aşamaz."
                );
            }

            stock.Quantity -= request.Quantity;
        }
        else // IN
        {
            if (stock == null)
            {
                stock = new ProductStock(
                    tenantId: _currentUserService.TenantId,
                    branchId: request.WarehouseId,
                    productId: request.ProductId,
                    quantity: 0
                );
                _context.ProductStocks.Add(stock);
            }

            stock.Quantity += request.Quantity;
        }

        await _context.SaveChangesAsync(cancellationToken);

        return new StockMovementResultDto(
            request.WarehouseId,
            request.ProductId,
            request.MovementType,
            request.Quantity,
            stock.Quantity,
            $"Stok hareketi başarıyla işlendi. Güncel stok: {stock.Quantity:N2}"
        );
    }
}

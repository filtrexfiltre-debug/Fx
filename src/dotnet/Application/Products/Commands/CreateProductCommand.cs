namespace Fx.Application.Products.Commands;

using FluentValidation;
using MediatR;
using Fx.Application.Common.Behaviors;
using Fx.Application.Common.Interfaces;
using Fx.Domain.Entities;
using Fx.Infrastructure.Services;

public record CreateProductCommand(
    string Code,
    string Name,
    string Unit = "Adet",
    decimal VatRate = 0.2000m,
    decimal PurchasePrice = 0.0000m,
    decimal SalePrice = 0.0000m,
    string? Barcode = null,
    decimal InitialStockQuantity = 0.0000m
) : IRequest<ProductDto>, ITransactionalCommand;

public record ProductDto(
    Guid Id,
    string Code,
    string Name,
    string Unit,
    decimal VatRate,
    decimal PurchasePrice,
    decimal SalePrice,
    string? Barcode,
    decimal TotalStockQuantity
);

public class CreateProductCommandValidator : AbstractValidator<CreateProductCommand>
{
    public CreateProductCommandValidator()
    {
        RuleFor(x => x.Code).NotEmpty().WithMessage("Ürün/Stok kodu zorunludur.").MaximumLength(50);
        RuleFor(x => x.Name).NotEmpty().WithMessage("Ürün adı zorunludur.").MaximumLength(200);
        RuleFor(x => x.PurchasePrice).GreaterThanOrEqualTo(0).WithMessage("Alış fiyatı negatif olamaz.");
        RuleFor(x => x.SalePrice).GreaterThanOrEqualTo(0).WithMessage("Satış fiyatı negatif olamaz.");
    }
}

public class CreateProductCommandHandler(
    IApplicationDbContext context,
    ICurrentUserService currentUserService
) : IRequestHandler<CreateProductCommand, ProductDto>
{
    private readonly IApplicationDbContext _context = context;
    private readonly ICurrentUserService _currentUserService = currentUserService;

    public async Task<ProductDto> Handle(CreateProductCommand request, CancellationToken cancellationToken)
    {
        var product = new Product(
            tenantId: _currentUserService.TenantId,
            code: request.Code,
            name: request.Name,
            unit: request.Unit,
            vatRate: request.VatRate,
            purchasePrice: request.PurchasePrice,
            salePrice: request.SalePrice,
            barcode: request.Barcode
        );

        _context.Products.Add(product);

        if (request.InitialStockQuantity > 0)
        {
            var initialStock = new ProductStock(
                tenantId: _currentUserService.TenantId,
                branchId: _currentUserService.BranchId,
                productId: product.Id,
                quantity: request.InitialStockQuantity
            );
            _context.ProductStocks.Add(initialStock);
        }

        await _context.SaveChangesAsync(cancellationToken);

        return new ProductDto(
            product.Id,
            product.Code,
            product.Name,
            product.Unit,
            product.VatRate,
            product.PurchasePrice,
            product.SalePrice,
            product.Barcode,
            request.InitialStockQuantity
        );
    }
}

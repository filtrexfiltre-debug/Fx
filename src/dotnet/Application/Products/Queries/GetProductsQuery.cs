namespace Fx.Application.Products.Queries;

using MediatR;
using Microsoft.EntityFrameworkCore;
using Fx.Application.Common.Interfaces;
using Fx.Application.Contacts.Queries;
using Fx.Application.Products.Commands;

public record GetProductsQuery(
    string? SearchTerm = null,
    int PageNumber = 1,
    int PageSize = 25
) : IRequest<PaginatedList<ProductDto>>;

public class GetProductsQueryHandler(
    IApplicationDbContext context
) : IRequestHandler<GetProductsQuery, PaginatedList<ProductDto>>
{
    private readonly IApplicationDbContext _context = context;

    public async Task<PaginatedList<ProductDto>> Handle(GetProductsQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Products
            .Include(p => p.Stocks)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var search = request.SearchTerm.Trim().ToLower();
            query = query.Where(p =>
                p.Code.ToLower().Contains(search) ||
                p.Name.ToLower().Contains(search) ||
                (p.Barcode != null && p.Barcode.Contains(search)));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderBy(p => p.Name)
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(p => new ProductDto(
                p.Id,
                p.Code,
                p.Name,
                p.Unit,
                p.VatRate,
                p.PurchasePrice,
                p.SalePrice,
                p.Barcode,
                p.Stocks.Sum(s => s.Quantity)
            ))
            .ToListAsync(cancellationToken);

        return new PaginatedList<ProductDto>(items, totalCount, request.PageNumber, request.PageSize);
    }
}

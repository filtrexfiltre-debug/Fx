namespace Fx.Application.Contacts.Queries;

using MediatR;
using Microsoft.EntityFrameworkCore;
using Fx.Application.Common.Interfaces;
using Fx.Application.Contacts.Commands;

public record GetContactsQuery(
    string? SearchTerm = null,
    int PageNumber = 1,
    int PageSize = 25
) : IRequest<PaginatedList<ContactDto>>;

public record PaginatedList<T>(IReadOnlyList<T> Items, int TotalCount, int PageNumber, int PageSize);

public class GetContactsQueryHandler(
    IApplicationDbContext context
) : IRequestHandler<GetContactsQuery, PaginatedList<ContactDto>>
{
    private readonly IApplicationDbContext _context = context;

    public async Task<PaginatedList<ContactDto>> Handle(GetContactsQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Contacts.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var search = request.SearchTerm.Trim().ToLower();
            query = query.Where(c =>
                c.FirstName.ToLower().Contains(search) ||
                c.LastName.ToLower().Contains(search) ||
                (c.CompanyName != null && c.CompanyName.ToLower().Contains(search)) ||
                c.PhoneNumber.Contains(search) ||
                (c.TaxId != null && c.TaxId.Contains(search)));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(c => c.CreatedAt)
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(c => new ContactDto(
                c.Id,
                c.FirstName,
                c.LastName,
                c.FullName,
                c.CompanyName,
                c.PhoneNumber,
                c.Email,
                c.TaxId,
                c.CurrentBalance,
                c.BranchId
            ))
            .ToListAsync(cancellationToken);

        return new PaginatedList<ContactDto>(items, totalCount, request.PageNumber, request.PageSize);
    }
}

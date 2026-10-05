namespace Fx.Application.Contacts.Commands;

using FluentValidation;
using MediatR;
using Fx.Application.Common.Behaviors;
using Fx.Application.Common.Interfaces;
using Fx.Domain.Entities;
using Fx.Infrastructure.Services;

public record CreateContactCommand(
    string FirstName,
    string LastName,
    string PhoneNumber,
    string? CompanyName = null,
    string? Email = null,
    string? TaxId = null,
    string? TaxOffice = null,
    bool IsCustomer = true,
    bool IsLead = false
) : IRequest<ContactDto>, ITransactionalCommand;

public record ContactDto(
    Guid Id,
    string FirstName,
    string LastName,
    string FullName,
    string? CompanyName,
    string PhoneNumber,
    string? Email,
    string? TaxId,
    decimal CurrentBalance,
    Guid BranchId
);

public class CreateContactCommandValidator : AbstractValidator<CreateContactCommand>
{
    public CreateContactCommandValidator()
    {
        RuleFor(x => x.FirstName).NotEmpty().WithMessage("Ad alanı zorunludur.").MaximumLength(100);
        RuleFor(x => x.LastName).NotEmpty().WithMessage("Soyad alanı zorunludur.").MaximumLength(100);
        RuleFor(x => x.PhoneNumber).NotEmpty().WithMessage("Telefon numarası zorunludur.");
        RuleFor(x => x.TaxId).Matches(@"^\d{10,11}$").When(x => !string.IsNullOrEmpty(x.TaxId)).WithMessage("Vergi/TC kimlik no 10 veya 11 haneli olmalıdır.");
    }
}

public class CreateContactCommandHandler(
    IApplicationDbContext context,
    ICurrentUserService currentUserService
) : IRequestHandler<CreateContactCommand, ContactDto>
{
    private readonly IApplicationDbContext _context = context;
    private readonly ICurrentUserService _currentUserService = currentUserService;

    public async Task<ContactDto> Handle(CreateContactCommand request, CancellationToken cancellationToken)
    {
        var contact = new Contact(
            tenantId: _currentUserService.TenantId,
            branchId: _currentUserService.BranchId,
            firstName: request.FirstName,
            lastName: request.LastName,
            phoneNumber: request.PhoneNumber,
            companyName: request.CompanyName,
            email: request.Email,
            taxId: request.TaxId,
            taxOffice: request.TaxOffice,
            isLead: request.IsLead,
            isCustomer: request.IsCustomer
        );

        _context.Contacts.Add(contact);
        await _context.SaveChangesAsync(cancellationToken);

        return new ContactDto(
            contact.Id,
            contact.FirstName,
            contact.LastName,
            contact.FullName,
            contact.CompanyName,
            contact.PhoneNumber,
            contact.Email,
            contact.TaxId,
            contact.CurrentBalance,
            contact.BranchId
        );
    }
}

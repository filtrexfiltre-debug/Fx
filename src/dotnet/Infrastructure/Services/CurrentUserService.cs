namespace Fx.Infrastructure.Services;

using System.Security.Claims;
using Microsoft.AspNetCore.Http;

public class CurrentUserService(IHttpContextAccessor httpContextAccessor) : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor = httpContextAccessor;

    public Guid TenantId
    {
        get
        {
            var header = _httpContextAccessor.HttpContext?.Request.Headers["X-Tenant-Id"].FirstOrDefault();
            if (Guid.TryParse(header, out var tenantId)) return tenantId;

            var claim = _httpContextAccessor.HttpContext?.User.FindFirst("tenant_id")?.Value;
            if (Guid.TryParse(claim, out var claimTenantId)) return claimTenantId;

            // Varsayılan Enterprise Tenant UUID
            return Guid.Parse("t1111111-1111-1111-1111-111111111111");
        }
    }

    public Guid BranchId
    {
        get
        {
            // 1. Önce aktif seçilen şube HTTP Header'ına bak ('X-Selected-Branch-Id')
            var header = _httpContextAccessor.HttpContext?.Request.Headers["X-Selected-Branch-Id"].FirstOrDefault();
            if (Guid.TryParse(header, out var branchId)) return branchId;

            // 2. JWT claim'e bak
            var claim = _httpContextAccessor.HttpContext?.User.FindFirst("branch_id")?.Value;
            if (Guid.TryParse(claim, out var claimBranchId)) return claimBranchId;

            // 3. Varsayılan Merkez Şube UUID
            return Guid.Parse("b1111111-1111-1111-1111-111111111111");
        }
    }

    public string UserId => _httpContextAccessor.HttpContext?.User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "system";

    public string UserEmail => _httpContextAccessor.HttpContext?.User.FindFirst(ClaimTypes.Email)?.Value ?? "system@enterprise.com";

    public bool IsGlobalUser
    {
        get
        {
            var role = _httpContextAccessor.HttpContext?.User.FindFirst(ClaimTypes.Role)?.Value;
            if (role is "Patron" or "SuperAdmin" or "GenelMerkez") return true;

            var header = _httpContextAccessor.HttpContext?.Request.Headers["X-Is-Global-User"].FirstOrDefault();
            return header == "true";
        }
    }
}

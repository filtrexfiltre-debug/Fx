namespace Fx.WebApi.Middlewares;

public class BranchTenantMiddleware(RequestDelegate next, ILogger<BranchTenantMiddleware> logger)
{
    private readonly RequestDelegate _next = next;
    private readonly ILogger<BranchTenantMiddleware> _logger = logger;

    public async Task InvokeAsync(HttpContext context)
    {
        // Gelen istekteki 'X-Selected-Branch-Id' ve 'X-Tenant-Id' başlıklarını kontrol et ve logla
        var branchHeader = context.Request.Headers["X-Selected-Branch-Id"].FirstOrDefault();
        var tenantHeader = context.Request.Headers["X-Tenant-Id"].FirstOrDefault();

        if (!string.IsNullOrWhiteSpace(branchHeader))
        {
            context.Items["CurrentBranchId"] = branchHeader;
        }

        if (!string.IsNullOrWhiteSpace(tenantHeader))
        {
            context.Items["CurrentTenantId"] = tenantHeader;
        }

        await _next(context);
    }
}

namespace Fx.WebApi.Endpoints;

using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth").WithTags("Authentication");

        group.MapPost("/login", (LoginRequest request, IConfiguration config) =>
        {
            var email = request.Email.Trim().ToLowerInvariant();

            // Demo / Dev kullanıcı kontrolü
            if (request.Password != "123456" && request.Password != "admin123")
            {
                return Results.Unauthorized();
            }

            var role = email.Contains("patron") ? "Patron" : "Şube Yöneticisi";
            var branchId = email.Contains("kadikoy")
                ? "b2222222-2222-2222-2222-222222222222"
                : "b1111111-1111-1111-1111-111111111111";

            var jwtKey = config["Jwt:Secret"] ?? "fx-enterprise-default-development-secret-key-32chars!";
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes(jwtKey);

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(
                [
                    new Claim(ClaimTypes.NameIdentifier, email),
                    new Claim(ClaimTypes.Email, email),
                    new Claim(ClaimTypes.Role, role),
                    new Claim("tenant_id", "t1111111-1111-1111-1111-111111111111"),
                    new Claim("branch_id", branchId)
                ]),
                Expires = DateTime.UtcNow.AddHours(8),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            var tokenString = tokenHandler.WriteToken(token);

            return Results.Ok(new
            {
                token = tokenString,
                user = new
                {
                    email,
                    name = email.Contains("patron") ? "Ahmet Yılmaz (Yönetici)" : "Şube Sorumlusu",
                    role,
                    branchId
                }
            });
        }).AllowAnonymous();

        return app;
    }
}

public record LoginRequest(string Email, string Password);

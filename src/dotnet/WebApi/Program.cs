// ============================================================================
// FX ENTERPRISE ERP - .NET 9 (C# 13) WEB API
// Temiz Mimari (Clean Architecture) + EF Core + MediatR + PostgreSQL
// ============================================================================

using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Fx.Application;
using Fx.Infrastructure;
using Fx.WebApi.Endpoints;
using Fx.WebApi.Middlewares;

var builder = WebApplication.CreateBuilder(args);

// 1. Clean Architecture Katman Servislerini Enjekte Et
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

// 2. JWT Kimlik Doğrulama Servisleri
var jwtSecret = builder.Configuration["Jwt:Secret"] ?? "fx-enterprise-default-development-secret-key-32chars!";
var key = Encoding.UTF8.GetBytes(jwtSecret);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = false,
        ValidateAudience = false,
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization();

// 3. CORS (Vite Frontend SPA Entegrasyonu İçin)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod()
              .WithExposedHeaders("X-Selected-Branch-Id", "X-Tenant-Id");
    });
});

// 4. OpenAPI / Swagger Dokümantasyonu
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "FX Enterprise ERP - .NET 9 Clean Architecture API",
        Version = "v1",
        Description = "Tek ana backend mimarisi (.NET 9 + MediatR CQRS + EF Core 9 + PostgreSQL multi-branch)."
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// 5. HTTP İstek Hattı (Pipeline) Yapılandırması
app.UseMiddleware<GlobalExceptionMiddleware>();
app.UseMiddleware<BranchTenantMiddleware>();

app.UseCors("AllowAll");

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "FX Enterprise ERP API v1");
        c.RoutePrefix = "swagger";
    });
}

app.UseAuthentication();
app.UseAuthorization();

// 6. Endpoint Route Eşlemeleri
app.MapGet("/api/health", () => Results.Ok(new
{
    status = "healthy",
    framework = ".NET 9 (C# 13)",
    architecture = "Clean Architecture (Domain, Application, Infrastructure, WebApi)",
    orm = "EF Core 9 (PostgreSQL)",
    mediator = "MediatR v12 (CQRS)",
    timestamp = DateTimeOffset.UtcNow
})).AllowAnonymous().WithTags("Health");

app.MapAuthEndpoints();
app.MapContactEndpoints();
app.MapProductEndpoints();
app.MapTransferEndpoints();

app.Run();

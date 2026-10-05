# FX ENTERPRISE ERP - RESMİ BACKEND MİMARİSİ

Bu doküman, FX Enterprise ERP sisteminin **tek ana backend teknolojisi** olarak kabul edilen ve uygulanan **.NET 9 + Temiz Mimari (Clean Architecture) + EF Core + MediatR** standardını belgeler.

---

## 🏛️ Mimari Katmanlar (Clean Architecture)

```
                            ┌────────────────────────────────┐
                            │      Fx.WebApi (Presentation)  │
                            │   - Minimal APIs & Endpoints   │
                            │   - Middlewares (Exception, BR)│
                            │   - JWT Bearer Authentication  │
                            └───────────────┬────────────────┘
                                            │
                                            ▼
                            ┌────────────────────────────────┐
                            │   Fx.Application (CQRS)        │
                            │   - MediatR Handlers & Commands│
                            │   - MediatR Pipeline Behaviors │
                            │   - FluentValidation Rules     │
                            │   - Application Interfaces     │
                            └───────┬────────────────┬───────┘
                                    │                │
                    ┌───────────────┘                └───────────────┐
                    ▼                                                ▼
┌────────────────────────────────┐                  ┌────────────────────────────────┐
│      Fx.Domain (Core)          │                  │  Fx.Infrastructure (External)  │
│   - BaseEntity                 │                  │   - ApplicationDbContext       │
│   - ITenantBranchEntity        │                  │   - Global Query Filter        │
│   - ITenantOnlyEntity          │                  │   - PostgreSQL / Npgsql        │
│   - Aggregate Roots & Entities │                  │   - CurrentUserService        │
└────────────────────────────────┘                  └────────────────────────────────┘
```

### 1. `Fx.Domain` (Çekirdek Varlıklar)
- Dış dünyaya hiçbir bağımlılığı yoktur. Saf C# 13 sınıfları ve Primary Constructor'lar içerir.
- **İzolasyon Sözleşmeleri:**
  - `ITenantBranchEntity`: `TenantId` ve `BranchId` zorunluluğu (Cari, Kasa, Fatura, Hareketler).
  - `ITenantOnlyEntity`: Yalnızca `TenantId` zorunluluğu (Ortak Ürün Kartları).
- **Hassasiyet Standardı:** Kuruş ve küsurat kaybını önlemek için parasal alanlar `decimal` tipindedir.

### 2. `Fx.Application` (İş Kuralları & CQRS)
- Tüm iş akışları **MediatR** CQRS (Command Query Responsibility Segregation) deseniyle yönetilir.
- **MediatR Pipeline Behaviors:**
  1. `LoggingBehavior`: Tüm isteklerin başlangıç/bitiş sürelerini ve parametrelerini loglar.
  2. `ValidationBehavior`: İstek işleyiciye (Handler) ulaşmadan önce FluentValidation kurallarını çalıştırır.
  3. `TransactionBehavior`: `ITransactionalCommand` arayüzünü uygulayan komutları `IDbContextTransaction` içinde atomik olarak yürütür (Hata anında otomatik Rollback).

### 3. `Fx.Infrastructure` (Altyapı & Veritabanı)
- **ORM:** Entity Framework Core 9 (EF Core).
- **Veritabanı Sağlayıcısı:** PostgreSQL (`Npgsql.EntityFrameworkCore.PostgreSQL`).
- **Güvenlik Duvarı (Global Query Filter):**
  - `ITenantBranchEntity` uygulayan varlıklarda EF Core düzeyinde otomatik şube ve kiracı filtresi uygulanır.
  - Normal şube kullanıcısı sadece kendi şubesini görebilir; 'Patron' veya 'Genel Merkez' yetkisindeki kullanıcılar konsolide veriyi sorgulayabilir.
- **Precision (18, 4):** Model oluşturulurken tüm decimal alanlar veritabanında `DECIMAL(18, 4)` olarak yapılandırılır.

### 4. `Fx.WebApi` (Sunum & HTTP Giriş Noktası)
- .NET 9 Minimal APIs ve modern endpoint grupları.
- **Özel Middleware'ler:**
  - `GlobalExceptionMiddleware`: FluentValidation, NotFound ve Authorization hatalarını standart JSON formatına dönüştürür.
  - `BranchTenantMiddleware`: Frontend'den gelen `X-Selected-Branch-Id` ve `X-Tenant-Id` HTTP başlıklarını iş parçacığı bağlamına bağlar.

---

## 🔌 Frontend (React & TypeScript) Entegrasyonu

Frontend SPA uygulaması, bu .NET 9 Web API'sine aşağıdaki standartlarla bağlanır:

1. **HTTP Başlıkları:**
   - `Authorization: Bearer <JWT_TOKEN>`
   - `X-Selected-Branch-Id: <UUID>` (Navbar'dan seçilen şube)
   - `X-Tenant-Id: <UUID>`
2. **Hata Yakalama (`src/lib/api-error.ts` & `src/lib/api-client.ts`):**
   - API'den dönen HTTP durum kodları ve JSON hata nesneleri `ApiError` sınıfı ile karşılanır.
   - `retryAsync` ile geçici ağ hatalarında katlanarak artan bekleme (exponential backoff) uygulanır.

# Değişiklik ve Revizyon Takip Günlüğü (Revisions Log)

Bu günlük, kullanıcının onayı ile yapılan her bir değişikliği modül bazında ve benzersiz bir sürüm/sıralama numarasıyla takip etmek amacıyla oluşturulmuştur.

---

## 📦 Modül 2: Stok & Depo Yönetimi (Ürünler)

### 🏷️ Revizyon 2-1 (17 Eylül 2026)
- **Açıklama:** Ürünler tablosunun üst filtreleme çubuğundaki ürün sayacı kaldırıldı ve ürün kodu kolonundaki kopyalama ikonu devre dışı bırakıldı.
- **Detaylar:**
  1. `src/components/stock/UrunlerTablosu.tsx` dosyasında bulunan `"Gösterilen: X / Y ürün"` etiket alanı tamamen kaldırıldı.
  2. `skuCode` sütun tanımındaki (Ürün Kodu) kopyalama butonu (`handleCopySku`) ve yanındaki kopyalama/başarı ikonları kaldırıldı; sade bir kod görünümü sağlandı.
- **Durum:** Tamamlandı (Kullanıcı Onaylı)

---

## 🛡️ Genel Kurallar
1. Kullanıcı onayı alınmadan **hiçbir yeni özellik, buton, menü veya kod ekleme/çıkarma işlemi yapılmayacaktır**.
2. Her yeni revizyon, ilgili modülün numarası altında ardışık olarak (örn. `2-2`, `3-1` vb.) bu günlüğe kaydedilecektir.

---

## 🏗️ ERP Hardening: Kimlik, Defter ve Denetim Temelleri

- **Şema (`schema.sql`):** `users`, `roles`, `permissions`, `user_roles`, `role_permissions`; append-only `financial_transactions` (düzeltme = `reversal_of` ters kaydı) ve `audit_logs`; UPDATE/DELETE/TRUNCATE engelleyen tetikleyiciler; RLS iskeleti (`app.tenant_id`).
- **Backend (`server.cjs`, `server/identity.cjs`, `server/audit.cjs`):** Giriş artık kullanıcı → rol → izin modelinden tenant/şube farkında claim üretir (`branchId = null` ⇒ global kullanıcı; UI'da `'all'`). `GET /api/audit-logs` `audit.read` iznini ister. Veri erişimi `identity.cjs` içindeki "DATA ACCESS" bölümünde toplanmıştır; Postgres'e geçişte yalnızca orası değişir.
- **Frontend:** `User/Role/Permission/FinancialTransaction/AuditLog/CashAccount` tipleri `src/types/fx.ts`'te; `src/services/ledger.ts` ledger/audit yazımını (şimdilik localStorage, append-only) yapar. Yazılan akışlar: tahsilat/ödeme/masraf (+silme = ters kayıt), şubeler arası virman (başlat/onay/ret), kasa-banka CRUD, giriş/çıkış. `App.tsx` kimlik durumunu `useAuth` hook'undan alır; `vite.config.ts` geliştirme girişi `server/identity.cjs`'i paylaşır.
- **Sonraki adım:** `ledger.ts` ve `identity.cjs` veri erişimini Postgres'e bağlamak; çevrimdışı (mock) test kullanıcıları kaldırıldı, API/Vite dev sunucusu gereklidir.

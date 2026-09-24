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

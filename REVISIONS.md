# Değişiklik ve Revizyon Takip Günlüğü (Revisions Log)

Bu günlük, kullanıcının onayı ile yapılan her bir değişikliği modül bazında ve benzersiz bir sürüm/sıralama numarasıyla takip etmek amacıyla oluşturulmuştur.

---

## 🏛️ Mimari & Altyapı Standartları

### 🏷️ Revizyon 0-1 (4 Ekim 2026)
- **Açıklama:** Backend mimarisi tek bir ana teknolojiye ve endüstri standardına sabitlendi: **.NET 9 + Temiz Mimari (Clean Architecture) + EF Core + MediatR**.
- **Detaylar:**
  1. Çözüm yapısı `Fx.Domain`, `Fx.Application`, `Fx.Infrastructure` ve `Fx.WebApi` katmanları olarak net biçimde ayrıştırıldı (`Fx.Enterprise.sln`).
  2. Tüm iş akışları ve kullanım senaryoları MediatR CQRS (Command/Query/Handler) ve Pipeline Behavior (Logging, Validation, Atomic Transaction) mimarisine bağlandı.
  3. Veritabanı katmanı Entity Framework Core 9 ve PostgreSQL (Npgsql) ile çoklu şube / çoklu kiracı Global Query Filter ve zorunlu `DECIMAL(18, 4)` hassasiyet standardıyla sabitlendi.
  4. Frontend SPA istemcisi (`api-client.ts`, `api-error.ts`, `api.ts`) bu .NET 9 mimarisine uygun `X-Selected-Branch-Id`, `X-Tenant-Id` ve `ApiError` standartlarıyla senkronize edildi.
- **Durum:** Tamamlandı (Kullanıcı Onaylı)

---

## 🌍 Modül 1: Cari & Coğrafi Veri Yönetimi

### 🏷️ Revizyon 1-1 (4 Ekim 2026)
- **Açıklama:** Coğrafi veri istatistikleri ve mahalle seed betiğindeki mükerrerlik/tutarsızlık sorunları giderildi.
- **Detaylar:**
  1. `geoService.ts` içerisindeki `getDatabaseStats` fonksiyonu doğrudan JSON anahtarlarını saymak yerine resmi 81 il ve 973 kanonik ilçeyi (`TURKEY_DISTRICTS`) referans alacak şekilde güncellendi.
  2. Kırıkkale ilindeki "Bahşılı" ilçesine ait mükerrer "Bahşili" alias anahtarı JSON veri setinden temizlendi; istatistiklerde ilçe sayısının 974 yerine resmi 973, mahalle sayısının 32.367 yerine kanonik 32.362 olarak tutarlı hesaplanması sağlandı. `targetCount` değeri 32.362 olarak eşitlendi.
  3. `getNeighborhoods` fonksiyonuna Türkçe harf toleransı eklenerek kullanıcının "Bahşili" veya "Bahşılı" aramalarının her ikisinde de doğru mahalle havuzuna ulaşması korundu.
  4. `schema.sql` dosyasındaki `neighborhoods` tablosuna `CONSTRAINT uq_neighborhood_district_name UNIQUE(district_id, name)` kısıtı mevcuttur.
  5. `src/db/seed_all_neighborhoods.sql` betiğindeki tüm `INSERT` bloklarına `ON CONFLICT (district_id, name) DO NOTHING;` tümcesi eklendi.
- **Durum:** Tamamlandı (Kullanıcı Onaylı)

### 🏷️ Revizyon 1-2 (5 Ekim 2026)
- **Açıklama:** Yerel depolama (localStorage) için kurumsal Şema, Çoklu Kiracı (Tenant) İzolasyonu ve Kota/Hata Yönetim Modülü (`StorageManager`) geliştirildi.
- **Detaylar:**
  1. **Şema Versiyonlama & Zarfing (StorageEnvelope):** `src/lib/storageManager.ts` modülü oluşturularak tüm localStorage okuma ve yazma işlemleri `StorageEnvelope` (`schemaVersion`, `tenantId`, `updatedAt`, `data`) ile sarmalandı; bozuk JSON kayıtlarının uygulamayı çökertmesi engellendi.
  2. **Çoklu Kiracı (Multi-Tenant) İzolasyonu:** Depolama anahtarları tenant bazında otomasyona bağlandı (`fx_${tenantId}_${key}`); aktif kiracı değiştiğinde verilerin birbirine karışması ve veri sızıntısı riski ortadan kaldırıldı.
  3. **Hata & Kota Toleransı (QuotaExceededError & Memory Fallback):** Gizli sekme modu, engelleyici güvenlik politikaları veya tarayıcı disk kotası dolması durumunda `QuotaExceededError` yakalanarak eski veriler otomatik temizlendi ve bellek içi (in-memory cache) havuz devreye alınarak uygulamanın kesintisiz çalışması sağlandı.
  4. **API ve Servis Entegrasyonu:** `api.ts` ve `tradeService.ts` servislerindeki tüm ham `localStorage.getItem` ve `localStorage.setItem` çağrıları, `storageManager` ile güvenli me atomik transaction snapshot/rollback standartlarına bağlandı.
- **Durum:** Tamamlandı (Kullanıcı Onaylı)

### 🏷️ Revizyon 1-3 (5 Ekim 2026)
- **Açıklama:** SMS, WhatsApp ve GİB E-Fatura/E-İrsaliye entegrasyon durumu şeffaflaştırıldı; canlı API/Gateway bağlantısı bulunmayan modüllerde gerçeği yansıtan "Simülasyon / Test Modu" göstergeleri uygulandı.
- **Detaylar:**
  1. **GİB E-Fatura & E-İrsaliye Şeffaflığı:** `EfaturaGibManagement.tsx` üzerindeki "GİB Portalı Çevrimiçi (200 OK)" ibaresi "GİB Entegratör Simülatörü (UBL-TR 1.2 Test Modu)" olarak güncellendi ve Özel Entegratör API anahtarının bağlı olmadığını belirten bilgilendirme bandı eklendi. `NewGibDispatchModal.tsx` ve `GibInvoiceViewerModal.tsx` içindeki "GİB İletildi" statü metinleri UBL-TR 1.2 test şema üretimi olarak netleştirildi.
  2. **SMS & WhatsApp Bildirim Şeffaflığı:** Dış SMS/WhatsApp API Gateway entegrasyonu bulunmayan otomatik sistem bildirimleri `TASLAK_SIMULASYON` (Gateway Bağlı Değil) olarak etiketlendi.
  3. **İstemci Tarafı WhatsApp Doğrudan İletim:** `ServisFisDetayModal.tsx` üzerindeki "WhatsApp ile Gönder" seçeneğinin tarayıcı üzerinden doğrudan resmi WhatsApp Web/App (`wa.me`) ile çalıştığı bilgisi kullanıcıya net bir ipucu bandıyla sunuldu.
- **Durum:** Tamamlandı (Kullanıcı Onaylı)

---

## 📦 Modül 2: Stok & Depo Yönetimi (Ürünler)

### 🏷️ Revizyon 2-1 (17 Eylül 2026)
- **Açıklama:** Ürünler tablosunun üst filtreleme çubuğundaki ürün sayacı kaldırıldı ve ürün kodu kolonundaki kopyalama ikonu devre dışı bırakıldı.
- **Detaylar:**
  1. `src/components/stock/UrunlerTablosu.tsx` dosyasında bulunan `"Gösterilen: X / Y ürün"` etiket alanı tamamen kaldırıldı.
  2. `skuCode` sütun tanımındaki (Ürün Kodu) kopyalama butonu (`handleCopySku`) ve yanındaki kopyalama/başarı ikonları kaldırıldı; sade bir kod görünümü sağlandı.
- **Durum:** Tamamlandı (Kullanıcı Onaylı)

### 🏷️ Revizyon 2-2 (3 Ekim 2026)
- **Açıklama:** Ürünler ve Depo Stok Dağılımı tablolarında sabit kolonlar kaldırılarak ilk sütuna sabitli çoklu seçim checkbox yapısı eklendi.
- **Detaylar:**
  1. `UrunlerTablosu.tsx` dosyasında `skuCode` sütunundaki `pinned: 'left'` sabitlemesi kaldırıldı.
  2. AG Grid modern API standartlarına uygun `rowSelection: { mode: 'multiRow', checkboxes: true, headerCheckbox: true, selectionColumnDef: { pinned: 'left', width: 48 } }` yapısı entegre edildi.
  3. `DepoStokDagitimiTablosu.tsx` tablosuna da aynı çoklu seçim ve sabit checkbox yapısı uygulandı.
- **Durum:** Tamamlandı (Kullanıcı Onaylı)

### 🏷️ Revizyon 2-3 (4 Ekim 2026)
- **Açıklama:** Stok hareketleri ve depolar arası transfer servislerindeki negatif miktar açığı ve yetersiz stok çıkışında stoğu sıfıra sabitleme (clamp) hatası düzeltildi.
- **Detaylar:**
  1. `api.ts` içerisindeki `transferBetweenWarehouses` metodunda miktar için kesin pozitiflik kontrolü (`numericQuantity <= 0` engeli) eklendi; negatif miktarlı transferlerin kaynak stoğu artırıp hedefi azaltması ve negatif hareket kaydı açması engellendi.
  2. `createStockMovement` metodunda miktar pozitifliği zorunlu kılındı.
  3. `createStockMovement` içerisinde çıkış hareketlerinde (`OUT` ve `TRANSFER_OUT`) çıkış miktarının mevcut depo stoğunu aşması durumunda stoğu sessizce sıfıra sabitleme (`Math.max(0, ...)`) davranışı kaldırıldı; işlem hata fırlatılarak reddedildi ve hareket kaydı ile depo envanter miktarı arasındaki tutarsızlık giderildi.
- **Durum:** Tamamlandı (Kullanıcı Onaylı)

### 🏷️ Revizyon 2-4 (5 Ekim 2026)
- **Açıklama:** Stok alan adı, fiyat ve KDV uyuşmazlıkları giderildi; modüller arası (Stok, Servis, Ticaret) tam veri ve hesaplama uyumu sağlandı.
- **Detaylar:**
  1. `src/types/fx.ts` (`Product`) ve `src/types/index.ts` (`Stok`) arayüzleri karşılıklı takma adlar (`skuCode`/`code`, `categoryGroup`/`category`, `brandName`/`brand`, `unitType`/`unit`, `purchasePrice`/`buyPrice`, `salePriceExclVat`/`sellPrice`/`sellingPrice`/`salePrice`, `vatRatePercent`/`vatRate`, `openingStockQuantity`/`currentStock`/`currentQuantity`) ile çift yönlü uyumlu hale getirildi.
  2. `src/components/Stok/UrunlerTablosu.tsx` dosyasında %0 KDV muafiyetli ürünlerin fiyat değişiminde varsayılan %20 KDV'ye dönmesine yol açan hesaplama hatası giderildi.
  3. `api.ts` (`createProduct`, `updateProduct`, `saveServiceTransaction`) ve `mockData.ts` (`INITIAL_PRODUCTS`) üzerinde tüm fiyat, KDV ve stok alanları tam ve tutarlı şekilde senkronize edildi.
  4. `ServisManagement.tsx` (`mapProductToStok`) ve `ServisFisDetayModal.tsx` içerisinde yedek parça/filtre eklemedeki 500 TL sabit fiyat ve %20 sabit KDV zorlaması kaldırılarak ürünün gerçek satış fiyatı ve tanımlı KDV oranı üzerinden hesaplama yapılması sağlandı.
  5. `NewInvoiceModal.tsx` ve `NewOfferModal.tsx` modallarında alış/satış yönüne göre doğru fiyat alanının seçilmesi ve %0 KDV oranlarının korunması garanti altına alındı.
- **Durum:** Tamamlandı (Kullanıcı Onaylı)

---

## 📦 Modül 4: Ticaret (Satış & Alış Yönetimi)

### 🏷️ Revizyon 4-1 (4 Ekim 2026)
- **Açıklama:** Şube değişimi filtre kalıcılığı sorunu ve teklifin faturaya dönüştürülmesindeki vade hesaplama ile mükerrer dönüşüm açıkları düzeltildi.
- **Detaylar:**
  1. `AlisSatisManagement.tsx` bileşeninde `selectedBranchFilter`, hem `currentBranchId` prop'u hem de `fxApi.branchContext` aboneliği üzerinden dinamik senkronize edildi; uygulama başlığından şube değiştirildiğinde liste ve modal pencerelerin önceki şubeyi kullanması engellendi.
  2. `NewOfferModal` ve `NewInvoiceModal` bileşenlerine şube anahtarı eklenerek modal açılışında seçili şube bilgilerinin tazelenmesi sağlandı.
  3. `tradeService.ts` içerisindeki `convertOfferToInvoice` metodunda fatura ödeme vadesinin (`dueDate`), teklifin geçerlilik/opsiyon tarihi (`validUntilDate`) ile karıştırılması düzeltildi; fatura düzenleme tarihi üzerinden cari veya teklif ödeme koşullarındaki vade gününe göre doğru vade tarihi atandı.
  4. Teklifin durumu zaten `CONVERTED` ise veya dönüştürülmüş fatura kimliği mevcutsa dönüşüm işlemi engellenerek mükerrer fatura, mükerrer borç/alacak ve mükerrer stok hareket kaydı oluşumu önlendi.
- **Durum:** Tamamlandı (Kullanıcı Onaylı)

---

## 🛠️ Modül 5: Teknik Servis & Bakım Yönetimi

### 🏷️ Revizyon 5-1 (5 Ekim 2026)
- **Açıklama:** Servis türlerinin enum ve serbest metin tutarsızlığı, Gantt ve tablolardaki kırılgan metin eşleme ve filtre eşleşmeme riskleri giderildi.
- **Detaylar:**
  1. `src/lib/serviceUtils.ts` modülü oluşturularak `ServisTipi` enum değerleri (`PERIYODIK_BAKIM`, `FILTRE_DEGISIMI`, `ARIZA_ONARIM`, `MONTAJ_KURULUM`, `KESIF_DURUM_TESPITI`), kanonik etiketleri (`SERVIS_TIPI_LABELS`), renk standartları (`SERVIS_TIPI_COLORS`), `normalizeServiceType`, `getServiceTypeLabel` ve güvenli filtre eşleştiricisi `isServiceTypeMatch` merkezi bir standarda bağlandı.
  2. `src/types/fx.ts` ve `src/types/index.ts` üzerinde `ServisTipi`, `ServisDurumu` ve `ServisOdemeTuru` tipleri senkronize edildi.
  3. `YeniServisArizaModal.tsx` içerisinde yeni cihaz ve fiş kayıtlarında `servisTipi` kanonik enum olarak, `servisTuru` ise standart Türkçe etiketiyle atanacak şekilde güncellendi.
  4. `MusteriBakimTakipInternal.tsx` (BakimGanttChart) ve `ServisManagement.tsx` bileşenlerindeki kırılgan `includes` kontrolleri kaldırılarak merkezi normalizasyon ve `isServiceTypeMatch` entegre edildi; filtre seçimlerindeki uyumsuzluklar giderildi.
  5. Yazdırma ve detay modallarında (`ServisFisDetayModal.tsx`, `ServisFisiYazdirModal.tsx`, `CihazTanimModal.tsx`) etiket gösterimleri ve rozetler kanonik servisle uyumlu hale getirildi.
- **Durum:** Tamamlandı (Kullanıcı Onaylı)

### 🏷️ Revizyon 5-2 (5 Ekim 2026)
- **Açıklama:** Gantt şemasındaki sabit referans tarihi esnekleştirildi; cihaz düzenleme/tanımlama modalındaki bakım ve montaj tarihlerinin yenilenmeme sorunu giderildi.
- **Detaylar:**
  1. `MusteriBakimTakipInternal.tsx` (BakimGanttChart) bileşenindeki sabit `2026-03-01` tarihi dinamik güncel tarihe (`new Date().toISOString().slice(0, 10)`) bağlandı; üst araç çubuğuna kullanıcının istediği referans tarihini seçip bakım simülasyonu yapabileceği ve dilediğinde "Bugün" butonuna tıklayabileceği interaktif referans tarih seçicisi eklendi.
  2. `ServisManagement.tsx` üzerinden `BakimGanttChart`'a geçilen sabit `todayDateStr="2026-03-01"` kaldırıldı.
  3. `CihazTanimModal.tsx` bileşenine `sonBakimTarihi` (Son Yapılan Bakım Tarihi) ve `gelecekBakimTarihi` (Gelecek Bakım Tarihi) için düzenlenebilir dinamik form alanları eklendi.
  4. Montaj tarihi, son bakım tarihi veya bakım periyodu (ay) değiştirildiğinde gelecek bakım tarihini otomatik hesaplayan ve kullanıcının isteğe bağlı manuel tarih girmesine ya da "Yeniden Hesapla" butonuna basarak güncellemesine olanak tanıyan senkronizasyon mekanizması kuruldu.
- **Durum:** Tamamlandı (Kullanıcı Onaylı)

### 🏷️ Revizyon 5-3 (5 Ekim 2026)
- **Açıklama:** Servis fişi, bildirim, cihaz ve cari güncellemelerinin atomik (tek işlem / hepsi ya da hiçbiri) yürütülmesi sağlandı; yeni servis kaydındaki id hatası giderildi ve cihaz bakım yenilemesi güçlendirildi.
- **Detaylar:**
  1. `YeniServisArizaModal.tsx` bileşeninde yeni servis oluşturulurken henüz kaydedilmemiş id'nin düzenleme kimliği (`editServisId`) olarak aktarılması ve `saveServiceTransaction` servisinde istisnaya yol açarak işlemi geri alması sorunu düzeltildi (`targetEditId` kontrolü).
  2. `api.ts` içerisindeki `saveServiceTransaction` metoduna toleranslı id yönetimi ve servis fişi ile cihazın cari/servis türü bilgilerini atomik bağlama yeteneği eklendi.
  3. `api.ts` üzerine `saveDeviceAtomic` metodu eklenerek cihaz tanımlama veya güncelleme esnasında bağlı açık servis fişlerinin (`RANDEVU_PLANLANDI`, `BEKLEMEDE`) ve müşteri iletişim bilgilerinin tam snapshot/rollback güvencesiyle atomik güncellenmesi sağlandı.
  4. `ServisManagement.tsx` içerisindeki `handleKaydetCihaz` metodu `saveDeviceAtomic` altyapısına bağlanarak cihaz, açık servis fişleri ve cari durumlarının tek seferde tutarlı güncellenmesi sağlandı.
  5. `CihazTanimModal.tsx` içerisinde modal açılışında otomatik hesaplama kilidi kaldırıldı; "Bugün Yapıldı & Yenile" butonu eklenerek son bakım tarihi ve periyot değiştiğinde gelecek bakım tarihinin anında yenilenmesi garanti altına alındı.
  6. `MusteriBakimTakipInternal.tsx` (BakimGanttChart) tablosu ve kartlarına doğrudan "Cihaz Kartı & Bakım Tarihlerini Düzenle" butonu eklenerek kullanıcının Gantt görünümünden ayrılmadan bakım periyodunu ve tarihlerini tazeleyebilmesi sağlandı.
- **Durum:** Tamamlandı (Kullanıcı Onaylı)

---

## 🛡️ Genel Kurallar
1. Kullanıcı onayı alınmadan **hiçbir yeni özellik, buton, menü veya kod ekleme/çıkarma işlemi yapılmayacaktır**.
2. Her yeni revizyon, ilgili modülün numarası altında ardışık olarak (örn. `2-2`, `3-1` vb.) bu günlüğe kaydedilecektir.

/**
 * FX Enterprise ERP - Kurumsal Yerel Depolama (localStorage) Şema, Tenant ve Hata Yönetim Modülü
 * 
 * Özellikler:
 * 1. Şema & Versiyonlama: Sürüm meta verisi (StorageEnvelope), otomatik veri şeması göçü (migration) ve bozuk veri koruması.
 * 2. Tenant İzolasyonu: Çoklu kiracı (multi-tenant) desteği, tenant bazlı anahtarlama (`fx_${tenantId}_${key}`) ve veri filtreleme/etiketleme.
 * 3. Hata & Kota Yönetimi: QuotaExceededError koruması, bellek içi (in-memory) yedek havuz, güvenli JSON serileştirme/ayrıştırma.
 */

import { CURRENT_TENANT } from '../data/mockData';

export const STORAGE_SCHEMA_VERSION = 'fx_v2_2026';

export interface StorageEnvelope<T> {
  schemaVersion: string;
  tenantId: string;
  updatedAt: string;
  data: T;
}

export interface StorageOptions {
  tenantId?: string;
  isGlobal?: boolean;
  skipEnvelope?: boolean;
}

class StorageManager {
  private activeTenantId: string = CURRENT_TENANT.id;
  private memoryCache: Map<string, string> = new Map();
  private isStorageAvailable: boolean = true;

  constructor() {
    this.checkStorageAvailability();
  }

  private checkStorageAvailability(): void {
    try {
      const testKey = '__fx_storage_test__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      this.isStorageAvailable = true;
    } catch {
      this.isStorageAvailable = false;
      console.warn('[StorageManager] Tarayıcı localStorage erişimine izin vermiyor veya kota dolu. Bellek içi (in-memory) depolama modu devrede.');
    }
  }

  public getTenantId(): string {
    return this.activeTenantId;
  }

  public setTenantId(tenantId: string): void {
    if (tenantId && tenantId.trim()) {
      this.activeTenantId = tenantId.trim();
    }
  }

  public getScopedKey(baseKey: string, tenantId?: string, isGlobal: boolean = false): string {
    if (isGlobal) {
      return baseKey.startsWith('fx_') ? baseKey : `fx_${baseKey}`;
    }
    const tId = tenantId || this.activeTenantId;
    return `fx_${tId}_${baseKey.replace(/^fx_/, '')}`;
  }

  /**
   * Güvenli veri okuma.
   * Önce tenant'a özel anahtara bakar; bulamazsa geriye dönük uyumluluk için global/legacy anahtara bakar.
   * Bozuk JSON veya tanımsız veri durumunda fallback döndürür ve uygulamayı çökertmez.
   */
  public getItem<T>(baseKey: string, fallback: T, options?: StorageOptions): T {
    const tId = options?.tenantId || this.activeTenantId;
    const scopedKey = this.getScopedKey(baseKey, tId, options?.isGlobal);
    const legacyKey = baseKey.startsWith('fx_') ? baseKey : `fx_${baseKey}`;

    let rawValue: string | null = null;

    if (this.isStorageAvailable) {
      try {
        rawValue = window.localStorage.getItem(scopedKey);
        if (!rawValue && scopedKey !== legacyKey) {
          rawValue = window.localStorage.getItem(legacyKey);
        }
      } catch (e) {
        console.warn(`[StorageManager] getItem hatası (${scopedKey}):`, e);
      }
    }

    if (!rawValue) {
      rawValue = this.memoryCache.get(scopedKey) || this.memoryCache.get(legacyKey) || null;
    }

    if (!rawValue || rawValue === 'undefined' || rawValue === 'null') {
      return fallback;
    }

    try {
      const parsed = JSON.parse(rawValue);

      // 1. Zarf (Envelope) Kontrolü
      if (parsed && typeof parsed === 'object' && 'schemaVersion' in parsed && 'data' in parsed) {
        const envelope = parsed as StorageEnvelope<T>;
        
        // Tenant doğrulaması
        if (!options?.isGlobal && envelope.tenantId && envelope.tenantId !== tId) {
          // Farklı tenanta ait veri
          return fallback;
        }

        return this.sanitizeTenantData(envelope.data, tId, options?.isGlobal);
      }

      // 2. Legacy / Düz Veri Şeması Göçü
      return this.sanitizeTenantData(parsed as T, tId, options?.isGlobal);
    } catch (err) {
      console.error(`[StorageManager] Bozuk veri tespit edildi (${baseKey}), varsayılan şema verisine dönülüyor:`, err);
      return fallback;
    }
  }

  /**
   * Güvenli veri yazma.
   * Veriyi StorageEnvelope zarfına sarar, tenant'ı etiketler ve localStorage + memory cache'e yazar.
   */
  public setItem<T>(baseKey: string, value: T, options?: StorageOptions): boolean {
    const tId = options?.tenantId || this.activeTenantId;
    const scopedKey = this.getScopedKey(baseKey, tId, options?.isGlobal);
    const legacyKey = baseKey.startsWith('fx_') ? baseKey : `fx_${baseKey}`;

    // Tenant etiketleme
    const sanitizedData = this.sanitizeTenantData(value, tId, options?.isGlobal);

    const envelope: StorageEnvelope<T> = {
      schemaVersion: STORAGE_SCHEMA_VERSION,
      tenantId: tId,
      updatedAt: new Date().toISOString(),
      data: sanitizedData,
    };

    const serializedEnvelope = JSON.stringify(options?.skipEnvelope ? sanitizedData : envelope);
    const serializedLegacy = JSON.stringify(sanitizedData);

    // Her zaman memory cache'e yaz
    this.memoryCache.set(scopedKey, serializedEnvelope);
    this.memoryCache.set(legacyKey, serializedLegacy);

    if (!this.isStorageAvailable) {
      return true;
    }

    try {
      window.localStorage.setItem(scopedKey, serializedEnvelope);
      // Geriye dönük uyumluluk: Legacy anahtarı da senkronize tut
      if (scopedKey !== legacyKey) {
        window.localStorage.setItem(legacyKey, serializedLegacy);
      }
      return true;
    } catch (e: any) {
      // QuotaExceededError veya SecurityError yönetimi
      if (e?.name === 'QuotaExceededError' || e?.code === 22) {
        console.warn('[StorageManager] Depolama kotası doldu! Gereksiz geçici kayıtlar temizleniyor...');
        this.evictTemporaryData();
        try {
          window.localStorage.setItem(scopedKey, serializedEnvelope);
          return true;
        } catch {
          console.error('[StorageManager] Kota temizliğine rağmen yer açılamadı, veri bellek içi havuzda tutuluyor.');
        }
      } else {
        console.error(`[StorageManager] setItem başarısız (${scopedKey}):`, e);
      }
      return false;
    }
  }

  /**
   * Güvenli veri silme
   */
  public removeItem(baseKey: string, options?: StorageOptions): void {
    const tId = options?.tenantId || this.activeTenantId;
    const scopedKey = this.getScopedKey(baseKey, tId, options?.isGlobal);
    const legacyKey = baseKey.startsWith('fx_') ? baseKey : `fx_${baseKey}`;

    this.memoryCache.delete(scopedKey);
    this.memoryCache.delete(legacyKey);

    if (this.isStorageAvailable) {
      try {
        window.localStorage.removeItem(scopedKey);
        window.localStorage.removeItem(legacyKey);
      } catch (e) {
        console.warn(`[StorageManager] removeItem hatası (${scopedKey}):`, e);
      }
    }
  }

  /**
   * Dizi halindeki varlıklara eksik tenantId alanını ekler veya başka tenant verilerini izole eder.
   */
  private sanitizeTenantData<T>(data: T, tenantId: string, isGlobal: boolean = false): T {
    if (isGlobal || !data) return data;

    if (Array.isArray(data)) {
      return data
        .filter((item: any) => {
          if (!item || typeof item !== 'object') return true;
          // Eğer tenantId varsa ve farklıysa filtrele
          return !item.tenantId || item.tenantId === tenantId;
        })
        .map((item: any) => {
          if (item && typeof item === 'object' && !item.tenantId) {
            return { ...item, tenantId };
          }
          return item;
        }) as unknown as T;
    }

    if (typeof data === 'object' && !('tenantId' in (data as any))) {
      return { ...(data as any), tenantId } as T;
    }

    return data;
  }

  /**
   * Kota dolduğunda eski/geçici verileri tahliye eder.
   */
  private evictTemporaryData(): void {
    if (!this.isStorageAvailable) return;
    try {
      const temporaryKeys = ['fx_cagri_kayitlari_list', 'fx_servis_bildirimleri_list', '__fx_storage_test__'];
      for (const k of temporaryKeys) {
        window.localStorage.removeItem(k);
      }
    } catch {
      // sessizce geç
    }
  }

  /**
   * Atomik transaction için depoların snapshot yedeğini alır.
   */
  public createSnapshot(keys: string[], tenantId?: string): Record<string, string | null> {
    const snapshot: Record<string, string | null> = {};
    const tId = tenantId || this.activeTenantId;

    for (const key of keys) {
      const scopedKey = this.getScopedKey(key, tId);
      const legacyKey = key.startsWith('fx_') ? key : `fx_${key}`;
      
      let raw: string | null = null;
      if (this.isStorageAvailable) {
        try {
          raw = window.localStorage.getItem(scopedKey) || window.localStorage.getItem(legacyKey);
        } catch {
          raw = null;
        }
      }
      snapshot[key] = raw || this.memoryCache.get(scopedKey) || this.memoryCache.get(legacyKey) || null;
    }

    return snapshot;
  }

  /**
   * Snapshot yedeğinden depoları geri yükler (Rollback).
   */
  public restoreSnapshot(snapshot: Record<string, string | null>, tenantId?: string): void {
    const tId = tenantId || this.activeTenantId;

    for (const [key, rawValue] of Object.entries(snapshot)) {
      const scopedKey = this.getScopedKey(key, tId);
      const legacyKey = key.startsWith('fx_') ? key : `fx_${key}`;

      if (rawValue !== null) {
        this.memoryCache.set(scopedKey, rawValue);
        this.memoryCache.set(legacyKey, rawValue);
        if (this.isStorageAvailable) {
          try {
            window.localStorage.setItem(scopedKey, rawValue);
            window.localStorage.setItem(legacyKey, rawValue);
          } catch {
            // sessiz
          }
        }
      } else {
        this.memoryCache.delete(scopedKey);
        this.memoryCache.delete(legacyKey);
        if (this.isStorageAvailable) {
          try {
            window.localStorage.removeItem(scopedKey);
            window.localStorage.removeItem(legacyKey);
          } catch {
            // sessiz
          }
        }
      }
    }
  }
}

export const storageManager = new StorageManager();

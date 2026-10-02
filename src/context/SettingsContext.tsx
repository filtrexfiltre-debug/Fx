import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface SettingsContextType {
  addressTypes: string[];
  brandTypes: string[];
  serviceTypes: string[];
  deviceModelTypes: string[];
  addServiceType: (type: string) => void;
  updateServiceType: (oldType: string, newType: string) => void;
  deleteServiceType: (type: string) => void;
  addDeviceModelType: (type: string) => void;
  updateDeviceModelType: (oldType: string, newType: string) => void;
  deleteDeviceModelType: (type: string) => void;
  addAddressType: (type: string) => void;
  updateAddressType: (oldType: string, newType: string) => void;
  deleteAddressType: (type: string) => void;
  addBrandType: (type: string) => void;
  updateBrandType: (oldType: string, newType: string) => void;
  deleteBrandType: (type: string) => void;
}

const DEFAULTS = {
  addressTypes: ['Merkez Adresi', 'Fabrika', 'Şube', 'Ev'],
  brandTypes: ['Filtrex', 'Waterbox', 'Aquaturk', 'İhlas', 'Aura'],
  serviceTypes: [
    'Arıza & Onarım (Cihaz Bozuk / Şikayet Var)',
    'Periyodik Bakım & Filtre Değişimi',
    'Montaj & Yeni Kurulum',
    'Keşif & Su Analizi',
  ],
  deviceModelTypes: [
    '5 Aşamalı Tezgah Altı RO',
    '6 Aşamalı Alkali RO',
    'Endüstriyel Yumuşatma Sistemi',
    'Aktif Karbon Filtrasyon',
    'Ultraviyole Sterilizasyon',
  ],
} as const;

const STORAGE_KEYS = {
  addressTypes: 'fx_settings_address_types',
  brandTypes: 'fx_settings_brand_types',
  serviceTypes: 'fx_settings_service_types',
  deviceModelTypes: 'fx_settings_device_model_types',
} as const;

const sanitizeList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
};

const getStoredList = (key: keyof typeof STORAGE_KEYS, fallback: string[]): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS[key]);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    const cleaned = sanitizeList(parsed);
    return cleaned.length > 0 ? cleaned : fallback;
  } catch {
    return fallback;
  }
};

const persistList = (key: keyof typeof STORAGE_KEYS, value: string[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(value));
  } catch {
    // localStorage erişimi engellenebilir veya dolu olabilir; sessizce atla.
  }
};

const normalizeNewType = (value: string): string => value.trim();

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [addressTypes, setAddressTypes] = useState<string[]>(() => getStoredList('addressTypes', [...DEFAULTS.addressTypes]));
  const [brandTypes, setBrandTypes] = useState<string[]>(() => getStoredList('brandTypes', [...DEFAULTS.brandTypes]));
  const [serviceTypes, setServiceTypes] = useState<string[]>(() => getStoredList('serviceTypes', [...DEFAULTS.serviceTypes]));
  const [deviceModelTypes, setDeviceModelTypes] = useState<string[]>(() => getStoredList('deviceModelTypes', [...DEFAULTS.deviceModelTypes]));

  useEffect(() => {
    setAddressTypes((prev) => getStoredList('addressTypes', prev));
    setBrandTypes((prev) => getStoredList('brandTypes', prev));
    setServiceTypes((prev) => getStoredList('serviceTypes', prev));
    setDeviceModelTypes((prev) => getStoredList('deviceModelTypes', prev));
  }, []);

  const addType = useCallback((current: string[], value: string, persistKey: keyof typeof STORAGE_KEYS) => {
    const typedValue = normalizeNewType(value);
    if (!typedValue) return current;

    const next = [...new Set([...current, typedValue])];
    persistList(persistKey, next);
    return next;
  }, []);

  const updateType = useCallback(
    (current: string[], oldType: string, newType: string, persistKey: keyof typeof STORAGE_KEYS) => {
      const targetOld = normalizeNewType(oldType);
      const targetNew = normalizeNewType(newType);

      if (!targetOld || !targetNew || targetOld === targetNew) {
        return current;
      }

      const next = current.map((item) => (item === targetOld ? targetNew : item));
      persistList(persistKey, next);
      return next;
    },
    []
  );

  const deleteType = useCallback((current: string[], value: string, persistKey: keyof typeof STORAGE_KEYS) => {
    const target = normalizeNewType(value);
    if (!target) return current;

    const next = current.filter((item) => item !== target);
    persistList(persistKey, next);
    return next;
  }, []);

  const addServiceType = (type: string) => {
    setServiceTypes((current) => addType(current, type, 'serviceTypes'));
  };

  const updateServiceType = (oldType: string, newType: string) => {
    setServiceTypes((current) => updateType(current, oldType, newType, 'serviceTypes'));
  };

  const deleteServiceType = (type: string) => {
    setServiceTypes((current) => deleteType(current, type, 'serviceTypes'));
  };

  const addDeviceModelType = (type: string) => {
    setDeviceModelTypes((current) => addType(current, type, 'deviceModelTypes'));
  };

  const updateDeviceModelType = (oldType: string, newType: string) => {
    setDeviceModelTypes((current) => updateType(current, oldType, newType, 'deviceModelTypes'));
  };

  const deleteDeviceModelType = (type: string) => {
    setDeviceModelTypes((current) => deleteType(current, type, 'deviceModelTypes'));
  };

  const addAddressType = (type: string) => {
    setAddressTypes((current) => addType(current, type, 'addressTypes'));
  };

  const updateAddressType = (oldType: string, newType: string) => {
    setAddressTypes((current) => updateType(current, oldType, newType, 'addressTypes'));
  };

  const deleteAddressType = (type: string) => {
    setAddressTypes((current) => deleteType(current, type, 'addressTypes'));
  };

  const addBrandType = (type: string) => {
    setBrandTypes((current) => addType(current, type, 'brandTypes'));
  };

  const updateBrandType = (oldType: string, newType: string) => {
    setBrandTypes((current) => updateType(current, oldType, newType, 'brandTypes'));
  };

  const deleteBrandType = (type: string) => {
    setBrandTypes((current) => deleteType(current, type, 'brandTypes'));
  };

  return (
    <SettingsContext.Provider
      value={{
        addressTypes,
        brandTypes,
        serviceTypes,
        deviceModelTypes,
        addServiceType,
        updateServiceType,
        deleteServiceType,
        addDeviceModelType,
        updateDeviceModelType,
        deleteDeviceModelType,
        addAddressType,
        updateAddressType,
        deleteAddressType,
        addBrandType,
        updateBrandType,
        deleteBrandType,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

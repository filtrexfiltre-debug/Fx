import React, { createContext, useContext, useState, useEffect } from 'react';

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

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [addressTypes, setAddressTypes] = useState<string[]>(['Merkez Adresi', 'Fabrika', 'Şube', 'Ev']);
  const [brandTypes, setBrandTypes] = useState<string[]>(['Filtrex', 'Waterbox', 'Aquaturk', 'İhlas', 'Aura']);
  const [serviceTypes, setServiceTypes] = useState<string[]>([
    'Arıza & Onarım (Cihaz Bozuk / Şikayet Var)',
    'Periyodik Bakım & Filtre Değişimi',
    'Montaj & Yeni Kurulum',
    'Keşif & Su Analizi'
  ]);
  const [deviceModelTypes, setDeviceModelTypes] = useState<string[]>([
    '5 Aşamalı Tezgah Altı RO',
    '6 Aşamalı Alkali RO',
    'Endüstriyel Yumuşatma Sistemi',
    'Aktif Karbon Filtrasyon',
    'Ultraviyole Sterilizasyon'
  ]);

  // Load from localStorage on mount
  useEffect(() => {
    const savedAddressTypes = localStorage.getItem('fx_settings_address_types');
    const savedBrandTypes = localStorage.getItem('fx_settings_brand_types');
    const savedServiceTypes = localStorage.getItem('fx_settings_service_types');
    const savedDeviceModelTypes = localStorage.getItem('fx_settings_device_model_types');

    if (savedAddressTypes) setAddressTypes(JSON.parse(savedAddressTypes));
    if (savedBrandTypes) setBrandTypes(JSON.parse(savedBrandTypes));
    if (savedServiceTypes) setServiceTypes(JSON.parse(savedServiceTypes));
    if (savedDeviceModelTypes) setDeviceModelTypes(JSON.parse(savedDeviceModelTypes));
  }, []);

  const addServiceType = (type: string) => {
    const updated = [...serviceTypes, type];
    setServiceTypes(updated);
    localStorage.setItem('fx_settings_service_types', JSON.stringify(updated));
  };

  const updateServiceType = (oldType: string, newType: string) => {
    const updated = serviceTypes.map(t => (t === oldType ? newType : t));
    setServiceTypes(updated);
    localStorage.setItem('fx_settings_service_types', JSON.stringify(updated));
  };

  const deleteServiceType = (type: string) => {
    const updated = serviceTypes.filter(t => t !== type);
    setServiceTypes(updated);
    localStorage.setItem('fx_settings_service_types', JSON.stringify(updated));
  };

  const addDeviceModelType = (type: string) => {
    const updated = [...deviceModelTypes, type];
    setDeviceModelTypes(updated);
    localStorage.setItem('fx_settings_device_model_types', JSON.stringify(updated));
  };

  const updateDeviceModelType = (oldType: string, newType: string) => {
    const updated = deviceModelTypes.map(t => (t === oldType ? newType : t));
    setDeviceModelTypes(updated);
    localStorage.setItem('fx_settings_device_model_types', JSON.stringify(updated));
  };

  const deleteDeviceModelType = (type: string) => {
    const updated = deviceModelTypes.filter(t => t !== type);
    setDeviceModelTypes(updated);
    localStorage.setItem('fx_settings_device_model_types', JSON.stringify(updated));
  };

  const addAddressType = (type: string) => {
    const updated = [...addressTypes, type];
    setAddressTypes(updated);
    localStorage.setItem('fx_settings_address_types', JSON.stringify(updated));
  };

  const updateAddressType = (oldType: string, newType: string) => {
    const updated = addressTypes.map(t => (t === oldType ? newType : t));
    setAddressTypes(updated);
    localStorage.setItem('fx_settings_address_types', JSON.stringify(updated));
  };

  const deleteAddressType = (type: string) => {
    const updated = addressTypes.filter(t => t !== type);
    setAddressTypes(updated);
    localStorage.setItem('fx_settings_address_types', JSON.stringify(updated));
  };

  const addBrandType = (type: string) => {
    const updated = [...brandTypes, type];
    setBrandTypes(updated);
    localStorage.setItem('fx_settings_brand_types', JSON.stringify(updated));
  };

  const updateBrandType = (oldType: string, newType: string) => {
    const updated = brandTypes.map(t => (t === oldType ? newType : t));
    setBrandTypes(updated);
    localStorage.setItem('fx_settings_brand_types', JSON.stringify(updated));
  };

  const deleteBrandType = (type: string) => {
    const updated = brandTypes.filter(t => t !== type);
    setBrandTypes(updated);
    localStorage.setItem('fx_settings_brand_types', JSON.stringify(updated));
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
        deleteBrandType
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

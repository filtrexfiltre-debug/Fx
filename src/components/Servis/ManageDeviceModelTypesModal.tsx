import React, { useState } from 'react';
import { X, Plus, Pencil, Trash2, Save, Cpu } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';

interface ManageDeviceModelTypesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ManageDeviceModelTypesModal: React.FC<ManageDeviceModelTypesModalProps> = ({ isOpen, onClose }) => {
  const { deviceModelTypes, addDeviceModelType, updateDeviceModelType, deleteDeviceModelType } = useSettings();
  const [newType, setNewType] = useState('');
  const [editingType, setEditingType] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newType.trim()) {
      addDeviceModelType(newType);
      setNewType('');
    }
  };

  const handleSaveEdit = (oldType: string) => {
    if (editValue.trim()) {
      updateDeviceModelType(oldType, editValue);
    }
    setEditingType(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
              <Cpu className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-slate-800 font-sans">Cihaz & Sistem Tiplerini Yönet</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto max-h-[60vh]">
          <form onSubmit={handleAdd} className="flex gap-2 mb-5">
            <input
              type="text"
              placeholder="Yeni cihaz / sistem tipi ekle..."
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 text-xs focus:border-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!newType.trim()}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Ekle
            </button>
          </form>

          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-slate-500">Tanımlı Cihaz Tipleri</h3>
              <span className="text-[11px] text-slate-400">{deviceModelTypes.length} adet</span>
            </div>

            {deviceModelTypes.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                Henüz cihaz tipi eklenmemiş.
              </div>
            ) : (
              deviceModelTypes.map((type) => (
                <div key={type} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/50">
                  {editingType === type ? (
                    <div className="flex flex-1 items-center gap-2">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="flex-1 bg-white border border-slate-350 rounded px-2 py-1 text-slate-800 text-xs focus:border-blue-500 focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveEdit(type)}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                        title="Kaydet"
                      >
                        <Save className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingType(null)}
                        className="p-1.5 text-slate-400 hover:bg-slate-200 rounded cursor-pointer"
                        title="Vazgeç"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-xs text-slate-700 truncate pr-2 font-medium">{type}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            setEditingType(type);
                            setEditValue(type);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                          title="Düzenle"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteDeviceModelType(type)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                          title="Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};

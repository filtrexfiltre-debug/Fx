import React, { useState, useEffect } from 'react';
import {
  X,
  Truck,
  Plus,
  Trash2,
  Calendar,
  Clock,
  User,
  CreditCard,
  Building,
  CheckCircle2,
} from 'lucide-react';
import { GibDispatch } from '../../types/trade';
import { Contact, Product } from '../../types/fx';
import { tradeService } from '../../services/tradeService';
import { fxApi } from '../../services/api';

interface NewGibDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (dispatch: GibDispatch) => void;
}

export const NewGibDispatchModal: React.FC<NewGibDispatchModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [despatchDate, setDespatchDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [despatchTime, setDespatchTime] = useState<string>('15:00');

  // Taşıyıcı ve Şoför (Yasal Zorunlu)
  const [carrierTitle, setCarrierTitle] = useState<string>('Öz Trans Lojistik A.Ş.');
  const [carrierPlateNumber, setCarrierPlateNumber] = useState<string>('34 FX 1905');
  const [driverName, setDriverName] = useState<string>('Mehmet Salih Demir');
  const [driverIdNumber, setDriverIdNumber] = useState<string>('28910482910');

  // Kalemler
  const [items, setItems] = useState<Array<{ name: string; sku: string; quantity: number; unit: string }>>([
    {
      name: 'Ağır Vasıta Yağ Filtresi XL-500 (Euro 6)',
      sku: 'FLT-OIL-001',
      quantity: 50,
      unit: 'Adet',
    },
  ]);

  useEffect(() => {
    if (isOpen) {
      fxApi.getContacts().then((res) => {
        const c = res.data || [];
        setContacts(c);
        if (c.length > 0 && !selectedContactId) {
          setSelectedContactId(c[0].id);
          setDeliveryAddress(c[0].formattedAddress || c[0].streetLine || 'İstanbul');
        }
      });
      fxApi.getProducts().then((res) => setProducts(res.data || []));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleContactChange = (cid: string) => {
    setSelectedContactId(cid);
    const c = contacts.find((item) => item.id === cid);
    if (c) {
      setDeliveryAddress(c.formattedAddress || c.streetLine || 'İstanbul');
    }
  };

  const handleAddItem = () => {
    setItems([...items, { name: '', sku: '', quantity: 1, unit: 'Adet' }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemProductSelect = (index: number, pid: string) => {
    const prod = products.find((p) => p.id === pid);
    if (!prod) return;
    const next = [...items];
    next[index] = {
      ...next[index],
      name: prod.name,
      sku: prod.skuCode,
      unit: prod.unitType || 'Adet',
    };
    setItems(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const contact = contacts.find((c) => c.id === selectedContactId);
    if (!contact) {
      alert('Lütfen alıcı firmayı seçiniz!');
      return;
    }

    const created = tradeService.createGibDispatch({
      direction: 'OUTGOING',
      scenario: 'TEMEL',
      senderTitle: 'FX Finansal Teknolojiler ve Filtre Sistemleri A.Ş.',
      senderVkn: '3880491204',
      receiverTitle: contact.title || (contact as any).contactName,
      receiverVkn: contact.taxNumber || '1111111111',
      deliveryAddress,
      issueDate: new Date().toISOString().slice(0, 10),
      despatchDate,
      despatchTime,
      carrierTitle,
      carrierPlateNumber,
      driverName,
      driverIdNumber,
      status: 'SENT_TO_GIB',
      gibStatusCode: 1200,
      gibStatusDescription: 'GİB e-İrsaliye Başarıyla İletildi (Plaka ve Şoför Tescil Edildi)',
      items,
      notes: 'Fiili sevkiyat başlamıştır.',
    });

    onSuccess(created);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-auto max-h-[95vh] flex flex-col">
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">
                Yeni Resmi e-İrsaliye Düzenle (GİB Sevk)
              </h2>
              <p className="text-xs text-stone-500">
                GİB standartlarına uygun araç plakası, şoför TCKN ve fiili sevk saati ile resmi irsaliye oluşturun.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* ALICI VE TESLİMAT ADRESİ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Alıcı Müşteri / Cari Hesap *
              </label>
              <select
                value={selectedContactId}
                onChange={(e) => handleContactChange(e.target.value)}
                required
                className="w-full h-10 px-3 bg-white border border-stone-300 rounded-lg text-xs font-medium"
              >
                <option value="">Alıcı Seçiniz...</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title || c.authorizedPerson || 'İsimsiz Cari'} (VKN: {c.taxNumber || 'Bireysel'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Teslimat / Sevk Adresi *
              </label>
              <input
                type="text"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                required
                placeholder="Örn: İkitelli OSB Metal-İş Blok 12 No:4 Başakşehir"
                className="w-full h-10 px-3 bg-white border border-stone-300 rounded-lg text-xs"
              />
            </div>
          </div>

          {/* FİİLİ SEVK TARİHİ VE SAATİ (GİB YASAL ZORUNLU) */}
          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
            <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Fiili Sevk Zamanı (GİB Yasal Denetim Zorunluluğu)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-medium text-amber-800 mb-1">
                  Fiili Sevk Tarihi *
                </label>
                <input
                  type="date"
                  value={despatchDate}
                  onChange={(e) => setDespatchDate(e.target.value)}
                  required
                  className="w-full h-9 px-3 bg-white border border-amber-300 rounded-lg text-xs font-medium"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-amber-800 mb-1">
                  Fiili Sevk Saati (HH:mm) *
                </label>
                <input
                  type="time"
                  value={despatchTime}
                  onChange={(e) => setDespatchTime(e.target.value)}
                  required
                  className="w-full h-9 px-3 bg-white border border-amber-300 rounded-lg text-xs font-mono font-bold"
                />
              </div>
            </div>
          </div>

          {/* TAŞIYICI VE ŞOFÖR BİLGİLERİ (GİB YASAL ZORUNLU) */}
          <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-3">
            <div className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-stone-600" />
              <span>Taşıyıcı Araç ve Sürücü Bilgileri</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-medium text-stone-600 mb-1">
                  Taşıyıcı Firma / Kargo
                </label>
                <input
                  type="text"
                  value={carrierTitle}
                  onChange={(e) => setCarrierTitle(e.target.value)}
                  placeholder="Örn: Öz Trans Lojistik / Özmal Araç"
                  className="w-full h-9 px-3 bg-white border border-stone-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-stone-600 mb-1">
                  Çekici / Araç Plakası (Zorunlu) *
                </label>
                <input
                  type="text"
                  value={carrierPlateNumber}
                  onChange={(e) => setCarrierPlateNumber(e.target.value.toUpperCase())}
                  required
                  placeholder="Örn: 34 FX 1905"
                  className="w-full h-9 px-3 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-stone-600 mb-1">
                  Sürücü Adı Soyadı (Zorunlu) *
                </label>
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  required
                  placeholder="Örn: Mehmet Salih Demir"
                  className="w-full h-9 px-3 bg-white border border-stone-300 rounded-lg text-xs font-medium"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-stone-600 mb-1">
                  Sürücü TCKN (11 Hane Zorunlu) *
                </label>
                <input
                  type="text"
                  maxLength={11}
                  value={driverIdNumber}
                  onChange={(e) => setDriverIdNumber(e.target.value)}
                  required
                  placeholder="Örn: 28910482910"
                  className="w-full h-9 px-3 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold"
                />
              </div>
            </div>
          </div>

          {/* SEVK EDİLEN ÜRÜNLER */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-stone-900">Sevk Edilen Mal ve Malzemeler</h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Malzeme Ekle</span>
              </button>
            </div>

            <div className="border border-stone-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-100 text-stone-700 border-b border-stone-200 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5 w-8">#</th>
                    <th className="p-2.5">Ürün / Açıklama</th>
                    <th className="p-2.5 w-24">Miktar</th>
                    <th className="p-2.5 w-20">Birim</th>
                    <th className="p-2.5 w-10 text-center">Sil</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5 text-stone-400 font-mono text-[11px]">{idx + 1}</td>
                      <td className="p-2.5">
                        <select
                          onChange={(e) => handleItemProductSelect(idx, e.target.value)}
                          className="w-full h-8 px-2 bg-white border border-stone-300 rounded text-xs mb-1"
                        >
                          <option value="">Stoktan Seç...</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              [{p.skuCode}] {p.name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => {
                            const next = [...items];
                            next[idx].name = e.target.value;
                            setItems(next);
                          }}
                          placeholder="Ürün adı"
                          className="w-full h-7 px-2 bg-stone-50 border border-stone-200 rounded text-xs"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => {
                            const next = [...items];
                            next[idx].quantity = Number(e.target.value);
                            setItems(next);
                          }}
                          className="w-full h-8 px-2 bg-white border border-stone-300 rounded text-xs font-mono text-center"
                        />
                      </td>
                      <td className="p-2.5">
                        <select
                          value={item.unit}
                          onChange={(e) => {
                            const next = [...items];
                            next[idx].unit = e.target.value;
                            setItems(next);
                          }}
                          className="w-full h-8 px-1 bg-white border border-stone-300 rounded text-xs"
                        >
                          <option value="Adet">Adet</option>
                          <option value="KG">KG</option>
                          <option value="Metre">Metre</option>
                          <option value="Koli">Koli</option>
                          <option value="Palet">Palet</option>
                        </select>
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          disabled={items.length <= 1}
                          className="p-1 text-stone-400 hover:text-rose-600 disabled:opacity-30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* FOOTER */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 rounded-lg"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>e-İrsaliyeyi GİB'e Gönder</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

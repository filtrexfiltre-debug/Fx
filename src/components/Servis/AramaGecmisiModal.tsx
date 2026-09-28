import React from 'react';
import { X, PhoneCall, Calendar, User, Clock, CheckCircle2, AlertCircle, MessageSquare } from 'lucide-react';
import { CagriAramaKaydi, MusteriCihazi } from '../../types';

interface AramaGecmisiModalProps {
  isOpen: boolean;
  onClose: () => void;
  cihaz: MusteriCihazi | null;
  aramaKayitlari: CagriAramaKaydi[];
}

export const AramaGecmisiModal: React.FC<AramaGecmisiModalProps> = ({
  isOpen,
  onClose,
  cihaz,
  aramaKayitlari
}) => {
  if (!isOpen || !cihaz) return null;

  const cihazAramalari = aramaKayitlari
    .filter(a => a.cihazId === cihaz.id)
    .sort((a, b) => new Date(b.aramaTarihi).getTime() - new Date(a.aramaTarihi).getTime());

  const getStatusBadge = (durum: CagriAramaKaydi['durum']) => {
    switch (durum) {
      case 'RANDEVU_ALINDI':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Randevu Alındı
          </span>
        );
      case 'DUSUNECEK_TEKRAR_ARA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5" /> Düşünecek / Tekrar Aranacak
          </span>
        );
      case 'ULASILAMADI_MESGUL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5" /> Ulaşılamadı / Meşgul
          </span>
        );
      case 'YETKILI_YOKTU':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200">
            <User className="w-3.5 h-3.5" /> Yetkili Yoktu
          </span>
        );
      case 'IPTAL_BAKIM_ISTEMIYOR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
            <X className="w-3.5 h-3.5" /> Bakım İstemiyor / İptal
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-xl text-blue-600">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2 font-sans">
                Arama & Görüşme Geçmişi
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                  {cihazAramalari.length} Görüşme
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                {cihaz.cariTitle} &bull; {cihaz.cihazAdi}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Device & Address Quick Bar */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 text-xs flex flex-wrap items-center justify-between gap-2 text-slate-600 font-medium">
          <div>
            <span className="text-slate-400 font-medium">Adres / Şube:</span>{' '}
            <span className="font-bold text-slate-800">{cihaz.adresTipi}</span> ({cihaz.il} / {cihaz.ilce} - {cihaz.mahalle})
          </div>
          <div>
            <span className="text-slate-400 font-medium">Yetkili:</span>{' '}
            <span className="font-bold text-slate-800">{cihaz.yetkiliKisi || 'Belirtilmedi'}</span> ({cihaz.yetkiliTelefon || 'Yok'})
          </div>
        </div>

        {/* Call Logs Timeline */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 scrollbar-thin">
          {cihazAramalari.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <PhoneCall className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="font-bold text-sm">Bu cihaza ait henüz bir arama kaydı bulunmuyor.</p>
              <p className="text-xs text-slate-500 mt-1">"Arama Yap & Kaydet" butonuna tıklayarak ilk görüşmenizi ekleyebilirsiniz.</p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-150">
              {cihazAramalari.map((kayit, index) => {
                const callNumber = cihazAramalari.length - index;
                return (
                  <div key={kayit.id} className="relative group">
                    {/* Timeline Node */}
                    <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full bg-white border-2 border-blue-500 flex items-center justify-center shadow-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    </div>

                    <div className="bg-white hover:bg-slate-50/50 border border-slate-200 rounded-xl p-4 transition-colors shadow-2xs">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            {callNumber}. Arama
                          </span>
                          <span className="text-xs text-slate-500 flex items-center gap-1 font-semibold font-mono">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {kayit.aramaTarihi}
                          </span>
                        </div>
                        {getStatusBadge(kayit.durum)}
                      </div>

                      <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 mb-2 flex items-start gap-2 shadow-inner">
                        <MessageSquare className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <span className="leading-relaxed whitespace-pre-wrap font-medium">{kayit.gorusmeNotu}</span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-1 font-semibold">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" /> Arayan: <strong className="text-slate-700">{kayit.personelAdi}</strong>
                        </span>
                        {kayit.tekrarAramaTarihi && (
                          <span className="text-amber-600 font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Tekrar Arama: {kayit.tekrarAramaTarihi}
                          </span>
                        )}
                        {kayit.olusturulanServisFisId && (
                          <span className="text-emerald-600 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Servis İş Emri Açıldı
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 flex justify-end bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors cursor-pointer"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};

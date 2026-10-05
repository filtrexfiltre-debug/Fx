import React from 'react';
import { fxApi } from '../../services/api';

type LoginScreenProps = {
  loginEmail: string;
  setLoginEmail: (value: string) => void;
  loginPassword: string;
  setLoginPassword: (value: string) => void;
  loginError: string | null;
  onLogin: (email: string, pass: string) => Promise<void> | void;
  onQuickLogin: (email: string, pass: string) => void;
};

export function LoginScreen({
  loginEmail,
  setLoginEmail,
  loginPassword,
  setLoginPassword,
  loginError,
  onLogin,
  onQuickLogin,
}: LoginScreenProps) {
  const tenant = fxApi.getCurrentTenant();

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md bg-white border border-stone-200 shadow-xl rounded-2xl overflow-hidden flex flex-col">
        <div className="p-6 sm:p-8 bg-stone-900 text-white flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-2xl tracking-wider shadow-md mb-4 animate-pulse">
            FX
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">FX ENTERPRISE ERP</h1>
          <p className="text-xs text-stone-300 mt-1">{tenant.name}</p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onLogin(loginEmail, loginPassword);
          }}
          className="p-6 sm:p-8 flex flex-col gap-4"
        >
          <h2 className="text-stone-800 text-sm font-bold text-center">Güvenli giriş</h2>

          {loginError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-lg">
              {loginError}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-stone-600">E-posta Adresi</label>
            <input
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="ornek@enterprise.com"
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-stone-600">Şifre</label>
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="•••••"
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-sm rounded-lg transition-colors cursor-pointer shadow-md mt-2"
          >
            Giriş Yap
          </button>

          <div className="border-t border-stone-200 pt-4 mt-2">
            <span className="block text-xs font-bold text-stone-600 text-center mb-2.5">
              ⚡ Hızlı Giriş (Test Hesapları)
            </span>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => onQuickLogin('patron@enterprise.com', '123456')}
                className="w-full p-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-950 rounded-xl flex items-center justify-between transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">👑</span>
                  <div>
                    <div className="text-xs font-bold text-indigo-950">
                      Ahmet Yılmaz (Patron / Genel Müdür)
                    </div>
                    <div className="text-[11px] text-stone-500 font-mono">
                      patron@enterprise.com &bull; Şifre: 123456
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-md shrink-0">
                  Tüm Şubeler &rarr;
                </span>
              </button>

              <button
                type="button"
                onClick={() => onQuickLogin('kadikoy@enterprise.com', '123456')}
                className="w-full p-2.5 bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-900 rounded-xl flex items-center justify-between transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">🏢</span>
                  <div>
                    <div className="text-xs font-bold text-stone-900">
                      Burak Demir (Kadıköy Şube Müdürü)
                    </div>
                    <div className="text-[11px] text-stone-500 font-mono">
                      kadikoy@enterprise.com &bull; Şifre: 123456
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold bg-stone-200 text-stone-700 px-2 py-0.5 rounded-md shrink-0">
                  Kadıköy &rarr;
                </span>
              </button>

              <button
                type="button"
                onClick={() => onQuickLogin('merkez@enterprise.com', '123456')}
                className="w-full p-2.5 bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-900 rounded-xl flex items-center justify-between transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">🏛️</span>
                  <div>
                    <div className="text-xs font-bold text-stone-900">
                      Selin Kaya (Merkez Sorumlusu)
                    </div>
                    <div className="text-[11px] text-stone-500 font-mono">
                      merkez@enterprise.com &bull; Şifre: 123456
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold bg-stone-200 text-stone-700 px-2 py-0.5 rounded-md shrink-0">
                  Merkez &rarr;
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

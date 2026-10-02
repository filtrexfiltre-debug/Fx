import { useState } from 'react';
import { type AuthenticatedUser, fxApi } from '../services/api';
import { safeLocalStorage, readStoredBoolean } from '../lib/storage';

export function useAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    const isPersistedLoggedIn = readStoredBoolean('fx_is_logged_in', false);
    const hasToken = Boolean(safeLocalStorage.getItem('fx_auth_token'));
    return isPersistedLoggedIn && hasToken;
  });

  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(() => {
    const saved = safeLocalStorage.getItem('fx_current_user');
    if (!saved) return null;

    try {
      const parsed = JSON.parse(saved);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      safeLocalStorage.removeItem('fx_current_user');
      return null;
    }
  });

  const [loginEmail, setLoginEmail] = useState<string>('patron@enterprise.com');
  const [loginPassword, setLoginPassword] = useState<string>('123456');
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleLogin = async (email: string, pass: string) => {
    setLoginError(null);

    if (!email || !pass) {
      setLoginError('Lütfen e-posta ve şifrenizi giriniz.');
      return;
    }

    try {
      const { user } = await fxApi.login(email, pass);
      setCurrentUser(user);
      setIsLoggedIn(true);
      safeLocalStorage.setItem('fx_is_logged_in', 'true');
      safeLocalStorage.setItem('fx_current_user', JSON.stringify(user));
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Giriş yapılamadı.');
    }
  };

  const handleQuickLogin = (email: string, pass: string) => {
    setLoginEmail(email);
    setLoginPassword(pass);
    void handleLogin(email, pass);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setLoginEmail('');
    setLoginPassword('');
    safeLocalStorage.removeItem('fx_is_logged_in');
    safeLocalStorage.removeItem('fx_current_user');
    safeLocalStorage.removeItem('fx_auth_token');
  };

  return {
    isLoggedIn,
    currentUser,
    loginEmail,
    setLoginEmail,
    loginPassword,
    setLoginPassword,
    loginError,
    setLoginError,
    handleLogin,
    handleQuickLogin,
    handleLogout,
  };
}

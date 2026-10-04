import { useState } from 'react';
import { type AuthenticatedUser, fxApi, branchContext } from '../services/api';
import { safeLocalStorage, readStoredBoolean, STORAGE_KEYS } from '../lib/storage';
import { recordAudit } from '../services/ledger';

function readSavedUser(): AuthenticatedUser | null {
  const saved = safeLocalStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  if (!saved) return null;

  try {
    const parsed = JSON.parse(saved);
    // Legacy sessions without RBAC claims are rejected to force a fresh login.
    if (!parsed || typeof parsed !== 'object' || !parsed.id || !Array.isArray(parsed.permissions)) return null;
    return parsed as AuthenticatedUser;
  } catch {
    safeLocalStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    return null;
  }
}

export function useAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    const isPersistedLoggedIn = readStoredBoolean(STORAGE_KEYS.IS_LOGGED_IN, false);
    const hasToken = Boolean(safeLocalStorage.getItem(STORAGE_KEYS.AUTH_TOKEN));
    return isPersistedLoggedIn && hasToken && readSavedUser() !== null;
  });

  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(readSavedUser);

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
      branchContext.setIsGlobalUser(user.isGlobal);
      branchContext.setSelectedBranchId(user.branchId);
      safeLocalStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, 'true');
      safeLocalStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
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
    if (currentUser) {
      recordAudit({ branchId: currentUser.isGlobal ? null : currentUser.branchId, userId: currentUser.id, action: 'auth.logout', entityType: 'user', entityId: currentUser.id });
    }
    setIsLoggedIn(false);
    setCurrentUser(null);
    setLoginEmail('');
    setLoginPassword('');
    safeLocalStorage.removeItem(STORAGE_KEYS.IS_LOGGED_IN);
    safeLocalStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    safeLocalStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
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

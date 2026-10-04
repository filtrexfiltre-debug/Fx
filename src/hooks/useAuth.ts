import { useState } from 'react';
import { type AuthenticatedUser, branchContext, fxApi } from '../services/api';
import { ledgerService } from '../services/ledger';
import { safeLocalStorage } from '../lib/storage';

interface AuthClaims extends AuthenticatedUser {
  sub: string;
  exp: number;
  tenantId: string;
  isGlobal: boolean;
  permissions: string[];
}

function decodeClaims(token: string): AuthClaims | null {
  try {
    const [encodedPayload, signature, extra] = token.split('.');
    if (!encodedPayload || !signature || extra) return null;
    const base64 = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const claims = JSON.parse(new TextDecoder().decode(bytes)) as Partial<AuthClaims>;
    if (
      typeof claims.sub !== 'string' || !claims.sub ||
      typeof claims.email !== 'string' ||
      typeof claims.name !== 'string' ||
      typeof claims.role !== 'string' ||
      typeof claims.tenantId !== 'string' ||
      typeof claims.branchId !== 'string' ||
      typeof claims.isGlobal !== 'boolean' ||
      !Array.isArray(claims.permissions) ||
      !claims.permissions.every((permission) => typeof permission === 'string') ||
      !Number.isFinite(claims.exp) ||
      (claims.exp as number) <= Math.floor(Date.now() / 1000) ||
      (claims.isGlobal && claims.branchId !== 'all')
    ) return null;
    return claims as AuthClaims;
  } catch {
    return null;
  }
}

function removeLegacySession(): void {
  for (const key of ['fx_is_logged_in', 'fx_current_user', 'fx_user_role', 'fx_is_global_user']) {
    safeLocalStorage.removeItem(key);
  }
}

function initializeUser(): AuthenticatedUser | null {
  const token = safeLocalStorage.getItem('fx_auth_token');
  if (!token) {
    removeLegacySession();
    branchContext.clearAuthContext();
    return null;
  }
  const claims = decodeClaims(token);
  if (!claims) {
    safeLocalStorage.removeItem('fx_auth_token');
    removeLegacySession();
    ledgerService.clearCache();
    branchContext.clearAuthContext();
    return null;
  }
  removeLegacySession();
  branchContext.setAuthContext(claims.branchId, claims.isGlobal);
  return {
    id: claims.sub,
    email: claims.email,
    name: claims.name,
    role: claims.role,
    tenantId: claims.tenantId,
    branchId: claims.branchId,
    isGlobal: claims.isGlobal,
    permissions: claims.permissions,
  };
}

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(initializeUser);
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
      const { token } = await fxApi.login(email, pass);
      const claims = decodeClaims(token);
      if (!claims) throw new Error('Oturum bilgisi geçersiz. Lütfen yeniden giriş yapın.');
      safeLocalStorage.setItem('fx_auth_token', token);
      removeLegacySession();
      const user: AuthenticatedUser = {
        id: claims.sub,
        email: claims.email,
        name: claims.name,
        role: claims.role,
        tenantId: claims.tenantId,
        branchId: claims.branchId,
        isGlobal: claims.isGlobal,
        permissions: claims.permissions,
      };
      setCurrentUser(user);
      branchContext.setAuthContext(claims.branchId, claims.isGlobal);
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
    setCurrentUser(null);
    setLoginEmail('');
    setLoginPassword('');
    setLoginError(null);
    safeLocalStorage.removeItem('fx_auth_token');
    removeLegacySession();
    ledgerService.clearCache();
    branchContext.clearAuthContext();
  };

  return {
    isLoggedIn: currentUser !== null,
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

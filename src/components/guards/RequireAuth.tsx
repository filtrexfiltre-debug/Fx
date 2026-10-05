import React, { ReactNode } from 'react';
import { useAuthContext } from '../../context/AuthContext';
import { LoginScreen } from '../auth/LoginScreen';

interface RequireAuthProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function RequireAuth({ children, fallback }: RequireAuthProps) {
  const auth = useAuthContext();

  if (!auth.isLoggedIn) {
    if (fallback) return <>{fallback}</>;

    return (
      <LoginScreen
        loginEmail={auth.loginEmail}
        setLoginEmail={auth.setLoginEmail}
        loginPassword={auth.loginPassword}
        setLoginPassword={auth.setLoginPassword}
        loginError={auth.loginError}
        onLogin={auth.handleLogin}
        onQuickLogin={auth.handleQuickLogin}
      />
    );
  }

  return <>{children}</>;
}

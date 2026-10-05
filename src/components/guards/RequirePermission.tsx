import React, { ReactNode } from 'react';
import { useAuthContext } from '../../context/AuthContext';
import { Permission, hasPermission } from '../../lib/permissions';
import { ShieldAlert } from 'lucide-react';

interface RequirePermissionProps {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}

export function RequirePermission({
  permission,
  children,
  fallback,
}: RequirePermissionProps) {
  const { currentUser } = useAuthContext();
  const allowed = hasPermission(currentUser?.role, permission);

  if (!allowed) {
    if (fallback) return <>{fallback}</>;

    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-center flex flex-col items-center justify-center gap-3 my-4">
        <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-rose-900">Yetkisiz Erişim</h3>
          <p className="text-xs text-rose-700 mt-1">
            Bu modülü görüntülemek için <strong>{permission}</strong> iznine sahip olmanız gerekmektedir.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

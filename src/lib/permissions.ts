/**
 * FX Enterprise RBAC (Role-Based Access Control)
 */

export type UserRole = 'Patron' | 'Müdür' | 'Sorumlu' | 'Personel' | 'Muhasebe';

export type Permission =
  | 'branch:view_all'
  | 'branch:manage'
  | 'customer:view'
  | 'customer:create'
  | 'customer:edit'
  | 'customer:delete'
  | 'personnel:view'
  | 'personnel:manage'
  | 'finance:view'
  | 'finance:transact'
  | 'stock:view'
  | 'stock:manage'
  | 'trade:view'
  | 'trade:create_invoice'
  | 'reports:view_tax'
  | 'service:view'
  | 'service:manage'
  | 'system:view_code';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  Patron: [
    'branch:view_all',
    'branch:manage',
    'customer:view',
    'customer:create',
    'customer:edit',
    'customer:delete',
    'personnel:view',
    'personnel:manage',
    'finance:view',
    'finance:transact',
    'stock:view',
    'stock:manage',
    'trade:view',
    'trade:create_invoice',
    'reports:view_tax',
    'service:view',
    'service:manage',
    'system:view_code',
  ],
  Müdür: [
    'customer:view',
    'customer:create',
    'customer:edit',
    'personnel:view',
    'finance:view',
    'finance:transact',
    'stock:view',
    'stock:manage',
    'trade:view',
    'trade:create_invoice',
    'service:view',
    'service:manage',
  ],
  Muhasebe: [
    'customer:view',
    'customer:create',
    'customer:edit',
    'finance:view',
    'finance:transact',
    'trade:view',
    'trade:create_invoice',
    'reports:view_tax',
  ],
  Sorumlu: [
    'customer:view',
    'customer:create',
    'stock:view',
    'trade:view',
    'service:view',
    'service:manage',
  ],
  Personel: [
    'customer:view',
    'stock:view',
    'service:view',
  ],
};

export function hasPermission(role: string | undefined, permission: Permission): boolean {
  if (!role) return false;
  const userRole = role as UserRole;
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  return permissions.includes(permission);
}

export function hasAnyPermission(role: string | undefined, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

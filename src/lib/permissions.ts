import { UserData } from '@/app/dashboard/layout';

// =================================================================
// UTILITÀ PER GESTIONE RUOLI E PERMESSI
// =================================================================

export function isSuperAdmin(userData: UserData | null): boolean {
    return userData?.role === 'superAdmin';
}

export function isAdmin(userData: UserData | null): boolean {
    return userData?.role === 'admin' || userData?.role === 'superAdmin';
}

export function hasImpersonationAccess(userData: UserData | null): boolean {
    return isSuperAdmin(userData);
}

export function hasFullAdminAccess(userData: UserData | null): boolean {
    return isSuperAdmin(userData);
}

export function hasReadOnlyAdminAccess(userData: UserData | null): boolean {
    return userData?.role === 'admin';
}
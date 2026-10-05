import { ServisTipi } from '../types';

export const SERVIS_TIPI_ENUMS: readonly ServisTipi[] = [
  'PERIYODIK_BAKIM',
  'FILTRE_DEGISIMI',
  'ARIZA_ONARIM',
  'MONTAJ_KURULUM',
  'KESIF_DURUM_TESPITI',
] as const;

export const SERVIS_TIPI_LABELS: Record<ServisTipi, string> = {
  PERIYODIK_BAKIM: 'Periyodik Bakım & Filtre Değişimi',
  FILTRE_DEGISIMI: 'Filtre Değişimi',
  ARIZA_ONARIM: 'Arıza & Onarım',
  MONTAJ_KURULUM: 'Montaj & Yeni Kurulum',
  KESIF_DURUM_TESPITI: 'Keşif & Su Analizi',
};

export const SERVIS_TIPI_SHORT_LABELS: Record<ServisTipi, string> = {
  PERIYODIK_BAKIM: 'Periyodik Bakım',
  FILTRE_DEGISIMI: 'Filtre Değişimi',
  ARIZA_ONARIM: 'Arıza & Onarım',
  MONTAJ_KURULUM: 'Montaj & Kurulum',
  KESIF_DURUM_TESPITI: 'Keşif & Analiz',
};

export const SERVIS_TIPI_COLORS: Record<ServisTipi, { bg: string; text: string; border: string; dot: string }> = {
  PERIYODIK_BAKIM: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    dot: 'bg-indigo-500',
  },
  FILTRE_DEGISIMI: {
    bg: 'bg-cyan-50',
    text: 'text-cyan-700',
    border: 'border-cyan-200',
    dot: 'bg-cyan-500',
  },
  ARIZA_ONARIM: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
  },
  MONTAJ_KURULUM: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
  },
  KESIF_DURUM_TESPITI: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    dot: 'bg-purple-500',
  },
};

/**
 * Normalizes any string (enum code, Turkish label, or legacy free-text) to canonical ServisTipi enum.
 */
export function normalizeServiceType(raw?: string | null): ServisTipi {
  if (!raw) return 'PERIYODIK_BAKIM';
  const clean = String(raw).trim();

  // Direct enum match
  if (clean === 'PERIYODIK_BAKIM') return 'PERIYODIK_BAKIM';
  if (clean === 'FILTRE_DEGISIMI') return 'FILTRE_DEGISIMI';
  if (clean === 'ARIZA_ONARIM') return 'ARIZA_ONARIM';
  if (clean === 'MONTAJ_KURULUM') return 'MONTAJ_KURULUM';
  if (clean === 'KESIF_DURUM_TESPITI') return 'KESIF_DURUM_TESPITI';

  const lower = clean.toLowerCase();

  // Arıza / Onarım
  if (
    lower.includes('arıza') ||
    lower.includes('ariza') ||
    lower.includes('bozuk') ||
    lower.includes('onarım') ||
    lower.includes('onarim') ||
    lower.includes('şikayet') ||
    lower.includes('sikayet')
  ) {
    return 'ARIZA_ONARIM';
  }

  // Montaj / Kurulum
  if (
    lower.includes('montaj') ||
    lower.includes('kurulum') ||
    lower.includes('teslimat')
  ) {
    return 'MONTAJ_KURULUM';
  }

  // Keşif / Su Analizi
  if (
    lower.includes('keşif') ||
    lower.includes('kesif') ||
    lower.includes('analiz') ||
    lower.includes('tespit')
  ) {
    return 'KESIF_DURUM_TESPITI';
  }

  // Filtre Değişimi (yalnızca filtre değişimi vurgulandığında)
  if (
    (lower.includes('filtre') && !lower.includes('periyodik') && !lower.includes('bakım') && !lower.includes('bakim')) ||
    lower.includes('kartuş') ||
    lower.includes('kartus')
  ) {
    return 'FILTRE_DEGISIMI';
  }

  // Periyodik Bakım & Filtre Değişimi (varsayılan)
  return 'PERIYODIK_BAKIM';
}

/**
 * Returns canonical user-facing label for a service type.
 */
export function getServiceTypeLabel(raw?: string | null): string {
  const norm = normalizeServiceType(raw);
  return SERVIS_TIPI_LABELS[norm];
}

/**
 * Returns short label for badges and tables.
 */
export function getServiceTypeShortLabel(raw?: string | null): string {
  const norm = normalizeServiceType(raw);
  return SERVIS_TIPI_SHORT_LABELS[norm];
}

/**
 * Checks if a record matches a service type filter safely (regardless of whether enum or label is passed).
 */
export function isServiceTypeMatch(recordType?: string | null, filterType?: string | null): boolean {
  if (!filterType || filterType === 'ALL' || filterType === 'all') {
    return true;
  }
  return normalizeServiceType(recordType) === normalizeServiceType(filterType);
}

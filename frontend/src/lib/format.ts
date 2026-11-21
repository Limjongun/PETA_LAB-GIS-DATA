export function formatNumber(val: number | null | undefined, decimals = 2): string {
  if (val === null || val === undefined || Number.isNaN(Number(val))) return '—';
  const num = Number(val);
  if (Number.isInteger(num)) {
    return new Intl.NumberFormat('id-ID').format(num);
  }
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(num);
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return '0 KB';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1)).toLocaleString('id-ID')} ${sizes[i]}`;
}

export const COLOR_PALETTES: Record<string, string[]> = {
  viridis: ['#134e4a', '#0f766e', '#14b8a6', '#f59e0b', '#ea580c'],
  ylorrd: ['#fef3c7', '#fdba74', '#fb923c', '#ea580c', '#9a3412'],
  blues: ['#ccfbf1', '#5eead4', '#14b8a6', '#0f766e', '#134e4a'],
  greens: ['#dcfce7', '#86efac', '#22c55e', '#15803d', '#14532d'],
  rdylgn: ['#dc2626', '#f97316', '#facc15', '#14b8a6', '#15803d'],
  coolwarm: ['#0f766e', '#5eead4', '#cbd5e1', '#fb923c', '#ea580c'],
  magma: ['#0b1214', '#134e4a', '#0d9488', '#ea580c', '#fed7aa'],
  // Refined 2-tone Deep Tosca & Burnt Orange categorical spectrum
  categorical: ['#0f766e', '#ea580c', '#14b8a6', '#f59e0b', '#115e59', '#c2410c', '#5a7478', '#fb923c'],
};

/**
 * Truthful formatting helpers for Phase 1.
 * Ensures UNKNOWN != ZERO, UNAVAILABLE != ZERO, and NOT_CONFIGURED != ZERO.
 */

export function formatCurrency(val: number | null | undefined, decimals = 2): string {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return `$${val.toFixed(decimals)}`;
}

export function formatPercent(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return `${val}%`;
}

export function formatNumber(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return val.toLocaleString();
}

export function formatTokens(
  tokensIn: number | null | undefined,
  tokensOut: number | null | undefined
): string {
  if (tokensIn === null || tokensIn === undefined || tokensOut === null || tokensOut === undefined) {
    return '—';
  }
  return `${tokensIn.toLocaleString()} in / ${tokensOut.toLocaleString()} out`;
}

export function formatCpuCores(cores: number | null | undefined): string {
  if (cores === null || cores === undefined || isNaN(cores)) return '—';
  return `${cores} Cores vCPU`;
}

export function formatLoadAvg(load: number[] | null | undefined): string {
  if (!load || load.length === 0) return '—';
  return load.join(', ');
}

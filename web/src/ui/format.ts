/** Compact money/number formatting for big idle numbers. */
const UNITS = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi'];

export function money(n: number): string {
  return '$' + compact(n);
}

export function compact(n: number): string {
  const neg = n < 0;
  let x = Math.abs(n);
  if (x < 1000) {
    const s = x < 10 ? x.toFixed(2) : x < 100 ? x.toFixed(1) : x.toFixed(0);
    return (neg ? '-' : '') + s;
  }
  let u = 0;
  while (x >= 1000 && u < UNITS.length - 1) {
    x /= 1000;
    u++;
  }
  return (neg ? '-' : '') + x.toFixed(2) + UNITS[u];
}

/** Per-hour rate formatted as money/hr. */
export function rate(n: number): string {
  return money(n) + '/hr';
}

export function pct(n: number, digits = 1): string {
  return n.toFixed(digits) + '%';
}

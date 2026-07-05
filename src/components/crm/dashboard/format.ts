const usd = new Intl.NumberFormat("en-US");

// Dinero en USD entero: $12,500
export function fmtMoney(n: number): string {
  return `$${usd.format(Math.round(n))}`;
}

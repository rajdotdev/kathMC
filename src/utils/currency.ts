export function formatCurrency(amount: number): string {
  return amount.toFixed(2).replace(/\.00$/, '');
}

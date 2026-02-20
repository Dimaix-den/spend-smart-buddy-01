export function formatAmount(n: number): string {
  return Math.abs(n).toLocaleString("ru-RU");
}

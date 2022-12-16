export function getUTCOffset(): number {
  return new Date().getTimezoneOffset() / 60;
}

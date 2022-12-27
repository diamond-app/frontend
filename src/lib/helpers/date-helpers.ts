export function getUTCOffset(utcOffset = new Date().getTimezoneOffset()): number {
  return Math.round(utcOffset / 60);
}

export function localHourToUtcHour(localHour: number, utcOffset?: number): number {
  const utcHour = localHour + getUTCOffset(utcOffset);
  return utcHour < 0 ? utcHour + 24 : utcHour % 24;
}

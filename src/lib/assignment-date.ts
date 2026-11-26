const TOKYO_TIME_ZONE = "Asia/Tokyo";

export function parseAssignmentDueAt(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  if (year < 1000) return null;
  const tokyoDate = new Date(Date.UTC(year, month - 1, day, hour, minute));
  if (
    tokyoDate.getUTCFullYear() !== year ||
    tokyoDate.getUTCMonth() + 1 !== month ||
    tokyoDate.getUTCDate() !== day ||
    tokyoDate.getUTCHours() !== hour ||
    tokyoDate.getUTCMinutes() !== minute
  ) {
    return null;
  }
  return new Date(tokyoDate.getTime() - 9 * 60 * 60 * 1000);
}

export function toTokyoDateTimeLocal(date: Date) {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TOKYO_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map(({ type, value }) => [type, value]),
  );
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

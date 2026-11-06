const HOURS = /(\d+(?:[.,]\d+)?)\s*(?:h|hr|heures?)\b\s*(et demie|\d{1,2})?/i;
const COMPACT_HOURS = /(\d+)h(\d{2})\b/i;
const MINUTES = /(\d+)\s*(?:min|mins|minutes?|mn)\b/i;

/** Durée citée dans une instruction, en minutes. Sur « 10 à 15 min », retient 15. */
export function parseDurationMinutes(text: string): number | null {
  const compact = text.match(COMPACT_HOURS);
  if (compact) return Number(compact[1]) * 60 + Number(compact[2]);

  const hours = text.match(HOURS);
  if (hours) {
    const extra = hours[2]?.toLowerCase() === "et demie" ? 30 : Number(hours[2] ?? 0);
    return Math.round(Number(hours[1].replace(",", ".")) * 60 + extra);
  }

  const minutes = text.match(MINUTES);
  return minutes ? Number(minutes[1]) : null;
}

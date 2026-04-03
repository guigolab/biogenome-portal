export function pickLocalized(
   record: Record<string, string> | undefined,
   locale: string,
   fallback: string,
): string {
   if (!record || typeof record !== 'object') return fallback
   const direct = record[locale] ?? record.en
   if (typeof direct === 'string') return direct
   const first = Object.values(record).find((x) => typeof x === 'string')
   return typeof first === 'string' ? first : fallback
}

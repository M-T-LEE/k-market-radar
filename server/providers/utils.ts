export function numeric(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return 0;
  const parsed = Number(value.replace(/,/g, "").replace(/%/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseKoreanNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return 0;

  const normalized = value.replace(/,/g, "").replace(/\s+/g, "");
  let result = 0;
  const trillion = normalized.match(/([\d.]+)조/);
  const hundredMillion = normalized.match(/([\d.]+)억/);
  const tenThousand = normalized.match(/([\d.]+)만/);

  if (trillion) result += Number(trillion[1]) * 1000000000000;
  if (hundredMillion) result += Number(hundredMillion[1]) * 100000000;
  if (tenThousand) result += Number(tenThousand[1]) * 10000;

  return result || numeric(normalized);
}

export function toKoreanMarketCap(value: number) {
  return value / 100000000;
}

export async function fetchJson<T = any>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = typeof data?.message === "string" ? data.message : response.statusText;
    throw new Error(`${response.status} ${message}`);
  }

  return data as T;
}

function pushBusinessDateWindow(dates: string[], start: Date, targetCount: number) {
  const cursor = new Date(start);

  while (dates.length < targetCount) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) {
      const y = cursor.getFullYear();
      const m = String(cursor.getMonth() + 1).padStart(2, "0");
      const d = String(cursor.getDate()).padStart(2, "0");
      dates.push(`${y}${m}${d}`);
    }
    cursor.setDate(cursor.getDate() - 1);
  }
}

export function recentBusinessDates() {
  const dates: string[] = [];
  const today = new Date();
  const previousYear = new Date(today);
  previousYear.setFullYear(previousYear.getFullYear() - 1);

  pushBusinessDateWindow(dates, today, 10);
  pushBusinessDateWindow(dates, previousYear, 20);

  return Array.from(new Set(dates));
}

export function parseNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return 0;
  const parsed = Number(value.replace(/,/g, "").replace(/%/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseKoreanAmount(value: unknown) {
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

  return result || parseNumber(normalized);
}

export function toKoreanMarketCapUnit(valueInKrw: number) {
  return valueInKrw / 100000000;
}

export function getRuntimeEnv(key: string) {
  const runtime = globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  };

  return runtime.process?.env?.[key];
}

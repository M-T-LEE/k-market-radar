import { createStockFromUniverseQuote } from "../lib/stockUniverseFactory";
import type { Stock } from "../types/stock";
import { parseNumber } from "./providerUtils";

const CACHE_TTL_MS = 15 * 60 * 1000;
const MIN_US_MARKET_CAP_USD = 10_000_000_000;
const FMP_SCREENER_LIMIT = 700;
const FMP_BATCH_CHUNK_SIZE = 80;

const megaCapSymbols = [
  "AAPL",
  "MSFT",
  "NVDA",
  "GOOGL",
  "GOOG",
  "AMZN",
  "META",
  "AVGO",
  "TSLA",
  "BRK-B",
  "JPM",
  "WMT",
  "LLY",
  "V",
  "ORCL",
  "MA",
  "NFLX",
  "XOM",
  "COST",
  "JNJ",
  "HD",
  "PG",
  "ABBV",
  "BAC",
  "KO",
  "PLTR",
  "AMD",
  "CRM",
  "CSCO",
  "CVX",
  "IBM",
  "GE",
  "MCD",
  "MRK",
  "WFC",
  "ADBE",
  "LIN",
  "DIS",
  "QCOM",
  "TMO",
  "AMAT",
  "TXN",
  "INTU",
  "NOW",
  "ISRG",
  "UBER",
  "PEP",
  "CAT",
  "VRT",
  "ANET",
  "CRWD",
  "PANW",
  "MU",
  "ARM",
  "SMCI",
  "LRCX",
  "KLAC",
  "ASML",
  "TSM",
  "NVO"
];

type ReferenceCompany = {
  symbol: string;
  name: string;
  marketCap: number;
  exchange: string;
};

const additionalReferenceCompanies: ReferenceCompany[] = [
  { symbol: "UNH", name: "UnitedHealth Group", marketCap: 470_000_000_000, exchange: "NYSE" },
  { symbol: "ABT", name: "Abbott Laboratories", marketCap: 210_000_000_000, exchange: "NYSE" },
  { symbol: "DHR", name: "Danaher", marketCap: 180_000_000_000, exchange: "NYSE" },
  { symbol: "PFE", name: "Pfizer", marketCap: 160_000_000_000, exchange: "NYSE" },
  { symbol: "AMGN", name: "Amgen", marketCap: 160_000_000_000, exchange: "NASDAQ" },
  { symbol: "GILD", name: "Gilead Sciences", marketCap: 95_000_000_000, exchange: "NASDAQ" },
  { symbol: "BMY", name: "Bristol Myers Squibb", marketCap: 90_000_000_000, exchange: "NYSE" },
  { symbol: "MDT", name: "Medtronic", marketCap: 110_000_000_000, exchange: "NYSE" },
  { symbol: "SYK", name: "Stryker", marketCap: 150_000_000_000, exchange: "NYSE" },
  { symbol: "BSX", name: "Boston Scientific", marketCap: 130_000_000_000, exchange: "NYSE" },
  { symbol: "REGN", name: "Regeneron Pharmaceuticals", marketCap: 80_000_000_000, exchange: "NASDAQ" },
  { symbol: "VRTX", name: "Vertex Pharmaceuticals", marketCap: 120_000_000_000, exchange: "NASDAQ" },
  { symbol: "ZTS", name: "Zoetis", marketCap: 80_000_000_000, exchange: "NYSE" },
  { symbol: "HCA", name: "HCA Healthcare", marketCap: 95_000_000_000, exchange: "NYSE" },
  { symbol: "CI", name: "Cigna", marketCap: 85_000_000_000, exchange: "NYSE" },
  { symbol: "ELV", name: "Elevance Health", marketCap: 90_000_000_000, exchange: "NYSE" },
  { symbol: "CVS", name: "CVS Health", marketCap: 75_000_000_000, exchange: "NYSE" },
  { symbol: "GS", name: "Goldman Sachs", marketCap: 190_000_000_000, exchange: "NYSE" },
  { symbol: "MS", name: "Morgan Stanley", marketCap: 170_000_000_000, exchange: "NYSE" },
  { symbol: "AXP", name: "American Express", marketCap: 220_000_000_000, exchange: "NYSE" },
  { symbol: "C", name: "Citigroup", marketCap: 130_000_000_000, exchange: "NYSE" },
  { symbol: "SCHW", name: "Charles Schwab", marketCap: 140_000_000_000, exchange: "NYSE" },
  { symbol: "BLK", name: "BlackRock", marketCap: 150_000_000_000, exchange: "NYSE" },
  { symbol: "SPGI", name: "S&P Global", marketCap: 160_000_000_000, exchange: "NYSE" },
  { symbol: "MCO", name: "Moody's", marketCap: 90_000_000_000, exchange: "NYSE" },
  { symbol: "PGR", name: "Progressive", marketCap: 160_000_000_000, exchange: "NYSE" },
  { symbol: "CB", name: "Chubb", marketCap: 110_000_000_000, exchange: "NYSE" },
  { symbol: "MMC", name: "Marsh & McLennan", marketCap: 110_000_000_000, exchange: "NYSE" },
  { symbol: "ICE", name: "Intercontinental Exchange", marketCap: 100_000_000_000, exchange: "NYSE" },
  { symbol: "CME", name: "CME Group", marketCap: 80_000_000_000, exchange: "NASDAQ" },
  { symbol: "USB", name: "U.S. Bancorp", marketCap: 70_000_000_000, exchange: "NYSE" },
  { symbol: "COF", name: "Capital One", marketCap: 70_000_000_000, exchange: "NYSE" },
  { symbol: "PYPL", name: "PayPal", marketCap: 70_000_000_000, exchange: "NASDAQ" },
  { symbol: "HON", name: "Honeywell", marketCap: 140_000_000_000, exchange: "NASDAQ" },
  { symbol: "ETN", name: "Eaton", marketCap: 140_000_000_000, exchange: "NYSE" },
  { symbol: "BA", name: "Boeing", marketCap: 120_000_000_000, exchange: "NYSE" },
  { symbol: "RTX", name: "RTX", marketCap: 170_000_000_000, exchange: "NYSE" },
  { symbol: "LMT", name: "Lockheed Martin", marketCap: 110_000_000_000, exchange: "NYSE" },
  { symbol: "NOC", name: "Northrop Grumman", marketCap: 80_000_000_000, exchange: "NYSE" },
  { symbol: "GD", name: "General Dynamics", marketCap: 80_000_000_000, exchange: "NYSE" },
  { symbol: "DE", name: "Deere", marketCap: 130_000_000_000, exchange: "NYSE" },
  { symbol: "MMM", name: "3M", marketCap: 80_000_000_000, exchange: "NYSE" },
  { symbol: "UNP", name: "Union Pacific", marketCap: 140_000_000_000, exchange: "NYSE" },
  { symbol: "CSX", name: "CSX", marketCap: 70_000_000_000, exchange: "NASDAQ" },
  { symbol: "NSC", name: "Norfolk Southern", marketCap: 60_000_000_000, exchange: "NYSE" },
  { symbol: "UPS", name: "UPS", marketCap: 110_000_000_000, exchange: "NYSE" },
  { symbol: "WM", name: "Waste Management", marketCap: 90_000_000_000, exchange: "NYSE" },
  { symbol: "RSG", name: "Republic Services", marketCap: 70_000_000_000, exchange: "NYSE" },
  { symbol: "PH", name: "Parker-Hannifin", marketCap: 90_000_000_000, exchange: "NYSE" },
  { symbol: "ITW", name: "Illinois Tool Works", marketCap: 80_000_000_000, exchange: "NYSE" },
  { symbol: "EMR", name: "Emerson Electric", marketCap: 75_000_000_000, exchange: "NYSE" },
  { symbol: "CARR", name: "Carrier Global", marketCap: 60_000_000_000, exchange: "NYSE" },
  { symbol: "TT", name: "Trane Technologies", marketCap: 100_000_000_000, exchange: "NYSE" },
  { symbol: "JCI", name: "Johnson Controls", marketCap: 60_000_000_000, exchange: "NYSE" },
  { symbol: "COP", name: "ConocoPhillips", marketCap: 130_000_000_000, exchange: "NYSE" },
  { symbol: "SLB", name: "Schlumberger", marketCap: 60_000_000_000, exchange: "NYSE" },
  { symbol: "EOG", name: "EOG Resources", marketCap: 75_000_000_000, exchange: "NYSE" },
  { symbol: "PSX", name: "Phillips 66", marketCap: 60_000_000_000, exchange: "NYSE" },
  { symbol: "MPC", name: "Marathon Petroleum", marketCap: 60_000_000_000, exchange: "NYSE" },
  { symbol: "VLO", name: "Valero Energy", marketCap: 50_000_000_000, exchange: "NYSE" },
  { symbol: "OXY", name: "Occidental Petroleum", marketCap: 55_000_000_000, exchange: "NYSE" },
  { symbol: "LNG", name: "Cheniere Energy", marketCap: 50_000_000_000, exchange: "NYSE" },
  { symbol: "NEE", name: "NextEra Energy", marketCap: 150_000_000_000, exchange: "NYSE" },
  { symbol: "SO", name: "Southern Company", marketCap: 90_000_000_000, exchange: "NYSE" },
  { symbol: "DUK", name: "Duke Energy", marketCap: 80_000_000_000, exchange: "NYSE" },
  { symbol: "AEP", name: "American Electric Power", marketCap: 55_000_000_000, exchange: "NASDAQ" },
  { symbol: "EXC", name: "Exelon", marketCap: 40_000_000_000, exchange: "NASDAQ" },
  { symbol: "CEG", name: "Constellation Energy", marketCap: 100_000_000_000, exchange: "NASDAQ" },
  { symbol: "SRE", name: "Sempra", marketCap: 55_000_000_000, exchange: "NYSE" },
  { symbol: "WMB", name: "Williams Companies", marketCap: 70_000_000_000, exchange: "NYSE" },
  { symbol: "KMI", name: "Kinder Morgan", marketCap: 60_000_000_000, exchange: "NYSE" },
  { symbol: "APD", name: "Air Products", marketCap: 65_000_000_000, exchange: "NYSE" },
  { symbol: "SHW", name: "Sherwin-Williams", marketCap: 90_000_000_000, exchange: "NYSE" },
  { symbol: "ECL", name: "Ecolab", marketCap: 75_000_000_000, exchange: "NYSE" },
  { symbol: "FCX", name: "Freeport-McMoRan", marketCap: 60_000_000_000, exchange: "NYSE" },
  { symbol: "NEM", name: "Newmont", marketCap: 60_000_000_000, exchange: "NYSE" },
  { symbol: "SCCO", name: "Southern Copper", marketCap: 90_000_000_000, exchange: "NYSE" },
  { symbol: "ADI", name: "Analog Devices", marketCap: 120_000_000_000, exchange: "NASDAQ" },
  { symbol: "MRVL", name: "Marvell Technology", marketCap: 70_000_000_000, exchange: "NASDAQ" },
  { symbol: "NXPI", name: "NXP Semiconductors", marketCap: 60_000_000_000, exchange: "NASDAQ" },
  { symbol: "MCHP", name: "Microchip Technology", marketCap: 45_000_000_000, exchange: "NASDAQ" },
  { symbol: "ON", name: "ON Semiconductor", marketCap: 30_000_000_000, exchange: "NASDAQ" },
  { symbol: "MPWR", name: "Monolithic Power Systems", marketCap: 40_000_000_000, exchange: "NASDAQ" },
  { symbol: "CDNS", name: "Cadence Design Systems", marketCap: 85_000_000_000, exchange: "NASDAQ" },
  { symbol: "SNPS", name: "Synopsys", marketCap: 90_000_000_000, exchange: "NASDAQ" },
  { symbol: "INTC", name: "Intel", marketCap: 130_000_000_000, exchange: "NASDAQ" },
  { symbol: "DELL", name: "Dell Technologies", marketCap: 85_000_000_000, exchange: "NYSE" },
  { symbol: "HPE", name: "Hewlett Packard Enterprise", marketCap: 25_000_000_000, exchange: "NYSE" },
  { symbol: "HPQ", name: "HP", marketCap: 35_000_000_000, exchange: "NYSE" },
  { symbol: "WDC", name: "Western Digital", marketCap: 25_000_000_000, exchange: "NASDAQ" },
  { symbol: "STX", name: "Seagate Technology", marketCap: 25_000_000_000, exchange: "NASDAQ" },
  { symbol: "ACN", name: "Accenture", marketCap: 190_000_000_000, exchange: "NYSE" },
  { symbol: "SHOP", name: "Shopify", marketCap: 90_000_000_000, exchange: "NYSE" },
  { symbol: "SNOW", name: "Snowflake", marketCap: 60_000_000_000, exchange: "NYSE" },
  { symbol: "DDOG", name: "Datadog", marketCap: 45_000_000_000, exchange: "NASDAQ" },
  { symbol: "NET", name: "Cloudflare", marketCap: 35_000_000_000, exchange: "NYSE" },
  { symbol: "MDB", name: "MongoDB", marketCap: 25_000_000_000, exchange: "NASDAQ" },
  { symbol: "TEAM", name: "Atlassian", marketCap: 45_000_000_000, exchange: "NASDAQ" },
  { symbol: "FTNT", name: "Fortinet", marketCap: 75_000_000_000, exchange: "NASDAQ" },
  { symbol: "ZS", name: "Zscaler", marketCap: 35_000_000_000, exchange: "NASDAQ" },
  { symbol: "OKTA", name: "Okta", marketCap: 15_000_000_000, exchange: "NASDAQ" },
  { symbol: "ADSK", name: "Autodesk", marketCap: 60_000_000_000, exchange: "NASDAQ" },
  { symbol: "SAP", name: "SAP", marketCap: 300_000_000_000, exchange: "NYSE" },
  { symbol: "TMUS", name: "T-Mobile US", marketCap: 250_000_000_000, exchange: "NASDAQ" },
  { symbol: "VZ", name: "Verizon", marketCap: 180_000_000_000, exchange: "NYSE" },
  { symbol: "T", name: "AT&T", marketCap: 150_000_000_000, exchange: "NYSE" },
  { symbol: "CMCSA", name: "Comcast", marketCap: 140_000_000_000, exchange: "NASDAQ" },
  { symbol: "BKNG", name: "Booking Holdings", marketCap: 160_000_000_000, exchange: "NASDAQ" },
  { symbol: "ABNB", name: "Airbnb", marketCap: 90_000_000_000, exchange: "NASDAQ" },
  { symbol: "MAR", name: "Marriott International", marketCap: 80_000_000_000, exchange: "NASDAQ" },
  { symbol: "CMG", name: "Chipotle Mexican Grill", marketCap: 80_000_000_000, exchange: "NYSE" },
  { symbol: "YUM", name: "Yum! Brands", marketCap: 40_000_000_000, exchange: "NYSE" },
  { symbol: "LOW", name: "Lowe's", marketCap: 140_000_000_000, exchange: "NYSE" },
  { symbol: "TJX", name: "TJX Companies", marketCap: 140_000_000_000, exchange: "NYSE" },
  { symbol: "TGT", name: "Target", marketCap: 50_000_000_000, exchange: "NYSE" },
  { symbol: "NKE", name: "Nike", marketCap: 110_000_000_000, exchange: "NYSE" },
  { symbol: "SBUX", name: "Starbucks", marketCap: 100_000_000_000, exchange: "NASDAQ" },
  { symbol: "ORLY", name: "O'Reilly Automotive", marketCap: 80_000_000_000, exchange: "NASDAQ" },
  { symbol: "AZO", name: "AutoZone", marketCap: 70_000_000_000, exchange: "NYSE" },
  { symbol: "ROST", name: "Ross Stores", marketCap: 50_000_000_000, exchange: "NASDAQ" },
  { symbol: "MELI", name: "MercadoLibre", marketCap: 110_000_000_000, exchange: "NASDAQ" },
  { symbol: "GM", name: "General Motors", marketCap: 60_000_000_000, exchange: "NYSE" },
  { symbol: "F", name: "Ford Motor", marketCap: 45_000_000_000, exchange: "NYSE" },
  { symbol: "AMT", name: "American Tower", marketCap: 90_000_000_000, exchange: "NYSE" },
  { symbol: "PLD", name: "Prologis", marketCap: 110_000_000_000, exchange: "NYSE" },
  { symbol: "EQIX", name: "Equinix", marketCap: 90_000_000_000, exchange: "NASDAQ" },
  { symbol: "SPG", name: "Simon Property Group", marketCap: 60_000_000_000, exchange: "NYSE" },
  { symbol: "O", name: "Realty Income", marketCap: 50_000_000_000, exchange: "NYSE" },
  { symbol: "WELL", name: "Welltower", marketCap: 80_000_000_000, exchange: "NYSE" },
  { symbol: "DLR", name: "Digital Realty", marketCap: 60_000_000_000, exchange: "NYSE" }
];

export const largeCapSymbols = Array.from(new Set([...megaCapSymbols, ...additionalReferenceCompanies.map((company) => company.symbol)]));

export const referenceNames: Record<string, string> = {
  AAPL: "Apple",
  MSFT: "Microsoft",
  NVDA: "NVIDIA",
  GOOGL: "Alphabet Class A",
  GOOG: "Alphabet Class C",
  AMZN: "Amazon",
  META: "Meta Platforms",
  AVGO: "Broadcom",
  TSLA: "Tesla",
  "BRK-B": "Berkshire Hathaway",
  JPM: "JPMorgan Chase",
  WMT: "Walmart",
  LLY: "Eli Lilly",
  V: "Visa",
  ORCL: "Oracle",
  MA: "Mastercard",
  NFLX: "Netflix",
  XOM: "Exxon Mobil",
  COST: "Costco",
  JNJ: "Johnson & Johnson",
  HD: "Home Depot",
  PG: "Procter & Gamble",
  ABBV: "AbbVie",
  BAC: "Bank of America",
  KO: "Coca-Cola",
  PLTR: "Palantir",
  AMD: "AMD",
  CRM: "Salesforce",
  CSCO: "Cisco",
  CVX: "Chevron",
  IBM: "IBM",
  GE: "GE Aerospace",
  MCD: "McDonald's",
  MRK: "Merck",
  WFC: "Wells Fargo",
  ADBE: "Adobe",
  LIN: "Linde",
  DIS: "Disney",
  QCOM: "Qualcomm",
  TMO: "Thermo Fisher",
  AMAT: "Applied Materials",
  TXN: "Texas Instruments",
  INTU: "Intuit",
  NOW: "ServiceNow",
  ISRG: "Intuitive Surgical",
  UBER: "Uber",
  PEP: "PepsiCo",
  CAT: "Caterpillar",
  VRT: "Vertiv",
  ANET: "Arista Networks",
  CRWD: "CrowdStrike",
  PANW: "Palo Alto Networks",
  MU: "Micron",
  ARM: "Arm Holdings",
  SMCI: "Super Micro Computer",
  LRCX: "Lam Research",
  KLAC: "KLA",
  ASML: "ASML",
  TSM: "Taiwan Semiconductor",
  NVO: "Novo Nordisk"
};

export const referenceMarketCapsUsd: Record<string, number> = {
  AAPL: 3_300_000_000_000,
  MSFT: 3_200_000_000_000,
  NVDA: 4_000_000_000_000,
  GOOGL: 2_200_000_000_000,
  GOOG: 2_200_000_000_000,
  AMZN: 2_300_000_000_000,
  META: 1_700_000_000_000,
  AVGO: 1_400_000_000_000,
  TSLA: 1_100_000_000_000,
  "BRK-B": 1_000_000_000_000,
  JPM: 800_000_000_000,
  WMT: 800_000_000_000,
  LLY: 750_000_000_000,
  V: 700_000_000_000,
  ORCL: 650_000_000_000,
  MA: 550_000_000_000,
  NFLX: 500_000_000_000,
  XOM: 500_000_000_000,
  COST: 450_000_000_000,
  JNJ: 390_000_000_000,
  HD: 380_000_000_000,
  PG: 380_000_000_000,
  ABBV: 360_000_000_000,
  BAC: 340_000_000_000,
  KO: 300_000_000_000,
  PLTR: 300_000_000_000,
  AMD: 280_000_000_000,
  CRM: 260_000_000_000,
  CSCO: 250_000_000_000,
  CVX: 250_000_000_000,
  IBM: 250_000_000_000,
  GE: 240_000_000_000,
  MCD: 220_000_000_000,
  MRK: 220_000_000_000,
  WFC: 220_000_000_000,
  ADBE: 200_000_000_000,
  LIN: 200_000_000_000,
  DIS: 200_000_000_000,
  QCOM: 190_000_000_000,
  TMO: 190_000_000_000,
  AMAT: 180_000_000_000,
  TXN: 170_000_000_000,
  INTU: 170_000_000_000,
  NOW: 170_000_000_000,
  ISRG: 160_000_000_000,
  UBER: 160_000_000_000,
  PEP: 160_000_000_000,
  CAT: 150_000_000_000,
  VRT: 80_000_000_000,
  ANET: 130_000_000_000,
  CRWD: 120_000_000_000,
  PANW: 120_000_000_000,
  MU: 120_000_000_000,
  ARM: 130_000_000_000,
  SMCI: 40_000_000_000,
  LRCX: 120_000_000_000,
  KLAC: 110_000_000_000,
  ASML: 300_000_000_000,
  TSM: 1_000_000_000_000,
  NVO: 400_000_000_000
};

export const referenceExchanges: Record<string, string> = {
  AAPL: "NASDAQ",
  MSFT: "NASDAQ",
  NVDA: "NASDAQ",
  GOOGL: "NASDAQ",
  GOOG: "NASDAQ",
  AMZN: "NASDAQ",
  META: "NASDAQ",
  AVGO: "NASDAQ",
  TSLA: "NASDAQ",
  "BRK-B": "NYSE",
  JPM: "NYSE",
  WMT: "NYSE",
  LLY: "NYSE",
  V: "NYSE",
  ORCL: "NYSE",
  MA: "NYSE",
  NFLX: "NASDAQ",
  XOM: "NYSE",
  COST: "NASDAQ",
  JNJ: "NYSE",
  HD: "NYSE",
  PG: "NYSE",
  ABBV: "NYSE",
  BAC: "NYSE",
  KO: "NYSE",
  PLTR: "NASDAQ",
  AMD: "NASDAQ",
  CRM: "NYSE",
  CSCO: "NASDAQ",
  CVX: "NYSE",
  IBM: "NYSE",
  GE: "NYSE",
  MCD: "NYSE",
  MRK: "NYSE",
  WFC: "NYSE",
  ADBE: "NASDAQ",
  LIN: "NASDAQ",
  DIS: "NYSE",
  QCOM: "NASDAQ",
  TMO: "NYSE",
  AMAT: "NASDAQ",
  TXN: "NASDAQ",
  INTU: "NASDAQ",
  NOW: "NYSE",
  ISRG: "NASDAQ",
  UBER: "NYSE",
  PEP: "NASDAQ",
  CAT: "NYSE",
  VRT: "NYSE",
  ANET: "NYSE",
  CRWD: "NASDAQ",
  PANW: "NASDAQ",
  MU: "NASDAQ",
  ARM: "NASDAQ",
  SMCI: "NASDAQ",
  LRCX: "NASDAQ",
  KLAC: "NASDAQ",
  ASML: "NASDAQ",
  TSM: "NYSE",
  NVO: "NYSE"
};

additionalReferenceCompanies.forEach((company) => {
  if (!referenceNames[company.symbol]) {
    referenceNames[company.symbol] = company.name;
  }
  if (!referenceMarketCapsUsd[company.symbol]) {
    referenceMarketCapsUsd[company.symbol] = company.marketCap;
  }
  if (!referenceExchanges[company.symbol]) {
    referenceExchanges[company.symbol] = company.exchange;
  }
});

type FmpQuote = Record<string, unknown> & {
  symbol?: string;
  name?: string;
  companyName?: string;
  price?: number | string;
  change?: number | string;
  changePercentage?: number | string;
  changesPercentage?: number | string;
  changesPercent?: number | string;
  changePercent?: number | string;
  volume?: number | string;
  marketCap?: number | string;
  mktCap?: number | string;
  exchange?: string;
  exchangeShortName?: string;
  timestamp?: number | string;
};

export type FmpUniverseFailure = {
  symbol: string;
  status?: number;
  message: string;
};

export type FmpUniverseResult = {
  stocks: Stock[];
  requested: number;
  loaded: number;
  failures: FmpUniverseFailure[];
  usedBatch: boolean;
  warning?: string;
};

let cache: { expiresAt: number; result: FmpUniverseResult } | null = null;

function assertServerSide() {
  if (typeof window !== "undefined") {
    throw new Error("fmpUniverseProvider must be called server-side only");
  }
}

function normalizeSymbol(symbol: unknown) {
  return String(symbol ?? "")
    .trim()
    .toUpperCase()
    .replace(/\./g, "-");
}

function toFmpRequestSymbol(symbol: string) {
  return symbol === "BRK-B" ? "BRK.B" : symbol;
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function getErrorField(data: unknown) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return "";
  const record = data as Record<string, unknown>;
  const value =
    record["Error Message"] ??
    record.error ??
    record.message ??
    record.Message ??
    record.Error;

  return typeof value === "string" ? value : "";
}

function createBodySnippet(data: unknown) {
  if (typeof data === "string") return data.slice(0, 240);
  try {
    return JSON.stringify(data).slice(0, 240);
  } catch {
    return "unreadable response body";
  }
}

async function readResponseBody(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function assertFmpQuoteArray(data: unknown, context: string, status?: number): FmpQuote[] {
  const errorField = getErrorField(data);
  if (errorField) {
    throw new Error(`FMP ${context}: ${status ?? "ok"} ${errorField}`);
  }

  if (!Array.isArray(data)) {
    throw new Error(`FMP ${context}: expected array, received ${createBodySnippet(data)}`);
  }

  const itemError = data.map(getErrorField).find(Boolean);
  if (itemError) {
    throw new Error(`FMP ${context}: ${status ?? "ok"} ${itemError}`);
  }

  return data as FmpQuote[];
}

async function fetchFmpJson(url: string, context: string) {
  const response = await fetch(url);
  const data = await readResponseBody(response);

  if (!response.ok) {
    throw new Error(`FMP ${context}: ${response.status} ${createBodySnippet(data)}`);
  }

  return assertFmpQuoteArray(data, context, response.status);
}

async function fetchFmpBatchQuotes(symbols: string[], apiKey: string) {
  const quoteChunks = await Promise.all(
    chunkArray(symbols, FMP_BATCH_CHUNK_SIZE).map(async (chunk) => {
      const requestSymbols = chunk.map(toFmpRequestSymbol).join(",");
      const url = `https://financialmodelingprep.com/stable/batch-quote?symbols=${encodeURIComponent(requestSymbols)}&apikey=${encodeURIComponent(apiKey)}`;
      return fetchFmpJson(url, `batch-quote ${chunk.length} symbols`);
    })
  );
  const data = quoteChunks.flat();
  if (!data.length) {
    throw new Error("FMP batch-quote: empty response");
  }

  return data;
}

async function fetchFmpScreenerQuotes(apiKey: string) {
  const exchanges = ["NASDAQ", "NYSE", "AMEX"];
  const results = await Promise.allSettled(
    exchanges.map(async (exchange) => {
      const url = `https://financialmodelingprep.com/stable/company-screener?marketCapMoreThan=${MIN_US_MARKET_CAP_USD}&exchange=${encodeURIComponent(exchange)}&limit=${FMP_SCREENER_LIMIT}&apikey=${encodeURIComponent(apiKey)}`;
      return fetchFmpJson(url, `company-screener ${exchange}`);
    })
  );

  const quotes: FmpQuote[] = [];
  const failures: FmpUniverseFailure[] = [];

  results.forEach((result, index) => {
    const exchange = exchanges[index];
    if (result.status === "fulfilled") {
      quotes.push(...result.value);
      return;
    }

    failures.push({
      symbol: `SCREENER-${exchange}`,
      message: result.reason instanceof Error ? result.reason.message : String(result.reason)
    });
  });

  return { quotes, failures };
}

async function fetchFmpQuote(symbol: string, apiKey: string) {
  const requestSymbol = toFmpRequestSymbol(symbol);
  const url = `https://financialmodelingprep.com/stable/quote?symbol=${encodeURIComponent(requestSymbol)}&apikey=${encodeURIComponent(apiKey)}`;
  const data = await fetchFmpJson(url, `quote ${symbol}`);
  const quote = data[0];
  if (!quote?.symbol || !parseNumber(quote.price)) {
    throw new Error(`FMP quote ${symbol}: empty`);
  }

  return quote;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<R>,
  getSymbol: (item: T) => string
) {
  const results: R[] = [];
  const failures: FmpUniverseFailure[] = [];
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      const item = items[index];
      try {
        results.push(await mapper(item));
      } catch (error) {
        failures.push({
          symbol: getSymbol(item),
          message: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  await Promise.all(Array.from({ length: limit }, worker));
  return { results, failures };
}

function getChangeRate(quote: FmpQuote) {
  return parseNumber(
    quote.changePercentage ??
      quote.changesPercentage ??
      quote.changesPercent ??
      quote.changePercent
  );
}

function normalizeUsExchange(exchange: unknown, symbol: string) {
  const value = String(exchange ?? "").toUpperCase();
  if (value.includes("NASDAQ")) return "NASDAQ";
  if (value.includes("NYSE")) return "NYSE";
  if (value.includes("AMEX")) return "AMEX";
  if (!referenceExchanges[symbol]) return "US";
  return referenceExchanges[symbol] ?? "US";
}

function normalizeFmpQuote(quote: FmpQuote, requestedSymbol?: string): Stock | null {
  const symbol = normalizeSymbol(requestedSymbol ?? quote.symbol);
  const marketCap = parseNumber(quote.marketCap ?? quote.mktCap) || referenceMarketCapsUsd[symbol] || 0;
  if (!marketCap) {
    throw new Error(`FMP quote ${symbol}: missing marketCap`);
  }
  if (marketCap < MIN_US_MARKET_CAP_USD) return null;

  const price = parseNumber(quote.price);
  if (!price) {
    throw new Error(`FMP quote ${symbol}: missing price`);
  }

  const timestampValue = parseNumber(quote.timestamp);
  const timestamp = timestampValue ? new Date(timestampValue * 1000).toISOString() : new Date().toISOString();
  const market = marketCap >= 100_000_000_000 ? "US Large Cap" : "US Growth";

  return createStockFromUniverseQuote({
    name: quote.name ?? quote.companyName ?? referenceNames[symbol] ?? symbol,
    ticker: symbol,
    market,
    exchange: normalizeUsExchange(quote.exchange ?? quote.exchangeShortName, symbol),
    price,
    change: parseNumber(quote.change),
    changeRate: getChangeRate(quote),
    volume: parseNumber(quote.volume),
    marketCap: marketCap / 100_000_000,
    source: "FMP",
    sourceLabel: "FMP 참고 시세",
    updatedAt: timestamp,
    assetType: ["TSM", "ASML", "NVO", "ARM"].includes(symbol) ? "ADR" : "COMMON"
  });
}

function formatFailures(failures: FmpUniverseFailure[]) {
  return failures
    .slice(0, 5)
    .map((failure) => `${failure.symbol}${failure.status ? ` ${failure.status}` : ""} ${failure.message}`)
    .join("; ");
}

function buildResult(
  stocks: Stock[],
  failures: FmpUniverseFailure[],
  usedBatch: boolean,
  requested = largeCapSymbols.length
): FmpUniverseResult {
  return {
    stocks,
    requested,
    loaded: stocks.length,
    failures,
    usedBatch,
    warning: failures.length
      ? `FMP partial: ${stocks.length}/${requested} loaded. sample failures: ${formatFailures(failures)}`
      : undefined
  };
}

function normalizeQuoteList(quotes: FmpQuote[], requestedSymbols = largeCapSymbols) {
  const failures: FmpUniverseFailure[] = [];
  const stocks: Stock[] = [];
  const quoteBySymbol = new Map<string, FmpQuote>();

  quotes.forEach((quote) => {
    const symbol = normalizeSymbol(quote.symbol);
    if (symbol) quoteBySymbol.set(symbol, quote);
  });

  requestedSymbols.forEach((symbol) => {
    const quote = quoteBySymbol.get(normalizeSymbol(symbol));
    if (!quote) {
      failures.push({ symbol, message: "FMP batch quote missing symbol" });
      return;
    }

    try {
      const stock = normalizeFmpQuote(quote, symbol);
      if (stock) {
        stocks.push(stock);
      } else {
        failures.push({ symbol, message: "FMP batch quote below marketCap threshold" });
      }
    } catch (error) {
      failures.push({
        symbol,
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  return { stocks, failures };
}

function normalizeScreenerQuotes(quotes: FmpQuote[]) {
  const failures: FmpUniverseFailure[] = [];
  const stocksByTicker = new Map<string, Stock>();

  quotes.forEach((quote) => {
    const symbol = normalizeSymbol(quote.symbol);
    if (!symbol) return;

    try {
      const stock = normalizeFmpQuote(quote, symbol);
      if (stock) {
        stocksByTicker.set(stock.ticker, stock);
      }
    } catch (error) {
      failures.push({
        symbol,
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  return { stocks: Array.from(stocksByTicker.values()), failures };
}

export async function getFmpUsUniverseResult(apiKey: string | undefined, options: { forceRefresh?: boolean } = {}) {
  assertServerSide();

  if (!apiKey) {
    throw new Error("FMP API key is missing");
  }

  if (!options.forceRefresh && cache && cache.expiresAt > Date.now()) {
    return cache.result;
  }

  let stocks: Stock[] = [];
  let failures: FmpUniverseFailure[] = [];
  let usedBatch = true;
  const screenerFailures: FmpUniverseFailure[] = [];

  try {
    const screener = await fetchFmpScreenerQuotes(apiKey);
    const normalized = normalizeScreenerQuotes(screener.quotes);
    if (normalized.stocks.length >= 80) {
      const result = buildResult(
        normalized.stocks,
        [...screener.failures, ...normalized.failures],
        false,
        screener.quotes.length || normalized.stocks.length
      );
      cache = {
        expiresAt: Date.now() + CACHE_TTL_MS,
        result
      };
      return result;
    }

    screenerFailures.push(...screener.failures);
    screenerFailures.push({
      symbol: "SCREENER",
      message: `FMP company-screener loaded too few rows: ${normalized.stocks.length}`
    });
  } catch (error) {
    screenerFailures.push({
      symbol: "SCREENER",
      message: error instanceof Error ? error.message : String(error)
    });
  }

  try {
    const batchQuotes = await fetchFmpBatchQuotes(largeCapSymbols, apiKey);
    const normalized = normalizeQuoteList(batchQuotes);
    stocks = normalized.stocks;
    failures = normalized.failures;
  } catch (error) {
    usedBatch = false;
    const batchFailure: FmpUniverseFailure = {
      symbol: "BATCH",
      message: error instanceof Error ? error.message : String(error)
    };

    const fallback = await mapWithConcurrency(
      largeCapSymbols,
      4,
      async (symbol) => {
        const quote = await fetchFmpQuote(symbol, apiKey);
        const stock = normalizeFmpQuote(quote, symbol);
        if (!stock) {
          throw new Error(`FMP quote ${symbol}: below marketCap threshold`);
        }
        return stock;
      },
      (symbol) => symbol
    );

    stocks = fallback.results;
    failures = [batchFailure, ...fallback.failures];
  }

  if (!stocks.length) {
    failures = [...screenerFailures, ...failures];
    throw new Error(`FMP US universe is empty. sample failures: ${formatFailures(failures) || "no response details"}`);
  }

  const result = buildResult(stocks, failures, usedBatch);
  cache = {
    expiresAt: Date.now() + CACHE_TTL_MS,
    result
  };

  return result;
}

export async function getFmpUsUniverse(apiKey: string | undefined, options: { forceRefresh?: boolean } = {}) {
  const result = await getFmpUsUniverseResult(apiKey, options);
  return result.stocks;
}

export function getReferenceUsUniverse() {
  return largeCapSymbols.map((symbol, index) => {
    const marketCap = referenceMarketCapsUsd[symbol] ?? 50_000_000_000;
    return createStockFromUniverseQuote({
      name: referenceNames[symbol] ?? symbol,
      ticker: symbol,
      market: marketCap >= 100_000_000_000 ? "US Large Cap" : "US Growth",
      exchange: referenceExchanges[symbol] ?? "US",
      price: 80 + index * 7,
      changeRate: ((index % 9) - 4) * 1.2,
      volume: 1_000_000 + index * 230_000,
      marketCap: marketCap / 100_000_000,
      source: "REFERENCE",
      sourceLabel: "미국 핵심 상장사 기준 universe",
      updatedAt: new Date().toISOString(),
      assetType: ["TSM", "ASML", "NVO", "ARM"].includes(symbol) ? "ADR" : "COMMON"
    });
  });
}

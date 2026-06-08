import { createRateLimiter, type RateLimiter } from "./rateLimiter";

// Server-side client scaffold. Do not import this directly into React UI code:
// browsers do not allow applications to set User-Agent or Accept-Encoding.
export const SEC_BASE_URL = "https://data.sec.gov";
export const SEC_DEFAULT_ACCEPT_ENCODING = "gzip, deflate";
export const SEC_MAX_REQUESTS_PER_SECOND = 10;

export interface SecEdgarClientOptions {
  userAgent: string;
  acceptEncoding?: string;
  requestsPerSecond?: number;
  fetcher?: typeof fetch;
}

export function buildSecEdgarHeaders({
  userAgent,
  acceptEncoding = SEC_DEFAULT_ACCEPT_ENCODING
}: Pick<SecEdgarClientOptions, "userAgent" | "acceptEncoding">) {
  return {
    "User-Agent": userAgent,
    "Accept-Encoding": acceptEncoding,
    Accept: "application/json"
  };
}

export class SecEdgarClient {
  private readonly fetcher: typeof fetch;
  private readonly headers: ReturnType<typeof buildSecEdgarHeaders>;
  private readonly limiter: RateLimiter;

  constructor(options: SecEdgarClientOptions) {
    this.fetcher = options.fetcher ?? fetch;
    this.headers = buildSecEdgarHeaders(options);
    this.limiter = createRateLimiter(
      Math.min(options.requestsPerSecond ?? SEC_MAX_REQUESTS_PER_SECOND, SEC_MAX_REQUESTS_PER_SECOND)
    );
  }

  async getJson<T>(pathOrUrl: string): Promise<T> {
    const url = pathOrUrl.startsWith("http")
      ? pathOrUrl
      : `${SEC_BASE_URL}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;

    return this.limiter.schedule(async () => {
      const response = await this.fetcher(url, {
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`SEC EDGAR request failed: ${response.status} ${response.statusText}`);
      }

      return response.json() as Promise<T>;
    });
  }
}

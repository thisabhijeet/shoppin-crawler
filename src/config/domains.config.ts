interface DomainConfig {
  enabled: boolean;
  baseUrl: string;
  productUrlPatterns: string[];
  allowedDomains: string[];
  maxDepth: number;
  crawlDelay: number;
  retryAttempts: number;
}

interface Config {
  domains: Record<string, DomainConfig>;
}

const config: Config = {
  domains: {
    "snitch.co.in": {
      enabled: true,
      baseUrl: "https://www.snitch.co.in",
      productUrlPatterns: ["/products/"],
      allowedDomains: ["snitch.co.in"],
      maxDepth: 3,
      crawlDelay: 1000,
      retryAttempts: 3,
    },
    "newme.asia": {
      enabled: true,
      baseUrl: "https://newme.asia",
      productUrlPatterns: ["/product/"],
      allowedDomains: ["newme.asia"],
      maxDepth: 4,
      crawlDelay: 2000,
      retryAttempts: 3,
    },
  },
};

export default config;
export type { DomainConfig, Config };

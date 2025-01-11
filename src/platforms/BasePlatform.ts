import config, { DomainConfig } from "../config/domains.config.js";

class BasePlatform {
  protected config: DomainConfig;

  constructor(domain: string) {
    this.config = config.domains[domain];
    if (!this.config) {
      throw new Error(`No configuration found for domain: ${domain}`);
    }
  }

  isProductUrl(url: string): boolean {
    return this.config.productUrlPatterns.some((pattern) =>
      url.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  isValidDomain(url: string): boolean {
    const urlObj = new URL(url);
    return this.config.allowedDomains.some((domain) =>
      urlObj.hostname.includes(domain)
    );
  }
}

export { BasePlatform };

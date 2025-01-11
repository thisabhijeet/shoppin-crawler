import puppeteer, { Browser, Page } from "puppeteer";
import { URL } from "url";
import winston from "winston";
import { getPlatform } from "./platforms/index.js";
import config, { Config } from "./config/domains.config.js";

class ProductCrawler {
  private config: Config;
  private enabledDomains: string[];
  private results: Map<string, string[]>;
  private logger: winston.Logger;

  constructor() {
    this.config = config;

    // Filter enabled domains
    this.enabledDomains = Object.entries(this.config.domains)
      .filter(([_, settings]) => settings.enabled)
      .map(([domain]) => domain);

    this.results = new Map();

    // Initialize logger
    this.logger = winston.createLogger({
      level: "info",
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.simple(),
        }),
      ],
    });

    this.logger.info("Enabled domains:", this.enabledDomains);
  }

  async crawlDomains(): Promise<Record<string, string[]>> {
    this.logger.info("Starting crawler for domains:", this.enabledDomains);

    const browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--disable-notifications",
        "--disable-geolocation",
        "--disable-permissions-api",
      ],
      protocolTimeout: 600000, // 6 mins, scrolling should be over within this time
    });

    const promises = this.enabledDomains.map((domain) =>
      this.crawlDomain(domain, browser)
    );

    try {
      await Promise.all(promises);
    } finally {
      await browser.close();
    }

    return this.formatResults();
  }

  private async crawlDomain(domain: string, browser: Browser): Promise<void> {
    const domainConfig = this.config.domains[domain];

    const platform = getPlatform(domain);
    if (!platform) {
      this.logger.error(`No platform handler for domain: ${domain}`);
      return;
    }

    this.logger.info(`Starting crawl for domain: ${domain}`);
    const visited = new Set<string>();
    const productUrls = new Set<string>();
    const queue = [domainConfig.baseUrl];

    // Mark initial URL as visited
    visited.add(queue[0]);

    // Control concurrency
    const maxConcurrentPages = 5;

    while (
      queue.length > 0 &&
      visited.size < domainConfig.maxDepth * 100 &&
      productUrls.size < 1000
    ) {
      // Process URLs in batches
      const batch = queue.splice(0, maxConcurrentPages);

      // Process batch concurrently
      await Promise.all(
        batch.map(async (url) => {
          try {
            const page = await browser.newPage();
            page.setDefaultNavigationTimeout(30000);

            this.logger.info(`Navigating to: ${url}`);
            await page.goto(url, { waitUntil: "domcontentloaded" });

            await this.handleInfiniteScroll(page);

            const links = await page.evaluate(() =>
              Array.from(document.querySelectorAll("a"))
                .map((a) => a.href)
                .filter(
                  (href) =>
                    href &&
                    (href.startsWith("http://") || href.startsWith("https://"))
                )
            );

            this.logger.debug(`Found ${links.length} links on ${url}`);

            // Process links
            for (const link of links) {
              // Remove trailing slash
              const normalizedLink = link.endsWith("/")
                ? link.slice(0, -1)
                : link;
              if (
                platform.isProductUrl(normalizedLink) &&
                platform.isValidDomain(normalizedLink) &&
                !visited.has(normalizedLink)
              ) {
                productUrls.add(normalizedLink);
                // this.logger.info(`Found product URL: ${normalizedLink}`);
              } else if (this.shouldCrawl(normalizedLink, domain, visited)) {
                queue.push(normalizedLink);
                // this.logger.info(`Found crawlable URL: ${normalizedLink}`);
              }
              visited.add(normalizedLink);
            }

            await page.close();
          } catch (error) {
            this.logger.error(`Error crawling ${url}:`, {
              error: error instanceof Error ? error.message : "Unknown error",
              stack: error instanceof Error ? error.stack : undefined,
            });
          }
        })
      );
    }

    this.results.set(domain, Array.from(productUrls));
  }

  private async handleInfiniteScroll(page: Page): Promise<void> {
    try {
      await page.evaluate(async () => {
        await new Promise<void>((resolve, reject) => {
          let totalHeight = 0;
          const distance = 100;
          const delay = 500;
          const bottomDelay = 500;
          const maxScrollTime = 60000; // 60 second timeout

          const timer = setInterval(async () => {
            const scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;

            if (totalHeight >= scrollHeight) {
              await new Promise((r) => setTimeout(r, bottomDelay));
              const newScrollHeight = document.body.scrollHeight;
              if (newScrollHeight === scrollHeight) {
                clearInterval(timer);
                resolve();
              } else {
                totalHeight = 0;
              }
            }
          }, delay);

          // Below piece of code can be used to manipulate maxScrollTime -> Infinite Scrolling
          // setTimeout(() => {
          //   clearInterval(timer);
          //   resolve(); // Resolve instead of reject to continue crawling
          // }, maxScrollTime);
        });
      });
    } catch (error) {
      this.logger.error("Error during infinite scroll:", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  private shouldCrawl(
    url: string,
    domain: string,
    visited: Set<string>
  ): boolean {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.hostname.includes(domain) && !visited.has(url);
    } catch {
      return false;
    }
  }

  private formatResults(): Record<string, string[]> {
    const output: Record<string, string[]> = {};
    for (const [domain, urls] of this.results) {
      output[domain] = [...new Set(urls)]; // Ensure uniqueness
    }
    return output;
  }
}

export default ProductCrawler;

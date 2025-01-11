// const ProductCrawler = require("./ProductCrawler.ts");
import ProductCrawler from "./ProductCrawler.js";
import fs from "fs";

async function main() {
  const crawler = new ProductCrawler();

  try {
    const results = await crawler.crawlDomains();
    console.log(JSON.stringify(results, null, 2));

    fs.writeFileSync("product-urls.json", JSON.stringify(results, null, 2));
  } catch (error) {
    console.error("Crawling failed:", error);
  }
}

main();

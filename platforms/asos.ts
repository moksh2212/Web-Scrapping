import { Page } from "puppeteer";
import { Platform, Listing } from "./base";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class Asos implements Platform {
  name = "asos";

  async scrapeSearchPage(
    page: Page,
    keyword: string,
    limit: number,
  ): Promise<string[]> {
    const urls: string[] = [];
    const url = `https://www.asos.com/search/?q=${encodeURIComponent(keyword)}`;

    try {
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });

      await delay(3000);

      await page.evaluate(() => {
        window.scrollTo(0, 1000);
      });
      await delay(2000);

      await page.evaluate(() => {
        window.scrollTo(0, 2000);
      });
      await delay(2000);

      const items = await page.evaluate(() => {
        const urlList: string[] = [];
        const allLinks = document.querySelectorAll("a");

        allLinks.forEach((link) => {
          const href = link.getAttribute("href");
          if (href && href.includes("/prd/")) {
            const absoluteUrl = href.startsWith("http")
              ? href
              : `https://www.asos.com${href}`;

            if (!urlList.includes(absoluteUrl)) {
              urlList.push(absoluteUrl);
            }
          }
        });

        return urlList;
      });

      console.log(`Found ${items.length} product links`);
      urls.push(...items.slice(0, limit));
    } catch (error) {
      console.error(`Error scraping:`, error);
    }

    return urls;
  }

  async scrapeItemPage(page: Page): Promise<Listing> {
    await page.waitForSelector('h1, [data-testid="product-title"]', {
      timeout: 30000,
    });

    const listing = await page.evaluate(() => {
      let title = "N/A";
      const titleElement =
        document.querySelector('[data-testid="product-title"]') ||
        document.querySelector("h1");

      if (titleElement?.textContent) {
        title = titleElement.textContent.trim();
      }

      let priceText = "N/A";
      const priceElement =
        document.querySelector('[data-testid="current-price"]') ||
        document.querySelector('[data-testid="price-screenreader-only-text"]');

      if (priceElement?.textContent) {
        priceText = priceElement.textContent.trim();
      }

      if (priceText === "N/A") {
        const allText = document.body.innerText;
        const priceMatch = allText.match(/[£$€]\s*[\d.,]+/);
        if (priceMatch) {
          priceText = priceMatch[0].trim();
        }
      }

      let price = 0;
      if (priceText !== "N/A") {
        const cleanPrice = priceText
          .replace(/Now\s+/i, "")

          .replace(/[£$€\s]/g, "")
          .replace(",", ".");
        price = parseFloat(cleanPrice) || 0;
      }

      return {
        title,
        price,
        url: window.location.href,
      };
    });

    return listing;
  }
}

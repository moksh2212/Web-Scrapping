import { Page } from "puppeteer";
import { Listing, Platform } from "./base";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class Marktplaats implements Platform {
  name = "marktplaats";

  private async handleCookieConsent(page: Page): Promise<void> {
    try {
      await delay(1500);

      const clicked = await page.evaluate(() => {
        const continueButton = document.querySelector("button.cwa");
        if (continueButton && continueButton instanceof HTMLElement) {
          continueButton.click();
          return "continue-without-accepting";
        }

        const acceptButton = document.querySelector(
          'button.primary[title="Accepteren"]',
        );
        if (acceptButton && acceptButton instanceof HTMLElement) {
          acceptButton.click();
          return "accept";
        }

        return null;
      });

      if (clicked) {
        console.log(`Cookie consent handled: ${clicked}`);
        await delay(2000);
      }
    } catch (error) {
      console.log("Cookie consent handling skipped:", error);
    }
  }

  // THEIR IMPLEMENTATION - with pagination (from marktplaats branch)
  async scrapeSearchPage(
    page: Page,
    keyword: string,
    limit: number,
  ): Promise<string[]> {
    let pageNumber = 1;
    const urls: string[] = [];

    while (urls.length < limit) {
      const url = `https://www.marktplaats.nl/q/${keyword}/p/${pageNumber}/`;
      console.log(`  Fetching page ${pageNumber}...`);

      await page.goto(url, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      // Handle cookies on first page
      if (pageNumber === 1) {
        await this.handleCookieConsent(page);
      }

      const items = await page.$$eval("a.hz-Listing-coverLink", (items) => {
        return items
          .map((item) => {
            const href = item.getAttribute("href");
            return href ? "https://www.marktplaats.nl" + href : "";
          })
          .filter((url) => url !== "");
      });

      console.log(`  Found ${items.length} listings on page ${pageNumber}`);
      urls.push(...items);
      pageNumber++;

      if (items.length === 0) {
        console.log(`  No more listings found`);
        break;
      }
    }

    return urls.slice(0, limit);
  }

  // YOUR IMPLEMENTATION - robust extraction (kept from HEAD)
  async scrapeItemPage(page: Page, url: string): Promise<Listing> {
    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 15000,
    });

    await page.waitForSelector('h1, [data-testid="ad-title"]', {
      timeout: 10000,
    });

    const listing = await page.evaluate((listingUrl) => {
      let title = "N/A";
      const titleElement =
        document.querySelector('[data-testid="ad-title"]') ||
        document.querySelector("h1");

      if (titleElement?.textContent) {
        title = titleElement.textContent.trim();
      }

      let priceText = "N/A";
      const priceElement = document.querySelector(
        '[data-testid="price-label"]',
      );

      if (priceElement?.textContent) {
        priceText = priceElement.textContent.trim();
      }

      if (priceText === "N/A") {
        const allText = document.body.innerText;
        const priceMatch = allText.match(/€\s*[\d.,]+/);
        if (priceMatch) {
          priceText = priceMatch[0].trim();
        }
      }

      let price = 0;
      if (priceText !== "N/A") {
        const numericPrice = priceText
          .replace(/[€\s]/g, "")
          .replace(/\./g, "")
          .replace(",", ".");
        price = parseFloat(numericPrice) || 0;
      }

      return {
        title,
        price,
        url: listingUrl,
      };
    }, url);

    return listing;
  }
}

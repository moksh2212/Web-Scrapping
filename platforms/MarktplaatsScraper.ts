import { Page } from "puppeteer";
import { BaseScraper, Listing } from "./BaseScraper";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


export class MarktplaatsScraper extends BaseScraper {
  getPlatformName(): string {
    return "marktplaats.nl";
  }

  getSearchUrl(query: string): string {
    return `https://www.marktplaats.nl/q/${encodeURIComponent(query)}/`;
  }

  async handleCookieConsent(page: Page): Promise<void> {
    try {
      await delay(1500);

      const clicked = await page.evaluate(() => {
        const continueButton = document.querySelector("button.cwa");
        if (continueButton && continueButton instanceof HTMLElement) {
          continueButton.click();
          return "continue-without-accepting";
        }

        const acceptButton = document.querySelector(
          'button.primary[title="Accepteren"]'
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
      } else {
        console.log("No cookie consent overlay found or already dismissed");
      }
    } catch (error) {
      console.log("Cookie consent handling skipped:", error);
    }
  }

  async collectListingUrls(page: Page, maxUrls: number = 100): Promise<string[]> {
    const urls = await page.evaluate(() => {
      const urlList: string[] = [];

      const allLinks = document.querySelectorAll(
        'a[href*="/a/"], a[href*="/v/"]'
      );

      allLinks.forEach((link) => {
        const href = link.getAttribute("href");
        if (href) {
          const absoluteUrl = href.startsWith("http")
            ? href
            : `https://www.marktplaats.nl${href}`;

          if (!urlList.includes(absoluteUrl)) {
            urlList.push(absoluteUrl);
          }
        }
      });

      return urlList;
    });

    return urls.slice(0, maxUrls);
  }

  async scrapeListing(page: Page, url: string): Promise<Listing> {
    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 15000,
    });

    await page.waitForSelector('h1, [data-testid="ad-title"]', {
      timeout: 10000,
    });

    const listing = await page.evaluate((listingUrl) => {
      let name = "N/A";
      const titleElement =
        document.querySelector('[data-testid="ad-title"]') ||
        document.querySelector("h1");

      if (titleElement?.textContent) {
        name = titleElement.textContent.trim();
      }

      let price = "N/A";

      const priceElement = document.querySelector(
        '[data-testid="price-label"]'
      );
      if (priceElement?.textContent) {
        price = priceElement.textContent.trim();
      }

      if (price === "N/A") {
        const allText = document.body.innerText;
        const priceMatch = allText.match(/€\s*[\d.,]+/);
        if (priceMatch) {
          price = priceMatch[0].trim();
        }
      }

      return {
        name,
        price,
        url: listingUrl,
      };
    }, url);

    return listing;
  }
}
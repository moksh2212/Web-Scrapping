import { Page } from "puppeteer";
import { BaseScraper, Listing } from "./BaseScraper";


export class MediaMarktScraper extends BaseScraper {
  getPlatformName(): string {
    return "mediamarkt.nl";
  }

  getSearchUrl(query: string): string {
    return `https://www.mediamarkt.nl/nl/search.html?query=${encodeURIComponent(
      query
    )}`;
  }

  async handleCookieConsent(page: Page): Promise<void> {
    throw new Error(
      "handleCookieConsent not implemented for MediaMarkt.nl"
    );
  }

  async collectListingUrls(
    page: Page,
    maxUrls: number = 100
  ): Promise<string[]> {
    throw new Error(
      "collectListingUrls not implemented for MediaMarkt.nl"
    );
  }

  async scrapeListing(page: Page, url: string): Promise<Listing> {
    throw new Error("scrapeListing not implemented for MediaMarkt.nl");
  }
}
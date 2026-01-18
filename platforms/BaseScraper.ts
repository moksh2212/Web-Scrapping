import { Browser, Page } from "puppeteer";

export interface Listing {
  name: string;
  price: string;
  url: string;
}

export abstract class BaseScraper {
  protected browser: Browser | null = null;
  protected page: Page | null = null;


  abstract getPlatformName(): string;


  abstract getSearchUrl(query: string): string;

  abstract handleCookieConsent(page: Page): Promise<void>;


  abstract collectListingUrls(page: Page, maxUrls?: number): Promise<string[]>;

  abstract scrapeListing(page: Page, url: string): Promise<Listing>;

  async initialize(browser: Browser): Promise<void> {
    this.browser = browser;
    this.page = await browser.newPage();
    await this.page.setViewport({ width: 1280, height: 800 });
  }

  async navigateToSearch(query: string): Promise<void> {
    if (!this.page) {
      throw new Error("Page not initialized. Call initialize() first.");
    }

    const searchUrl = this.getSearchUrl(query);
    console.log(`Navigating to: ${searchUrl}`);

    await this.page.goto(searchUrl, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    await this.handleCookieConsent(this.page);
  }


  async scrapeListings(urls: string[]): Promise<Listing[]> {
    if (!this.page) {
      throw new Error("Page not initialized. Call initialize() first.");
    }

    const listings: Listing[] = [];

    for (let i = 0; i < urls.length; i++) {
      console.log(`  Scraping listing ${i + 1}/${urls.length}...`);

      try {
        const listing = await this.scrapeListing(this.page, urls[i]);
        listings.push(listing);
      } catch (error) {
        console.error(`  Error scraping ${urls[i]}:`, error);
        listings.push({
          name: "Error - Could not scrape",
          price: "N/A",
          url: urls[i],
        });
      }
    }

    return listings;
  }

 
  async cleanup(): Promise<void> {
    if (this.page) { 
      await this.page.close();
    }
  }
}
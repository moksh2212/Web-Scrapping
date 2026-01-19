import { Page } from "puppeteer";
import { Platform, Listing } from "./base";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class Marktplaats implements Platform {
  name = "marktplaats";

  async scrapeSearchPage(
    page: Page,
    keyword: string,
    limit: number
  ): Promise<string[]> {
    let pageNumber = 1;
    const urls: string[] = [];

    while (urls.length < limit) {
      const url = `https://www.marktplaats.nl/q/${keyword}/p/${pageNumber}/`;
      await page.goto(url);
      const items = await page.$$eval("a.hz-Listing-coverLink", (items) => {
        return items.map((item) => {
          return "https://www.marktplaats.nl" + item.href;
        });
      });
      urls.push(...items);
      pageNumber++;
    }
    return urls;
  }

  async scrapeItemPage(): Promise<Listing> {
    throw new Error("Not implemented");
  }
}

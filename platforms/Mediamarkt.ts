import { Page } from "puppeteer";
import { Platform, Listing } from "./base";


export class MediaMarkt implements Platform {
  name = "mediamarkt";


  async scrapeSearchPage(
    page: Page,
    keyword: string,
    limit: number
  ): Promise<string[]> {
    throw new Error(
      `scrapeSearchPage not implemented for ${this.name}. Please implement this method.`
    );
  }


  async scrapeItemPage(page: Page): Promise<Listing> {
    throw new Error(
      `scrapeItemPage not implemented for ${this.name}. Please implement this method.`
    );
  }
}
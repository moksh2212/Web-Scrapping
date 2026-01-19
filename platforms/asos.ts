import { Page } from "puppeteer";
import { Listing, Platform } from "./base";

export class ASOS implements Platform {
  name = "asos";

  async scrapeSearchPage(
    page: Page,
    keyword: string,
    limit: number
  ): Promise<string[]> {
    void page;
    void keyword;
    void limit;
    throw new Error("scrapeSearchPage not implemented for ASOS");
  }

  async scrapeItemPage(page: Page, url: string): Promise<Listing> {
    void page;
    void url;
    throw new Error("scrapeItemPage not implemented for ASOS");
  }
}
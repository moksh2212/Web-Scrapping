import { BaseScraper } from "./BaseScraper";
import { MarktplaatsScraper } from "./MarktplaatsScraper";
import { MediaMarktScraper } from "./MediaMarktScraper";
import { ASOSScraper } from "./ASOSScraper";


export class ScraperFactory {

  private static scraperRegistry: Map<string, new () => BaseScraper> = new Map([
    ["marktplaats.nl", MarktplaatsScraper],
    ["mediamarkt.nl", MediaMarktScraper],
    ["asos.com", ASOSScraper],
]);


  static getScraper(platformName: string): BaseScraper {
    const ScraperClass = this.scraperRegistry.get(
      platformName.toLowerCase()
    );

    if (!ScraperClass) {
      const supportedPlatforms = Array.from(
        this.scraperRegistry.keys()
      ).join(", ");
      throw new Error(
        `Platform "${platformName}" is not supported. Supported platforms: ${supportedPlatforms}`
      );
    }

    return new ScraperClass();
  }


  static getSupportedPlatforms(): string[] {
    return Array.from(this.scraperRegistry.keys());
  }

  
  static registerScraper(
    platformName: string,
    scraperClass: new () => BaseScraper
  ): void {
    this.scraperRegistry.set(platformName.toLowerCase(), scraperClass);
  }
}
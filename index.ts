import puppeteer from "puppeteer";
import * as fs from "fs";
import * as path from "path";
import { Marktplaats } from "./platforms/marktplaats";
import { MediaMarkt } from "./platforms/mediamarkt";
import { ASOS } from "./platforms/asos";
import { Platform, Listing } from "./platforms/base";

/**
 * Platform factory - no switch/if-else chains
 */
class PlatformFactory {
  private static platforms: Map<string, new () => Platform> = new Map([
    ["marktplaats", Marktplaats],
    ["mediamarkt", MediaMarkt],
    ["asos", ASOS],
  ]);

  static getPlatform(name: string): Platform {
    const PlatformClass = this.platforms.get(name.toLowerCase());

    if (!PlatformClass) {
      const available = Array.from(this.platforms.keys()).join(", ");
      throw new Error(
        `Platform "${name}" not supported. Available: ${available}`
      );
    }

    return new PlatformClass();
  }

  static getAvailablePlatforms(): string[] {
    return Array.from(this.platforms.keys());
  }
}

async function main() {
  // Configuration
  const platformName = "marktplaats"; // Change to: mediamarkt, asos
  const keyword = "tandem";
  const limit = 100;

  console.log("=".repeat(80));
  console.log("MULTI-PLATFORM SCRAPER");
  console.log("=".repeat(80));
  console.log(`Platform: ${platformName}`);
  console.log(`Keyword: ${keyword}`);
  console.log(`Limit: ${limit}`);
  console.log("=".repeat(80) + "\n");

  // Get platform instance
  let platform: Platform;
  try {
    platform = PlatformFactory.getPlatform(platformName);
    console.log(`✓ Loaded platform: ${platform.name}\n`);
  } catch (error) {
    console.error(`✗ Error: ${error}`);
    console.log(
      `\nAvailable platforms: ${PlatformFactory.getAvailablePlatforms().join(", ")}`
    );
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // Step 1: Search
    console.log("Step 1: Searching...");
    const urls = await platform.scrapeSearchPage(page, keyword, limit);
    console.log(`✓ Found ${urls.length} listings\n`);

    if (urls.length === 0) {
      console.log("No listings found. Exiting.");
      return;
    }

    // Step 2: Scrape items
    console.log("Step 2: Scraping items...");
    const listings: Listing[] = [];

    for (let i = 0; i < urls.length; i++) {
      console.log(`  Scraping ${i + 1}/${urls.length}...`);

      try {
        const listing = await platform.scrapeItemPage(page, urls[i]);
        listings.push(listing);
      } catch (error) {
        console.error(`  Error: ${error}`);
        listings.push({
          title: "Error - Could not scrape",
          price: 0,
          url: urls[i],
        });
      }
    }

    // Step 3: Save results
    console.log("\nStep 3: Saving results...");
    saveResults(listings, platformName, keyword);

    printSummary(listings);

    console.log("\n✓ Scraping completed!");
  } catch (error) {
    console.error("\n✗ Error during scraping:", error);
    throw error;
  } finally {
    await browser.close();
  }
}

function saveResults(
  listings: Listing[],
  platform: string,
  keyword: string
): void {
  const result = {
    platform,
    keyword,
    timestamp: new Date().toISOString(),
    total: listings.length,
    listings,
  };

  const outputPath = path.join(process.cwd(), "result.json");
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf-8");

  console.log(`✓ Saved to: ${outputPath}`);
}

function printSummary(listings: Listing[]): void {
  console.log("\n" + "=".repeat(80));
  console.log("SUMMARY");
  console.log("=".repeat(80));

  const successful = listings.filter(
    (l) => l.title !== "Error - Could not scrape"
  ).length;
  const failed = listings.length - successful;

  console.log(`Total: ${listings.length}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);

  console.log("\nPreview (first 5):");
  listings.slice(0, 5).forEach((listing, index) => {
    const priceStr = listing.price > 0 ? `€${listing.price.toFixed(2)}` : "N/A";
    console.log(`\n${index + 1}. ${listing.title}`);
    console.log(`   Price: ${priceStr}`);
  });

  console.log("\n" + "=".repeat(80));
}

void main();
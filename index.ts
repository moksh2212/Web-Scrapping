import puppeteer from "puppeteer";
import * as fs from "fs";
import * as path from "path";
import { ScraperFactory } from "./platforms/ScraperFactory";
import { Listing } from "./platforms/BaseScraper";

async function main() {
  const platformName = "marktplaats.nl"; 
  const searchQuery = "tandem";
  const maxUrls = 100;

  console.log("=".repeat(80));
  console.log("ABSTRACT SCRAPER");
  console.log("=".repeat(80));
  console.log(`Platform: ${platformName}`);
  console.log(`Query: ${searchQuery}`);
  console.log(`Max URLs: ${maxUrls}`);
  console.log("=".repeat(80) + "\n");

  let scraper;
  try {
    scraper = ScraperFactory.getScraper(platformName);
    console.log(`✓ Loaded scraper for: ${scraper.getPlatformName()}\n`);
  } catch (error) {
    console.error(`✗ Error: ${error}`);
    console.log(
      `\nSupported platforms: ${ScraperFactory.getSupportedPlatforms().join(", ")}`
    );
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    await scraper.initialize(browser);

    console.log("Step 1: Navigating to search page...");
    await scraper.navigateToSearch(searchQuery);

    console.log("\nStep 2: Collecting listing URLs...");
    const urls = await scraper.collectListingUrls(
      scraper["page"]!,
      maxUrls
    );
    console.log(`✓ Found ${urls.length} listings\n`);

    if (urls.length === 0) {
      console.log("No listings found. Exiting.");
      return;
    }

    console.log("Step 3: Scraping listings...");
    const listings = await scraper.scrapeListings(urls);

        console.log("\nStep 4: Saving results...");
    await saveResults(listings, platformName, searchQuery);

    printSummary(listings);

    console.log("\n✓ Scraping completed successfully!");
  } catch (error) {
    console.error("\n✗ Error during scraping:", error);
    throw error;
  } finally {
    await scraper.cleanup();
    await browser.close();
  }
}


async function saveResults(
  listings: Listing[],
  platform: string,
  query: string
): Promise<void> {
  const result = {
    platform,
    query,
    timestamp: new Date().toISOString(),
    totalListings: listings.length,
    listings,
  };

  const outputPath = path.join(process.cwd(), "result.json");
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf-8");

  console.log(`✓ Results saved to: ${outputPath}`);
}


function printSummary(listings: Listing[]): void {
  console.log("\n" + "=".repeat(80));
  console.log("SCRAPING SUMMARY");
  console.log("=".repeat(80));

  console.log(`\nTotal listings scraped: ${listings.length}`);

  const successfulListings = listings.filter(
    (l) => l.name !== "Error - Could not scrape"
  );
  const failedListings = listings.length - successfulListings.length;

  console.log(`Successful: ${successfulListings.length}`);
  console.log(`Failed: ${failedListings}`);

  console.log("\nPreview (first 5 listings):");
  listings.slice(0, 5).forEach((listing, index) => {
    console.log(`\n${index + 1}. ${listing.name}`);
    console.log(`   Price: ${listing.price}`);
    console.log(`   URL: ${listing.url.substring(0, 80)}...`);
  });

  console.log("\n" + "=".repeat(80));
}

void main();
import puppeteer, { Browser, Page } from "puppeteer";
import { writeFileSync } from "fs";
import { Listing } from "./platforms/base.js";
import { PlatformFactory } from "./platforms/platformFactory;
/**
 * Main scraping orchestrator
 */
async function main() {
  // Get command line arguments
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.log("Usage: yarn scrape <platform> <search-term> <limit>");
    console.log("Example: yarn scrape marktplaats tshirt 20");
    console.log("\nAvailable platforms:");
    PlatformFactory.getAvailablePlatforms().forEach((p) => console.log(`  - ${p}`));
    process.exit(1);
  }

  const platformName = args[0];
  const searchTerm = args[1];
  const limit = parseInt(args[2]);

  if (isNaN(limit) || limit <= 0 || limit > 100) {
    console.log("Limit must be a positive number between 1 and 100");
    process.exit(1);
  }

  console.log(`\n${"=".repeat(80)}`);
  console.log(`Searching for "${searchTerm}" on ${platformName} (limit: ${limit})`);
  console.log("=".repeat(80) + "\n");

  let browser: Browser | null = null;

  try {
    // Step 4: Get platform instance using factory (no switch/if-else)
    const platform = PlatformFactory.getPlatform(platformName);
    console.log(`✓ Platform loaded: ${platform.name}\n`);

    // Launch browser
    browser = await puppeteer.launch({
      headless: false,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--start-maximized",
        "--disable-blink-features=AutomationControlled",
      ],
      defaultViewport: null,
    });

    const page = await browser.newPage();
    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
    });

    // Step 6a: Collect URLs from search page
    console.log("Step 1: Collecting listing URLs...");
    const urls = await platform.scrapeSearchPage(page, searchTerm, limit);
    console.log(`✓ Collected ${urls.length} URLs\n`);

    if (urls.length === 0) {
      console.log("No listings found. Exiting...");
      return;
    }

    // Step 6b: Scrape each listing page
    console.log("Step 2: Scraping individual listings...");
    const listings: Listing[] = [];

    for (let i = 0; i < urls.length; i++) {
      console.log(`  [${i + 1}/${urls.length}] Scraping: ${urls[i]}`);

      try {
        await page.goto(urls[i], {
          waitUntil: "domcontentloaded",
          timeout: 60000,
        });

        const listing = await platform.scrapeItemPage(page);
        listings.push(listing);
        console.log(`    ✓ ${listing.title} - €${listing.price}`);
      } catch (error) {
        console.error(`    ✗ Error: ${error}`);
        // Add placeholder for failed scrape
        listings.push({
          title: "Error - Could not scrape",
          price: 0,
          url: urls[i],
        });
      }

      // Small delay between requests
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Step 6c: Save results to result.json
    console.log("\nStep 3: Saving results...");
    const results = {
      platform: platform.name,
      searchTerm,
      timestamp: new Date().toISOString(),
      totalListings: listings.length,
      listings,
    };

    writeFileSync("result.json", JSON.stringify(results, null, 2));
    console.log("✓ Results saved to result.json\n");

    // Print summary
    printSummary(listings, platform.name, searchTerm);
  } catch (error) {
    console.error("\n✗ Error during scraping:");
    console.error(error);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Prints a summary of scraped results
 */
function printSummary(listings: Listing[], platformName: string, searchTerm: string): void {
  console.log("=".repeat(80));
  console.log(`SCRAPING SUMMARY - ${platformName.toUpperCase()}`);
  console.log("=".repeat(80));
  console.log(`Search term: ${searchTerm}`);
  console.log(`Total listings: ${listings.length}`);
  
  if (listings.length > 0) {
    const prices = listings.filter(l => l.price > 0).map(l => l.price);
    if (prices.length > 0) {
      const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      
      console.log(`Average price: €${avgPrice.toFixed(2)}`);
      console.log(`Price range: €${minPrice.toFixed(2)} - €${maxPrice.toFixed(2)}`);
    }
  }
  
  console.log("=".repeat(80));
  console.log("\n✓ Scraping completed successfully!");
  console.log("Results saved to result.json\n");
}

// Run the main function
main().catch(console.error);
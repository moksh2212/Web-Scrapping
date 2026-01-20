import puppeteer, { Browser } from "puppeteer";
import { Asos } from "./platforms/asos";
import { Listing } from "./platforms/base";
import { writeFileSync } from "fs";

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log("Usage: npx tsx test-asos.ts <search-term> <limit>");
    console.log("Example: npx tsx test-asos.ts crocs 5");
    process.exit(1);
  }

  const searchTerm = args[0];
  const limit = parseInt(args[1]);

  if (isNaN(limit) || limit <= 0 || limit > 100) {
    console.log("Limit must be a positive number between 1 and 100");
    process.exit(1);
  }

  console.log(`\n${"=".repeat(80)}`);
  console.log(`Testing Asos - Searching for "${searchTerm}" (limit: ${limit})`);
  console.log("=".repeat(80) + "\n");

  let browser: Browser | null = null;

  try {
    const platform = new Asos();
    console.log(`✓ Platform loaded: ${platform.name}\n`);

    browser = await puppeteer.launch({
      headless: false,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--start-maximized",
      ],
      defaultViewport: null,
    });

    const page = await browser.newPage();
    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
    });

    console.log("Step 1: Collecting listing URLs...");
    const urls = await platform.scrapeSearchPage(page, searchTerm, limit);
    console.log(`✓ Collected ${urls.length} URLs\n`);

    if (urls.length === 0) {
      console.log("No listings found. Exiting...");
      return;
    }

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
        listings.push({
          title: "Error - Could not scrape",
          price: 0,
          url: urls[i],
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

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

    console.log("=".repeat(80));
    console.log(`SCRAPING SUMMARY - ${platform.name.toUpperCase()}`);
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
    console.log("\n✓ Scraping completed successfully!\n");

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

main().catch(console.error);
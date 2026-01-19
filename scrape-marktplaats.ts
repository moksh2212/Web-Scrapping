import puppeteer from "puppeteer";
import { Marktplaats } from "./platforms/marktplaats";
import { Listing } from "./platforms/base";

async function main(): Promise<void> {
  const browser = await puppeteer.launch({
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    const keyword = "tandem";
    const limit = 100;

    const scraper = new Marktplaats();
    console.log(`Using scraper: ${scraper.name}`);

    console.log(`\nSearching for "${keyword}"...`);
    const urls = await scraper.scrapeSearchPage(page, keyword, limit);
    console.log(`Found ${urls.length} listings\n`);

    if (urls.length === 0) {
      console.log("No listings found. Exiting.");
      return;
    }

    console.log("Scraping individual listings...");
    const listings: Listing[] = [];

    for (let i = 0; i < urls.length; i++) {
      console.log(`  Scraping listing ${i + 1}/${urls.length}...`);

      try {
        const listing = await scraper.scrapeItemPage(page, urls[i]);
        listings.push(listing);
      } catch (error) {
        console.error(`  Error scraping ${urls[i]}:`, error);
        listings.push({
          title: "Error - Could not scrape",
          price: 0,
          url: urls[i],
        });
      }
    }

    printResults(listings);

    console.log("\n✓ Scraping completed successfully!");
  } catch (error) {
    console.error("\n✗ Error during scraping:", error);
    throw error;
  } finally {
    await browser.close();
  }
}

function printResults(listings: Listing[]): void {
  console.log("\n" + "=".repeat(80));
  console.log("SCRAPING RESULTS - MARKTPLAATS");
  console.log("=".repeat(80) + "\n");

  if (listings.length === 0) {
    console.log("No listings found.");
  } else {
    listings.forEach((listing, index) => {
      const priceStr =
        listing.price > 0 ? `€${listing.price.toFixed(2)}` : "N/A";
      console.log(`${index + 1}. ${listing.title}`);
      console.log(`   Price: ${priceStr}`);
      console.log(`   URL: ${listing.url}`);
      console.log("");
    });
  }

  console.log("=".repeat(80));
  console.log(`Total listings scraped: ${listings.length}`);

  const successful = listings.filter(
    (l) => l.title !== "Error - Could not scrape"
  ).length;
  const failed = listings.length - successful;

  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);
  console.log("=".repeat(80));
}

void main();
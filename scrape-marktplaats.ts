import puppeteer, { Browser, Page } from "puppeteer";

interface Listing {
  name: string;
  price: string;
  url: string;
}


function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}


async function main(): Promise<void> {
  const browser = await puppeteer.launch({
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    console.log("Opening marktplaats.nl search page for tandems...");
    await openTandemSearchPage(page);

    console.log("Collecting listing URLs from search results...");
    const listingUrls = await collectListingUrls(page);
    console.log(`Found ${listingUrls.length} listings on the page`);

    console.log("Scraping individual listings...");
    const listings = await scrapeAllListings(browser, listingUrls);

    printResults(listings);

    console.log("\nScraping completed successfully!");
  } catch (error) {
    console.error("Error during scraping:", error);
    throw error;
  } finally {
    await browser.close();
  }
}


async function openTandemSearchPage(page: Page): Promise<void> {
  const searchUrl = "https://www.marktplaats.nl/q/tandem/";

  await page.goto(searchUrl, {
    waitUntil: "networkidle2",
    timeout: 30000,
  });

  await handleCookieConsent(page);



 
  try {
    await page.waitForSelector(
      '[data-testid="hz-listing-card-container"], [data-testid="listing-card"], .mp-Listing, article, li[class*="listing"]',
      { timeout: 10000 }
    );
    console.log("Listing cards found on page");
  } catch (error) {
    console.log(error);
  }
}


async function handleCookieConsent(page: Page): Promise<void> {
  try {
    await delay(1500);

    const clicked = await page.evaluate(() => {
      const continueButton = document.querySelector('button.cwa');
      if (continueButton && continueButton instanceof HTMLElement) {
        continueButton.click();
        return 'continue-without-accepting';
      }
      
      const acceptButton = document.querySelector('button.primary[title="Accepteren"]');
      if (acceptButton && acceptButton instanceof HTMLElement) {
        acceptButton.click();
        return 'accept';
      }
      
      return null;
    });

    if (clicked) {
      console.log(`Cookie consent handled: ${clicked}`);
      await delay(2000);
    } else {
      console.log("No cookie consent overlay found or already dismissed");
    }
  } catch (error) {
    console.log("Cookie consent handling skipped:", error);
  }
}


async function collectListingUrls(page: Page): Promise<string[]> {
  const urls = await page.evaluate(() => {
    const urlList: string[] = [];

    const allLinks = document.querySelectorAll('a[href*="/a/"], a[href*="/v/"]');
    
    allLinks.forEach((link) => {
      const href = link.getAttribute("href");
      if (href) {
        const absoluteUrl = href.startsWith("http")
          ? href
          : `https://www.marktplaats.nl${href}`;
        
        if (!urlList.includes(absoluteUrl)) {
          urlList.push(absoluteUrl);
        }
      }
    });

    return urlList;
  });

  return urls;
}


async function scrapeAllListings(
  browser: Browser,
  urls: string[]
): Promise<Listing[]> {
  const listings: Listing[] = [];
  
  const page = await browser.newPage();

  try {
    for (let i = 0; i < urls.length; i++) {
      console.log(`  Scraping listing ${i + 1}/${urls.length}...`);

      try {
        const listing = await scrapeSingleListingReuse(page, urls[i]);
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
  } finally {
    await page.close();
  }

  return listings;
}


async function scrapeSingleListingReuse(
  page: Page,
  url: string
): Promise<Listing> {
  await page.goto(url, {
    waitUntil: "networkidle2",
    timeout: 15000,
  });

  await page.waitForSelector('h1, [data-testid="ad-title"]', {
    timeout: 10000,
  });

  const listing = await page.evaluate((listingUrl) => {
    let name = "N/A";
    const titleElement =
      document.querySelector('[data-testid="ad-title"]') ||
      document.querySelector("h1");

    if (titleElement?.textContent) {
      name = titleElement.textContent.trim();
    }

    let price = "N/A";

    const priceElement = document.querySelector('[data-testid="price-label"]');
    if (priceElement?.textContent) {
      price = priceElement.textContent.trim();
    }

    if (price === "N/A") {
      const allText = document.body.innerText;
      const priceMatch = allText.match(/€\s*[\d.,]+/);
      if (priceMatch) {
        price = priceMatch[0].trim();
      }
    }

    return {
      name,
      price,
      url: listingUrl,
    };
  }, url);

  return listing;
}


function printResults(listings: Listing[]): void {
  console.log("\n" + "=".repeat(80));
  console.log("SCRAPING RESULTS - MARKTPLAATS TANDEMS");
  console.log("=".repeat(80) + "\n");

  if (listings.length === 0) {
    console.log("No listings found.");
  } else {
    listings.forEach((listing, index) => {
      console.log(`${index + 1}. ${listing.name}`);
      console.log(`   Price: ${listing.price}`);
      console.log(`   URL: ${listing.url}`);
      console.log("");
    });
  }

  console.log("=".repeat(80));
  console.log(`Total listings scraped: ${listings.length}`);
  console.log("=".repeat(80));
}

void main();

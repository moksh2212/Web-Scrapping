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
      
      await page.goto(url, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });
      
      if (pageNumber === 1) {
        await this.handleCookieConsent(page);
      }
      
      const items = await page.evaluate(() => {
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
      
      if (items.length === 0) {
        break;
      }
      
      const remaining = limit - urls.length;
      urls.push(...items.slice(0, remaining));
      
      if (urls.length >= limit) {
        break;
      }
      
      pageNumber++;
    }
    
    return urls;
  }

  async scrapeItemPage(page: Page): Promise<Listing> {
    await page.waitForSelector('h1, [data-testid="ad-title"]', {
      timeout: 10000,
    });

    const listing = await page.evaluate(() => {
      let title = "N/A";
      const titleElement =
        document.querySelector('[data-testid="ad-title"]') ||
        document.querySelector("h1");

      if (titleElement?.textContent) {
        title = titleElement.textContent.trim();
      }

      let priceText = "N/A";
      const priceElement = document.querySelector('[data-testid="price-label"]');
      if (priceElement?.textContent) {
        priceText = priceElement.textContent.trim();
      }

      if (priceText === "N/A") {
        const allText = document.body.innerText;
        const priceMatch = allText.match(/€\s*[\d.,]+/);
        if (priceMatch) {
          priceText = priceMatch[0].trim();
        }
      }

      let price = 0;
      if (priceText !== "N/A") {
        const cleanPrice = priceText.replace(/[€\s]/g, "").replace(",", ".");
        price = parseFloat(cleanPrice) || 0;
      }

      return {
        title,
        price,
        url: window.location.href,
      };
    });

    return listing;
  }

  private async handleCookieConsent(page: Page): Promise<void> {
    try {
      await delay(1500);

      const clicked = await page.evaluate(() => {
        const continueButton = document.querySelector("button.cwa");
        if (continueButton && continueButton instanceof HTMLElement) {
          continueButton.click();
          return "continue-without-accepting";
        }

        const acceptButton = document.querySelector(
          'button.primary[title="Accepteren"]'
        );
        if (acceptButton && acceptButton instanceof HTMLElement) {
          acceptButton.click();
          return "accept";
        }

        return null;
      });

      if (clicked) {
        console.log(`Cookie consent handled: ${clicked}`);
        await delay(2000);
      }
    } catch (error) {
      console.log("Cookie consent handling skipped");
    }
  }
}
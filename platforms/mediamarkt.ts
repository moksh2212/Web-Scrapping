import { Page } from "puppeteer";
import { Platform, Listing } from "./base";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class MediaMarkt implements Platform {
  name = "mediamarkt";

  async scrapeSearchPage(
    page: Page,
    keyword: string,
    limit: number,
  ): Promise<string[]> {
    const urls: string[] = [];

    const categoryMap: { [key: string]: string } = {
      phone: "smartphones-283",
      smartphone: "smartphones-283",
      laptop: "laptops-433",
      tv: "televisies-453",
      camera: "digitale-cameras-114",
    };

    const category =
      categoryMap[keyword.toLowerCase()] ||
      `search.html?query=${encodeURIComponent(keyword)}`;
    const url = category.includes("search.html")
      ? `https://www.mediamarkt.nl/nl/${category}`
      : `https://www.mediamarkt.nl/nl/category/${category}.html`;

    try {
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });

      await this.handleCookieConsent(page);
      await delay(3000);

      await page.evaluate(() => {
        window.scrollTo(0, 1000);
      });
      await delay(2000);

      await page.evaluate(() => {
        window.scrollTo(0, 2000);
      });
      await delay(2000);

      const items = await page.evaluate(() => {
        const urlList: string[] = [];
        const allLinks = document.querySelectorAll("a");

        allLinks.forEach((link) => {
          const href = link.getAttribute("href");
          if (href && href.includes("/nl/product/")) {
            const absoluteUrl = href.startsWith("http")
              ? href
              : `https://www.mediamarkt.nl${href}`;

            if (!urlList.includes(absoluteUrl)) {
              urlList.push(absoluteUrl);
            }
          }
        });

        return urlList;
      });

      console.log(`Found ${items.length} product links`);
      urls.push(...items.slice(0, limit));
    } catch (error) {
      console.error(`Error scraping:`, error);
    }

    return urls;
  }

  async scrapeItemPage(page: Page): Promise<Listing> {
    await page.waitForSelector('h1, [data-test="mms-product-title"]', {
      timeout: 30000,
    });

    const listing = await page.evaluate(() => {
      let title = "N/A";
      const titleElement =
        document.querySelector('[data-test="mms-product-title"]') ||
        document.querySelector("h1");

      if (titleElement?.textContent) {
        title = titleElement.textContent.trim();
      }

      let price = 0;
      const wholeEl = document.querySelector(
        '[data-test="branded-price-whole-value"]',
      );
      const decimalEl = document.querySelector(
        '[data-test="branded-price-decimal-value"]',
      );

      if (wholeEl) {
        let whole = wholeEl.textContent || "";
        let decimal = decimalEl?.textContent || "00";

        whole = whole.replace(/[^\d]/g, ""); 
        decimal = decimal.replace(/[^\d]/g, "");

        if (decimal === "" || decimal === "–") {
          decimal = "00";
        }

        price = Number(`${whole}.${decimal}`);
      }

      if (!price || Number.isNaN(price)) {
        const match = document.body.innerText.match(/€\s?\d[\d.,]*/);
        if (match) {
          price = Number(
            match[0]
              .replace(/[^\d.,]/g, "")
              .replace(/\./g, "")
              .replace(",", "."),
          );
        }
      }

      return {
        title,
        price,
        url: window.location.href,
      };
    });

    return listing;
  }

  private async clickShowAllButton(page: Page): Promise<void> {
    try {
      await delay(1000);

      const clicked = await page.evaluate(() => {
        const buttons = document.querySelectorAll("button, a");

        for (const button of Array.from(buttons)) {
          const text = button.textContent?.toLowerCase() || "";
          const ariaLabel =
            button.getAttribute("aria-label")?.toLowerCase() || "";

          if (
            text.includes("alle") ||
            text.includes("show all") ||
            text.includes("bekijk alles") ||
            text.includes("toon alle") ||
            ariaLabel.includes("alle") ||
            ariaLabel.includes("show all")
          ) {
            if (button instanceof HTMLElement) {
              button.click();
              return text || ariaLabel;
            }
          }
        }

        return null;
      });

      if (clicked) {
        console.log(`Clicked "show all" button: ${clicked}`);
        await delay(2000);
      } else {
        console.log(
          "No 'show all' button found - results may already be visible",
        );
      }
    } catch (error) {
      console.log(error);
    }
  }

  private async handleCookieConsent(page: Page): Promise<void> {
    try {
      await delay(2000);

      const clicked = await page.evaluate(() => {
        const acceptButton =
          document.querySelector(
            "button#pwa-consent-layer-accept-all-button",
          ) ||
          document.querySelector(
            'button[data-test="pwa-consent-layer-accept-all"]',
          );

        if (acceptButton && acceptButton instanceof HTMLElement) {
          acceptButton.click();
          return "accept-all";
        }

        const buttons = document.querySelectorAll("button");
        for (const button of Array.from(buttons)) {
          const text = button.textContent || "";
          if (text.includes("Alles accepteren")) {
            button.click();
            return "accept-text-match";
          }
        }

        return null;
      });

      if (clicked) {
        console.log(`Cookie consent handled: ${clicked}`);
        await delay(3000);
      }
    } catch (error) {
      console.log(error);
    }
  }
}

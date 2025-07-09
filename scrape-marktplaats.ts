import puppeteer from "puppeteer";

async function main() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.goto("https://www.marktplaats.nl/");

  const a = 5;
  console.log(a);

  // some comments to show they are gone.
  // some more
  // even more
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main();

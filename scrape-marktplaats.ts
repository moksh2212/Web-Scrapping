import puppeteer from "puppeteer";

async function main() {
  throw new Error("YOU ARE ON THE WRONG BRANCH");
  const browser = await puppeteer.launch({
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.goto("https://www.marktplaats.nl/");

  const a = 5;
  console.log(a);
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main();

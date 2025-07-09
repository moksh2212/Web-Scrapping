async function main() {
  // Get command line arguments
  const args = process.argv.slice(3);

  if (args.length < 2) {
    console.log("Usage: yarn scrape <platform> <search-term> <limit>");
    console.log("Example: yarn scrape marktplaats tshirt 20");
    process.exit(1);
  }

  const platform = args[0];
  const searchTerm = args[1];
  const limit = parseInt(args[2]);

  if (isNaN(limit) || limit <= 0) {
    console.log("Limit must be a positive number");
    process.exit(1);
  }

  console.log(
    `Searching for "${searchTerm}" with limit ${limit} on ${platform}`
  );

  // TODO: Implement scraping logic here
}

main().catch(console.error);

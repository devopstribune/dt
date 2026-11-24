// dt news command handler
const apiClient = require('../api-client');
const fmt = require('../formatter');

async function handleNews(args = {}) {
  const result = await apiClient.getNews();

  if (result.error && !result.data) {
    console.error(fmt.red(`Error fetching news: ${result.error}`));
    process.exitCode = 1;
    return;
  }

  let items = (result.data && (result.data.items || (result.data.data && result.data.data.items))) || [];

  // Filter category if specified
  if (args.category) {
    const filterCat = args.category.toLowerCase();
    items = items.filter(i => 
      (i.category && i.category.toLowerCase().includes(filterCat)) ||
      (i.tags && i.tags.some(t => t.toLowerCase().includes(filterCat)))
    );
  }

  // Filter search query if specified
  if (args.query) {
    const q = args.query.toLowerCase();
    items = items.filter(i => 
      (i.title && i.title.toLowerCase().includes(q)) ||
      (i.summary && i.summary.toLowerCase().includes(q))
    );
  }

  // Limit output
  const limit = args.limit ? parseInt(args.limit, 10) : 10;
  items = items.slice(0, limit);

  if (args.json) {
    console.log(JSON.stringify({ source: result.source, count: items.length, items }, null, 2));
    return;
  }

  console.log(fmt.banner());
  const cacheNotice = result.source !== 'network' ? fmt.yellow(` (Serving from ${result.source})`) : '';
  console.log(fmt.rule(`LATEST DEVOPS NEWS & RADAR${cacheNotice}`));
  console.log();

  if (items.length === 0) {
    console.log(fmt.dim('  No news articles matched your filter criteria.'));
    console.log();
    return;
  }

  items.forEach((item, index) => {
    const num = fmt.dim(String(index + 1).padStart(2, '0'));
    const badge = fmt.categoryBadge(item.category);
    const time = fmt.dim(fmt.timeAgo(item.published_at));
    const title = fmt.bold(item.title);
    const summary = fmt.white(item.summary || '');
    const url = fmt.dim(item.canonical_url);

    console.log(` ${num} ${badge} ${title} ${time}`);
    if (summary) {
      console.log(`    ${summary}`);
    }
    console.log(`    ${fmt.brightCyan('→')} ${url}`);
    console.log();
  });

  console.log(fmt.rule());
  console.log(fmt.dim(` Showing ${items.length} news items. Run 'dt news --limit 20' or 'dt news --category k8s' for more.`));
  console.log();
}

module.exports = handleNews;

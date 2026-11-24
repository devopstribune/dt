// dt articles & dt article <slug> command handler
const apiClient = require('../api-client');
const fmt = require('../formatter');

async function handleArticles(args = {}) {
  const result = await apiClient.getArticles();

  if (result.error && !result.data) {
    console.error(fmt.red(`Error fetching articles: ${result.error}`));
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

  // Filter tag if specified
  if (args.tag) {
    const filterTag = args.tag.toLowerCase();
    items = items.filter(i => 
      i.tags && i.tags.some(t => t.toLowerCase().includes(filterTag))
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
  console.log(fmt.rule(`ENGINEERING PUBLICATIONS & RUNBOOKS${cacheNotice}`));
  console.log();

  if (items.length === 0) {
    console.log(fmt.dim('  No articles found matching your query.'));
    console.log();
    return;
  }

  items.forEach((item, index) => {
    const num = fmt.dim(String(index + 1).padStart(2, '0'));
    const badge = fmt.categoryBadge(item.category);
    const readTime = fmt.dim(`${item.reading_time_minutes || 8} min read`);
    const title = fmt.bold(item.title);
    const summary = fmt.white(item.summary || '');
    const slug = fmt.brightCyan(`dt article ${item.slug}`);

    console.log(` ${num} ${badge} ${title} · ${readTime}`);
    if (summary) {
      console.log(`    ${summary}`);
    }
    console.log(`    ${fmt.dim('Read in terminal:')} ${slug}`);
    console.log(`    ${fmt.dim('Web URL:')} ${fmt.dim(item.canonical_url)}`);
    console.log();
  });

  console.log(fmt.rule());
  console.log(fmt.dim(` Showing ${items.length} publications. To read an article, run 'dt article <slug>'.`));
  console.log();
}

async function handleSingleArticle(slug, args = {}) {
  if (!slug) {
    console.error(fmt.red('Error: Please specify an article slug. Example: dt article terraform-best-practices'));
    process.exitCode = 1;
    return;
  }

  const result = await apiClient.getArticles();
  if (result.error && !result.data) {
    console.error(fmt.red(`Error fetching article: ${result.error}`));
    process.exitCode = 1;
    return;
  }

  const items = (result.data && (result.data.items || (result.data.data && result.data.data.items))) || [];
  const article = items.find(i => i.slug === slug || i.id === slug);

  if (!article) {
    console.error(fmt.red(`Article '${slug}' not found.`));
    console.log(fmt.dim(`Run 'dt articles' to see the list of all available slugs.`));
    process.exitCode = 1;
    return;
  }

  if (args.json) {
    console.log(JSON.stringify(article, null, 2));
    return;
  }

  console.log(fmt.banner());
  console.log(fmt.rule(article.category.toUpperCase()));
  console.log();
  console.log(fmt.bold(fmt.brightCyan(` ${article.title}`)));
  console.log(fmt.dim(` Published: ${article.published_at} · Reading time: ${article.reading_time_minutes} min · Author: DevOps Tribune Desk`));
  console.log();
  console.log(fmt.rule('EXECUTIVE SUMMARY'));
  console.log();
  console.log(` ${article.summary}`);
  console.log();

  if (article.tags && article.tags.length > 0) {
    console.log(fmt.dim(' Tags: ') + article.tags.map(t => fmt.cyan(`#${t}`)).join(' '));
    console.log();
  }

  console.log(fmt.rule('CANONICAL RESOURCE'));
  console.log();
  console.log(` Full production walkthrough and interactive diagrams:`);
  console.log(` ${fmt.brightCyan(article.canonical_url)}`);
  console.log();
}

module.exports = { handleArticles, handleSingleArticle };

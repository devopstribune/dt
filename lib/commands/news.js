// dt news command handler
const apiClient = require('../api-client');
const fmt = require('../formatter');

async function handleTrending(args = {}) {
  let result = await apiClient.getRawNewsData();
  let repos = (result.data && Array.isArray(result.data.trendingRepos)) ? result.data.trendingRepos : null;

  // If live CDN hasn't synced trendingRepos yet, check local repo fallback
  if (!repos || repos.length === 0) {
    const fs = require('node:fs');
    const path = require('node:path');
    const localPath = path.resolve(__dirname, '../../../sites/main/data/news.json');
    if (fs.existsSync(localPath)) {
      try {
        const localData = JSON.parse(fs.readFileSync(localPath, 'utf8'));
        if (Array.isArray(localData.trendingRepos) && localData.trendingRepos.length > 0) {
          repos = localData.trendingRepos;
          result = { data: localData, source: 'local-repo' };
        }
      } catch (_) {}
    }
  }

  repos = repos || [];

  if (args.category) {
    const filterCat = args.category.toLowerCase();
    repos = repos.filter(r =>
      (r.language && r.language.toLowerCase().includes(filterCat)) ||
      (r.category && r.category.toLowerCase().includes(filterCat))
    );
  }

  if (args.query) {
    const q = args.query.toLowerCase();
    repos = repos.filter(r =>
      (r.repo && r.repo.toLowerCase().includes(q)) ||
      (r.description && r.description.toLowerCase().includes(q)) ||
      (r.language && r.language.toLowerCase().includes(q))
    );
  }

  const limit = args.limit ? parseInt(args.limit, 10) : 12;
  repos = repos.slice(0, limit);

  if (args.json) {
    console.log(JSON.stringify({ source: result.source || 'network', count: repos.length, trendingRepos: repos }, null, 2));
    return;
  }

  console.log(fmt.banner());
  const cacheNotice = result.source !== 'network' ? fmt.yellow(` (Serving from ${result.source})`) : '';
  console.log(fmt.rule(`TRENDING GITHUB REPOSITORIES TODAY${cacheNotice}`));
  console.log();

  if (repos.length === 0) {
    console.log(fmt.dim('  No trending repositories found matching your criteria.'));
    console.log();
    return;
  }

  repos.forEach((r, index) => {
    const num = fmt.dim(String(index + 1).padStart(2, '0'));
    const lang = fmt.brightCyan(`[${r.language || 'Code'}]`);
    const name = fmt.bold(r.repo);
    const stars = fmt.dim(`★ ${r.stars}`);
    const today = fmt.brightYellow(`+${r.starsToday} today`);
    const desc = fmt.white(r.description || '');
    const url = fmt.dim(r.url);

    console.log(` ${num} ${lang} ${name}  ${stars}  ${today}`);
    if (desc) {
      console.log(`    ${desc}`);
    }
    console.log(`    ${fmt.brightCyan('→')} ${url}`);
    console.log();
  });

  console.log(fmt.rule());
  console.log(fmt.dim(` Showing ${repos.length} trending repos. Run 'dt trending --limit 5' or 'dt trending -q ai' to filter.`));
  console.log();
}

async function handleArchive(dateArg = '', args = {}) {
  const targetDate = (dateArg || '').trim();

  if (!targetDate) {
    const idxRes = await apiClient.getArchiveIndex();
    const days = (idxRes.data && Array.isArray(idxRes.data.days)) ? idxRes.data.days : [];

    if (args.json) {
      console.log(JSON.stringify({ source: idxRes.source || 'network', totalDays: days.length, days }, null, 2));
      return;
    }

    console.log(fmt.banner());
    console.log(fmt.rule('DEVOPS NEWS & GITHUB TRENDING DAILY ARCHIVE'));
    console.log();

    if (days.length === 0) {
      console.log(fmt.dim('  No archived daily snapshots available yet.'));
      console.log();
      return;
    }

    days.forEach((d, idx) => {
      const num = fmt.dim(String(idx + 1).padStart(2, '0'));
      const dateStr = fmt.bold(fmt.brightCyan(d.date));
      const counts = fmt.dim(`(${d.totalArticles} stories, ${d.totalTrendingRepos} trending repos)`);
      console.log(` ${num} ${dateStr}  ${counts}`);
      if (Array.isArray(d.topHeadlines) && d.topHeadlines.length > 0) {
        console.log(`    ${fmt.white('Top News:')} ${d.topHeadlines[0]}`);
      }
      if (Array.isArray(d.topRepos) && d.topRepos.length > 0) {
        console.log(`    ${fmt.white('Top Repos:')} ${d.topRepos.join(', ')}`);
      }
      console.log();
    });

    console.log(fmt.rule());
    console.log(fmt.dim(` Run 'dt archive YYYY-MM-DD' to inspect a specific day's snapshot.`));
    console.log();
    return;
  }

  const dayRes = await apiClient.getArchiveDay(targetDate);
  if (dayRes.error && !dayRes.data) {
    console.error(fmt.red(`Archive snapshot not found for ${targetDate}: ${dayRes.error}`));
    process.exitCode = 1;
    return;
  }

  const snap = dayRes.data || {};
  const limit = args.limit ? parseInt(args.limit, 10) : 10;
  const articles = (snap.articles || []).slice(0, limit);
  const repos = (snap.trendingRepos || []).slice(0, limit);

  if (args.json) {
    console.log(JSON.stringify({ source: dayRes.source || 'network', date: targetDate, articles, trendingRepos: repos }, null, 2));
    return;
  }

  console.log(fmt.banner());
  console.log(fmt.rule(`ARCHIVE SNAPSHOT — ${targetDate}`));
  console.log();
  console.log(fmt.bold(` 🔥 TRENDING GITHUB REPOSITORIES (${repos.length})`));
  console.log();
  repos.forEach((r, i) => {
    console.log(` ${fmt.dim(String(i + 1).padStart(2, '0'))} ${fmt.brightCyan(`[${r.language}]`)} ${fmt.bold(r.repo)}  ${fmt.dim(`★ ${r.stars}`)}  ${fmt.brightYellow(`+${r.starsToday} today`)}`);
  });
  console.log();
  console.log(fmt.bold(` 📰 TOP ENGINEERING NEWS (${articles.length})`));
  console.log();
  articles.forEach((a, i) => {
    console.log(` ${fmt.dim(String(i + 1).padStart(2, '0'))} ${fmt.categoryBadge(a.category)} ${fmt.bold(a.title)}`);
    console.log(`    ${fmt.brightCyan('→')} ${fmt.dim(a.link)}`);
  });
  console.log();
}

async function handleNews(args = {}) {
  const sub = (args.subCommand || '').toLowerCase();
  if (sub === 'trending' || sub === 'repos' || sub === 'github') {
    return handleTrending(args);
  }
  if (sub === 'archive') {
    const dateArg = (args._subArgs && args._subArgs[0]) || '';
    return handleArchive(dateArg, args);
  }

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

module.exports = {
  handleNews,
  handleTrending,
  handleArchive
};

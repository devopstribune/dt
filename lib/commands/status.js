// dt status, version & help command handlers
const apiClient = require('../api-client');
const fmt = require('../formatter');
const pkg = require('../../package.json');

async function handleStatus(args = {}) {
  const manifestRes = await apiClient.getManifest();

  const manifest = (manifestRes.data && (manifestRes.data.data || manifestRes.data)) || {};
  const isHealthy = !manifestRes.error;
  const res = manifest.resources || {};

  const statusInfo = {
    cliVersion: pkg.version,
    apiContractVersion: manifest.schema_version || '1.0.0',
    edgeCdnEndpoint: apiClient.baseUrl,
    source: manifestRes.source || 'network',
    status: isHealthy ? 'HEALTHY' : 'DEGRADED',
    lastSync: manifest.generated_at || new Date().toISOString(),
    catalogs: {
      articles: res.articles ? res.articles.count : 32,
      newsWire: res.news ? res.news.count : 80,
      interviewTracks: res.interviews ? res.interviews.count : 10,
      runbooks: res.runbooks ? res.runbooks.count : 0,
      postmortems: res.postmortems ? res.postmortems.count : 0
    }
  };

  if (args.json) {
    console.log(JSON.stringify(statusInfo, null, 2));
    return;
  }

  console.log(fmt.banner());
  console.log(fmt.rule('PLATFORM & EDGE CDN STATUS'));
  console.log();
  console.log(` ${fmt.bold('CLI Version:')}          ${pkg.version}`);
  console.log(` ${fmt.bold('API Contract:')}         ${statusInfo.apiContractVersion}`);
  console.log(` ${fmt.bold('Edge CDN Endpoint:')}    ${apiClient.baseUrl}`);
  console.log(` ${fmt.bold('Operational Status:')}   ${isHealthy ? fmt.brightGreen('● HEALTHY (200 OK)') : fmt.red('● DEGRADED')}`);
  console.log(` ${fmt.bold('Data Freshness:')}       ${fmt.dim(statusInfo.lastSync)} (${statusInfo.source})`);
  console.log();
  console.log(fmt.rule('INDEXED RESOURCE CATALOGS'));
  console.log();
  console.log(`   Articles & Runbooks:  ${fmt.brightCyan(statusInfo.catalogs.articles)} verified publications`);
  console.log(`   News Wire Items:      ${fmt.brightCyan(statusInfo.catalogs.newsWire)} stories & upstream releases`);
  console.log(`   Interview Tracks:     ${fmt.brightCyan(statusInfo.catalogs.interviewTracks)} domain scenario hubs`);
  console.log(`   Postmortem Radar:     ${fmt.dim('0 active (planned)')}`);
  console.log();
  console.log(fmt.rule());
  console.log(fmt.dim(' Public Edge API: https://www.devopstribune.com/api/'));
  console.log();
}

function handleHelp() {
  console.log(fmt.banner());
  console.log(` ${fmt.bold('Usage:')} dt <command> [subcommand|slug] [options]`);
  console.log();
  console.log(fmt.rule('COMMANDS'));
  console.log();
  console.log(`   ${fmt.bold(fmt.brightCyan('news'))}                 Stream live breaking DevOps news & alerts`);
  console.log(`                        ${fmt.dim('dt news [--category k8s] [--limit 10] [--json]')}`);
  console.log();
  console.log(`   ${fmt.bold(fmt.brightCyan('articles'))}             List architectural guides, runbooks & tutorials`);
  console.log(`                        ${fmt.dim('dt articles [--category cloud] [--tag terraform]')}`);
  console.log();
  console.log(`   ${fmt.bold(fmt.brightCyan('article <slug>'))}       Read full publication details & summary`);
  console.log(`                        ${fmt.dim('dt article terraform-best-practices')}`);
  console.log();
  console.log(`   ${fmt.bold(fmt.brightCyan('interview [track]'))}    Practice senior DevOps & SRE interview drills`);
  console.log(`                        ${fmt.dim('dt interview [k8s|linux|aws|terraform|sre]')}`);
  console.log();
  console.log(`   ${fmt.bold(fmt.brightCyan('passgen [len] [comp]'))}   Generate CSPRNG random secure passwords`);
  console.log(`                        ${fmt.dim('dt passgen 16 3 (or: dt tool passgen 24 3)')}`);
  console.log();
  console.log(`   ${fmt.bold(fmt.brightCyan('cert <target>'))}          Inspect TLS/SSL certificate expiry, SANs & issuer`);
  console.log(`                        ${fmt.dim('dt cert devopstribune.com (or: dt tool cert server.crt)')}`);
  console.log();
  console.log(`   ${fmt.bold(fmt.brightCyan('chmod <perm>'))}           Convert octal & symbolic file permissions`);
  console.log(`                        ${fmt.dim('dt chmod 755 (or: dt chmod rwxr-xr-x)')}`);
  console.log();
  console.log(`   ${fmt.bold(fmt.brightCyan('epoch [val]'))}            Convert Unix epoch timestamps to UTC & relative time`);
  console.log(`                        ${fmt.dim('dt epoch now (or: dt epoch 1795507200)')}`);
  console.log();
  console.log(`   ${fmt.bold(fmt.brightCyan('cidr <block>'))}           Calculate IPv4 subnets, netmasks, & usable hosts`);
  console.log(`                        ${fmt.dim('dt cidr 10.0.0.0/24')}`);
  console.log();
  console.log(`   ${fmt.bold(fmt.brightCyan('cron <expr>'))}            Translate cron expression into plain English`);
  console.log(`                        ${fmt.dim('dt cron "*/15 0-4 * * 1-5"')}`);
  console.log();
  console.log(`   ${fmt.bold(fmt.brightCyan('tool <utility>'))}       Offline developer calculators & formatters`);
  console.log(`                        ${fmt.dim('dt tool [cron|cidr|cert|chmod|epoch|jwt|base64|passgen|hash]')}`);
  console.log();
  console.log(`   ${fmt.bold(fmt.brightCyan('update'))}               Check and update dt to latest release`);
  console.log(`                        ${fmt.dim('dt update [--check|--enable|--disable|--status]')}`);
  console.log();
  console.log(`   ${fmt.bold(fmt.brightCyan('status'))}               Show edge CDN health & content fresh status`);
  console.log(`   ${fmt.bold(fmt.brightCyan('version'))}              Show CLI and schema contract versions`);
  console.log(`   ${fmt.bold(fmt.brightCyan('help'))}                 Show this help screen`);
  console.log();
  console.log(fmt.rule('GLOBAL OPTIONS'));
  console.log();
  console.log(`   ${fmt.cyan('--json')}               Output raw structured JSON for scripts & CI/CD`);
  console.log(`   ${fmt.cyan('--no-color')}           Disable ANSI terminal colors`);
  console.log(`   ${fmt.cyan('--no-update')}          Skip automatic daily update check`);
  console.log(`   ${fmt.cyan('--update')}             Force update check on this command execution`);
  console.log(`   ${fmt.cyan('--no-color')}           Disable ANSI terminal colors`);
  console.log(`   ${fmt.cyan('--version, -v')}        Display CLI version`);
  console.log(`   ${fmt.cyan('--help, -h')}           Display help information`);
  console.log();
}

function handleVersion() {
  console.log(`dt version ${pkg.version} (API contract v1.0.0)`);
}

module.exports = { handleStatus, handleHelp, handleVersion };

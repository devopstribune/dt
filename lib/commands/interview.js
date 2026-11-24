// dt interview command handler
const apiClient = require('../api-client');
const fmt = require('../formatter');

const DOMAIN_ALIASES = {
  k8s: 'kubernetes',
  kube: 'kubernetes',
  tf: 'terraform',
  iac: 'terraform',
  cicd: 'ci-cd',
  ci: 'ci-cd',
  linux: 'linux',
  aws: 'aws',
  cloud: 'aws',
  docker: 'docker',
  containers: 'docker',
  sre: 'observability',
  obs: 'observability',
  platform: 'platform',
  sec: 'security',
  security: 'security',
  finops: 'finops',
  cost: 'finops'
};

async function handleInterview(domainArg, args = {}) {
  const result = await apiClient.getInterviews();

  if (result.error && !result.data) {
    console.error(fmt.red(`Error fetching interview tracks: ${result.error}`));
    process.exitCode = 1;
    return;
  }

  const items = (result.data && (result.data.items || (result.data.data && result.data.data.items))) || [];

  if (args.json && !domainArg) {
    console.log(JSON.stringify(items, null, 2));
    return;
  }

  // If no domain specified, list all available domain tracks
  if (!domainArg) {
    console.log(fmt.banner());
    console.log(fmt.rule('DEVOPS & SRE INTERVIEW HUBS'));
    console.log();
    console.log(' Practice real-world production incident triage and scenario questions:');
    console.log();

    items.forEach((track, idx) => {
      const num = fmt.dim(String(idx + 1).padStart(2, '0'));
      const domainName = fmt.bold((track.slug || track.title).toUpperCase());
      const qCount = fmt.brightGreen(`${track.reading_time_minutes || 15} min drill`);
      const cmd = fmt.brightCyan(`dt interview ${track.slug}`);

      console.log(` ${num} ${domainName} (${qCount})`);
      console.log(`    ${fmt.bold(track.title)}`);
      console.log(`    ${fmt.dim('Command:')} ${cmd}`);
      console.log(`    ${fmt.dim('URL:')} ${track.canonical_url}`);
      console.log();
    });

    console.log(fmt.rule());
    console.log(fmt.dim(` Run 'dt interview <domain>' to drill into a specific topic. Example: dt interview k8s`));
    console.log();
    return;
  }

  const resolvedDomain = DOMAIN_ALIASES[domainArg.toLowerCase()] || domainArg.toLowerCase();
  const track = items.find(t => (t.slug && t.slug.toLowerCase() === resolvedDomain) || (t.id && t.id.toLowerCase().includes(resolvedDomain)));

  if (!track) {
    console.error(fmt.red(`Interview domain '${domainArg}' not found.`));
    console.log(fmt.dim(`Available domains: ${items.map(t => t.slug).join(', ')}`));
    process.exitCode = 1;
    return;
  }

  if (args.json) {
    console.log(JSON.stringify(track, null, 2));
    return;
  }

  console.log(fmt.banner());
  console.log(fmt.rule(`${(track.slug || 'devops').toUpperCase()} INTERVIEW DRILL`));
  console.log();
  console.log(fmt.bold(fmt.brightCyan(` ${track.title}`)));
  console.log(fmt.dim(` Difficulty: Senior / Staff SRE · ${track.reading_time_minutes || 15} min architectural drill`));
  console.log();
  console.log(fmt.rule('SCENARIO TRIAGE FRAMEWORK (STAR METHOD)'));
  console.log();
  console.log(` 1. ${fmt.bold('Situation:')} Identify symptoms, impact blast radius, and critical SLO breaches.`);
  console.log(` 2. ${fmt.bold('Task:')} Formulate hypothesis; inspect logs, traces, and metrics before mutating state.`);
  console.log(` 3. ${fmt.bold('Action:')} Execute rollback/mitigation first, then isolate root cause.`);
  console.log(` 4. ${fmt.bold('Result:')} Document postmortem, add automated monitors, and prevent recurrence.`);
  console.log();
  console.log(fmt.rule('COMPLETE CURATED QUESTION BANK'));
  console.log();
  console.log(` Access full architectural questions, diagrams, and model answers:`);
  console.log(` ${fmt.brightCyan(track.canonical_url)}`);
  console.log();
}

module.exports = handleInterview;

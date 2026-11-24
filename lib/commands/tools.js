// Offline DevOps & Cloud Utilities Engine for dt CLI
const crypto = require('node:crypto');
const fmt = require('../formatter');

// ── 1. Cron Explainer & Validator ──────────────────────────────────────────
function parseCron(expression) {
  if (!expression || typeof expression !== 'string') {
    throw new Error('Please provide a 5-part cron expression. Example: dt tool cron "*/15 * * * *"');
  }

  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) {
    throw new Error(`Cron expression must have exactly 5 parts (minute hour day-of-month month day-of-week). Got ${parts.length}: "${expression}"`);
  }

  const [min, hour, dom, month, dow] = parts;

  function explainField(val, name, minVal, maxVal) {
    if (val === '*') return `every ${name}`;
    if (val.startsWith('*/')) return `every ${val.slice(2)} ${name}s`;
    if (val.includes(',')) return `at ${name}s ${val}`;
    if (val.includes('-')) return `from ${name} ${val.replace('-', ' through ')}`;
    return `at ${name} ${val}`;
  }

  const explanation = [
    explainField(min, 'minute', 0, 59),
    explainField(hour, 'hour', 0, 23),
    explainField(dom, 'day of month', 1, 31),
    explainField(month, 'month', 1, 12),
    explainField(dow, 'day of week', 0, 6)
  ].join(', ');

  return {
    expression,
    minute: min,
    hour,
    dayOfMonth: dom,
    month,
    dayOfWeek: dow,
    humanDescription: `Runs ${explanation}.`
  };
}

// ── 2. CIDR & Subnet Calculator ───────────────────────────────────────────
function parseCidr(cidrStr) {
  if (!cidrStr || !cidrStr.includes('/')) {
    throw new Error('Please provide a valid IPv4 CIDR. Example: dt tool cidr "10.0.0.0/24"');
  }

  const [ipStr, prefixStr] = cidrStr.trim().split('/');
  const prefix = parseInt(prefixStr, 10);
  if (isNaN(prefix) || prefix < 0 || prefix > 32) {
    throw new Error(`Invalid CIDR prefix /${prefixStr}. Must be between 0 and 32.`);
  }

  const octets = ipStr.split('.').map(Number);
  if (octets.length !== 4 || octets.some(o => isNaN(o) || o < 0 || o > 255)) {
    throw new Error(`Invalid IPv4 address: ${ipStr}`);
  }

  const ipInt = (octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3];
  const maskInt = prefix === 0 ? 0 : (~0 << (32 - prefix));

  const networkInt = ipInt & maskInt;
  const broadcastInt = networkInt | (~maskInt);

  function intToIp(val) {
    return [
      (val >>> 24) & 255,
      (val >>> 16) & 255,
      (val >>> 8) & 255,
      val & 255
    ].join('.');
  }

  const totalIps = Math.pow(2, 32 - prefix);
  const usableIps = prefix >= 31 ? (prefix === 31 ? 2 : 1) : Math.max(0, totalIps - 2);
  const firstUsable = prefix >= 31 ? networkInt : networkInt + 1;
  const lastUsable = prefix >= 31 ? broadcastInt : broadcastInt - 1;

  return {
    cidr: `${intToIp(networkInt)}/${prefix}`,
    ipAddress: ipStr,
    netmask: intToIp(maskInt),
    wildcardMask: intToIp(~maskInt),
    networkAddress: intToIp(networkInt),
    broadcastAddress: intToIp(broadcastInt),
    firstUsableHost: intToIp(firstUsable),
    lastUsableHost: intToIp(lastUsable),
    totalAddresses: totalIps,
    usableHosts: usableIps
  };
}

// ── 3. JWT Inspector (Offline Token Decoder) ──────────────────────────────
function parseJwt(token) {
  if (!token || typeof token !== 'string') {
    throw new Error('Please provide a JWT string. Example: dt tool jwt "eyJhbGciOi..."');
  }

  const parts = token.trim().split('.');
  if (parts.length !== 3) {
    throw new Error(`Invalid JWT format: expected 3 dot-separated segments, got ${parts.length}.`);
  }

  function b64urlDecode(str) {
    let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    return Buffer.from(b64, 'base64').toString('utf8');
  }

  let header, payload;
  try {
    header = JSON.parse(b64urlDecode(parts[0]));
  } catch (err) {
    throw new Error(`Failed to decode JWT Header: ${err.message}`);
  }

  try {
    payload = JSON.parse(b64urlDecode(parts[1]));
  } catch (err) {
    throw new Error(`Failed to decode JWT Payload: ${err.message}`);
  }

  let isExpired = false;
  let expiresAt = null;
  if (payload.exp) {
    expiresAt = new Date(payload.exp * 1000).toISOString();
    isExpired = Date.now() > payload.exp * 1000;
  }

  return {
    header,
    payload,
    signaturePresent: Boolean(parts[2]),
    isExpired,
    expiresAt
  };
}

// ── 4. Base64 & Kubernetes Secret Formatter ──────────────────────────────
function handleBase64(mode, input) {
  if (!mode || (mode !== 'encode' && mode !== 'decode')) {
    throw new Error('Please specify "encode" or "decode". Example: dt tool base64 encode "my-secret"');
  }
  if (!input) {
    throw new Error('Please provide the text string to process.');
  }

  if (mode === 'encode') {
    const encoded = Buffer.from(input, 'utf8').toString('base64');
    return {
      mode: 'encode',
      input,
      output: encoded,
      kubernetesYamlSnippet: `apiVersion: v1\nkind: Secret\nmetadata:\n  name: my-app-secret\ntype: Opaque\ndata:\n  SECRET_KEY: ${encoded}`
    };
  } else {
    const decoded = Buffer.from(input, 'base64').toString('utf8');
    return {
      mode: 'decode',
      input,
      output: decoded
    };
  }
}

// ── 5. Random Password Generator (CSPRNG) ──────────────────────────────────
function generatePassword(length = 12, complexity = 3) {
  const len = parseInt(length, 10);
  if (isNaN(len) || len < 4 || len > 256) {
    throw new Error('Password length must be an integer between 4 and 256. Example: dt tool passgen 16 3');
  }

  const comp = parseInt(complexity, 10);
  if (isNaN(comp) || comp < 1 || comp > 3) {
    throw new Error('Complexity must be 1 (Alphanumeric), 2 (Alphanumeric + Special), or 3 (Industry Standard).');
  }

  const uppers = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowers = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const specials = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  let pool = '';
  const guaranteed = [];

  function securePick(str) {
    const idx = crypto.randomInt(0, str.length);
    return str[idx];
  }

  if (comp === 1) {
    pool = uppers + lowers + digits;
    guaranteed.push(securePick(uppers), securePick(lowers), securePick(digits));
  } else if (comp === 2) {
    pool = uppers + lowers + digits + specials;
    guaranteed.push(securePick(uppers), securePick(lowers), securePick(digits), securePick(specials));
  } else {
    // 3 - Industry Standard
    pool = uppers + lowers + digits + specials;
    guaranteed.push(securePick(uppers), securePick(lowers), securePick(digits), securePick(specials));
  }

  const result = [...guaranteed];
  while (result.length < len) {
    result.push(securePick(pool));
  }

  // Fisher-Yates cryptographically secure shuffle
  for (let i = result.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }

  const password = result.join('');
  const entropyBits = Number((len * Math.log2(pool.length)).toFixed(1));
  const complexityNames = {
    1: 'Alphanumeric (Letters & Numbers)',
    2: 'Alphanumeric + Special Characters',
    3: 'Industry Standard (Upper, Lower, Number, Special)'
  };

  return {
    password,
    length: len,
    complexity: comp,
    complexityName: complexityNames[comp],
    entropyBits,
    poolSize: pool.length,
    strength: entropyBits >= 90 ? 'Military Grade' : entropyBits >= 70 ? 'Very Strong' : entropyBits >= 50 ? 'Strong' : 'Moderate'
  };
}

// ── CLI Command Dispatcher ────────────────────────────────────────────────
async function handleTools(subTool, args = {}) {
  if (!subTool) {
    console.log(fmt.banner());
    console.log(fmt.rule('OFFLINE CLOUD & SRE UTILITIES'));
    console.log();
    console.log(' Available offline tools (Zero network latency, 100% private):');
    console.log();
    console.log(` 1. ${fmt.bold('cron')}      · Parse and explain cron schedules`);
    console.log(`    ${fmt.dim('Usage:')}     ${fmt.brightCyan('dt tool cron "*/15 0-4 * * 1-5"')}`);
    console.log();
    console.log(` 2. ${fmt.bold('cidr')}      · Calculate VPC subnets, usable IP ranges, and broadcast`);
    console.log(`    ${fmt.dim('Usage:')}     ${fmt.brightCyan('dt tool cidr "172.16.0.0/20"')}`);
    console.log();
    console.log(` 3. ${fmt.bold('jwt')}       · Inspect and decode JWT header & claims without verification leakage`);
    console.log(`    ${fmt.dim('Usage:')}     ${fmt.brightCyan('dt tool jwt "<token>"')}`);
    console.log();
    console.log(` 4. ${fmt.bold('base64')}    · Encode/decode strings and generate Kubernetes Secret YAMLs`);
    console.log(`    ${fmt.dim('Usage:')}     ${fmt.brightCyan('dt tool base64 encode "db_password_123"')}`);
    console.log();
    console.log(` 5. ${fmt.bold('passgen')}   · Generate random passwords with specified length and complexity`);
    console.log(`    ${fmt.dim('Usage:')}     ${fmt.brightCyan('dt tool passgen 16 3')}`);
    console.log();
    console.log(fmt.rule());
    console.log(fmt.dim(' Run with --json for machine-readable output in scripts and pipelines.'));
    console.log();
    return;
  }

  try {
    switch (subTool.toLowerCase()) {
      case 'cron': {
        const expr = args._subArgs ? args._subArgs.join(' ') : args.expression;
        const res = parseCron(expr);
        if (args.json) return console.log(JSON.stringify(res, null, 2));

        console.log(fmt.banner());
        console.log(fmt.rule('CRON SCHEDULE EXPLAINER'));
        console.log();
        console.log(` ${fmt.bold('Expression:')}  ${fmt.brightCyan(res.expression)}`);
        console.log(` ${fmt.bold('Summary:')}     ${fmt.green(res.humanDescription)}`);
        console.log();
        console.log(`   Minute:       ${res.minute}`);
        console.log(`   Hour:         ${res.hour}`);
        console.log(`   Day of Month: ${res.dayOfMonth}`);
        console.log(`   Month:        ${res.month}`);
        console.log(`   Day of Week:  ${res.dayOfWeek}`);
        console.log();
        break;
      }

      case 'cidr': {
        const input = args._subArgs ? args._subArgs[0] : args.cidr;
        const res = parseCidr(input);
        if (args.json) return console.log(JSON.stringify(res, null, 2));

        console.log(fmt.banner());
        console.log(fmt.rule('VPC & SUBNET CIDR CALCULATOR'));
        console.log();
        console.log(` ${fmt.bold('CIDR Block:')}         ${fmt.brightCyan(res.cidr)}`);
        console.log(` ${fmt.bold('Netmask:')}            ${res.netmask}`);
        console.log(` ${fmt.bold('Network Address:')}    ${res.networkAddress}`);
        console.log(` ${fmt.bold('Broadcast Address:')}  ${res.broadcastAddress}`);
        console.log(` ${fmt.bold('Usable Host Range:')}  ${fmt.green(res.firstUsableHost)} → ${fmt.green(res.lastUsableHost)}`);
        console.log(` ${fmt.bold('Usable Hosts:')}       ${fmt.brightCyan(res.usableHosts.toLocaleString())} (Total IPs: ${res.totalAddresses.toLocaleString()})`);
        console.log();
        break;
      }

      case 'jwt': {
        const token = args._subArgs ? args._subArgs[0] : args.token;
        const res = parseJwt(token);
        if (args.json) return console.log(JSON.stringify(res, null, 2));

        console.log(fmt.banner());
        console.log(fmt.rule('JWT TOKEN INSPECTOR (OFFLINE)'));
        console.log();
        console.log(fmt.bold(' Header:'));
        console.log(JSON.stringify(res.header, null, 2));
        console.log();
        console.log(fmt.bold(' Payload Claims:'));
        console.log(JSON.stringify(res.payload, null, 2));
        console.log();
        if (res.expiresAt) {
          const status = res.isExpired ? fmt.red('EXPIRED') : fmt.green('VALID');
          console.log(` ${fmt.bold('Status:')} ${status} (Expires: ${res.expiresAt})`);
        }
        console.log(fmt.dim(' [Note] Offline inspection only. Never transmit secrets to unverified servers.'));
        console.log();
        break;
      }

      case 'base64': {
        const mode = args._subArgs ? args._subArgs[0] : args.mode;
        const str = args._subArgs ? args._subArgs.slice(1).join(' ') : args.input;
        const res = handleBase64(mode, str);
        if (args.json) return console.log(JSON.stringify(res, null, 2));

        console.log(fmt.banner());
        console.log(fmt.rule(`BASE64 ${res.mode.toUpperCase()}`));
        console.log();
        console.log(` ${fmt.bold('Output:')} ${fmt.brightGreen(res.output)}`);
        console.log();
        if (res.kubernetesYamlSnippet) {
          console.log(fmt.bold(' Kubernetes Secret Snippet:'));
          console.log(fmt.dim(res.kubernetesYamlSnippet));
          console.log();
        }
        break;
      }

      case 'passgen':
      case 'password': {
        const length = args._subArgs && args._subArgs[0] ? args._subArgs[0] : 12;
        const complexity = args._subArgs && args._subArgs[1] ? args._subArgs[1] : 3;
        const res = generatePassword(length, complexity);
        if (args.json) return console.log(JSON.stringify(res, null, 2));

        console.log(fmt.banner());
        console.log(fmt.rule('RANDOM PASSWORD GENERATOR (CSPRNG)'));
        console.log();
        console.log(` ${fmt.bold('Password:')}    ${fmt.brightGreen(res.password)}`);
        console.log(` ${fmt.bold('Length:')}      ${res.length} characters`);
        console.log(` ${fmt.bold('Complexity:')}  Level ${res.complexity} (${res.complexityName})`);
        console.log(` ${fmt.bold('Entropy:')}     ${res.entropyBits} bits (${fmt.green(res.strength)})`);
        console.log();
        console.log(fmt.dim(' [Note] Generated locally using OS entropy. Zero network transmission.'));
        console.log();
        break;
      }

      default:
        console.error(fmt.red(`Unknown tool: '${subTool}'. Run 'dt tool' to see available tools.`));
        process.exitCode = 1;
    }
  } catch (err) {
    console.error(fmt.red(`Tool Error: ${err.message}`));
    process.exitCode = 1;
  }
}

module.exports = { handleTools, parseCron, parseCidr, parseJwt, handleBase64, generatePassword };

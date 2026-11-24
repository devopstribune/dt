// Offline DevOps & Cloud Utilities Engine for dt CLI
// Documentation & Web Tools: https://www.devopstribune.com/tools/
const crypto = require('node:crypto');
const fs = require('node:fs');
const tls = require('node:tls');
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
    humanDescription: `Runs ${explanation}.`,
    webToolUrl: 'https://www.devopstribune.com/tools/cron/'
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
    usableHosts: usableIps,
    webToolUrl: 'https://www.devopstribune.com/tools/cidr/'
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
    expiresAt,
    webToolUrl: 'https://www.devopstribune.com/tools/jwt/'
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
      kubernetesYamlSnippet: `apiVersion: v1\nkind: Secret\nmetadata:\n  name: my-app-secret\ntype: Opaque\ndata:\n  SECRET_KEY: ${encoded}`,
      webToolUrl: 'https://www.devopstribune.com/tools/base64/'
    };
  } else {
    const decoded = Buffer.from(input, 'base64').toString('utf8');
    return {
      mode: 'decode',
      input,
      output: decoded,
      webToolUrl: 'https://www.devopstribune.com/tools/base64/'
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
    strength: entropyBits >= 90 ? 'Military Grade' : entropyBits >= 70 ? 'Very Strong' : entropyBits >= 50 ? 'Strong' : 'Moderate',
    webToolUrl: 'https://www.devopstribune.com/tools/password-generator/'
  };
}

// ── 6. TLS / SSL Certificate Inspector ──────────────────────────────────
function inspectCert(target) {
  if (!target || typeof target !== 'string') {
    throw new Error('Please provide a hostname or certificate file path. Example: dt tool cert "devopstribune.com" or dt tool cert "cert.pem"');
  }

  target = target.trim();

  // Local file inspection
  if (fs.existsSync(target) && fs.statSync(target).isFile()) {
    const raw = fs.readFileSync(target, 'utf8');
    const x509 = new crypto.X509Certificate(raw);
    const now = Date.now();
    const validTo = new Date(x509.validTo).getTime();
    const validFrom = new Date(x509.validFrom).getTime();
    const daysRemaining = Math.round((validTo - now) / (1000 * 60 * 60 * 24));
    const isExpired = now > validTo;

    return Promise.resolve({
      target,
      source: 'file',
      subject: x509.subject,
      issuer: x509.issuer,
      validFrom: x509.validFrom,
      validTo: x509.validTo,
      daysRemaining,
      isExpired,
      status: isExpired ? 'EXPIRED' : daysRemaining <= 7 ? 'CRITICAL' : daysRemaining <= 30 ? 'EXPIRING_SOON' : 'HEALTHY',
      subjectAltNames: x509.subjectAltName ? x509.subjectAltName.split(', ').map(s => s.replace(/^DNS:/, '')) : [],
      fingerprint256: x509.fingerprint256,
      serialNumber: x509.serialNumber,
      webToolUrl: 'https://www.devopstribune.com/tools/'
    });
  }

  // Sanitize remote hostname
  target = target.replace(/^https?:\/\//i, '').replace(/\/.*$/, '');

  // Remote hostname & port
  let host = target;
  let port = 443;
  if (target.includes(':')) {
    const parts = target.split(':');
    host = parts[0];
    port = parseInt(parts[1], 10) || 443;
  }

  const https = require('node:https');

  return new Promise((resolve, reject) => {
    const req = https.request({
      host,
      port,
      method: 'HEAD',
      path: '/',
      rejectUnauthorized: false,
      timeout: 10000
    }, (res) => {
      try {
        const socket = res.socket;
        const cert = socket.getPeerCertificate(true);
        const cipher = socket.getCipher();
        const protocol = socket.getProtocol();
        req.destroy();

        if (!cert || !cert.valid_to) {
          return reject(new Error(`No TLS certificate returned by ${host}:${port}`));
        }

        const now = Date.now();
        const validTo = new Date(cert.valid_to).getTime();
        const validFrom = new Date(cert.valid_from).getTime();
        const daysRemaining = Math.round((validTo - now) / (1000 * 60 * 60 * 24));
        const isExpired = now > validTo;

        const sans = cert.subjectaltname
          ? cert.subjectaltname.split(', ').map(s => s.replace(/^DNS:/, ''))
          : [];

        resolve({
          target: `${host}:${port}`,
          source: 'remote',
          host,
          port,
          protocol,
          cipher: cipher ? cipher.name : 'Unknown',
          subject: cert.subject ? (cert.subject.CN || cert.subject.O || 'Unknown') : 'Unknown',
          issuer: cert.issuer ? (cert.issuer.O || cert.issuer.CN || 'Unknown') : 'Unknown',
          validFrom: new Date(validFrom).toISOString(),
          validTo: new Date(validTo).toISOString(),
          daysRemaining,
          isExpired,
          status: isExpired ? 'EXPIRED' : daysRemaining <= 7 ? 'CRITICAL' : daysRemaining <= 30 ? 'EXPIRING_SOON' : 'HEALTHY',
          subjectAltNames: sans,
          fingerprint256: cert.fingerprint256,
          serialNumber: cert.serialNumber,
          webToolUrl: 'https://www.devopstribune.com/tools/'
        });
      } catch (err) {
        req.destroy();
        reject(err);
      }
    });

    req.on('error', (err) => reject(new Error(`TLS connection to ${host}:${port} failed: ${err.message}`)));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`TLS connection to ${host}:${port} timed out after 10s`));
    });
    req.end();
  });
}

// ── 7. Linux Chmod & File Permissions Explainer ──────────────────────────
function parseChmod(val) {
  if (!val || typeof val !== 'string') {
    throw new Error('Please provide an octal or symbolic permission. Example: dt tool chmod 755 or dt tool chmod rwxr-xr-x');
  }

  val = val.trim();

  // If symbolic like "rwxr-xr-x" or "-rwxr-xr-x"
  if (/^[-d]?[rwxstST-]{9}$/.test(val)) {
    const raw = val.length === 10 ? val.slice(1) : val;
    function oct(r, w, x) {
      let n = 0;
      if (r === 'r') n += 4;
      if (w === 'w') n += 2;
      if (x === 'x' || x === 's' || x === 't') n += 1;
      return n;
    }
    const u = oct(raw[0], raw[1], raw[2]);
    const g = oct(raw[3], raw[4], raw[5]);
    const o = oct(raw[6], raw[7], raw[8]);
    let special = 0;
    if (raw[2] === 's' || raw[2] === 'S') special += 4;
    if (raw[5] === 's' || raw[5] === 'S') special += 2;
    if (raw[8] === 't' || raw[8] === 'T') special += 1;

    return buildChmodResult(special, u, g, o);
  }

  // If octal like "755", "0644", "4755", "1777"
  if (/^[0-7]{3,4}$/.test(val)) {
    const padded = val.length === 3 ? '0' + val : val;
    const special = parseInt(padded[0], 10);
    const u = parseInt(padded[1], 10);
    const g = parseInt(padded[2], 10);
    const o = parseInt(padded[3], 10);
    return buildChmodResult(special, u, g, o);
  }

  throw new Error(`Invalid chmod notation "${val}". Supported: octal (755, 644, 4755) or symbolic (rwxr-xr-x, rw-r--r--).`);
}

function buildChmodResult(special, u, g, o) {
  function triplet(n) {
    return (n & 4 ? 'r' : '-') + (n & 2 ? 'w' : '-') + (n & 1 ? 'x' : '-');
  }

  let uS = triplet(u);
  let gS = triplet(g);
  let oS = triplet(o);

  if (special & 4) uS = uS.slice(0, 2) + (u & 1 ? 's' : 'S');
  if (special & 2) gS = gS.slice(0, 2) + (g & 1 ? 's' : 'S');
  if (special & 1) oS = oS.slice(0, 2) + (o & 1 ? 't' : 'T');

  const symbolic = uS + gS + oS;
  const octal = `${special}${u}${g}${o}`;
  const shortOctal = special === 0 ? `${u}${g}${o}` : octal;

  function describeBits(n) {
    const list = [];
    if (n & 4) list.push('Read');
    if (n & 2) list.push('Write');
    if (n & 1) list.push('Execute');
    return list.length ? list.join(' + ') : 'None';
  }

  const specialNames = [];
  if (special & 4) specialNames.push('SUID (Set User ID)');
  if (special & 2) specialNames.push('SGID (Set Group ID)');
  if (special & 1) specialNames.push('Sticky Bit');

  let risk = 'Normal';
  let recommendation = 'Standard file permission.';
  if (u === 7 && g === 7 && o === 7) {
    risk = 'CRITICAL (World-Writable)';
    recommendation = 'NEVER use 777 in production. Any unprivileged local user or compromised service can overwrite or delete this file.';
  } else if (special & 4) {
    risk = 'HIGH (SUID Execution)';
    recommendation = 'Runs with file owner (root) privilege. Ensure binary cannot be exploited for privilege escalation.';
  } else if (shortOctal === '644') {
    recommendation = 'Standard secure permission for public files, HTML, CSS, and configuration files.';
  } else if (shortOctal === '755') {
    recommendation = 'Standard secure permission for binaries, scripts, and traversable directories.';
  } else if (shortOctal === '600') {
    recommendation = 'Secure permission for private keys, database credentials, and secrets.';
  } else if (shortOctal === '700') {
    recommendation = 'Secure permission for user-only private directories (e.g. ~/.ssh).';
  }

  return {
    octal: shortOctal,
    fullOctal: octal,
    symbolic,
    user: { value: u, symbolic: uS, permissions: describeBits(u) },
    group: { value: g, symbolic: gS, permissions: describeBits(g) },
    others: { value: o, symbolic: oS, permissions: describeBits(o) },
    specialBits: specialNames.length ? specialNames.join(', ') : 'None',
    securityRisk: risk,
    recommendation,
    webToolUrl: 'https://www.devopstribune.com/tools/'
  };
}

// ── 8. Unix Epoch & Timestamp Converter ──────────────────────────────────
function parseEpoch(input) {
  let date;
  if (!input || input === 'now') {
    date = new Date();
  } else if (/^\d+$/.test(String(input).trim())) {
    const num = Number(input);
    date = num > 1e11 ? new Date(num) : new Date(num * 1000);
  } else {
    date = new Date(input);
  }

  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date or epoch input: "${input}". Provide integer epoch or ISO date.`);
  }

  const epochSec = Math.floor(date.getTime() / 1000);
  const epochMs = date.getTime();
  const now = Date.now();
  const diffSec = Math.floor((now - epochMs) / 1000);

  function formatRelative(seconds) {
    if (Math.abs(seconds) < 5) return 'just now';
    const isPast = seconds > 0;
    const abs = Math.abs(seconds);
    let str = '';
    if (abs < 60) str = `${abs} second${abs === 1 ? '' : 's'}`;
    else if (abs < 3600) str = `${Math.floor(abs / 60)} minute${Math.floor(abs / 60) === 1 ? '' : 's'}`;
    else if (abs < 86400) str = `${Math.floor(abs / 3600)} hour${Math.floor(abs / 3600) === 1 ? '' : 's'}`;
    else str = `${Math.floor(abs / 86400)} day${Math.floor(abs / 86400) === 1 ? '' : 's'}`;
    return isPast ? `${str} ago` : `in ${str}`;
  }

  return {
    epochSeconds: epochSec,
    epochMilliseconds: epochMs,
    isoUtc: date.toISOString(),
    rfc2822: date.toUTCString(),
    relativeTime: formatRelative(diffSec),
    webToolUrl: 'https://www.devopstribune.com/tools/timestamp/'
  };
}

// ── 9. Hash Calculator ──────────────────────────────────────────────────
function calculateHash(algo = 'sha256', text = '') {
  const supported = ['sha256', 'sha512', 'sha1', 'md5'];
  algo = (algo || 'sha256').toLowerCase();
  if (!supported.includes(algo)) {
    throw new Error(`Unsupported algorithm "${algo}". Supported: ${supported.join(', ')}`);
  }
  if (typeof text !== 'string') text = String(text);

  const hash = crypto.createHash(algo).update(text, 'utf8');
  const hex = hash.digest('hex');

  return {
    algorithm: algo.toUpperCase(),
    inputLengthBytes: Buffer.byteLength(text, 'utf8'),
    hashHex: hex,
    webToolUrl: 'https://www.devopstribune.com/tools/hash/'
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
    console.log(` 1. ${fmt.bold('cron')}      · Parse and explain cron schedules in human English`);
    console.log(`    ${fmt.dim('Usage:')}     ${fmt.brightCyan('dt tool cron "*/15 0-4 * * 1-5"')}`);
    console.log();
    console.log(` 2. ${fmt.bold('cidr')}      · Calculate VPC subnets, usable IP ranges, and broadcast boundaries`);
    console.log(`    ${fmt.dim('Usage:')}     ${fmt.brightCyan('dt tool cidr "172.16.0.0/20"')}`);
    console.log();
    console.log(` 3. ${fmt.bold('cert')}      · Inspect TLS/SSL certificate expiry, SANs, issuer & cipher`);
    console.log(`    ${fmt.dim('Usage:')}     ${fmt.brightCyan('dt tool cert "devopstribune.com"')}`);
    console.log();
    console.log(` 4. ${fmt.bold('chmod')}     · Convert octal & symbolic file permissions with security advisory`);
    console.log(`    ${fmt.dim('Usage:')}     ${fmt.brightCyan('dt tool chmod 755 (or: dt chmod rwxr-xr-x)')}`);
    console.log();
    console.log(` 5. ${fmt.bold('epoch')}     · Convert Unix epoch timestamps to UTC, RFC 2822 & relative time`);
    console.log(`    ${fmt.dim('Usage:')}     ${fmt.brightCyan('dt tool epoch 1795507200 (or: dt epoch now)')}`);
    console.log();
    console.log(` 6. ${fmt.bold('passgen')}   · Generate cryptographically secure random passwords (CSPRNG)`);
    console.log(`    ${fmt.dim('Usage:')}     ${fmt.brightCyan('dt tool passgen 16 3')}`);
    console.log();
    console.log(` 7. ${fmt.bold('jwt')}       · Inspect and decode JWT header & claims without verification leakage`);
    console.log(`    ${fmt.dim('Usage:')}     ${fmt.brightCyan('dt tool jwt "<token>"')}`);
    console.log();
    console.log(` 8. ${fmt.bold('base64')}    · Encode/decode strings and generate Kubernetes Secret YAMLs`);
    console.log(`    ${fmt.dim('Usage:')}     ${fmt.brightCyan('dt tool base64 encode "db_password_123"')}`);
    console.log();
    console.log(` 9. ${fmt.bold('hash')}      · Generate SHA-256, SHA-512, MD5 checksums for payloads`);
    console.log(`    ${fmt.dim('Usage:')}     ${fmt.brightCyan('dt tool hash sha256 "payload"')}`);
    console.log();
    console.log(fmt.rule());
    console.log(fmt.dim(' Interactive Web Utilities: https://www.devopstribune.com/tools/'));
    console.log(fmt.dim(' Run with --json for machine-readable output in CI/CD pipelines.'));
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
        console.log(` ${fmt.bold('Expression:')}   ${fmt.brightCyan(res.expression)}`);
        console.log(` ${fmt.bold('Description:')}  ${fmt.green(res.humanDescription)}`);
        console.log();
        console.log(` ${fmt.bold('Breakdown:')}`);
        console.log(`   Minute:        ${res.minute}`);
        console.log(`   Hour:          ${res.hour}`);
        console.log(`   Day of Month:  ${res.dayOfMonth}`);
        console.log(`   Month:         ${res.month}`);
        console.log(`   Day of Week:   ${res.dayOfWeek}`);
        console.log();
        console.log(fmt.dim(` Web Tool: ${res.webToolUrl}`));
        console.log();
        break;
      }

      case 'cidr':
      case 'subnet': {
        const cidrStr = args._subArgs ? args._subArgs[0] : args.cidr;
        const res = parseCidr(cidrStr);
        if (args.json) return console.log(JSON.stringify(res, null, 2));

        console.log(fmt.banner());
        console.log(fmt.rule('CIDR & SUBNET CALCULATOR'));
        console.log();
        console.log(` ${fmt.bold('CIDR Block:')}         ${fmt.brightCyan(res.cidr)}`);
        console.log(` ${fmt.bold('Netmask:')}            ${res.netmask} (Wildcard: ${res.wildcardMask})`);
        console.log(` ${fmt.bold('Network Address:')}    ${res.networkAddress}`);
        console.log(` ${fmt.bold('Broadcast Address:')}  ${res.broadcastAddress}`);
        console.log(` ${fmt.bold('Usable Range:')}       ${res.firstUsableHost} - ${res.lastUsableHost}`);
        console.log(` ${fmt.bold('Usable Hosts:')}       ${fmt.brightCyan(res.usableHosts.toLocaleString())} (Total IPs: ${res.totalAddresses.toLocaleString()})`);
        console.log();
        console.log(fmt.dim(` Web Tool: ${res.webToolUrl}`));
        console.log();
        break;
      }

      case 'cert':
      case 'ssl':
      case 'tls': {
        const target = args._subArgs ? args._subArgs[0] : args.target;
        const res = await inspectCert(target);
        if (args.json) return console.log(JSON.stringify(res, null, 2));

        console.log(fmt.banner());
        console.log(fmt.rule('TLS / SSL CERTIFICATE INSPECTOR'));
        console.log();
        console.log(` ${fmt.bold('Target:')}           ${fmt.brightCyan(res.target)} (${res.source})`);
        console.log(` ${fmt.bold('Common Name:')}      ${res.subject}`);
        console.log(` ${fmt.bold('Issuer:')}           ${res.issuer}`);
        console.log(` ${fmt.bold('Protocol/Cipher:')}  ${res.protocol || 'N/A'} (${res.cipher || 'N/A'})`);
        console.log();

        const statusColor = res.status === 'HEALTHY' ? fmt.green : res.status === 'EXPIRING_SOON' ? fmt.yellow : fmt.red;
        console.log(` ${fmt.bold('Status:')}           ${statusColor(res.status)} (${res.daysRemaining} days remaining)`);
        console.log(` ${fmt.bold('Validity Window:')}  ${res.validFrom} → ${res.validTo}`);
        console.log();

        if (res.subjectAltNames && res.subjectAltNames.length > 0) {
          console.log(` ${fmt.bold('SANs:')}             ${res.subjectAltNames.slice(0, 8).join(', ')}${res.subjectAltNames.length > 8 ? ` (+${res.subjectAltNames.length - 8} more)` : ''}`);
        }
        if (res.fingerprint256) {
          console.log(` ${fmt.bold('SHA-256 Digest:')}   ${fmt.dim(res.fingerprint256)}`);
        }
        console.log();
        console.log(fmt.dim(' Explore more DevOps guides: https://www.devopstribune.com/'));
        console.log();
        break;
      }

      case 'chmod':
      case 'permissions': {
        const perm = args._subArgs ? args._subArgs[0] : args.input;
        const res = parseChmod(perm);
        if (args.json) return console.log(JSON.stringify(res, null, 2));

        console.log(fmt.banner());
        console.log(fmt.rule('LINUX CHMOD & PERMISSION EXPLAINER'));
        console.log();
        console.log(` ${fmt.bold('Octal:')}          ${fmt.brightCyan(res.octal)} (Full: ${res.fullOctal})`);
        console.log(` ${fmt.bold('Symbolic:')}       ${fmt.brightGreen(res.symbolic)}`);
        console.log();
        console.log(` ${fmt.bold('Breakdown:')}`);
        console.log(`   User (Owner):  ${res.user.symbolic} (${res.user.permissions})`);
        console.log(`   Group:         ${res.group.symbolic} (${res.group.permissions})`);
        console.log(`   Others:        ${res.others.symbolic} (${res.others.permissions})`);
        if (res.specialBits !== 'None') {
          console.log(`   Special Bits:  ${fmt.yellow(res.specialBits)}`);
        }
        console.log();
        const riskColor = res.securityRisk.startsWith('CRITICAL') ? fmt.red : res.securityRisk.startsWith('HIGH') ? fmt.yellow : fmt.green;
        console.log(` ${fmt.bold('Security Risk:')}  ${riskColor(res.securityRisk)}`);
        console.log(` ${fmt.bold('Best Practice:')}  ${res.recommendation}`);
        console.log();
        console.log(fmt.dim(' Linux SRE Best Practices: https://www.devopstribune.com/articles/linux-commands-for-devops-engineers/'));
        console.log();
        break;
      }

      case 'epoch':
      case 'timestamp':
      case 'time': {
        const input = args._subArgs ? args._subArgs.join(' ') : args.input;
        const res = parseEpoch(input);
        if (args.json) return console.log(JSON.stringify(res, null, 2));

        console.log(fmt.banner());
        console.log(fmt.rule('UNIX EPOCH & TIMESTAMP CONVERTER'));
        console.log();
        console.log(` ${fmt.bold('Epoch Seconds:')}       ${fmt.brightCyan(res.epochSeconds)}`);
        console.log(` ${fmt.bold('Epoch Milliseconds:')}  ${res.epochMilliseconds}`);
        console.log(` ${fmt.bold('UTC ISO 8601:')}        ${fmt.brightGreen(res.isoUtc)}`);
        console.log(` ${fmt.bold('RFC 2822:')}            ${res.rfc2822}`);
        console.log(` ${fmt.bold('Relative Time:')}       ${fmt.yellow(res.relativeTime)}`);
        console.log();
        console.log(fmt.dim(` Web Timestamp Tool: ${res.webToolUrl}`));
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
        console.log(fmt.dim(` Web JWT Decoder: ${res.webToolUrl}`));
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
        console.log(fmt.dim(` Web Base64 Tool: ${res.webToolUrl}`));
        console.log();
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
        console.log(fmt.dim(` Web Password Generator: ${res.webToolUrl}`));
        console.log();
        break;
      }

      case 'hash': {
        const algo = args._subArgs && args._subArgs[0] ? args._subArgs[0] : 'sha256';
        const payload = args._subArgs && args._subArgs.length > 1 ? args._subArgs.slice(1).join(' ') : '';
        const res = calculateHash(algo, payload);
        if (args.json) return console.log(JSON.stringify(res, null, 2));

        console.log(fmt.banner());
        console.log(fmt.rule(`HASH CALCULATOR (${res.algorithm})`));
        console.log();
        console.log(` ${fmt.bold('Algorithm:')}   ${fmt.brightCyan(res.algorithm)}`);
        console.log(` ${fmt.bold('Digest:')}      ${fmt.brightGreen(res.hashHex)}`);
        console.log(` ${fmt.bold('Input Size:')}  ${res.inputLengthBytes} bytes`);
        console.log();
        console.log(fmt.dim(` Web Hash Tool: ${res.webToolUrl}`));
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

module.exports = {
  handleTools,
  parseCron,
  parseCidr,
  parseJwt,
  handleBase64,
  generatePassword,
  inspectCert,
  parseChmod,
  parseEpoch,
  calculateHash
};

// Zero-dependency terminal formatting engine for DevOps Tribune CLI (dt)

const isColorSupported = !process.env.NO_COLOR && (process.stdout.isTTY || process.env.FORCE_COLOR);

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',

  // Foreground colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',

  // Bright / Vibrant
  brightCyan: '\x1b[96m',
  brightBlue: '\x1b[94m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightRed: '\x1b[91m',
  brightWhite: '\x1b[97m',

  // Backgrounds
  bgNavy: '\x1b[48;5;235m',
  bgDark: '\x1b[48;5;234m',
  bgCyan: '\x1b[46m',
  bgBlue: '\x1b[44m'
};

function c(colorKey, text) {
  if (!isColorSupported || !colors[colorKey]) return String(text);
  return `${colors[colorKey]}${text}${colors.reset}`;
}

const pkg = require('../package.json');

const fmt = {
  bold: (t) => c('bold', t),
  dim: (t) => c('dim', t),
  cyan: (t) => c('cyan', t),
  brightCyan: (t) => c('brightCyan', t),
  blue: (t) => c('blue', t),
  brightBlue: (t) => c('brightBlue', t),
  green: (t) => c('green', t),
  brightGreen: (t) => c('brightGreen', t),
  yellow: (t) => c('yellow', t),
  brightYellow: (t) => c('brightYellow', t),
  red: (t) => c('red', t),
  brightRed: (t) => c('brightRed', t),
  magenta: (t) => c('magenta', t),
  gray: (t) => c('gray', t),
  white: (t) => c('white', t),

  badge(label, color = 'cyan') {
    const fn = fmt[color] || fmt.cyan;
    return fn(`[${label.toUpperCase()}]`);
  },

  categoryBadge(category) {
    const cat = (category || 'devops').toLowerCase();
    switch (cat) {
      case 'kubernetes':
      case 'k8s':
        return fmt.brightBlue('[KUBERNETES]');
      case 'cloud':
      case 'aws':
        return fmt.brightCyan('[CLOUD/AWS]');
      case 'sre':
      case 'incident':
        return fmt.brightYellow('[SRE/OUTAGE]');
      case 'security':
      case 'devsecops':
        return fmt.red('[SECURITY]');
      case 'ci/cd':
      case 'gitops':
        return fmt.brightGreen('[CI/CD]');
      case 'terraform':
      case 'iac':
        return fmt.magenta('[IAC/TERRAFORM]');
      default:
        return fmt.cyan(`[${cat.toUpperCase()}]`);
    }
  },

  banner() {
    const line1 = `  DevOps Tribune CLI (dt) — v${pkg.version || '1.1.0'}`;
    const line2 = '  Engineering Intelligence for the Real World';
    const border = '═'.repeat(54);
    return `\n${fmt.dim('╔' + border + '╗')}\n${fmt.bold(fmt.brightCyan('║' + line1.padEnd(54) + '║'))}\n${fmt.dim('║' + line2.padEnd(54) + '║')}\n${fmt.dim('╚' + border + '╝')}\n`;
  },

  rule(title = '') {
    const width = Math.min(process.stdout.columns || 80, 80);
    if (!title) return fmt.dim('─'.repeat(width));
    const prefix = `── ${title} `;
    const rem = Math.max(0, width - prefix.length);
    return `${fmt.cyan(prefix)}${fmt.dim('─'.repeat(rem))}`;
  },

  timeAgo(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);
    if (diffSec < 60) return 'just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    return date.toISOString().split('T')[0];
  }
};

module.exports = fmt;

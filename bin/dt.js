#!/usr/bin/env node

// Official DevOps Tribune CLI (dt)
// https://www.devopstribune.com/

const handleNews = require('../lib/commands/news');
const { handleArticles, handleSingleArticle } = require('../lib/commands/articles');
const handleInterview = require('../lib/commands/interview');
const { handleTools } = require('../lib/commands/tools');
const { handleMonitor } = require('../lib/commands/monitor');
const { handleStatus, handleHelp, handleVersion } = require('../lib/commands/status');
const { maybeAutoUpdate, handleUpdateCommand } = require('../lib/updater');
const fmt = require('../lib/formatter');

function parseArgs(rawArgs) {
  const args = {
    command: '',
    subCommand: '',
    _subArgs: [],
    json: false,
    category: '',
    tag: '',
    limit: null,
    query: '',
    noUpdate: false,
    update: false,
    check: false,
    enable: false,
    disable: false,
    status: false
  };

  const positional = [];

  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];

    if (arg === '--json') {
      args.json = true;
    } else if (arg === '--no-color') {
      process.env.NO_COLOR = '1';
    } else if (arg === '--no-update') {
      args.noUpdate = true;
    } else if (arg === '--update') {
      args.update = true;
    } else if (arg === '--check') {
      args.check = true;
    } else if (arg === '--enable') {
      args.enable = true;
    } else if (arg === '--disable') {
      args.disable = true;
    } else if (arg === '--status') {
      args.status = true;
    } else if (arg === '-v' || arg === '--version') {
      args.command = 'version';
      return args;
    } else if (arg === '-h' || arg === '--help') {
      args.command = 'help';
      return args;
    } else if (arg === '--category' || arg === '-c') {
      args.category = rawArgs[++i] || '';
    } else if (arg === '--tag' || arg === '-t') {
      args.tag = rawArgs[++i] || '';
    } else if (arg === '--limit' || arg === '-l') {
      args.limit = rawArgs[++i] || null;
    } else if (arg === '--query' || arg === '-q') {
      args.query = rawArgs[++i] || '';
    } else if (!arg.startsWith('-')) {
      positional.push(arg);
    }
  }

  args.command = positional[0] || 'help';
  args.subCommand = positional[1] || '';
  args._subArgs = positional.slice(2);

  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // Automatically check & update on first daily run (unless explicitly disabled or outputting JSON)
  if (!args.noUpdate && !args.json && args.command !== 'update' && args.command !== 'upgrade') {
    await maybeAutoUpdate(args);
  }

  switch (args.command.toLowerCase()) {
    case 'news':
      await handleNews(args);
      break;

    case 'articles':
      await handleArticles(args);
      break;

    case 'article':
      await handleSingleArticle(args.subCommand, args);
      break;

    case 'interview':
    case 'interviews':
      await handleInterview(args.subCommand, args);
      break;

    case 'tool':
    case 'tools':
      if (['sys', 'system', 'top', 'monitor', 'disk', 'df', 'mem', 'memory', 'cpu', 'proc', 'processes', 'ps'].includes((args.subCommand || '').toLowerCase())) {
        await handleMonitor(args.subCommand, args);
      } else {
        await handleTools(args.subCommand, args);
      }
      break;

    case 'sys':
    case 'system':
    case 'top':
    case 'monitor':
      await handleMonitor(args.subCommand, args);
      break;

    case 'disk':
    case 'df':
      await handleMonitor('disk', args);
      break;

    case 'mem':
    case 'memory':
      await handleMonitor('mem', args);
      break;

    case 'cpu':
      await handleMonitor('cpu', args);
      break;

    case 'proc':
    case 'processes':
    case 'ps':
      await handleMonitor('proc', args);
      break;

    case 'passgen':
    case 'password':
      await handleTools('passgen', { ...args, _subArgs: [args.subCommand, ...args._subArgs].filter(Boolean) });
      break;

    case 'cert':
    case 'ssl':
    case 'tls':
      await handleTools('cert', { ...args, _subArgs: [args.subCommand, ...args._subArgs].filter(Boolean) });
      break;

    case 'chmod':
    case 'permissions':
      await handleTools('chmod', { ...args, _subArgs: [args.subCommand, ...args._subArgs].filter(Boolean) });
      break;

    case 'epoch':
    case 'timestamp':
    case 'time':
      await handleTools('epoch', { ...args, _subArgs: [args.subCommand, ...args._subArgs].filter(Boolean) });
      break;

    case 'cidr':
    case 'subnet':
      await handleTools('cidr', { ...args, _subArgs: [args.subCommand, ...args._subArgs].filter(Boolean) });
      break;

    case 'cron':
      await handleTools('cron', { ...args, _subArgs: [args.subCommand, ...args._subArgs].filter(Boolean) });
      break;

    case 'jwt':
      await handleTools('jwt', { ...args, _subArgs: [args.subCommand, ...args._subArgs].filter(Boolean) });
      break;

    case 'base64':
      await handleTools('base64', { ...args, _subArgs: [args.subCommand, ...args._subArgs].filter(Boolean) });
      break;

    case 'hash':
      await handleTools('hash', { ...args, _subArgs: [args.subCommand, ...args._subArgs].filter(Boolean) });
      break;

    case 'status':
    case 'info':
      await handleStatus(args);
      break;

    case 'update':
    case 'upgrade':
      await handleUpdateCommand(args.subCommand, args);
      break;

    case 'version':
      handleVersion();
      break;

    case 'help':
    default:
      handleHelp();
      break;
  }
}

main().catch(err => {
  console.error(fmt.red(`Unexpected CLI failure: ${err.message}`));
  process.exit(1);
});

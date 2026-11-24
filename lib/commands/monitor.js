// System & Linux Resource Monitoring Command for dt CLI
// Real-time Disk, Memory, CPU & Top Process Diagnostics with Visual Colored Progress Bars
// Zero third-party dependencies.

const os = require('node:os');
const fs = require('node:fs');
const { execSync } = require('node:child_process');
const fmt = require('../formatter');

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function renderProgressBar(usedPct, width = 24) {
  const clamped = Math.max(0, Math.min(100, usedPct));
  const filled = Math.round((clamped / 100) * width);
  const empty = width - filled;
  const freePct = 100 - clamped;

  // Color logic based on remaining healthy capacity:
  // > 30% remaining: brightGreen (HEALTHY)
  // 15% - 30% remaining: brightYellow (ELEVATED)
  // < 15% remaining: brightRed (CRITICAL)
  let colorFn = fmt.brightGreen;
  let statusBadge = fmt.brightGreen('● HEALTHY');

  if (clamped >= 85) {
    colorFn = fmt.brightRed;
    statusBadge = fmt.brightRed('● CRITICAL');
  } else if (clamped >= 70) {
    colorFn = fmt.brightYellow;
    statusBadge = fmt.brightYellow('● ELEVATED');
  }

  const bar = colorFn('█'.repeat(filled)) + fmt.dim('░'.repeat(empty));
  return {
    barString: `[${bar}] ${colorFn(clamped.toFixed(1) + '%')}`,
    statusBadge,
    freePct,
    usedPct: clamped
  };
}

function getDiskMetrics() {
  try {
    const raw = execSync('df -k -P', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'], timeout: 3000 });
    const lines = raw.trim().split('\n').slice(1);
    const disks = [];
    const seenMounts = new Set();

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 6) continue;

      const fsName = parts[0];
      const totalKb = parseInt(parts[1], 10) || 0;
      const usedKb = parseInt(parts[2], 10) || 0;
      const availKb = parseInt(parts[3], 10) || 0;
      const mount = parts.slice(5).join(' ');

      // Filter out small virtual/ramdisk partitions < 100MB or internal macOS preboot/recovery
      if (totalKb < 1024 * 100) continue;
      if (mount.startsWith('/dev') ||
          mount.startsWith('/System/Volumes/Preboot') ||
          mount.startsWith('/System/Volumes/Update') ||
          mount.startsWith('/System/Volumes/VM') ||
          mount.startsWith('/System/Volumes/xarts') ||
          mount.startsWith('/private/var/folders')) {
        continue;
      }

      if (seenMounts.has(mount)) continue;
      seenMounts.add(mount);

      const totalBytes = totalKb * 1024;
      const usedBytes = usedKb * 1024;
      const freeBytes = availKb * 1024;
      const usedPct = totalBytes > 0 ? (usedBytes / totalBytes) * 100 : 0;
      const freePct = totalBytes > 0 ? (freeBytes / totalBytes) * 100 : 0;

      disks.push({
        filesystem: fsName,
        mount,
        totalBytes,
        usedBytes,
        freeBytes,
        totalFormatted: formatBytes(totalBytes),
        usedFormatted: formatBytes(usedBytes),
        freeFormatted: formatBytes(freeBytes),
        usedPct: parseFloat(usedPct.toFixed(1)),
        freePct: parseFloat(freePct.toFixed(1))
      });
    }

    // Sort disks: fullest (lowest remaining free %) first
    disks.sort((a, b) => b.usedPct - a.usedPct);
    return disks;
  } catch (_) {
    return [];
  }
}

function getMemoryMetrics() {
  const total = os.totalmem();
  let available = os.freemem();

  // On Linux: read /proc/meminfo for MemAvailable (accounting for cache & buffers)
  if (process.platform === 'linux' && fs.existsSync('/proc/meminfo')) {
    try {
      const meminfo = fs.readFileSync('/proc/meminfo', 'utf8');
      const getKb = (key) => {
        const m = meminfo.match(new RegExp(`^${key}:\\s+(\\d+)`, 'm'));
        return m ? parseInt(m[1], 10) * 1024 : 0;
      };
      const memTotal = getKb('MemTotal');
      const memAvail = getKb('MemAvailable');
      if (memTotal > 0 && memAvail > 0) {
        const used = Math.max(0, memTotal - memAvail);
        const usedPct = (used / memTotal) * 100;
        const freePct = (memAvail / memTotal) * 100;
        return {
          total: memTotal,
          used,
          available: memAvail,
          totalFormatted: formatBytes(memTotal),
          usedFormatted: formatBytes(used),
          availableFormatted: formatBytes(memAvail),
          usedPct: parseFloat(usedPct.toFixed(1)),
          freePct: parseFloat(freePct.toFixed(1))
        };
      }
    } catch (_) {}
  }

  // On macOS (Darwin): calculate real available memory from vm_stat
  if (process.platform === 'darwin') {
    try {
      const vm = execSync('vm_stat', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'], timeout: 2000 });
      const pageSizeMatch = vm.match(/page size of (\d+) bytes/);
      const pageSize = pageSizeMatch ? parseInt(pageSizeMatch[1], 10) : 16384;
      const getPages = (key) => {
        const m = vm.match(new RegExp(key + ':\\s+(\\d+)'));
        return m ? parseInt(m[1], 10) : 0;
      };

      const free = getPages('Pages free');
      const inactive = getPages('Pages inactive');
      const speculative = getPages('Pages speculative');
      const purgeable = getPages('Pages purgeable');
      const availPages = free + inactive + speculative + purgeable;

      if (availPages > 0) {
        available = availPages * pageSize;
      }
    } catch (_) {}
  }

  const used = Math.max(0, total - available);
  const usedPct = total > 0 ? (used / total) * 100 : 0;
  const freePct = total > 0 ? (available / total) * 100 : 0;

  return {
    total,
    used,
    available,
    totalFormatted: formatBytes(total),
    usedFormatted: formatBytes(used),
    availableFormatted: formatBytes(available),
    usedPct: parseFloat(usedPct.toFixed(1)),
    freePct: parseFloat(freePct.toFixed(1))
  };
}

function getCpuSnapshot() {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;
  for (const cpu of cpus) {
    for (const type in cpu.times) {
      total += cpu.times[type];
    }
    idle += cpu.times.idle;
  }
  return { idle, total };
}

async function getCpuMetrics(sampleMs = 150) {
  const cpus = os.cpus();
  const model = (cpus[0] && cpus[0].model) || 'Unknown CPU';
  const cores = cpus.length;
  const loadAvg = os.loadavg();

  // Measure delta over 150ms for precise instantaneous utilization
  const s1 = getCpuSnapshot();
  await new Promise(r => setTimeout(r, sampleMs));
  const s2 = getCpuSnapshot();

  const idleDelta = s2.idle - s1.idle;
  const totalDelta = s2.total - s1.total;
  const usedDelta = Math.max(0, totalDelta - idleDelta);

  let activePct = totalDelta > 0 ? (usedDelta / totalDelta) * 100 : 0;
  activePct = Math.max(0, Math.min(100, activePct));
  const idlePct = 100 - activePct;

  return {
    model: model.trim(),
    cores,
    arch: os.arch(),
    platform: os.platform(),
    loadAvg: {
      oneMin: parseFloat(loadAvg[0].toFixed(2)),
      fiveMin: parseFloat(loadAvg[1].toFixed(2)),
      fifteenMin: parseFloat(loadAvg[2].toFixed(2))
    },
    activePct: parseFloat(activePct.toFixed(1)),
    idlePct: parseFloat(idlePct.toFixed(1)),
    uptimeSeconds: Math.floor(os.uptime())
  };
}

function getTopProcesses(limit = 10) {
  try {
    const raw = execSync('ps -A -o pid=,user=,%cpu=,%mem=,rss=,comm=', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
      timeout: 3000
    });

    const lines = raw.trim().split('\n');
    const procs = [];

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 6) continue;

      const pid = parseInt(parts[0], 10);
      if (isNaN(pid)) continue;

      const user = parts[1];
      const cpu = parseFloat(parts[2]) || 0;
      const mem = parseFloat(parts[3]) || 0;
      const rssKb = parseInt(parts[4], 10) || 0;
      const fullComm = parts.slice(5).join(' ');
      // Extract clean binary basename for readability
      const baseName = fullComm.split('/').pop().replace(/[()]/g, '');

      procs.push({
        pid,
        user,
        cpu: parseFloat(cpu.toFixed(1)),
        mem: parseFloat(mem.toFixed(1)),
        rssBytes: rssKb * 1024,
        rssFormatted: formatBytes(rssKb * 1024),
        command: baseName || fullComm
      });
    }

    const topCpu = [...procs]
      .sort((a, b) => b.cpu - a.cpu || b.rssBytes - a.rssBytes)
      .slice(0, limit);

    const topMem = [...procs]
      .sort((a, b) => b.rssBytes - a.rssBytes || b.cpu - a.cpu)
      .slice(0, limit);

    return { topCpu, topMem };
  } catch (_) {
    return { topCpu: [], topMem: [] };
  }
}

async function handleMonitor(subCommand = '', args = {}) {
  const disk = getDiskMetrics();
  const mem = getMemoryMetrics();
  const cpu = await getCpuMetrics(150);
  const procs = getTopProcesses(10);

  const payload = {
    hostname: os.hostname(),
    platform: `${os.platform()} ${os.release()} (${os.arch()})`,
    cpu,
    memory: mem,
    disk,
    topProcessesByRam: procs.topMem,
    topProcessesByCpu: procs.topCpu
  };

  if (args.json) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  const showAll = !subCommand || subCommand === 'all';
  const showDisk = showAll || subCommand === 'disk' || subCommand === 'storage';
  const showMem = showAll || subCommand === 'mem' || subCommand === 'memory';
  const showCpu = showAll || subCommand === 'cpu' || subCommand === 'load';
  const showProc = showAll || subCommand === 'proc' || subCommand === 'processes' || subCommand === 'top';

  console.log(fmt.banner());
  console.log(fmt.rule(`SYSTEM RESOURCE MONITOR • ${os.hostname().toUpperCase()}`));
  console.log(` ${fmt.bold('Platform:')}   ${os.platform()} ${os.release()} (${os.arch()}) • Uptime: ${fmt.dim(fmt.timeAgo(new Date(Date.now() - cpu.uptimeSeconds * 1000).toISOString()))}`);
  console.log();

  // 1. DISK USAGE
  if (showDisk) {
    console.log(fmt.rule('DISK STORAGE UTILIZATION (SORTED BY USAGE)'));
    console.log();
    if (disk.length === 0) {
      console.log(fmt.dim('  No physical disk partitions detected.'));
    } else {
      for (const d of disk) {
        const bar = renderProgressBar(d.usedPct, 24);
        console.log(` ${fmt.bold(fmt.brightCyan(d.mount))} ${fmt.dim('(' + d.filesystem + ')')}`);
        console.log(`   Total:      ${fmt.bold(d.totalFormatted.padEnd(10))} Utilized:  ${fmt.yellow(d.usedFormatted.padEnd(10))} Remaining: ${fmt.brightGreen(d.freeFormatted)} (${d.freePct}% free)`);
        console.log(`   Usage Bar:  ${bar.barString}  ${bar.statusBadge}`);
        console.log();
      }
    }
  }

  // 2. MEMORY USAGE
  if (showMem) {
    const memBar = renderProgressBar(mem.usedPct, 24);
    console.log(fmt.rule('MEMORY UTILIZATION (RAM)'));
    console.log();
    console.log(`   Total RAM:  ${fmt.bold(mem.totalFormatted.padEnd(10))} Utilized:  ${fmt.yellow(mem.usedFormatted.padEnd(10))} Remaining Free: ${fmt.brightGreen(mem.availableFormatted)} (${mem.freePct}% free)`);
    console.log(`   Usage Bar:  ${memBar.barString}  ${memBar.statusBadge}`);
    console.log();
  }

  // 3. CPU USAGE & LOAD
  if (showCpu) {
    const cpuBar = renderProgressBar(cpu.activePct, 24);
    console.log(fmt.rule('CPU CAPACITY & SYSTEM LOAD'));
    console.log();
    console.log(`   Processor:  ${fmt.bold(cpu.model)} (${cpu.cores} physical/virtual cores)`);
    console.log(`   Load Avg:   1m: ${fmt.brightCyan(cpu.loadAvg.oneMin)} | 5m: ${fmt.brightCyan(cpu.loadAvg.fiveMin)} | 15m: ${fmt.brightCyan(cpu.loadAvg.fifteenMin)}`);
    console.log(`   Active CPU: ${cpuBar.barString}  ${cpuBar.statusBadge}`);
    console.log(`   Remaining:  ${fmt.brightGreen(cpu.idlePct + '%')} Idle Capacity Available`);
    console.log();
  }

  // 4. TOP 10 PROCESSES BY RAM
  if (showProc) {
    console.log(fmt.rule('TOP 10 PROCESSES BY RAM (HIGH TO LOW)'));
    console.log();
    console.log(`   ${fmt.dim('PID'.padEnd(8))} ${fmt.dim('USER'.padEnd(14))} ${fmt.dim('RAM %'.padEnd(10))} ${fmt.dim('RSS MEMORY'.padEnd(14))} ${fmt.dim('PROCESS COMMAND')}`);
    for (const p of procs.topMem) {
      let colorFn = fmt.brightGreen;
      if (p.mem >= 10) colorFn = fmt.brightRed;
      else if (p.mem >= 5) colorFn = fmt.brightYellow;

      const pidStr = String(p.pid).padEnd(8);
      const userStr = p.user.slice(0, 13).padEnd(14);
      const memPctStr = colorFn(`${p.mem.toFixed(1)}%`.padEnd(10));
      const rssStr = fmt.bold(p.rssFormatted.padEnd(14));
      const cmdStr = fmt.cyan(p.command.slice(0, 36));

      console.log(`   ${pidStr} ${userStr} ${memPctStr} ${rssStr} ${cmdStr}`);
    }
    console.log();

    // 5. TOP 10 PROCESSES BY CPU
    console.log(fmt.rule('TOP 10 PROCESSES BY CPU (HIGH TO LOW)'));
    console.log();
    console.log(`   ${fmt.dim('PID'.padEnd(8))} ${fmt.dim('USER'.padEnd(14))} ${fmt.dim('CPU %'.padEnd(10))} ${fmt.dim('RSS MEMORY'.padEnd(14))} ${fmt.dim('PROCESS COMMAND')}`);
    for (const p of procs.topCpu) {
      let colorFn = fmt.brightGreen;
      if (p.cpu >= 50) colorFn = fmt.brightRed;
      else if (p.cpu >= 20) colorFn = fmt.brightYellow;

      const pidStr = String(p.pid).padEnd(8);
      const userStr = p.user.slice(0, 13).padEnd(14);
      const cpuPctStr = colorFn(`${p.cpu.toFixed(1)}%`.padEnd(10));
      const rssStr = fmt.bold(p.rssFormatted.padEnd(14));
      const cmdStr = fmt.cyan(p.command.slice(0, 36));

      console.log(`   ${pidStr} ${userStr} ${cpuPctStr} ${rssStr} ${cmdStr}`);
    }
    console.log();
  }

  console.log(fmt.rule());
  console.log(fmt.dim(' Linux SRE Best Practices: https://www.devopstribune.com/articles/linux-commands-for-devops-engineers/'));
  console.log();
}

module.exports = {
  formatBytes,
  renderProgressBar,
  getDiskMetrics,
  getMemoryMetrics,
  getCpuMetrics,
  getTopProcesses,
  handleMonitor
};

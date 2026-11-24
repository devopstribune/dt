# DevOps Tribune CLI (`dt`)

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-success.svg)](package.json)
[![API Version](https://img.shields.io/badge/API%20Contract-v1.0.0-cyan.svg)](https://www.devopstribune.com/api/)

> **The Developer-First Terminal Utility for DevOps, SRE, and Cloud Engineers.**  
> Powered by [DevOps Tribune](https://www.devopstribune.com) — Engineering Intelligence for the Real World.

```
╔══════════════════════════════════════════════════════╗
║  DevOps Tribune CLI (dt) — v1.0.0                    ║
║  Engineering Intelligence for the Real World         ║
╚══════════════════════════════════════════════════════╝
```

---

## ⚡ Quickstart & Installation

### Option 1: Instant Zero-Install (Run with `npx`)
```bash
npx @devopstribune/cli news
npx @devopstribune/cli passgen 16 3
```

### Option 2: Global Install via NPM
```bash
npm install -g @devopstribune/cli
dt --help
```

### Option 3: One-Line Shell Installer (macOS & Linux)
```bash
curl -fsSL https://www.devopstribune.com/install-dt.sh | bash
```

### Option 4: Build from Source
```bash
git clone https://github.com/devopstribune/dt.git
cd dt
npm link
```

---

## 🚀 Features & Command Reference

### 1. Cryptographic Random Password Generator (`dt passgen`)
Generate cryptographically secure random passwords using OS-level CSPRNG entropy (`crypto.randomInt`). Runs 100% locally with zero network transmission.

```bash
# Generate 16-character Industry Standard password (default length: 12, complexity: 3)
dt passgen 16 3

# Complexity Levels:
# Level 1: Alphanumeric (A-Z, a-z, 0-9)
dt passgen 16 1

# Level 2: Alphanumeric + Special Characters
dt passgen 20 2

# Level 3: Industry Standard (Guaranteed upper, lower, number, special + Fisher-Yates shuffle)
dt passgen 24 3

# Machine-readable JSON output for CI/CD and scripts:
dt passgen 32 3 --json
```

**Output Preview:**
```
── RANDOM PASSWORD GENERATOR (CSPRNG) ──────────────────────────────────────────

 Password:    CRm;M27wTL=&Fwq3
 Length:      16 characters
 Complexity:  Level 3 (Industry Standard (Upper, Lower, Number, Special))
 Entropy:     103.4 bits (Military Grade)

 [Note] Generated locally using OS entropy. Zero network transmission.
```

---

### 2. Live Breaking DevOps News & Incident Radar (`dt news`)
Stream curated infrastructure alerts, cloud outage postmortems, and upstream release notices with ANSI color badges.

```bash
# Stream latest 10 news items
dt news

# Filter by category (e.g., k8s, cloud, sre, security)
dt news --category k8s --limit 5

# Pipe structured JSON into jq
dt news --limit 3 --json | jq '.items[0].title'
```

---

### 3. Architecture Publications & Runbooks (`dt articles` & `dt article`)
Browse verified production guides, deep-dives, and troubleshooting playbooks.

```bash
# Browse latest guides, reading times, and categories
dt articles --limit 5

# Filter by tag or category
dt articles --category cloud --tag terraform

# View article summary, tags, and canonical resource link
dt article terraform-best-practices
dt article kubernetes-crashloopbackoff-troubleshooting
```

---

### 4. SRE & Platform Engineer Scenario Drills (`dt interview`)
Interactive scenario interview questions covering Kubernetes, Linux, AWS, Terraform, and CI/CD triage using the 4-stage STAR incident triage framework.

```bash
# View all available interview tracks
dt interview

# Drill into Kubernetes, Linux, Terraform, or AWS production scenarios
dt interview k8s
dt interview linux
dt interview aws
dt interview terraform
```

---

### 5. Offline Cloud & SRE Utilities (`dt tool`)
All utilities execute 100% offline with zero network latency and complete privacy:

#### Cron Schedule Explainer (`dt tool cron`)
Parses standard 5-part cron syntax and explains schedule intervals in plain English:
```bash
dt tool cron "*/15 0-4 * * 1-5"
# Runs every 15 minutes, from hour 0 through 4, every day of month, every month, from day of week 1 through 5.
```

#### VPC Subnet & CIDR Calculator (`dt tool cidr`)
Calculates netmask, wildcard mask, network address, broadcast address, and usable host IP ranges:
```bash
dt tool cidr 10.0.0.0/24
dt tool cidr 172.16.0.0/20
```

#### Base64 & Kubernetes Secret Formatter (`dt tool base64`)
Encodes or decodes text and generates a ready-to-apply Kubernetes Secret YAML snippet:
```bash
dt tool base64 encode "my-database-password"
dt tool base64 decode "bXktZGF0YWJhc2UtcGFzc3dvcmQ="
```

#### JWT Token Inspector (`dt tool jwt`)
Decodes JWT Header and Payload claims offline without transmitting tokens to external servers:
```bash
dt tool jwt "eyJhbGciOi..."
```

---

### 6. Edge CDN Health & Data Freshness (`dt status`)
Inspect Edge CDN latency, content freshness timestamps, and resource catalog counts:
```bash
dt status
```

---

## 🔒 Security & Privacy Guarantees

1. **Zero Secret Storage:** `dt` does not require, store, or transmit API keys or user credentials for read operations.
2. **Offline-First Tools:** `dt passgen`, `dt tool cron`, `dt tool cidr`, `dt tool base64`, and `dt tool jwt` perform zero network requests and never leak input text.
3. **OS-Level CSPRNG:** The password generator utilizes Node's `crypto.randomInt` backed by `/dev/urandom` / Windows CryptGenRandom.
4. **Deterministic Caching:** Remote content catalogs are cached locally in `~/.config/devopstribune/cache/` to ensure full functionality during offline or flight modes.

---

## 🧪 Testing

Run the automated test suite verifying all CLI commands, edge integrations, and error handling:

```bash
npm test
# Or specifically for CLI:
node --test test/cli.test.js
```

---

## 🌐 DevOps Tribune Engineering Resources

Explore related documentation, real-world troubleshooting guides, and interactive tools on the web publication:
- 📖 [DevOps Architecture & System Design Articles](https://www.devopstribune.com/#learning)
- 🛠️ [Interactive Online DevOps Tools](https://www.devopstribune.com/tools/)
- 🎯 [SRE & Infrastructure Interview Scenarios](https://www.devopstribune.com/interviews/)
- 📰 [Continuous DevOps & Cloud News Radar](https://www.devopstribune.com/news/)
- 🔌 [Public API & Content Contract Specification](https://www.devopstribune.com/api/)

---

## 📄 License

Licensed under the **Apache License, Version 2.0**. See [LICENSE](LICENSE) for details.  
Published by [DevOps Tribune](https://www.devopstribune.com) — Engineering Intelligence for the Real World.

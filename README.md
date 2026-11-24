<p align="center">
  <a href="https://www.devopstribune.com/">
    <img src="https://www.devopstribune.com/assets/devopstribune-avatar.png" width="128" height="128" alt="DevOps Tribune Logo" style="border-radius: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);" />
  </a>
</p>

<h1 align="center">DevOps Tribune CLI (<code>dt</code>)</h1>

<p align="center">
  <strong>Developer-first DevOps, Cloud, and SRE terminal companion.</strong><br />
  Zero dependencies • 100% private offline utilities • Live infrastructure news • STAR interview drills
</p>

<p align="center">
  <a href="https://www.devopstribune.com/cli/">CLI Documentation</a> •
  <a href="https://www.devopstribune.com/articles/devopstribune-cli-dt/">Architecture Pillar Guide</a> •
  <a href="https://www.devopstribune.com/tools/">Online Web Tools</a> •
  <a href="https://www.devopstribune.com/interviews/">Interview Scenarios</a> •
  <a href="https://www.devopstribune.com/news/">Live News Wire</a> •
  <a href="https://www.devopstribune.com/api/">Public API</a>
</p>

<p align="center">
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg" alt="Node.js Version" /></a>
  <a href="https://www.npmjs.com/package/@devopstribune/cli"><img src="https://img.shields.io/npm/v/@devopstribune/cli.svg?color=blue" alt="NPM Version" /></a>
  <a href="https://github.com/devopstribune/homebrew-tap"><img src="https://img.shields.io/badge/homebrew-devopstribune%2Ftap-orange.svg" alt="Homebrew Tap" /></a>
  <a href="package.json"><img src="https://img.shields.io/badge/dependencies-0-success.svg" alt="Zero Dependencies" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue.svg" alt="License" /></a>
</p>

```
╔══════════════════════════════════════════════════════╗
║  DevOps Tribune CLI (dt) — v1.0.0                    ║
║  Engineering Intelligence for the Real World         ║
╚══════════════════════════════════════════════════════╝
```

---

## ⚡ Quickstart & Installation

### Option 1: Official Homebrew Tap (macOS & Linux)
```bash
# Single-command install:
brew install devopstribune/tap/dt

# Or tap and install:
brew tap devopstribune/tap
brew install dt

# Verify installation:
dt version
```

### Option 2: Instant Zero-Install (Run via `npx`)
```bash
# Stream latest DevOps releases without installing:
npx @devopstribune/cli news

# Generate an industry-standard 16-character password:
npx @devopstribune/cli passgen 16 3
```

### Option 3: Global Install via NPM
```bash
npm install -g @devopstribune/cli
dt --help
```

### Option 4: One-Line Shell Installer (macOS & Linux)
```bash
curl -fsSL https://www.devopstribune.com/install-dt.sh | bash
```

### Option 5: Build from Source
```bash
git clone https://github.com/devopstribune/dt.git
cd dt
npm link
```

---

## 🛠️ Offline Developer & Cloud Utilities (`dt tool`)

All developer tools execute **100% offline in local memory** with zero telemetry, zero analytics tracking, and zero third-party dependencies.

### 1. TLS / SSL Certificate Inspector (`dt cert` / `dt tool cert`)
Inspect remote TLS certificates or local `.crt`/`.pem` certificate files with SNI support, expiry countdown, and cipher details.
- **Web Counterpart:** [DevOps Tribune Developer Tools](https://www.devopstribune.com/tools/)

```bash
# Inspect remote domain certificate:
dt cert devopstribune.com
dt cert api.github.com:443

# Inspect local certificate file:
dt cert /etc/ssl/certs/server.crt

# Output machine-readable JSON for CI/CD expiration alerts:
dt cert devopstribune.com --json
```

**Output Preview:**
```
── TLS / SSL CERTIFICATE INSPECTOR ─────────────────────────────────────────────

 Target:           www.devopstribune.com:443 (remote)
 Common Name:      devopstribune.com
 Issuer:           Amazon
 Protocol/Cipher:  TLSv1.3 (TLS_AES_128_GCM_SHA256)

 Status:           HEALTHY (190 days remaining)
 Validity Window:  2026-11-16T07:25:48.000Z → 2027-06-02T08:25:48.000Z

 SANs:             devopstribune.com, www.devopstribune.com
 SHA-256 Digest:   0D:51:CF:79:C4:D0:30:73:75:B7:03:87:22:7F:4D:49:B7:31:B1:F9:2B:28:F1:58:98:56:EC:C1:E0:E7:28:49
```

---

### 2. Linux Chmod & File Permissions Explainer (`dt chmod` / `dt tool chmod`)
Translate between Octal (`755`, `0644`, `4755`, `1777`) and Symbolic (`rwxr-xr-x`) notations, explain SUID/SGID/Sticky bits, and evaluate production security hazards.
- **Reference Guide:** [Linux Commands for DevOps Engineers](https://www.devopstribune.com/articles/linux-commands-for-devops-engineers/)

```bash
# Explain octal permissions:
dt chmod 755
dt chmod 600
dt chmod 4755   # Explains SUID bit risk

# Explain symbolic permissions:
dt chmod rwxr-xr-x
dt chmod rw-r--r--
```

**Output Preview:**
```
── LINUX CHMOD & PERMISSION EXPLAINER ──────────────────────────────────────────

 Octal:          755 (Full: 0755)
 Symbolic:       rwxr-xr-x

 Breakdown:
   User (Owner):  rwx (Read + Write + Execute)
   Group:         r-x (Read + Execute)
   Others:        r-x (Read + Execute)

 Security Risk:  Normal
 Best Practice:  Standard secure permission for binaries, scripts, and traversable directories.
```

---

### 3. Unix Epoch & Timestamp Converter (`dt epoch` / `dt tool epoch`)
Convert Unix epoch seconds and milliseconds into UTC ISO 8601, RFC 2822, and human relative time ("3 hours ago", "in 12 days").
- **Web Counterpart:** [Timestamp Converter](https://www.devopstribune.com/tools/timestamp/)

```bash
# Get current timestamps:
dt epoch now

# Convert epoch seconds:
dt epoch 1795507200

# Convert ISO 8601 date to epoch:
dt epoch "2026-11-24T12:00:00Z"
```

---

### 4. CSPRNG Random Password Generator (`dt passgen` / `dt tool passgen`)
Generate cryptographically secure random passwords using OS-level CSPRNG entropy (`crypto.randomInt`) backed by `/dev/urandom` / Windows CryptGenRandom.
- **Web Counterpart:** [Instant Password Generator](https://www.devopstribune.com/tools/password-generator/)

```bash
# Generate 16-character Industry Standard password (length: 16, complexity: 3):
dt passgen 16 3

# Complexity Levels:
# Level 1: Alphanumeric (A-Z, a-z, 0-9)
dt passgen 16 1

# Level 2: Alphanumeric + Special Characters
dt passgen 20 2

# Level 3: Industry Standard (Guaranteed upper, lower, number, special + Fisher-Yates shuffle)
dt passgen 24 3

# Raw JSON output for pipeline automation:
dt passgen 32 3 --json
```

---

### 5. Subnet & CIDR Calculation (`dt cidr` / `dt tool cidr`)
Calculate netmasks, usable host IP ranges, wildcard masks, and broadcast boundaries for AWS VPCs and Kubernetes pod networks.
- **Web Counterpart:** [CIDR Subnet Calculator](https://www.devopstribune.com/tools/cidr/)

```bash
dt cidr 10.0.0.0/24
dt cidr 172.16.0.0/20
dt cidr 192.168.1.0/28
```

---

### 6. Cron Schedule Parser (`dt cron` / `dt tool cron`)
Translate standard 5-field cron syntax into human-readable English for incident triage and maintenance window planning.
- **Web Counterpart:** [Cron Schedule Parser](https://www.devopstribune.com/tools/cron/)

```bash
dt cron "*/15 0-4 * * 1-5"
dt cron "0 2 * * 0"
```

---

### 7. Base64 & Kubernetes Secret Formatter (`dt base64` / `dt tool base64`)
Encode or decode text and instantly generate ready-to-apply Kubernetes Secret YAML definitions.
- **Web Counterpart:** [Base64 Encoder/Decoder](https://www.devopstribune.com/tools/base64/)

```bash
dt base64 encode "production-database-password"
dt base64 decode "cHJvZHVjdGlvbi1kYXRhYmFzZS1wYXNzd29yZA=="
```

---

### 8. JWT Token Inspector (`dt jwt` / `dt tool jwt`)
Inspect and decode JWT Header and Payload claims offline without exposing sensitive tokens to web analytics.
- **Web Counterpart:** [JWT Token Decoder](https://www.devopstribune.com/tools/jwt/)

```bash
dt jwt "eyJhbGciOi..."
```

---

### 9. Cryptographic Hash Calculator (`dt hash` / `dt tool hash`)
Generate SHA-256, SHA-512, MD5, and SHA-1 checksums for strings and configuration digests.
- **Web Counterpart:** [Hash Generator](https://www.devopstribune.com/tools/hash/)

```bash
dt hash sha256 "payload-string"
dt hash sha512 "secure-token"
dt hash md5 "legacy-checksum"
```

---

## 📡 Live Engineering Intelligence & SRE Drills

### Live Breaking DevOps News (`dt news`)
Stream curated infrastructure alerts, cloud outage postmortems, and upstream release notices with ANSI color badges.
- **Live News Radar:** [DevOps Tribune News](https://www.devopstribune.com/news/)

```bash
# Stream latest 10 news items:
dt news

# Filter by category (k8s, cloud, sre, ai, security):
dt news --category k8s --limit 5

# Pipe structured JSON into jq:
dt news --limit 3 --json | jq '.items[0].title'
```

---

### Architecture Publications & Runbooks (`dt articles` & `dt article`)
Browse verified production guides, deep-dives, and troubleshooting playbooks.
- **Publication Hub:** [DevOps Tribune Guides](https://www.devopstribune.com/#learning)

```bash
# Browse latest guides, reading times, and categories:
dt articles --limit 5

# Filter by tag or category:
dt articles --category cloud --tag terraform

# Read full article summary, tags, and canonical resource link:
dt article terraform-best-practices
dt article kubernetes-crashloopbackoff-troubleshooting
```

---

### Senior SRE & Platform Engineer Interview Drills (`dt interview`)
Practice real-world scenario drills covering Kubernetes, Linux, AWS, Terraform, and CI/CD triage using the 4-stage STAR incident framework.
- **Interview Directory:** [DevOps Tribune Interview Hub](https://www.devopstribune.com/interviews/)

```bash
# View all available interview tracks:
dt interview

# Drill into Kubernetes, Linux, Terraform, or AWS production scenarios:
dt interview k8s
dt interview linux
dt interview aws
dt interview terraform
```

---

### Edge CDN Health & Freshness (`dt status`)
Inspect Edge CDN latency, content freshness timestamps, and resource catalog counts.
- **Developer API Portal:** [DevOps Tribune API v1](https://www.devopstribune.com/api/)

```bash
dt status
```

---

## 🔒 Security & Supply Chain Philosophy

1. **Zero Third-Party Dependencies:** `dt` contains **zero npm dependencies**. Auditing the complete codebase takes under 10 minutes.
2. **Offline-First Privacy:** All developer utilities (`cert`, `chmod`, `epoch`, `passgen`, `cidr`, `cron`, `jwt`, `base64`, `hash`) run 100% locally in process memory.
3. **No Secret Transmission:** `dt` never transmits passwords, tokens, or credentials to remote servers.
4. **Deterministic Caching:** Remote news and article catalogs are cached locally in `~/.config/devopstribune/cache/` for seamless offline usage during flights or network outages.

---

## 🌐 Official DevOps Tribune Resources

- 📰 **Website:** [https://www.devopstribune.com](https://www.devopstribune.com)
- 💻 **CLI Hub:** [https://www.devopstribune.com/cli/](https://www.devopstribune.com/cli/)
- 📖 **Architecture Pillar Guide:** [DevOps Tribune CLI (dt) Guide](https://www.devopstribune.com/articles/devopstribune-cli-dt/)
- 🛠️ **Developer Tools Directory:** [https://www.devopstribune.com/tools/](https://www.devopstribune.com/tools/)
- 🎯 **Interview Preparation Hub:** [https://www.devopstribune.com/interviews/](https://www.devopstribune.com/interviews/)
- 🔌 **REST API v1:** [https://www.devopstribune.com/api/](https://www.devopstribune.com/api/)
- 📜 **Editorial Policy:** [https://www.devopstribune.com/editorial-policy/](https://www.devopstribune.com/editorial-policy/)

---

## 📄 License

Licensed under the **Apache License, Version 2.0**. See [LICENSE](LICENSE) for details.  
Copyright &copy; 2026 [DevOps Tribune](https://www.devopstribune.com). All rights reserved.

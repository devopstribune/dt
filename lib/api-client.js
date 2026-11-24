// API client and offline caching layer for dt CLI
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const os = require('node:os');

const DEFAULT_BASE_URL = 'https://www.devopstribune.com/api/v1';
const CACHE_DIR = path.join(os.homedir(), '.config', 'devopstribune', 'cache');

class ApiClient {
  constructor(baseUrl = process.env.DEVOPS_TRIBUNE_API_URL || DEFAULT_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.ensureCacheDir();
  }

  ensureCacheDir() {
    try {
      if (!fs.existsSync(CACHE_DIR)) {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
      }
    } catch (_) {}
  }

  getCachePath(endpoint) {
    const safeName = endpoint.replace(/[^a-zA-Z0-9_-]/g, '_') + '.json';
    return path.join(CACHE_DIR, safeName);
  }

  getLocalFallbackPath(endpoint) {
    // Check if running from repository root
    const localPath = path.resolve(__dirname, '../../sites/main/api/v1', `${endpoint}.json`);
    if (fs.existsSync(localPath)) {
      return localPath;
    }
    return null;
  }

  readCache(endpoint) {
    try {
      const cachePath = this.getCachePath(endpoint);
      if (fs.existsSync(cachePath)) {
        const data = fs.readFileSync(cachePath, 'utf8');
        return { data: JSON.parse(data), source: 'offline-cache' };
      }
    } catch (_) {}

    // Fallback to local repo files if available
    const localPath = this.getLocalFallbackPath(endpoint);
    if (localPath) {
      try {
        const data = fs.readFileSync(localPath, 'utf8');
        return { data: JSON.parse(data), source: 'local-repo' };
      } catch (_) {}
    }

    return null;
  }

  writeCache(endpoint, data) {
    try {
      this.ensureCacheDir();
      const cachePath = this.getCachePath(endpoint);
      fs.writeFileSync(cachePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (_) {}
  }

  async fetchEndpoint(endpoint) {
    const url = `${this.baseUrl}/${endpoint}.json`;

    return new Promise((resolve) => {
      const req = https.get(url, { timeout: 6000 }, (res) => {
        if (res.statusCode !== 200) {
          // Non-200 -> try cache
          const cached = this.readCache(endpoint);
          if (cached) return resolve(cached);
          return resolve({ error: `HTTP ${res.statusCode} from ${url}`, data: null });
        }

        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            this.writeCache(endpoint, parsed);
            resolve({ data: parsed, source: 'network' });
          } catch (err) {
            const cached = this.readCache(endpoint);
            if (cached) return resolve(cached);
            resolve({ error: `JSON Parse error: ${err.message}`, data: null });
          }
        });
      });

      req.on('error', (err) => {
        const cached = this.readCache(endpoint);
        if (cached) return resolve(cached);
        resolve({ error: `Network error: ${err.message}`, data: null });
      });

      req.on('timeout', () => {
        req.destroy();
        const cached = this.readCache(endpoint);
        if (cached) return resolve(cached);
        resolve({ error: 'Request timed out after 6 seconds', data: null });
      });
    });
  }

  async getNews() {
    return this.fetchEndpoint('news');
  }

  async getArticles() {
    return this.fetchEndpoint('articles');
  }

  async getInterviews() {
    return this.fetchEndpoint('interviews');
  }

  async getManifest() {
    return this.fetchEndpoint('manifest');
  }
}

module.exports = new ApiClient();

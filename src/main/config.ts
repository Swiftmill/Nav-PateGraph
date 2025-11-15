import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import deepmerge from 'deepmerge';

export type Config = typeof defaultConfig;

const defaultConfig = {
  general: {
    home: 'https://www.startpage.com',
    searchEngine: 'https://duckduckgo.com/?q=%s',
    hardwareAcceleration: true,
    maxChromiumProcesses: 8,
    restoreLastSession: true,
    enableExtensions: true
  },
  privacy: {
    adblock: true,
    trackerBlock: true,
    strictHttps: false
  },
  vpn: {
    enabled: false,
    defaultServer: 'paris',
    servers: [] as { id: string; name: string; socks5: string }[]
  },
  themes: {
    active: 'pate-graphique',
    allowCustomCss: true,
    allowCustomJs: true
  },
  sidebar: {
    enabled: true,
    items: [] as { id: string; label: string; icon: string }[]
  },
  limits: {
    ram: 4096,
    cpu: 60
  },
  newTab: {
    widgets: ['clock', 'rss', 'system-stats'],
    rssFeeds: [] as string[]
  }
};

type ConfigListener = (config: Config) => void;

class ConfigManager {
  private configPath: string;
  private config: Config;
  private listeners: ConfigListener[] = [];
  private watcher?: fs.FSWatcher;

  constructor() {
    this.configPath = this.getConfigPath();
    this.config = this.loadConfig();
    this.watch();
  }

  private getConfigPath() {
    if (app.isPackaged) {
      return path.join(process.resourcesPath, 'config', 'config.json');
    }
    return path.resolve(__dirname, '../../config/config.json');
  }

  private loadConfig(): Config {
    if (!fs.existsSync(this.configPath)) {
      fs.mkdirSync(path.dirname(this.configPath), { recursive: true });
      fs.writeFileSync(this.configPath, JSON.stringify(defaultConfig, null, 2), 'utf-8');
      return defaultConfig;
    }

    try {
      const raw = fs.readFileSync(this.configPath, 'utf-8');
      const parsed = JSON.parse(raw);
      return deepmerge(defaultConfig, parsed);
    } catch (err) {
      console.error('[Config] Erreur de lecture config', err);
      return defaultConfig;
    }
  }

  private watch() {
    if (this.watcher) return;
    this.watcher = fs.watch(this.configPath, { persistent: false }, () => {
      this.config = this.loadConfig();
      this.notify();
    });
  }

  public getConfig() {
    return this.config;
  }

  public update(partial: Partial<Config>) {
    this.config = deepmerge(this.config, partial);
    fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
    this.notify();
  }

  public onChange(listener: ConfigListener) {
    this.listeners.push(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l(this.config));
  }
}

export const configManager = new ConfigManager();

import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { BrowserView, BrowserWindow, session, app } from 'electron';
import { ElectronBlocker, fullLists } from '@cliqz/adblocker-electron';
import fetch from 'cross-fetch';
import { configManager } from './config';
import { applyThemeToView } from './theme';

export interface TabState {
  id: string;
  title: string;
  url: string;
  favicon?: string | null;
  isActive: boolean;
  group?: string | null;
}

interface TabInternal extends TabState {
  view: BrowserView;
}

type Mode = 'normal' | 'gaming' | 'focus';

export class TabManager {
  private mainWindow: BrowserWindow;
  private tabs: TabInternal[] = [];
  private blocker?: ElectronBlocker;
  private mode: Mode = 'normal';
  private split: { primary: string | null; secondary: string | null } = { primary: null, secondary: null };

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    this.installAdblock();
  }

  private async installAdblock() {
    if (!configManager.getConfig().privacy.adblock) return;
    this.blocker = await ElectronBlocker.fromLists(fetch, fullLists, {
      enableCompression: true
    });
    this.blocker.enableBlockingInSession(session.defaultSession);
  }

  public serializeTabs(): TabState[] {
    return this.tabs.map(({ id, title, url, favicon, isActive, group }) => ({
      id,
      title,
      url,
      favicon: favicon ?? null,
      isActive,
      group: group ?? null
    }));
  }

  public getActiveTab() {
    return this.tabs.find((tab) => tab.isActive);
  }

  public async createTab(url?: string) {
    const id = crypto.randomUUID();
    const view = new BrowserView({
      webPreferences: {
        preload: path.join(app.getAppPath(), 'dist/preload/index.js'),
        nodeIntegration: false,
        contextIsolation: true,
        javascript: true,
        sandbox: false
      }
    });

    const defaultNewTab = app.isPackaged
      ? `file://${path.join(app.getAppPath(), 'dist/renderer/newtab.html')}`
      : 'http://localhost:5173/newtab.html';
    const targetUrl = url ?? defaultNewTab;
    view.webContents.loadURL(targetUrl);
    view.webContents.on('page-title-updated', (_, title) => {
      this.updateTab(id, { title });
      this.broadcastTabs();
    });
    view.webContents.on('page-favicon-updated', (_, favicons) => {
      this.updateTab(id, { favicon: favicons[0] });
      this.broadcastTabs();
    });
    view.webContents.on('did-navigate', (_, newUrl) => {
      this.updateTab(id, { url: newUrl });
      this.broadcastTabs();
    });
    view.webContents.on('did-navigate-in-page', (_, newUrl) => {
      this.updateTab(id, { url: newUrl });
      this.broadcastTabs();
    });
    view.webContents.setWindowOpenHandler(({ url: newUrl }) => {
      this.createTab(newUrl);
      return { action: 'deny' };
    });
    view.webContents.on('will-navigate', (event, navigationUrl) => {
      if (navigationUrl.startsWith('chrome://') || navigationUrl.startsWith('edge://')) {
        event.preventDefault();
      }
    });
    view.webContents.setAudioMuted(this.mode !== 'normal');

    applyThemeToView(view);
    this.injectUserScripts(view);

    const tab: TabInternal = {
      id,
      title: 'Nouvel onglet',
      url: targetUrl,
      favicon: null,
      isActive: true,
      view
    };

    this.tabs.forEach((t) => (t.isActive = false));
    this.tabs.push(tab);
    this.refreshLayout(tab.id);
    return id;
  }

  private getViewBounds() {
    const [width, height] = this.mainWindow.getContentSize();
    const sidebarWidth = 72;
    const chromeHeight = 120;
    return { x: sidebarWidth, y: chromeHeight, width: width - sidebarWidth, height: height - chromeHeight };
  }

  private updateTab(id: string, payload: Partial<TabInternal>) {
    const tab = this.tabs.find((t) => t.id === id);
    if (!tab) return;
    Object.assign(tab, payload);
  }

  public activateTab(id: string) {
    const tab = this.tabs.find((t) => t.id === id);
    if (!tab) return;
    this.split = { primary: null, secondary: null };
    this.tabs.forEach((t) => (t.isActive = t.id === id));
    this.refreshLayout(id);
  }

  public closeTab(id: string) {
    const index = this.tabs.findIndex((t) => t.id === id);
    if (index === -1) return;
    const [tab] = this.tabs.splice(index, 1);
    tab.view.webContents.destroy();
    if (this.split.primary === id || this.split.secondary === id) {
      this.split = { primary: null, secondary: null };
    }
    if (this.tabs.length > 0) {
      const next = this.tabs[Math.max(0, index - 1)];
      next.isActive = true;
      this.refreshLayout(next.id);
    } else {
      this.refreshLayout(null);
    }
  }

  public moveTab(id: string, index: number) {
    const currentIndex = this.tabs.findIndex((t) => t.id === id);
    if (currentIndex === -1) return;
    const [tab] = this.tabs.splice(currentIndex, 1);
    this.tabs.splice(index, 0, tab);
    this.refreshLayout(tab.isActive ? tab.id : null);
  }

  public duplicateTab(id: string) {
    const tab = this.tabs.find((t) => t.id === id);
    if (!tab) return;
    return this.createTab(tab.url);
  }

  public detachTab(id: string) {
    const tab = this.tabs.find((t) => t.id === id);
    if (!tab) return;
    const url = tab.url;
    this.closeTab(id);
    const newWindow = new BrowserWindow({
      width: 1280,
      height: 800,
      title: tab.title,
      webPreferences: {
        preload: path.join(app.getAppPath(), 'dist/preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false
      }
    });
    newWindow.loadURL(url);
  }

  public setGroup(id: string, group: string | null) {
    this.updateTab(id, { group });
    this.broadcastTabs();
  }

  public navigateTab(id: string, url: string) {
    const tab = this.tabs.find((t) => t.id === id);
    if (!tab) return;
    tab.url = url;
    tab.view.webContents.loadURL(url);
    this.broadcastTabs();
  }

  public reloadTab(id: string) {
    const tab = this.tabs.find((t) => t.id === id);
    tab?.view.webContents.reload();
  }

  public setSplit(primaryId: string | null, secondaryId: string | null) {
    if (primaryId && secondaryId) {
      const primary = this.tabs.find((t) => t.id === primaryId);
      const secondary = this.tabs.find((t) => t.id === secondaryId);
      if (!primary || !secondary) return;
      this.split = { primary: primaryId, secondary: secondaryId };
      this.refreshLayout(primaryId);
      return;
    }
    this.split = { primary: null, secondary: null };
    const active = this.tabs.find((t) => t.isActive) ?? this.tabs[0];
    this.refreshLayout(active ? active.id : null);
  }

  private refreshLayout(focusedId: string | null) {
    const bounds = this.getViewBounds();
    this.mainWindow.getBrowserViews().forEach((view) => this.mainWindow.removeBrowserView(view));

    if (this.split.primary && this.split.secondary) {
      const primary = this.tabs.find((t) => t.id === this.split.primary);
      const secondary = this.tabs.find((t) => t.id === this.split.secondary);
      if (!primary || !secondary) {
        this.split = { primary: null, secondary: null };
        this.refreshLayout(focusedId);
        return;
      }
      this.tabs.forEach((tab) => (tab.isActive = tab.id === primary.id || tab.id === secondary.id));
      this.mainWindow.addBrowserView(primary.view);
      this.mainWindow.addBrowserView(secondary.view);
      const halfWidth = Math.floor(bounds.width / 2);
      primary.view.setBounds({ x: bounds.x, y: bounds.y, width: halfWidth, height: bounds.height });
      secondary.view.setBounds({ x: bounds.x + halfWidth, y: bounds.y, width: bounds.width - halfWidth, height: bounds.height });
      primary.view.setAutoResize({ width: true, height: true });
      secondary.view.setAutoResize({ width: true, height: true });
      this.broadcastTabs();
      return;
    }

    const active = focusedId
      ? this.tabs.find((t) => t.id === focusedId)
      : this.tabs.find((t) => t.isActive) ?? this.tabs[0];
    if (!active) {
      this.broadcastTabs();
      return;
    }
    this.tabs.forEach((tab) => (tab.isActive = tab.id === active.id));
    this.mainWindow.addBrowserView(active.view);
    active.view.setBounds(bounds);
    active.view.setAutoResize({ width: true, height: true });
    this.broadcastTabs();
  }

  private broadcastTabs() {
    this.mainWindow.webContents.send('tabs:update', this.serializeTabs());
  }

  public refreshTheme() {
    this.tabs.forEach((tab) => applyThemeToView(tab.view));
  }

  public setMode(mode: Mode) {
    this.mode = mode;
    this.tabs.forEach((tab) => {
      if (mode === 'gaming' || mode === 'focus') {
        tab.view.webContents.setAudioMuted(true);
        tab.view.webContents.setBackgroundThrottling(true);
      } else {
        tab.view.webContents.setAudioMuted(false);
        tab.view.webContents.setBackgroundThrottling(false);
      }
    });
    this.broadcastTabs();
  }

  private injectUserScripts(view: BrowserView) {
    const allow = configManager.getConfig().themes.allowCustomJs;
    if (!allow) return;
    const scriptsDir = path.resolve(__dirname, '../../user-scripts');
    if (!fs.existsSync(scriptsDir)) return;
    const scripts = fs.readdirSync(scriptsDir).filter((file) => file.endsWith('.js'));
    for (const script of scripts) {
      const code = fs.readFileSync(path.join(scriptsDir, script), 'utf-8');
      view.webContents.executeJavaScript(code).catch((err) => console.error('[UserScript]', err));
    }
  }
}

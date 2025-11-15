import path from 'path';
import { app, BrowserWindow, shell } from 'electron';
import { configManager } from './config';
import { TabManager } from './tabs';
import { registerIpc } from './ipc';
import { setupDownloads } from './downloads';
import { applyVpn, disableVpn } from './vpn';
import { loadExtensions } from './extensions';

const generalConfig = configManager.getConfig().general;
if (generalConfig.maxChromiumProcesses) {
  app.commandLine.appendSwitch('renderer-process-limit', `${generalConfig.maxChromiumProcesses}`);
}
if (!generalConfig.hardwareAcceleration) {
  app.disableHardwareAcceleration();
}

let mainWindow: BrowserWindow | null = null;
let tabManager: TabManager | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    show: false,
    title: 'Pâte Graphique',
    trafficLightPosition: { x: 14, y: 18 },
    backgroundColor: '#0d1023',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(app.getAppPath(), 'dist/preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: true,
      sandbox: false
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  const rendererUrl = app.isPackaged
    ? `file://${path.join(app.getAppPath(), 'dist/renderer/index.html')}`
    : 'http://localhost:5173';

  mainWindow.loadURL(rendererUrl);

  tabManager = new TabManager(mainWindow);
  registerIpc(tabManager);
  setupDownloads(mainWindow);
  applyVpn();
  loadExtensions(mainWindow);

  tabManager.createTab();

  configManager.onChange((cfg) => {
    if (!tabManager) return;
    tabManager.refreshTheme();
    if (cfg.vpn.enabled) {
      applyVpn(cfg.vpn.defaultServer);
    } else {
      disableVpn();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

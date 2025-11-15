import path from 'path';
import { app, BrowserWindow, dialog, DownloadItem, session } from 'electron';
import fs from 'fs';
import { configManager } from './config';

export type DownloadSummary = {
  url: string;
  filename: string;
  receivedBytes: number;
  totalBytes: number;
  state: Electron.DownloadItem['state'];
  paused: boolean;
  savePath: string;
};

const downloads = new Map<string, DownloadSummary>();

export function getDownloads() {
  return Array.from(downloads.values());
}

export function setupDownloads(mainWindow: BrowserWindow) {
  session.defaultSession.on('will-download', async (event, item, webContents) => {
    const defaultPath = path.join(app.getPath('downloads'), item.getFilename());
    let savePath = defaultPath;
    if (!configManager.getConfig().general.restoreLastSession) {
      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Enregistrer le fichier',
        defaultPath
      });
      if (result.canceled) {
        item.cancel();
        return;
      }
      savePath = result.filePath ?? defaultPath;
      item.setSavePath(savePath);
    }

    const id = item.getStartTime().toString();
    downloads.set(id, {
      url: item.getURL(),
      filename: item.getFilename(),
      receivedBytes: 0,
      totalBytes: item.getTotalBytes(),
      state: item.getState(),
      paused: item.isPaused(),
      savePath
    });

    item.on('updated', () => {
      downloads.set(id, {
        url: item.getURL(),
        filename: item.getFilename(),
        receivedBytes: item.getReceivedBytes(),
        totalBytes: item.getTotalBytes(),
        state: item.getState(),
        paused: item.isPaused(),
        savePath: item.getSavePath()
      });
      mainWindow.webContents.send('downloads:update', getDownloads());
    });

    item.on('done', (event, state) => {
      downloads.set(id, {
        url: item.getURL(),
        filename: item.getFilename(),
        receivedBytes: item.getReceivedBytes(),
        totalBytes: item.getTotalBytes(),
        state,
        paused: item.isPaused(),
        savePath: item.getSavePath()
      });
      mainWindow.webContents.send('downloads:update', getDownloads());
    });
  });
}

export function clearDownloads() {
  downloads.clear();
}

export function getDownloadFolder() {
  const folder = path.join(app.getPath('userData'), 'downloads');
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }
  return folder;
}

import path from 'path';
import fs from 'fs';
import { BrowserWindow, session } from 'electron';
import { configManager } from './config';

export async function loadExtensions(mainWindow: BrowserWindow) {
  if (!configManager.getConfig().general.enableExtensions) return;
  const extensionsDir = path.join(mainWindow.webContents.session.getPath('userData'), 'extensions');
  if (!fs.existsSync(extensionsDir)) {
    fs.mkdirSync(extensionsDir, { recursive: true });
  }
  const crxFiles = fs.readdirSync(extensionsDir).filter((file) => file.endsWith('.crx'));
  for (const crx of crxFiles) {
    const extPath = path.join(extensionsDir, crx);
    try {
      await session.defaultSession.loadExtension(extPath, { allowFileAccess: true });
    } catch (err) {
      console.error('[Extensions] Erreur chargement', crx, err);
    }
  }
}

import fs from 'fs';
import path from 'path';
import { BrowserView } from 'electron';
import { configManager } from './config';

export function getThemesDirectory() {
  if (process.env.NODE_ENV === 'production') {
    return path.join(process.resourcesPath, 'themes');
  }
  return path.resolve(__dirname, '../../themes');
}

export function loadThemeCss(themeId: string) {
  const dir = getThemesDirectory();
  const cssPath = path.join(dir, themeId, 'theme.css');
  if (fs.existsSync(cssPath)) {
    return fs.readFileSync(cssPath, 'utf-8');
  }
  return '';
}

export function applyThemeToView(view: BrowserView) {
  const themeId = configManager.getConfig().themes.active;
  const css = loadThemeCss(themeId);
  if (!css) return;
  view.webContents.insertCSS(css).catch((err) => console.error('[Theme] CSS error', err));
}

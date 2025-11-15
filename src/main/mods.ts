import fs from 'fs';
import path from 'path';

export interface ModDescriptor {
  id: string;
  html: string;
  css: string;
  js: string;
}

export function loadMods() {
  const modsDir = getModsDir();
  if (!fs.existsSync(modsDir)) {
    return [] as ModDescriptor[];
  }
  const entries = fs
    .readdirSync(modsDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);
  return entries.map((entry) => {
    const base = path.join(modsDir, entry);
    const html = safeRead(path.join(base, 'index.html'));
    const css = safeRead(path.join(base, 'style.css'));
    const js = safeRead(path.join(base, 'script.js'));
    return { id: entry, html, css, js };
  });
}

function safeRead(file: string) {
  if (fs.existsSync(file)) {
    return fs.readFileSync(file, 'utf-8');
  }
  return '';
}

export function getModsDir() {
  if (process.env.NODE_ENV === 'production') {
    return path.join(process.resourcesPath, 'mods');
  }
  return path.resolve(__dirname, '../../mods');
}

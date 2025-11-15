import path from 'path';
import { app } from 'electron';

export const isDev = !app.isPackaged;

export function resolveAsset(...segments: string[]) {
  if (isDev) {
    return path.join(__dirname, '..', '..', ...segments);
  }
  return path.join(process.resourcesPath, ...segments);
}

export function resolveDist(...segments: string[]) {
  if (isDev) {
    return path.join(__dirname, '..', '..', '..', ...segments);
  }
  return path.join(process.resourcesPath, '..', ...segments);
}

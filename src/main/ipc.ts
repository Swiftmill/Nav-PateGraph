import { ipcMain } from 'electron';
import { configManager } from './config';
import { applyVpn, disableVpn } from './vpn';
import { getDownloads } from './downloads';
import { loadMods } from './mods';
import { passwordStore } from './passwords';
import { listSessions, saveSession, deleteSession } from './sessions';
import { listNotes, saveNote, removeNote } from './notes';
import type { TabManager } from './tabs';

export function registerIpc(tabManager: TabManager) {
  ipcMain.handle('config:get', () => configManager.getConfig());
  ipcMain.handle('config:set', (_, partial) => configManager.update(partial));

  ipcMain.handle('vpn:apply', (_, serverId?: string) => applyVpn(serverId));
  ipcMain.handle('vpn:disable', () => disableVpn());

  ipcMain.handle('downloads:list', () => getDownloads());

  ipcMain.handle('mods:list', () => loadMods());

  ipcMain.handle('passwords:list', async (_, master: string) => passwordStore.listPasswords(master));
  ipcMain.handle('passwords:save', async (_, entry, master: string) => passwordStore.savePassword(entry, master));
  ipcMain.handle('passwords:delete', async (_, id: string) => passwordStore.deletePassword(id));
  ipcMain.handle('passwords:set-master', async (_, password: string) => passwordStore.setMasterPassword(password));
  ipcMain.handle('passwords:get-master', async () => passwordStore.getMasterPassword());

  ipcMain.handle('sessions:list', () => listSessions());
  ipcMain.handle('sessions:save', (_, name: string) => saveSession(name, tabManager.serializeTabs()));
  ipcMain.handle('sessions:delete', (_, id: string) => deleteSession(id));

  ipcMain.handle('notes:list', () => listNotes());
  ipcMain.handle('notes:save', (_, payload: { id: string | null; content: string }) => saveNote(payload.id, payload.content));
  ipcMain.handle('notes:delete', (_, id: string) => removeNote(id));

  ipcMain.handle('tabs:create', (_, url?: string) => tabManager.createTab(url));
  ipcMain.handle('tabs:close', (_, id: string) => tabManager.closeTab(id));
  ipcMain.handle('tabs:activate', (_, id: string) => tabManager.activateTab(id));
  ipcMain.handle('tabs:duplicate', (_, id: string) => tabManager.duplicateTab(id));
  ipcMain.handle('tabs:detach', (_, id: string) => tabManager.detachTab(id));
  ipcMain.handle('tabs:set-group', (_, id: string, group: string | null) => tabManager.setGroup(id, group));
  ipcMain.handle('tabs:move', (_, payload: { id: string; index: number }) => tabManager.moveTab(payload.id, payload.index));
  ipcMain.handle('tabs:update-url', (_, payload: { id: string; url: string }) => tabManager.navigateTab(payload.id, payload.url));
  ipcMain.handle('tabs:reload', (_, id: string) => tabManager.reloadTab(id));
  ipcMain.handle('tabs:set-split', (_, payload: { primary: string | null; secondary: string | null }) =>
    tabManager.setSplit(payload.primary, payload.secondary)
  );

  ipcMain.handle('focus:set-mode', (_, mode: 'gaming' | 'focus' | 'normal') => tabManager.setMode(mode));
}

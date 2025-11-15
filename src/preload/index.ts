import { contextBridge, ipcRenderer } from 'electron';
import os from 'os';

contextBridge.exposeInMainWorld('pg', {
  config: {
    get: () => ipcRenderer.invoke('config:get'),
    set: (partial: unknown) => ipcRenderer.invoke('config:set', partial)
  },
  vpn: {
    apply: (serverId?: string) => ipcRenderer.invoke('vpn:apply', serverId),
    disable: () => ipcRenderer.invoke('vpn:disable')
  },
  downloads: {
    list: () => ipcRenderer.invoke('downloads:list'),
    onUpdate: (callback: (downloads: unknown) => void) => {
      ipcRenderer.on('downloads:update', (_, data) => callback(data));
    }
  },
  mods: {
    list: () => ipcRenderer.invoke('mods:list')
  },
  passwords: {
    list: (master: string) => ipcRenderer.invoke('passwords:list', master),
    save: (entry: unknown, master: string) => ipcRenderer.invoke('passwords:save', entry, master),
    remove: (id: string) => ipcRenderer.invoke('passwords:delete', id),
    setMaster: (password: string) => ipcRenderer.invoke('passwords:set-master', password),
    getMaster: () => ipcRenderer.invoke('passwords:get-master')
  },
  sessions: {
    list: () => ipcRenderer.invoke('sessions:list'),
    save: (name: string) => ipcRenderer.invoke('sessions:save', name),
    remove: (id: string) => ipcRenderer.invoke('sessions:delete', id)
  },
  notes: {
    list: () => ipcRenderer.invoke('notes:list'),
    save: (payload: { id: string | null; content: string }) => ipcRenderer.invoke('notes:save', payload),
    remove: (id: string) => ipcRenderer.invoke('notes:delete', id)
  },
  tabs: {
    create: (url?: string) => ipcRenderer.invoke('tabs:create', url),
    close: (id: string) => ipcRenderer.invoke('tabs:close', id),
    activate: (id: string) => ipcRenderer.invoke('tabs:activate', id),
    duplicate: (id: string) => ipcRenderer.invoke('tabs:duplicate', id),
    detach: (id: string) => ipcRenderer.invoke('tabs:detach', id),
    setGroup: (id: string, group: string | null) => ipcRenderer.invoke('tabs:set-group', id, group),
    move: (payload: { id: string; index: number }) => ipcRenderer.invoke('tabs:move', payload),
    updateUrl: (payload: { id: string; url: string }) => ipcRenderer.invoke('tabs:update-url', payload),
    reload: (id: string) => ipcRenderer.invoke('tabs:reload', id),
    setSplit: (payload: { primary: string | null; secondary: string | null }) => ipcRenderer.invoke('tabs:set-split', payload),
    onUpdate: (callback: (tabs: unknown) => void) => {
      ipcRenderer.on('tabs:update', (_, tabs) => callback(tabs));
    }
  },
  focus: {
    setMode: (mode: 'gaming' | 'focus' | 'normal') => ipcRenderer.invoke('focus:set-mode', mode)
  },
  system: {
    metrics: () => ({
      totalMem: os.totalmem(),
      freeMem: os.freemem(),
      load: os.loadavg()[0]
    })
  }
});

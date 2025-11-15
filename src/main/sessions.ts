import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { app } from 'electron';
import { TabState } from './tabs';

interface SessionEntry {
  id: string;
  name: string;
  createdAt: string;
  tabs: TabState[];
}

interface SessionStore {
  lastSaved: string | null;
  sessions: SessionEntry[];
}

function getSessionPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'data', 'sessions.json');
  }
  return path.resolve(__dirname, '../../data/sessions.json');
}

function readStore(): SessionStore {
  if (!fs.existsSync(getSessionPath())) {
    return { lastSaved: null, sessions: [] };
  }
  const raw = fs.readFileSync(getSessionPath(), 'utf-8');
  return JSON.parse(raw);
}

function writeStore(store: SessionStore) {
  fs.writeFileSync(getSessionPath(), JSON.stringify(store, null, 2), 'utf-8');
}

export function saveSession(name: string, tabs: TabState[]) {
  const store = readStore();
  const entry: SessionEntry = {
    id: crypto.randomUUID(),
    name,
    createdAt: new Date().toISOString(),
    tabs
  };
  store.sessions.push(entry);
  store.lastSaved = entry.id;
  writeStore(store);
  return entry.id;
}

export function listSessions() {
  return readStore().sessions;
}

export function deleteSession(id: string) {
  const store = readStore();
  store.sessions = store.sessions.filter((session) => session.id !== id);
  writeStore(store);
}

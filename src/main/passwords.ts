import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import keytar from 'keytar';
import { app } from 'electron';

const SERVICE = 'PateGraphiquePasswords';

interface PasswordEntry {
  id: string;
  url: string;
  username: string;
  password: string;
  lastUpdated: string;
}

interface PasswordStore {
  version: number;
  entries: PasswordEntry[];
}

function getStorePath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'data', 'passwords.json');
  }
  return path.resolve(__dirname, '../../data/passwords.json');
}

async function getMasterPassword(): Promise<string | null> {
  const accounts = await keytar.findCredentials(SERVICE);
  if (accounts.length > 0) {
    return accounts[0].password;
  }
  return null;
}

export async function setMasterPassword(password: string) {
  await keytar.setPassword(SERVICE, 'master', password);
}

function getCipher(master: string) {
  const key = crypto.createHash('sha256').update(master).digest();
  const iv = Buffer.alloc(16, 0);
  return {
    encrypt(text: string) {
      const cipher = crypto.createCipheriv('aes-256-ctr', key, iv);
      return Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]).toString('hex');
    },
    decrypt(hex: string) {
      const decipher = crypto.createDecipheriv('aes-256-ctr', key, iv);
      const result = Buffer.concat([decipher.update(Buffer.from(hex, 'hex')), decipher.final()]);
      return result.toString('utf8');
    }
  };
}

function readStore(): PasswordStore {
  const file = getStorePath();
  if (!fs.existsSync(file)) {
    return { version: 1, entries: [] };
  }
  const raw = fs.readFileSync(file, 'utf-8');
  return JSON.parse(raw);
}

function writeStore(store: PasswordStore) {
  fs.writeFileSync(getStorePath(), JSON.stringify(store, null, 2), 'utf-8');
}

export async function listPasswords(master: string) {
  const cipher = getCipher(master);
  const store = readStore();
  return store.entries.map((entry) => ({
    ...entry,
    password: cipher.decrypt(entry.password)
  }));
}

export async function savePassword(entry: Omit<PasswordEntry, 'id' | 'lastUpdated'>, master: string) {
  const cipher = getCipher(master);
  const store = readStore();
  const id = crypto.randomUUID();
  const encrypted = {
    id,
    ...entry,
    password: cipher.encrypt(entry.password),
    lastUpdated: new Date().toISOString()
  };
  store.entries.push(encrypted);
  writeStore(store);
  return encrypted.id;
}

export async function deletePassword(id: string) {
  const store = readStore();
  store.entries = store.entries.filter((entry) => entry.id !== id);
  writeStore(store);
}

export const passwordStore = {
  getMasterPassword,
  setMasterPassword,
  listPasswords,
  savePassword,
  deletePassword
};

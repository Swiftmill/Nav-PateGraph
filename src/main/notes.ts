import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import crypto from 'crypto';

interface NotesStore {
  notes: { id: string; content: string; updatedAt: string }[];
}

function getNotesPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'data', 'notes.json');
  }
  return path.resolve(__dirname, '../../data/notes.json');
}

function readNotes(): NotesStore {
  const file = getNotesPath();
  if (!fs.existsSync(file)) {
    return { notes: [] };
  }
  const raw = fs.readFileSync(file, 'utf-8');
  return JSON.parse(raw);
}

function writeNotes(store: NotesStore) {
  fs.writeFileSync(getNotesPath(), JSON.stringify(store, null, 2), 'utf-8');
}

export function listNotes() {
  return readNotes().notes;
}

export function saveNote(id: string | null, content: string) {
  const store = readNotes();
  if (id) {
    const existing = store.notes.find((note) => note.id === id);
    if (existing) {
      existing.content = content;
      existing.updatedAt = new Date().toISOString();
    }
  } else {
    const newId = crypto.randomUUID();
    store.notes.push({ id: newId, content, updatedAt: new Date().toISOString() });
    id = newId;
  }
  writeNotes(store);
  return id;
}

export function removeNote(id: string) {
  const store = readNotes();
  store.notes = store.notes.filter((note) => note.id !== id);
  writeNotes(store);
}

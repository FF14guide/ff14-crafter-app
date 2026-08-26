// Persists a File System Access API FileSystemFileHandle across sessions so
// a "linked" local inventory export file can be re-read with one click,
// instead of needing the file picker every single time.
//
// This is a real, standards-based browser capability (supported in
// Chromium-based browsers: Chrome, Edge, Opera -- NOT Firefox or Safari as
// of this writing). It is the closest thing to "automatic sync" achievable
// from a static, backend-less website: there is still no way for the game
// (or a Dalamud plugin) to push data to a website without a real server, so
// the person's local file still has to be re-exported/updated by hand --
// this just removes the need to re-select it and re-paste its contents
// into the site every time.

const DB_NAME = 'eorzean_crafter_files';
const STORE_NAME = 'handles';
const HANDLE_KEY = 'inventoryFileHandle';

function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showOpenFilePicker' in window;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbDelete(key: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export interface LinkedFileInfo {
  name: string;
}

/** Opens the browser's file picker and remembers the chosen file for later. */
export async function linkInventoryFile(): Promise<LinkedFileInfo | null> {
  if (!isFileSystemAccessSupported()) return null;
  // @ts-ignore -- showOpenFilePicker isn't in the default TS DOM lib yet
  const [handle] = await window.showOpenFilePicker({
    types: [{ description: 'Inventory export', accept: { 'text/*': ['.json', '.txt', '.csv'] } }],
    excludeAcceptAllOption: false,
    multiple: false,
  });
  await idbSet(HANDLE_KEY, handle);
  return { name: handle.name };
}

/** Returns info about the currently-linked file, if any (without prompting). */
export async function getLinkedFileInfo(): Promise<LinkedFileInfo | null> {
  if (!isFileSystemAccessSupported()) return null;
  const handle = await idbGet<any>(HANDLE_KEY);
  if (!handle) return null;
  return { name: handle.name };
}

/**
 * Re-reads the currently-linked file's contents. May trigger a native
 * permission re-confirmation prompt if the browser requires it (this is a
 * browser security requirement, not something we can skip).
 */
export async function readLinkedFile(): Promise<string | null> {
  const handle = await idbGet<any>(HANDLE_KEY);
  if (!handle) return null;

  if ((await handle.queryPermission({ mode: 'read' })) !== 'granted') {
    const perm = await handle.requestPermission({ mode: 'read' });
    if (perm !== 'granted') {
      throw new Error('ファイルの読み取り許可が得られませんでした。');
    }
  }
  const file = await handle.getFile();
  return file.text();
}

/** Writes text content to the currently-linked file (overwriting it). */
export async function writeLinkedFile(content: string): Promise<void> {
  const handle = await idbGet<any>(HANDLE_KEY);
  if (!handle) throw new Error('リンクされたファイルがありません。');

  if ((await handle.queryPermission({ mode: 'readwrite' })) !== 'granted') {
    const perm = await handle.requestPermission({ mode: 'readwrite' });
    if (perm !== 'granted') {
      throw new Error('ファイルの書き込み許可が得られませんでした。');
    }
  }
  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
}

export async function unlinkInventoryFile(): Promise<void> {
  await idbDelete(HANDLE_KEY);
}

export { isFileSystemAccessSupported };

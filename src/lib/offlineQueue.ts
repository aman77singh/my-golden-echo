const DB_NAME = "our_space_offline_db";
const STORE_NAME = "pending_messages";
const DB_VERSION = 1;

export interface QueuedMessage {
  tempId: string;
  coupleId?: string;
  senderId?: string;
  body?: string;
  mediaUrl?: string;
  voiceUrl?: string;
  replyTo?: string;
  createdAt: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB not supported"));
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "tempId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function queueOfflineMessage(msg: QueuedMessage): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(msg);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Fallback to localStorage if IndexedDB is unavailable
    try {
      const list = JSON.parse(localStorage.getItem(STORE_NAME) || "[]");
      list.push(msg);
      localStorage.setItem(STORE_NAME, JSON.stringify(list));
    } catch {}
  }
}

export async function getQueuedMessages(): Promise<QueuedMessage[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    try {
      return JSON.parse(localStorage.getItem(STORE_NAME) || "[]");
    } catch {
      return [];
    }
  }
}

export async function removeQueuedMessage(tempId: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(tempId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    try {
      const list: QueuedMessage[] = JSON.parse(localStorage.getItem(STORE_NAME) || "[]");
      const filtered = list.filter((m) => m.tempId !== tempId);
      localStorage.setItem(STORE_NAME, JSON.stringify(filtered));
    } catch {}
  }
}

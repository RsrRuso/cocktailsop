// IndexedDB cache for better performance than localStorage
const DB_NAME = 'app_cache';
const DB_VERSION = 1;
const STORES = ['stories', 'posts', 'reels', 'profiles'];

let db: IDBDatabase | null = null;

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      STORES.forEach(storeName => {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName);
        }
      });
    };
  });
};

export const setCache = async (store: string, key: string, value: any): Promise<void> => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([store], 'readwrite');
    const objectStore = transaction.objectStore(store);
    const request = objectStore.put(value, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getCache = async (store: string, key: string): Promise<any> => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([store], 'readonly');
    const objectStore = transaction.objectStore(store);
    const request = objectStore.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const clearCache = async (store: string): Promise<void> => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([store], 'readwrite');
    const objectStore = transaction.objectStore(store);
    const request = objectStore.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

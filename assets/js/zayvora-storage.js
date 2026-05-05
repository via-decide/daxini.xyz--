(function (global) {
  'use strict';

  const DB_NAME = 'daxini';
  const DB_VERSION = 1;
  const STORE_NAME = 'messages';
  const VALID_ROLES = ['user', 'assistant'];
  const VALID_STREAM_STATUSES = ['pending', 'streaming', 'complete', 'failed'];

  function initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = function () {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('userId', 'userId', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('userId_createdAt', ['userId', 'createdAt'], { unique: false });
        }
      };

      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error || new Error('IndexedDB open failed')); };
    });
  }

  function saveMessageLocal(message) {
    return initDB().then((db) => new Promise((resolve, reject) => {
      if (!message || !message.userId) {
        reject(new Error('saveMessageLocal requires message.userId'));
        return;
      }
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const now = Date.now();

      const role = VALID_ROLES.includes(message.role) ? message.role : 'assistant';
      const streamStatus = VALID_STREAM_STATUSES.includes(message.metadata && message.metadata.streamStatus)
        ? message.metadata.streamStatus
        : 'pending';

      const record = {
        id: message.id || (crypto.randomUUID ? crypto.randomUUID() : `msg_${now}_${Math.random().toString(36).slice(2)}`),
        userId: message.userId,
        role,
        content: String(message.content || ''),
        createdAt: Number(message.createdAt) || now,
        metadata: {
          tokensUsed: Number((message.metadata && message.metadata.tokensUsed) || 0),
          inferenceTimeMs: Number((message.metadata && message.metadata.inferenceTimeMs) || 0),
          streamStatus
        }
      };

      const request = store.put(record);
      request.onsuccess = function () { resolve(record); };
      request.onerror = function () { reject(request.error || new Error('saveMessageLocal failed')); };
    }));
  }

  function restoreChat(userId) {
    return initDB().then((db) => new Promise((resolve, reject) => {
      if (!userId) {
        resolve([]);
        return;
      }
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('userId_createdAt');
      const range = IDBKeyRange.bound([userId, 0], [userId, Number.MAX_SAFE_INTEGER]);
      const results = [];

      const request = index.openCursor(range, 'next');
      request.onsuccess = function (event) {
        const cursor = event.target.result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = function () { reject(request.error || new Error('restoreChat failed')); };
    }));
  }

  global.initDB = initDB;
  global.saveMessageLocal = saveMessageLocal;
  global.restoreChat = restoreChat;
})(window);

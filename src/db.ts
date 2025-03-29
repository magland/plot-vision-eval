// Get AI summary using OpenRouter API
// Initialize IndexedDB
async function initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('plotVisionDB', 5); // New version to trigger upgrade

        request.onerror = () => reject(request.error);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            // Delete old stores if they exist
            if (db.objectStoreNames.contains('summaries')) {
                db.deleteObjectStore('summaries');
            }
            if (db.objectStoreNames.contains('prompts')) {
                db.deleteObjectStore('prompts');
            }
            // Create stores with updated schema
            const summaryStore = db.createObjectStore('summaries', { keyPath: ['modelId', 'imageHash', 'promptHash', 'version'] });
            summaryStore.createIndex('timestamp', 'timestamp', { unique: false });

            db.createObjectStore('prompts', { keyPath: 'imageHash' });
        };

        request.onsuccess = () => resolve(request.result);
    });
}

// Store summary in IndexedDB
export async function storeSummary(modelId: string, imageBase64: string, prompt: string, content: string): Promise<void> {
    const db = await initDB();
    const imageHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(imageBase64))
        .then(hash => Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join(''));
    const promptHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(prompt))
        .then(hash => Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join(''));

    return new Promise((resolve, reject) => {
        const transaction = db.transaction('summaries', 'readwrite');
        const store = transaction.objectStore('summaries');

        const summary = {
            modelId,
            imageHash,
            promptHash,
            version,
            content,
            timestamp: new Date().toISOString()
        };

        const request = store.put(summary);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();

        // Close the database connection when the transaction is complete
        transaction.oncomplete = () => db.close();
    });
}

// Check if summary exists in cache
export async function cachedAISummaryExists(imageBase64: string, modelId: string, prompt: string): Promise<boolean> {
    const db = await initDB();
    const imageHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(imageBase64))
        .then(hash => Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join(''));
    const promptHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(prompt))
        .then(hash => Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join(''));

    return new Promise((resolve, reject) => {
        const transaction = db.transaction('summaries', 'readonly');
        const store = transaction.objectStore('summaries');

        const request = store.count([modelId, imageHash, promptHash, version]);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result > 0);

        transaction.oncomplete = () => db.close();
    });
}

const version = 5; // Increment version for new schema

// Store prompt for an image
export async function storeImagePrompt(imageBase64: string, prompt: string): Promise<void> {
    const db = await initDB();
    const imageHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(imageBase64))
        .then(hash => Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join(''));

    return new Promise((resolve, reject) => {
        const transaction = db.transaction('prompts', 'readwrite');
        const store = transaction.objectStore('prompts');

        const promptData = {
            imageHash,
            prompt,
            timestamp: new Date().toISOString()
        };

        const request = store.put(promptData);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();

        transaction.oncomplete = () => db.close();
    });
}

// Get prompt for an image
export async function getImagePrompt(imageBase64: string): Promise<string | null> {
    const db = await initDB();
    const imageHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(imageBase64))
        .then(hash => Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join(''));

    return new Promise((resolve, reject) => {
        const transaction = db.transaction('prompts', 'readonly');
        const store = transaction.objectStore('prompts');

        const request = store.get(imageHash);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const result = request.result;
            resolve(result ? result.prompt : null);
        };

        transaction.oncomplete = () => db.close();
    });
}

// Get summary from IndexedDB
export async function getCachedSummary(modelId: string, imageBase64: string, prompt: string): Promise<string | null> {
    const db = await initDB();
    const imageHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(imageBase64))
        .then(hash => Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join(''));
    const promptHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(prompt))
        .then(hash => Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join(''));

    return new Promise((resolve, reject) => {
        const transaction = db.transaction('summaries', 'readonly');
        const store = transaction.objectStore('summaries');

        const request = store.get([modelId, imageHash, promptHash, version]);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const result = request.result;
            resolve(result ? result.content : null);
        };

        // Close the database connection when the transaction is complete
        transaction.oncomplete = () => db.close();
    });
}

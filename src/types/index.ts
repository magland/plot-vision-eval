export interface PlotImage {
    url: string;
    title: string;
}

export interface AIModel {
    id: string;
    name: string;
}

export interface Summary {
    modelId: string;
    content: string;
    timestamp: string;
}

const BASE_URL = 'https://magland.github.io';

export async function fetchPlotImages(): Promise<PlotImage[]> {
    try {
        const response = await fetch(`${BASE_URL}/dandi-ai-notebooks/results.html`);
        const html = await response.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const images = Array.from(doc.getElementsByTagName('img'));

        return images.map(img => {
            const srcPath = img.getAttribute('src') || '';
            return {
                url: `${BASE_URL}${srcPath}`,
                title: img.getAttribute('alt') || ''
            };
        });
    } catch (error) {
        console.error('Error fetching plot images:', error);
        return [];
    }
}

export const AI_MODELS: AIModel[] = [
    {
        id: 'anthropic/claude-3.5-sonnet',
        name: 'Claude 3.5 Sonnet'
    },
    {
        id: 'anthropic/claude-3.7-sonnet',
        name: 'Claude 3.7 Sonnet'
    },
    {
        id: 'openai/gpt-4o',
        name: 'GPT 4o'
    },
    {
        id: "google/gemini-2.0-flash-001",
        name: "Gemini 2.0 Flash 001"
    },
    // {
    //     id: "deepseek/deepseek-r1",
    //     name: "DeepSeek R1"
    // }
];

export async function getImageBase64(url: string): Promise<string> {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Error converting image to base64:', error);
        throw error;
    }
}

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
if (!OPENROUTER_API_KEY) {
    console.warn('OpenRouter API key not found');
}

// Get AI summary using OpenRouter API
// Initialize IndexedDB
async function initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('plotVisionDB', 1);

        request.onerror = () => reject(request.error);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains('summaries')) {
                const store = db.createObjectStore('summaries', { keyPath: ['modelId', 'imageHash', 'version'] });
                store.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };

        request.onsuccess = () => resolve(request.result);
    });
}

// Store summary in IndexedDB
async function storeSummary(modelId: string, imageBase64: string, content: string): Promise<void> {
    const db = await initDB();
    const imageHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(imageBase64))
        .then(hash => Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join(''));

    return new Promise((resolve, reject) => {
        const transaction = db.transaction('summaries', 'readwrite');
        const store = transaction.objectStore('summaries');

        const summary = {
            modelId,
            imageHash,
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
export async function cachedAISummaryExists(imageBase64: string, modelId: string): Promise<boolean> {
    const db = await initDB();
    const imageHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(imageBase64))
        .then(hash => Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join(''));

    return new Promise((resolve, reject) => {
        const transaction = db.transaction('summaries', 'readonly');
        const store = transaction.objectStore('summaries');

        const request = store.count([modelId, imageHash, version]);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result > 0);

        transaction.oncomplete = () => db.close();
    });
}

const version = 3;

// Get summary from IndexedDB
async function getCachedSummary(modelId: string, imageBase64: string): Promise<string | null> {
    const db = await initDB();
    const imageHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(imageBase64))
        .then(hash => Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join(''));

    return new Promise((resolve, reject) => {
        const transaction = db.transaction('summaries', 'readonly');
        const store = transaction.objectStore('summaries');

        const request = store.get([modelId, imageHash, version]);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const result = request.result;
            resolve(result ? result.content : null);
        };

        // Close the database connection when the transaction is complete
        transaction.oncomplete = () => db.close();
    });
}

export async function getAISummary(imageBase64: string, modelId: string): Promise<string> {
    // Try to get the summary from cache first
    try {
        const cachedSummary = await getCachedSummary(modelId, imageBase64);
        if (cachedSummary) {
            return cachedSummary;
        }
    } catch (error) {
        console.warn('Error accessing cache:', error);
        // Continue with API call if cache access fails
    }

    const apiKey = OPENROUTER_API_KEY;
    if (!apiKey) {
        throw new Error('OpenRouter API key is required');
    }

    const systemPrompt = 'You are an expert at analyzing scientific plots. Your responses will be used by an AI system to understand whether plots are informative and what information they convey.';

    const payload = {
        model: modelId,
        messages: [
            {
                role: 'system',
                content: systemPrompt
            },
            {
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: 'Please provide a description of the plot in the image below. Include an evaluation of the plot quality with any issues you see, the information it conveys, and any insights that can be gained from it. Be concise.'
                    },
                    {
                        type: 'image_url',
                        image_url: {
                            url: imageBase64
                        }
                    }
                ]
            }
        ],
        max_tokens: 1000
    };

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'https://neurosift.app',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to analyze plot: ${errorText}`);
        }

        const result = await response.json();
        const content = result.choices[0].message.content;

        // Store the result in cache
        try {
            await storeSummary(modelId, imageBase64, content);
        } catch (error) {
            console.warn('Error storing in cache:', error);
            // Continue even if caching fails
        }

        return content;
    } catch (error) {
        console.error('Error getting AI summary:', error);
        throw error;
    }
}

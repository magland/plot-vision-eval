import { getCachedSummary, storeSummary } from "./db";

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
if (!OPENROUTER_API_KEY) {
    console.warn('OpenRouter API key not found');
}

export async function getAISummary(imageBase64: string, modelId: string, prompt: string): Promise<string> {
    // Try to get the summary from cache first
    try {
        const cachedSummary = await getCachedSummary(modelId, imageBase64, prompt);
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

    const systemPrompt = 'You are an expert at analyzing scientific plots.';

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
                        text: prompt
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
            await storeSummary(modelId, imageBase64, prompt, content);
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

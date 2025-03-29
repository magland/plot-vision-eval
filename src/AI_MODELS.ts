import { AIModel } from "./types";

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
    {
        id: "google/gemini-2.5-pro-exp-03-25:free",
        name: "Gemini 2.5 Pro Exp 03-25"
    }
    // {
    //     id: "deepseek/deepseek-r1",
    //     name: "DeepSeek R1"
    // }
];
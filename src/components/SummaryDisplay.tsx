import { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { AIModel, Summary, cachedAISummaryExists } from '../types';
import './SummaryDisplay.css';

interface SummaryDisplayProps {
    models: AIModel[];
    base64Image: string;
    onRequestSummary: (modelId: string) => Promise<string>;
}

export function SummaryDisplay({ models, base64Image, onRequestSummary }: SummaryDisplayProps) {
    const [summaries, setSummaries] = useState<Record<string, Summary>>({});
    const [loading, setLoading] = useState<Record<string, boolean>>({});

    const handleRequestSummary = useCallback(async (model: AIModel) => {
        setLoading(prev => ({ ...prev, [model.id]: true }));
        try {
            const content = await onRequestSummary(model.id);
            setSummaries(prev => ({
                ...prev,
                [model.id]: {
                    modelId: model.id,
                    content,
                    timestamp: new Date().toISOString()
                }
            }));
        } catch (error) {
            console.error(`Error getting summary for ${model.id}:`, error);
        } finally {
            setLoading(prev => ({ ...prev, [model.id]: false }));
        }
    }, [onRequestSummary]);

    useEffect(() => {
        const checkCachedSummaries = async () => {
            for (const model of models) {
                try {
                    const exists = await cachedAISummaryExists(base64Image, model.id);
                    if (exists) {
                        handleRequestSummary(model);
                    }
                } catch (error) {
                    console.warn('Error checking cache:', error);
                }
            }
        };

        // Clear existing summaries when image changes
        setSummaries({});
        checkCachedSummaries();
    }, [base64Image, models, handleRequestSummary]);

    return (
        <div className="summary-display">
            <h2>AI Model Summaries</h2>
            <div className="summaries-grid">
                {models.map((model) => (
                    <div key={model.id} className="summary-card">
                        <h3>{model.name}</h3>
                        {!summaries[model.id] && !loading[model.id] && (
                            <button onClick={() => handleRequestSummary(model)}>
                                Get Summary
                            </button>
                        )}
                        {loading[model.id] && <div className="loading">Generating summary...</div>}
                        {summaries[model.id] && (
                            <div className="summary-content">
                                <div className="markdown-content">
                                    <ReactMarkdown>{summaries[model.id].content}</ReactMarkdown>
                                </div>
                                <small>Generated at: {new Date(summaries[model.id].timestamp).toLocaleTimeString()}</small>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

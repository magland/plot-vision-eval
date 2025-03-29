import { useState, useEffect, useMemo } from 'react';
import { ImageDisplay } from './components/ImageDisplay';
import { SummaryDisplay } from './components/SummaryDisplay';
import './App.css';
import { fetchPlotImages } from './fetchPlotImages';
import { PlotImage } from './types';
import { getImageBase64 } from './util';
import { getAISummary } from './getAISummary';
import { AI_MODELS } from './AI_MODELS';
import { getImagePrompt, storeImagePrompt } from './db';

function App() {
    const [images, setImages] = useState<PlotImage[]>([]);
    const [selectedImage, setSelectedImage] = useState<PlotImage | null>(null);
    const [base64Image, setBase64Image] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [prompt, setPrompt] = useState<string>("");

    // Load images when component mounts
    useEffect(() => {
        const loadImages = async () => {
            try {
                const fetchedImages = await fetchPlotImages();
                setImages(fetchedImages);
                if (fetchedImages.length > 0) {
                    setSelectedImage(fetchedImages[0]);
                }
            } catch (error) {
                console.error('Error loading images:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadImages();
    }, []);

    useEffect(() => {
        const loadBase64 = async () => {
            if (!selectedImage) return;
            try {
                const base64 = await getImageBase64(selectedImage.url);
                setBase64Image(base64);
                // Load image-specific prompt
                try {
                    const savedPrompt = await getImagePrompt(base64);
                    setPrompt(savedPrompt || "Please provide a description of the plot in this image. Include an evaluation of the plot quality with any issues you see, the information it conveys, and any insights that can be gained from it. Be concise.");
                } catch (error) {
                    console.error('Error loading prompt:', error);
                }
            } catch (error) {
                console.error('Error loading base64 image:', error);
            }
        };
        loadBase64();
    }, [selectedImage]);

    // Save prompt when it changes
    useEffect(() => {
        const savePrompt = async () => {
            if (!base64Image || !prompt) return;
            try {
                await storeImagePrompt(base64Image, prompt);
            } catch (error) {
                console.error('Error saving prompt:', error);
            }
        };
        savePrompt();
    }, [base64Image, prompt]);

    const handleRequestSummary = useMemo(() => (async (modelId: string) => {
        if (!base64Image) return 'Error: Image not loaded';
        try {
            return await getAISummary(base64Image, modelId, prompt);
        } catch (error) {
            console.error('Error getting summary:', error);
            return 'Error generating summary';
        }
    }), [base64Image, prompt]);

    return (
        <div className="app">
            <h1>Plot Vision Comparison</h1>

            <div className="main-content">
                <div className="plots-section">
                    <div className="image-selection">
                        <h4>Select Plot</h4>
                        {isLoading ? (
                            <div>Loading plots...</div>
                        ) : (
                            <div className="image-grid">
                                {images.map((image) => (
                                <button
                                    key={image.url}
                                    className={`image-button ${selectedImage?.url === image.url ? 'selected' : ''}`}
                                    onClick={() => setSelectedImage(image)}
                                >
                                    <ImageDisplay image={image} />
                                </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {!isLoading && selectedImage && (
                        <div className="selected-image">
                            <h2>Selected Plot</h2>
                            <ImageDisplay image={selectedImage} />
                            <div className="prompt-input">
                                <h4>Prompt</h4>
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    rows={15}
                                    style={{ width: '100%', margin: '10px 0 20px 0' }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {base64Image && (
                    <div className="summaries-section">
                        <SummaryDisplay
                            models={AI_MODELS}
                            base64Image={base64Image}
                            prompt={prompt}
                            onRequestSummary={handleRequestSummary}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;

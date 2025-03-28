import { useState, useEffect, useMemo } from 'react';
import { ImageDisplay } from './components/ImageDisplay';
import { SummaryDisplay } from './components/SummaryDisplay';
import { PlotImage, AI_MODELS, getImageBase64, getAISummary, fetchPlotImages } from './types';
import './App.css';

function App() {
    const [images, setImages] = useState<PlotImage[]>([]);
    const [selectedImage, setSelectedImage] = useState<PlotImage | null>(null);
    const [base64Image, setBase64Image] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

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
            } catch (error) {
                console.error('Error loading base64 image:', error);
            }
        };
        loadBase64();
    }, [selectedImage]);

    const handleRequestSummary = useMemo(() => (async (modelId: string) => {
        if (!base64Image) return 'Error: Image not loaded';
        try {
            return await getAISummary(base64Image, modelId);
        } catch (error) {
            console.error('Error getting summary:', error);
            return 'Error generating summary';
        }
    }), [base64Image]);

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
                        </div>
                    )}
                </div>

                {base64Image && (
                    <div className="summaries-section">
                        <SummaryDisplay
                            models={AI_MODELS}
                            base64Image={base64Image}
                            onRequestSummary={handleRequestSummary}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;

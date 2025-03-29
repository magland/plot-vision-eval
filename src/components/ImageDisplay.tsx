import { useState } from 'react';
import './ImageDisplay.css';
import { PlotImage } from '../types';

interface ImageDisplayProps {
    image: PlotImage;
    onLoad?: () => void;
}

export function ImageDisplay({ image, onLoad }: ImageDisplayProps) {
    const [isLoading, setIsLoading] = useState(true);

    const handleImageLoad = () => {
        setIsLoading(false);
        onLoad?.();
    };

    return (
        <div className="image-display">
            {isLoading && <div className="loading">Loading image...</div>}
            <img
                src={image.url}
                alt={image.title}
                onLoad={handleImageLoad}
                style={{ display: isLoading ? 'none' : 'block' }}

            />
            <h3>{image.title}</h3>
        </div>
    );
}

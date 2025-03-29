import { PlotImage } from "./types";

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
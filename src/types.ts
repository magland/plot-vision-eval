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
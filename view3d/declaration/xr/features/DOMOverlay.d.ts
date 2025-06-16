declare class DOMOverlay {
    static isAvailable(): boolean;
    private _root;
    get root(): HTMLElement;
    destroy(): void;
    getFeatures(root: HTMLElement): {
        requiredFeatures: string[];
        domOverlay: {
            root: HTMLElement;
        };
    } | {
        requiredFeatures?: undefined;
        domOverlay?: undefined;
    };
}
export default DOMOverlay;

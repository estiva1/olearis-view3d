declare class HitTest {
    static isAvailable(): boolean;
    private _source;
    get ready(): boolean;
    destroy(): void;
    init(session: any): void;
    getFeatures(): {
        readonly requiredFeatures: readonly ["hit-test"];
    };
    getResults(frame?: THREE.XRFrame): import("three").XRHitTestResult[];
}
export default HitTest;

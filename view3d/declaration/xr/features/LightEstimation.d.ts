import View3D from "../../View3D";
import ARScene from "../ARScene";
declare class LightEstimation {
    static isAvailable(): boolean;
    private _view3D;
    private _arScene;
    private _light;
    private _origEnvironment;
    constructor(view3D: View3D, arScene: ARScene);
    getFeatures(): {
        readonly optionalFeatures: readonly ["light-estimation"];
    };
    init(): void;
    destroy(): void;
    private _onEstimationStart;
    private _onEstimationEnd;
}
export default LightEstimation;

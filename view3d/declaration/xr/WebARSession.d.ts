import type { XRSystem } from "webxr";
import View3D from "../View3D";
import WebARControl, { WebARControlOptions } from "../control/ar/WebARControl";
import * as XR from "../const/xr";
import ARSession from "./ARSession";
import ARScene from "./ARScene";
import DOMOverlay from "./features/DOMOverlay";
import HitTest from "./features/HitTest";
import LightEstimation from "./features/LightEstimation";
declare global {
    interface Navigator {
        xr: XRSystem;
    }
}
export interface WebARSessionOptions extends WebARControlOptions {
    features: typeof XR.EMPTY_FEATURES;
    useLightEstimation: boolean;
    vertical: boolean;
    overlayRoot: HTMLElement | string | null;
}
declare class WebARSession implements ARSession {
    static isAvailable(): Promise<boolean>;
    static readonly type: "webAR";
    features: WebARSessionOptions["features"];
    vertical: WebARSessionOptions["vertical"];
    overlayRoot: WebARSessionOptions["overlayRoot"];
    useLightEstimation: WebARSessionOptions["useLightEstimation"];
    private _view3D;
    private _arScene;
    private _control;
    private _hitTest;
    private _domOverlay;
    private _lightEstimation;
    private _modelPlaced;
    get control(): WebARControl;
    get arScene(): ARScene;
    get hitTest(): HitTest;
    get domOverlay(): DOMOverlay;
    get lightEstimation(): LightEstimation;
    constructor(view3D: View3D, { features, vertical, overlayRoot, useLightEstimation, rotate, translate, scale, ring, deadzone, initialScale }?: Partial<WebARSessionOptions>);
    enter(): Promise<void>;
    exit(): Promise<void>;
    private _getAllXRFeatures;
    private _initModelPosition;
    private _createARRootElement;
}
export default WebARSession;

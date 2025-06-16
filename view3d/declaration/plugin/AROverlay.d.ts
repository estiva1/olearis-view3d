import View3D from "../View3D";
import View3DPlugin from "./View3DPlugin";
export interface AROverlayOptions {
    className: Partial<{
        -readonly [key in keyof typeof AROverlay.DEFAULT_CLASS]: string;
    }>;
    showPlaneDetection: boolean;
    toastText: string;
}
declare class AROverlay implements View3DPlugin {
    static readonly DEFAULT_CLASS: {
        readonly ROOT: "view3d-ar-root";
        readonly CLOSE_BUTTON: "view3d-ar-close";
        readonly DETECTION_ROOT: "view3d-ar-detection";
        readonly DETECTION_ICON: "view3d-ar-detection-icon";
        readonly DETECTION_TOAST: "view3d-ar-detection-toast";
        readonly DETECTION_PHONE: "view3d-ar-phone";
        readonly DETECTION_CUBE: "view3d-ar-cube";
        readonly DETECTION_CUBE_FACE: "view3d-ar-cube-face";
        readonly DETECTION_PLANE: "view3d-ar-plane";
        readonly DETECTION_VISIBLE: "visible";
    };
    className: AROverlayOptions["className"];
    showPlaneDetection: AROverlayOptions["showPlaneDetection"];
    toastText: AROverlayOptions["toastText"];
    private _rootEl;
    private _closeButtonEl;
    private _detectionRootEl;
    constructor({ className, showPlaneDetection, toastText }?: Partial<AROverlayOptions>);
    init(view3D: View3D): Promise<void>;
    teardown(): void;
    private _createElements;
    private _createPlaneDetectionElements;
}
export default AROverlay;

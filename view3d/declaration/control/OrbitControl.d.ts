import View3D from "../View3D";
import CameraControl from "./CameraControl";
import RotateControl from "./RotateControl";
import TranslateControl from "./TranslateControl";
import ZoomControl from "./ZoomControl";
declare class OrbitControl {
    private _view3D;
    private _rotateControl;
    private _translateControl;
    private _zoomControl;
    private _extraControls;
    get rotate(): RotateControl;
    get translate(): TranslateControl;
    get zoom(): ZoomControl;
    get controls(): (RotateControl | TranslateControl | ZoomControl)[];
    get extraControls(): CameraControl[];
    get animating(): boolean;
    constructor(view3D: View3D);
    destroy(): void;
    update(deltaTime: number): void;
    resize(size: {
        width: number;
        height: number;
    }): void;
    enable(): void;
    disable(): void;
    sync(): void;
    add(control: CameraControl): void;
    remove(control: CameraControl): void;
    updateCursor(): void;
    private _setCursor;
    private _onEnable;
    private _onDisable;
    private _onHold;
    private _onRelease;
}
export default OrbitControl;

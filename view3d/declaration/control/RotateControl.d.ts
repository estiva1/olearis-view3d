import Component from "@egjs/component";
import View3D from "../View3D";
import { ControlEvents, OptionGetters } from "../type/utils";
import CameraControl from "./CameraControl";
export interface RotateControlOptions {
    scale: number;
    duration: number;
    easing: (x: number) => number;
    disablePitch: boolean;
    disableYaw: boolean;
}
declare class RotateControl extends Component<ControlEvents> implements CameraControl, OptionGetters<RotateControlOptions> {
    private _scale;
    private _duration;
    private _easing;
    private _disablePitch;
    private _disableYaw;
    private _view3D;
    private _xMotion;
    private _yMotion;
    private _screenScale;
    private _prevPos;
    private _isFirstTouch;
    private _scrolling;
    private _enabled;
    get enabled(): boolean;
    get animating(): boolean;
    get scale(): RotateControlOptions["scale"];
    get duration(): RotateControlOptions["duration"];
    get easing(): RotateControlOptions["easing"];
    get disablePitch(): boolean;
    get disableYaw(): boolean;
    set scale(val: RotateControlOptions["scale"]);
    set duration(val: RotateControlOptions["duration"]);
    set easing(val: RotateControlOptions["easing"]);
    constructor(view3D: View3D, { duration, easing, scale, disablePitch, disableYaw }?: Partial<RotateControlOptions>);
    destroy(): void;
    reset(): void;
    update(deltaTime: number): void;
    resize(size: {
        width: number;
        height: number;
    }): void;
    enable(): void;
    disable(): void;
    sync(): void;
    private _onMouseDown;
    private _onMouseMove;
    private _onMouseUp;
    private _onTouchStart;
    private _onTouchMove;
    private _onTouchEnd;
}
export default RotateControl;

import Component from "@egjs/component";
import View3D from "../View3D";
import { ControlEvents, OptionGetters } from "../type/utils";
import CameraControl from "./CameraControl";
export interface TranslateControlOptions {
    scale: number;
    duration: number;
    easing: (x: number) => number;
}
declare class TranslateControl extends Component<ControlEvents> implements CameraControl, OptionGetters<TranslateControlOptions> {
    private _scale;
    private _duration;
    private _easing;
    private _view3D;
    private _enabled;
    private _touchInitialized;
    private _xMotion;
    private _yMotion;
    private _prevPos;
    private _screenSize;
    get enabled(): boolean;
    get animating(): boolean;
    get scale(): TranslateControlOptions["scale"];
    get duration(): TranslateControlOptions["duration"];
    get easing(): TranslateControlOptions["easing"];
    set scale(val: TranslateControlOptions["scale"]);
    set duration(val: TranslateControlOptions["duration"]);
    set easing(val: TranslateControlOptions["easing"]);
    constructor(view3D: View3D, { easing, duration, scale }?: Partial<TranslateControlOptions>);
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
    private _getTouchesMiddle;
    private _onContextMenu;
}
export default TranslateControl;

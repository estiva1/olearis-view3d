import Component from "@egjs/component";
import View3D from "../View3D";
import { AUTO, ZOOM_TYPE } from "../const/external";
import { ControlEvents, OptionGetters, ValueOf } from "../type/utils";
import CameraControl from "./CameraControl";
export interface ZoomControlOptions {
    type: ValueOf<typeof ZOOM_TYPE>;
    scale: number;
    duration: number;
    minFov: number;
    maxFov: typeof AUTO | number;
    minDistance: number;
    maxDistance: number;
    doubleTap: boolean | Partial<{
        zoomIn: number;
        useZoomOut: boolean;
        duration: number;
        easing: (x: number) => number;
    }>;
    easing: (x: number) => number;
}
declare class ZoomControl extends Component<ControlEvents> implements CameraControl, OptionGetters<ZoomControlOptions> {
    private _type;
    private _scale;
    private _duration;
    private _minFov;
    private _maxFov;
    private _minDistance;
    private _maxDistance;
    private _doubleTap;
    private _easing;
    private _view3D;
    private _scaleModifier;
    private _wheelModifier;
    private _touchModifier;
    private _motion;
    private _prevTouchDistance;
    private _enabled;
    private _isFirstTouch;
    private _isWheelScrolling;
    get enabled(): boolean;
    get animating(): boolean;
    get range(): import("../type/utils").Range;
    get type(): ZoomControlOptions["type"];
    get scale(): ZoomControlOptions["scale"];
    get duration(): number;
    get minFov(): number;
    get maxFov(): number | "auto";
    get minDistance(): number;
    get maxDistance(): number;
    get doubleTap(): boolean | Partial<{
        zoomIn: number;
        useZoomOut: boolean;
        duration: number;
        easing: (x: number) => number;
    }>;
    get easing(): (x: number) => number;
    set type(val: ZoomControlOptions["type"]);
    set scale(val: ZoomControlOptions["scale"]);
    constructor(view3D: View3D, { type, scale, duration, minFov, maxFov, minDistance, maxDistance, doubleTap, easing }?: Partial<ZoomControlOptions>);
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
    updateRange(): void;
    private _onWheel;
    private _onTouchMove;
    private _onTouchEnd;
    private _onDoubleClick;
}
export default ZoomControl;

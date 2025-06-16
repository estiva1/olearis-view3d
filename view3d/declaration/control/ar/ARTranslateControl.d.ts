import * as THREE from "three";
import { XRRenderContext, XRInputs } from "../../type/xr";
import ARControl from "./ARControl";
export interface ARTranslateControlOptions {
    threshold: number;
    hoverHeight: number;
    bounceDuration: number;
    bounceEasing: (x: number) => number;
}
declare class ARTranslateControl implements ARControl {
    private _hoverHeight;
    private _hoverPosition;
    private _floorPosition;
    private _wallRotation;
    private _dragPlane;
    private _enabled;
    private _vertical;
    private _state;
    private _initialPos;
    private _bounceMotion;
    get enabled(): boolean;
    get floorPosition(): THREE.Vector3;
    get hoverHeight(): number;
    set hoverHeight(val: number);
    constructor({ hoverHeight, bounceDuration, bounceEasing }?: Partial<ARTranslateControlOptions>);
    enable(): void;
    disable(): void;
    activate(): void;
    deactivate(): void;
    init(position: THREE.Vector3, rotation: THREE.Quaternion, vertical: boolean): void;
    setInitialPos(coords: THREE.Vector2[]): void;
    process({ frame, referenceSpace, xrCam }: XRRenderContext, { hitResults }: XRInputs): void;
    update({ scene }: XRRenderContext, delta: number): void;
    private _calcDragPlaneConstant;
}
export default ARTranslateControl;

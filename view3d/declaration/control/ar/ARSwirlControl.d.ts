import * as THREE from "three";
import { XRRenderContext, XRInputs } from "../../type/xr";
import ARControl from "./ARControl";
export interface ARSwirlControlOptions {
    scale: number;
}
declare class ARSwirlControl implements ARControl {
    readonly rotation: THREE.Quaternion;
    private _userScale;
    private _axis;
    private _enabled;
    private _active;
    private _prevPos;
    private _fromQuat;
    private _toQuat;
    private _motion;
    get enabled(): boolean;
    get scale(): number;
    set scale(val: number);
    constructor({ scale }?: Partial<ARSwirlControlOptions>);
    updateRotation(rotation: THREE.Quaternion): void;
    enable(): void;
    disable(): void;
    activate(): void;
    deactivate(): void;
    updateAxis(axis: THREE.Vector3): void;
    setInitialPos(coords: THREE.Vector2[]): void;
    process({ scene, xrCam }: XRRenderContext, { coords }: XRInputs): void;
    update({ scene }: XRRenderContext, deltaTime: number): void;
    private _getInterpolatedQuaternion;
}
export default ARSwirlControl;

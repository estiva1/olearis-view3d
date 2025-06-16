import * as THREE from "three";
import View3D from "../View3D";
import Pose from "./Pose";
import Model from "./Model";
declare class Camera {
    private _view3D;
    private _threeCamera;
    private _baseDistance;
    private _baseFov;
    private _defaultPose;
    private _currentPose;
    private _newPose;
    private _maxTanHalfHFov;
    get threeCamera(): THREE.PerspectiveCamera;
    get defaultPose(): Pose;
    get currentPose(): Pose;
    get newPose(): Pose;
    get yaw(): number;
    get pitch(): number;
    get zoom(): number;
    get distance(): number;
    get baseDistance(): number;
    get baseFov(): number;
    get pivot(): THREE.Vector3;
    get fov(): number;
    get renderWidth(): number;
    get renderHeight(): number;
    set yaw(val: number);
    set pitch(val: number);
    set zoom(val: number);
    set pivot(val: THREE.Vector3);
    set baseFov(val: number);
    constructor(view3D: View3D);
    reset(duration?: number, easing?: (x: number) => number, pose?: Pose): Promise<void>;
    resize({ width, height }: {
        width: number;
        height: number;
    }, prevSize?: {
        width: number;
        height: number;
    } | null): void;
    fit(model: Model): void;
    updatePosition(): void;
    private _applyEffectiveFov;
    private _parseBboxRatioOption;
}
export default Camera;

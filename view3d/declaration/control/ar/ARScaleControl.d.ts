import * as THREE from "three";
import Model from "../../core/Model";
import ARScene from "../../xr/ARScene";
import { XRRenderContext, XRInputs } from "../../type/xr";
import ARControl from "./ARControl";
import ScaleUI from "./ScaleUI";
import { WebARControlOptions } from "./WebARControl";
export interface ARScaleControlOptions {
    min: number;
    max: number;
}
declare class ARScaleControl implements ARControl {
    private _motion;
    private _enabled;
    private _active;
    private _prevCoordDistance;
    private _scaleMultiplier;
    private _ui;
    get enabled(): boolean;
    get scale(): number;
    get ui(): ScaleUI;
    get range(): import("../../type/utils").Range;
    constructor({ min, max }?: Partial<ARScaleControlOptions>);
    setInitialScale({ scene, model, floorPosition, xrCam, initialScale }: {
        scene: ARScene;
        model: Model;
        floorPosition: THREE.Vector3;
        xrCam: THREE.PerspectiveCamera;
        initialScale: WebARControlOptions["initialScale"];
    }): void;
    setInitialPos(coords: THREE.Vector2[]): void;
    enable(): void;
    disable(): void;
    activate(ctx: XRRenderContext): void;
    deactivate(): void;
    process(ctx: XRRenderContext, { coords }: XRInputs): void;
    update({ scene }: XRRenderContext, deltaTime: number): void;
    private _updateUIPosition;
}
export default ARScaleControl;

import * as THREE from "three";
import Model from "../../core/Model";
export interface FloorIndicatorOptions {
    ringOpacity: number;
    dirIndicatorOpacity: number;
    fadeoutDuration: number;
}
declare class FloorIndicator {
    private _mesh;
    private _ring;
    private _arrow;
    private _reticle;
    private _animator;
    private _opacityRange;
    get mesh(): THREE.Group;
    constructor({ ringOpacity, dirIndicatorOpacity, fadeoutDuration }?: Partial<FloorIndicatorOptions>);
    updateSize(model: Model): void;
    update({ delta, rotation }: {
        delta: number;
        rotation: THREE.Quaternion;
    }): void;
    show(): void;
    hide(): void;
    fadeout(): void;
}
export default FloorIndicator;

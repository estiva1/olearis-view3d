import * as THREE from "three";
import View3D from "../View3D";
import Model from "./Model";
export interface ShadowOptions {
    darkness: number;
    mapSize: number;
    blur: number;
    shadowScale: number;
    planeScale: number;
}
declare class ShadowPlane {
    private _darkness;
    private _mapSize;
    private _blur;
    private _shadowScale;
    private _planeScale;
    private _view3D;
    private _root;
    private _shadowCamera;
    private _blurCamera;
    private _renderTarget;
    private _blurTarget;
    private _depthMaterial;
    private _horizontalBlurMaterial;
    private _verticalBlurMaterial;
    private _plane;
    private _blurPlane;
    get root(): THREE.Group;
    get darkness(): ShadowOptions["darkness"];
    get mapSize(): number;
    get blur(): ShadowOptions["blur"];
    get shadowScale(): ShadowOptions["shadowScale"];
    get planeScale(): number;
    set darkness(val: ShadowOptions["darkness"]);
    set blur(val: ShadowOptions["blur"]);
    set shadowScale(val: ShadowOptions["shadowScale"]);
    constructor(view3D: View3D, { darkness, mapSize, blur, shadowScale, planeScale }?: Partial<ShadowOptions>);
    updateDimensions(model: Model): void;
    render(): void;
    private _blurShadow;
    private _setupPlanes;
}
export default ShadowPlane;

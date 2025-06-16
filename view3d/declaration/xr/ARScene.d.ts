import * as THREE from "three";
import View3D from "../View3D";
import Model from "../core/Model";
declare class ARScene {
    private _root;
    private _modelRoot;
    private _modelMovable;
    private _modelFixed;
    private _arRoot;
    get root(): THREE.Scene;
    get modelRoot(): THREE.Group;
    get modelMovable(): THREE.Group;
    get arRoot(): THREE.Group;
    constructor();
    init(view3D: View3D): void;
    destroy(view3D: View3D): void;
    showModel(): void;
    hideModel(): void;
    add(...objects: THREE.Object3D[]): void;
    remove(...objects: THREE.Object3D[]): void;
    setRootPosition(pos: THREE.Vector3): void;
    setWallRotation(quat: THREE.Quaternion): void;
    updateModelRootPosition(model: Model, vertical: boolean): void;
    setModelHovering(hoverAmount: number): void;
    setModelRotation(quat: THREE.Quaternion): void;
    setModelScale(scalar: number): void;
}
export default ARScene;

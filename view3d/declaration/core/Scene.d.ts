import * as THREE from "three";
import View3D from "../View3D";
import ShadowPlane from "./ShadowPlane";
declare class Scene {
    private _view3D;
    private _root;
    private _shadowPlane;
    private _userObjects;
    private _envObjects;
    private _fixedObjects;
    get root(): THREE.Scene;
    get shadowPlane(): ShadowPlane;
    get userObjects(): THREE.Group;
    get envObjects(): THREE.Group;
    get fixedObjects(): THREE.Group;
    constructor(view3D: View3D);
    reset({ volatileOnly }?: {
        volatileOnly?: boolean;
    }): void;
    add(object: THREE.Object3D | THREE.Object3D[], volatile?: boolean): void;
    remove(object: THREE.Object3D | THREE.Object3D[]): void;
    setBackground(background: number | string): Promise<void>;
    setSkybox(url: string | null): Promise<void>;
    setEnvMap(url: string | null): Promise<void>;
    initTextures(): Promise<any>[];
    setDefaultEnv(): void;
    private _removeChildsOf;
}
export default Scene;

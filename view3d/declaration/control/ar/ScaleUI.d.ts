import * as THREE from "three";
export interface ScaleUIOptions {
    width: number;
    padding: number;
    offset: number;
    font: CanvasRenderingContext2D["font"];
    color: CanvasRenderingContext2D["fillStyle"];
}
declare class ScaleUI {
    private _canvas;
    private _ctx;
    private _mesh;
    private _texture;
    private _font;
    private _color;
    private _padding;
    private _offset;
    private _height;
    get mesh(): THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>;
    get height(): number;
    get visible(): boolean;
    constructor({ width, padding, offset, font, color }?: Partial<ScaleUIOptions>);
    updatePosition(worldRotation: THREE.Quaternion, focus: THREE.Vector3, modelHeight: number): void;
    updateScale(scale: number): void;
    show(): void;
    hide(): void;
}
export default ScaleUI;

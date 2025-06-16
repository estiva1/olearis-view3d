import * as THREE from "three";
import View3D from "../View3D";
import Annotation from "./Annotation";
declare class AnnotationManager {
    private _view3D;
    private _list;
    private _wrapper;
    get list(): Annotation[];
    get wrapper(): HTMLElement;
    constructor(view3D: View3D);
    init(): void;
    destroy(): void;
    resize(): void;
    collect(): void;
    load(url: string): Promise<Annotation[]>;
    parse(data: {
        baseFov: number;
        baseDistance: number;
        items: Array<{
            meshIndex: number | null;
            faceIndex: number;
            position: number[] | null;
            focus: number[];
            focusOffset: number[];
            duration: number;
            label: string | null;
        }>;
    }): Annotation[];
    render(camera?: THREE.PerspectiveCamera, size?: THREE.Vector2): void;
    add(...annotations: Annotation[]): void;
    remove(index: number): Annotation | null;
    reset(): void;
    toJSON(): {
        baseFov: number;
        baseDistance: number;
        aspect: number;
        items: {
            label: string;
        }[];
    };
    private _createWrapper;
    private _createDefaultAnnotationElement;
    private _onInput;
}
export default AnnotationManager;

import * as THREE from "three";
import View3D from "../View3D";
import Annotation, { AnnotationOptions } from "./Annotation";
export interface FaceAnnotationOptions extends AnnotationOptions {
    meshIndex: number;
    faceIndex: number;
    weights: number[];
}
declare class FaceAnnotation extends Annotation {
    private _meshIndex;
    private _faceIndex;
    private _weights;
    private _trackingControl;
    get position(): THREE.Vector3;
    get renderable(): boolean;
    get meshIndex(): number;
    get faceIndex(): number;
    get weights(): number[];
    constructor(view3D: View3D, { meshIndex, faceIndex, weights, ...commonOptions }?: Partial<FaceAnnotationOptions>);
    focus(): Promise<void>;
    unfocus(): void;
    render(params: Parameters<Annotation["render"]>[0]): void;
    handleUserInput(): void;
    toJSON(): {
        meshIndex: number;
        faceIndex: number;
        focus: number[];
        duration: number;
        focusOffset: number[];
    };
    destroyTrackingControl(): void;
    private _getPosition;
    private _getFocusPivot;
}
export default FaceAnnotation;

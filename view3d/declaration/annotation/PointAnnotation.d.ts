import * as THREE from "three";
import View3D from "../View3D";
import Annotation, { AnnotationOptions } from "./Annotation";
export interface PointAnnotationOptions extends AnnotationOptions {
    position: number[];
}
declare class PointAnnotation extends Annotation {
    private _position;
    get position(): THREE.Vector3;
    constructor(view3D: View3D, { position, ...commonOptions }?: Partial<PointAnnotationOptions>);
    focus(): Promise<void>;
    unfocus(): void;
    toJSON(): {
        position: THREE.Vector3Tuple;
        focus: number[];
        duration: number;
        focusOffset: number[];
    };
    private _calculateNormalFromModelCenter;
}
export default PointAnnotation;

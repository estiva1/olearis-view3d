import * as THREE from "three";
declare class Pose {
    yaw: number;
    pitch: number;
    zoom: number;
    pivot: THREE.Vector3;
    constructor(yaw: number, pitch: number, zoom: number, pivot?: number[]);
    clone(): Pose;
    copy(pose: Pose): void;
    equals(pose: Pose): boolean;
}
export default Pose;

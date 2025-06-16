import * as THREE from "three";
import { GESTURE } from "../../const/internal";
export interface DeadzoneCheckerOptions {
    size: number;
}
declare class DeadzoneChecker {
    private _size;
    private _state;
    private _detectedGesture;
    private _testingGestures;
    private _lastFingerCount;
    private _aspect;
    private _prevOneFingerPos;
    private _prevTwoFingerPos;
    private _initialTwoFingerDistance;
    private _prevOneFingerPosInitialized;
    private _prevTwoFingerPosInitialized;
    get size(): number;
    get inDeadzone(): boolean;
    set size(val: number);
    constructor({ size }?: Partial<DeadzoneCheckerOptions>);
    setAspect(aspect: number): void;
    setFirstInput(inputs: THREE.Vector2[]): void;
    addTestingGestures(...gestures: GESTURE[]): void;
    cleanup(): void;
    applyScreenAspect(inputs: THREE.Vector2[]): void;
    check(inputs: THREE.Vector2[]): GESTURE;
}
export default DeadzoneChecker;

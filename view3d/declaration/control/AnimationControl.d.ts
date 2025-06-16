import View3D from "../View3D";
import Pose from "../core/Pose";
import CameraControl from "./CameraControl";
declare class AnimationControl implements CameraControl {
    private _from;
    private _to;
    private _disableOnFinish;
    private _view3D;
    private _motion;
    private _enabled;
    private _finishCallbacks;
    get element(): any;
    get enabled(): boolean;
    get duration(): number;
    get easing(): (x: number) => number;
    get animating(): boolean;
    set duration(val: number);
    set easing(val: (x: number) => number);
    constructor(view3D: View3D, from: Pose, to: Pose, { duration, easing, disableOnFinish }?: {
        duration?: number;
        easing?: (x: number) => number;
        disableOnFinish?: boolean;
    });
    destroy(): void;
    changeStartEnd(from: Pose, to: Pose): void;
    update(deltaTime: number): void;
    enable(): void;
    disable(): void;
    reset(): void;
    onFinished(callback: (...args: any) => any): void;
    clearFinished(): void;
    resize(size: {
        width: number;
        height: number;
    }): void;
    sync(): void;
}
export default AnimationControl;

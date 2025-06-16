import View3D from "../../View3D";
import ControlBar from "./ControlBar";
import ControlBarItem from "./ControlBarItem";
export interface AnimationProgressBarOptions {
    position: ControlBarItem["position"];
    order: ControlBarItem["order"];
}
declare class AnimationProgressBar implements ControlBarItem {
    position: AnimationProgressBarOptions["position"];
    order: AnimationProgressBarOptions["order"];
    get element(): HTMLElement;
    get enabled(): boolean;
    private _view3D;
    private _controlBar;
    private _rootEl;
    private _thumbEl;
    private _trackEl;
    private _fillerEl;
    private _rootBbox;
    private _enabled;
    private _firstTouch;
    private _scrolling;
    private _origTimeScale;
    constructor(view3D: View3D, controlBar: ControlBar, { position, order }?: Partial<AnimationProgressBarOptions>);
    enable(): void;
    disable(): void;
    enableInput(): void;
    disableInput(): void;
    private _createElements;
    private _onResize;
    private _onRender;
    private _fill;
    private _onMouseDown;
    private _onMouseMove;
    private _onMouseUp;
    private _onTouchStart;
    private _onTouchMove;
    private _onTouchEnd;
    private _release;
    private _showThumb;
    private _hideThumb;
    private _updateAnimationProgress;
    private _setAnimationTimeScale;
}
export default AnimationProgressBar;

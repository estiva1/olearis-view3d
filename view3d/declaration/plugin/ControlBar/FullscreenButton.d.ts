import View3D from "../../View3D";
import ControlBar from "./ControlBar";
import ControlBarItem from "./ControlBarItem";
export interface FullscreenButtonOptions {
    position: ControlBarItem["position"];
    order: ControlBarItem["order"];
}
declare class FullscreenButton implements ControlBarItem {
    position: FullscreenButtonOptions["position"];
    order: FullscreenButtonOptions["order"];
    get element(): HTMLElement;
    get enabled(): boolean;
    private _view3D;
    private _element;
    private _enabled;
    constructor(view3D: View3D, controlBar: ControlBar, { position, order }?: Partial<FullscreenButtonOptions>);
    enable(): void;
    disable(): void;
    private _onClick;
    private _isFullscreen;
    private _requestFullscreen;
    private _exitFullscreen;
    private _createButton;
}
export default FullscreenButton;

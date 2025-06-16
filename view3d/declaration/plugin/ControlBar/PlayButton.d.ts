import View3D from "../../View3D";
import ControlBar from "./ControlBar";
import ControlBarItem from "./ControlBarItem";
export interface PlayButtonOptions {
    position: ControlBarItem["position"];
    order: ControlBarItem["order"];
}
declare class PlayButton implements ControlBarItem {
    position: PlayButtonOptions["position"];
    order: PlayButtonOptions["order"];
    get element(): HTMLElement;
    get enabled(): boolean;
    private _view3D;
    private _element;
    private _enabled;
    private _paused;
    constructor(view3D: View3D, controlBar: ControlBar, { position, order }?: Partial<PlayButtonOptions>);
    enable(): void;
    disable(): void;
    private _updateIcon;
    private _onClick;
    private _createButton;
}
export default PlayButton;

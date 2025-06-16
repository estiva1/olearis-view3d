import View3D from "../../View3D";
import ControlBar from "./ControlBar";
import ControlBarItem from "./ControlBarItem";
export interface AnimationSelectorOptions {
    position: ControlBarItem["position"];
    order: ControlBarItem["order"];
}
declare class AnimationSelector implements ControlBarItem {
    position: AnimationSelectorOptions["position"];
    order: AnimationSelectorOptions["order"];
    get element(): HTMLElement;
    get enabled(): boolean;
    private _view3D;
    private _controlBar;
    private _rootEl;
    private _nameEl;
    private _itemListEl;
    private _enabled;
    constructor(view3D: View3D, controlBar: ControlBar, { position, order }?: Partial<AnimationSelectorOptions>);
    enable(): void;
    disable(): void;
    private _createElements;
    private _updateAnimations;
    private _toggleList;
    private _hideList;
}
export default AnimationSelector;

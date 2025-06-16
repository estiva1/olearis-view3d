import View3D from "../../View3D";
import ControlBar from "./ControlBar";
import ControlBarItem from "./ControlBarItem";
export interface CameraResetButtonOptions {
    position: ControlBarItem["position"];
    order: ControlBarItem["order"];
    duration: number;
}
declare class CameraResetButton implements ControlBarItem {
    position: CameraResetButtonOptions["position"];
    order: CameraResetButtonOptions["order"];
    duration: CameraResetButtonOptions["duration"];
    get element(): HTMLElement;
    get enabled(): boolean;
    private _view3D;
    private _element;
    private _enabled;
    constructor(view3D: View3D, controlBar: ControlBar, { position, order, duration }?: Partial<CameraResetButtonOptions>);
    enable(): void;
    disable(): void;
    private _onClick;
    private _createButton;
}
export default CameraResetButton;

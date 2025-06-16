import View3D from "../../View3D";
import ControlBar from "./ControlBar";
import ControlBarItem from "./ControlBarItem";
export interface NavigationGizmoOptions {
    axisWidth: number;
    font: string;
    xAxisColor: number | string;
    yAxisColor: number | string;
    zAxisColor: number | string;
}
declare class NavigationGizmo implements ControlBarItem {
    axisWidth: NavigationGizmoOptions["axisWidth"];
    font: NavigationGizmoOptions["font"];
    xAxisColor: NavigationGizmoOptions["xAxisColor"];
    yAxisColor: NavigationGizmoOptions["yAxisColor"];
    zAxisColor: NavigationGizmoOptions["zAxisColor"];
    get element(): HTMLElement;
    get enabled(): boolean;
    private _view3D;
    private _rootEl;
    private _canvasEl;
    private _axisEls;
    private _axisClickListeners;
    private _enabled;
    private _ctx;
    private _canvasSize;
    constructor(view3D: View3D, controlBar: ControlBar, { axisWidth, font, xAxisColor, yAxisColor, zAxisColor }?: Partial<NavigationGizmoOptions>);
    enable(): void;
    disable(): void;
    private _onRender;
    private _createElement;
    private _getScreenPos;
    private _getColorRGBAString;
}
export default NavigationGizmo;

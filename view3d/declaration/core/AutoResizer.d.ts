import View3D from "../View3D";
declare class AutoResizer {
    private _view3d;
    private _enabled;
    private _resizeObserver;
    get enabled(): boolean;
    constructor(view3d: View3D);
    enable(): this;
    disable(): this;
    private _onResize;
    private _skipFirstResize;
}
export default AutoResizer;

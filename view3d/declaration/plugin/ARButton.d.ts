import View3D from "../View3D";
import View3DPlugin from "./View3DPlugin";
export interface ARButtonOptions {
    availableText: string;
    unavailableText: string;
    buttonClass: string;
    tooltipClass: string;
}
declare class ARButton implements View3DPlugin {
    private _options;
    private _button;
    constructor(options?: Partial<ARButtonOptions>);
    init(view3D: View3D): Promise<void>;
    teardown(view3D: View3D): void;
    private _addButton;
    private _setAvailable;
}
export default ARButton;

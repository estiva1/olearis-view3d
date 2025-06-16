import View3D from "../View3D";
import { ValueOf } from "../type/utils";
import View3DPlugin from "./View3DPlugin";
export interface LoadingBarOptions {
    type: ValueOf<typeof LoadingBar.TYPE>;
    className: Partial<{
        -readonly [key in keyof typeof LoadingBar.DEFAULT_CLASS]: string;
    }>;
    loadingLabel: string;
    parsingLabel: string;
    labelColor: string;
    barWidth: string;
    barHeight: string;
    barBackground: string;
    barForeground: string;
    spinnerWidth: string;
    overlayBackground: string;
}
declare class LoadingBar implements View3DPlugin {
    static readonly DEFAULT_CLASS: {
        readonly OVERLAY: "view3d-lb-overlay";
        readonly WRAPPER: "view3d-lb-wrapper";
        readonly BASE: "view3d-lb-base";
        readonly LABEL: "view3d-lb-label";
        readonly FILLER: "view3d-lb-filler";
        readonly TYPE_SPINNER: "is-spinner";
        readonly TYPE_TOP: "is-top";
    };
    static TYPE: {
        readonly DEFAULT: "default";
        readonly TOP: "top";
        readonly SPINNER: "spinner";
    };
    private _options;
    private _overlay;
    constructor(options?: Partial<LoadingBarOptions>);
    init(view3D: View3D): Promise<void>;
    teardown(view3D: View3D): void;
    private _startLoading;
    private _removeOverlay;
}
export default LoadingBar;

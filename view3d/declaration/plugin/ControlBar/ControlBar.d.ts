import View3D from "../../View3D";
import View3DPlugin from "../View3DPlugin";
import ControlBarItem from "./ControlBarItem";
import { AnimationProgressBarOptions } from "./AnimationProgressBar";
import { PlayButtonOptions } from "./PlayButton";
import { AnimationSelectorOptions } from "./AnimationSelector";
import { FullscreenButtonOptions } from "./FullscreenButton";
import { NavigationGizmoOptions } from "./NavigationGizmo";
import { CameraResetButtonOptions } from "./CameraResetButton";
interface AutoHideOptions {
    initialDelay: number;
    delay: number;
}
export interface ControlBarOptions {
    autoHide: boolean | AutoHideOptions;
    className: Partial<{
        -readonly [key in keyof typeof ControlBar.DEFAULT_CLASS]: string;
    }>;
    progressBar: boolean | Partial<AnimationProgressBarOptions>;
    playButton: boolean | Partial<PlayButtonOptions>;
    animationSelector: boolean | Partial<AnimationSelectorOptions>;
    fullscreenButton: boolean | Partial<FullscreenButtonOptions>;
    navigationGizmo: boolean | Partial<NavigationGizmoOptions>;
    cameraResetButton: boolean | Partial<CameraResetButtonOptions>;
}
declare class ControlBar implements View3DPlugin {
    static readonly DEFAULT_CLASS: {
        readonly ROOT: "view3d-control-bar";
        readonly VISIBLE: "visible";
        readonly DISABLED: "disabled";
        readonly CONTROLS_BG: "view3d-controls-background";
        readonly CONTROLS_SIDE: "view3d-side-controls";
        readonly CONTROLS_TOP: "view3d-top-controls";
        readonly CONTROLS_LEFT: "view3d-left-controls";
        readonly CONTROLS_RIGHT: "view3d-right-controls";
        readonly CONTROLS_ITEM: "view3d-control-item";
        readonly PROGRESS_ROOT: "view3d-progress-bar";
        readonly PROGRESS_TRACK: "view3d-progress-track";
        readonly PROGRESS_THUMB: "view3d-progress-thumb";
        readonly PROGRESS_FILLER: "view3d-progress-filler";
        readonly ANIMATION_NAME: "view3d-animation-name";
        readonly ANIMATION_LIST: "view3d-animation-list";
        readonly ANIMATION_ITEM: "view3d-animation-item";
        readonly ANIMATION_SELECTED: "selected";
        readonly GIZMO_ROOT: "view3d-gizmo";
        readonly GIZMO_AXIS: "view3d-gizmo-axis";
    };
    static readonly POSITION: {
        readonly TOP: "top";
        readonly LEFT: "left";
        readonly RIGHT: "right";
    };
    autoHide: ControlBarOptions["autoHide"];
    className: ControlBarOptions["className"];
    progressBar: ControlBarOptions["progressBar"];
    playButton: ControlBarOptions["playButton"];
    animationSelector: ControlBarOptions["animationSelector"];
    fullscreenButton: ControlBarOptions["fullscreenButton"];
    navigationGizmo: ControlBarOptions["navigationGizmo"];
    cameraResetButton: ControlBarOptions["cameraResetButton"];
    get rootEl(): HTMLElement;
    get items(): ControlBarItem[];
    private _rootEl;
    private _topControlsWrapper;
    private _leftControlsWrapper;
    private _rightControlsWrapper;
    private _items;
    private _autoHideTimer;
    constructor({ autoHide, className, progressBar, playButton, animationSelector, fullscreenButton, navigationGizmo, cameraResetButton }?: Partial<ControlBarOptions>);
    init(view3D: View3D): Promise<void>;
    teardown(view3D: View3D): void;
    show: () => void;
    hide: () => void;
    private _initElements;
    private _addItemElements;
    private _attachElements;
    private _removeElements;
    private _updateModelParams;
    private _setupAutoHide;
    private _hideAfterDelay;
    private _createDefaultItems;
}
export default ControlBar;

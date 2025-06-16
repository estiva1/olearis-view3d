import * as THREE from "three";
export { ERROR_CODES } from "./error";
export declare const AUTO = "auto";
export declare const EVENTS: {
    readonly READY: "ready";
    readonly LOAD_START: "loadStart";
    readonly LOAD: "load";
    readonly LOAD_ERROR: "loadError";
    readonly LOAD_FINISH: "loadFinish";
    readonly MODEL_CHANGE: "modelChange";
    readonly RESIZE: "resize";
    readonly BEFORE_RENDER: "beforeRender";
    readonly RENDER: "render";
    readonly PROGRESS: "progress";
    readonly INPUT_START: "inputStart";
    readonly INPUT_END: "inputEnd";
    readonly CAMERA_CHANGE: "cameraChange";
    readonly ANIMATION_START: "animationStart";
    readonly ANIMATION_LOOP: "animationLoop";
    readonly ANIMATION_FINISHED: "animationFinished";
    readonly ANNOTATION_FOCUS: "annotationFocus";
    readonly ANNOTATION_UNFOCUS: "annotationUnfocus";
    readonly AR_START: "arStart";
    readonly AR_END: "arEnd";
    readonly AR_MODEL_PLACED: "arModelPlaced";
    readonly QUICK_LOOK_TAP: "quickLookTap";
};
export declare const EASING: {
    readonly SINE_WAVE: (x: number) => number;
    readonly EASE_OUT_CUBIC: (x: number) => number;
    readonly EASE_OUT_BOUNCE: (x: number) => number;
};
export declare const DEFAULT_CLASS: {
    readonly WRAPPER: "view3d-wrapper";
    readonly CANVAS: "view3d-canvas";
    readonly POSTER: "view3d-poster";
    readonly AR_OVERLAY: "view3d-ar-overlay";
    readonly ANNOTATION_WRAPPER: "view3d-annotation-wrapper";
    readonly ANNOTATION: "view3d-annotation";
    readonly ANNOTATION_TOOLTIP: "view3d-annotation-tooltip";
    readonly ANNOTATION_DEFAULT: "default";
    readonly ANNOTATION_SELECTED: "selected";
    readonly ANNOTATION_HIDDEN: "hidden";
    readonly ANNOTATION_FLIP_X: "flip-x";
    readonly ANNOTATION_FLIP_Y: "flip-y";
    readonly CTX_LOST: "ctx-lost";
};
export declare const TONE_MAPPING: {
    LINEAR: THREE.ToneMapping;
    REINHARD: THREE.ToneMapping;
    CINEON: THREE.ToneMapping;
    ACES_FILMIC: THREE.ToneMapping;
};
export declare const ZOOM_TYPE: {
    FOV: string;
    DISTANCE: string;
};
export declare const AR_SESSION_TYPE: {
    readonly WEBXR: "webAR";
    readonly SCENE_VIEWER: "sceneViewer";
    readonly QUICK_LOOK: "quickLook";
};
export declare const SCENE_VIEWER_MODE: {
    readonly ONLY_AR: "ar_only";
    readonly ONLY_3D: "3d_only";
    readonly PREFER_AR: "ar_preferred";
    readonly PREFER_3D: "3d_preferred";
};
export declare const QUICK_LOOK_APPLE_PAY_BUTTON_TYPE: {
    readonly PLAIN: "plain";
    readonly PAY: "pay";
    readonly BUY: "buy";
    readonly CHECK_OUT: "check-out";
    readonly BOOK: "book";
    readonly DONATE: "donate";
    readonly SUBSCRIBE: "subscribe";
};
export declare const QUICK_LOOK_CUSTOM_BANNER_SIZE: {
    readonly SMALL: "small";
    readonly MEDIUM: "medium";
    readonly LARGE: "large";
};
export declare const INPUT_TYPE: {
    readonly ROTATE: 0;
    readonly TRANSLATE: 1;
    readonly ZOOM: 2;
};
export declare const ANIMATION_REPEAT_MODE: {
    readonly ONE: "one";
    readonly NONE: "none";
    readonly ALL: "all";
};

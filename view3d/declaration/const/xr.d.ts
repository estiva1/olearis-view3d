declare global {
    interface Window {
        XRSession: any;
        XRDOMOverlayState: any;
    }
}
export declare const QUICK_LOOK_SUPPORTED: () => boolean;
export declare const WEBXR_SUPPORTED: () => boolean;
export declare const HIT_TEST_SUPPORTED: () => boolean;
export declare const DOM_OVERLAY_SUPPORTED: () => boolean;
export declare const SESSION: {
    readonly AR: "immersive-ar";
    readonly VR: "immersive-vr";
};
export declare const REFERENCE_SPACE: {
    readonly LOCAL: "local";
    readonly LOCAL_FLOOR: "local-floor";
    readonly VIEWER: "viewer";
};
export declare const EVENTS: {
    readonly SELECT_START: "selectstart";
    readonly SELECT: "select";
    readonly SELECT_END: "selectend";
    readonly ESTIMATION_START: "estimationstart";
    readonly ESTIMATION_END: "estimationend";
};
export declare const INPUT_PROFILE: {
    readonly TOUCH: "generic-touchscreen";
};
export declare const FEATURES: {
    readonly HIT_TEST: {
        readonly requiredFeatures: readonly ["hit-test"];
    };
    readonly DOM_OVERLAY: (root: HTMLElement) => {
        requiredFeatures: string[];
        domOverlay: {
            root: HTMLElement;
        };
    } | {
        requiredFeatures?: undefined;
        domOverlay?: undefined;
    };
    readonly LIGHT_ESTIMATION: {
        readonly optionalFeatures: readonly ["light-estimation"];
    };
};
export declare const EMPTY_FEATURES: {
    requiredFeatures?: any[];
    optionalFeatures?: any[];
    [key: string]: any;
};
export declare const SCENE_VIEWER: {
    readonly INTENT_AR_CORE: (params: string, fallback: string) => string;
    readonly INTENT_SEARCHBOX: (params: string, fallback: string) => string;
    readonly FALLBACK_DEFAULT: (params: string) => string;
};

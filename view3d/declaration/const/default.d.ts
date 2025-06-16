import { Range } from "../type/utils";
export declare const EASING: (x: number) => number;
export declare const ANIMATION_DURATION = 300;
export declare const ANIMATION_LOOP = false;
export declare const ANIMATION_RANGE: Readonly<Range>;
export declare const FOV = 45;
export declare const INFINITE_RANGE: Readonly<Range>;
export declare const PITCH_RANGE: Readonly<Range>;
export declare const ANNOTATION_BREAKPOINT: {
    165: number;
    135: number;
    0: number;
};
export declare const AR_OVERLAY_CLASS = "view3d-ar-overlay";
export declare const DRACO_DECODER_URL = "https://www.gstatic.com/draco/versioned/decoders/1.4.1/";
export declare const KTX_TRANSCODER_URL = "https://unpkg.com/three@0.134.0/examples/js/libs/basis/";
export declare const AR_PRIORITY: ("webAR" | "sceneViewer" | "quickLook")[];

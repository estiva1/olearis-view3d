export declare const ERROR_CODES: {
    [key in keyof typeof MESSAGES]: number;
};
export declare const MESSAGES: {
    WRONG_TYPE: (val: any, types: string[]) => string;
    ELEMENT_NOT_FOUND: (query: string) => string;
    CANVAS_NOT_FOUND: string;
    WEBGL_NOT_SUPPORTED: string;
    PROVIDE_SRC_FIRST: string;
    FILE_NOT_SUPPORTED: (src: string) => string;
    NOT_INITIALIZED: string;
    MODEL_FAIL_TO_LOAD: (url: string) => string;
};
declare const _default: {
    CODES: {
        WRONG_TYPE: number;
        ELEMENT_NOT_FOUND: number;
        CANVAS_NOT_FOUND: number;
        WEBGL_NOT_SUPPORTED: number;
        PROVIDE_SRC_FIRST: number;
        FILE_NOT_SUPPORTED: number;
        NOT_INITIALIZED: number;
        MODEL_FAIL_TO_LOAD: number;
    };
    MESSAGES: {
        WRONG_TYPE: (val: any, types: string[]) => string;
        ELEMENT_NOT_FOUND: (query: string) => string;
        CANVAS_NOT_FOUND: string;
        WEBGL_NOT_SUPPORTED: string;
        PROVIDE_SRC_FIRST: string;
        FILE_NOT_SUPPORTED: (src: string) => string;
        NOT_INITIALIZED: string;
        MODEL_FAIL_TO_LOAD: (url: string) => string;
    };
};
export default _default;

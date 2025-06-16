import { INPUT_TYPE } from "../const/external";
export declare type ValueOf<T> = T[keyof T];
export declare type LiteralUnion<T extends U, U = string> = T | (Pick<U, never> & {
    _?: never;
});
export declare type NoBoolean<T> = T extends boolean ? never : T;
export declare type OptionGetters<T> = {
    [key in keyof T]: T[key];
};
export interface Range {
    min: number;
    max: number;
}
export interface ControlEvents {
    hold: {
        inputType: ValueOf<typeof INPUT_TYPE>;
    };
    release: {
        inputType: ValueOf<typeof INPUT_TYPE>;
    };
    enable: {
        inputType: ValueOf<typeof INPUT_TYPE>;
    };
    disable: {
        inputType: ValueOf<typeof INPUT_TYPE>;
    };
}
export declare type TypedArray = Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array;
